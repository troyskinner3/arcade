# Split hints: per held note, would a hint show anywhere (false), and per missed repeat, is there a hint within 1 step (caught)?
import json,glob,sys,numpy as np,collections; sys.path.insert(0,'tools'); import score_user_lib as SU
from timbre_cue import REP,G,src,melspec,cue
rows=[]   # (kind, take, max cue over probes)
for pr,m in REP.items():
    g=G.get(pr.split('-')[0]); est=m['heard']['notes']
    if not g or not est or pr not in src: continue
    L,db=melspec(src[pr]); sd=60/float(m['bpm'])/4; al=m['al']
    _,dt,dp=min(((SU.edits([{**e,'s':e['s']+dt,'p':e['p']+dp} for e in est],g)[0],dt,dp) for dt in range(-4,5) for dp in range(-36,37)))
    for e in est:
        if e['l']<4: continue
        es=e['s']+dt; inner=[r for r in g if es+2<=r['s']<=es+e['l']-2]
        probes={k:cue(L,db,al+k*sd)[0] for k in range(e['s']+2,e['s']+e['l']-1,STEP) } if (STEP:=2) else {}
        if not probes: continue
        reps=[r for r in inner if not any(abs(x['s']+dt-r['s'])<=1 for x in est if x is not e)]
        if reps:
            for r in reps:
                near=[v for k,v in probes.items() if abs(k+dt-r['s'])<=1]; rows.append(('repeat',pr,max(near) if near else 0, max(probes.values()), r['s']%4))
        else: rows.append(('held',pr,0,max(probes.values()),None))
R=[r for r in rows if r[0]=='repeat']; H=[r for r in rows if r[0]=='held']
print('repeats',len(R),'held notes',len(H),'repeat pos mod 4:',collections.Counter(r[4] for r in R))
for th in (2.5,3.0,3.5,4.0,4.5):
    c=sum(r[2]>=th for r in R); f=sum(r[3]>=th for r in H); w=sum(r[3]>=th and r[2]<th for r in R)
    print(f'threshold {th}: right spot on {c}/{len(R)} repeats | held notes with a (wrong) hint {f}/{len(H)} ({f/len(H):.0%})')
