# Held-out singers (no beat grid): app notes vs app notes + reader splits inside long notes
import sys,json,os,numpy as np,torch; sys.path.insert(0,os.path.dirname(__file__))
from intent_net2 import Net; import onset_model as O; from edits import report
F=O.F; D=dict(np.load('results/intent2_feats.npz',allow_pickle=True))['D'].item(); R=json.load(open('results/cur_test2.json'))
net=None; out={th:{} for th in (0.5,0.6,0.7)}
for f,v in R.items():
    if 'vocalset' in f or f not in D: continue
    X=D[f]; 
    if net is None: net=Net(X.shape[1]); net.load_state_dict(torch.load(os.environ.get('MODEL','results/intent2.pt'))); net.eval()
    with torch.no_grad(): P=torch.sigmoid(net(torch.tensor(X[None])))[0].numpy()
    fr=F[f]; t=np.array(fr)[:,0]; on=P[:,0]; _,_,_,mm,vv,pm,_=O.prep(fr); tune=O.tune_of(mm,vv)
    pk=[(t[i],on[i]) for i in range(1,len(on)-1) if on[i]>=on[i-1] and on[i]>=on[i+1]]
    for th in out:
        res=[]
        for a,b,p in v['notes']:
            cuts=sorted(x for x,s in pk if s>=th and a+0.15<=x<=b-0.15); bs=[a]+cuts+[b]
            for x,y in zip(bs,bs[1:]):
                q=p
                if cuts:
                    i0,i1=np.searchsorted(t,x),np.searchsorted(t,y); seg=[z for z in pm[i0:i1] if not np.isnan(z)]
                    if len(seg)>=4: k=len(seg)//4; q=float(np.median(seg[k:max(k+1,3*len(seg)//4)]))-tune
                res.append([x,y,q])
        out[th][f]=res
report({f:v['notes'] for f,v in R.items() if 'vocalset' not in f and f in D},'app')
for th,r in out.items(): report(r,f'app + reader splits >= {th}')
