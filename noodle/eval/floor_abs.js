// Absolute levels in the owner's real takes: each take's loud level (top 1% of 10 ms frames), and each hit's peak
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const D=__dirname+'/data'; const b=await chromium.launch(); const p=await b.newPage(); await p.goto('http://localhost:8800/noodle-s2.html'); await p.waitForTimeout(900);
  const takes=fs.readdirSync(D+'/user').filter(f=>/\.wav$/.test(f));
  const r=await p.evaluate(async(takes)=>{ ensureCtx(); const out=[]; for(const f of takes){ const inst=/-kit\.wav$/.test(f)?'kit':'lead'; const ab=await ctx.decodeAudioData(await (await fetch('/data/user/'+f)).arrayBuffer()); const x=mono(ab), sr=ab.sampleRate; const fd=frameDbs(x,sr); const an=analyzeTake(x,sr,inst,55,true);
    out.push({f:f.slice(16),inst,top:+fd[Math.floor((fd.length-1)*0.99)].toFixed(1),lo:+fd[Math.floor((fd.length-1)*0.05)].toFixed(1),ev:(inst==='kit'?an.onsets.map(o=>+o.db.toFixed(1)):[])}); } return out; },takes);
  const tops=r.map(x=>x.top).sort((a,b)=>a-b); console.log('take loud level: min',tops[0],'p10',tops[Math.floor(tops.length*.1)],'median',tops[tops.length>>1],'max',tops[tops.length-1]);
  const los=r.map(x=>x.lo).sort((a,b)=>a-b); console.log('take quietest 5% level: min',los[0],'median',los[los.length>>1],'max',los[los.length-1]);
  r.filter(x=>x.inst==='kit').forEach(x=>console.log(x.f,'top',x.top,'quiet',x.lo,'hit peaks min',Math.min(...x.ev),'n',x.ev.length)); r.sort((a,b)=>a.top-b.top).slice(0,5).forEach(x=>console.log('quietest take',x.f,x.top,x.lo)); await b.close(); })();
