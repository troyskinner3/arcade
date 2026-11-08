import json,sys,numpy as np,torch
sys.path.insert(0,'tools'); from rhythm_lm import build_lm,best_split; from intent_net2 import featurize,Net
LM=build_lm(); FR=json.load(open('results/user_frames.json'))
L={'long-vowels':[(0,64)],'long-swell':[(0,64)],'long-bend':[(0,41),(41,5),(46,18)]}
net=None
for pr,ns in L.items():
    f=[k for k in FR if pr in k][0]; fr=FR[f]; X=featurize('data/user/'+f,fr,90.0,0.06,4.0)
    if net is None: net=Net(X.shape[1]); net.load_state_dict(torch.load('results/intent2.pt')); net.eval()
    with torch.no_grad(): P=torch.sigmoid(net(torch.tensor(X[None])))[0].numpy()[:,0]
    t=np.array(fr)[:,0]; sd=60/90/4
    def ev(step):
        tt=0.06+step*sd; w=(t>tt-0.06)&(t<tt+0.06); p=float(P[w].max()) if w.any() else 0.05; p=min(max(p,1e-3),1-1e-3); return np.log(p/(1-p))
    for lam in (0.0,0.6,1.0,2.0):
        out=[y for s,l in ns for y in best_split({'s':s,'l':l,'x':False},LM,ev,lam)]
        print(pr,lam,len(ns),'->',len(out),[(o['s'],o['l']) for o in out])
