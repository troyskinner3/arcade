# Longer-memory melody model: next interval given the next note's beat strength, the current scale degree, and the last k intervals
# (+ the current note's beat strength). Witten-Bell interpolation across orders; contexts kept only if seen >= MINC times.
# usage: python3 -I ngram.py <pdmx_mel.jsonl> <corpus.json> <guides.json> <out.json> <maxorder> [eval held.json]
import sys, json, collections, math
sys.path.insert(0, sys.argv[0].rsplit('/',1)[0])
import train as TR
DISC=float(__import__('os').environ.get('DISC','0.75'))
MINC=int(__import__('os').environ.get('MINC','8'))
def seqs(d):
    # yields phrases as lists of (deg, metric, iv) with iv None at a phrase start
    ns=d['notes']; T=d['tonic']; out=[]; cur=[]
    for i,n in enumerate(ns):
        m=TR.metric_any(n[3], d['bar'], tuple(d['meter']))
        if i and n[0]-(ns[i-1][0]+ns[i-1][1])>=4 or m is None:
            if len(cur)>1: out.append(cur)
            cur=[]
            if m is None: continue
        iv=None if not cur else n[2]-cur[-1][3]
        if iv is not None and abs(iv)>12:
            if len(cur)>1: out.append(cur)
            cur=[]; iv=None
        cur.append(((n[2]-T)%12, m, iv, n[2]))
    if len(cur)>1: out.append(cur)
    return out
def ctx(ph, i, k):
    # context for predicting ph[i]'s interval: (mode added outside) next metric, current deg, current metric, then k-1 previous intervals
    c=(ph[i][1], ph[i-1][0], ph[i-1][1])
    for j in range(1,k):
        a=ph[i-j][2] if i-j>=0 else None
        c+=('S' if a is None else a,)
        if a is None: break
    return c
class NG:
    def __init__(s, K): s.K=K; s.c=[collections.defaultdict(collections.Counter) for _ in range(K+1)]
    def add(s, mode, ph):
        for i in range(1,len(ph)):
            iv=ph[i][2]
            for k in range(0,s.K+1):
                key=(mode,) + (ctx(ph,i,k) if k else (ph[i][1],))
                if k and len(key)<k+3: break
                s.c[k][key][iv]+=1
    def prune(s):
        for k in range(1,s.K+1):
            s.c[k]={a:b for a,b in s.c[k].items() if sum(b.values())>=MINC}
    def prob(s, mode, ph, i, iv):
        p=1/25
        for k in range(0,s.K+1):
            key=(mode,) + (ctx(ph,i,k) if k else (ph[i][1],))
            if k and len(key)<k+3: break  # context hit a phrase start: this order is the same as the one before
            C=s.c[k].get(key)
            if not C: break
            n=sum(C.values()); t=len(C); D=DISC
            p=max(C.get(iv,0)-D,0)/n+D*t/n*p
        return p
if __name__=='__main__':
    pdmx, folk, guides, out, K = sys.argv[1:6]; K=int(K)
    G=json.load(open(guides)); grams=set()
    for name, ns in G.items():
        if name.startswith('scale'): continue
        ns=sorted(ns,key=lambda n:n['s']); iv=tuple(ns[i+1]['p']-ns[i]['p'] for i in range(len(ns)-1))
        for i in range(len(iv)-7): grams.add(iv[i:i+8])
    held=json.load(open(sys.argv[6])) if len(sys.argv)>6 else None
    hk=set(json.dumps(d['notes'][:20]) for d in held) if held else set()
    m=NG(K); n=0
    for src,d in TR.songs(pdmx, folk):
        if TR.leak(d['notes'],grams) or json.dumps(d['notes'][:20]) in hk: continue
        for ph in seqs(d): m.add(d['mode'], ph)
        n+=1
    m.prune(); print('songs',n,'contexts',[len(c) for c in m.c], flush=True)
    if held:
        for k in range(0,K+1):
            m2=NG(k); m2.c=m.c[:k+1]; ll=0; nn=0
            for d in held[:800]:
                for ph in seqs(d):
                    for i in range(1,len(ph)): ll+=math.log(m2.prob(d['mode'],ph,i,ph[i][2])); nn+=1
            print('order',k,'bits/note',round(-ll/nn/math.log(2),3),'perplexity',round(math.exp(-ll/nn),2), flush=True)
    import pickle; pickle.dump(m.c, open(out,'wb'))
