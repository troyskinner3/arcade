// Owner, 28 Nov: what you play on the pads and what the part plays back in the timeline didn't sound the same (the live sound skipped the
// lane's volume, pan, reverb, effects and envelope, used its own brightness and loudness, and chords were always plain triads). The live
// note is now made like the rendered part: both are made in a silent offline context here and compared by loudness over time
// (20 ms steps), overall level and brightness (Note pads, Play
// pad, Chord pads with a 7th chord type and a strummed guitar, drums), with a lane that has its own volume, envelope and effects. A new
// part also keeps the lane's pan and effects. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{ const o={}; PRO.owned=true; await loadSampled('Acoustic guitar');
    const cmp=async(inst,kind,sound,set,play,note,extra={})=>{ await projNew(); S.bpm=120; S.bars=1; ensureCtx();
      const f=mkTrack(inst,Object.assign({id:S.nextId++,off:0,len:1,lenSet:true,rep:false,sound,vol:70},set)); if(f.notes) f.notes=[]; S.tracks.push(f);
      await tapOpen(kind,s2LaneId(f)); const T=tapIn, sr=ctx.sampleRate, N=Math.round(sr*1.2);
      // live, made offline: swap in a silent context for the pad's bus
      const keepC=ctx, keepCh=chain, oc=new OfflineAudioContext(2,N,sr); oc.resume=()=>Promise.resolve(); ctx=oc; chain={input:oc.destination, revIn:oc.createGain()}; T.bus=null;
      const seed=()=>{ let x=12345; Math.random=()=>((x=(x*1103515245+12345)&0x7fffffff)/0x7fffffff); };   /* drum noise: the same random numbers live and in the part */
      seed(); try{ play(T); } finally { ctx=keepC; chain=keepCh; } T.bus=null; const live=await oc.startRendering();
      // the part, rendered as playback renders it, then through the lane's volume and pan (without reverb on either side)
      const tr=mkTrack(inst,Object.assign({id:S.nextId++,off:0,len:1,lenSet:true,rep:false,sound,vol:70,oct:T.oct},set,extra,inst==='kit'?{hits:[note]}:{notes:[typeof note==='function'?note(T):note]})); tapClose();
      seed(); const buf=await renderStem(tr), g=Math.pow(tr.vol/100,1.6), pan=(tr.pan||0)/100, gl=1   /* the buffer is stereo: the pan passes it as is at centre */, L=live.getChannelData(0);
      // how it sounds: loudness in 20 ms steps over the first 0.4 s, and brightness (zero crossings), part aligned to the live start
      const R=buf.getChannelData(0), sh=Math.round(0.003*sr), F=Math.round(0.02*sr); let dd=0,nf=0,el=0,er=0,zl=0,zr=0;
      for(let k=0;k<20;k++){ let a2=0,b2=0; for(let i=k*F+sh;i<(k+1)*F+sh;i++){ const x=(R[i-sh]||0)*g*gl; a2+=L[i]*L[i]; b2+=x*x; if(i>sh&&Math.sign(L[i])!==Math.sign(L[i-1])) zl++; if(i>sh&&Math.sign(R[i-sh])!==Math.sign(R[i-sh-1])) zr++; } el+=a2; er+=b2;
        if(b2>1e-6){ dd+=Math.abs(10*Math.log10((a2+1e-12)/b2)); nf++; } }
      return {level:+(10*Math.log10(el/er)).toFixed(2), shape:+(dd/Math.max(1,nf)).toFixed(2), bright:+(zl/Math.max(1,zr)).toFixed(2)}; };
    const set={tone:30, oct:0, adsr:{a:0.05,d:0.3,s:0.6,r:0.3}, tfx:{drive:40}};
    o.notes=await cmp('lead','notes','Saw',set,T=>padVoice(T,[60],0.8,0.25,padTone(T)),{s:0,l:2,p:60-0,v:0.8,x:true});
    o.xy=await cmp('lead','xy','Glide lead',set,T=>{ padMod(T,'tn',0.7,true); leadNote(T,60,8,0.7); },{s:0,l:16,p:60,v:0.8,tn:0.7,x:true},{mods:{tn:[[0,0.7,1]]}});   /* the Play pad's Brightness: live through padMod, the part through its curve */
    o.chords=await cmp('keys','chords','Acoustic guitar',Object.assign({},set,{chordType:'seventh'}),T=>padVoice(T,padChord(T,T.pads[0].root),0.74,0.25,padTone(T)),T=>({s:0,l:2,p:T.pads[0].root,v:0.74,x:true}));
    o.drums=await cmp('kit','drums','808',{tone:30,vol:70},T=>tapSound({id:'k',v:0.9}),{s:0,d:'k',v:0.9});
    return o; });
  console.log(JSON.stringify(r));
  for(const [k,v] of Object.entries(r)) if(!(Math.abs(v.level)<1 && v.shape<1 && Math.abs(v.bright-1)<0.1)) errs.push(k+' differs: '+JSON.stringify(v));
  console.log(JSON.stringify({errs})); await b.close(); })();
