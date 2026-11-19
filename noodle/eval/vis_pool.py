import json, re, random, statistics as st
import os; S=os.environ.get('SCRATCH','.')   # holds results/avp_examples.json, results/avp_feat.json (avp_feat.js) and vis_base.json (vis_eval.js)
src=open('/home/user/arcade/noodle/js/reader.js').read(); m=re.search(r'const BUILTIN_DRUMS=(\{.*?\});',src).group(1)
B=json.loads(re.sub(r'(\w+):',r'"\1":',m).replace('[.','[0.').replace(',.',',0.').replace(',-.',',-0.'))
ex=json.load(open(S+'/results/avp_examples.json'))
# which person each built-in example came from
key=lambda v:tuple(round(x,1) for x in v)
owner={}
for e in ex:
    for c in ('kick','snare'):
        for v in e['ex'][c]: owner[(c,key(v))]=(e['mode'],str(e['k']))
pool=[(c,v,owner.get((c,key(v)))) for c in ('kick','snare') for v in B[c]]
print('pool',len(pool),'with owner',sum(1 for p in pool if p[2]))
def scale(vs):
    D=len(vs[0]); sd=[]
    for d in range(D):
        m=sum(v[d] for v in vs)/len(vs); sd.append((sum((v[d]-m)**2 for v in vs)/len(vs))**.5 or 1)
    W=[1 if d<24 else ([1.5,3,2,3,2][d-24] if d-24<5 else 1) for d in range(D)]; fl=st.median(sd)*0.35
    return [max(v,fl)/W[d] for d,v in enumerate(sd)]
def classify(f,P,sc):
    best=None;bd=1e18
    for c in ('kick','snare'):
        ds=sorted(sum(((f[k]-e[k])/sc[k])**2 for k in range(len(e))) for cc,e,_ in P if cc==c)[:2]
        d=sum(ds)/len(ds)
        if d<bd: bd=d;best=c
    return best
# AVP freestyle hits labelled kd / sd that the rules call kick or snare
feat=json.load(open(S+'/results/avp_feat.json')); A=[]
for r in feat:
    tr=r['truth'] if isinstance(r['truth'],list) else eval(r['truth']); ons=r['ons'] if isinstance(r['ons'],list) else eval(r['ons'])
    for o in ons:
        if o['cls'] not in ('kick','snare') or not o.get('fv') or len(o['fv'])!=29: continue
        near=[l for t,l in tr if abs(t-o['t'])<0.05]
        if near and near[0] in ('kd','sd'): A.append(((r['mode'],str(r['k'])),'kick' if near[0]=='kd' else 'snare',o['fv']))
V=[('kick' if 'Bass_drum' in r['f'] else 'snare',r['fv']) for r in json.load(open(S+'/vis_base.json')) if r.get('fv') and len(r['fv'])==29 and ('Bass_drum' in r['f'] or 'Snare' in r['f'] or 'Rimshot' in r['f'])]
print('AVP hits',len(A),'VIS clips',len(V))
def bal(res):  # balanced accuracy over kick/snare
    return round(sum(st.mean([ok for c,ok in res if c==k]) for k in ('kick','snare'))/2,3)
random.seed(1); folds=[i%5 for i in range(len(V))]; random.shuffle(folds)
for name,addvis in (('AVP pool (today)',False),('AVP + VIS pool',True)):
    allv=[v for _,v,_ in pool]+([v for _,v in V] if addvis else []); sc=scale(allv)
    ra=[]; 
    for p,c,f in A:
        P=[x for x in pool if x[2]!=p]+([(cc,v,None) for cc,v in V] if addvis else [])
        ra.append((c,classify(f,P,sc)==c))
    rv=[]
    for i,(c,f) in enumerate(V):
        P=pool+([(cc,v,None) for j,(cc,v) in enumerate(V) if folds[j]!=folds[i]] if addvis else [])
        rv.append((c,classify(f,P,sc)==c))
    print(name,'AVP (person left out) balanced',bal(ra),' VIS (fold left out) balanced',bal(rv))
