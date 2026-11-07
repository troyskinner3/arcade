# Same jump-correction model, smaller, with dropout and early stopping on held-out synthetic tunes
import os, sys, numpy as np, torch, torch.nn as nn, collections; os.environ['REL']='1'; sys.path.insert(0,os.path.dirname(__file__))
import pitch_net as P
X,Y,names=P.build('results/syn2_app.json',[f'data/synthv2_{i}' for i in (1,2,3,4)]+['data/synthv2_test'])
tr=[i for i,n in enumerate(names) if 'synthv2_test' not in n]; te=[i for i,n in enumerate(names) if 'synthv2_test' in n]
va=tr[-200:]; tr=tr[:-200]
class Small(nn.Module):
    def __init__(s,d=11,h=32):
        super().__init__(); s.i=nn.Linear(d,h); s.d=nn.Dropout(0.3); s.g=nn.GRU(h,h,batch_first=True,bidirectional=True); s.o=nn.Linear(2*h,2*P.K+1)
    def forward(s,x): h,_=s.g(s.d(torch.relu(s.i(x)))); return s.o(s.d(h))
def acc(net,idx):
    net.eval(); ok=0; base=0; tot=0
    with torch.no_grad():
        for i in idx:
            o=net(torch.tensor(X[i][None]))[0].numpy(); m=Y[i]!=-100; tot+=m.sum(); ok+=(o.argmax(1)[m]==Y[i][m]).sum(); base+=(Y[i][m]==P.K).sum()
    net.train(); return ok/tot, base/tot
torch.manual_seed(0); r=np.random.RandomState(0); net=Small(); opt=torch.optim.Adam(net.parameters(),1e-3,weight_decay=1e-4); lossf=nn.CrossEntropyLoss(ignore_index=-100)
best=(0,None)
for st in range(4000):
    idx=r.choice(tr,32); L=max(len(X[i]) for i in idx); xb=np.zeros((32,L,11),np.float32); yb=np.full((32,L),-100)
    for j,i in enumerate(idx): x=X[i].copy(); x[:,5]=0; xb[j,:len(x)]=x; yb[j,:len(x)]=Y[i]   # drop "position in phrase" (memorisation cue)
    out=net(torch.tensor(xb)); loss=lossf(out.reshape(-1,2*P.K+1),torch.tensor(yb).reshape(-1)); opt.zero_grad(); loss.backward(); opt.step()
    if st%250==0:
        a,b=acc(net,va); print(st,'val',round(a,3),'no-correction',round(b,3),flush=True)
        if a>best[0]: best=(a,{k:v.clone() for k,v in net.state_dict().items()})
net.load_state_dict(best[1]); a,b=acc(net,te); print('unseen synthetic test: model',round(a,3),'no-correction',round(b,3))
