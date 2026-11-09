# What kind of pitch errors remain on the guided takes: size, after which interval, sung vs snapped
import json,glob,collections,sys; sys.path.insert(0,'tools'); import score_user_lib as SU
REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob('results/replay_all/2-*.json')}; G=SU.guides(REP)
def align(est,g):
    best=min(((SU.edits([{**e,'s':e['s']+dt,'p':e['p']+dp} for e in est],g)[0],dt,dp) for dt in range(-4,5) for dp in range(-36,37)))
    _,dt,dp=best; est=[{**e,'s':e['s']+dt,'p':e['p']+dp,'raw':e['raw']+dp} for e in est]
    # greedy pairs by onset within 1 step
    pairs=[]; used=set()
    for j,r in enumerate(g):
        c=[(abs(e['s']-r['s']),i) for i,e in enumerate(est) if i not in used and abs(e['s']-r['s'])<=1]
        if c: i=min(c)[1]; used.add(i); pairs.append((j,est[i]))
    return pairs
D=collections.Counter(); RAW=collections.Counter(); JUMP=collections.Counter(); tot=0; ok=0; rawok=0; sn=collections.Counter()
for pr,m in REP.items():
    g=G.get(pr.split('-')[0]); est=m['heard']['notes']
    if not g or not est: continue
    for j,e in align(est,g):
        tot+=1; r=g[j]; d=e['p']-r['p']; dr=round(e['raw']-r['p'])
        if d==0: ok+=1
        if dr==0: rawok+=1
        if d: D[d]+=1; RAW['raw right, snap wrong' if dr==0 else ('snap fixed nothing' if dr==d else 'both wrong, differently')]+=1
        prev=abs(g[j]['p']-g[j-1]['p']) if j else 0; band='first' if not j else ('same' if prev==0 else ('step' if prev<=2 else ('3-4' if prev<=4 else 'leap 5+')))
        JUMP[band,bool(d)]+=1
print('matched notes',tot,'right pitch',ok,f'({ok/tot:.0%})','raw nearest semitone right',rawok)
print('error size (semitones):',sorted(D.items(),key=lambda x:-x[1])[:12])
print('vs raw:',dict(RAW))
for b in ('first','same','step','3-4','leap 5+'):
    w,r=JUMP[b,True],JUMP[b,False]; print(f'  after {b:8s}: {w}/{w+r} wrong ({w/max(1,w+r):.0%})')
import numpy as np
print('raw offset (sung - intended, semitones) by bar, and wrong rate:')
B=collections.defaultdict(list); W=collections.Counter(); N=collections.Counter(); drift=[]
for pr,m in REP.items():
    g=G.get(pr.split('-')[0]); est=m['heard']['notes']
    if not g or not est: continue
    P=align(est,g); off=[(g[j]['s']//16, e['raw']-g[j]['p'], e['p']!=g[j]['p']) for j,e in P]
    for b,o,w in off: B[b].append(o); W[b]+=w; N[b]+=1
    a=[o for b,o,w in off if b==0]; z=[o for b,o,w in off if b==3]
    if a and z: drift.append(np.median(z)-np.median(a))
for b in sorted(B): print(f'  bar {b+1}: median {np.median(B[b]):+.2f}  spread {np.std(B[b]):.2f}  wrong {W[b]}/{N[b]}')
print('per-take drift bar1->bar4 (semitones): median',round(float(np.median(drift)),2),'abs>0.5 in',sum(abs(d)>0.5 for d in drift),'of',len(drift))
