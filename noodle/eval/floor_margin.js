// How far above the background are real notes and hits, and how far are the "sounds" Noodle finds in a recording of nothing?
// Real takes: background = the quietest tenth of the take's 10 ms frames. Background-only: floor from the first 2 s (as the count-in gives), then 6 s analysed.
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const D=__dirname+'/../data'; const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html'); await p.waitForTimeout(900);
  const takes=fs.readdirSync(D+'/user').filter(f=>/\.wav$/.test(f));
  const real=await p.evaluate(async(takes)=>{ ensureCtx(); const out=[]; for(const f of takes){ const inst=/-kit\.wav$/.test(f)?'kit':'lead'; const ab=await ctx.decodeAudioData(await (await fetch('/data/user/'+f)).arrayBuffer()); const x=mono(ab), sr=ab.sampleRate;
      const fd=frameDbs(x,sr), bg=fd[Math.floor((fd.length-1)*0.1)]; const an=analyzeTake(x,sr,inst,55,true); const m=(inst==='kit'?an.onsets.map(o=>o.db-bg):an.notes.map(n=>n.db-bg)); out.push({f,inst,bg:+bg.toFixed(1),n:m.length,m:m.map(v=>+v.toFixed(1))}); } return out; },takes);
  const noiseFiles=[]; for(const d of fs.readdirSync(D+'/noise')){ const dir=D+'/noise/'+d; if(!fs.statSync(dir).isDirectory()) continue; for(const f of fs.readdirSync(dir).filter(f=>/\.wav$/.test(f)).slice(0,3)) noiseFiles.push('noise/'+d+'/'+f); }
  const noise=await p.evaluate(async(files)=>{ const out=[]; for(const f of files){ let ab; try{ ab=await ctx.decodeAudioData(await (await fetch('/data/'+f)).arrayBuffer()); }catch(e){ continue; } const all=mono(ab), sr=ab.sampleRate;
      for(let k=0;k<4;k++){ const s=Math.floor((k+0.5)*all.length/5), seg=all.slice(s,s+8*sr); if(seg.length<8*sr) continue; const pre=seg.slice(0,2*sr), x=seg.slice(2*sr); const fd=frameDbs(pre,sr), floor=fd[Math.floor((fd.length-1)*0.3)];
        for(const inst of ['kit','lead']){ const an=analyzeTake(x,sr,inst,55,true); const m=(inst==='kit'?an.onsets.map(o=>o.db-floor):an.notes.map(n=>n.db-floor)); out.push({f,inst,floor:+floor.toFixed(1),n:m.length,m:m.map(v=>+v.toFixed(1))}); } } } return out; },noiseFiles);
  // near-silence, like a quiet room: white noise at -65 dBFS with a few faint bumps
  const quiet=await p.evaluate(()=>{ const sr=ctx.sampleRate, out=[]; for(let t=0;t<6;t++){ let seed=11+t; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/1073741823.5-1; }; const seg=new Float32Array(8*sr); for(let i=0;i<seg.length;i++) seg[i]=rnd()*0.0006;
      for(let k=0;k<5;k++){ const at=Math.floor((2.3+k*1.1)*sr), amp=0.0006*(2+t); for(let i=0;i<0.03*sr;i++) seg[at+i]+=rnd()*amp*Math.exp(-i/(0.008*sr)); }
      const pre=seg.slice(0,2*sr), x=seg.slice(2*sr), fd=frameDbs(pre,sr), floor=fd[Math.floor((fd.length-1)*0.3)]; for(const inst of ['kit','lead']){ const an=analyzeTake(x,sr,inst,55,true); const m=(inst==='kit'?an.onsets.map(o=>o.db-floor):an.notes.map(n=>n.db-floor)); out.push({bump:2+t,inst,floor:+floor.toFixed(1),n:m.length,m:m.map(v=>+v.toFixed(1))}); } } return out; });
  const pct=(a,q)=>{ a=[...a].sort((x,y)=>x-y); return a.length?a[Math.floor((a.length-1)*q)]:null; };
  for(const inst of ['kit','lead']){ const R=real.filter(r=>r.inst===inst).flatMap(r=>r.m), N=noise.filter(r=>r.inst===inst).flatMap(r=>r.m), Q=quiet.filter(r=>r.inst===inst).flatMap(r=>r.m);
    console.log(inst,'REAL n',R.length,'min',pct(R,0),'p1',pct(R,0.01),'p5',pct(R,0.05),'p50',pct(R,0.5)); console.log(inst,'BACKGROUND n',N.length,'p50',pct(N,0.5),'p90',pct(N,0.9),'p99',pct(N,0.99),'max',pct(N,1)); console.log(inst,'QUIET ROOM n',Q.length,'p50',pct(Q,0.5),'max',pct(Q,1)); }
  fs.writeFileSync(__dirname+'/../results/floor_margin.json',JSON.stringify({real,noise,quiet})); console.log(errs); await b.close(); })();
