# Does synthetic data help the learned note-start model on REAL held-out takes?
import json, sys, os, numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import onset_model as O
from edits import report
F=O.F; F.update(json.load(open('results/frames_syn.json')))
for extra in sys.argv[1:]: F.update(json.load(open(extra)))
vo=lambda f:int(f.split('vocadito_')[1].split('.')[0])
real_train=[f for f in F if 'vocalset' in f or ('vocadito' in f and vo(f)%2==1)]
syn=[f for f in F if '/synth' in f]
test=[f for f in F if ('vocadito' in f and vo(f)%2==0) or 'humtrans' in f]
def run(train,label,init=None,epochs=30):
    X=np.vstack([O.feats(F[f]) for f in train]); y=np.concatenate([O.labels(f,np.array(F[f])[:,0]) for f in train])
    if init: net,mu,sd=init; net.fit((X-mu)/sd,y,epochs=epochs,lr=1e-3)
    else: mu,sd=X.mean(0),X.std(0)+1e-6; net=O.MLP(X.shape[1]).fit((X-mu)/sd,y,epochs=epochs)
    for thr in [0.5,0.6]:
        R={f:O.decode(F[f],net.prob((O.feats(F[f])-mu)/sd),thr) for f in test}
        print(f'{label:28s} thr {thr}  note F1', O.evaluate(R,test)); report(R,f'{label} thr {thr}')
    return net,mu,sd
print('synthetic takes',len(syn),'real train',len(real_train))
run(real_train,'real only')
run(real_train+syn,'real + synthetic')
pre=run(syn,'synthetic only (pretrain)')
run(real_train,'synthetic, then real',init=pre)
