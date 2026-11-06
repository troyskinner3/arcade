# Intended pitches from sung pitches: choose the in-key melody that best explains the whole sung shape,
# given how wide this singer sings intervals (alpha = sung/intended). Replaces note-by-note key snapping.
import numpy as np
MAJ=[0,2,4,5,7,9,11]; MIN=[0,2,3,5,7,8,10]
STEP_PRIOR={0:.16,1:.14,2:.30,3:.13,4:.08,5:.07,7:.05,6:.01,8:.02,9:.015,10:.01,11:.005,12:.01}
import json as _j, os as _o
PRIOR=_o.environ.get('PRIOR','hand'); DEGW=float(_o.environ.get('DEGW','0'))
_MP=_j.load(open(_o.path.join(_o.path.dirname(__file__),'..','results','melody_prior.json')))
_UNI={int(k):v for k,v in _MP['uni'].items()}; _DEG=_MP['deg']
def lp_step(d):
    if PRIOR=='corpus': return np.log(_UNI[max(-13,min(13,d))])
    return np.log(STEP_PRIOR.get(abs(d),0.002)/(1 if d==0 else 2))
OOK=float(__import__('os').environ.get('OOK','3.0'))
S_ABS=float(__import__('os').environ.get('SABS','0.6'))
def decode_key(r, w, scale_set, tonic, alpha, s_int=0.45, s_pos=1.6, profile=None):
    au,ad=(alpha if isinstance(alpha,tuple) else (alpha,alpha)); alpha=(au+ad)/2
    """Viterbi over in-key pitches. r: sung pitches, w: weights (longer notes count more). returns (score, pitches)"""
    r=np.asarray(r,float); n=len(r); r0=r[0]
    best=(-1e18,None)
    q0s=[q for q in range(int(round(r0))-2,int(round(r0))+3) if (q-tonic)%12 in scale_set]
    for q0 in q0s:
        lo=q0+int(np.floor((r.min()-r0)/alpha))-3; hi=q0+int(np.ceil((r.max()-r0)/alpha))+3
        S=np.arange(lo,hi+1); m=len(S); ink=np.array([(q-tonic)%12 in scale_set for q in S]); kp=np.where(ink,0.0,-OOK)
        if DEGW: dg=_DEG['major' if 4 in scale_set else 'minor']; kp=kp+DEGW*np.log(np.array([dg[(q-tonic)%12] for q in S])*12)
        if au==1 and ad==1 and not profile: pos=lambda i: -((r[i]-S)**2)/(2*S_ABS**2)*w[i]
        else: pos=lambda i: -((r[i]-r0)-alpha*(S-q0))**2/(2*s_pos**2)*w[i]
        V=np.where(S==q0,0.0,-1e18)+pos(0)+kp*w[0]; B=[]
        D=S[None,:]-S[:,None]   # D[a,b]=S[b]-S[a]
        prior=np.vectorize(lp_step)(D)
        EXP=np.vectorize(lambda d: profile(d))(D) if profile else np.where(D>0,au,ad)*D
        for i in range(1,n):
            dr=r[i]-r[i-1]; ws=min(w[i],w[i-1])
            # a sung note can read an octave off (whistles especially): allow it at a cost
            e0=((dr-EXP)**2)/(2*s_int**2)*ws; e1=((abs(dr)-12-0)**2)  # placeholder
            T=V[:,None]+prior-e0
            a=T.argmax(0); B.append(a); V=T[a,np.arange(m)]+pos(i)+kp*w[i]
        k=int(V.argmax()); sc=V[k]; path=[k]
        for a in reversed(B): k=int(a[k]); path.append(k)
        if sc>best[0]: best=(sc,[int(S[k]) for k in reversed(path)])
    return best
def fix_octaves(r):
    r=list(map(float,r))
    for i in range(len(r)):
        nb=[r[j] for j in (i-1,i+1) if 0<=j<len(r)]
        if not nb: continue
        ref=np.median(nb)
        for k in (12,-12):
            if abs(r[i]+k-ref) < abs(r[i]-ref)-6: r[i]+=k; break
    return r
def decode(r, dur, alpha=None, profile=None, key=None, alphas=[(u,d) for u in np.arange(0.55,1.16,0.05) for d in np.arange(0.7,1.16,0.05)], alpha_sd=0.15, s_pos=1.6):
    """alpha None: search it (with a prior around 1). returns pitches, alpha, (tonic, mode)"""
    if len(r)==0: return [],1.0,None
    r=fix_octaves(r)
    w=np.clip(np.asarray(dur,float)/np.median(dur),0.5,2.0)
    best=(-1e18,None,None,None)
    for al in ([alpha] if (alpha or profile) else alphas):
        pa=0 if (alpha or profile) else -(((al[0]-1)**2)+((al[1]-1)**2))/(2*alpha_sd**2)
        for tonic in (range(12) if key is None else [key[0]]):
            for mode,ss in ((('major',MAJ),('minor',MIN)) if key is None else [(key[1],MAJ if key[1]=='major' else MIN)]):
                sc,q=decode_key(r,w,set(ss),tonic,al if al else 1.0,s_pos=s_pos,profile=profile); sc+=pa
                if sc>best[0]: best=(sc,q,al,(tonic,mode))
    return best[1],best[2],best[3]
def snap_key(r, dur, with_key=False):
    """today's behaviour, roughly: pick the key whose notes sit closest to what was sung, snap every note into it"""
    r=np.asarray(r,float); w=np.asarray(dur,float); best=(1e18,None)
    for tonic in range(12):
        for ss in (MAJ,MIN):
            cand=np.array([q for q in range(int(r.min())-2,int(r.max())+3) if (q-tonic)%12 in ss])
            d=np.abs(r[:,None]-cand[None,:]); c=(w*d.min(1)**2).sum()
            if c<best[0]: best=(c,[int(cand[k]) for k in d.argmin(1)],(tonic,'major' if ss is MAJ else 'minor'))
    return best[1] if not with_key else (best[1],best[2])
