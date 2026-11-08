# PESTO pitch (LGPL-3.0, pip pesto-pitch) for a list of audio files -> <out>/<name>.json: [[t, midi or null, conf], ...] (same format as fcpe_extract.py)
import sys, os, json, subprocess, numpy as np, torch
sys.modules.setdefault('torchaudio', type(sys)('torchaudio'))
import pesto
lst,out=sys.argv[1],sys.argv[2]; TH=float(os.environ.get('TH','0.5')); os.makedirs(out,exist_ok=True)
model=pesto.load_model('mir-1k_g7', step_size=10.0, sampling_rate=16000); model.eval()
for f in open(lst).read().split():
    name=os.path.basename(f).rsplit('.',1)[0]; p=os.path.join(out,name+'.json')
    if os.path.exists(p): continue
    a=np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar','16000','-f','f32le','-'],capture_output=True).stdout,dtype=np.float32)
    if len(a)<1600: print('skip (no audio)',f); continue
    with torch.inference_mode(): pred,conf,vol,act=model(torch.tensor(a.copy())[None],sr=16000,convert_to_freq=False,return_activations=True)
    st=pred[0].numpy(); c=conf[0].numpy(); t=np.arange(len(st))*0.01
    json.dump([[round(float(ti),3),(round(float(s),3) if ci>TH else None),round(float(ci),3)] for ti,s,ci in zip(t,st,c)],open(p,'w'))
print('done')
