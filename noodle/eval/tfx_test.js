// Effects on one track (Pro): Echo / Chorus / Drive sliders in a track's sheet (a Pro button for free users); the rendered part changes
// (echo adds sound after the notes, drive adds level and brightness), 0 is identical to no effect, a Lo-fi kit keeps its effects. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000);
  const r=await p.evaluate(async()=>{ const out={}; S.bars=2; S.bpm=120; const t=mkTrack('lead',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,sound:'Saw',notes:[{s:0,l:2,p:60,v:.8},{s:8,l:2,p:64,v:.8}]}); S.tracks.push(t); renderTracks();
    PRO.owned=false; s2TrackSheet(s2Lane(s2LaneId(t))); out.freeBtn=!!document.querySelector('.nx-grp .pro-b'); out.freeSliders=!document.querySelector('#s2Tfx_echo');   /* free users try them: sliders with a badge */ nxClose();
    PRO.owned=true; s2TrackSheet(s2Lane(s2LaneId(t))); out.proSliders=['echo','chorus','drive'].every(k=>!!document.querySelector('#s2Tfx_'+k));
    const el=document.querySelector('#s2Tfx_echo'); el.value=70; el.dispatchEvent(new Event('change',{bubbles:true})); out.set=JSON.stringify(t.tfx); nxClose();
    const seg=async(a,b)=>{ t._dirty=true; await renderDirty(); const d=t._buf.getChannelData(0), sr=t._buf.sampleRate; let q=0; for(let i=Math.floor(a*sr);i<Math.floor(b*sr);i++) q+=d[i]*d[i]; return 10*Math.log10(q/((b-a)*sr)+1e-12); };
    const sd=stepDur(); out.echoGap=+(await seg(12*sd,16*sd)).toFixed(1);   /* after the 2nd note: only an echo can sound here */
    t.tfx={echo:0}; out.offGap=+(await seg(12*sd,16*sd)).toFixed(1); delete t.tfx; out.noneGap=+(await seg(12*sd,16*sd)).toFixed(1);
    const base=await seg(0,2*sd); t.tfx={drive:80}; out.driveUp=+((await seg(0,2*sd))-base).toFixed(1); delete t.tfx;
    const k=mkTrack('kit',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true,sound:'Lo-fi',hits:[{s:0,d:'kick',v:1}]}); S.tracks.push(k); const ks=async()=>{ k._dirty=true; await renderDirty(); const d=k._buf.getChannelData(0), sr=k._buf.sampleRate; let q=0; for(let i=Math.floor(6*sd*sr);i<Math.floor(10*sd*sr);i++) q+=d[i]*d[i]; return 10*Math.log10(q/(4*sd*sr)+1e-12); };
    const k0=await ks(); k.tfx={echo:80}; out.lofiEcho=+((await ks())-k0).toFixed(1); return out; });
  if(!r.freeBtn||r.freeSliders||!r.proSliders) errs.push('sheet: '+JSON.stringify(r));
  if(r.set!=='{"echo":70}') errs.push('set '+r.set); if(!(r.echoGap>r.noneGap+20)) errs.push('echo: '+r.echoGap+' vs '+r.noneGap); if(r.offGap!==r.noneGap) errs.push('off differs');
  if(!(r.driveUp>0.3&&r.driveUp<4)) errs.push('drive '+r.driveUp); if(!(r.lofiEcho>6)) errs.push('lofi echo '+r.lofiEcho);
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
