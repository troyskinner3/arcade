# Post-processing for the learned note starts: absorb scoops, and split notes where the pitch settles at a new level.
import json, sys, numpy as np; sys.path.insert(0,'tools')
from onset_model import F, prep, feats, decode, evaluate, tune_of, HOP
z=np.load('results/onset_net.npz'); W1,b1,W2,b2,mu,sd=z['W1'],z['b1'],z['W2'],float(z['b2']),z['mu'],z['sd']
prob=lambda X: 1/(1+np.exp(-(np.tanh(((X-mu)/sd)@W1+b1)@W2+b2)))
def split_plateaus(fr, notes, hyst=0.65, held=0.1):
    t,db,conf,m,v,pm,top=prep(fr); tune=tune_of(m,v); out=[]
    for a0,a1,p in notes:
        i0=int(round((a0+HOP/2-t[0])/HOP)); i1=int(round((a1-HOP/2-t[0])/HOP)); i0=max(0,i0); i1=min(len(t)-1,i1)
        lab=[]; cur=None
        for i in range(i0,i1+1):
            x=pm[i]
            if not np.isnan(x) and (cur is None or abs(x-tune-cur)>hyst): cur=round(x-tune)
            lab.append(cur)
        runs=[]
        for k,l in enumerate(lab):
            if runs and runs[-1][0]==l: runs[-1][2]=i0+k
            else: runs.append([l,i0+k,i0+k])
        runs=[r for r in runs if r[0] is not None and (r[2]-r[1]+1)*HOP>=held]
        merged=[]
        for r in runs:
            if merged and merged[-1][0]==r[0]: merged[-1][2]=r[2]
            else: merged.append(list(r))
        if len(merged)<=1: out.append([a0,a1,p]); continue
        cuts=[i0]+[r[1] for r in merged[1:]]+[i1+1]
        for k,r in enumerate(merged):
            s0,s1=cuts[k],cuts[k+1]-1; seg=[x for x in pm[r[1]:r[2]+1] if not np.isnan(x)]
            out.append([t[s0]-HOP/2, t[s1]+HOP/2, float(np.median(seg))-tune if seg else p])
    return out
def absorb_scoops(notes, maxdur=0.12, iv=3):
    out=[]
    for n in notes:
        if out:
            A=out[-1]
            if A[1]-A[0]<maxdur and n[0]-A[1]<0.02 and 0<abs(round(n[2])-round(A[2]))<=iv: out[-1]=[A[0],n[1],n[2]]; continue
        out.append(list(n))
    return out
if __name__=='__main__':
    L=open('results/list_test.txt').read().split()
    P={f:prob(feats(F[f])) for f in L}
    for name,fn in [('model',lambda f:decode(F[f],P[f],0.6)),
                    ('+ scoops',lambda f:absorb_scoops(decode(F[f],P[f],0.6))),
                    ('+ plateau split',lambda f:split_plateaus(F[f],decode(F[f],P[f],0.6))),
                    ('+ both',lambda f:absorb_scoops(split_plateaus(F[f],decode(F[f],P[f],0.6)))),
                    ('+ both, split held 0.15',lambda f:absorb_scoops(split_plateaus(F[f],decode(F[f],P[f],0.6),held=0.15)))]:
        print(f'{name:26s}', evaluate({f:fn(f) for f in L},L))
