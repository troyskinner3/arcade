# Noisy takes cleaned with spectral subtraction, using 2 s of the same background heard just before the take (what the count-in gives the app).
# Usage: denoise_mix.py ENV SNR out over floor     (same seed/order as mix_noise.py, so the mixes are identical)
import sys,os,json,glob,subprocess,shutil,numpy as np
env,snr,out,over,flo=sys.argv[1],float(sys.argv[2]),sys.argv[3],float(sys.argv[4]),float(sys.argv[5]); os.makedirs(out,exist_ok=True)
def read(f,sr=None):
    a=['ffmpeg','-v','error','-i',f,'-ac','1']+(['-ar',str(sr)] if sr else [])+['-f','f32le','-']
    return np.frombuffer(subprocess.run(a,capture_output=True).stdout,dtype=np.float32).astype(np.float64)
def sr_of(f): return int(subprocess.run(['ffprobe','-v','error','-show_entries','stream=sample_rate','-of','csv=p=0',f],capture_output=True,text=True).stdout.split()[0])
def stft(x,n,h,w): 
    k=1+(len(x)-n)//h; return np.fft.rfft(np.stack([x[i*h:i*h+n] for i in range(k)])*w,axis=1)
def denoise(y,pre,sr,over,flo):
    n=int(2**round(np.log2(0.032*sr))); h=n//4; w=np.sqrt(np.hanning(n+1)[:n]); yp=np.concatenate([np.zeros(n),y,np.zeros(n)])
    Y=stft(yp,n,h,w); N=(np.abs(stft(pre,n,h,w))**2).mean(0)
    P=np.abs(Y)**2; G=np.maximum(1-over*N[None,:]/(P+1e-20),0)
    # smooth the gain a little across time and frequency (less "musical noise")
    G=(G+np.roll(G,1,0)+np.roll(G,-1,0))/3; G=(G+np.roll(G,1,1)+np.roll(G,-1,1))/3; G=np.maximum(G,flo)
    Z=np.fft.irfft(Y*G,n,axis=1)*w; o=np.zeros(len(yp)); ws=np.zeros(len(yp))
    for i in range(len(Z)): o[i*h:i*h+n]+=Z[i]; ws[i*h:i*h+n]+=w*w
    return (o/np.maximum(ws,1e-6))[n:n+len(y)]
AL=json.load(open('results/al_known.json')); rng=np.random.default_rng(7); N={}
for jf in sorted(glob.glob('data/user/2*.json')):
    m=json.load(open(jf))
    if m.get('prompt') not in AL: continue
    wav=jf.replace('.json','.wav'); sr=sr_of(wav); x=read(wav)
    if sr not in N: N[sr]=read(f'data/noise/{env}/ch01.wav',sr)
    n=N[sr]; st=rng.integers(0,len(n)-len(x)); nz=n[st:st+len(x)]
    fl=int(0.02*sr); P=np.array([np.mean(x[i:i+fl]**2) for i in range(0,len(x)-fl,fl)])+1e-12; dB=10*np.log10(P)
    act=P[dB>dB.max()-30].mean(); g=np.sqrt(act/(np.mean(nz**2)+1e-12)/10**(snr/10)); y=x+g*nz; sc=1/max(1.0,np.abs(y).max()/0.99); y*=sc
    pre=n[st-2*sr:st] if st>=2*sr else n[st+len(x):st+len(x)+2*sr]; pre=sc*g*pre
    z=y if over<0 else denoise(y,pre,sr,over,flo)
    if over<0: subprocess.run(['ffmpeg','-v','error','-y','-f','f64le','-ar',str(sr),'-ac','1','-i','-',os.path.join(out,os.path.basename(wav).replace('.wav','.pre.wav'))],input=pre.astype('<f8').tobytes(),check=True)
    b=os.path.basename(wav); subprocess.run(['ffmpeg','-v','error','-y','-f','f64le','-ar',str(sr),'-ac','1','-i','-',os.path.join(out,b)],input=z.astype('<f8').tobytes(),check=True)
    shutil.copy(jf,out)
