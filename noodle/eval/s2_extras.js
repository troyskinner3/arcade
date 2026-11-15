// track sheet (name, instrument, octave, chord, mix), the example song, the export progress bar
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('noodle.onboard','1'); }); await p.goto('http://localhost:8800/noodle-s2.html'); await p.waitForTimeout(900); const out={};
  out.emptyBtn=await p.$eval('#nxExample',e=>e.textContent); await p.screenshot({path:'results/ex0.png'}); await p.tap('#nxExample'); await p.waitForTimeout(900);
  out.example=await p.evaluate(()=>({studio:!$('s2').hidden, title:S.title, lanes:s2Lanes().map(L=>s2Name(L)), bars:S.bars, ex:S.tracks.some(t=>t.ex)})); await p.screenshot({path:'results/ex1.png'});
  await p.evaluate(()=>{ ensureCtx(); return ctx.resume(); });
  const names=await p.$$('.s2-nm'); await names[2].tap(); await p.waitForTimeout(300); await p.screenshot({path:'results/ex2.png'});
  await p.fill('#s2Tn','Hook'); await p.evaluate(()=>{ $('s2Tn').dispatchEvent(new Event('change',{bubbles:true})); }); await p.tap('#s2Ins [data-k="keys"]'); await p.waitForTimeout(300); await p.tap('#nxSheet [data-o="1"]'); await p.waitForTimeout(150);
  await p.evaluate(()=>{ const set=(id,v,ev)=>{ const e=$(id); e.value=v; e.dispatchEvent(new Event(ev,{bubbles:true})); }; set('s2Rev',60,'input'); set('s2Pan',-40,'input'); set('s2Chd','triad','change'); });
  out.track=await p.evaluate(()=>{ const t=S.tracks[2]; return {name:t.name, inst:t.inst, oct:t.oct, send:t.send, pan:t.pan, chord:t.chordType, header:document.querySelectorAll('.s2-nm span')[2].textContent}; }); await p.evaluate(()=>nxClose());
  await p.tap('#s2Share'); await p.tap('#nxSheet [data-k="audio"]'); await p.waitForTimeout(120); out.bar=await p.evaluate(()=>({shown:!$('s2ShBar').hidden, ind:$('s2ShBar').classList.contains('ind')}));
  await p.waitForFunction(()=>!$('s2ShGo').hidden,null,{timeout:60000}); out.done=await p.evaluate(()=>({barHidden:$('s2ShBar').hidden, file:shareFile&&shareFile.name})); await p.evaluate(()=>nxClose());
  await p.tap('#s2Back'); await p.waitForTimeout(400); out.listed=await p.$$eval('.nx-tt',r=>r.map(x=>x.textContent));
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
