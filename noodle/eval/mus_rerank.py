# Musicality judge with meter: trigram over (scale degree, interval, beat strength) tokens learned from public-domain folk tunes
# (abc-collection; guide tunes removed), used to choose among the decoder's readings (results/nbest.json). Cross-validated by tune.
import json,glob,sys,collections,numpy as np,math
sys.path.insert(0,'tools'); import score_user_lib as SU
from melody_lm import guide_runs
def strength_q(b,bar):   # corpus: beat position b (1-based, in quarters) -> 0 downbeat, 1 other beat, 2 off-beat
    if b!=b or bar!=bar: return 1
    f=(b-1)%max(bar,1); return 0 if abs(f)<1e-6 else 1 if abs(f-round(f))<1e-6 else 2
def strength_s(s):       # app: 16 steps a bar
    return 0 if s%16==0 else 1 if s%4==0 else 2
def tok(prev,p,tonic,st,use_iv=True): return ((p-tonic)%12, (max(-7,min(7,p-prev)) if prev is not None else 99) if use_iv else 0, st)
class LM:
    def __init__(self,order=3,k=0.1,meter=True):
        C=json.load(open('results/corpus.json')); runs=guide_runs(); self.o=order; self.k=k; self.meter=meter
        self.c={m:collections.Counter() for m in ('major','minor')}; self.h={m:collections.Counter() for m in ('major','minor')}; self.V=12*16*3
        for t in C:
            ns=[(p,b) for p,ql,b in t['notes'] if p is not None and p==p]
            if len(ns)<4 or t['mode'] not in self.c: continue
            d=tuple(np.diff([p for p,b in ns]))
            if any(d[i:i+8] in runs for i in range(len(d)-7)): continue
            T=[('<s>',)]*(order-1)+[tok(ns[i-1][0] if i else None,p,t['tonic'],strength_q(b,t.get('bar') or 4) if meter else 0) for i,(p,b) in enumerate(ns)]
            for i in range(order-1,len(T)):
                for j in range(order): ctx=tuple(T[i-j:i]); self.c[t['mode']][ctx+(T[i],)]+=1; self.h[t['mode']][ctx]+=1
    def lp(self,q,ss,tonic,mode):
        T=[('<s>',)]*(self.o-1)+[tok(q[i-1] if i else None,p,tonic,strength_s(s) if self.meter else 0) for i,(p,s) in enumerate(zip(q,ss))]; out=0
        for i in range(self.o-1,len(T)):
            pr=0
            for j,wt in zip(range(self.o-1,-1,-1),[0.6,0.3,0.1]): ctx=tuple(T[i-j:i]); pr+=wt*(self.c[mode][ctx+(T[i],)]+self.k/self.V)/(self.h[mode][ctx]+self.k)
            out+=math.log(pr)
        return out/len(q)   # per note, so long and short readings compare fairly
if __name__=='__main__':
    REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob('results/replay_dbase/2-*.json')}
    R=json.load(open('results/nbest.json')); N=sum(r[1] for r in R); groups=sorted({r[0].split('-')[0] for r in R})
    for meter in (True,):
        L=LM(meter=meter); cache={}
        def lps(r):
            if r[0] not in cache: ss=[e['s'] for e in REP[r[0]]['heard']['notes']]; cache[r[0]]=[L.lp(q,ss,m[1],m[2]) for q,m in zip(r[5],r[4])]
            return cache[r[0]]
        def total(lam,K,sel):
            t=0
            for r in sel:
                pr,n,app,s,meta,qs=r; l=lps(r); sc=[meta[i][0]+lam*len(qs[i])*l[i] for i in range(min(K,len(qs)))]; t+=s[int(np.argmax(sc))]
            return t
        grid=[(K,l) for K in (4,10,30) for l in (0,0.25,0.5,1,2,4,8)]
        print('meter' if meter else 'no meter', 'in-sample best:', min((round(10*total(l,K,R)/N,2),K,l) for K,l in grid))
        tot=0
        for g in groups:
            tr=[r for r in R if r[0].split('-')[0]!=g]; te=[r for r in R if r[0].split('-')[0]==g]
            b=min((total(l,K,tr),K,l) for K,l in grid); tot+=total(b[2],b[1],te)
        print('  cross-validated by tune:',round(10*tot/N,2),' (decoder alone:',round(10*total(0,1,R)/N,2),')')
