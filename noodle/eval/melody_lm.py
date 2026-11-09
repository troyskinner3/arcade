# Melody judge learned from the folk tunes: trigram over (scale degree, interval) tokens, per mode. Guide tunes removed from the corpus (no leakage).
import json,glob,sys,collections,numpy as np,math
sys.path.insert(0,'tools'); import score_user_lib as SU
def tok(prev,p,tonic): return ((p-tonic)%12, max(-12,min(12,p-prev)) if prev is not None else 99)
def guide_runs(n=8):
    REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob('results/replay_dbase/2-*.json')}; G=SU.guides(REP); runs=set()
    for k,g in G.items():
        if k=='scale': continue
        d=tuple(np.diff([x['p'] for x in g]))
        for i in range(len(d)-n+1): runs.add(d[i:i+n])
    return runs
class LM:
    def __init__(self,order=3,k=0.1,excl=True):
        C=json.load(open('results/corpus.json')); runs=guide_runs() if excl else set(); self.o=order; self.k=k
        self.c={m:collections.Counter() for m in ('major','minor')}; self.h={m:collections.Counter() for m in ('major','minor')}; self.V=12*26; drop=0
        for t in C:
            ps=[p for p,ql,b in t['notes'] if p is not None and p==p]
            if len(ps)<4: continue
            d=tuple(np.diff(ps)); 
            if excl and any(d[i:i+8] in runs for i in range(len(d)-7)): drop+=1; continue
            m=t['mode'] if t['mode'] in self.c else None
            if not m: continue
            T=[('<s>',)]*(order-1)+[tok(ps[i-1] if i else None,p,t['tonic']) for i,p in enumerate(ps)]
            for i in range(order-1,len(T)):
                for j in range(order):   # all lower orders too
                    ctx=tuple(T[i-j:i]); self.c[m][ctx+(T[i],)]+=1; self.h[m][ctx]+=1
        self.drop=drop
    def lp(self,q,tonic,mode):
        m=mode; T=[('<s>',)]*(self.o-1)+[tok(q[i-1] if i else None,p,tonic) for i,p in enumerate(q)]; s=0
        for i in range(self.o-1,len(T)):
            # simple interpolation of orders
            pr=0; wts=[0.6,0.3,0.1][:self.o]
            for j,wt in zip(range(self.o-1,-1,-1),wts):
                ctx=tuple(T[i-j:i]); pr+=wt*(self.c[m][ctx+(T[i],)]+self.k/self.V)/(self.h[m][ctx]+self.k)
            s+=math.log(pr)
        return s
if __name__=='__main__':
    L=LM(); print('corpus tunes dropped as guide matches:',L.drop)
    R=json.load(open('results/nbest.json'))
    groups=sorted({r[0].split('-')[0] for r in R}); N=sum(r[1] for r in R)
    def total(lam,K,sel):
        t=0
        for pr,n,app,s,meta,qs in sel:
            sc=[meta[i][0]+lam*L.lp(qs[i],meta[i][1],meta[i][2]) for i in range(min(K,len(qs)))]
            t+=s[int(np.argmax(sc))]
        return t
    LP={}
    for K in (10,30,60):
        for lam in (0,0.25,0.5,1,2,4):
            print(K,lam,round(10*total(lam,K,R)/N,2))
    # cross-validated: pick (K,lam) on other tune groups
    tot=0
    for g in groups:
        tr=[r for r in R if r[0].split('-')[0]!=g]; te=[r for r in R if r[0].split('-')[0]==g]
        best=min(((total(l,K,tr),K,l) for K in (10,30,60) for l in (0,0.25,0.5,1,2,4)))
        tot+=total(best[2],best[1],te)
    print('cross-validated by tune:',round(10*tot/N,2))
