// A track that fails to render (as could happen in one browser and not another) no longer stops playback: the rest plays and a message names the track and the error
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('noodle.onboard','1'); }); await p.goto('http://localhost:8800/noodle-s2.html'); await p.waitForTimeout(1000);
  await p.tap('#nxExample'); await p.waitForTimeout(1200);
  await p.evaluate(()=>{ const _r=renderFx; renderFx=async function(){ throw {name:'Simulated',message:'track failure'}; }; S.tracks.forEach(t=>{ t._dirty=true; t._buf=null; }); renderedLen=0; });
  await p.tap('#s2Play'); await p.waitForTimeout(2500);
  const r=await p.evaluate(()=>({playing, moving:s2.cur>0.05, toast:$('toast').textContent, others:S.tracks.filter(t=>t.inst!=='fx').every(t=>t._buf&&t._buf.getChannelData(0).some(v=>Math.abs(v)>0.01))}));
  console.log(JSON.stringify(r),errs); await b.close(); })();
