// Song links: Share > Link to remix asks once, uploads the song (and a preview) to the takes service (local copy on :8787), and gives a
// /s/ link whose page shows the song. Opening ?s=<id> in a fresh browser adds "Remix of ..." with the same parts. Stop sharing deletes it.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const errs=[], out={};
  const ctxA=await b.newContext({...devices['iPhone 13']}); const a=await ctxA.newPage(); a.on('pageerror',e=>errs.push(e.message));
  await a.addInitScript(()=>{ localStorage.setItem('noodle.api','http://localhost:8787'); });
  await a.goto('http://localhost:8800/noodle-s2.html?studio'); await a.waitForTimeout(1000);
  await a.evaluate(()=>{ S.title='Night bus'; S.bars=2; S.tracks.push(mkTrack('lead',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,notes:[{s:0,l:4,p:60,v:.8},{s:4,l:4,p:64,v:.8}]})); save(); flushSave(); renderTracks(); s2ShareSheet(); });
  await a.waitForTimeout(200); await a.tap('[data-k="link"]'); await a.waitForTimeout(150); out.asked=await a.isVisible('#s2LkOk'); await a.tap('#s2LkOk');
  for(let i=0;i<60 && !(await a.evaluate(()=>!!(S.link&&shareUrl))); i++) await a.waitForTimeout(250);
  out.url=await a.evaluate(()=>shareUrl); out.status=await a.textContent('#s2ShSt'); out.copy=await a.textContent('#s2ShSave');
  const id=out.url.split('/s/')[1]; const page=await (await fetch(out.url)).text(); out.page=/Night bus/.test(page)&&/Remix in Noodle/.test(page);
  out.preview=(await fetch(`http://localhost:8787/v1/songs/${id}/preview`)).status;
  // someone else opens it
  const ctxB=await b.newContext({...devices['iPhone 13']}); const p2=await ctxB.newPage(); p2.on('pageerror',e=>errs.push('B: '+e.message));
  await p2.addInitScript(()=>{ localStorage.setItem('noodle.api','http://localhost:8787'); });
  await p2.goto('http://localhost:8800/noodle-s2.html?s='+id); await p2.waitForTimeout(2500);
  out.remix=await p2.evaluate(()=>({title:S.title, notes:S.tracks.filter(t=>t.inst==='lead').map(t=>t.notes.map(n=>n.p).join(',')).join('|'), remixOf:S.remixOf&&S.remixOf.title, link:!!S.link}));
  // the sharer stops sharing
  await a.evaluate(()=>{ nxClose(); s2ShareSheet(); }); await a.waitForTimeout(200); out.stopBtn=await a.isVisible('#s2LkStop'); await a.tap('#s2LkStop'); await a.waitForTimeout(600);
  out.after=(await fetch(`http://localhost:8787/v1/songs/${id}`)).status; out.linkGone=await a.evaluate(()=>!S.link);
  const want={asked:true,copy:'Copy link',page:true,preview:200,remix:{title:'Remix of Night bus',notes:'60,64',remixOf:'Night bus',link:false},stopBtn:true,after:404,linkGone:true};
  for(const [k,v] of Object.entries(want)) if(JSON.stringify(out[k])!==JSON.stringify(v)) errs.push(k+': '+JSON.stringify(out[k]));
  if(!/^http:\/\/localhost:8787\/s\/s[\w-]{12}$/.test(out.url||'')) errs.push('url '+out.url);
  console.log(JSON.stringify({...out,errs})); await b.close(); })();
