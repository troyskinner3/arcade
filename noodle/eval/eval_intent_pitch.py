# Guided takes: edits to fix with today's snapping vs the interval-aware decoder (alpha searched per take, or learned from the singer's other takes)
import json, glob, sys, os, numpy as np, collections, copy
sys.path.insert(0, os.path.dirname(__file__)); from intent_pitch import decode
import score_user_lib as SU
D=sys.argv[1]; metas=SU.load(D); guides=SU.guides(metas)
def fit_profile(prompts):   # expected sung size for each intended interval, shrunk toward the interval itself when data is thin
    rows=collections.defaultdict(list)
    for pr in prompts:
        m=metas[pr]; g=guides[pr.split('-')[0]]; e=m['heard']['notes']
        pairs=[(n,min(g,key=lambda x:abs(x['s']-n['s']))) for n in e]; pairs=[(n,x) for n,x in pairs if abs(n['s']-x['s'])<=1]
        for (n1,g1),(n2,g2) in zip(pairs,pairs[1:]):
            if g2 is not g1: rows[g2['p']-g1['p']].append(n2['raw']-n1['raw'])
    ratio={}
    for d,v in rows.items():
        if d: k=len(v); ratio[d]=1+(np.median(v)/d-1)*k/(k+4)
    def prof(d):
        if d==0: return 0.0
        same=[x for x in ratio if np.sign(x)==np.sign(d)]
        if not same: return float(d)
        near=min(same,key=lambda x:abs(abs(x)-abs(d))); return d*ratio[near]
    return prof
def fit_alpha(prompts):   # personal alpha from guided takes (sung vs intended, matched by start)
    xs=[];ys=[]
    for pr in prompts:
        m=metas[pr]; g=guides[pr.split('-')[0]]; e=m['heard']['notes']
        pairs=[(n,min(g,key=lambda x:abs(x['s']-n['s']))) for n in e]; pairs=[(n,x) for n,x in pairs if abs(n['s']-x['s'])<=1]
        for (n1,g1),(n2,g2) in zip(pairs,pairs[1:]):
            d=g2['p']-g1['p']
            if d: xs.append(d); ys.append(n2['raw']-n1['raw'])
    xs=np.array(xs); ys=np.array(ys); u=xs>0; f=lambda m: float(np.sum(xs[m]*ys[m])/np.sum(xs[m]**2))
    return (f(u),f(~u))
res=collections.defaultdict(lambda:[0,collections.Counter()]); N=0
for pr,m in sorted(metas.items()):
    g=guides.get(pr.split('-')[0]); est=m['heard']['notes']
    if not g or not est: continue
    N+=len(g)
    variants={'today (snap to key)':est}
    r=[n['raw'] for n in est]; du=[n['l'] for n in est]
    from intent_pitch import snap_key
    _,kk=snap_key(r,du,with_key=True)
    q,al,key=decode(r,du,key=kk,alpha_sd=float(__import__('os').environ.get('ASD','0.15'))); variants['decoder, alpha searched']=[{**n,'p':p} for n,p in zip(est,q)]
    pal=fit_alpha([p for p in metas if p!=pr and p.split('-')[0] in guides and 'whistle' not in p])
    q2,_,_=decode(r,du,alpha=pal); variants['decoder, your alpha (other takes)']=[{**n,'p':p} for n,p in zip(est,q2)]
    prof=fit_profile([p for p in metas if p!=pr and p.split('-')[0] in guides and 'whistle' not in p])
    q5,_,_=decode(r,du,profile=prof); variants['decoder, your per-size profile']=[{**n,'p':p} for n,p in zip(est,q5)]
    for sp in ():
        q4,_,_=decode(r,du,alpha=pal,s_pos=sp); variants[f'decoder, your up/down, loose position {sp}']=[{**n,'p':p} for n,p in zip(est,q4)]
    from intent_pitch import snap_key
    _,kk=snap_key(r,du,with_key=True); q6,_,_=decode(r,du,alpha=1.0,key=kk); variants['decoder, no squeeze']=[{**n,'p':p} for n,p in zip(est,q6)]
    q3=[round(x) for x in r]; variants['no key at all (round)']=[{**n,'p':p} for n,p in zip(est,q3)]
    for k,v in variants.items(): e,c=SU.best_edits(v,g); res[k][0]+=e; res[k][1]+=c
    print(f'{pr:16s} searched up/down {al[0]:.2f}/{al[1]:.2f}  yours {pal[0]:.2f}/{pal[1]:.2f}')
for k,(e,c) in res.items(): print(f'{k:36s} {10*e/N:.2f} per 10 notes  pitch {c["pitch"]:2d} add {c["add"]:2d} delete {c["delete"]:2d} move {c["move"]}')
