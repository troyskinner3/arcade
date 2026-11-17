// The owner's phone drum takes (Nov 16): every onset with its time against the beat, loudness and class; and how many sit on a machine-exact beat comb (metronome leaking into the mic)
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const D=__dirname+'/../data/phone'; const b=await chromium.launch(); const p=await b.newPage(); p.on('pageerror',e=>console.log('ERR',e.message)); await p.goto('http://localhost:8800/noodle-s2.html'); await p.waitForTimeout(900);
  for(const f of fs.readdirSync(D).filter(f=>/kit\.wav$/.test(f))){ const m=JSON.parse(fs.readFileSync(D+'/'+f.replace('.wav','.json')));
    const r=await p.evaluate(async([f,bpm])=>{ ensureCtx(); S.bpm=bpm; const ab=await ctx.decodeAudioData(await (await fetch('/data/phone/'+f)).arrayBuffer()); const x=mono(ab), sr=ab.sampleRate; const an=analyzeTake(x,sr,'kit',55,true); const beat=60/bpm, pre=0.08;
      let best=[], bph=0; for(const o of an.onsets){ const ph=(((o.t-pre)%beat)+beat)%beat; const mm=an.onsets.filter(q=>{ const d=(((q.t-pre-ph)%beat)+beat*1.5)%beat-beat/2; return Math.abs(d)<0.004; }); if(mm.length>best.length){ best=mm; bph=ph; } }
      return {dur:+(x.length/sr).toFixed(2), sr, beats:+(x.length/sr/beat).toFixed(1), comb:best.length, phaseMs:Math.round(bph*1000), ons:an.onsets.map(o=>({t:+o.t.toFixed(3), beat:+((o.t-pre)/beat).toFixed(2), db:+o.db.toFixed(0), d:o.d||o.cls||o.k, comb:best.includes(o)?1:0, rise:+o.rise.toFixed(0)}))}; },[f,m.bpm]);
    console.log('\n'+f,'bpm',m.bpm,'dur',r.dur,'beats',r.beats,'onsets',r.ons.length,'on a beat comb:',r.comb,'phase',r.phaseMs+'ms'); console.log(r.ons.map(o=>`${o.beat}${o.comb?'*':''}:${o.d}:${o.db}`).join('  ')); }
  await b.close(); })();
