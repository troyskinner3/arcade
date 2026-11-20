# Score decoders on the owner's 31 guided takes: edits per 10 notes to the meant tune (same measure as score_user.py).
import sys, json, glob, collections, itertools, math
import os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from score_user_lib import edits
import dec
def align(est, g):
    return min(((edits([{**e,'s':e['s']+dt,'p':e['p']+dp} for e in est],g)[0],dt,dp) for dt in range(-4,5) for dp in range(-36,37)))
def load(D):
    T=[]
    for f in sorted(glob.glob(D+'/2-*.json')):
        d=json.load(open(f)); T.append((d['prompt'], [n for n in d['heard']['notes']], d['guide']['notes']))
    return T
def score(T, fn, A):
    tot=0; nn=0
    for (name,h,g),(e0,dt,dp) in zip(T,A):
        out=fn(name,h)
        tot+=min(edits([{**e,'s':e['s']+dt,'p':e['p']+dp+o} for e in out],g)[0] for o in (-12,0,12)); nn+=len(g)
    return tot/nn*10
def errs(T, A):
    # meant - heard (after the take's transposition), for matched notes at the same step
    c=collections.Counter()
    for (name,h,g),(e0,dt,dp) in zip(T,A):
        gs={n['s']:n['p'] for n in g}
        for e in h:
            s=e['s']+dt
            if s in gs: c[gs[s]-(e['p']+dp)]+=1
    return c
if __name__=='__main__':
    T=load(sys.argv[1]); A=[align(h,g) for _,h,g in T]
    json.dump(A,open(sys.argv[1]+'/../align.json','w'))
    print('heard', score(T, lambda n,h:h, A))
    print('errs', sorted(errs(T,A).items()))
