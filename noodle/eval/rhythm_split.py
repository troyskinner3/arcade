# Rhythm sense: in a take whose notes are mostly one length (the "pulse"), a recorded note lasting k>=2 pulses is split into
# pulses when the rest of the take moves at that pulse steadily (enough notes, little variety in length).
import json, glob, sys, os, collections, numpy as np; sys.path.insert(0,os.path.dirname(__file__)); import score_user_lib as SU
def rsplit(notes, min_share=0.6, max_k=2):
    rec=[x for x in notes if not x['x']]
    if len(rec)<6: return notes
    L=collections.Counter(x['l'] for x in rec); pulse,cnt=L.most_common(1)[0]
    if pulse<2 or cnt/len(rec)<min_share: return notes
    out=[]
    for x in notes:
        k=x['l']//pulse
        if not x['x'] and x['l']%pulse==0 and 2<=k<=max_k and x['s']%pulse==0:
            out+= [{**x,'s':x['s']+i*pulse,'l':pulse} for i in range(k)]
        else: out.append(x)
    return out
if __name__=='__main__':
    REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob(sys.argv[1]+'/2-*.json')}; G=SU.guides(REP)
    for share in (0.5,0.6,0.7):
        for mk in (2,):
            tot=[0,0]; N=0; ch=[]
            for pr,m in sorted(REP.items()):
                g=G.get(pr.split('-')[0]); est=m['heard']['notes']
                if not g or not est: continue
                N+=len(g); e0=SU.best_edits(est,g)[0]; e1=SU.best_edits(rsplit(est,share,mk),g)[0]; tot[0]+=e0; tot[1]+=e1
                if e0!=e1: ch.append(f'{pr} {e0}->{e1}')
            print(f'share {share} max {mk}: today {10*tot[0]/N:.2f} -> {10*tot[1]/N:.2f} |',', '.join(ch))
