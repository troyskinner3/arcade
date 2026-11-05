# Confidence-aware snap: snap to the key, except keep an out-of-key note when it was sung on-center (|p - round(p)| < tol) and held >= dmin s.
import json, sys, numpy as np, collections, mir_eval
sys.path.insert(0,'tools'); from score import gt, score; from decode_proto import key_of
def snapped(notes,tol,dmin):
    if not notes: return notes
    p=np.array([n[2] for n in notes]); w=np.array([max(0.05,n[1]-n[0]) for n in notes]); sc=key_of(p,w); out=[]
    for n,x in zip(notes,p):
        r=int(round(x))
        if r%12 in sc or (abs(x-r)<tol and n[1]-n[0]>=dmin): m=r
        else: m=min((m for m in range(r-2,r+3) if m%12 in sc), key=lambda m:abs(m-x))
        out.append([n[0],n[1],float(m)])
    return out
def ev(R,tol,dmin):
    o=collections.defaultdict(list)
    for f,v in R.items():
        ri,rh=gt(f); ds='vocadito' if 'vocadito' in f else 'humtrans'; est=snapped(v['notes'],tol,dmin)
        if ds=='humtrans' and est:
            eo=np.array([n[0] for n in est]); best=max(((mir_eval.onset.f_measure(ri[:,0]+d,eo,window=0.05)[0],d) for d in np.arange(-0.2,1.5,0.01)))[1]; ri=ri+best
        s=max(((score(ri,rh,est,sh)[2],sh) for sh in range(-12,13)))[1] if ds=='humtrans' else 0
        o[ds].append(score(ri,rh,est,s)[2])
    return {k:round(float(np.mean(v)),3) for k,v in o.items()}
if __name__=='__main__':
    R=json.load(open(sys.argv[1]))
    print('hard snap (tol 0)      ', ev(R,0,9))
    for tol in [0.1,0.15,0.2,0.25]:
        for dmin in [0.15,0.3]: r=ev(R,tol,dmin); print(f'tol {tol:.2f} min {dmin:.2f} s  ', r, 'mean', round(np.mean(list(r.values())),3))
