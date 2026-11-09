# At missed same-pitch repeats vs inside truly held notes: how much does the sound's colour (log-mel shape) and loudness change?
import json,glob,os,sys,subprocess,numpy as np; sys.path.insert(0,'tools'); import score_user_lib as SU
REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob('results/replay_drift3/2-*.json')}; G=SU.guides(REP)
src={}
for f in sorted(glob.glob('data/user/2*.json')):
    m=json.load(open(f))
    if m.get('prompt') in REP: src[m['prompt']]=f.replace('.json','.wav')
def melspec(f):
    a=np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar','16000','-f','f32le','-'],capture_output=True).stdout,dtype=np.float32)
    n=512; hop=160; win=np.hanning(n); F=np.array([np.abs(np.fft.rfft(a[i:i+n]*win)) for i in range(0,len(a)-n,hop)])
    fr=np.fft.rfftfreq(n,1/16000); mel=lambda h:2595*np.log10(1+h/700); edges=np.linspace(mel(80),mel(7000),42); hz=700*(10**(edges/2595)-1)
    M=np.stack([((fr>=hz[i])&(fr<hz[i+2])).astype(float)*np.minimum((fr-hz[i])/(hz[i+1]-hz[i]),(hz[i+2]-fr)/(hz[i+2]-hz[i+1])).clip(0) for i in range(40)],1)
    L=np.log(F@M+1e-6); return L, 10*np.log10((F**2).sum(1)+1e-9)
def cue(L,db,t,w=0.06):
    i=int(round(t/0.01)); a=L[max(0,i-int(w/0.01)*2):max(1,i-int(w/0.01)//2)].mean(0); b=L[i+int(w/0.01)//2:i+int(w/0.01)*2].mean(0); c=L[max(0,i-3):i+4]
    shape=lambda v:(v-v.mean())
    flux=max(np.linalg.norm(shape(c[k])-shape(c[k-1])) for k in range(1,len(c))) if len(c)>1 else 0
    dip=min(db[max(0,i-20):i].max(),db[i:i+20].max())-db[max(0,i-4):i+5].min()
    return float(np.linalg.norm(shape(a)-shape(b))), float(flux), float(dip)
pos=[];neg=[]
for pr,m in REP.items():
    g=G.get(pr.split('-')[0]); est=m['heard']['notes']
    if not g or not est or pr not in src: continue
    L,db=melspec(src[pr]); sd=60/float(m['bpm'])/4; al=m['al']
    _,dt,dp=min(((SU.edits([{**e,'s':e['s']+dt,'p':e['p']+dp} for e in est],g)[0],dt,dp) for dt in range(-4,5) for dp in range(-36,37)))
    E=[{**e,'s':e['s']+dt} for e in est]
    for j,r in enumerate(g):
        cover=[e for e in E if e['s']<r['s']<e['s']+e['l']]
        if j and g[j-1]['p']==r['p'] and cover and not any(abs(e['s']-r['s'])<=1 for e in E):
            pos.append((pr,)+cue(L,db,al+(r['s']-dt)*sd))
        # held: a guide note of 4+ steps sung as one note; probe its middle
        if r['l']>=4 and any(abs(e['s']-r['s'])<=1 and e['l']>=r['l']-1 for e in E):
            neg.append((pr,)+cue(L,db,al+(r['s']+r['l']/2-dt)*sd))
pos=np.array([p[1:] for p in pos]); neg=np.array([n[1:] for n in neg])
print('missed repeats',len(pos),'held-note middles',len(neg))
for k,name in enumerate(['colour change (before/after)','colour flux','loudness dip dB']):
    print(f'{name:30s} repeats median {np.median(pos[:,k]):.2f}  held median {np.median(neg[:,k]):.2f}  | held above repeat median: {np.mean(neg[:,k]>=np.median(pos[:,k])):.0%}')
    for th in np.quantile(pos[:,k],[0.25,0.5]): print(f'     threshold {th:.2f}: catches {np.mean(pos[:,k]>=th):.0%} repeats, false on {np.mean(neg[:,k]>=th):.0%} held')
