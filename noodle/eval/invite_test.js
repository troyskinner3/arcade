// Invites: More > Invite friends shows your code and progress; three friends (fresh browsers) use the code after making a song (one types it
// before having a song: it waits, then counts after the first take is kept); the owner adds offer codes; the inviter then sees the Pro code.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const errs=[], out={};
  const open=async()=>{ const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); await p.addInitScript(()=>{ localStorage.setItem('noodle.api','http://localhost:8787'); }); await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900); return p; };
  const a=await open(); await a.evaluate(()=>{ PRO.owned=false; nxGo('more'); }); await a.tap('#nxInv'); await a.waitForTimeout(600);
  const code=(await a.textContent('#invBody')).match(/Your code: ([A-Z2-9]{6})/)[1]; out.progress=(await a.textContent('#invBody')).includes('0 of 3');
  for(let i=0;i<3;i++){ const f=await open();
    if(i===0){ await f.evaluate(c=>{ inviteUse(c); },code); await f.waitForTimeout(400); out.waits=await f.evaluate(()=>localStorage.getItem('noodle.inviteBy'));
      await f.evaluate(()=>{ S.tracks.push(mkTrack('lead',{id:S.nextId++,notes:[{s:0,l:4,p:60,v:.8}]})); save(); afterTake(); }); await f.waitForTimeout(2200); out.sentLater=await f.evaluate(()=>localStorage.getItem('noodle.inviteBy')); }
    else { await f.evaluate(()=>{ S.tracks.push(mkTrack('lead',{id:S.nextId++,notes:[{s:0,l:4,p:60,v:.8}]})); save(); }); await f.evaluate(()=>{ nxGo('more'); }); await f.tap('#nxInv'); await f.waitForTimeout(300); await f.fill('#invCode',code.toLowerCase()); await f.tap('#invUse'); await f.waitForTimeout(500); }
    await f.context().close(); }
  await fetch('http://localhost:8787/v1/admin/codes',{method:'PUT',headers:{Authorization:'Bearer local'},body:JSON.stringify(['NOODLEPRO1'])});
  await a.evaluate(()=>nxClose()); await a.tap('#nxInv'); await a.waitForTimeout(700); const t=await a.textContent('#invBody'); out.reward=t.includes('NOODLEPRO1'); out.redeem=await a.getAttribute('#invBody a','href');
  await a.screenshot({path:__dirname+'/results/invite.png'});
  const want={progress:true,waits:code,sentLater:null,reward:true,redeem:'https://apps.apple.com/redeem'};
  for(const [k,v] of Object.entries(want)) if(JSON.stringify(out[k])!==JSON.stringify(v)) errs.push(k+': '+JSON.stringify(out[k]));
  console.log(JSON.stringify({...out,errs})); await b.close(); })();
