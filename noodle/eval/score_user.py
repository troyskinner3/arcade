# Edits to fix on the owner's guided takes: what Noodle heard vs the Guide, on the grid (16 steps a bar).
# Any key/octave and a small overall timing offset are forgiven. Uses the latest take of each prompt.
import json, glob, os, sys, collections
D=sys.argv[1]; field=sys.argv[2] if len(sys.argv)>2 else 'heard'
metas={}
for f in sorted(glob.glob(D+'/2*.json')):
    m=json.load(open(f))
    if m.get('prompt'): metas[m['prompt']]=m      # sorted by time: last one wins
guides={m['prompt'].split('-')[0]:m['guide']['notes'] for m in metas.values() if m.get('guide') and m['guide'].get('notes') and all(n['x'] for n in m['guide']['notes'])}
def edits(est,ref):
    n,mm=len(est),len(ref); D=[[0]*(mm+1) for _ in range(n+1)]; K={}
    for i in range(n+1): D[i][0]=i
    for j in range(mm+1): D[0][j]=j
    for i in range(1,n+1):
        for j in range(1,mm+1):
            e,r=est[i-1],ref[j-1]; c=None
            if abs(e['s']-r['s'])<=3: c=(e['p']!=r['p'])+(abs(e['s']-r['s'])>1)
            best=min(D[i-1][j]+1, D[i][j-1]+1, D[i-1][j-1]+c if c is not None else 99); D[i][j]=best
    # recover counts
    i,j=n,mm; k=collections.Counter()
    while i>0 or j>0:
        if i>0 and D[i][j]==D[i-1][j]+1: k['delete']+=1; i-=1; continue
        if j>0 and D[i][j]==D[i][j-1]+1: k['add']+=1; j-=1; continue
        e,r=est[i-1],ref[j-1]; k['pitch']+=e['p']!=r['p']; k['move']+=abs(e['s']-r['s'])>1; i-=1; j-=1
    return D[n][mm],k
tot=collections.Counter(); te=tn=0
for pr,m in sorted(metas.items()):
    g=guides.get(pr.split('-')[0]); est=(m.get(field) or {}).get('notes')
    if g is None or est is None: print(f'{pr:16s} (no guide or nothing heard)'); continue
    best=min(((edits([{**e,'s':e['s']+dt,'p':e['p']+dp} for e in est],g),dt,dp) for dt in range(-4,5) for dp in range(-36,37)),key=lambda x:x[0][0])
    (e,k),dt,dp=best; tot+=k; te+=e; tn+=len(g)
    print(f'{pr:16s} {e:2d} edits / {len(g):2d} notes  heard {len(est):2d}  '+' '.join(f'{a} {k[a]}' for a in ['add','delete','pitch','move'] if k[a]))
print(f'TOTAL {te} edits for {tn} notes = {10*te/tn:.2f} per 10 notes |', dict(tot))
