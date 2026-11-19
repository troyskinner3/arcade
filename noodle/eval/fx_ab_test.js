// The Song FX against the Tuttii FX prototype's own code (troyskinner3/tuttii-fx-prototype, src/main.js, extracted by extract_proto.js into
// srv/proto_fx.js): each effect, default curve, a 4-bar region at 120 BPM, the same test signal (a chord and clicks) through both.
// Compared: waveform correlation, and the largest loudness difference between 50 ms windows. The two effects built on random noise
// (Washout's reverb, Reverse swell's noise) can only match in loudness: in half-second windows, Noodle must stay within the prototype's own
// spread across three seeded runs (+1 dB).
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900); await p.addScriptTag({url:'/proto_fx.js'});
  const r=await p.evaluate(async()=>{ ensureCtx(); S.bpm=120; const sr=48000, N=sr*9, out={};
    const sig=new Float32Array(N); for(let i=0;i<N;i++){ const t=i/sr; sig[i]=0.15*(((t*220)%1)*2-1)+0.12*(((t*277.2)%1)*2-1)+0.1*(((t*329.6)%1)*2-1)+(i%12000<200?0.5*Math.exp(-(i%12000)/40):0); }
    const ids={hp:'highpass',lp:'lowpass',phaser:'phaser',washout:'washout',echo:'echo-throw',tremolo:'tremolo',autopan:'autopan',crush:'bitcrush',brake:'vinylbrake',swell:'reverse-swell',ring:'ringmod'};
    const run=async(build)=>{ const oc=new OfflineAudioContext(2,N,sr), b=oc.createBuffer(1,N,sr); b.getChannelData(0).set(sig); const src=oc.createBufferSource(); src.buffer=b; const u=build(oc); src.connect(u.input); u.output.connect(oc.destination); src.start(0); u.go(); return await oc.startRendering(); };
    for(const [k,pid] of Object.entries(ids)){
      const mr=Math.random; let st=12345; Math.random=()=>{ st=(st*1103515245+12345)>>>0; return st/4294967296; };   /* the prototype's noise, made repeatable for the test */
      const a=await run(oc=>{ const u=PROTO.buildFxUnit(oc,{effectId:pid,duration:4},n=>n); return {input:u.input,output:u.output,go:()=>u.automate(0,0)}; }); Math.random=mr;
      const n=await run(oc=>{ const part={off:0,len:4,mfx:{k,curve:null,params:{}}}; const u=mfxUnit(oc,part,x=>x); return {input:u.input,output:u.output,go:()=>u.automate(0,0,8)}; });
      let c=0,e1=0,e2=0, worst=0; const W=2400;
      for(let ch=0;ch<2;ch++){ const x=a.getChannelData(ch), y=n.getChannelData(ch); for(let i=0;i<sr*8.5;i++){ c+=x[i]*y[i]; e1+=x[i]*x[i]; e2+=y[i]*y[i]; }
        for(let i=0;i+W<sr*8.5;i+=W){ let q1=0,q2=0; for(let j=i;j<i+W;j++){ q1+=x[j]*x[j]; q2+=y[j]*y[j]; } if(q1/W>1e-5||q2/W>1e-5) worst=Math.max(worst,Math.abs(10*Math.log10((q1+1e-9)/(q2+1e-9)))); } }
      out[k]={corr:+(c/Math.sqrt(e1*e2+1e-12)).toFixed(4), worstDb:+worst.toFixed(2)};
      if(k==='washout'||k==='swell'){ const W2=24000, wd=(x0,y0)=>{ let w=0; for(let ch=0;ch<2;ch++){ const x=x0.getChannelData(ch), y=y0.getChannelData(ch); for(let i=0;i+W2<sr*8.5;i+=W2){ let q1=0,q2=0; for(let j=i;j<i+W2;j++){ q1+=x[j]*x[j]; q2+=y[j]*y[j]; } if(q1/W2>1e-5) w=Math.max(w,Math.abs(10*Math.log10((q1+1e-9)/(q2+1e-9)))); } } return w; };
        const P=[]; for(const sd of [7919,15838,23757]){ const mr=Math.random; let s2=sd; Math.random=()=>{ s2=(s2*1103515245+12345)>>>0; return s2/4294967296; }; P.push(await run(oc=>{ const u=PROTO.buildFxUnit(oc,{effectId:pid,duration:4},n=>n); return {input:u.input,output:u.output,go:()=>u.automate(0,0)}; })); Math.random=mr; }
        out[k].selfDb=+Math.max(wd(P[0],P[1]),wd(P[0],P[2]),wd(P[1],P[2])).toFixed(2); out[k].vsDb=+Math.max(...P.map(x=>wd(x,n))).toFixed(2); } }
    return out; });
  const noisy=['washout','swell'], bad=Object.entries(r).filter(([k,v])=>noisy.includes(k)?v.vsDb>v.selfDb+1:(v.corr<0.999||v.worstDb>0.5)).map(([k])=>k);   /* noise-based: within the prototype's own spread across runs */
  if(bad.length) errs.push('differs from the prototype: '+bad.join(', '));
  for(const [k,v] of Object.entries(r)) console.log(k.padEnd(8),JSON.stringify(v)); console.log(errs); await b.close(); })();
