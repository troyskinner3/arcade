// replay_fast.js with tap-along: taps at the Guide's notes (+-TAP_JITTER s, default 30 ms; TAP_LATE shifts them all), to measure what tapping can fix
const {chromium}=require('playwright'); const fs=require('fs'); const AL=JSON.parse(fs.readFileSync(__dirname+'/al_known.json','utf8')); const BACK=process.env.BACKING?JSON.parse(fs.readFileSync(__dirname+'/backing.json','utf8')):null;
(async()=>{ const [page,out]=process.argv.slice(2); const SUB=process.env.DATA||'user'; const D=__dirname+'/data/'+SUB;
  const metas=fs.readdirSync(D).filter(f=>/^2.*\.json$/.test(f)).sort().map(f=>({f,m:JSON.parse(fs.readFileSync(D+'/'+f))})).filter(x=>x.m.prompt&&x.m.heard&&x.m.inst==='lead'&&!/^(long-|beat|drums)/.test(x.m.prompt));
  const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/'+page); await p.waitForTimeout(900);
  await p.evaluate(()=>{ drop={url:'http://localhost:9/',k:'x'}; localStorage.setItem('noodle.drop',JSON.stringify(drop)); });
  const res={};
  for(const {f,m} of metas){ const wav=f.replace('.json','.wav');
    const r=await p.evaluate(async([wav,prompt,want,back,bpm,SUB])=>{ await guidedSetup(prompt); if(bpm){ S.bpm=bpm; S.tracks.forEach(t=>t._dirty=true); }   /* the tempo the take was recorded at */
      if(back){ const k=mkTrack('keys',{id:S.nextId++, name:'Backing', notes:back.map(n=>({...n,v:0.7,x:true}))}); S.tracks.splice(1,0,k); keyCache=null; } const ab=await ctx.decodeAudioData(await (await fetch('/data/'+SUB+'/'+wav)).arrayBuffer()); const x=mono(ab);
      // find the alignment that reproduces what the live take heard (start steps), then keep the take
      const best={al:want};
      const tr=(S.tracks.find(t=>t.id===S.activeId&&!t.guide)||S.tracks.find(t=>!t.guide)); tr.notes=[]; S.target=tr.id; const sd=stepDur(), J=window.TAP_JITTER||0.03; let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647-0.5; }; const g=S.tracks.find(t=>t.guide); const taps=window.NO_TAPS?null:(g?g.notes:[]).filter((n,i)=>!window.TAP_HALF||i%2===0).map(n=>best.al+n.s*sd+2*J*rnd()+(window.TAP_LATE||0)); await addTake(x,ab.sampleRate,'lead',{align:best.al,notch:true,live:true,taps}); S.target=null;
      return {al:best.al, notes:(S.tracks.find(t=>t.id===S.activeId&&!t.guide)||S.tracks.find(t=>!t.guide)).notes.map(n=>({s:n.s,l:n.l,p:pitchOf(n),raw:+n.p,x:!!n.x,...(n.hs?{hs:n.hs}:{})})), squeeze:typeof squeezeOn==='function'?squeezeOn():null}; },[wav,m.prompt,AL[m.prompt],BACK?BACK[m.prompt]:null,m.bpm,SUB]);
    res[m.prompt]={...m, heard:{notes:r.notes}, al:r.al, squeeze:r.squeeze}; process.stdout.write(r.squeeze?'S':'.'); }
  fs.mkdirSync(out,{recursive:true}); for(const [k,v] of Object.entries(res)) fs.writeFileSync(`${out}/2-${k}.json`,JSON.stringify(v));
  console.log('\nsq',JSON.stringify(await p.evaluate(()=>S.sq)),'errors',errs.slice(0,3)); await b.close(); })();
