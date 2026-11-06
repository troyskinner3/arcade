# How often is the key right? today's fit vs adding "melodies end on the home note and start on its chord"
import sys, os, numpy as np, statistics, json
sys.path.insert(0, os.path.dirname(__file__)); import score_user_lib as SU; from intent_pitch import snap_key
MAJ=[0,2,4,5,7,9,11]; MIN=[0,2,3,5,7,8,10]
def key_fit(r, du, end_w=0.0, start_w=0.0, mode_pref=0.0):
    r=np.asarray(r,float); w=np.asarray(du,float); best=None
    for tonic in range(12):
        for mode,ss in (('major',MAJ),('minor',MIN)):
            d=np.array([min(abs(((x-tonic-s+6)%12)-6) for s in ss) for x in r]); c=(w*d**2).sum()/w.sum()
            last=(round(r[-1])-tonic)%12; first=(round(r[0])-tonic)%12
            c-=end_w*(last==0); c-=start_w*(first in ((0,4,7) if mode=='major' else (0,3,7))); c-=mode_pref*(mode=='major')
            if best is None or c<best[0]: best=(c,(tonic,mode))
    return best[1]
def same(a,b):   # relative major/minor count as the same notes; compare tonic+mode exactly, and "same notes"
    rel=lambda k:(k[0] if k[1]=='major' else (k[0]+3)%12)
    return a==b, rel(a)==rel(b), a[0]==b[0]
CFG=[(0,0,0)]
metas=SU.load(sys.argv[1]); G=SU.guides(metas); rows=[]
for pr,m in sorted(metas.items()):
    g=G.get(pr.split('-')[0]); est=m['heard']['notes']
    if not g or not est: continue
    dt=max(range(-8,9),key=lambda d:sum(any(abs(n['s']+d-x['s'])<=1 for x in g) for n in est))
    pairs=[(n,min(g,key=lambda x:abs(x['s']-n['s']-dt))) for n in est]; pairs=[(n,x) for n,x in pairs if abs(n['s']+dt-x['s'])<=1]
    off=round(statistics.median([n['raw']-x['p'] for n,x in pairs]))
    gk=snap_key([x['p'] for x in g],[x['l'] for x in g],with_key=True)[1]; true=((gk[0]+off)%12,gk[1])
    r=[n['raw'] for n in est]; du=[n['l'] for n in est]
    from intent_pitch import decode
    k1=decode(r,du,alpha=1.0)[2]; k2=decode(r,du)[2]
    rows.append([same(key_fit(r,du,*cfg),true) for cfg in CFG]+[same(k1,true),same(k2,true)])
a=np.array(rows); print('takes',len(a))
for i,cfg in enumerate(CFG+[('reading, no squeeze',),('reading, squeeze search',)]):
    print(f'{str(cfg):28s}:  exact key {a[:,i,0].mean():.0%}  same notes {a[:,i,1].mean():.0%}  right home note {a[:,i,2].mean():.0%}')
