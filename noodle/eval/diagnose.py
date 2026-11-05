# Where do the errors come from? For each true note: was a note found near its onset, and how far off was its pitch?
import json, sys, numpy as np, collections, mir_eval
sys.path.insert(0,'tools'); from score import gt
R=json.load(open(sys.argv[1]))
for ds in ['vocadito','humtrans']:
    diffs=[]; missed=0; tot=0; onerr=[]; extra=0; nest=0; short=0
    for f,v in R.items():
        if ds not in f: continue
        ri,rh=gt(f); est=v['notes']; tot+=len(ri); nest+=len(est)
        rp=69+12*np.log2(rh/440)
        if not est: missed+=len(ri); continue
        e=np.array(est)
        if ds=='humtrans':
            best=max(((mir_eval.onset.f_measure(ri[:,0]+d,e[:,0],window=0.05)[0],d) for d in np.arange(-0.2,1.5,0.01)))[1]; ri=ri+best
        # global key shift (median pitch difference of onset-matched notes)
        pairs=[]
        for k,(a,b) in enumerate(ri):
            j=np.argmin(abs(e[:,0]-a))
            if abs(e[j,0]-a)<=0.1: pairs.append((rp[k],e[j,2],e[j,0]-a))
            else: missed+=1
        if pairs:
            sh=np.median([np.round(q)-p for p,q,_ in pairs]) if ds=='humtrans' else 0
            for p,q,dt in pairs: diffs.append(np.round(q)-sh-p); onerr.append(dt)
    d=np.array(diffs); c=collections.Counter(np.clip(np.round(d).astype(int),-13,13))
    print(f'== {ds}: true notes {tot}, detected {nest}, no detection within 100 ms: {missed} ({missed/tot:.0%})')
    print(f'   pitch of onset-matched notes: exact {np.mean(np.round(d)==0):.0%} | ±1 st {np.mean(abs(np.round(d))==1):.0%} | ±2 st {np.mean(abs(np.round(d))==2):.0%} | octave {np.mean(abs(np.round(d))==12):.0%} | other {np.mean(~np.isin(abs(np.round(d)),[0,1,2,12])):.0%}')
    print(f'   onset error of matched notes: median {1000*np.median(onerr):+.0f} ms, spread (IQR) {1000*(np.percentile(onerr,75)-np.percentile(onerr,25)):.0f} ms')
