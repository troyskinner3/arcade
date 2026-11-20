# Synthetic check on held-out songs: corrupt real melodies with the reader's error pattern, see how many notes each decoder restores.
import sys,json,random; sys.path.insert(0,sys.argv[0].rsplit('/',1)[0]); import dec
H=json.load(open(sys.argv[1])); Mo=dec.Model(json.load(open(sys.argv[2]))); rng=random.Random(3)
ERR=[(-4,1),(-3,1),(-2,16),(-1,9),(0,124),(1,9),(2,12),(3,4),(4,4),(5,2),(7,1)]; pool=[d for d,c in ERR for _ in range(c)]
cases=[]
for d in H:
    if tuple(d['meter']) not in ((4,4),(2,2)): continue
    ns=[{'s':n[0],'l':n[1],'p':n[2]} for n in d['notes'] if n[3]>=0]
    if len(ns)<40: continue
    st=rng.randrange(0,len(ns)-32); seg=ns[st:st+32]; o=seg[0]['s']-seg[0]['s']%16
    seg=[{**n,'s':n['s']-o} for n in seg]
    sc=set((d['tonic']+k)%12 for k in (dec.MAJ if d['mode']=='major' else dec.MIN))
    noisy=[]
    for n in seg:
        q=n['p']+rng.choice(pool)
        if q%12 not in sc: q+=rng.choice((-1,1))
        if q%12 not in sc: q=n['p']
        noisy.append({**n,'p':q})
    cases.append((seg,noisy,(d['tonic'],d['mode'])))
    if len(cases)>=600: break
def acc(W, known_key=True):
    ok=0; tot=0
    for seg,noisy,K in cases:
        out=dec.decode(noisy,W,Mo,key=K if known_key else None,err={0:0.0,1:-2.6,2:-2.2,12:-5.0})
        ok+=sum(a['p']==b['p'] for a,b in zip(out,seg)); tot+=len(seg)
    return ok/tot
base=sum(sum(a['p']==b['p'] for a,b in zip(n,s)) for s,n,_ in cases)/sum(len(s) for s,_,_ in cases)
print('cases',len(cases),'noisy acc',round(base,3))
for W in [dict(f=1,m=1,c=0,e=0,d=0),dict(f=1,m=1,c=1,e=1,d=0),dict(f=1,m=1,c=1,e=1,d=1),dict(f=1,m=1.5,c=1,e=1,d=1),dict(f=1,m=2,c=1,e=1,d=1),dict(f=1,m=1,c=0,e=1,d=1),dict(f=1,m=0.7,c=0.5,e=0.5,d=1)]:
    print(W, round(acc(W),3), 'key guessed', round(acc(W,False),3), flush=True)
