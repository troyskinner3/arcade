# Learned note reader: log-mel sound + the app's own pitch/loudness/confidence -> note starts and "a note is sounding".
# Trained on synthetic takes (+ CC BY real takes), tested on held-out real takes (even Vocadito, HumTrans measure-only).
import json, sys, os, numpy as np, torch, torch.nn as nn, collections
from scipy.io import wavfile; from scipy.signal import resample_poly
sys.path.insert(0, os.path.dirname(__file__)); import onset_model as O; from score import gt; from edits import report
torch.set_num_threads(int(os.environ.get("TH","4"))); SR=16000; NM=48
_mel=None
def melfb():
    global _mel
    if _mel is None:
        hz=lambda m:700*(10**(m/2595)-1); mm=np.linspace(2595*np.log10(1+60/700),2595*np.log10(1+7600/700),NM+2); pts=hz(mm)/SR*512
        fb=np.zeros((NM,257)); k=np.arange(257)
        for i in range(NM): a,b,c=pts[i:i+3]; fb[i]=np.clip(np.minimum((k-a)/(b-a),(c-k)/(c-b)),0,None)
        _mel=fb
    return _mel
def logmel(f,times):
    sr,x=wavfile.read(f); x=x.astype(np.float32); x=x.mean(1) if x.ndim>1 else x; x/=max(1e-9,np.abs(x).max())
    if sr!=SR:
        if os.environ.get('LINRES'):   # what a phone browser does cheaply: two 7 kHz low-pass biquads, then straight-line resampling
            from scipy.signal import lfilter
            w=2*np.pi*7000/sr; cs,sn=np.cos(w),np.sin(w); al=sn/(2*0.707); b=np.array([(1-cs)/2,1-cs,(1-cs)/2])/(1+al); a=np.array([1,-2*cs/(1+al),(1-al)/(1+al)])
            x=lfilter(b,a,lfilter(b,a,x)); n=int((len(x)-1)*SR/sr); pos=np.arange(n)*sr/SR; i0=pos.astype(int); fr=pos-i0; x=x[i0]*(1-fr)+x[i0+1]*fr
        else: g=np.gcd(sr,SR); x=resample_poly(x,SR//g,sr//g)
    x=np.pad(x,256); c=(np.asarray(times)*SR).astype(int); c=np.clip(c,0,len(x)-513)
    W=np.hanning(512); fr=np.stack([x[i:i+512]*W for i in c]); S=np.abs(np.fft.rfft(fr,axis=1))**2
    L=np.log10(S@melfb().T+1e-8); return (L-L.max())/4   # level-free
def featurize(f,fr):
    a=np.array(fr,dtype=float); t,db,conf,m=a.T; t_,db_,conf_,m_,v,pm,top=O.prep(fr)
    mid=np.where(np.isnan(pm),0,pm-np.nanmedian(pm) if np.isfinite(pm).any() else 0)/12
    dp=np.diff(np.where(np.isnan(pm),0,pm),prepend=0); dp=np.clip(np.where(np.isnan(pm),0,dp),-3,3)/3
    app=np.stack([np.clip(db-top,-60,0)/20, np.clip(conf,0,1), v.astype(float), mid, dp],1)
    return np.concatenate([logmel(f,t),app],1).astype(np.float32)
def targets(f,t):
    ri,_=gt(f); on=np.zeros(len(t)); act=np.zeros(len(t))
    for a,b in ri:
        on=np.maximum(on,np.exp(-0.5*((t-a)/0.015)**2)); act[(t>=a)&(t<b)]=1
    return np.stack([on,act],1).astype(np.float32)
class Net(nn.Module):
    def __init__(s,d,h=64):
        super().__init__(); s.c=nn.Sequential(nn.Conv1d(d,h,5,padding=2),nn.ReLU(),nn.Conv1d(h,h,5,padding=4,dilation=2),nn.ReLU())
        s.g=nn.GRU(h,h//2,batch_first=True,bidirectional=True); s.o=nn.Linear(h,2)
    def forward(s,x): h=s.c(x.transpose(1,2)).transpose(1,2); h,_=s.g(h); return s.o(h)
def decode(fr,P,thr=0.5,mind=6):
    t,db,conf,m,v,pm,top=O.prep(fr); n=len(t); tune=O.tune_of(m,v); on,act=P[:,0],P[:,1]
    pk=[i for i in range(n) if on[i]>=thr and on[i]==on[max(0,i-mind):i+mind+1].max()]; notes=[]
    for a,b in zip(pk,pk[1:]+[n]):
        e=a
        while e+1<b and act[e+1]>=0.5: e+=1
        seg=[x for x in pm[a:e+1] if not np.isnan(x)]
        if (e-a+1)*0.01<0.06 or len(seg)<4: continue
        mid=seg[len(seg)//4:max(len(seg)//4+1,3*len(seg)//4)]; notes.append([t[a]-0.005,t[e]+0.005,float(np.median(mid))-tune])
    return notes
if __name__=='__main__':
    F=O.F; F.update(json.load(open('results/frames_syn.json')))
    vo=lambda f:int(f.split('vocadito_')[1].split('.')[0])
    real=[f for f in F if 'vocalset' in f or ('vocadito' in f and vo(f)%2==1)]; syn=[f for f in F if '/synth' in f]
    test=[f for f in F if ('vocadito' in f and vo(f)%2==0) or 'humtrans' in f]
    cache='results/intent_feats.npz'
    if os.path.exists(cache): D=dict(np.load(cache,allow_pickle=True))['D'].item()
    else:
        D={f:featurize(f,F[f]) for f in real+syn+test}; np.savez(cache,D=np.array(D,dtype=object))
    T={f:targets(f,np.array(F[f])[:,0]) for f in real+syn}
    mode=sys.argv[1] if len(sys.argv)>1 else 'both'; train=dict(real=real,syn=syn,both=real+syn)[mode]
    if os.environ.get('LOAD'): steps=0
    torch.manual_seed(0); r=np.random.RandomState(0); net=Net(D[train[0]].shape[1]); opt=torch.optim.Adam(net.parameters(),2e-3)
    W=torch.tensor([3.0,1.0]); L=400; steps=int(sys.argv[2]) if len(sys.argv)>2 else 3000
    wts=np.array([3.0 if f in real else 1.0 for f in train]); wts/=wts.sum()   # real takes count more
    steps=steps if not os.environ.get('LOAD') else 0
    for st in range(steps):
        xb,yb=[],[]
        for _ in range(16):
            f=train[r.choice(len(train),p=wts)]; X=D[f]; Y=T[f]; i=r.randint(0,max(1,len(X)-L)); xx,yy=X[i:i+L],Y[i:i+L]
            if len(xx)<L: xx=np.pad(xx,((0,L-len(xx)),(0,0))); yy=np.pad(yy,((0,L-len(yy)),(0,0)))
            g=r.uniform(-0.3,0.3); xx=xx.copy(); xx[:,:NM]+=g   # level jitter
            xb.append(xx); yb.append(yy)
        out=net(torch.tensor(np.array(xb))); y=torch.tensor(np.array(yb))
        loss=(nn.functional.binary_cross_entropy_with_logits(out,y,reduction='none')*W).mean(); opt.zero_grad(); loss.backward(); opt.step()
        if st%500==0: print(st,round(loss.item(),4),flush=True)
    if os.environ.get('LOAD'): net.load_state_dict(torch.load(f'results/intent_{mode}.pt'))
    else: torch.save(net.state_dict(),f'results/intent_{mode}.pt')
    net.eval(); (lambda *a:None)(net.state_dict(),f'results/intent_{mode}.pt')
    with torch.no_grad(): PR={f:torch.sigmoid(net(torch.tensor(D[f][None])))[0].numpy() for f in test}
    for thr in [0.15,0.2,0.3]:
        R={f:decode(F[f],PR[f],thr) for f in test}; print(mode,'thr',thr,'note F1',O.evaluate(R,test)); report(R,f'{mode} thr {thr}')
