# held-out recordings: rounding each note (no key) vs the interval-aware in-key decoder
import json, sys, os, numpy as np
sys.path.insert(0, os.path.dirname(__file__)); from intent_pitch import decode, snap_key; from edits import report
from concurrent.futures import ProcessPoolExecutor
R=json.load(open(sys.argv[1]))
def snap(item):
    f,v=item; n=v['notes']
    if not n: return f,n
    q=snap_key([x[2] for x in n],[x[1]-x[0] for x in n]); return f,[[a,b,float(p)] for (a,b,_),p in zip(n,q)]
def one(item):
    f,v=item; n=v['notes']
    if not n: return f,n
    _,k=snap_key([x[2] for x in n],[x[1]-x[0] for x in n],with_key=True); q,_,_=decode([x[2] for x in n],[x[1]-x[0] for x in n],alpha=1.0,key=k); return f,[[a,b,float(p)] for (a,b,_),p in zip(n,q)]
if __name__=='__main__':
    items=[(f,v) for f,v in R.items() if 'vocalset' not in f]
    with ProcessPoolExecutor(4) as ex: D=dict(ex.map(one,items))
    with ProcessPoolExecutor(4) as ex: SN=dict(ex.map(snap,items))
    report({f:v for f,v in items},'round each note (no key)'); report(SN,'snap to key (like today)'); report(D,'interval-aware decoder')
