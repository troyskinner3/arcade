# Musical decoder (pitch): choose each note's pitch among what was heard and nearby key notes, maximizing
#   w_f * log P(heard | meant)          (the reader's error pattern)
# + w_m * log P(meant melody)           (interval model from the corpus, by previous degree, beat strength, previous move)
# + w_c * chord fit on the note         (corpus rate of chord notes by beat strength and length)
# + w_e * phrase-end / last-note degree preference (corpus)
# - w_d * contour flips (theory/perception rule: keep the melody's ups and downs)
import json, math, collections
MAJ=[0,2,4,5,7,9,11]; MIN=[0,2,3,5,7,8,10]
def metric(pos):
    pos%=16
    return 0 if pos==0 else 1 if pos==8 else 2 if pos%4==0 else 3 if pos%2==0 else 4
def move(iv): return 0 if iv is None else 1 if iv==0 else 2 if 0<iv<=2 else 3 if iv>2 else 4 if iv>=-2 else 5
def dur(l): return 0 if l<=1 else 1 if l<=2 else 2 if l<=4 else 3
class Model:
    def __init__(s, M, beta=20.0):
        s.lp={}
        for mode in ('major','minor'):
            T=M['iv'][mode]; agg1=collections.defaultdict(lambda:[0]*25); agg0=collections.defaultdict(lambda:[0]*25); tot=[1]*25
            for k,v in T.items():
                d,m,mv=map(int,k.split(','))
                for i,c in enumerate(v): agg1[(d,m)][i]+=c; agg0[m][i]+=c; tot[i]+=c
            st=sum(tot); P0={m:[(c+beta*t/st)/(sum(v)+beta) for c,t in zip(v,tot)] for m,v in agg0.items()}
            P1={k:[(c+beta*p)/(sum(v)+beta) for c,p in zip(v,P0[k[1]])] for k,v in agg1.items()}
            for d in range(12):
                for m in range(5):
                    base=P1.get((d,m)) or P0.get(m) or [t/st for t in tot]
                    for mv in range(6):
                        v=T.get(f'{d},{m},{mv}')
                        p=[(c+beta*b)/(sum(v)+beta) for c,b in zip(v,base)] if v else base
                        s.lp[(mode,d,m,mv)]=[math.log(x) for x in p]
        s.ch={}
        for k,(o,i) in M['ch'].items(): m,d=map(int,k.split(',')); s.ch[(m,d)]=(math.log((o+1)/(o+i+2)/4), math.log((i+1)/(o+i+2)/3))
        s.end={}; s.fin={}
        for mode in ('major','minor'):
            e=M['end'][mode]; f=M['fin'][mode]; te=sum(e)+12; tf=sum(f)+12
            s.end[mode]=[math.log((x+1)/te*12) for x in e]; s.fin[mode]=[math.log((x+1)/tf*12) for x in f]
def key_of(ns):
    h=[0]*12
    for n in ns: h[n['p']%12]+=n['l']
    best=None
    for t in range(12):
        for mode,sc in (('major',MAJ),('minor',MIN)):
            sc_=sum(h[(t+d)%12] for d in sc)+0.5*h[t]+0.3*h[(t+7)%12]
            if best is None or sc_>best[0]: best=(sc_,t,mode)
    return best[1],best[2]
def bar_chords(ns, T, mode):
    # chord per bar (half bar when it clearly changes): best in-key triad by duration weight (like the app's harmonize)
    sc=MAJ if mode=='major' else MIN; out={}
    tri=[(T+sc[i])%12 for i in range(7)]
    bars=collections.defaultdict(list)
    for n in ns: bars[n['s']//16].append(n)
    for b,bn in bars.items():
        w=collections.Counter()
        for n in bn: w[n['p']%12]+=n['l']*(2 if n['s']%8==0 else 1)
        best=max(range(7),key=lambda i:sum(w[(T+sc[(i+k)%7])%12] for k in (0,2,4))+0.1*(i in (0,3,4)))
        out[b]={(T+sc[(best+k)%7])%12 for k in (0,2,4)}
    return out
def decode(ns, W, Mo, key=None, chords=None, err=None):
    ns=sorted(ns,key=lambda n:n['s'])
    if not ns: return []
    T,mode=key or key_of(ns); sc=set((T+d)%12 for d in (MAJ if mode=='major' else MIN))
    chords=chords if chords is not None else bar_chords(ns,T,mode)
    err=err or {0:0.0,1:-2.0,2:-3.5,12:-4.0}
    N=len(ns); C=[]
    for n in ns:
        p=n['p']; c={p:0.0}
        for d in (-2,-1,1,2,-12,12):
            q=p+d
            if q%12 in sc and abs(d) in err: c[q]=err[abs(d)]
        C.append(c)
    phrase_end=[i==N-1 or ns[i+1]['s']-(ns[i]['s']+ns[i]['l'])>=4 for i in range(N)]
    newph=[i==0 or ns[i]['s']-(ns[i-1]['s']+ns[i-1]['l'])>=4 for i in range(N)]
    def unary(i,q):
        n=ns[i]; m=metric(n['s']); u=W['f']*C[i][q]
        ch=chords.get(n['s']//16)
        if ch: a=Mo.ch[(m,dur(n['l']))]; u+=W['c']*(a[1] if q%12 in ch else a[0])
        if i==N-1: u+=W['e']*Mo.fin[mode][(q-T)%12]
        elif phrase_end[i]: u+=W['e']*Mo.end[mode][(q-T)%12]
        return u
    def sgn(x): return (x>0)-(x<0)
    # second-order Viterbi: state (prev pitch, cur pitch)
    V={}
    for q in C[0]: V[(None,q)]=(unary(0,q),[q])
    for i in range(1,N):
        m=metric(ns[i]['s']); hd=sgn(ns[i]['p']-ns[i-1]['p']); NV={}
        for q in C[i]:
            u=unary(i,q); best=None
            for (a,b),(sc0,path) in V.items():
                if newph[i]: t=0.0
                else:
                    iv=q-b; mv=move(None if a is None or newph[i-1] else b-a)
                    t=W['m']*Mo.lp[(mode,(b-T)%12,m,mv)][iv+12] if -12<=iv<=12 else W['m']*-12
                    if sgn(iv)!=hd: t-=W['d']
                v=sc0+t+u
                if best is None or v>best[0]: best=(v,path,b)
            NV[(best[2],q)]=(best[0],best[1]+[q])
        V=NV
    path=max(V.values(),key=lambda x:x[0])[1]
    return [{**n,'p':q} for n,q in zip(ns,path)]
