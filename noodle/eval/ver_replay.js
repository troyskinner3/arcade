// replay guided takes in a page version and collect every "Other versions" reading of each take
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const [page,out]=process.argv.slice(2); const D=__dirname+'/../data/user';
  const metas=fs.readdirSync(D).filter(f=>/^2.*\.json$/.test(f)).sort().map(f=>({f,m:JSON.parse(fs.readFileSync(D+'/'+f))})).filter(x=>x.m.prompt&&x.m.heard&&x.m.inst==='lead'&&!/^(long-|beat|drums)/.test(x.m.prompt));
  const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/'+page); await p.waitForTimeout(900);
  await p.evaluate(()=>{ drop={url:'http://localhost:9/',k:'x'}; localStorage.setItem('noodle.drop',JSON.stringify(drop)); });
  const res={};
  for(const {f,m} of metas){ const wav=f.replace('.json','.wav');
    const r=await p.evaluate(async([wav,prompt,want,bpm])=>{ await guidedSetup(prompt); if(bpm){ S.bpm=bpm; syncTransport(); } const ab=await ctx.decodeAudioData(await (await fetch('/user/'+wav)).arrayBuffer()); const x=mono(ab);
      let best=null;
      for(let al=0; al<=0.4; al+=0.02){ const tr=activePart(); tr.notes=[]; S.target=tr.id; await addTake0(x,ab.sampleRate,'lead',{align:al,notch:true,live:true}); S.target=null;
        const ns=activePart().notes.filter(n=>!n.x); const sc=ns.filter(n=>want.includes(n.s)).length-Math.abs(ns.length-want.length)*0.5; if(!best||sc>best.sc) best={sc,al}; }
      const tr=activePart(); tr.notes=[]; S.target=tr.id; await addTake(x,ab.sampleRate,'lead',{align:best.al,notch:true,live:true}); S.target=null;
      const rec=tr.notes.filter(n=>!n.x).sort((a,b)=>a.s-b.s); const V=takeVersions(tr);
      return V.map(v=>rec.map((n,i)=>({s:n.s,l:n.l,raw:+n.p,x:false,p:v.q?v.q[i]:pitchOf(n)}))); },[wav,m.prompt,m.heard.notes.map(n=>n.s),m.bpm]);
    res[m.prompt]={guide:m.guide, versions:r}; process.stdout.write('.'); }
  fs.writeFileSync(out,JSON.stringify(res)); console.log('\nerrors',errs.slice(0,3)); await b.close(); })();
