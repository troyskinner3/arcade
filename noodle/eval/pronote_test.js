// The "… is Pro. Get Pro to keep it." note after a Pro preview: tapping it opens the Pro sheet while it shows, but once it has gone
// (timed out, or put away by a tap elsewhere) it never catches taps. Owner, 22 Nov: an invisible note kept opening the Pro sheet over
// Edit, the song list, Rename, and stopped More from scrolling, until another note (Duplicate's) replaced it. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('noodle.onboard','1'); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000);
  const w=ms=>p.waitForTimeout(ms), sheetOpen=()=>p.evaluate(()=>!!document.querySelector('#nxSheet .pro-cards')&&$('nxScrim').hidden===false);
  const box=async()=>p.evaluate(()=>{ const r=$('toast').getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2}; });
  const out={};
  // 1. while it shows, tapping it opens the Pro sheet
  await p.evaluate(()=>proNote(['Horns'])); await w(300); let at=await box(); await p.mouse.click(at.x,at.y); await w(300); out.tapOpens=await sheetOpen();
  await p.evaluate(()=>nxClose()); await w(300);
  // 2. put away by a tap elsewhere: the same spot no longer opens it
  await p.evaluate(()=>proNote(['Horns'])); await w(300); at=await box(); await p.mouse.click(5,5); await w(400); await p.mouse.click(at.x,at.y); await w(300); out.awayNoOpen=!(await sheetOpen());
  await p.evaluate(()=>nxClose()); await w(300);
  // 3. timed out: no longer takes taps either
  await p.evaluate(()=>{ proNote(['Horns']); const t=$('toast'); clearTimeout(t._h); t._h=setTimeout(()=>toastOff(t),200); }); await w(300); at=await box(); await w(300);
  await p.mouse.click(at.x,at.y); await w(300); out.timedNoOpen=!(await sheetOpen());
  out.hiddenNoTaps=await p.evaluate(()=>getComputedStyle($('toast')).pointerEvents==='none'&&!$('toast').classList.contains('act'));
  for(const k of ['tapOpens','awayNoOpen','timedNoOpen','hiddenNoTaps']) if(!out[k]) errs.push(k);
  console.log(JSON.stringify({...out,errs})); await b.close(); })();
