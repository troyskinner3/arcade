# Which intended notes does the app miss? Classify each unmatched guide note.
import json,glob,sys,collections; sys.path.insert(0,'tools'); import score_user_lib as SU
REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob('results/replay_drift3/2-*.json')}; G=SU.guides(REP)
C=collections.Counter(); byk=collections.Counter(); ext=collections.Counter()
for pr,m in REP.items():
    g=G.get(pr.split('-')[0]); est=m['heard']['notes']
    if not g or not est: continue
    _,dt,dp=min(((SU.edits([{**e,'s':e['s']+dt,'p':e['p']+dp} for e in est],g)[0],dt,dp) for dt in range(-4,5) for dp in range(-36,37)))
    E=[{**e,'s':e['s']+dt} for e in est]; starts={e['s'] for e in E}
    for j,r in enumerate(g):
        if any(abs(e['s']-r['s'])<=1 for e in E): continue
        cover=[e for e in E if e['s']<r['s']<e['s']+e['l']]
        prev=g[j-1] if j else None
        if cover and prev and prev['p']==r['p']: c='merged into a held note (same pitch repeat)'
        elif cover: c='merged into the note before (pitch change)'
        elif r['l']<=2: c='short note (16th/8th) dropped'
        else: c='nothing heard there'
        C[c]+=1; byk[pr.split('-')[1],c]+=1
    for e in E:
        if not any(abs(e['s']-r['s'])<=1 for r in g): ext['extra: '+('short' if e['l']<=2 else 'long')]+=1
for k,v in C.most_common(): print(f'{v:3d}  {k}')
print(dict(ext))
print('by take type:'); T=collections.defaultdict(dict)
for (t,c),v in byk.items(): T[t][c[:12]]=v
for t,d in sorted(T.items()): print(' ',t,d)
