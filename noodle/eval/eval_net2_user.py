# The owner's guided takes: the app's notes vs the v2 note reader's notes, both given the same pitch rule (snap to the
# best-fitting key), so the difference is in finding the notes (starts, repeats, lengths). Scored against the Guide.
import json, sys, os, glob, numpy as np, torch, collections
sys.path.insert(0, os.path.dirname(__file__)); import score_user_lib as SU; from intent_pitch import snap_key
from intent_net import decode; from intent_net2 import featurize, Net
FR=json.load(open('results/user_frames.json')); src={}
for f in sorted(glob.glob('data/user/2*.json')):
    m=json.load(open(f))
    if m.get('prompt') and m.get('heard'): src[m['prompt']]=f.replace('.json','.wav')
REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob('results/replay_new/2-*.json')}
G=SU.guides(REP); net=None
def snapped(notes):
    q=snap_key([n['raw'] for n in notes],[n['l'] for n in notes]); return [{**n,'p':p} for n,p in zip(notes,q)]
tot=collections.defaultdict(lambda:[0,collections.Counter()]); N=0
sd=None
THR=[float(x) for x in (sys.argv[2:] or ['0.3'])]
for ti,thr in enumerate(THR):
  for pr,m in sorted(REP.items()):
    sd=60/float(m.get('bpm',90))/4;
    g=G[pr.split('-')[0]]; wav=src[pr]; fr=FR[os.path.basename(wav)]; al=m['al']
    X=featurize(wav,fr,float(m.get('bpm',90)),al,4.0)
    if net is None: net=Net(X.shape[1]); net.load_state_dict(torch.load(sys.argv[1])); net.eval()
    with torch.no_grad(): P=torch.sigmoid(net(torch.tensor(X[None])))[0].numpy()
    ns=decode(fr,P,thr); mine=[]
    for a,b,p in ns:
        s=int(round((a-al)/sd)); l=max(1,int(round((b-a)/sd)))
        if 0<=s<64: mine.append({'s':s,'l':l,'raw':p,'x':False,'p':round(p)})
    app=[n for n in m['heard']['notes'] if not n['x']]
    for name,notes in ((([('app',app)] if ti==0 else [])+[(f'v2 net thr {thr}',mine)])):
        if not notes: tot[name][0]+=len(g); continue
        e,c=SU.best_edits(snapped(notes),g); tot[name][0]+=e; tot[name][1]+=c
    N+=len(g) if ti==0 else 0
for k,(e,c) in tot.items(): print(f'{k:18s} {10*e/N:.2f} per 10 notes  add {c["add"]} delete {c["delete"]} pitch {c["pitch"]} move {c["move"]}')
