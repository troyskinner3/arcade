// The owner's phone drum takes with the click leak removed: the click's place and loudness are taken from the two silent takes of the same session (62 ms after the beat, about -45 dB), standing in for the count-in measurement the app makes
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const D=__dirname+'/data/phone'; const b=await chromium.launch(); const p=await b.newPage(); p.on('pageerror',e=>console.log('ERR',e.message)); await p.goto('http://localhost:8800/noodle-s2.html'); await p.waitForTimeout(900);
  for(const f of fs.readdirSync(D).filter(f=>/kit\.wav$/.test(f))){ const m=JSON.parse(fs.readFileSync(D+'/'+f.replace('.wav','.json')));
    const r=await p.evaluate(async([f,bpm])=>{ ensureCtx(); S.bpm=bpm; const ab=await ctx.decodeAudioData(await (await fetch('/data/phone/'+f)).arrayBuffer()); const x=mono(ab), sr=ab.sampleRate; const an=analyzeTake(x,sr,'kit',55,true); const beat=60/bpm, pre=0.08;
      const A=removeClickBleed(an.onsets,pre,x.length/sr,null), B=removeClickBleed(an.onsets,pre,x.length/sr,{ph:0.062,db:-45});
      return {n:an.onsets.length, comb:A.removed, sig:B.removed, gone:an.onsets.filter(o=>!B.ons.includes(o)).map(o=>`${((o.t-pre)/beat).toFixed(2)}:${o.cls}:${o.db.toFixed(0)}`), left:B.ons.map(o=>`${((o.t-pre)/beat).toFixed(2)}:${o.cls}:${o.db.toFixed(0)}`)}; },[f,m.bpm]);
    console.log('\n'+f.slice(9,15),'bpm',m.bpm,'onsets',r.n,'| removed by beat pattern alone:',r.comb,'| removed with the count-in measurement:',r.sig,r.gone.join(' ')); console.log('  left:',r.left.join('  ')); }
  await b.close(); })();
