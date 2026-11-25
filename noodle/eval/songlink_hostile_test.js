// Security: a hostile song link (HTML in every text field the app shows) opened by someone else. Nothing in it may run, and the
// payloads must show as plain text. node songlink_hostile_test.js [all]  (all = every string in the file, which also makes the song unplayable)
const {chromium,devices}=require('playwright');
const ALL=process.argv[2]==='all';
const P=tag=>`<img src=x onerror="(window.__pwn=window.__pwn||[]).push('${tag}')">"'><svg onload="(window.__pwn=window.__pwn||[]).push('${tag}/svg')">`;
(async()=>{ const b=await chromium.launch(); const errs=[];
  const c=await b.newContext({...devices['iPhone 13']}); const a=await c.newPage();
  await a.addInitScript(()=>{ localStorage.setItem('noodle.api','http://localhost:8787'); });
  await a.goto('http://localhost:8800/noodle-s2.html?studio'); await a.waitForTimeout(1000);
  const file=await a.evaluate(async()=>{ S.title='T'; S.bars=4; S.secs=[{a:0,b:2,name:'Verse'}]; S.tracks.push(mkTrack('lead',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,notes:[{s:0,l:4,p:60,v:.8}]}));
    S.tracks.push(mkTrack('kit',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,hits:[]})); save(); flushSave(); await projSaveCurrent(); return {noodle:'songs',v:1,songs:await songFilePack([S.pid]),presets:{vox:[{name:'x'}],fx:[{name:'x'}],kit:[{name:'x'}]}}; });
  const g=file.songs[0], o=g.song;
  if(ALL){ const walk=(x,path)=>{ for(const k of Object.keys(x)){ const v=x[k]; if(typeof v==='string'&&k!=='noodle') x[k]=P(path+'.'+k); else if(v&&typeof v==='object') walk(v,path+'.'+k); } }; walk(file,'f'); }
  else { g.title=P('title'); o.title=P('song.title'); o.secs[0].name=P('sec.name'); for(const t of o.tracks){ t.name=P('track.name'); t.sound=P('track.sound'); }
    for(const s of o.kit.slots){ s.say=P('kit.say'); s.sound=P('kit.sound'); } for(const k of ['vox','fx','kit']) file.presets[k]=[{name:P('preset.'+k),id:'z'+k}]; o.key=P('key'); }
  const id='sHOSTILE'+(ALL?'all':'fld')+Date.now().toString(36);
  const put=await fetch(`http://localhost:8787/v1/songs/${id}`,{method:'PUT',headers:{'Content-Type':'application/json','X-Owner':'attackerattackerattacker00'},body:JSON.stringify(file)});
  // victim
  const v=await (await b.newContext({...devices['iPhone 13']})).newPage(); v.on('pageerror',e=>errs.push(e.message.slice(0,120))); v.on('dialog',d=>{ errs.push('DIALOG '+d.message()); d.dismiss(); });
  await v.addInitScript(()=>{ localStorage.setItem('noodle.api','http://localhost:8787'); localStorage.setItem('noodle.onboard','1'); });
  await v.goto('http://localhost:8800/noodle-s2.html?studio&s='+id); await v.waitForTimeout(3000);
  const steps=['renderTracks()','s2Render()','s2ShareSheet()','nxClose()','nxGo("projects")','nxGo("more")','nxGo("studio")','secSheet()','nxClose()','secMenu(0)','nxClose()',
   ...[0,1,2,3].flatMap(i=>[`s2TrackSheet(s2Lanes()[${i}])`,'nxClose()',`s2MixSheet(s2Lanes()[${i}])`,'nxClose()',`s2PickSheet(s2Lanes()[${i}],"sound")`,'nxClose()',`s2Edit(s2Lanes()[${i}].tracks[0])`,'s2Edit(null)']),
   'presetEditSheet("vox")','nxClose()','presetEditSheet("fx")','nxClose()','presetEditSheet("kit")','nxClose()','s2AddSheet(false)','nxClose()','nxShareSheet()','nxClose()'];
  for(const s of steps){ await v.evaluate(s=>{ try{ eval(s); }catch(e){} },s); await v.waitForTimeout(250); }
  const pwn=await v.evaluate(()=>window.__pwn||[]); const title=String(await v.evaluate(()=>S.title)); let shown=0; for(const s of ['nxGo("projects")','s2ShareSheet()','presetEditSheet("vox")']){ await v.evaluate(s=>{try{eval(s)}catch(e){}},s); await v.waitForTimeout(300); shown+=await v.evaluate(()=>(document.body.innerText.match(/<img src=x/g)||[]).length); await v.evaluate(()=>{try{nxClose()}catch(e){}}); } errs.push('payloads visible as text: '+shown);
  const pw=[...new Set(pwn)]; if(pw.length) errs.unshift('RAN: '+pw.join(',')); if(!ALL&&!/payloads visible as text: [1-9]/.test(errs.join())) errs.push('payloads not shown'); const report=errs.filter(e=>/^RAN|not shown/.test(e)||!ALL&&!/visible as text/.test(e));
  console.log(JSON.stringify({mode:ALL?'all':'fields', upload:put.status, opened:title.slice(0,40), executed:pw, notes:errs.filter(e=>/visible/.test(e)), errs:report})); await b.close(); })();
