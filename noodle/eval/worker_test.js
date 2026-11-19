// The background reader (js/reader-worker.js) must give exactly what reading on the page gives, for every take: notes, hits,
// the learned reader's onsets, and every extra field. Uses the owner's takes in data/user when present, else synthetic hums and beatbox.
// Also checks the page stays responsive while a take is read. Prints {..., errs:[]} when all is well.
const {chromium}=require('playwright'); const fs=require('fs'); const D=__dirname+'/data/user';
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html'); await p.waitForTimeout(1200);
  const files=fs.existsSync(D)?fs.readdirSync(D).filter(f=>/\.wav$/.test(f)).sort():[];
  const pick=files.filter((f,i)=>i%3===0).slice(0,14);
  const r=await p.evaluate(async pick=>{
    const same=(a,b,path)=>{ if(a===b||(Number.isNaN(a)&&Number.isNaN(b))) return null; if(typeof a!==typeof b||a===null||b===null||typeof a!=='object') return path+': '+String(a).slice(0,40)+' vs '+String(b).slice(0,40);
      if(ArrayBuffer.isView(a)){ if(a.length!==b.length) return path+' length'; for(let i=0;i<a.length;i++) if(a[i]!==b[i]&&!(Number.isNaN(a[i])&&Number.isNaN(b[i]))) return path+'['+i+']'; return null; }
      const ka=Object.keys(a).sort(), kb=Object.keys(b).sort(); if(ka.join()!==kb.join()) return path+' keys '+ka.join()+' / '+kb.join();
      for(const k of ka){ const d=same(a[k],b[k],path+'.'+k); if(d) return d; } return null; };
    const sources=[];
    for(const f of pick){ const ab=await ctx.decodeAudioData(await (await fetch('/data/user/'+f)).arrayBuffer()); sources.push({f,x:mono(ab),sr:ab.sampleRate}); }
    if(!sources.length){ const sr=44100; for(const [f,hz] of [['hum',220],['hum2',330]]){ const x=new Float32Array(sr*4); for(let i=0;i<x.length;i++){ const t=i/sr, n=Math.floor(t/0.5); x[i]=(t%0.5<0.4?0.3:0)*Math.sin(2*Math.PI*hz*(1+0.12*(n%3))*t); } sources.push({f,x,sr}); }
      const x=new Float32Array(sr*3); for(let k=0;k<12;k++){ const s=Math.floor(k*0.25*sr); for(let i=0;i<3000;i++) x[s+i]+=(k%2?(Math.random()*2-1)*0.4:Math.sin(i/sr*2*Math.PI*60)*0.8)*Math.exp(-i/600); } sources.push({f:'beat',x,sr}); }
    await loadReader(); const out=[];
    for(const {f,x,sr} of sources){
      for(const inst of /beat|kit|drum/.test(f)?['kit','kick']:['lead','bass']){
        for(const det of [0,30]){
          const page=withDetail(det,()=>analyzeTake(x,sr,inst,S.sens,true)); const bg=await analyzeTakeBg(x,sr,inst,S.sens,true,det);
          let d=same(page,bg,f+' '+inst+' '+det);
          if(!d && page.notes && page.notes.frames && page.notes.frames.length){ const g={bpm:S.bpm,t0:page.notes[0]?page.notes[0].t0:0};
            d=same(readerOnsets(x,sr,page.notes.frames,g), await readerOnsetsBg(x,sr,page.notes.frames,g), f+' onsets'); }
          out.push(d||'same'); } } }
    // responsive: timers keep firing while a long take is read in the background
    const big=sources[0].x; let ticks=0; const iv=setInterval(()=>ticks++,50); const t0=performance.now(); await analyzeTakeBg(big,sources[0].sr,'lead',S.sens,true,0); const ms=performance.now()-t0; clearInterval(iv);
    return {checked:out.length, diffs:out.filter(x=>x!=='same'), worker:!!(await rwStart()), ms:Math.round(ms), ticks, expected:Math.floor(ms/50)};
  },pick);
  if(r.diffs.length) errs.push('differs: '+r.diffs.slice(0,3).join(' | ')); if(!r.worker) errs.push('no worker');
  if(r.ms>300 && r.ticks<r.expected*0.6) errs.push('page froze while reading');
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
