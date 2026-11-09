# Does following slow tuning drift help? Re-snap raw pitch after removing a running tuning offset (offset learned from the app's own snapped notes).
import json,glob,sys,numpy as np; sys.path.insert(0,'tools'); import score_user_lib as SU
REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob('results/replay_all/2-*.json')}; G=SU.guides(REP)
def resnap(est,k,mode):
    pcs={e['p']%12 for e in est}; out=[]
    for i,e in enumerate(est):
        prev=[x['raw']-x['p'] for x in est[max(0,i-k):i]]
        off=float(np.median(prev)) if prev else 0.0
        if mode=='center': off=float(np.median([x['raw']-x['p'] for x in est[max(0,i-8):i+9]])); off=off if abs(off)>=k else 0.0
        r=e['raw']-off; c=[p for p in range(int(r)-3,int(r)+4) if p%12 in pcs]
        q=min(c,key=lambda p:abs(p-r)) if c else e['p']
        # only change if the plain snap disagrees and the shifted one is clearly closer
        out.append({**e,'p':q})
    return out
for mode in ('center',):
  for k in (0.0,0.2,0.3,0.4):
    t0=t1=N=0; ch=[]
    for pr,m in sorted(REP.items()):
        g=G.get(pr.split('-')[0]); est=m['heard']['notes']
        if not g or not est: continue
        a=SU.best_edits(est,g)[0]; b=SU.best_edits(resnap(est,k,mode),g)[0]; t0+=a; t1+=b; N+=len(g)
        if a!=b: ch.append(f'{pr} {a}->{b}')
    print(mode,k,ch if k==0.3 else "",f'{10*t0/N:.2f} -> {10*t1/N:.2f}',len(ch),'changed')
