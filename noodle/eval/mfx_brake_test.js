// Vinyl brake and Bitcrusher (round 16; round 21: back on the beat when the curve returns to 0%, by a quick speed-up or, under More
// settings, a jump). Brake: the curve is how far the record has slowed (100% = stopped). A 440 Hz tone through a
// 4-bar brake at 120 BPM: flat at 50% plays at half speed (220 Hz) the whole time (the old one went back to normal speed while flat);
// ramped to 100% and held, it is silent; after the region it is back at 440 Hz and on time (lined up with the dry tone again).
// Bitcrusher: the worklet holds each sample (Sample rate 2000 Hz at 48 kHz: runs of ~24 equal samples), its Bit depth runs 2-8.
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const r=await p.evaluate(async()=>{ ensureCtx(); S.bpm=120; S.bars=8; const sr=48000, N=sr*10, out={};
    const tone=new Float32Array(N); for(let i=0;i<N;i++) tone[i]=0.4*Math.sin(2*Math.PI*440*i/sr);
    const render=async(k,nodes,params)=>{ const oc=new OfflineAudioContext(1,N,sr); if(k==='crush') await fxWorklet(oc); const bf=oc.createBuffer(1,N,sr); bf.getChannelData(0).set(tone); const src=oc.createBufferSource(); src.buffer=bf;
      const part={off:0,len:4,mfx:{k,curve:{nodes,curves:Array(nodes.length-1).fill(null)},params:params||{}}}, u=mfxUnit(oc,part,x=>x); src.connect(u.input); u.output.connect(oc.destination); src.start(0); u.automate(0,0,8); return (await oc.startRendering()).getChannelData(0); };
    const hz=(x,a,b)=>{ let z=0; for(let i=Math.round(a*sr)+1;i<b*sr;i++) if(x[i-1]<0&&x[i]>=0) z++; return z/(b-a); };
    const rms=(x,a,b)=>{ let q=0,n=0; for(let i=Math.round(a*sr);i<b*sr;i++){ q+=x[i]*x[i]; n++; } return Math.sqrt(q/n); };
    const corr=(x,a,b)=>{ let c=0,e1=0,e2=0; for(let i=Math.round(a*sr);i<b*sr;i++){ c+=x[i]*tone[i]; e1+=x[i]*x[i]; e2+=tone[i]*tone[i]; } return c/Math.sqrt(e1*e2+1e-12); };
    const half=await render('brake',[{t:0,v:0},{t:0.05,v:0.5},{t:0.95,v:0.5},{t:1,v:0}]);
    out.halfHz=[2,4,6].map(t=>Math.round(hz(half,t,t+0.5)));
    const stop=await render('brake',[{t:0,v:0},{t:0.4,v:1},{t:0.98,v:1},{t:1,v:0}]);
    out.slowing=Math.round(hz(stop,1.4,1.7)); out.stoppedRms=+rms(stop,4,7.5).toFixed(4); out.afterHz=Math.round(hz(stop,8.2,9.5)); out.afterCorr=+corr(stop,8.2,9.5).toFixed(3); out.afterCorrHalf=+corr(half,8.2,9.5).toFixed(3);
    const mid=[{t:0,v:0},{t:0.1,v:0.5},{t:0.3,v:0.5},{t:0.4,v:0},{t:1,v:0}];   /* slows to half speed, back to 0% at 3.2 s of the 8 s region */
    const zipR=await render('brake',mid), jumpR=await render('brake',mid,{jump:1});
    out.zipBack=[+corr(zipR,3.9,7.5).toFixed(3),Math.round(hz(zipR,3.9,7.5))]; out.jumpBack=[+corr(jumpR,3.4,7.5).toFixed(3),Math.round(hz(jumpR,3.4,7.5))];   /* on time and on pitch well before the region ends */
    out.zipFast=Math.round(hz(zipR,3.22,3.4));   /* the catch-up itself: briefly faster (higher) */
    out.hidden=MFX.brake.params.every(pm=>pm.adv);
    const cr=await render('crush',[{t:0,v:0},{t:0.01,v:1},{t:0.99,v:1},{t:1,v:0}],{rateHz:2000,bitDepth:4}); let runs=0,len=0,cur=1; for(let i=sr*2+1;i<sr*3;i++){ if(cr[i]===cr[i-1]) cur++; else { runs++; len+=cur; cur=1; } } out.crushRun=Math.round(len/Math.max(1,runs));
    out.crushRange=MFX.crush.params[0].min+'-'+MFX.crush.params[0].max; out.worklet=await fxWorklet(ctx)&&!!ctx._ndCrush;
    return out; });
  const ok=r.zipBack[0]>0.95&&Math.abs(r.zipBack[1]-440)<5&&r.jumpBack[0]>0.95&&Math.abs(r.jumpBack[1]-440)<5&&r.zipFast>460&&r.hidden&&r.halfHz.every(h=>Math.abs(h-220)<15)&&r.slowing<400&&r.stoppedRms<0.01&&Math.abs(r.afterHz-440)<5&&r.afterCorr>0.95&&r.afterCorrHalf>0.95&&Math.abs(r.crushRun-24)<=4&&r.crushRange==='2-8'&&r.worklet;
  if(!ok) errs.push('brake / crush: '+JSON.stringify(r));
  console.log(JSON.stringify(r),errs); await b.close(); })();
