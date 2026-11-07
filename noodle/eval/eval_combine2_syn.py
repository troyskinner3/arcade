# Unseen synthetic singers WITH the beat grid: app vs app + reader splits, for accurate singers and squeezers separately
import sys,json,os,numpy as np,torch,collections; sys.path.insert(0,os.path.dirname(__file__))
from intent_net2 import Net, featurize, syn_grid; import onset_model as O; from edits import score_file
F=json.load(open('results/frames_syn2test.json')); R=json.load(open('results/syn2test_app.json')); L=json.load(open('data/synthv2_test/labels.json'))
net=None; tot=collections.defaultdict(lambda:[0,0])
for f,v in R.items():
    k=os.path.basename(f)[:-4]; meta=L[k]; grp=('accurate' if meta['squeeze'][0]>0.9 else 'squeezes')+'/'+('hum' if meta['voice'] in ('hum','oo') else 'other')
    X=featurize(f,F[f],*syn_grid(f))
    if net is None: net=Net(X.shape[1]); net.load_state_dict(torch.load(os.environ.get('MODEL','results/intent2.pt'))); net.eval()
    with torch.no_grad(): P=torch.sigmoid(net(torch.tensor(X[None])))[0].numpy()
    fr=F[f]; t=np.array(fr)[:,0]; on=P[:,0]; _,_,_,mm,vv,pm,_=O.prep(fr); tune=O.tune_of(mm,vv)
    pk=[(t[i],on[i]) for i in range(1,len(on)-1) if on[i]>=on[i-1] and on[i]>=on[i+1]]
    for th in (None,0.6):
        res=[]
        for a,b,p in v['notes']:
            cuts=sorted(x for x,s in pk if th and s>=th and a+0.15<=x<=b-0.15); bs=[a]+cuts+[b]
            for x,y in zip(bs,bs[1:]):
                q=p
                if cuts:
                    i0,i1=np.searchsorted(t,x),np.searchsorted(t,y); seg=[z for z in pm[i0:i1] if not np.isnan(z)]
                    if len(seg)>=4: kk=len(seg)//4; q=float(np.median(seg[kk:max(kk+1,3*len(seg)//4)]))-tune
                res.append([x,y,q])
        e,_,n=score_file(f,res); key=(grp,'app' if th is None else 'app + splits'); tot[key][0]+=e; tot[key][1]+=n
for (g,m),(e,n) in sorted(tot.items()): print(f'{g:20s} {m:14s} {10*e/n:.2f} per 10 notes')
