# FCPE pitch (MIT, ONNX with its own front end) for a list of audio files -> srv/fcpe/<name>.json: [[t, midi or null, conf], ...]
import sys, os, json, subprocess, numpy as np, onnxruntime as ort
model,lst,out=sys.argv[1],sys.argv[2],sys.argv[3]; os.makedirs(out,exist_ok=True)
CENTS=np.linspace(1200*np.log2(32.7/10),1200*np.log2(1975.5/10),360); TH=0.33
o=ort.SessionOptions(); o.intra_op_num_threads=4; sess=ort.InferenceSession(model,o,providers=['CPUExecutionProvider'])
def cents(sal,w=4):
    idx=np.clip(sal.argmax(1)[:,None]+np.arange(-w,w+1)[None,:],0,359); ww=np.maximum(np.take_along_axis(sal,idx,1),0)
    return (ww*CENTS[idx]).sum(1)/np.maximum(ww.sum(1),1e-12)
for f in open(lst).read().split():
    name=os.path.basename(f).rsplit('.',1)[0]; p=os.path.join(out,name+'.json')
    if os.path.exists(p): continue
    r=subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar','16000','-f','f32le','-'],capture_output=True)
    a=np.frombuffer(r.stdout,dtype=np.float32)
    if len(a)<1600: print('skip (no audio)',f); continue
    sal=sess.run(None,{'audio':a[None]})[0][0].astype(np.float64); hz=10*2**(cents(sal)/1200); conf=sal.max(1)
    t=np.arange(len(hz))*0.01+0.005
    json.dump([[round(float(ti),3),(round(float(69+12*np.log2(h/440)),3) if c>TH else None),round(float(c),3)] for ti,h,c in zip(t,hz,conf)],open(p,'w'))
print('done')
