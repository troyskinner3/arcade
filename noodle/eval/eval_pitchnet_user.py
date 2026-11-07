# The owner's guided takes (replayed in the app): today's pitches vs the intended-note model, same detected notes
import sys, os, json, glob, collections, torch; sys.path.insert(0,os.path.dirname(__file__))
import score_user_lib as SU; from pitch_net import PNet, predict
from intent_pitch import snap_key
REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob(sys.argv[1]+'/2-*.json')}; G=SU.guides(REP)
net=PNet(); net.load_state_dict(torch.load(sys.argv[2] if len(sys.argv)>2 else 'results/pitchnet.pt')); net.eval()
res=collections.defaultdict(lambda:[0,collections.Counter()]); N=0; per=[]
for pr,m in sorted(REP.items()):
    g=G.get(pr.split('-')[0]); est=[n for n in m['heard']['notes'] if not n['x']]
    if not g or len(est)<3: continue
    N+=len(g); sd=60/float(m.get('bpm',90))/4
    notes=[(n['s']*sd,(n['s']+n['l'])*sd,n['raw']) for n in est]
    q,_=predict(net,notes,float(m.get('bpm',90)),0.0)
    V={'today (app)':est,'round':[{**n,'p':round(n['raw'])} for n in est],'snap to key':[{**n,'p':p} for n,p in zip(est,snap_key([n['raw'] for n in est],[n['l'] for n in est]))],
       'intended-note model':[{**n,'p':p} for n,p in zip(est,q)]}
    row=[pr]
    for k,v in V.items(): e,c=SU.best_edits(v,g); res[k][0]+=e; res[k][1]+=c; row.append(e)
    per.append(row)
for r in per: print(f'{r[0]:16s}',r[1:])
for k,(e,c) in res.items(): print(f'{k:22s} {10*e/N:.2f} per 10 notes  pitch {c["pitch"]}')
