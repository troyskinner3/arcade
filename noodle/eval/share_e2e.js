// the app sharing a take to the takes service (local copy), updating it after an edit, then deleting everything it shared
const {chromium}=require('playwright'); const fs=require('fs');
const H={Authorization:'Bearer local'}, A='http://localhost:8787/v1/admin/';
const L=async()=>(await (await fetch(A+'list',{headers:H})).json()).keys, M=async()=>await (await fetch(A+'get?key='+(await L()).find(k=>k.key.endsWith('meta.json')).key,{headers:H})).json();
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-share.html?share=http://localhost:8787&age13=1'); await p.waitForTimeout(1200);
  const wav=fs.readdirSync(__dirname+'/../data/user').filter(f=>/buns-words-lead\.wav$/.test(f)).sort().pop();
  const d0=await p.evaluate(async(wav)=>{ ensureCtx(); const ab=await ctx.decodeAudioData(await (await fetch('/data/user/'+wav)).arrayBuffer());
    const tr=S.tracks.find(t=>INST[t.inst].kind==='pitched')||mkTrack('lead',{id:S.nextId++}); if(!S.tracks.includes(tr)) S.tracks.push(tr); S.target=tr.id; S.activeId=tr.id;
    await addTake(mono(ab),ab.sampleRate,'lead',{align:0.08,notch:true,live:true}); S.target=null; await new Promise(q=>setTimeout(q,2500)); return {api:drop.api, installLen:drop.install.length, guidedHidden:$('guided').hidden}; },wav);
  const m1=await M();
  await p.evaluate(async()=>{ const t2=S.tracks.find(t=>t.sid), n=t2.notes.find(n=>!n.x); n.l+=1; dropSync(); await new Promise(q=>setTimeout(q,1500)); });
  const m2=await M(), keys=(await L()).map(k=>k.key.split('/').slice(2).join('/')+' '+k.size);
  const deleted=await p.evaluate(()=>shareDisable(true));
  console.log(JSON.stringify({...d0, keys, metaKeys:Object.keys(m2).sort().join(','), consent:m2.consent.age13, heard:m1.heard.notes.length, sameBeforeEdit:JSON.stringify(m1.heard)===JSON.stringify(m1.now), differsAfterEdit:JSON.stringify(m2.heard)!==JSON.stringify(m2.now), deleted, left:(await L()).length, dropNow:await p.evaluate(()=>drop)},null,1), errs); await b.close(); })();
