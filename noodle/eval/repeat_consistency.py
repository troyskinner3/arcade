# Make repeated phrases agree: find bars sung twice (same rhythm, same shape), then for each note position take the clearer
# rendition's pitch (sung closer to a semitone centre) for both, and copy a split (two notes) into a rendition that merged them.
import json, glob, sys, os, collections, numpy as np; sys.path.insert(0,os.path.dirname(__file__)); import score_user_lib as SU
def bars(notes, n=16):
    B=collections.defaultdict(list)
    for x in notes: B[x['s']//n].append(x)
    return B
def similar(a,b,n=16):
    sa={x['s']%n for x in a}; sb={x['s']%n for x in b}
    if not sa or not sb: return 0
    rhythm=len(sa&sb)/len(sa|sb)
    ma={x['s']%n:x['p'] for x in a}; mb={x['s']%n:x['p'] for x in b}; common=sorted(set(ma)&set(mb))
    if len(common)<3: return 0
    d=[ma[c]-mb[c] for c in common]; off=max(set(d),key=d.count)
    if off!=0: return 0                       # a repeat is sung at the same pitch
    mism=sum(1 for x in d if x!=off)
    return rhythm if mism<=1 else 0
def agree(notes, thr=0.6, n=16):
    B=bars(notes,n); keys=sorted(B); out=[dict(x) for x in notes]; idx={id(x):i for i,x in enumerate(notes)}
    for i,a in enumerate(keys):
        for b in keys[i+1:]:
            if similar(B[a],B[b],n)<thr: continue
            ma={x['s']%n:x for x in B[a]}; mb={x['s']%n:x for x in B[b]}
            for pos in set(ma)&set(mb):          # same position in both: keep the clearer pitch
                xa,xb=ma[pos],mb[pos]
                if xa['p']!=xb['p']:
                    ca,cb=abs(xa['raw']-round(xa['raw'])),abs(xb['raw']-round(xb['raw']))
                    keep=xa['p'] if ca<=cb else xb['p']; out[idx[id(xa)]]['p']=keep; out[idx[id(xb)]]['p']=keep
            for src,dst,base in ((ma,mb,b),(mb,ma,a)):   # a split one rendition has and the other merged
                for pos,x in src.items():
                    if pos in dst: continue
                    host=[y for y in dst.values() if (y['s']%n)<pos<(y['s']%n)+y['l']]
                    if host and abs(host[0]['p']-x['p'])==0:
                        h=out[idx[id(host[0])]]; cut=base*n+pos; L0=h['l']
                        if h['s']<cut<h['s']+L0: out.append({**h,'s':cut,'l':h['s']+L0-cut}); h['l']=cut-h['s']
    return sorted(out,key=lambda x:x['s'])
if __name__=='__main__':
    REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob(sys.argv[1]+'/2-*.json')}; G=SU.guides(REP)
    tot={'today':0,'phrases agree':0}; N=0
    for thr in [float(x) for x in sys.argv[2:] or ['0.6']]:
        tot={'today':0,'phrases agree':0}; N=0; changed=[]
        for pr,m in sorted(REP.items()):
            g=G.get(pr.split('-')[0]); est=[x for x in m['heard']['notes'] if not x['x']]
            if not g or not est: continue
            N+=len(g); e0=SU.best_edits(est,g)[0]; new=agree(est,thr); e1=SU.best_edits(new,g)[0]
            tot['today']+=e0; tot['phrases agree']+=e1
            if e1!=e0: changed.append(f'{pr} {e0}->{e1}')
        print(f'threshold {thr}:',{k:round(10*v/N,2) for k,v in tot.items()},'| changed:',', '.join(changed))
