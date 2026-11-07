# Learned note reader v2: sound (log-mel) + the app's pitch/loudness/confidence + where each moment sits on the beat grid
# (known while recording in Noodle; unknown for outside recordings -> flag 0). Targets: note starts and "a note is sounding".
# Trained on synthetic v2 (real folk-tune excerpts, squeezed jumps, repeats hummed as one sound) + v1 synthetic + CC BY real.
import json, sys, os, numpy as np, torch, torch.nn as nn, collections, glob
sys.path.insert(0, os.path.dirname(__file__)); import onset_model as O; from score import gt, _SYN, gt_synth; from edits import report
from intent_net import logmel, targets, decode, NM
torch.set_num_threads(int(os.environ.get('TH','4')))
def grid_feats(t, bpm, t0, bpb=4.0):
    if bpm is None: return np.zeros((len(t),5),np.float32)
    beat=(t-t0)*bpm/60.0; ph=2*np.pi*(beat%1.0); bph=2*np.pi*((beat/bpb)%1.0)
    return np.stack([np.sin(ph),np.cos(ph),np.sin(bph),np.cos(bph),np.ones(len(t))],1).astype(np.float32)
def featurize(wav, fr, bpm=None, t0=None, bpb=4.0):
    a=np.array(fr,dtype=float); t,db,conf,m=a.T; _,_,_,_,v,pm,top=O.prep(fr)
    mid=np.where(np.isnan(pm),0,pm-np.nanmedian(pm) if np.isfinite(pm).any() else 0)/12
    dp=np.clip(np.where(np.isnan(pm),0,np.diff(np.where(np.isnan(pm),0,pm),prepend=0)),-3,3)/3
    app=np.stack([np.clip(db-top,-60,0)/20,np.clip(conf,0,1),v.astype(float),mid,dp],1)
    return np.concatenate([logmel(wav,t),app,grid_feats(t,bpm,t0,bpb)],1).astype(np.float32)
HID=int(os.environ.get('HID','96')); LAY=int(os.environ.get('LAY','2'))
class Net(nn.Module):
    def __init__(s,d,h=None):
        h=h or HID
        super().__init__(); s.c=nn.Sequential(nn.Conv1d(d,h,5,padding=2),nn.ReLU(),nn.Conv1d(h,h,5,padding=4,dilation=2),nn.ReLU(),nn.Conv1d(h,h,5,padding=8,dilation=4),nn.ReLU())
        s.g=nn.GRU(h,h//2,batch_first=True,bidirectional=True,num_layers=LAY); s.o=nn.Linear(h,2)
    def forward(s,x): h=s.c(x.transpose(1,2)).transpose(1,2); h,_=s.g(h); return s.o(h)
def syn_grid(f):
    d=os.path.dirname(f); k=os.path.basename(f)[:-4]; gt_synth(f); L=_SYN[d][k]
    return (L.get('bpm'),L.get('t0'),L.get('beats_per_bar',4.0)) if 't0' in L else (None,None,4.0)
if __name__=='__main__':
    F=O.F; F.update(json.load(open('results/frames_syn.json'))); F.update(json.load(open('results/frames_syn2.json')))
    vo=lambda f:int(f.split('vocadito_')[1].split('.')[0])
    real=[f for f in F if 'vocalset' in f or ('vocadito' in f and vo(f)%2==1)]
    syn1=[f for f in F if '/synth' in f and 'synthv2' not in f]; syn2=[f for f in F if 'synthv2' in f]
    test=[f for f in F if ('vocadito' in f and vo(f)%2==0) or 'humtrans' in f]
    cache='results/intent2_feats.npz'
    if os.path.exists(cache): D=dict(np.load(cache,allow_pickle=True))['D'].item()
    else:
        D={}
        for f in real+syn1+syn2+test:
            g=syn_grid(f) if '/synth' in f else (None,None,4.0); D[f]=featurize(f,F[f],*g)
        np.savez(cache,D=np.array(D,dtype=object))
    T={f:targets(f,np.array(F[f])[:,0]) for f in real+syn1+syn2}
    train=real+syn1+syn2; wts=np.array([4.0 if f in real else 1.5 if f in syn2 else 0.7 for f in train]); wts/=wts.sum()
    torch.manual_seed(0); r=np.random.RandomState(0); net=Net(D[train[0]].shape[1]); opt=torch.optim.Adam(net.parameters(),1.5e-3)
    W=torch.tensor([3.0,1.0]); L=500; steps=int(sys.argv[1]) if len(sys.argv)>1 else 4000
    for st in range(steps):
        xb,yb=[],[]
        for _ in range(16):
            f=train[r.choice(len(train),p=wts)]; X=D[f].copy(); Y=T[f]; i=r.randint(0,max(1,len(X)-L)); xx,yy=X[i:i+L],Y[i:i+L]
            if len(xx)<L: xx=np.pad(xx,((0,L-len(xx)),(0,0))); yy=np.pad(yy,((0,L-len(yy)),(0,0)))
            xx[:,:NM]+=r.uniform(-0.3,0.3)
            if r.rand()<0.25: xx[:,-5:]=0     # sometimes hide the grid so the model also works without one
            xb.append(xx); yb.append(yy)
        out=net(torch.tensor(np.array(xb))); y=torch.tensor(np.array(yb))
        loss=(nn.functional.binary_cross_entropy_with_logits(out,y,reduction='none')*W).mean(); opt.zero_grad(); loss.backward(); opt.step()
        if st%500==0: print(st,round(loss.item(),4),flush=True)
    net.eval(); torch.save(net.state_dict(),os.environ.get('OUT','results/intent2.pt'))
    with torch.no_grad(): PR={f:torch.sigmoid(net(torch.tensor(D[f][None])))[0].numpy() for f in test}
    for thr in [0.2,0.3,0.4]:
        R={f:decode(F[f],PR[f],thr) for f in test}; report(R,f'v2 thr {thr}')
