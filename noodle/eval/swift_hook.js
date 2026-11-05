// Evaluation only: replace the detector's YIN pitch per frame with SwiftF0 (MIT; 16 kHz in, pitch + confidence per 16 ms frame).
window.SWIFT_CONF = 0.5;
window.loadSwift = async ()=>{ ort.env.wasm.wasmPaths='/swiftf0/'; ort.env.wasm.numThreads=1;
  window.swiftSess = await ort.InferenceSession.create('/swiftf0/swiftf0.onnx'); };
// resample to 16 kHz with an offline context, then run the model once over the whole take
window.EXT_PREP = async (x, sr)=>{ const n16=Math.floor(x.length*16000/sr), oc=new OfflineAudioContext(1,n16,16000), b=oc.createBuffer(1,x.length,sr); b.copyToChannel(x,0);
  const s=oc.createBufferSource(); s.buffer=b; s.connect(oc.destination); s.start(); const y=(await oc.startRendering()).getChannelData(0);
  const out=await window.swiftSess.run({audio:new ort.Tensor('float32',y,[1,y.length]), fmin:new ort.Tensor('float32',new Float32Array([46.875]),[]), fmax:new ort.Tensor('float32',new Float32Array([2093.75]),[])});
  const pitch=out.pitch.data, conf=Float32Array.from(out.confidence.data);
  for(let i=0;i<conf.length;i++){ let pk=0; for(let j=i*256;j<Math.min(y.length,(i+1)*256);j++) pk=Math.max(pk,Math.abs(y[j])); if(pk<1e-3) conf[i]=0; }
  window.SWIFT={pitch,conf}; };
window.EXT_PITCH = (frames)=>{ const S=window.SWIFT; if(!S) return;
  for(const f of frames){ const i=Math.min(S.conf.length-1,Math.max(0,Math.round(f.t/0.016))), hz=S.pitch[i], c=S.conf[i];
    if(hz>0) f.m=69+12*Math.log2(hz/440); f.conf = c>=window.SWIFT_CONF ? 0.05 : 0.9; f.swift=c; } };
