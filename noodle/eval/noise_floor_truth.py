# For each noisy mix: the level of the noise alone (what the count-in would hear), as 30th percentile of 10 ms frame dB. Same seed/order as mix_noise.py.
import sys,os,json,glob,subprocess,numpy as np
def read(f,sr=None):
    a=['ffmpeg','-v','error','-i',f,'-ac','1']+(['-ar',str(sr)] if sr else [])+['-f','f32le','-']
    return np.frombuffer(subprocess.run(a,capture_output=True).stdout,dtype=np.float32).astype(np.float64)
def sr_of(f): return int(subprocess.run(['ffprobe','-v','error','-show_entries','stream=sample_rate','-of','csv=p=0',f],capture_output=True,text=True).stdout.split()[0])
AL=json.load(open('results/al_known.json')); out={}
takes=[(jf,json.load(open(jf))) for jf in sorted(glob.glob('data/user/2*.json'))]; takes=[(jf,m) for jf,m in takes if m.get('prompt') in AL]
X={jf:(sr_of(jf.replace('.json','.wav')),read(jf.replace('.json','.wav'))) for jf,m in takes}
for env in ('STRAFFIC','PCAFETER','TBUS','SPSQUARE','NPARK'):
    N={}
    for snr in (20,10,5):
        rng=np.random.default_rng(7); key=f'noisy/{env}_{snr}'; out[key]={}
        for jf,m in takes:
            sr,x=X[jf]
            if sr not in N: N[sr]=read(f'data/noise/{env}/ch01.wav',sr)
            n=N[sr]; st=rng.integers(0,len(n)-len(x)); nz=n[st:st+len(x)]
            fl=int(0.02*sr); P=np.array([np.mean(x[i:i+fl]**2) for i in range(0,len(x)-fl,fl)])+1e-12; dB=10*np.log10(P)
            act=P[dB>dB.max()-30].mean(); g=np.sqrt(act/(np.mean(nz**2)+1e-12)/10**(snr/10)); sc=1/max(1.0,np.abs(x+g*nz).max()/0.99)
            w=int(0.01*sr); nf=10*np.log10(np.array([np.mean((sc*g*nz[i:i+w])**2) for i in range(0,len(nz)-w,w)])+1e-12)
            out[key][m['prompt']]=float(np.percentile(nf,30))
json.dump(out,open('results/noise_floor_truth.json','w')); print('ok')
