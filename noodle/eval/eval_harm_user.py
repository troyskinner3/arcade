# Guided takes with a chord part (made from the Guide, moved to the key the singer used): does knowing the chords help?
import sys, os, numpy as np, collections, statistics
sys.path.insert(0, os.path.dirname(__file__)); import score_user_lib as SU; from intent_pitch import decode, snap_key; from harmony import harmonize, chord_at
D=sys.argv[1]; metas=SU.load(D); G=SU.guides(metas); res=collections.defaultdict(lambda:[0,collections.Counter()]); N=0
for pr,m in sorted(metas.items()):
    g=G.get(pr.split('-')[0]); est=m['heard']['notes']
    if not g or not est: continue
    N+=len(g)
    # timing: the shift that lines the take up with the Guide best
    dt=max(range(-8,9),key=lambda d:sum(any(abs(n['s']+d-x['s'])<=1 for x in g) for n in est))
    pairs=[(n,min(g,key=lambda x:abs(x['s']-n['s']-dt))) for n in est]; pairs=[(n,x) for n,x in pairs if abs(n['s']+dt-x['s'])<=1]
    off=round(statistics.median([n['raw']-x['p'] for n,x in pairs])) if pairs else 0
    gp=[x['p'] for x in g]; gk=snap_key(gp,[x['l'] for x in g],with_key=True)[1]
    key=((gk[0]+off)%12,gk[1])
    H=harmonize([(x['s'],x['l'],x['p']+off) for x in g],key[0],key[1],8)
    chords=[(chord_at(H,n['s']+dt),1.0 if (n['s']+dt)%4==0 else 0.5) for n in est]
    r=[n['raw'] for n in est]; du=[n['l'] for n in est]
    V={'today (snap to key)':est}
    ss=[0,2,4,5,7,9,11] if key[1]=='major' else [0,2,3,5,7,8,10]
    def snapk(x):
        c=[q for q in range(int(x)-3,int(x)+4) if (q-key[0])%12 in ss]; return min(c,key=lambda q:abs(q-x))
    V['snap to the right key']=[{**n,'p':snapk(n['raw'])} for n in est]
    import intent_pitch as IP
    for h in [0,1]:
        IP.HARM=h
        q,_,_=decode(r,du,alpha=1.0,key=key,chords=chords); V[f'no squeeze, chords {h}']=[{**n,'p':p} for n,p in zip(est,q)]
        q,_,_=decode(r,du,key=key,chords=chords); V[f'squeeze, chords {h}']=[{**n,'p':p} for n,p in zip(est,q)]
    for k,v in V.items(): e,c=SU.best_edits(v,g); res[k][0]+=e; res[k][1]+=c
for k,(e,c) in res.items(): print(f'{k:28s} {10*e/N:.2f} per 10 notes  pitch {c["pitch"]:2d}')
