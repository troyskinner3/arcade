// FX (beta): five synthetic mouth gestures in one take -> riser, downlifter, sweep up, sweep down, impact; rendered audio; the part opens in the FX grid; region edits
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900); const out={};
  out.pick=await p.evaluate(()=>{ s2AddSheet(false); const b=[...document.querySelectorAll('#nxSheet [data-k]')].map(x=>x.textContent.trim()); return b[b.length-1]; });
  await p.tap('#nxSheet [data-k="fx"]'); await p.waitForTimeout(300); out.header=await p.$eval('.s2-nm span',e=>e.textContent);
  out.take=await p.evaluate(async()=>{ ensureCtx(); await ctx.resume(); const sr=ctx.sampleRate, bar=240/S.bpm, x=new Float32Array(Math.round(sr*bar*8)); let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/1073741823.5-1; };
    const glide=(t0,d,f0,f1)=>{ let ph=0; for(let i=0;i<d*sr;i++){ const u=i/(d*sr), f=f0*Math.pow(f1/f0,u); ph+=f/sr; const env=Math.min(1,u*20)*Math.min(1,(1-u)*20)*(0.4+0.6*u); x[Math.round(t0*sr)+i]+=0.28*env*(2*(ph%1)-1); } };
    const hiss=(t0,d,up)=>{ let y1=0,y2=0; for(let i=0;i<d*sr;i++){ const u=i/(d*sr), fc=(up?400*Math.pow(20,u):8000*Math.pow(1/20,u)), w=2*Math.PI*fc/sr, q=1.2, al=Math.sin(w)/(2*q), b0=al, a0=1+al, a1=-2*Math.cos(w), a2=1-al; const xn=rnd(); const y=(b0*xn - b0*(hiss.x2||0) - a1*y1 - a2*y2)/a0; hiss.x2=hiss.x1||0; hiss.x1=xn; y2=y1; y1=y; const env=Math.min(1,u*15)*Math.min(1,(1-u)*15); x[Math.round(t0*sr)+i]+=0.9*env*y; } };
    const burst=(t0,d)=>{ for(let i=0;i<d*sr;i++){ const u=i/(d*sr); x[Math.round(t0*sr)+i]+=0.5*rnd()*Math.exp(-u*5); } };
    glide(0.1,bar*0.95,140,430); glide(bar*1.5,bar*0.9,420,150); hiss(bar*3.05,bar*0.9,true); hiss(bar*4.5,bar*0.9,false); burst(bar*6,0.16);
    const tr=S.tracks.find(t=>t.inst==='fx'); tr.off=0; tr.len=8; tr.rep=false; tr.lenSet=true; S.bars=8; S.target=tr.id; await addTake(x,sr,'fx',{align:0,live:true}); S.target=null; if(playing) togglePlay();
    await renderDirty(); const d=tr._buf.getChannelData(0), barN=Math.round(bar*sr), en=[]; for(let i=0;i<8;i++){ let e=0; for(let k=i*barN;k<(i+1)*barN;k+=5) e+=d[k]*d[k]; en.push(e>0.3?1:0); }
    return {events:tr.fxs.map(e=>`${e.k}@${(e.s/16).toFixed(2)}+${(e.l/16).toFixed(2)}`), audioBars:en.join(''), toast:$('toast').textContent, hasContent:hasContent(tr)}; });
  await p.evaluate(()=>renderTracks()); await p.waitForTimeout(300); await p.screenshot({path:'results/fx1.png'});
  const lane=await p.$eval('.s2-ln canvas',e=>{ const r=e.getBoundingClientRect(); return {x:r.left,y:r.top+r.height/2}; }); await p.mouse.click(lane.x+40,lane.y); await p.waitForTimeout(250);
  out.bar=await p.$eval('#s2CbEdit',e=>e.textContent.trim()); await p.tap('#s2CbEdit'); await p.waitForTimeout(250); await p.screenshot({path:'results/fx2.png'});
  out.grid=await p.evaluate(()=>({editor:!$('s2Ed').hidden, rows:FX_ROWS.length, events:S.tracks.find(t=>t.inst==='fx').fxs.length, sub:$('s2EdS').textContent})); await p.tap('#s2EdBack'); await p.waitForTimeout(250);   /* editing in the grid: fxgrid_test.js */
  out.regionOps=await p.evaluate(()=>{ const t=S.tracks.find(t=>t.inst==='fx'); const a=s2ResizeClip(t,0,-2), n1=t.fxs.length, len=t.len; const c=s2DupClip(t); return {trimEnd:a, events:n1, len, copy:!!c&&c.fxs.length, bars:S.bars}; });
  out.exportOk=await p.evaluate(async()=>{ try{ const mix=await renderMix(1,true); return mix.duration>5; }catch(e){ return String(e); } });
  out.midiSkips=await p.evaluate(()=>{ try{ return midiBytes(S.tracks).length>0; }catch(e){ return String(e); } });
  await p.tap('#s2Undo'); await p.waitForTimeout(400);
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
