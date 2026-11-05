# Prototype: key-aware + melodic-step-aware pitch decoding on top of the detector's raw note pitches.
import json, sys, numpy as np, collections, mir_eval
sys.path.insert(0,'tools'); from score import gt, score
KS_MAJ=np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88]); KS_MIN=np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])
MAJ=[0,2,4,5,7,9,11]; MIN=[0,2,3,5,7,8,10]
def key_of(p,w):
    h=np.zeros(12); 
    for x,ww in zip(np.round(p).astype(int)%12,w): h[x]+=ww
    best=max(((np.corrcoef(h,np.roll(prof,t))[0,1],t,sc) for prof,sc in [(KS_MAJ,MAJ),(KS_MIN,MIN)] for t in range(12)))
    return {(best[1]+s)%12 for s in best[2]}
# interval prior for sung melodies (semitones, |interval|): steps and small leaps are common
IV=np.array([0.20,0.10,0.24,0.12,0.09,0.07,0.02,0.07,0.03,0.02,0.01,0.01,0.02]); IV=IV/IV.sum()
def decode(notes, out_w=0.35, sigma=0.4, mel=0.0):
    if not notes: return notes
    p=np.array([n[2] for n in notes]); w=np.array([max(0.05,n[1]-n[0]) for n in notes]); scale=key_of(p,w)
    C=[np.arange(round(x)-1,round(x)+2) for x in p]
    emit=[np.array([-(x-c)**2/(2*sigma**2)+(0 if c%12 in scale else np.log(out_w)) for c in cs]) for x,cs in zip(p,C)]
    if mel<=0: return [[n[0],n[1],float(cs[np.argmax(e)])] for n,cs,e in zip(notes,C,emit)]
    # Viterbi over candidate semitones with an interval prior (weight mel)
    V=emit[0].copy(); back=[]
    for i in range(1,len(p)):
        tr=np.array([[mel*np.log(IV[min(12,abs(int(b-a)))]+1e-4) for a in C[i-1]] for b in C[i]])
        sc=V[None,:]+tr; back.append(sc.argmax(1)); V=sc.max(1)+emit[i]
    k=int(V.argmax()); path=[k]
    for b in reversed(back): k=int(b[k]); path.append(k)
    path=path[::-1]; return [[n[0],n[1],float(C[i][path[i]])] for i,n in enumerate(notes)]
def evaluate(R,**kw):
    out=collections.defaultdict(list)
    for f,v in R.items():
        ri,rh=gt(f); ds='vocadito' if 'vocadito' in f else 'humtrans'; est=decode(v['notes'],**kw)
        if ds=='humtrans' and est:
            eo=np.array([n[0] for n in est]); best=max(((mir_eval.onset.f_measure(ri[:,0]+d,eo,window=0.05)[0],d) for d in np.arange(-0.2,1.5,0.01)))[1]; ri=ri+best
        s=max(((score(ri,rh,est,sh)[2],sh) for sh in range(-12,13)))[1] if ds=='humtrans' else 0
        out[ds].append(score(ri,rh,est,s)[2])
    return {k:round(float(np.mean(v)),3) for k,v in out.items()}
if __name__=='__main__':
    R=json.load(open(sys.argv[1]))
    print('plain rounding           ', evaluate(R,out_w=1.0))
    for w in [0.6,0.35,0.2,0.1]: print(f'key prior out-of-key x{w:<5}', evaluate(R,out_w=w))
    for mel in [0.3,0.6,1.0]:
        for w in [1.0,0.35]: print(f'+ melodic steps {mel}, key x{w}', evaluate(R,out_w=w,mel=mel))
