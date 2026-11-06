# "Other versions": the top distinct readings of a take (key x squeeze). If the singer picks the best of the top N, how many fixes remain?
import sys, os, numpy as np, collections
sys.path.insert(0, os.path.dirname(__file__)); import score_user_lib as SU; import intent_pitch as IP
MAJ=[0,2,4,5,7,9,11]; MIN=[0,2,3,5,7,8,10]
def readings(r, du):
    rr=IP.fix_octaves(r); w=np.clip(np.asarray(du,float)/np.median(du),0.5,2.0); out=[]
    for tonic in range(12):
        for mode,ss in (('major',MAJ),('minor',MIN)):
            sc,q=IP.decode_key(rr,w,set(ss),tonic,1.0); out.append((sc,q,(tonic,mode,'plain')))
    out.sort(key=lambda x:-x[0])
    for sc0,_,(tonic,mode,_) in out[:4]:   # squeezed readings for the most likely keys
        ss=MAJ if mode=='major' else MIN; best=None
        for u in np.arange(0.55,1.16,0.05):
            for d in np.arange(0.7,1.16,0.05):
                sc,q=IP.decode_key(rr,w,set(ss),tonic,(u,d)); sc-=(((u-1)**2)+((d-1)**2))/(2*0.15**2)
                if best is None or sc>best[0]: best=(sc,q,(tonic,mode,'squeeze'))
        out.append(best)
    out.sort(key=lambda x:-x[0]); dist=[]; shapes=set()
    for sc,q,k in out:
        shp=tuple(np.diff(q)); 
        if shp in shapes: continue
        shapes.add(shp); dist.append((sc,q,k))
    return dist
metas=SU.load(sys.argv[1]); G=SU.guides(metas); N=0; tot=collections.Counter(); gaps=[]
for pr,m in sorted(metas.items()):
    g=G.get(pr.split('-')[0]); est=m['heard']['notes']
    if not g or not est: continue
    N+=len(g); r=[n['raw'] for n in est]; du=[n['l'] for n in est]; R=readings(r,du)
    e_today=SU.best_edits(est,g)[0]
    es=[SU.best_edits([{**n,'p':p} for n,p in zip(est,q)],g)[0] for sc,q,k in R[:5]]
    tot['today']+=e_today; tot['top reading']+=es[0]
    for k in (2,3,4): tot[f'best of top {k} (+today)']+=min([e_today]+es[:k])
    gaps.append((R[0][0]-R[1][0], e_today-min([e_today]+es[:3])))
    print(f"{pr:16s} today {e_today:2d} | readings {es} | score gap 1st-2nd {R[0][0]-R[1][0]:.1f}")
for k,v in tot.items(): print(f'{k:26s} {10*v/N:.2f} per 10 notes')
