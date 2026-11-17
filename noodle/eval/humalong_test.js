// the hum-along screen: piano roll with a moving playhead, Listen again as often as wanted, the tune under the take when asked for, and off otherwise
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13'],permissions:['microphone'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{ localStorage.setItem('noodle.onboard','1'); }catch(e){} navigator.mediaDevices.getUserMedia=async()=>{ const cx=window.__ctx, dst=cx.createMediaStreamDestination(); window.__dst=dst; return dst.stream; }; });
  await p.goto('http://localhost:8800/noodle-s2.html'); await p.waitForTimeout(900); const out={};
  await p.evaluate(async()=>{ ensureCtx(); window.__ctx=ctx; await ctx.resume(); nxVoiceCheck(); }); await p.waitForTimeout(300); await p.tap('#vcGo');
  await p.waitForSelector('#vcRoll'); await p.waitForTimeout(2500);
  const ink=()=>p.evaluate(()=>{ const cv=$('vcRoll'), c=cv.getContext('2d'), d=c.getImageData(0,0,cv.width,cv.height).data; let lit=0, col=-1; const W=cv.width, H=cv.height, y=2; /* the playhead is the only thing that is ink-coloured top to bottom */
    for(let x=0;x<W;x++){ let all=true; for(const yy of [2,Math.floor(H/2),H-3]){ const o=(yy*W+x)*4; if(!(d[o]>200&&d[o+1]>200&&d[o+2]>200)) all=false; } if(all&&x>60){ col=x; break; } } for(let i=0;i<d.length;i+=4) if(d[i]>200&&d[i+1]>150&&d[i+2]<140) lit++; return {playheadX:col, notePixels:lit, w:W}; });
  const a=await ink(); await p.waitForTimeout(1500); const a2=await ink(); out.listen={title:await p.$eval('#nxObIn .sub',e=>e.textContent), heading:await p.$eval('#vcH',e=>e.textContent), notesDrawn:a.notePixels>500, playheadMoves:a2.playheadX>a.playheadX&&a.playheadX>0, playing:await p.evaluate(()=>playing)};
  await p.screenshot({path:'results/ha1.png'});
  await p.waitForSelector('#vcAgain',{timeout:20000}); out.afterListen={heading:await p.$eval('#vcH',e=>e.textContent), buttons:await p.$$eval('#nxObActs button',x=>x.map(e=>e.textContent)), playing:await p.evaluate(()=>playing), recording:await p.evaluate(()=>!!recState)}; await p.screenshot({path:'results/ha2.png'});
  await p.tap('#vcAgain'); await p.waitForTimeout(800); out.again={playing:await p.evaluate(()=>playing), heading:await p.$eval('#vcH',e=>e.textContent)}; await p.waitForSelector('#vcAgain',{timeout:20000}); await p.tap('#vcAgain'); await p.waitForTimeout(600); out.thirdListen=await p.evaluate(()=>playing);
  out.alongDefault=await p.$eval('#vcAlong',e=>e.checked);
  // record without the tune underneath
  await p.tap('#vcRecNow'); await p.waitForFunction(()=>!!recState,null,{timeout:20000}); await p.waitForFunction(()=>recState&&ctx.currentTime>recState.start+0.5,null,{timeout:20000}); out.recPlain={guideSounding:await p.evaluate(()=>!!S.tracks.find(t=>t.guide)._src), playhead:(await ink()).playheadX>0}; await p.screenshot({path:'results/ha3.png'});
  await p.waitForFunction(()=>!recState,null,{timeout:30000}); await p.waitForSelector('#vcRe',{timeout:20000}); await p.tap('#vcRe');   /* nothing was hummed: it asks once more */
  // second try: with the tune underneath
  await p.waitForSelector('#vcRecNow',{timeout:20000}); await p.evaluate(()=>{ $('vcAlong').click(); }); await p.tap('#vcRecNow'); await p.waitForFunction(()=>recState&&ctx.currentTime>recState.start+0.5,null,{timeout:20000});
  out.recAlong={guideSounding:await p.evaluate(()=>!!S.tracks.find(t=>t.guide)._src), remembered:await p.evaluate(()=>localStorage.getItem('noodle.along')), boxLocked:await p.$eval('#vcAlong',e=>e.disabled)};
  await p.evaluate(()=>{ document.getElementById('vcStop').click(); }); await p.waitForFunction(()=>$('nxOb').hidden,null,{timeout:20000}); out.stopped=await p.evaluate(()=>({rec:!!recState, guideAlong}));
  // a drum tune's roll, and light mode
  await p.evaluate(()=>{ $('nxOb').hidden=false; $('nxObIn').innerHTML='<canvas class="nx-roll" id="vcRoll"></canvas>'; nxRoll($('vcRoll'),'beat')(0.3); }); await p.waitForTimeout(100); out.kitRoll=(await ink()).notePixels>300; await p.screenshot({path:'results/ha4.png'});
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
