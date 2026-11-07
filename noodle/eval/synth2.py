# Synthetic takes v2: excerpts of real folk tunes (rhythm and pitch habits of real melodies), sung with a known beat grid
# and the habits that cost the most fixes: squeezed upward jumps and repeated notes hummed as one sound. Labels = the tune.
# usage: python3 synth2.py <outdir> <count> <seed> <corpus.json>
import numpy as np, json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from synth import *
from synth import SR, VOWELS, reson, reson_tv, room_and_mic
from scipy.io import wavfile
def render2(notes,r,voice,squeeze=(1.0,1.0),cont=0.5,lead=None):
    hi=r.rand()<0.5; base=(72 if voice=='whistle' else 55 if hi else 43)+r.randint(0,6); lo=min(p for *_,p in notes); 
    sh=base-r.randint(0,3)-int(np.median([p for *_,p in notes])-lo); notes=[[a,b,p-lo+sh] for a,b,p in notes]; tune=r.uniform(-0.5,0.5)   # one shift for the whole tune (v1 shifted each note); tune=r.uniform(-0.5,0.5)
    lead=lead if lead is not None else r.uniform(0.3,1.0); N=int((notes[-1][1]+lead+0.8)*SR); f0=np.zeros(N); amp=np.zeros(N); F1o=np.zeros(N); burst=np.zeros(N)
    legato=voice in('hum','oo') and r.rand()<0.7; vib_d=r.uniform(0,0.35); vib_f=r.uniform(4.5,6.5); outt=r.uniform(0.05,0.3)
    lab=[]; prev=None; sq_prev=None; p_prev=None; VT=np.zeros((N,3)); VT[:]=np.nan; cons=np.zeros(N); fric=np.zeros(N)
    for k,(a,b,p) in enumerate(notes):
        jt=r.normal(0,0.025); s=a+lead+jt; e=b+lead+r.normal(0,0.02)
        gap=0 if legato and r.rand()<0.85 else r.uniform(0.03,0.12)*(b-a)+0.02
        e2=max(s+0.06,e-gap); i0,i1=int(s*SR),int(e2*SR); L=i1-i0; tt=np.arange(L)/SR
        if p_prev is None: sp=p
        else:
            d=p-p_prev; sp=sq_prev+(squeeze[0] if d>0 else squeeze[1])*d; sp+=0.25*(p-sp)
        sq_prev=sp; p_prev=p
        pc=sp+tune+r.normal(0,outt)
        cur=np.full(L,pc)
        if r.rand()<0.5:   # scoop up into the note
            sd=r.uniform(-1.8,-0.2); sl=r.uniform(0.03,0.13); cur+=sd*np.exp(-tt/sl*3)
        if legato and prev is not None:  # glide from the last note
            gl=r.uniform(0.02,0.09); cur+=(prev-pc)*np.clip(1-tt/gl,0,1)
        if L/SR>0.25: cur+=vib_d*np.sin(2*np.pi*vib_f*tt+r.rand()*6)*np.clip((tt-0.2)/0.3,0,1)
        cur+=np.cumsum(r.normal(0,0.002,L)); cur+=r.uniform(-0.15,0.15)*tt/max(tt[-1],0.1)  # wander, sag
        f0[i0:i1]=cur
        acc=r.uniform(0.6,1.0); att=r.uniform(0.01,0.06) if voice!='hum' else r.uniform(0.02,0.09)
        env=np.minimum(1,tt/att)*np.exp(-tt*r.uniform(0,1.2))*np.minimum(1,(L/SR-tt)/0.03)
        if legato and prev is not None and r.rand()>cont and abs(prev-pc)<0.5: env*=1-r.uniform(0.3,0.8)*np.exp(-((tt-0.02)/0.04)**2)  # same-pitch re-articulation dip
        amp[i0:i1]=np.maximum(amp[i0:i1],env*acc)
        if voice=='da': burst[i0:i0+int(0.012*SR)]=r.uniform(0.3,0.8); F1o[i0:i1]=-350*np.exp(-tt/0.04)
        if voice=='sing':
            vw=VOWELS[r.choice(['a','o','u','i','e'])]; VT[i0:i1]=[f for f,_ in vw]
            c=r.choice(['none','liquid','plosive','fric'],p=[.25,.35,.25,.15]); cl=int(r.uniform(0.03,0.09)*SR)
            if k>0 and c=='liquid': amp[i0:i0+cl]*=1-r.uniform(0.4,0.8)*np.sin(np.linspace(0,np.pi,len(amp[i0:i0+cl]))); VT[i0:i0+cl,0]=280
            if c=='plosive': amp[max(0,i0-cl//2):i0+cl//3]=0; burst[i0+cl//3:i0+cl//3+int(0.01*SR)]=r.uniform(0.3,0.9)
            if c=='fric': amp[max(0,i0-cl):i0+cl//2]*=0.05; fric[max(0,i0-cl):i0+cl//2]=r.uniform(0.2,0.6)
        lab.append([round(s,4),round(e,4),int(p)]); prev=pc
    v=f0>0; f0[~v]=np.interp(np.where(~v)[0],np.where(v)[0],f0[v]); hz=440*2**((f0-69)/12)
    ph=np.cumsum(hz/SR)
    if voice=='whistle':
        pass
        x=np.sin(2*np.pi*ph)+0.05*np.sin(4*np.pi*ph); x=x*amp+reson(r.normal(0,1,N),np.median(hz),400)*amp*r.uniform(0.02,0.15)
    else:
        tilt=r.uniform(1.2,2.0) if voice!='hum' else r.uniform(1.8,2.6); x=np.zeros(N); jit=1+np.cumsum(r.normal(0,1e-4,N))*0
        for h in range(1,40):
            m=h*hz<SR/2-500
            if not m.any(): break
            x+=m*np.sin(2*np.pi*h*ph)/h**tilt
        x+=r.normal(0,1,N)*r.uniform(0.005,0.05)  # breath
        x*=amp*(1+0.05*r.normal(0,1,N)).clip(0)
        vw=VOWELS['m' if voice=='hum' else 'u' if voice=='oo' else r.choice(['a','o','e','a'])]
        y=np.zeros(N)
        if voice=='sing':
            T=VT.copy()
            for j in range(3):
                m=~np.isnan(T[:,j]); T[:,j]=np.interp(np.arange(N),np.where(m)[0],T[m,j]) if m.any() else vw[j][0]
            T=lfilter([0.003],[1,-0.997],T,axis=0,zi=np.ones((1,3))*T[0])[0]   # smooth vowel transitions (~15 ms)
            sc=r.uniform(0.9,1.15)*(1.12 if base>52 else 1)
            for j,bw in enumerate([80,110,170]): y+=reson_tv(x,T[:,j]*sc,bw)*[1,0.5,0.2][j]
            vw=[]
        for j,(f,bw) in enumerate(vw):
            f=f*r.uniform(0.9,1.15)*(1.12 if base>52 else 1)
            y+=(reson_tv(x,np.maximum(150,f+F1o),bw) if j==0 and voice=='da' else reson(x,f,bw))*[1,0.5 if voice!='hum' else 0.15,0.2 if voice!='hum' else 0.05][j]
        x=y+burst*reson(r.normal(0,1,N),3500,2000)*0.3+fric*reson(r.normal(0,1,N),r.uniform(3500,6000),2500)*0.15
    return x,lab,{'voice':voice,'tune':round(tune,3),'legato':legato}

def excerpt(T, r, bars=4):
    for _ in range(50):
        t=T[r.randint(len(T))]; ns=t['notes']; bar=t['bar']
        starts=[i for i,n in enumerate(ns) if abs(n[2]-1.0)<1e-6]
        if not starts: continue
        i=starts[r.randint(len(starts))]; out=[]; q=0
        while i<len(ns) and q<bar*bars-1e-6: out.append(ns[i]); q+=ns[i][1]; i+=1
        if q>=bar*bars-1e-6 and sum(1 for n in out if n[0] is not None)>=6: return out,bar
    return None,None
if __name__=='__main__':
    out,cnt,seed,cp=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),sys.argv[4]; os.makedirs(out,exist_ok=True)
    T=json.load(open(cp)); meta={}
    for k in range(cnt):
        r=np.random.RandomState(seed*100000+k); ex,bar=excerpt(T,r)
        if ex is None: continue
        bpm=r.uniform(70,130); qd=60/bpm; t=0; notes=[]
        for p,ql,_ in ex:
            if p is not None: notes.append([t,t+ql*qd,p])
            t+=ql*qd
        notes=[n for n in notes if n[1]-n[0]>0.05]
        voice=r.choice(['hum','sing','da','oo','whistle'],p=[.35,.3,.15,.1,.1])
        sq=(r.uniform(0.55,1.0),r.uniform(0.8,1.05)) if r.rand()<0.5 else (r.uniform(0.92,1.05),r.uniform(0.92,1.05))
        lead=r.uniform(0.2,0.8)
        x,lab,info=render2(notes,r,voice,squeeze=sq,cont=r.uniform(0.3,0.9),lead=lead); x=room_and_mic(x,r)
        name=f'syn2_{seed}_{k:04d}'; wavfile.write(f'{out}/{name}.wav',SR,(x*32767).astype(np.int16))
        # labels: intended notes on the beat grid (no timing jitter), plus the grid itself
        meta[name]=dict(notes=[[round(a+lead,4),round(b+lead,4),int(l[2])] for (a,b,_),l in zip(notes,lab)],bpm=round(bpm,2),t0=round(lead,4),beats_per_bar=bar,voice=voice,squeeze=[round(v,3) for v in sq],**{k2:v for k2,v in info.items() if k2!='voice'})
        if k%100==0: print(k,flush=True)
    json.dump(meta,open(f'{out}/labels.json','w')); print('wrote',len(meta))
