# "Re-sing" the owner's guided takes into new melodies with the WORLD vocoder: same voice, timing, breaths, merged repeats;
# each note's pitch moved so the take now sings a different tune (intervals from real folk tunes), squeezed the way the
# owner squeezes (up/down widths measured on the guided takes) plus small random wobble. Labels = the new tune, exactly.
# usage: python3 transplant.py <out_dir> <variants_per_take> <seed> [prompt filter regex]
import sys, os, json, glob, re, numpy as np, warnings; warnings.filterwarnings('ignore')
import pyworld as pw; from scipy.io import wavfile
sys.path.insert(0,os.path.dirname(__file__)); import score_user_lib as SU
out,V,seed=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]); filt=re.compile(sys.argv[4]) if len(sys.argv)>4 else None
os.makedirs(out,exist_ok=True); r=np.random.RandomState(seed)
REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob('results/replay_all/2-*.json')}; G=SU.guides(REP)
src={}
for f in sorted(glob.glob('data/user/2*.json')):
    m=json.load(open(f))
    if m.get('prompt') in REP: src[m['prompt']]=f.replace('.json','.wav')
T=json.load(open('results/corpus.json'))
sq=REP[next(iter(REP))].get('squeeze')  # not stored; use measured widths below
AU,AD=0.71,1.0   # the owner's measured up/down interval widths (guided takes)
def corpus_intervals(n):
    for _ in range(100):
        t=T[r.randint(len(T))]; ps=[x[0] for x in t['notes'] if x[0] is not None]
        if len(ps)<n+1: continue
        i=r.randint(0,len(ps)-n); seg=np.array(ps[i:i+n]); seg=seg-seg[0]
        if np.ptp(seg)<=14: return seg
    return np.zeros(n)
meta={}; made=0
for pr,m in sorted(REP.items()):
    if filt and not filt.search(pr): continue
    g=G.get(pr.split('-')[0]); wav=src.get(pr)
    if not g or not wav or not os.path.exists(wav): continue
    sr,x=wavfile.read(wav); x=x.astype(np.float64)/32768; x=x.mean(1) if x.ndim>1 else x
    f0,t=pw.harvest(x,sr,frame_period=5.0,f0_floor=60,f0_ceil=1200); sp=pw.cheaptrick(x,f0,t,sr); ap=pw.d4c(x,f0,t,sr)
    midi=np.where(f0>0,69+12*np.log2(np.maximum(f0,1)/440),np.nan)
    sd=60/float(m.get('bpm',90))/4
    # where in the audio does the Guide's step 0 fall? the offset where the sung pitch best follows the Guide's shape
    def place(tau):
        out=[]
        for x2 in g:
            a=tau+x2['s']*sd; b=a+x2['l']*sd; c0,c1=a+0.25*(b-a),b-0.15*(b-a); sel=(t>=c0)&(t<c1)&np.isfinite(midi)
            out.append((a,b,x2['p'],float(np.nanmedian(midi[sel])) if sel.sum()>=3 else np.nan))
        return out
    def cost(segs):
        d=np.array([s2[3]-s2[2] for s2 in segs]); ok=np.isfinite(d)
        if ok.sum()<0.6*len(d): return 1e9
        return float(np.mean(np.abs(d[ok]-np.median(d[ok]))))+0.5*(1-ok.mean())
    tau=min(np.arange(-0.3,2.5,0.01),key=lambda tt:cost(place(tt))); segs=place(tau); al=tau
    # move each boundary to where the voice really changes pitch (within 0.2 s); repeated notes keep the beat boundary
    ff=np.where(np.isfinite(midi),midi,np.nan); segs=[list(x2) for x2 in segs]
    for i in range(1,len(segs)):
        bnd=segs[i][0]; pa,pb=segs[i-1][3],segs[i][3]
        if np.isfinite(pa) and np.isfinite(pb) and abs(pa-pb)>0.5:
            cand=[(abs(np.nanmedian(ff[(t>=c)&(t<c+0.05)])-np.nanmedian(ff[(t>=c-0.05)&(t<c)])) if np.isfinite(ff[(t>=c-0.05)&(t<c+0.05)]).sum()>4 else 0, c) for c in np.arange(bnd-0.2,bnd+0.2,0.01)]
            v,c=max(cand); 
            if v>0.5: segs[i-1][1]=c; segs[i][0]=c
    segs=[tuple(x2) for x2 in segs]
    sung=np.array([s[3] for s in segs]); ok=np.isfinite(sung)
    if ok.sum()<4: continue
    idx=np.arange(len(sung)); sung=np.interp(idx,idx[ok],sung[ok])
    lo,hi=np.min(sung)-2,np.max(sung)+2   # stay inside the range this voice actually sang
    for v in range(V):
        for _try in range(40):
            iv=corpus_intervals(len(segs)); new=[sung[0]]; tgt=[0]
            for i in range(1,len(segs)):
                d=iv[i]-iv[i-1]; new.append(new[-1]+(AU if d>0 else AD)*d+r.normal(0,0.2)); tgt.append(tgt[-1]+d)
            sh=np.median(sung)-np.median(new); new=list(np.array(new)+round(sh)); 
            if min(new)>=lo and max(new)<=hi: break
        base_shift=round(sh)
        shift=np.array(new)-sung
        cur=np.zeros(len(t))
        for (a,b,_,_),s in zip(segs,shift): cur[(t>=a)&(t<b)]=s
        # between notes and outside: hold the nearest note's shift, then smooth (~20 ms) so glides stay natural
        keys=[((a+b)/2,s) for (a,b,_,_),s in zip(segs,shift)]
        for k in np.where(cur==0)[0]: cur[k]=min(keys,key=lambda q:abs(q[0]-t[k]))[1]
        cur=np.convolve(cur,np.ones(8)/8,mode='same')
        y=pw.synthesize(np.where(f0>0,f0*2**(cur/12),0),sp,ap,sr,frame_period=5.0); y=y/max(1e-6,np.abs(y).max())*0.8
        name=f'tp_{seed}_{pr}_{v}'; wavfile.write(f'{out}/{name}.wav',sr,(y*32767).astype(np.int16))
        base=int(round(sung[0]))+int(base_shift)
        meta[name]=dict(notes=[[round(a,4),round(b,4),base+int(q)] for (a,b,_,_),q in zip(segs,tgt)],bpm=float(m.get('bpm',90)),t0=al,beats_per_bar=4.0,voice='owner-resung',source=pr)
        made+=1
    print(pr,'->',V,flush=True)
json.dump(meta,open(f'{out}/labels.json','w')); print('made',made)
