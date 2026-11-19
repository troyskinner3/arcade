// Video end card: free videos are 2.5 s longer and end on the Noodle card ("Free on the App Store"); Pro videos end with the music.
// Also checks the rating prompt asks the iPhone app at most once per 120 days, and never on the web. Prints {..., errs:[]}.
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000);
  const r=await p.evaluate(async()=>{ const out={}; ensureCtx(); const mix=ctx.createBuffer(2,ctx.sampleRate*4,ctx.sampleRate);
    PRO.owned=false; const f=withEndCard(mix); out.freeExtra=+(f.duration-mix.duration).toFixed(2);
    const {cv,draw,W,H}=videoPainter(f); draw(mix.duration+1.5); out.png=cv.toDataURL('image/png'); const px=cv.getContext('2d').getImageData(W/2,Math.round(H*0.42),1,1).data; out.cardPixel=[...px].slice(0,3);
    PRO.owned=true; out.proExtra=+(withEndCard(mix).duration-mix.duration).toFixed(2); PRO.owned=false;
    const sent=[]; window.webkit={messageHandlers:{noodleNative:{postMessage:m=>sent.push(m.type)}}}; localStorage.removeItem('noodle.rateAt');
    askRating(); askRating(); await new Promise(q=>setTimeout(q,1500)); out.rate=sent.filter(x=>x==='rate').length; delete window.webkit; return out; });
  fs.writeFileSync(__dirname+'/results/endcard.png',Buffer.from(r.png.split(',')[1],'base64')); delete r.png;
  if(r.freeExtra!==2.5||r.proExtra!==0) errs.push('length '+r.freeExtra+'/'+r.proExtra); if(r.rate!==1) errs.push('rate asked '+r.rate);
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
