# Would dropping hits far quieter than a take's loud hits remove more false hits than real ones? AVP freestyles + the owner's phone takes' levels.
import json, numpy as np
R=json.load(open('/tmp/claude-0/-home-user/14a038b5-3f7e-5635-965f-07fad87bf95e/scratchpad/results/avp_feat.json')); FAM={'kd','sd','hhc','hho'}
def score(keep):
    out={}
    for mode in ['Fixed','Personal']:
        tp=fp=fn=0; lost=[]
        for r in R:
            if r['mode']!=mode or not r['ons']: continue
            ons=keep(r['ons']); e=np.array([o['t'] for o in ons]); T=[t for t,c in r['truth'] if c in FAM]; used=set(); m=0
            for t in T:
                if len(e):
                    j=int(np.argmin(abs(e-t)))
                    if abs(e[j]-t)<=0.05 and j not in used: used.add(j); m+=1
            tp+=m; fn+=len(T)-m; fp+=len(ons)-m
        p=tp/max(1,tp+fp); rc=tp/max(1,tp+fn); out[mode]=(2*p*rc/(p+rc), p, rc, fp, fn)
    return out
def show(name,keep):
    s=score(keep); print(f'{name:54s} '+'  '.join(f'{m}: F1 {v[0]:.3f} (false hits {v[3]}, missed {v[4]})' for m,v in s.items()))
show('today', lambda o:o)
for X in [40,35,30,25,20]:
    show(f'drop hits more than {X} dB under the take\'s loud hits', lambda o,X=X:(lambda top:[q for q in o if q['db']>=top-X])(np.percentile([q['db'] for q in o],90)))
for X in [35,30,25,20]:
    def kk(o,X=X):
        k=[q['db'] for q in o if q['cls']=='kick']
        if len(k)<3: return o
        top=np.percentile(k,75); return [q for q in o if not (q['cls']=='kick' and q['db']<top-X)]
    show(f'drop kicks more than {X} dB under the take\'s other kicks', kk)
