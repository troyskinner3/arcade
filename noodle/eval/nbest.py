# How often is the intended melody among the decoder's other readings? N-best over keys x interval widths, oracle at K.
import json,glob,sys,os,numpy as np; sys.path.insert(0,'tools'); import score_user_lib as SU, intent_pitch as IP
from concurrent.futures import ProcessPoolExecutor
REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob('results/replay_dbase/2-*.json')}; G=SU.guides(REP)
AL=[(u,d) for u in np.arange(0.55,1.16,0.05) for d in np.arange(0.7,1.16,0.05)]
def cands(est):
    r=IP.fix_octaves([e['raw'] for e in est]); w=np.clip(np.array([e['l'] for e in est],float)/np.median([e['l'] for e in est]),0.5,2)
    out={}
    for t in range(12):
        for mode,ss in (('major',IP.MAJ),('minor',IP.MIN)):
            for al in [None]+AL:
                sc,q=IP.decode_key(r,w,set(ss),t,1.0 if al is None else al)
                if al is not None: sc+=-(((al[0]-1)**2)+((al[1]-1)**2))/(2*0.15**2)
                key=tuple(np.diff(q))
                if key not in out or sc>out[key][0]: out[key]=(sc,q,t,mode,al)
    return sorted(out.values(),key=lambda x:-x[0])
def score(est,q,g):
    e2=[{**e,'p':int(p)} for e,p in zip(est,q)]; base=int(np.median([x['p'] for x in g])-np.median(q))
    return min(SU.edits([{**e,'s':e['s']+dt,'p':e['p']+dp} for e in e2],g)[0] for dt in (-1,0,1) for dp in range(base-3,base+4))
def one(pr):
    m=REP[pr]; g=G.get(pr.split('-')[0]); est=m['heard']['notes']
    C=cands(est); s=[score(est,c[1],g) for c in C[:60]]
    return pr,len(g),SU.best_edits(est,g)[0],s,[(c[0],c[2],c[3],c[4]) for c in C[:60]],[c[1] for c in C[:60]]
if __name__=='__main__':
    prs=[p for p in sorted(REP) if G.get(p.split('-')[0]) and REP[p]['heard']['notes']]
    with ProcessPoolExecutor(4) as ex: R=list(ex.map(one,prs))
    json.dump(R,open('results/nbest.json','w'))
    N=sum(r[1] for r in R); print('app',round(10*sum(r[2] for r in R)/N,2),'| top-1 of this decoder',round(10*sum(r[3][0] for r in R)/N,2))
    for K in (2,4,10,20,60): print(f'oracle best of top {K}:',round(10*sum(min(r[3][:K]) for r in R)/N,2))
    print('rank of best:',[int(np.argmin(r[3])) for r in R])
