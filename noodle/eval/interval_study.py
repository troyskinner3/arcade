# Do people sing intervals narrower than they mean? HumTrans: MIDI = the intended tune, audio = the hum.
# Match the app's notes to the intended notes by start time, then compare consecutive sung vs intended intervals.
import json, sys, os, numpy as np, mir_eval, collections
sys.path.insert(0, os.path.dirname(__file__)); from edits import ref_notes, align_humtrans
R=json.load(open(sys.argv[1])); rows=collections.defaultdict(list); per=[]
for f,v in R.items():
    if 'humtrans' not in f or not v['notes']: continue
    est=v['notes']; ref=align_humtrans(ref_notes(f),est)
    m=[]
    for a,b,p in est:
        j=min(range(len(ref)),key=lambda j:abs(ref[j][0]-a))
        if abs(ref[j][0]-a)<0.08: m.append((j,p,ref[j][2]))
    xs=[];ys=[]
    for (j1,p1,q1),(j2,p2,q2) in zip(m,m[1:]):
        if j2!=j1+1: continue
        d=round(q2-q1); s=p2-p1; rows[d].append(s)
        if d: xs.append(d); ys.append(s)
    if len(xs)>=5: per.append(np.sum(np.array(xs)*ys)/np.sum(np.array(xs)**2))
print('intended interval -> sung (median, n)')
for d in sorted(rows):
    if abs(d)<=12 and len(rows[d])>=15: print(f'  {d:+3d}  sung {np.median(rows[d]):+5.2f}  ratio {np.median(rows[d])/d if d else 0:4.2f}  n={len(rows[d])}')
per=np.array(per); print(f'per-hummer stretch factor (sung/intended): median {np.median(per):.2f}, 10-90%: {np.percentile(per,10):.2f}-{np.percentile(per,90):.2f}, n={len(per)}')
