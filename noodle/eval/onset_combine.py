# Rules as the base; the model only adds note starts the rules missed (split a rule note at a confident peak,
# and add model notes in places with no rule note).
import json, sys, numpy as np; sys.path.insert(0,'tools')
from onset_model import F, prep, feats, decode, evaluate, tune_of, HOP
z=np.load('results/onset_net.npz'); W1,b1,W2,b2,mu,sd=z['W1'],z['b1'],z['W2'],float(z['b2']),z['mu'],z['sd']
prob=lambda X: 1/(1+np.exp(-(np.tanh(((X-mu)/sd)@W1+b1)@W2+b2)))
RULES={f:x['notes'] for f,x in json.load(open('results/md/r_rules.json')).items()}
def combine(f, p, split_thr=0.85, edge=0.08, add=True, add_thr=0.6):
    fr=F[f]; t,db,conf,m,v,pm,top=prep(fr); tune=tune_of(m,v); T0=t[0]; idx=lambda s: int(round((s-T0)/HOP))
    pk=[i for i in range(len(t)) if p[i]>=min(split_thr,add_thr) and p[i]==p[max(0,i-8):i+9].max()]
    out=[]
    for a0,a1,pp in RULES[f]:
        cuts=[i for i in pk if p[i]>=split_thr and t[i]>a0+edge and t[i]<a1-edge]
        if not cuts: out.append([a0,a1,pp]); continue
        bounds=[a0]+[t[i]-HOP/2 for i in cuts]+[a1]
        for s0,s1 in zip(bounds,bounds[1:]):
            seg=[x for x in pm[max(0,idx(s0)):idx(s1)+1] if not np.isnan(x)]
            out.append([s0,s1,float(np.median(seg[len(seg)//4:max(len(seg)//4+1,3*len(seg)//4)]))-tune if len(seg)>=4 else pp])
    if add:
        mn=decode(fr,p,add_thr)
        for n in mn:
            if not any(min(n[1],o[1])-max(n[0],o[0])>0.3*(n[1]-n[0]) for o in out): out.append(n)
        out.sort(key=lambda n:n[0])
    return out
if __name__=='__main__':
    L=open('results/list_test.txt').read().split(); P={f:prob(feats(F[f])) for f in L}
    print('rules alone              ', evaluate({f:RULES[f] for f in L},L))
    print('model alone              ', evaluate({f:decode(F[f],P[f],0.6) for f in L},L))
    for st in [0.7,0.8,0.9]:
        for add in [False,True]: print(f'rules + model splits {st} {"+ adds" if add else "      "}', evaluate({f:combine(f,P[f],st,add=add) for f in L},L))
