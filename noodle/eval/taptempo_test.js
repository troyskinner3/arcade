// Tap tempo: tapping the beat in the Tempo sheet sets the BPM from the taps (median gap, so one late tap doesn't throw it), within 60-180;
// a pause of 2 s starts over.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const r=await p.evaluate(async()=>{ const out={}, w=ms=>new Promise(r=>setTimeout(r,ms)); const o=defaultState(); o.bpm=94; o.tracks=[]; await projLoadState(o); s2Sheets('tempo');
    const tap=async(ms,n)=>{ for(let i=0;i<n;i++){ $('s2Tap').click(); await w(ms); } };
    await tap(500,6); out.at120=S.bpm; out.label=$('s2Tap').textContent; out.slider=+$('s2T').value;
    await w(2200); await tap(400,3); $('s2Tap').click(); await w(900); $('s2Tap').click(); await tap(400,2); out.at150=S.bpm;   /* one late tap among 400 ms ones */
    await w(2200); await tap(250,6); out.fast=S.bpm;
    return out; });
  const ok=Math.abs(r.at120-120)<=2&&/120|119|121/.test(r.label)&&r.slider===r.at120&&Math.abs(r.at150-150)<=3&&r.fast===180; if(!ok) errs.push('tap tempo failed');
  console.log(JSON.stringify(r),errs); await b.close(); })();
