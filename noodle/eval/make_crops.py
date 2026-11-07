# Cut each downloaded a cappella into up to 3 clips of 30 s where the voice is busiest (22.05 kHz mono WAV), for training.
# usage: python3 -I make_crops.py <in_dir> <out_dir> [n_per_track]
import sys, os, glob, subprocess, numpy as np
from scipy.io import wavfile
src,dst=sys.argv[1],sys.argv[2]; N=int(sys.argv[3]) if len(sys.argv)>3 else 3; os.makedirs(dst,exist_ok=True); SR=22050; L=30*SR; made=0
for f in sorted(glob.glob(os.path.join(src,'*.mp3'))+glob.glob(os.path.join(src,'*.wav'))):
    base=os.path.splitext(os.path.basename(f))[0]
    if glob.glob(os.path.join(dst,base+'_*.wav')): continue
    r=subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar',str(SR),'-f','s16le','-'],capture_output=True)
    x=np.frombuffer(r.stdout,dtype=np.int16).astype(np.float32)/32768
    if len(x)<10*SR: continue
    if len(x)<=L: wavfile.write(os.path.join(dst,f'{base}_0.wav'),SR,(x*32767).astype(np.int16)); made+=1; continue
    hop=SR//2; e=np.array([np.sqrt(np.mean(x[i:i+hop]**2)) for i in range(0,len(x)-hop,hop)]); act=(e>max(1e-4,0.15*np.percentile(e,95))).astype(float)
    w=L//hop; score=np.convolve(act,np.ones(w),'valid'); picks=[]
    for i in np.argsort(-score):
        if score[i]<0.5*w: break
        if all(abs(i-j)>=w for j in picks): picks.append(i)
        if len(picks)>=N: break
    for k,i in enumerate(picks):
        seg=x[i*hop:i*hop+L]; wavfile.write(os.path.join(dst,f'{base}_{k}.wav'),SR,(seg/max(1e-6,np.abs(seg).max())*0.9*32767).astype(np.int16)); made+=1
print('clips',made)
