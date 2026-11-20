import sys,json,glob,pickle,os,collections; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
import dec,dec2,ev_takes as E
from score_user_lib import edits
H=sys.argv[1]; T=E.load(H); A=json.load(open(H+'/../align.json'))
metas={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob(H+'/2-*.json')}
Lm=dec2.LM(pickle.load(open(sys.argv[2],'rb')), json.load(open(sys.argv[3])))
def stats(outs):
    tot=collections.Counter(); ed=0; nn=0; bits=0; bk=0
    for (name,h,g),(e0,dt,dp),ns in zip(T,A,outs):
        ed+=E.align(ns,g)[0]; nn+=len(g)
        b,k=dec2.lm_bits(ns,Lm); bits+=b*k; bk+=k
        ns=sorted(ns,key=lambda n:n['s']); Tn,mode=dec.key_of(ns); ch=dec.bar_chords(ns,Tn,mode)
        for i,n in enumerate(ns):
            tot['n']+=1; tot['g8']+=n['s']%2==0; tot['tiny']+=n['l']<=1
            if n['s']%8==0: tot['st']+=1; tot['stc']+=n['p']%12 in ch.get(n['s']//16,())
        tot['endhome']+=(ns[-1]['p']-Tn)%12 in (0,)
    return f"edits {ed/nn*10:.2f} | real-melody bits/note {bits/bk:.2f} | 8th grid {tot['g8']/tot['n']:.0%} | strong-beat chord notes {tot['stc']/tot['st']:.0%} | tiny {tot['tiny']} | last note home {tot['endhome']}/31 | notes {tot['n']}"
def run(W):
    outs=[]
    for name,h,g in T:
        n=metas[name].get('bars',4)*16
        ns=dec2.rhythm(h,Lm,W,max(n,max(x['s']+x['l'] for x in h)+1)) if W.get('r',1) else [dict(x) for x in h]
        outs.append(dec2.pitch(ns,Lm,W) if W.get('m') is not None else ns)
    return outs
if __name__=='__main__':
    print('heard        ', stats([h for _,h,_ in T]))
    HM=E.load(sys.argv[4]); print('hand rules   ', stats([h for _,h,_ in HM]))
    for W in json.loads(sys.argv[5]):
        print(W, stats(run(W)), flush=True)
