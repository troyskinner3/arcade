# Mix real noise (DEMAND, CC BY 4.0) into the guided takes at a given SNR. SNR measured against the voice's active level
# (frames within 30 dB of the take's loudest), noise level = its mean power. Output keeps each take's sample rate and its JSON.
import sys,os,json,glob,subprocess,shutil,numpy as np
env,snr,out=sys.argv[1],float(sys.argv[2]),sys.argv[3]; os.makedirs(out,exist_ok=True)
def read(f,sr=None):
    a=['ffmpeg','-v','error','-i',f,'-ac','1']+(['-ar',str(sr)] if sr else [])+['-f','f32le','-']
    return np.frombuffer(subprocess.run(a,capture_output=True).stdout,dtype=np.float32).astype(np.float64)
def sr_of(f): return int(subprocess.run(['ffprobe','-v','error','-show_entries','stream=sample_rate','-of','csv=p=0',f],capture_output=True,text=True).stdout.split()[0])
AL=json.load(open('results/al_known.json')); rng=np.random.default_rng(7)
noise_f=glob.glob(f'data/noise/{env}/*.wav')[0]
for jf in sorted(glob.glob('data/user/2*.json')):
    m=json.load(open(jf))
    if m.get('prompt') not in AL: continue
    wav=jf.replace('.json','.wav'); sr=sr_of(wav); x=read(wav); n=read(noise_f,sr)
    st=rng.integers(0,len(n)-len(x)); nz=n[st:st+len(x)]
    fl=int(0.02*sr); P=np.array([np.mean(x[i:i+fl]**2) for i in range(0,len(x)-fl,fl)])+1e-12; dB=10*np.log10(P)
    act=P[dB>dB.max()-30].mean(); g=np.sqrt(act/(np.mean(nz**2)+1e-12)/10**(snr/10))
    y=x+g*nz; y/=max(1.0,np.abs(y).max()/0.99)
    b=os.path.basename(wav); subprocess.run(['ffmpeg','-v','error','-y','-f','f64le','-ar',str(sr),'-ac','1','-i','-',os.path.join(out,b)],input=y.astype('<f8').tobytes(),check=True)
    shutil.copy(jf,out)
print('mixed',env,snr,'->',out)
