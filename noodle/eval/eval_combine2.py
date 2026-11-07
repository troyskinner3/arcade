# App notes + v2 reader: split an app note where the reader is confident a new (same-pitch) note starts inside it.
import sys,json,glob,os,numpy as np,torch,collections; sys.path.insert(0,os.path.dirname(__file__))
from intent_net2 import featurize, Net; import score_user_lib as SU; import onset_model as O; from intent_pitch import snap_key
FR=json.load(open('results/user_frames.json')); REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob('results/replay_new/2-*.json')}
src={}
for f in sorted(glob.glob('data/user/2*.json')):
    m=json.load(open(f))
    if m.get('prompt') and m.get('heard'): src[m['prompt']]=f.replace('.json','.wav')
G=SU.guides(REP); net=None; sd=60/90/4; res=collections.defaultdict(lambda:[0,collections.Counter()]); N=0
def snapped(notes):
    q=snap_key([n['raw'] for n in notes],[n['l'] for n in notes]); return [{**n,'p':p} for n,p in zip(notes,q)]
for pr,m in sorted(REP.items()):
    g=G[pr.split('-')[0]]; wav=src[pr]; fr=FR[os.path.basename(wav)]; al=m['al']; N+=len(g)
    X=featurize(wav,fr,90.0,al,4.0)
    if net is None: net=Net(X.shape[1]); net.load_state_dict(torch.load(os.environ.get('MODEL','results/intent2.pt'))); net.eval()
    with torch.no_grad(): P=torch.sigmoid(net(torch.tensor(X[None])))[0].numpy()
    t=np.array(fr)[:,0]; on=P[:,0]; _,_,_,mm,vv,pm,_=O.prep(fr); tune=O.tune_of(mm,vv)
    peaks=[(round((t[i]-al)/sd),on[i]) for i in range(1,len(on)-1) if on[i]>=on[i-1] and on[i]>=on[i+1]]
    app=[n for n in m['heard']['notes'] if not n['x']]
    for thr in [None,0.3,0.4,0.5,0.6]:
        out=[]
        for n in app:
            cuts=sorted({s for s,v in peaks if thr is not None and v>=thr and n['s']+2<=s<=n['s']+n['l']-2})
            b=[n['s']]+cuts+[n['s']+n['l']]
            for a,c in zip(b,b[1:]):
                raw=n['raw']
                if cuts:   # own pitch for each piece: middle half of its frames
                    i0,i1=np.searchsorted(t,al+a*sd),np.searchsorted(t,al+c*sd); seg=[x for x in pm[i0:i1] if not np.isnan(x)]
                    if len(seg)>=4: q=len(seg)//4; raw=float(np.median(seg[q:max(q+1,3*len(seg)//4)]))-tune
                out.append({**n,'s':a,'l':c-a,'raw':raw})
        e,c=SU.best_edits(snapped(out),g); k='app' if thr is None else f'app + reader splits >= {thr}'; res[k][0]+=e; res[k][1]+=c
for k,(e,c) in res.items(): print(f'{k:28s} {10*e/N:.2f} per 10 notes  add {c["add"]} delete {c["delete"]} pitch {c["pitch"]}')
