// Song FX regions resize like any part, and the effect scales with them: drag a region's right edge out 2 bars and the drawn curve keeps its
// shape (points are shares of the region), so its peak lands proportionally later in the song; the left edge works too.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); await c.addInitScript(()=>localStorage.setItem('noodle.pro','1')); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  await p.evaluate(async()=>{ ensureCtx(); const o=defaultState(); o.bpm=120; o.bars=12; o.pid=projId(); o.tracks=[mkTrack('pad',{id:900,off:0,len:12,rep:false,lenSet:true,sound:'Warm pad',notes:[0,32,64,96,128,160].map(s=>({s,l:32,p:57,v:.8,x:true}))})]; await projLoadState(o);
    const t=mkTrack('mix',{id:S.nextId++,off:32,len:2,rep:false,lenSet:true}); t.mfx={k:'lp',curve:{nodes:[{t:0,v:0},{t:0.5,v:1},{t:1,v:0}],curves:[null,null]},params:{}}; S.tracks.push(t); save(); renderTracks(); s2.selId=t.id; s2Render(); });
  await p.waitForTimeout(300);
  const peak=()=>p.evaluate(async()=>{ const m=await renderMix(1,false), d=m.getChannelData(0), sr=m.sampleRate, W=Math.round(0.05*sr); let best=1e9, at=0; for(let i=Math.round(4*sr);i+W<Math.round(14*sr);i+=W){ let dx=0,xx=0; for(let j=i+1;j<i+W;j++){ dx+=(d[j]-d[j-1])**2; xx+=d[j]*d[j]; } const hz=Math.sqrt(dx/(xx+1e-12)); if(hz<best){ best=hz; at=i/sr; } } return +at.toFixed(2); });
  const out={}; out.before=await p.evaluate(()=>{ const t=S.tracks.find(t=>t.mfx); return [t.off,t.len]; }); out.peakBefore=await peak();
  const grip=async(cls,dx)=>{ const R=await p.evaluate(c=>{ const e=document.querySelector('.s2-sel .'+c)||document.querySelector('.'+c); const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,bw:s2.barw}; },cls); await p.mouse.move(R.x,R.y); await p.mouse.down(); await p.mouse.move(R.x+dx*R.bw,R.y,{steps:8}); await p.mouse.up(); await p.waitForTimeout(300); };
  await grip('hr',2); out.afterRight=await p.evaluate(()=>{ const t=S.tracks.find(t=>t.mfx); return [t.off,t.len,JSON.stringify(t.mfx.curve.nodes)]; }); out.peakAfter=await peak();
  await p.evaluate(()=>{ s2.selId=S.tracks.find(t=>t.mfx).id; s2Render(); }); await p.waitForTimeout(200); await grip('hl',-1); out.afterLeft=await p.evaluate(()=>{ const t=S.tracks.find(t=>t.mfx); return [t.off,t.len]; });
  // 120 BPM: a bar is 2 s. A 2-bar region from 4 s peaks halfway, at 6 s; stretched to 4 bars, at 8 s (measured a little late: the 50 ms windows)
  const ok=out.before.join()==='32,2'&&out.afterRight[0]===32&&out.afterRight[1]===4&&out.afterRight[2]==='[{"t":0,"v":0},{"t":0.5,"v":1},{"t":1,"v":0}]'&&Math.abs(out.peakBefore-6)<0.25&&Math.abs(out.peakAfter-8)<0.25&&out.afterLeft.join()==='16,5';
  if(!ok) errs.push('resize check failed'); console.log(JSON.stringify(out),errs); await b.close(); })();
