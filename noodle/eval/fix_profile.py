# Could the interval profile be learned from pitch fixes instead of a voice check?
# A user only fixes notes Noodle got wrong, so the profile would be built from intervals that touch a fixed note. Compare that with the profile from all notes.
import json,glob,sys,os,numpy as np; sys.path.insert(0,'tools'); import score_user_lib as SU
def slope(pairs):
    xx=xy=n=0
    for d,y in pairs:
        if d>0: xx+=d*d; xy+=d*y; n+=1
    return (xy/xx if xx else None), n
def user():
    REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob('results/replay_fin/2-*.json')}; G=SU.guides(REP); allp=[]; fixp=[]; per=[]
    for pr,m in sorted(REP.items()):
        g=G.get(pr.split('-')[0]); est=m['heard']['notes']
        if not g or not est: continue
        _,dt,dp=min(((SU.edits([{**e,'s':e['s']+dt,'p':e['p']+dp} for e in est],g)[0],dt,dp) for dt in range(-4,5) for dp in range(-36,37)))
        P=[]
        for r in g:
            c=[e for e in est if abs(e['s']+dt-r['s'])<=1]
            if c: P.append((r,c[0],c[0]['p']+dp!=r['p']))
        a=[];f=[]
        for (r0,e0,w0),(r1,e1,w1) in zip(P,P[1:]):
            d=r1['p']-r0['p']; y=e1['raw']-e0['raw']; a.append((d,y))
            if w0 or w1: f.append((d,y))
        allp+=a; fixp+=f; per.append((slope(a),slope(f)))
    return allp,fixp,per
a,f,per=user()
print('owner, all 31 guided takes: profile from every interval %.2f (n=%d) | from intervals touching a wrong note %.2f (n=%d)'%(*slope(a),*slope(f)))
# accurate singers (HumTrans, Vocadito): per singer-take, same comparison, and how often each would switch the profile on (<0.9 with 10+)
from edits import ref_notes
R=json.load(open('results/cur_test2.json')); rows=[]
for fn,v in R.items():
    if 'vocalset' in fn or not v['notes']: continue
    ref=ref_notes(fn); est=sorted(v['notes']); P=[]
    for r in ref:
        c=[e for e in est if abs(e[0]-r[0])<=0.12]
        if c:
            e=min(c,key=lambda e:abs(e[0]-r[0])); P.append((r[2],e[2]))
    if len(P)<8: continue
    off=np.median([e-r for r,e in P]); a=[];f=[]
    for (r0,e0),(r1,e1) in zip(P,P[1:]):
        d=round(r1)-round(r0); y=e1-e0; w0=round(e0-off)!=round(r0); w1=round(e1-off)!=round(r1); a.append((d,y))
        if w0 or w1: f.append((d,y))
    rows.append(('hum' if 'humtrans' in fn else 'voc',slope(a),slope(f)))
for k in ('hum','voc'):
    rr=[r for r in rows if r[0]==k]; sa=[r[1][0] for r in rr if r[1][0]]; sf=[r[2][0] for r in rr if r[2][0] and r[2][1]>=5]
    on_a=np.mean([s<0.9 for s in sa]); on_f=np.mean([s<0.9 for s in sf]) if sf else float('nan')
    print(f'{k}: {len(rr)} takes | all intervals: median {np.median(sa):.2f}, below 0.9 in {on_a:.0%} | fix-touching only: median {np.median(sf):.2f}, below 0.9 in {on_f:.0%} (takes with 5+ such intervals: {len(sf)})')
