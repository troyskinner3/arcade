# "Edits to fix": how many taps a user needs to turn what the app heard into what they meant.
# Each note the app got is matched to at most one intended note (optimal order-preserving alignment).
#   add a missing note = 1, delete an extra note = 1, fix pitch = 1, move start = 1, fix length = 1 (only with lengths=True)
# A matched pair whose fixes cost more than delete+add is treated as delete+add instead (the DP picks the cheaper).
import json, sys, os, numpy as np, collections, mir_eval
sys.path.insert(0, os.path.dirname(__file__)); from score import gt
ON_OK=0.07      # start within ~half a 16th at 105 bpm snaps to the right step
MATCH=0.25      # further than this apart: not the same note
def cost_pair(e,r,lengths):
    if abs(e[0]-r[0])>MATCH: return None, None
    k={'pitch':int(round(e[2])!=round(r[2])), 'move':int(abs(e[0]-r[0])>ON_OK)}
    if lengths: d=r[1]-r[0]; k['length']=int(abs((e[1]-e[0])-d)>max(0.1,0.3*d))
    return sum(k.values()), k
def edits(est, ref, lengths=False):
    """est/ref: lists of [t0,t1,midi]. returns total edits and counts by kind."""
    E=sorted(est); R=sorted(ref); n,m=len(E),len(R); INF=1e9
    D=np.full((n+1,m+1),INF); D[0,:]=np.arange(m+1); D[:,0]=np.arange(n+1); B={}
    for i in range(1,n+1):
        for j in range(1,m+1):
            best=(D[i-1,j]+1,'del'); 
            if D[i,j-1]+1<best[0]: best=(D[i,j-1]+1,'add')
            c,_=cost_pair(E[i-1],R[j-1],lengths)
            if c is not None and D[i-1,j-1]+c<best[0]: best=(D[i-1,j-1]+c,'match')
            D[i,j]=best[0]; B[i,j]=best[1]
    kinds=collections.Counter(); i,j=n,m
    while i>0 or j>0:
        op='del' if j==0 else 'add' if i==0 else B[i,j]
        if op=='del': kinds['delete']+=1; i-=1
        elif op=='add': kinds['add']+=1; j-=1
        else: kinds.update(cost_pair(E[i-1],R[j-1],lengths)[1]); i-=1; j-=1
    return int(D[n,m]), kinds
def ref_notes(f):
    iv,hz=gt(f); return [[a,b,float(mir_eval.util.hz_to_midi(h))] for (a,b),h in zip(iv,hz)]
def align_humtrans(ref, est):
    if not est: return ref
    r0=np.array([x[0] for x in ref]); eo=np.array([x[0] for x in est])
    d=max(((mir_eval.onset.f_measure(r0+d,eo,window=0.05)[0],d) for d in np.arange(-0.2,1.5,0.01)))[1]
    return [[a+d,b+d,p] for a,b,p in ref]
def score_file(f, est, lengths=False):
    ref=ref_notes(f)
    if 'humtrans' in f:   # sung in any key: the best single transposition
        ref=align_humtrans(ref,est)
        return min((edits([[a,b,p+s] for a,b,p in est],ref,lengths)+(s,) for s in range(-24,25)), key=lambda x:x[0])[:2]+(len(ref),)
    if '/synth' in f and SYNV(f)=='whistle':   # whistles land in any octave
        return min((edits([[a,b,p+s] for a,b,p in est],ref,lengths)+(s,) for s in (-24,-12,0,12,24)), key=lambda x:x[0])[:2]+(len(ref),)
    return edits(est,ref,lengths)+(len(ref),)
def SYNV(f):
    from score import _SYN, gt_synth; gt_synth(f); return _SYN[os.path.dirname(f)][os.path.basename(f)[:-4]]['voice']
def report(R, label, lengths=False):
    by=collections.defaultdict(lambda:[0,0,collections.Counter(),[]])
    for f,v in R.items():
        est=v['notes'] if isinstance(v,dict) else v
        e,k,n=score_file(f,est,lengths); ds=('synth:'+SYNV(f)) if '/synth' in f else 'vocadito' if 'vocadito' in f else 'vocalset' if 'vocalset' in f else 'humtrans'
        a=by[ds]; a[0]+=e; a[1]+=n; a[2]+=k; a[3].append(e/max(1,n))
    print(f'== {label}' + (' (with lengths)' if lengths else ''))
    for ds,(e,n,k,per) in sorted(by.items()):
        tot=sum(k.values()) or 1
        print(f'  {ds:9s} {10*e/n:5.2f} edits per 10 notes | takes needing <=1 per 10: {np.mean(np.array(per)<=0.1):.0%} | '+' '.join(f'{x} {k[x]/tot:.0%}' for x in ['add','delete','pitch','move','length'] if k[x]))
if __name__=='__main__':
    for p in sys.argv[1:]:
        R=json.load(open(p)); report(R,p); report(R,p,True)
