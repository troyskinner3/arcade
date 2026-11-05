// Evaluation only: replace the detector's YIN pitch per frame with CREPE (tiny, MIT; ml5 build).
// CREPE takes 1024 samples at 16 kHz, normalized, and returns 360 bins of 20 cents from C1.
window.CREPE_CONF = 0.5;   // frames below this confidence count as unvoiced (the detector's own gates still apply)
window.loadCrepe = async ()=>{ window.crepeModel = await tf.loadLayersModel('/crepe/model.json'); };
window.EXT_PITCH = (frames, z, R, W)=>{
  if(!window.crepeModel || R!==16000) return;
  const N=frames.length, B=256, cents=new Float32Array(360); for(let i=0;i<360;i++) cents[i]=1997.3794084376191+20*i;
  for(let b0=0;b0<N;b0+=B){ const n=Math.min(B,N-b0), buf=new Float32Array(n*1024);
    for(let k=0;k<n;k++){ const c=Math.round(frames[b0+k].t*R), off=k*1024; let mu=0;
      for(let j=0;j<1024;j++){ const v=z[c-512+j]||0; buf[off+j]=v; mu+=v; } mu/=1024; let sd=0;
      for(let j=0;j<1024;j++){ buf[off+j]-=mu; sd+=buf[off+j]*buf[off+j]; } sd=Math.sqrt(sd/1024)||1; for(let j=0;j<1024;j++) buf[off+j]/=sd; }
    const act=tf.tidy(()=>window.crepeModel.predict(tf.tensor2d(buf,[n,1024]))).dataSync();
    for(let k=0;k<n;k++){ const a=act.subarray(k*360,(k+1)*360); let im=0; for(let i=1;i<360;i++) if(a[i]>a[im]) im=i;
      let ws=0,cs=0; for(let i=Math.max(0,im-4);i<=Math.min(359,im+4);i++){ ws+=a[i]; cs+=a[i]*cents[i]; }
      const hz=10*Math.pow(2,(cs/ws)/1200), f=frames[b0+k], conf=a[im];
      f.m=69+12*Math.log2(hz/440); f.conf = conf>=window.CREPE_CONF ? 0.05 : 0.9; f.crepe=conf; } }
};
