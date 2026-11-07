# Fine-tune the v2 reader with the owner's guided takes (labels = the Guide, moved to the take's timing).
# Two folds by tune (Twinkle + scale vs the rest): train on one, test on the other, so no tune is tested on itself.
import sys,json,glob,os,numpy as np,torch,torch.nn as nn,collections; sys.path.insert(0,os.path.dirname(__file__))
from intent_net2 import featurize, Net; from intent_net import NM; import score_user_lib as SU; import onset_model as O
torch.set_num_threads(4)
FR=json.load(open('results/user_frames.json'))
REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob('results/replay_new/2-*.json')}
src={}
for f in sorted(glob.glob('data/user/2*.json')):
    m=json.load(open(f))
    if m.get('prompt') and m.get('heard') and m['prompt'] in REP: src[m['prompt']]=f.replace('.json','.wav')
G=SU.guides(REP); sd=None; items={}
for pr,m in REP.items():
    wav=src[pr]; fr=FR.get(os.path.basename(wav))
    if fr is None: continue
    sd=60/float(m.get('bpm',90))/4;
    g=G[pr.split('-')[0]]; est=m['heard']['notes']; al=m['al']
    dt=max(range(-8,9),key=lambda d:sum(any(abs(n['s']+d-x['s'])<=1 for x in g) for n in est))
    t=np.array(fr)[:,0]; on=np.zeros(len(t)); act=np.zeros(len(t))
    for x in g:
        a=al+(x['s']-dt)*sd; b=a+x['l']*sd; on=np.maximum(on,np.exp(-0.5*((t-a)/0.015)**2)); act[(t>=a)&(t<b)]=1
    items[pr]=dict(X=featurize(wav,fr,float(m.get('bpm',90)),al,4.0),Y=np.stack([on,act],1).astype(np.float32))
base=dict(np.load('results/intent2_feats.npz',allow_pickle=True))['D'].item()
F=O.F; F.update(json.load(open('results/frames_syn2.json')))
from intent_net import targets
pool=[f for f in base if 'synthv2' in f][:600]+[f for f in base if 'vocadito' in f and int(f.split('vocadito_')[1].split('.')[0])%2==1]
T={f:targets(f,np.array(F[f])[:,0]) for f in pool}
foldA=[p for p in items if p.startswith('twinkle') or p.startswith('scale')]; foldB=[p for p in items if p not in foldA]
for name,tr_,te_ in (('A',foldA,foldB),('B',foldB,foldA)):
    net=Net(items[tr_[0]]['X'].shape[1]); net.load_state_dict(torch.load('results/intent2.pt')); opt=torch.optim.Adam(net.parameters(),4e-4); r=np.random.RandomState(1); L=500; W=torch.tensor([3.0,1.0])
    for st in range(int(sys.argv[1]) if len(sys.argv)>1 else 600):
        xb,yb=[],[]
        for _ in range(16):
            if r.rand()<0.4: it=items[tr_[r.randint(len(tr_))]]; X,Y=it['X'],it['Y']
            else: f=pool[r.randint(len(pool))]; X,Y=base[f],T[f]
            i=r.randint(0,max(1,len(X)-L)); xx,yy=X[i:i+L].copy(),Y[i:i+L]
            if len(xx)<L: xx=np.pad(xx,((0,L-len(xx)),(0,0))); yy=np.pad(yy,((0,L-len(yy)),(0,0)))
            xx[:,:NM]+=r.uniform(-0.3,0.3); xb.append(xx); yb.append(yy)
        out=net(torch.tensor(np.array(xb))); y=torch.tensor(np.array(yb)); loss=(nn.functional.binary_cross_entropy_with_logits(out,y,reduction='none')*W).mean(); opt.zero_grad(); loss.backward(); opt.step()
    net.eval(); torch.save(net.state_dict(),f'results/intent2_ft{name}.pt'); print('fold',name,'trained on',len(tr_),'tested on',te_,flush=True)
