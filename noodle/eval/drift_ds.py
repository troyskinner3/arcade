# Held-out singers (HumTrans, Vocadito): snap to the known key, then the same with the slow tuning drift followed (centered median over k notes)
import json, sys, os, numpy as np
sys.path.insert(0, os.path.dirname(__file__)); import eval_truekey_ds as T; from edits import report
from concurrent.futures import ProcessPoolExecutor
K=[float(x) for x in os.environ.get('TS','0.2,0.3,0.4').split(',')]; KW=8
def one(item):
    f,v=item; n=v['notes']
    if not n: return f,{0:n,**{k:n for k in K}}
    _,sn,_=T.one(item); raw=[x[2] for x in n]; pcs={int(x[2])%12 for x in sn}
    out={0:sn}
    for k in K:
        res=[]
        for i,(a,b,p) in enumerate(n):
            off=float(np.median([raw[j]-sn[j][2] for j in range(max(0,i-KW),min(len(n),i+KW+1))])); off=off if abs(off)>=k else 0.0; r=p-off
            c=[q for q in range(int(r)-3,int(r)+4) if q%12 in pcs]; res.append([a,b,float(min(c,key=lambda q:abs(q-r)))])
        out[k]=res
    return f,out
if __name__=='__main__':
    T.R=json.load(open(sys.argv[1])); items=[(f,v) for f,v in T.R.items() if 'vocalset' not in f]
    with ProcessPoolExecutor(4) as ex: out=list(ex.map(one,items))
    for k in [0]+K: report({f:o[k] for f,o in out}, 'snap' if k==0 else f'snap + drift, gate {k}')
