# Fine-tune the v2 note reader on the owner's re-sung takes of one tune group (+ the usual mix), one model per group
import sys,json,os,numpy as np,torch,torch.nn as nn; sys.path.insert(0,os.path.dirname(__file__))
from intent_net2 import featurize, Net, syn_grid; from intent_net import NM, targets; import onset_model as O
torch.set_num_threads(4)
FT=json.load(open('results/frames_tp.json')); F=O.F; F.update(json.load(open('results/frames_syn2.json'))); F.update(FT)
base=dict(np.load('results/intent2_feats.npz',allow_pickle=True))['D'].item()
pool=[f for f in base if 'synthv2' in f][:800]+[f for f in base if 'vocadito' in f and int(f.split('vocadito_')[1].split('.')[0])%2==1]
T={f:targets(f,np.array(F[f])[:,0]) for f in pool}
for name,d in (('A','data/synthuser_a'),('B','data/synthuser_b')):
    fs=[f for f in FT if f.startswith(d+'/')]
    D={f:featurize(f,FT[f],*syn_grid(f)) for f in fs}; TT={f:targets(f,np.array(FT[f])[:,0]) for f in fs}
    net=Net(D[fs[0]].shape[1]); net.load_state_dict(torch.load('results/intent2.pt')); opt=torch.optim.Adam(net.parameters(),4e-4)
    r=np.random.RandomState(3); L=500; W=torch.tensor([3.0,1.0])
    for st in range(int(sys.argv[1]) if len(sys.argv)>1 else 1000):
        xb,yb=[],[]
        for _ in range(16):
            if r.rand()<0.5: f=fs[r.randint(len(fs))]; X,Y=D[f],TT[f]
            else: f=pool[r.randint(len(pool))]; X,Y=base[f],T[f]
            i=r.randint(0,max(1,len(X)-L)); xx,yy=X[i:i+L].copy(),Y[i:i+L]
            if len(xx)<L: xx=np.pad(xx,((0,L-len(xx)),(0,0))); yy=np.pad(yy,((0,L-len(yy)),(0,0)))
            xx[:,:NM]+=r.uniform(-0.3,0.3); xb.append(xx); yb.append(yy)
        out=net(torch.tensor(np.array(xb))); y=torch.tensor(np.array(yb)); loss=(nn.functional.binary_cross_entropy_with_logits(out,y,reduction='none')*W).mean(); opt.zero_grad(); loss.backward(); opt.step()
    net.eval(); torch.save(net.state_dict(),f'results/intent2_tp{name}.pt'); print('fold',name,'re-sung takes',len(fs),flush=True)
