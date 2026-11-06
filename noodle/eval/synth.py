# Synthetic "mouth" takes with exact labels: procedural melodies sung by a source-filter voice
# (hum / da-la syllables / oo / whistle) with human imperfections, a room and a phone mic.
# Everything is generated here (no samples), so there are no license limits on the data.
# usage: python3 synth.py <outdir> <count> [seed]
import numpy as np, json, sys, os
from scipy.signal import lfilter, butter, sosfilt, fftconvolve
from scipy.io import wavfile
SR=22050
VOWELS={'a':[(730,90),(1090,110),(2440,160)],'o':[(570,80),(840,100),(2410,160)],'u':[(300,60),(870,90),(2240,160)],
        'i':[(270,60),(2290,140),(3010,200)],'e':[(530,70),(1840,120),(2480,160)],'m':[(250,50),(1100,300),(2300,400)]}
def reson(x,f,bw):
    r=np.exp(-np.pi*bw/SR); c=-r*r; b=2*r*np.cos(2*np.pi*f/SR); a0=1-b-c
    return lfilter([a0],[1,-b,-c],x)
def reson_tv(x,F,BW,blk=256):  # time-varying resonator, blockwise with carried state
    y=np.zeros_like(x); z=np.zeros(2)
    for s in range(0,len(x),blk):
        f=F[s]; bw=BW[s] if np.ndim(BW) else BW; r=np.exp(-np.pi*bw/SR); c=-r*r; b=2*r*np.cos(2*np.pi*f/SR)
        y[s:s+blk],z=lfilter([1-b-c],[1,-b,-c],x[s:s+blk],zi=z); 
    return y
def melody(r):
    key=r.randint(12); scale=[0,2,4,5,7,9,11] if r.rand()<0.75 else [0,2,3,5,7,8,10]
    bpm=r.uniform(70,140); beat=60/bpm; deg=r.randint(-2,5); notes=[]; t=0
    durs=[0.5,0.5,1,1,1,2,1.5,0.25,3,4]; pw=np.array([3,3,4,4,4,2,1,1,0.6,0.4]); pw/=pw.sum()
    n=r.randint(8,26); motif=[r.choice(len(durs),p=pw) for _ in range(4)]
    for k in range(n):
        d=durs[motif[k%4]] if r.rand()<0.5 else durs[r.choice(len(durs),p=pw)]
        step=r.choice([-2,-1,-1,0,0,1,1,2,3,-3,4,-4],p=np.array([.07,.2,.0,.22,.0,.22,.0,.07,.05,.05,.03,.03])/.94)
        deg=int(np.clip(deg+step,-4,10)); oc,ix=divmod(deg,7); notes.append([t,t+d*beat,key+12*oc+scale[ix]]); t+=d*beat
        if r.rand()<0.1: t+=r.choice([0.5,1])*beat   # a rest
    return notes,bpm
def render(notes,r,voice):
    hi=r.rand()<0.5; base=(72 if voice=='whistle' else 55 if hi else 43)+r.randint(0,6); lo=min(p for *_,p in notes); 
    notes=[[a,b,p-lo+base-r.randint(0,3)] for a,b,p in notes]; tune=r.uniform(-0.5,0.5)
    lead=r.uniform(0.3,1.0); N=int((notes[-1][1]+lead+0.8)*SR); f0=np.zeros(N); amp=np.zeros(N); F1o=np.zeros(N); burst=np.zeros(N)
    legato=voice in('hum','oo') and r.rand()<0.7; vib_d=r.uniform(0,0.35); vib_f=r.uniform(4.5,6.5); outt=r.uniform(0.05,0.3)
    lab=[]; prev=None; VT=np.zeros((N,3)); VT[:]=np.nan; cons=np.zeros(N); fric=np.zeros(N)
    for k,(a,b,p) in enumerate(notes):
        jt=r.normal(0,0.025); s=a+lead+jt; e=b+lead+r.normal(0,0.02)
        gap=0 if legato and r.rand()<0.85 else r.uniform(0.03,0.12)*(b-a)+0.02
        e2=max(s+0.06,e-gap); i0,i1=int(s*SR),int(e2*SR); L=i1-i0; tt=np.arange(L)/SR
        pc=p+tune+r.normal(0,outt)
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
        if legato and prev is not None and r.rand()<0.4 and abs(prev-pc)<0.5: env*=1-r.uniform(0.3,0.8)*np.exp(-((tt-0.02)/0.04)**2)  # same-pitch re-articulation dip
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
def room_and_mic(x,r):
    if r.rand()<0.8:
        rt=r.uniform(0.15,0.6); L=int(rt*SR); ir=r.normal(0,1,L)*np.exp(-6.9*np.arange(L)/L); ir[0]=1/r.uniform(0.15,0.5)
        x=fftconvolve(x,ir/np.abs(ir).sum()*4)[:len(x)]
    x=sosfilt(butter(2,[r.uniform(80,250),r.uniform(5000,9000)],'bandpass',fs=SR,output='sos'),x)
    x=x/np.percentile(np.abs(x),99.5)*r.uniform(0.2,0.6)
    noise=lfilter([1],[1,-r.uniform(0.5,0.98)],r.normal(0,1,len(x))); x=x+noise/np.std(noise)*np.std(x)*10**(-r.uniform(15,45)/20)
    if r.rand()<0.3: x=np.tanh(x*r.uniform(1.5,4))/np.tanh(r.uniform(1.5,4))   # cheap phone limiter
    return np.clip(x,-1,1)
if __name__=='__main__':
    out,cnt=sys.argv[1],int(sys.argv[2]); seed=int(sys.argv[3]) if len(sys.argv)>3 else 0; os.makedirs(out,exist_ok=True); meta={}
    for k in range(cnt):
        r=np.random.RandomState(seed*100000+k); voice=r.choice(['hum','sing','da','oo','whistle'],p=[.3,.3,.2,.1,.1])
        notes,bpm=melody(r); x,lab,info=render(notes,r,voice); x=room_and_mic(x,r)
        name=f'syn_{seed}_{k:04d}'; wavfile.write(f'{out}/{name}.wav',SR,(x*32767).astype(np.int16))
        meta[name]=dict(notes=lab,bpm=round(bpm,1),**info)
        if k%50==0: print(k,flush=True)
    json.dump(meta,open(f'{out}/labels.json','w'))
    print('wrote',cnt)
