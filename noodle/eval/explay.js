const pw=require('playwright');
(async()=>{ for(const name of ['chromium','webkit']){ let b; try{ b=await pw[name].launch(); }catch(e){ console.log(name,'unavailable:',String(e).split('\n')[0].slice(0,120)); continue; }
  const c=await b.newContext({...pw.devices['iPhone 13']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
  await p.addInitScript(()=>{ localStorage.setItem('noodle.onboard','1'); }); await p.goto('http://localhost:8800/noodle-s2.html'); await p.waitForTimeout(1200);
  await p.tap('#nxExample'); await p.waitForTimeout(1500); await p.tap('#s2Play'); await p.waitForTimeout(3000);
  const r=await p.evaluate(()=>({playing, ctx:ctx&&ctx.state, bufs:S.tracks.map(t=>t.inst+':'+(t._buf?t._buf.length:'none')), pos:$('s2Pos').textContent}));
  console.log(name, JSON.stringify(r), errs.slice(0,5)); await b.close(); } })();
