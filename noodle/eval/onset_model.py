# A small learned note-start detector on top of the app's own per-frame readings (pitch, loudness, confidence).
# Trained only on CC BY data (VocalSet + odd Vocadito tracks); tested on even Vocadito tracks and HumTrans (measure only).
import json, sys, os, numpy as np, mir_eval, collections
sys.path.insert(0, os.path.dirname(__file__)); from score import gt, score
F=json.load(open('results/frames.json'))
OFFS=list(range(-8,9,2)); HOP=0.01

def prep(fr, sens=55):
    a=np.array(fr,dtype=float); t,db,conf,m=a.T; sN=sens/100
    floor,top=np.percentile(db,15),np.percentile(db,99); gate=floor+max(8,(top-floor)*(0.42-0.25*sN)); cth=0.2+0.12*sN
    v=(db>gate)&(conf<cth)&(m>28)&(m<96)
    pm=np.full(len(m),np.nan)
    for i in np.where(v)[0]:
        w=[m[j] for j in range(max(0,i-2),min(len(m),i+3)) if v[j]]; pm[i]=np.median(w)
    return t,db,conf,m,v,pm,top
def feats(fr):
    t,db,conf,m,v,pm,top=prep(fr); n=len(t); X=np.zeros((n,len(OFFS)*4+1))
    for c,k in enumerate(OFFS):
        idx=np.clip(np.arange(n)+k,0,n-1)
        dp=pm[idx]-pm; X[:,c]=np.where(np.isnan(dp),0,np.clip(dp,-4,4))
        X[:,len(OFFS)+c]=v[idx]
        X[:,2*len(OFFS)+c]=np.clip(db[idx]-db,-30,30)/10
        X[:,3*len(OFFS)+c]=np.clip(conf[idx],0,1)
    X[:,-1]=np.clip(db-top,-60,0)/20
    return X
def labels(f, t):
    ri,_=gt(f); y=np.zeros(len(t))
    for a in ri[:,0]: y[np.abs(t-a)<=0.02]=1
    return y
class MLP:
    def __init__(s,d,h=32,seed=0):
        r=np.random.RandomState(seed); s.W1=r.randn(d,h)*np.sqrt(1/d); s.b1=np.zeros(h); s.W2=r.randn(h)*np.sqrt(1/h); s.b2=0.0
    def fwd(s,X): H=np.tanh(X@s.W1+s.b1); return H, 1/(1+np.exp(-(H@s.W2+s.b2)))
    def fit(s,X,y,epochs=30,lr=3e-3,bs=512,pw=4.0,seed=0):
        r=np.random.RandomState(seed); P=[s.W1,s.b1,s.W2,np.array([s.b2])]; M=[np.zeros_like(p) for p in P]; V=[np.zeros_like(p) for p in P]; k=0
        for ep in range(epochs):
            for i in np.array_split(r.permutation(len(X)), max(1,len(X)//bs)):
                xb,yb=X[i],y[i]; H,p=s.fwd(xb); w=np.where(yb>0,pw,1.0); g=(p-yb)*w/len(i)
                gW2=H.T@g; gb2=g.sum(); gH=np.outer(g,s.W2)*(1-H**2); gW1=xb.T@gH; gb1=gH.sum(0)
                G=[gW1,gb1,gW2,np.array([gb2])]; k+=1
                for j,(p_,g_) in enumerate(zip(P,G)):
                    M[j]=0.9*M[j]+0.1*g_; V[j]=0.999*V[j]+0.001*g_**2; p_-=lr*(M[j]/(1-0.9**k))/(np.sqrt(V[j]/(1-0.999**k))+1e-8)
            s.b2=float(P[3][0])
        return s
    def prob(s,X): return s.fwd(X)[1]
def tune_of(m,v):
    ok=[i for i in range(2,len(m)-2) if v[i] and v[i-2] and v[i+2] and abs(m[i]-m[i-2])<=0.25 and abs(m[i]-m[i+2])<=0.25]
    if len(ok)<10: return 0
    an=2*np.pi*(m[ok]-np.round(m[ok])); c,s_=np.cos(an).sum(),np.sin(an).sum()
    return np.arctan2(s_,c)/(2*np.pi) if np.hypot(c,s_)/len(ok)>0.12 else 0
def decode(fr, p, thr=0.5, mind=8, minlen=0.06):
    t,db,conf,m,v,pm,top=prep(fr); n=len(t); tune=tune_of(m,v)
    pk=[i for i in range(n) if p[i]>=thr and p[i]==p[max(0,i-mind):i+mind+1].max()]
    # also start a note where voicing begins after a pause, if the model put nothing near it
    starts=sorted(set(pk)); notes=[]
    for a,b in zip(starts, starts[1:]+[n]):
        e=a
        while e+1<b and (v[e+1] or (e+3<b and v[e+2:e+4].any())): e+=1
        seg=[x for x in pm[a:e+1] if not np.isnan(x)]
        if (e-a+1)*HOP<minlen or len(seg)<4: continue
        mid=seg[len(seg)//4: max(len(seg)//4+1, 3*len(seg)//4)]
        notes.append([t[a]-HOP/2, t[e]+HOP/2, float(np.median(mid))-tune])
    return notes
def evaluate(R, files):
    by=collections.defaultdict(list)
    for f in files:
        ri,rh=gt(f); est=R[f]; ds='vocadito' if 'vocadito' in f else 'vocalset' if 'vocalset' in f else 'humtrans'
        if ds=='humtrans' and est:
            eo=np.array([x[0] for x in est]); best=max(((mir_eval.onset.f_measure(ri[:,0]+d,eo,window=0.05)[0],d) for d in np.arange(-0.2,1.5,0.01)))[1]; ri=ri+best
        s=max(((score(ri,rh,est,sh)[2],sh) for sh in range(-12,13)))[1] if ds=='humtrans' else 0
        by[ds].append(score(ri,rh,est,s)[2])
    return {k:round(float(np.mean(v)),3) for k,v in by.items()}
if __name__=='__main__':
    files=list(F); vo=lambda f:int(f.split('vocadito_')[1].split('.')[0])
    train=[f for f in files if 'vocalset' in f or ('vocadito' in f and vo(f)%2==1)]
    test=[f for f in files if ('vocadito' in f and vo(f)%2==0) or 'humtrans' in f]
    X=np.vstack([feats(F[f]) for f in train]); y=np.concatenate([labels(f,np.array(F[f])[:,0]) for f in train])
    mu,sd=X.mean(0),X.std(0)+1e-6; print('train frames',len(X),'positives',int(y.sum()))
    net=MLP(X.shape[1]).fit((X-mu)/sd,y)
    base=json.load(open('results/sm/r_sm10.json')); bR={f:base[f]['notes'] for f in test}
    print('app detector (live)      ', evaluate(bR,test))
    for thr in [0.4,0.5,0.6,0.7]:
        R={f:decode(F[f], net.prob((feats(F[f])-mu)/sd), thr) for f in test}; print(f'model, threshold {thr}     ', evaluate(R,test))
    np.savez('results/onset_net.npz',W1=net.W1,b1=net.b1,W2=net.W2,b2=net.b2,mu=mu,sd=sd)
