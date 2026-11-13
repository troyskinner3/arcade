// per take: the app's own loudness range (99th - 15th percentile of frame dB) and noise floor, for clean and noisy copies
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const subs=process.argv.slice(2); const b=await chromium.launch(); const p=await b.newPage(); await p.goto('http://localhost:8800/noodle-cur.html'); await p.waitForTimeout(900); const out={};
  for(const SUB of subs){ const D=__dirname+'/../data/'+SUB; const files=fs.readdirSync(D).filter(f=>/^2.*-lead\.wav$/.test(f)&&!/long-/.test(f)); out[SUB]={};
    for(const f of files){ const pr=f.replace(/^\d+-\d+-/,'').replace('-lead.wav','');
      out[SUB][pr]=await p.evaluate(async(u)=>{ const ab=await new OfflineAudioContext(1,1,44100).decodeAudioData(await (await fetch(u)).arrayBuffer()); const an=analyzeTake(mono(ab),ab.sampleRate,'lead',55,true);
        const db=an.notes.frames.map(f=>f.db).sort((a,b)=>a-b), q=x=>db[Math.floor((db.length-1)*x)]; return {top:+q(0.99).toFixed(1), floor:+q(0.15).toFixed(1), n:an.notes.length}; },'/data/'+SUB+'/'+f); } }
  fs.writeFileSync(__dirname+'/../results/range_probe.json',JSON.stringify(out)); await b.close(); })();
