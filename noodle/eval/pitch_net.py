# Intended-note model: reads the whole sung phrase (Noodle's detected notes) and predicts, for each note, how many semitones
# the intended note is from the sung one (-5..+5). Trained on synthetic singers (real folk-tune excerpts, squeezed jumps, drift)
# where the intended notes are known exactly.
import json, os, sys, numpy as np, torch, torch.nn as nn, collections
torch.set_num_threads(int(os.environ.get('TH','4'))); K=5
def note_feats(notes, bpm=None, t0=None):
    """notes: [(t0,t1,raw_pitch)] in time order -> features per note"""
    p=np.array([n[2] for n in notes],float); n=len(p); med=np.median(p)
    t=np.array([n[0] for n in notes]); dur=np.array([n[1]-n[0] for n in notes])
    dp=np.diff(p,prepend=p[0]); dn=np.diff(p,append=p[-1])
    F=[(p-med)/12, dp/12, dn/12, p-np.round(p), np.log(np.maximum(dur,0.03))/3, np.arange(n)/max(1,n-1)]
    if bpm:
        b=(t-t0)*bpm/60; F+= [np.sin(2*np.pi*b), np.cos(2*np.pi*b), np.sin(2*np.pi*b/4), np.cos(2*np.pi*b/4), np.ones(n)]
    else: F+= [np.zeros(n)]*5
    return np.stack(F,1).astype(np.float32)
class PNet(nn.Module):
    def __init__(s,d=11,h=64):
        super().__init__(); s.i=nn.Linear(d,h); s.g=nn.GRU(h,h,num_layers=2,batch_first=True,bidirectional=True); s.o=nn.Linear(2*h,2*K+1)
    def forward(s,x): h,_=s.g(torch.relu(s.i(x))); return s.o(h)
def match(app, lab):
    """for each detected note, the intended note it belongs to (most overlap), or None"""
    out=[]
    for a,b,p in app:
        best=None; bo=0
        for c,d,q in lab:
            ov=min(b,d)-max(a,c)
            if ov>bo: bo=ov; best=q
        out.append(best if bo>=0.5*(b-a) else None)
    return out
def build(app_json, label_dirs):
    A=json.load(open(app_json)); L={}
    for d in label_dirs: L.update({f'{d}/{k}.wav':v for k,v in json.load(open(f'{d}/labels.json')).items()})
    X=[];Y=[];names=[]
    for f,v in A.items():
        if f not in L or len(v['notes'])<3: continue
        lab=L[f]; app=sorted(v['notes']); tg=match(app,lab['notes'])
        if os.environ.get('REL'):   # target: how much each jump (from the previous note) was meant to differ from the sung jump
            y=[-100]
            for i in range(1,len(app)):
                if tg[i] is None or tg[i-1] is None: y.append(-100); continue
                c=(int(tg[i])-int(tg[i-1]))-int(round(app[i][2]-app[i-1][2])); y.append(c if abs(c)<=K else -100)
        else: y=[(int(q)-int(round(p)) if q is not None and abs(int(q)-int(round(p)))<=K else -100) for (a,b,p),q in zip(app,tg)]
        X.append(note_feats(app,lab.get('bpm'),lab.get('t0'))); Y.append(np.array([v+K if v!=-100 else -100 for v in y])); names.append(f)
    return X,Y,names
def train(X,Y,steps=3000,seed=0,init=None,lr=2e-3):
    torch.manual_seed(seed); r=np.random.RandomState(seed); net=PNet(X[0].shape[1])
    if init: net.load_state_dict(torch.load(init))
    opt=torch.optim.Adam(net.parameters(),lr); lossf=nn.CrossEntropyLoss(ignore_index=-100)
    for st in range(steps):
        idx=r.randint(len(X),size=32); L=max(len(X[i]) for i in idx)
        xb=np.zeros((32,L,X[0].shape[1]),np.float32); yb=np.full((32,L),-100)
        for j,i in enumerate(idx):
            x=X[i].copy(); 
            if r.rand()<0.3: x[:,6:]=0   # sometimes no beat grid
            xb[j,:len(x)]=x; yb[j,:len(x)]=Y[i]
        out=net(torch.tensor(xb)); loss=lossf(out.reshape(-1,2*K+1),torch.tensor(yb).reshape(-1)); opt.zero_grad(); loss.backward(); opt.step()
        if st%500==0: print(st,round(loss.item(),3),flush=True)
    net.eval(); return net
def predict(net, notes, bpm=None, t0=None):
    x=note_feats(notes,bpm,t0)
    with torch.no_grad(): o=net(torch.tensor(x[None]))[0].numpy()
    if os.environ.get('REL'):   # rebuild the melody from the first note, jump by jump
        q=[int(round(notes[0][2]))]
        for i in range(1,len(notes)): q.append(q[-1]+int(round(notes[i][2]-notes[i-1][2]))+int(np.argmax(o[i]))-K)
        return q,o
    return [int(round(n[2]))+int(np.argmax(oo))-K for n,oo in zip(notes,o)], o
if __name__=='__main__':
    X,Y,names=build('results/syn2_app.json',[f'data/synthv2_{i}' for i in (1,2,3,4)]+['data/synthv2_test'])
    tr=[i for i,n in enumerate(names) if 'synthv2_test' not in n]; te=[i for i,n in enumerate(names) if 'synthv2_test' in n]
    print('train takes',len(tr),'test',len(te))
    net=train([X[i] for i in tr],[Y[i] for i in tr]); torch.save(net.state_dict(),'results/pitchnet_rel.pt' if os.environ.get('REL') else 'results/pitchnet.pt')
    # unseen synthetic singers: note-pitch accuracy vs rounding
    ok=collections.Counter(); tot=0
    for i in te:
        with torch.no_grad(): o=net(torch.tensor(X[i][None]))[0].numpy()
        m=Y[i]!=-100; tot+=m.sum(); ok['model']+=(o.argmax(1)[m]==Y[i][m]).sum(); ok['round']+=(Y[i][m]==K).sum()
    print({k:round(v/tot,3) for k,v in ok.items()},'notes',tot)
