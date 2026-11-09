# Is the scatter in sung pitch the voice or the measurement? Per take fit sung = a + b*intended (b = squeeze), compare per-note pitch estimators.
import json,glob,os,sys,numpy as np; sys.path.insert(0,'tools'); import score_user_lib as SU
from pitch_errs import align, REP, G
FR=json.load(open('results/user_frames.json')); src={}
for f in sorted(glob.glob('data/user/2*.json')):
    m=json.load(open(f)); w=os.path.basename(f.replace('.json','.wav'))
    if m.get('prompt') in REP and w in FR: src[m['prompt']]=w
def ests(fr,t0,t1):
    seg=[(t,db,m) for t,db,c,m in fr if t0<=t<=t1 and c<0.25 and m==m]
    if len(seg)<4: return None
    m=np.array([x[2] for x in seg]); db=np.array([x[1] for x in seg]); n=len(m); q=n//4
    h=np.histogram(m,bins=np.arange(m.min()-0.25,m.max()+0.5,0.25)); mode=h[1][h[0].argmax()]+0.125
    return {'median all':np.median(m),'middle half':np.median(m[q:max(q+1,3*q)]),'second half':np.median(m[n//2:]),'last third':np.median(m[2*n//3:]),
            'first half':np.median(m[:max(1,n//2)]),'loudest half':np.median(m[db>=np.median(db)]),'mode':mode}
R={}
for pr,mt in REP.items():
    g=G.get(pr.split('-')[0]); est=mt['heard']['notes']
    if not g or not est or pr not in src: continue
    fr=FR[src[pr]]; sd=60/float(mt['bpm'])/4; al=mt['al']; rows=[]
    P=align(est,g)
    # align() shifted est by dt,dp; recover dt from the first pair vs original
    for j,e in P:
        o=[x for x in est if abs(x['raw']-(e['raw']-(e['p']-[y for y in est if y['s']==x['s']][0]['p'])))<1e-9]
        t0=al+(e['s'])*sd; t1=t0+e['l']*sd
        E=ests(fr,t0-0.0,t1)
        if E is None: continue
        E['app raw']=e['raw']; rows.append((g[j]['p'],E))
    R[pr]=rows
# shift handling: est 's' were shifted by dt in align; re-run with original timing for safety
keys=list(next(iter(R.values()))[0][1].keys())
for k in keys:
    res=[]; hit=0; n=0
    for pr,rows in R.items():
        if len(rows)<6: continue
        x=np.array([r[0] for r in rows],float); y=np.array([r[1][k] for r in rows],float)
        if k!='app raw':   # frame estimators are absolute; app raw was transposed by dp in align -> undo with per-take offset (fit handles it)
            pass
        A=np.vstack([np.ones_like(x),x]).T; c,*_=np.linalg.lstsq(A,y,rcond=None); r=y-A@c
        # robust: refit without the worst 10%
        keep=np.abs(r)<=np.quantile(np.abs(r),0.9); c,*_=np.linalg.lstsq(A[keep],y[keep],rcond=None); r=y-A@c
        res+=list(r); 
    res=np.array(res); print(f'{k:13s} residual median |e| {np.median(np.abs(res)):.2f}  within 0.5: {np.mean(np.abs(res)<0.5):.0%}  rms {np.sqrt(np.mean(res**2)):.2f}')
