// Like run_detector.js, but the app's pitch per frame comes from FCPE (precomputed in /fcpe/<name>.json); loudness stays the app's.
// MODE=replace: FCPE pitch and voicing; MODE=pitch: FCPE pitch only where both agree it is voiced (keeps the app's voicing)
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const [list,out,page='noodle-new.html']=process.argv.slice(2); const files=fs.readFileSync(list,'utf8').trim().split('\n'); const MODE=process.env.MODE||'replace';
  const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/'+page); await p.waitForTimeout(800); const res={};
  for(const f of files){ const name=f.split('/').pop().replace(/\.[^.]+$/,'');
    res[f]=await p.evaluate(async([f,name,MODE])=>{ const rr=await fetch('/fcpe/'+name+'.json'); if(!rr.ok) return {ms:0,dur:0,notes:[]}; const fc=await rr.json();
      window.EXT_PITCH=frames=>{ for(const fr of frames){ const k=Math.max(0,Math.min(fc.length-1,Math.round((fr.t-0.005)/0.01))), [_,m,c]=fc[k];
          if(MODE==='replace'){ if(m==null){ fr.conf=0.9; } else { fr.m=m; fr.conf=0.05; } }
          else if(m!=null && fr.conf<0.3){ fr.m=m; } } };
      const ab=await new OfflineAudioContext(1,1,44100).decodeAudioData(await (await fetch('/'+f)).arrayBuffer());
      const an=analyzeTake(mono(ab),ab.sampleRate,'lead',55,false); window.EXT_PITCH=null;
      return {ms:0,dur:+(ab.length/ab.sampleRate).toFixed(2),notes:(an.notes||[]).map(n=>[+n.t0.toFixed(4),+n.t1.toFixed(4),+n.p.toFixed(3)])}; },[f,name,MODE]); }
  fs.writeFileSync(out,JSON.stringify(res)); console.log('files',files.length,'errors',errs.slice(0,3)); await b.close(); })();
