// Crash reports: nothing is sent from localhost; with the eval flag, an uncaught error is sent once (what went wrong, build, app, screen; no
// song content), a repeat isn't, a failed promise is; the switch in More turns sending off.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const sent=[]; const errs=[];
  await p.route('**/v1/errors',r=>{ sent.push(JSON.parse(r.request().postData())); r.fulfill({status:200,body:'{"ok":true}',headers:{'Access-Control-Allow-Origin':'*'}}); });
  p.on('pageerror',e=>{ if(!/test (boom|nope)/.test(e.message)) errs.push(e.message); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const boom=()=>p.evaluate(()=>{ setTimeout(()=>{ throw new Error('test boom'); },0); }).then(()=>p.waitForTimeout(250));
  await p.evaluate(()=>{ S.title='Secret song name'; }); await boom(); const fromLocal=sent.length;
  await p.evaluate(()=>{ window.CRASH_TEST=true; }); await boom(); await boom(); const once=sent.length;
  await p.evaluate(()=>{ Promise.reject(new Error('test nope')); }); await p.waitForTimeout(250); const rej=sent.length;
  await p.evaluate(()=>{ nxGo('more'); }); await p.waitForTimeout(200); await p.click('#nxCrSw'); const sw=await p.getAttribute('#nxCrSw','aria-checked');
  await p.evaluate(()=>{ setTimeout(()=>{ throw new Error('test boom 2'); },0); }); await p.waitForTimeout(250); const off=sent.length;
  const leaks=JSON.stringify(sent).includes('Secret song name');
  const r={fromLocal, once, rej, switch:sw, off, fields:sent[0]&&Object.keys(sent[0]), leaks}; if(fromLocal!==0||once!==1||rej!==2||sw!=='false'||off!==2||leaks) errs.push('crash report check failed');
  console.log(JSON.stringify(r),errs); await b.close(); })();
