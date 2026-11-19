// "Test as" (builds run from Xcode only): Free / Pro switch the whole app at once, App Store goes back to the real purchase; hidden and
// ignored in App Store builds, even if a choice was stored.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const errs=[], out={};
  const c=await b.newContext({...devices['iPhone 13']}); await c.addInitScript(()=>{ window.NOODLE_DEV=true; }); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  out.shown=await p.evaluate(()=>!$('nxDev').hidden);
  await p.evaluate(()=>document.querySelector('#nxDev [data-dv="pro"]').click()); out.pro=await p.evaluate(()=>[isPro(), $('nxProS').textContent]);
  await p.evaluate(()=>document.querySelector('#nxDev [data-dv="free"]').click()); out.free=await p.evaluate(()=>{ PRO.owned=true; return [isPro(), proLocked('Glass')]; });
  await p.evaluate(()=>document.querySelector('#nxDev [data-dv=""]').click()); out.real=await p.evaluate(()=>isPro());   /* PRO.owned (the App Store's answer) */
  await p.evaluate(()=>document.querySelector('#nxDev [data-dv="pro"]').click());
  const r=await (await b.newContext({...devices['iPhone 13']})).newPage(); r.on('pageerror',e=>errs.push(e.message)); await r.goto('http://localhost:8800/noodle-s2.html?studio'); await r.waitForTimeout(900);
  out.release=await r.evaluate(()=>{ localStorage.setItem('noodle.devAs','pro'); return [isPro(), document.getElementById('nxDev').hidden]; });
  const ok=out.shown&&out.pro[0]&&/Testing/.test(out.pro[1])&&out.free[0]===false&&out.free[1]===true&&out.real===true&&out.release[0]===false&&out.release[1]===true; if(!ok) errs.push('test-as check failed');
  console.log(JSON.stringify(out),errs); await b.close(); })();
