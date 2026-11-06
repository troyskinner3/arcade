// Replay the owner's guided recordings through a version of Noodle, in recording order, as guided songs. Prints heard notes per prompt.
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const [page,out]=process.argv.slice(2); const D=__dirname+'/../data/user';
  const metas=fs.readdirSync(D).filter(f=>/^2.*\.json$/.test(f)).sort().map(f=>({f,m:JSON.parse(fs.readFileSync(D+'/'+f))})).filter(x=>x.m.prompt&&x.m.heard);
  const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/'+page); await p.waitForTimeout(900);
  await p.evaluate(()=>{ drop={url:'http://localhost:9/',k:'x'}; localStorage.setItem('noodle.drop',JSON.stringify(drop)); });
  const res={};
  for(const {f,m} of metas){ const wav=f.replace('.json','.wav');
    const r=await p.evaluate(async([wav,prompt,want])=>{ await guidedSetup(prompt); const ab=await ctx.decodeAudioData(await (await fetch('/user/'+wav)).arrayBuffer()); const x=mono(ab);
      // find the alignment that reproduces what the live take heard (start steps), then keep the take
      let best=null;
      for(let al=0; al<=0.4; al+=0.02){ const tr=activePart(); tr.notes=[]; S.target=tr.id; await addTake0(x,ab.sampleRate,'lead',{align:al,notch:true,live:true}); S.target=null;
        const ns=activePart().notes.filter(n=>!n.x); const sc=ns.filter(n=>want.includes(n.s)).length-Math.abs(ns.length-want.length)*0.5; if(!best||sc>best.sc) best={sc,al}; }
      const tr=activePart(); tr.notes=[]; S.target=tr.id; await addTake(x,ab.sampleRate,'lead',{align:best.al,notch:true,live:true}); S.target=null;
      return {al:best.al, notes:activePart().notes.map(n=>({s:n.s,l:n.l,p:pitchOf(n),raw:+n.p,x:!!n.x})), squeeze:typeof squeezeOn==='function'?squeezeOn():null}; },[wav,m.prompt,m.heard.notes.map(n=>n.s)]);
    res[m.prompt]={...m, heard:{notes:r.notes}, al:r.al, squeeze:r.squeeze}; process.stdout.write(r.squeeze?'S':'.'); }
  fs.mkdirSync(out,{recursive:true}); for(const [k,v] of Object.entries(res)) fs.writeFileSync(`${out}/2-${k}.json`,JSON.stringify(v));
  console.log('\nsq',JSON.stringify(await p.evaluate(()=>S.sq)),'errors',errs.slice(0,3)); await b.close(); })();
