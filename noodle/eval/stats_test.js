// Usage stats: nothing leaves localhost; with the eval flag, events go to /v1/events in batches with no install id and no song content;
// the first-time events count once per phone; opens count once a day; the switch in More turns them off and drops what was waiting.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const sent=[]; const errs=[];
  await p.route('**/v1/events',r=>{ sent.push(JSON.parse(r.request().postData())); r.fulfill({status:200,body:'{"ok":true}',headers:{'Access-Control-Allow-Origin':'*'}}); });
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const local=await p.evaluate(()=>{ statsFlush(); return (window.statsSent||[]).map(x=>x.e); });
  const r=await p.evaluate(async()=>{ window.STATS_TEST=true; S.title='Secret song name';
    statsOpen(); trackOnce('first_take','lead'); trackOnce('first_take','lead'); track('take','lead'); proSheet(); nxClose(); statsParts(); statsSess.takes=2; statsSessionEnd(); statsFlush();
    await new Promise(r=>setTimeout(r,300)); return {owner:ownerId()}; });
  const evs=sent.flatMap(x=>x.ev), names=evs.map(x=>x.e);
  await p.evaluate(()=>{ nxGo('more'); }); await p.waitForTimeout(200); await p.click('#nxStSw'); const sw=await p.getAttribute('#nxStSw','aria-checked');
  const before=sent.length; await p.evaluate(()=>{ track('take','bass'); statsFlush(); }); await p.waitForTimeout(250); const off=sent.length-before;
  const body=JSON.stringify(sent), leaks=body.includes('Secret song name')||body.includes(r.owner);
  const out={local, names, opens:names.filter(x=>x==='open').length, firstTake:names.filter(x=>x==='first_take').length, fields:sent[0]&&Object.keys(sent[0]), switch:sw, off, leaks};
  if(!local.includes('first_open')||!local.includes('open')||out.opens!==0||out.firstTake!==1||!names.includes('take')||!names.includes('pro_sheet')||!names.includes('song_parts')||!names.includes('session')
     ||String(out.fields)!=='app,build,plan,ev'||sw!=='false'||off!==0||leaks) errs.push('usage stats check failed');
  console.log(JSON.stringify(out),errs); await b.close(); })();
