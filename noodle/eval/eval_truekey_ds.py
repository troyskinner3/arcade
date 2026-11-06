# Held-out singers when the song's key is known (as when other parts set it): snap to that key vs the whole-line reading in it
import json, sys, os, numpy as np
sys.path.insert(0, os.path.dirname(__file__)); from intent_pitch import decode, snap_key; from edits import report, ref_notes
from concurrent.futures import ProcessPoolExecutor
R=json.load(open(sys.argv[1]))
def one(item):
    f,v=item; n=v['notes']
    if not n: return f,n,n
    ref=ref_notes(f); k=snap_key([x[2] for x in ref],[x[1]-x[0] for x in ref],with_key=True)[1]
    if 'humtrans' in f:   # hummed in another key: move the key by the sung offset (median difference after octave folding)
        import statistics; r0=np.array([x[2] for x in n]); 
        off=round(statistics.median([((a-b+6)%12)-6 for a,b in zip(sorted(r0)[len(r0)//2:len(r0)//2+1],[sorted([x[2] for x in ref])[len(ref)//2]])]))
        best=None
        for o in range(12):   # the key (moved by o) that the sung notes fit best
            kk=((k[0]+o)%12,k[1]); ss=[0,2,4,5,7,9,11] if kk[1]=='major' else [0,2,3,5,7,8,10]
            c=sum(min(abs(((x-kk[0]-s+6)%12)-6) for s in ss) for x in r0)
            if best is None or c<best[0]: best=(c,kk)
        k=best[1]
    ss=[0,2,4,5,7,9,11] if k[1]=='major' else [0,2,3,5,7,8,10]
    sn=[[a,b,float(min([q for q in range(int(p)-3,int(p)+4) if (q-k[0])%12 in ss],key=lambda q:abs(q-p)))] for a,b,p in n]
    q,_,_=decode([x[2] for x in n],[x[1]-x[0] for x in n],alpha=1.0,key=k)
    return f,sn,[[x[0],x[1],float(p)] for x,p in zip(n,q)]
if __name__=='__main__':
    items=[(f,v) for f,v in R.items() if 'vocalset' not in f]
    with ProcessPoolExecutor(4) as ex: out=list(ex.map(one,items))
    report({f:a for f,a,b in out},'snap to the known key'); report({f:b for f,a,b in out},'whole-line reading in the known key')
