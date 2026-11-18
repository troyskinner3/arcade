const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); p.on('pageerror',e=>console.log('ERR',e.message)); await p.goto('http://localhost:8800/noodle-s2.html'); await p.waitForTimeout(900);
  for(const f of ['20261118T053716-untitled-bass-nothing-heard.wav','20261118T053727-untitled-bass-nothing-heard.wav','20261117-213811-untitled-bass.wav']){
    const r=await p.evaluate(async(f)=>{ ensureCtx(); S.bpm=94; const ab=await ctx.decodeAudioData(await (await fetch('/data/phone2/'+f)).arrayBuffer()); const x=mono(ab), sr=ab.sampleRate;
      let cap=null; const _w=window.EXT_PITCH; window.EXT_PITCH=(fr)=>{ cap=fr; }; const an=analyzeTake(x,sr,'bass',55,true); window.EXT_PITCH=_w;
      const dbs=cap.map(f=>f.db), top=percentile(dbs,0.99), floor0=percentile(dbs,0.15), floor=top-floor0<12?top-35:floor0, sN=0.55, gate=floor+Math.max(8,(top-floor)*(NT.gateA-NT.gateB*sN)), cth=NT.confA+NT.confB*sN;
      const conf=cap.map(f=>f.conf).sort((a,b)=>a-b);
      return {sr, notes:an.notes.length, onsets:an.onsets.length, frames:cap.length, top:+top.toFixed(1), floor0:+floor0.toFixed(1), gate:+gate.toFixed(1), cth:+cth.toFixed(3), loud:cap.filter(f=>f.db>gate).length, confOK:cap.filter(f=>f.conf<cth).length, confMed:+conf[conf.length>>1].toFixed(3), voiced:cap.filter(f=>f.db>gate&&f.conf<cth&&f.m>28&&f.m<96).length, mMed:+median(cap.filter(f=>f.db>gate).map(f=>f.m)).toFixed(1), NT:{lp:NT.lp,yin:NT.yinTh,gateA:NT.gateA,gateB:NT.gateB,confA:NT.confA,confB:NT.confB}}; },f);
    console.log(f.slice(0,32), JSON.stringify(r)); }
  await b.close(); })();
