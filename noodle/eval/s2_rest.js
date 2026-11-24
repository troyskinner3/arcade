// voice parts anywhere (record at bar 3, render, move, trim), trimming a melody part, More sheets (mic & timing, drum sounds)
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13'],permissions:['microphone'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{ localStorage.setItem('noodle.shareAsk','1'); }catch(e){}   /* the share-takes question (after the first Keep) was answered */ navigator.mediaDevices.getUserMedia=async()=>{ const cx=window.__ctx, dst=cx.createMediaStreamDestination(); window.__dst=dst; return dst.stream; }; });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  await p.evaluate(()=>{ ensureCtx(); window.__ctx=ctx; S.bars=4; const t=mkTrack('lead',{id:S.nextId++,off:0,len:4,rep:false,lenSet:true,notes:Array.from({length:16},(_,i)=>({s:i*4,l:4,p:60+i%5,v:.8,x:true}))}); S.tracks.push(t); save(); flushSave(); renderTracks(); return ctx.resume(); });
  const st=()=>p.evaluate(()=>S.bars+' | '+S.tracks.map(t=>`${t.inst}:${(t.off||0)/16}+${t.len}`).join(' '));
  // trim the melody part: first bar off, last bar off, add a bar
  out.trim=await p.evaluate(()=>{ const t=S.tracks[0], r=[]; r.push(s2TrimClip(t,'start'), t.notes.length, t.off/16, t.len); r.push(s2TrimClip(t,'end'), t.notes.length, t.len); r.push(s2TrimClip(t,'add'), t.len, S.bars); renderTracks(); return r.join(','); });
  // a voice track: record from bar 3 until stopped
  await p.tap('#s2Add'); await p.tap('#nxSheet [data-k="vox"]'); await p.waitForTimeout(300);
  const box=await p.$eval('#s2Marks',e=>{ const r=e.getBoundingClientRect(); return {x:r.left,y:r.top+10}; }); await p.mouse.click(box.x+44*2.3,box.y); await p.waitForTimeout(200);
  await p.tap('#s2RecB'); await p.waitForFunction(()=>!!recState,null,{timeout:10000});
  const w=await p.evaluate(()=>{ const r=recState, cx=window.__ctx, o=cx.createOscillator(), g=cx.createGain(); o.type='sawtooth'; o.frequency.value=220; g.gain.value=0; g.gain.setTargetAtTime(0.2,r.start,0.02); g.gain.setTargetAtTime(0,r.start+3.2,0.02); o.connect(g); g.connect(window.__dst); o.start(r.start); o.stop(r.start+3.5); return {wait:(r.start-cx.currentTime)+3.6, off:(S.tracks.find(t=>t.id===s2.recId)||{}).off, pre:r.preroll}; });
  out.voxRec=w; await p.waitForTimeout(w.wait*1000); await p.tap('#s2RecB'); await p.waitForFunction(()=>!$('s2Take').hidden,null,{timeout:25000}); await p.waitForTimeout(800); out.afterVox=await st(); await p.tap('#s2TkOk'); if(await p.evaluate(()=>playing)) await p.tap('#s2Play');
  out.voxAudio=await p.evaluate(async()=>{ await renderDirty(); const v=S.tracks.find(t=>t.inst==='vox'), L=loopLen(), bar=L/S.bars, d=v._buf.getChannelData(0), r=[]; for(let i=0;i<S.bars;i++){ let e=0; const a=Math.floor(i*bar*ctx.sampleRate), z=Math.floor((i+1)*bar*ctx.sampleRate); for(let k=a;k<z;k+=7) e+=d[k]*d[k]; r.push(e>0.5?1:0); } return r.join(''); });
  out.voxMove=await p.evaluate(()=>{ const v=S.tracks.find(t=>t.inst==='vox'); const a=s2MoveClip(v,1); return a+' '+v.off/16; }); out.voxTrim=await p.evaluate(()=>{ const v=S.tracks.find(t=>t.inst==='vox'), va=v.va, ok=s2TrimClip(v,'start'); return ok+' off '+v.off/16+' len '+v.len+' va+'+(v.va-va).toFixed(2); });
  await p.evaluate(()=>renderTracks()); await p.waitForTimeout(300); await p.screenshot({path:'results/rest1.png'});
  // More sheets
  await p.tap('#s2Back'); await p.waitForTimeout(400); await p.tap('#nxTabM'); await p.waitForTimeout(200); await p.tap('#nxTiming'); await p.waitForTimeout(200); await p.screenshot({path:'results/rest3.png'});
  await p.tap('#nxEc'); out.ec=await p.evaluate(()=>S.ec); await p.evaluate(()=>{ const e=$('nxSens'); e.value=70; e.dispatchEvent(new Event('change',{bubbles:true})); }); out.sens=await p.evaluate(()=>S.sens);
  await p.tap('#nxCal'); await p.waitForTimeout(700); out.calib=await p.evaluate(()=>({sheet:!$('recSheet').hidden, title:$('rsTitle').textContent, z:getComputedStyle($('recSheet')).zIndex, rec:!!recState})); await p.screenshot({path:'results/rest4.png'}); await p.evaluate(()=>closeRec()); await p.waitForTimeout(300);
  await p.tap('#nxDrums'); await p.waitForTimeout(200); out.drums=await p.$$eval('#nxSheet [data-teach]',x=>x.length); await p.screenshot({path:'results/rest5.png'}); await p.tap('#nxSheet [data-teach]'); await p.waitForTimeout(700); out.teach=await p.evaluate(()=>({sheet:!$('recSheet').hidden, title:$('rsTitle').textContent})); await p.evaluate(()=>closeRec());
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
