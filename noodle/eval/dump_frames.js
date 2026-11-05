// Export the app's per-frame readings (time, loudness dB, YIN confidence, pitch in MIDI) for each audio file,
// via the EXT_PITCH hook, so a note-start model can be trained on exactly what the app computes.
// usage: node dump_frames.js <listfile> <out.json>
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const [list,out]=process.argv.slice(2); const files=fs.readFileSync(list,'utf8').trim().split('\n');
  const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle.html'); await p.waitForTimeout(800); const res={};
  for(const f of files){ res[f]=await p.evaluate(async f=>{ const ab=await new OfflineAudioContext(1,1,44100).decodeAudioData(await (await fetch('/'+f)).arrayBuffer());
      let cap=null; window.EXT_PITCH=fr=>{ cap=fr.map(x=>[+x.t.toFixed(3),+x.db.toFixed(2),+x.conf.toFixed(3),+x.m.toFixed(3)]); };
      analyzeTake(mono(ab),ab.sampleRate,'lead',55,false); window.EXT_PITCH=null; return cap; },f); }
  fs.writeFileSync(out,JSON.stringify(res)); console.log('files',files.length,'errors',errs.slice(0,3)); await b.close(); })();
