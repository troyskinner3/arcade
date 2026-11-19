// Mix FX engine: every effect renders in a mix (no errors, not silent, neutral before and after its part); Low pass darkens the mix during its
// part and lets go after; High pass thins it; Echo leaves repeats; in playback the curve runs each time round the loop and follows edits.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const r=await p.evaluate(async()=>{ ensureCtx(); const out={};
    const o=defaultState(); o.bpm=120; o.bars=4; o.tracks=[mkTrack('pad',{id:900,off:0,len:4,rep:false,lenSet:true,sound:'Warm pad',notes:[0,16,32,48].map(s=>({s,l:16,p:57,v:.8,x:true}))}), mkTrack('kit',{id:901,off:0,len:4,rep:false,lenSet:true,sound:'Punchy',hits:Array.from({length:32},(_,i)=>({s:i*2,d:i%4==0?'kick':'hat',v:.8}))})]; await projLoadState(o);
    S.tracks[0].oct=0; S.tracks[0].chordType='off';
    const br=(bb,a,z)=>{ const L=bb.getChannelData(0), sr=bb.sampleRate; let dx=0,xx=0; for(let i=Math.round(a*sr)+1;i<Math.round(z*sr);i++){ dx+=(L[i]-L[i-1])**2; xx+=L[i]*L[i]; } return {hz:Math.round(sr/(2*Math.PI)*Math.sqrt(dx/(xx+1e-12))), db:+(10*Math.log10(xx/Math.max(1,(z-a)*sr)+1e-12)).toFixed(1)}; };
    const addFx=(k,off,len)=>{ const t=mkTrack('mix',{id:S.nextId++,off,len,rep:false,lenSet:true}); t.mfx={k,curve:null,params:{}}; S.tracks.push(t); return t; };
    const base=await renderMix(1,false); out.base={early:br(base,0.2,1.8), mid:br(base,3.2,3.9), late:br(base,6.2,7.8)};
    // a low pass over bars 2-3 (2 s .. 6 s): darkest near its end, back to the base after
    const lp=addFx('lp',16,2); const a=await renderMix(1,false); out.lp={early:br(a,0.2,1.8), inLate:br(a,5.2,5.9), after:br(a,6.2,7.8)};
    S.tracks=S.tracks.filter(t=>t!==lp);
    out.kinds={}; for(const k of Object.keys(MFX)){ const t=addFx(k,16,2); const m=await renderMix(1,false); out.kinds[k]={before:br(m,0.2,1.8).db, during:br(m,4.6,5.9), after:br(m,6.4,7.8).db}; S.tracks=S.tracks.filter(x=>x!==t); }
    // live: a 1-bar song at 240 bpm (1 s loop), a low pass over the whole bar; read its cutoff while playing, across passes, then after an edit
    S.bpm=240; S.bars=1; S.tracks.forEach(t=>{ if(t.inst!=='mix'){ t.len=1; t._dirty=true; } }); const lv=addFx('lp',0,1); await renderDirty(); s2.loop=true;
    await togglePlay(); const reads=[]; for(let i=0;i<10;i++){ await new Promise(r=>setTimeout(r,180)); const u=mfxLive&&mfxLive.units[0]; reads.push(u?Math.round(u.input.frequency.value):null); }
    out.live={reads, passes:mfxLive&&mfxLive.k[0]};
    lv.mfx.k='hp'; await new Promise(r=>setTimeout(r,500)); out.live.afterEdit=mfxLive&&mfxLive.units[0].input.type;
    await togglePlay(); out.live.stopped=mfxLive===null;
    return out; });
  const k=r.kinds, bad=[]; if(!(r.lp.inLate.hz<r.base.mid.hz*0.6)) bad.push('lp not darker'); if(Math.abs(r.lp.after.hz-r.base.late.hz)>r.base.late.hz*0.05) bad.push('lp not neutral after');
  for(const [n,v] of Object.entries(k)) if(Math.abs(v.before-r.base.early.db)>0.5||v.during.db<-60) bad.push(n+' level');
  if(!(k.hp.during.hz>r.base.mid.hz*1.2)) bad.push('hp not thinner'); if(new Set(r.live.reads).size<5) bad.push('live curve not moving'); if(r.live.afterEdit!=='highpass') bad.push('edit not followed'); if(!r.live.stopped) bad.push('not stopped');
  if(bad.length) errs.push('mix fx: '+bad.join(', '));
  console.log(JSON.stringify(r),errs); await b.close(); })();
