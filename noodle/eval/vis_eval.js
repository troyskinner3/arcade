// Vocal Imitation Set (CC BY 4.0): untaught kit sorting on people imitating real drums. One imitation per clip; the clip's
// loudest hit should be sorted as its drum. Bass drum -> kick, snare / rimshot / drum roll -> snare, hi-hat -> hat, clapping -> clap.
// node vis_eval.js [out.json]   (data/vis/*.wav: VocalImitationSet vocal_imitations, filenames kept)
const {chromium}=require('playwright'); const fs=require('fs'); const D=__dirname+'/data/vis';
const lab=f=>/Bass_drum/.test(f)?'kick':/Snare_drum|Rimshot/.test(f)?'snare':/Hi-hat/.test(f)?'hat':/Clapping/.test(f)?'clap':null;
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html'); await p.waitForTimeout(1000);
  const files=fs.readdirSync(D).filter(f=>f.endsWith('.wav')&&lab(f));
  const out=await p.evaluate(async files=>{ const r=[]; S.kit=defaultKit(); scaleCache=null;
    for(const f of files){ try{ const ab=await new OfflineAudioContext(1,1,44100).decodeAudioData(await (await fetch('/data/vis/'+f)).arrayBuffer()); const x=mono(ab);
      const an=analyzeTake(x,ab.sampleRate,'kit',55,false); const o=an.onsets.slice().sort((a,b)=>b.db-a.db)[0];
      r.push({f,cls:o?o.cls:null,n:an.onsets.length,fv:o?Array.from(o.fv||[]):null}); }catch(e){ r.push({f,err:String(e)}); } }
    return r; },files);
  const conf={}; let ok=0,n=0; for(const r of out){ const t=lab(r.f); conf[t]=conf[t]||{}; conf[t][r.cls]=(conf[t][r.cls]||0)+1; n++; ok+=r.cls===t; }
  if(process.argv[2]) fs.writeFileSync(process.argv[2],JSON.stringify(out));
  console.log(JSON.stringify({n,acc:+(ok/n).toFixed(3),conf,errs:errs.slice(0,3)})); await b.close(); })();
