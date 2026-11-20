# Musical decoder v2 (Python reference for js/musical.js):
#  rhythm: blips go (rule), note starts choose among heard -1/0/+1 steps by the corpus onset model vs. moving (data), legato phrases (rule)
#  pitch:  2-note-memory melody model + chord fit + phrase/last-note degrees (data) with the reader's error pattern and contour kept (rule)
import json, math, collections, pickle, sys
sys.path.insert(0, __file__.rsplit('/',1)[0])
import dec
D=0.75
class LM:
    def __init__(s, counts, M):
        s.c=counts[:3]; s.on=M['on']; s.base=dec.Model(M)
        # onset bigram: log P(pos | prev pos), add-one
        s.onl=[[math.log((x+0.5)/(sum(r)+8)) for x in r] for r in s.on]
    def p_iv(s, mode, mnext, deg, mcur, prev_iv, iv):
        p=1/25
        for key in ((mode, mnext), (mode, mnext, deg, mcur), (mode, mnext, deg, mcur, 'S' if prev_iv is None else prev_iv)):
            C=s.c[{2:0,4:1,5:2}[len(key)]].get(key)
            if not C: break
            n=sum(C.values()); t=len(C); p=max(C.get(iv,0)-D,0)/n+D*t/n*p
        return p
def rhythm(ns, Lm, W, n_steps):
    ns=sorted(({**x} for x in ns), key=lambda x:x['s'])
    if not ns: return ns
    vs=sorted(x.get('v',0.8) for x in ns); medV=vs[len(vs)//2]
    ns=[x for x in ns if not (x['l']<=1 and x.get('v',0.8)<medV*0.8)]
    i=1
    while i<len(ns):
        a,b=ns[i-1],ns[i]
        if b['l']<=1 and b['s']-(a['s']+a['l'])<=1: a['l']=b['s']+b['l']-a['s']; ns.pop(i)
        else: i+=1
    if W.get('t') is not None and ns:
        # Viterbi over start shifts
        N=len(ns); sh=(-1,0,1); V=[{}]
        for d in sh:
            s=ns[0]['s']+d
            if 0<=s<n_steps: V[0][d]=(-W['t']*abs(d)+Lm.onl[16][s%16], None)
        for i in range(1,N):
            V.append({})
            for d in sh:
                s=ns[i]['s']+d
                if not (0<=s<n_steps): continue
                best=None
                for pd,(sc,_) in V[i-1].items():
                    ps=ns[i-1]['s']+pd
                    if ps>=s: continue
                    prev=ps%16 if s-ps<16 else 16
                    v=sc-W['t']*abs(d)+Lm.onl[prev][s%16]
                    if best is None or v>best[0]: best=(v,pd)
                if best: V[i][d]=best
            if not V[i]: V[i][0]=(max(x[0] for x in V[i-1].values()), max(V[i-1], key=lambda k:V[i-1][k][0]))
        d=max(V[-1],key=lambda k:V[-1][k][0]); out=[0]*N
        for i in range(N-1,-1,-1): out[i]=d; d=V[i][d][1]
        for x,d in zip(ns,out): x['l']-=d; x['s']+=d
        ns=[x for i,x in enumerate(ns) if i==0 or x['s']>ns[i-1]['s']]
    if W.get('legato'):
        for i,x in enumerate(ns):
            end=i==len(ns)-1 or ns[i+1]['s']-(x['s']+x['l'])>=4
            if not end: x['l']=ns[i+1]['s']-x['s']
            else:
                lim=(ns[i+1]['s'] if i<len(ns)-1 else n_steps)-x['s']; x['l']=max(2,min(lim,max(4,round(x['l']/4)*4)))
    for x in ns: x['l']=max(1,x['l'])
    return ns
def pitch(ns, Lm, W, key=None, err=None):
    ns=sorted(ns,key=lambda n:n['s'])
    if not ns: return []
    T,mode=key or dec.key_of(ns); sc=set((T+d)%12 for d in (dec.MAJ if mode=='major' else dec.MIN))
    chords=dec.bar_chords(ns,T,mode); Mo=Lm.base
    err=err or {0:0.0,1:-2.6,2:-2.2,12:-5.0}
    N=len(ns); C=[]
    for n in ns:
        p=n['p']; c={p:0.0}
        for d in (-2,-1,1,2,-12,12):
            q=p+d
            if q%12 in sc and abs(d) in err: c[q]=err[abs(d)]
        C.append(c)
    gap=lambda i: ns[i+1]['s']-(ns[i]['s']+ns[i]['l'])
    phrase_end=[i==N-1 or gap(i)>=4 for i in range(N)]
    newph=[i==0 or gap(i-1)>=4 for i in range(N)]
    def unary(i,q):
        n=ns[i]; m=dec.metric(n['s']); u=W['f']*C[i][q]
        ch=chords.get(n['s']//16)
        if ch: a=Mo.ch[(m,dec.dur(n['l']))]; u+=W['c']*(a[1] if q%12 in ch else a[0])
        if i==N-1: u+=W['e']*Mo.fin[mode][(q-T)%12]
        elif phrase_end[i]: u+=W['e']*Mo.end[mode][(q-T)%12]
        return u
    sgn=lambda x:(x>0)-(x<0)
    V={(None,q):(unary(0,q),[q]) for q in C[0]}
    for i in range(1,N):
        mn=dec.metric(ns[i]['s']); mc=dec.metric(ns[i-1]['s']); hd=sgn(ns[i]['p']-ns[i-1]['p']); NV={}
        for q in C[i]:
            u=unary(i,q); best=None
            for (a,b),(s0,path) in V.items():
                if newph[i]: t=0.0
                else:
                    iv=q-b; prev=None if a is None or newph[i-1] else b-a
                    t=W['m']*math.log(Lm.p_iv(mode,mn,(b-T)%12,mc,prev,iv)) if -12<=iv<=12 else -12*W['m']
                    if sgn(iv)!=hd: t-=W['d']
                v=s0+t+u
                if best is None or v>best[0]: best=(v,path,b)
            NV[(best[2],q)]=(best[0],best[1]+[q])
        V=NV
    path=max(V.values(),key=lambda x:x[0])[1]
    return [{**n,'p':q} for n,q in zip(ns,path)]
def lm_bits(ns, Lm, key=None):
    # how typical of real melodies a part is: bits per note under the melody model (lower = more typical)
    ns=sorted(ns,key=lambda n:n['s']); T,mode=key or dec.key_of(ns); ll=0; k=0
    for i in range(1,len(ns)):
        if ns[i]['s']-(ns[i-1]['s']+ns[i-1]['l'])>=4: continue
        iv=ns[i]['p']-ns[i-1]['p']
        if abs(iv)>12: ll+=math.log(1e-4); k+=1; continue
        prev=None if i<2 or ns[i-1]['s']-(ns[i-2]['s']+ns[i-2]['l'])>=4 else ns[i-1]['p']-ns[i-2]['p']
        if prev is not None and abs(prev)>12: prev=None
        ll+=math.log(Lm.p_iv(mode,dec.metric(ns[i]['s']),(ns[i-1]['p']-T)%12,dec.metric(ns[i-1]['s']),prev,iv)); k+=1
    return -ll/max(1,k)/math.log(2), k
