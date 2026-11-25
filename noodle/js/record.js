"use strict";
/* ============================== mic + recording ============================== */
let lastNoise=null, mic=null, capturing=false, recState=null, guessFix=null, teachQueue=null, teachGot={};
function micAllowedByPage(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) return false;
  try{ const pp=document.permissionsPolicy||document.featurePolicy; if(pp&&pp.allowsFeature) return pp.allowsFeature('microphone'); }catch(e){}
  return true;
}
const WORKLET=`class Cap extends AudioWorkletProcessor{constructor(){super();this.buf=new Float32Array(2048);this.n=0;this.t=0;}
process(inputs){const ch=inputs[0]&&inputs[0][0];if(ch){if(this.n===0)this.t=currentTime;this.buf.set(ch,this.n);this.n+=ch.length;if(this.n>=2048){this.port.postMessage({t:this.t,d:this.buf.slice(0,this.n)});this.n=0;}}return true;}}
registerProcessor('mm-cap',Cap);`;
async function ensureMic(ec=S.ec){
  if(mic && mic.ec===ec) return true; if(mic) dropMic();
  pauseSilentSwitch();
  try{ if(navigator.audioSession) navigator.audioSession.type='play-and-record'; }catch(e){}
  let stream;
  try{ stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:ec,noiseSuppression:false,autoGainControl:false,channelCount:1}}); }
  catch(e){ micBlocked(); micSheet(S.target, e&&e.name); return false; }
  const src=ctx.createMediaStreamSource(stream), an=ctx.createAnalyser(); an.fftSize=1024; src.connect(an);
  const sink=ctx.createGain(); sink.gain.value=0; sink.connect(ctx.destination);
  const onChunk=(t,d)=>{ if(capturing&&recState) recState.chunks.push({t,d}); };
  try{
    const url=URL.createObjectURL(new Blob([WORKLET],{type:'application/javascript'}));
    await ctx.audioWorklet.addModule(url);
    const node=new AudioWorkletNode(ctx,'mm-cap'); node.port.onmessage=e=>onChunk(e.data.t,e.data.d); src.connect(node); node.connect(sink);
    mic={stream,src,an,node,ec};
  }catch(e){
    const sp=ctx.createScriptProcessor(2048,1,1); sp.onaudioprocess=ev=>onChunk(ev.playbackTime-2048/ctx.sampleRate, new Float32Array(ev.inputBuffer.getChannelData(0)));
    src.connect(sp); sp.connect(sink); mic={stream,src,an,node:sp,ec};
  }
  return true;
}
/* The mic is only held while a take is recording: it is released as soon as the take ends, is cancelled, or the page is hidden. */
function dropMic(){
  if(mic){ mic.stream.getTracks().forEach(t=>t.stop()); try{mic.src.disconnect(); mic.node.disconnect();}catch(e){} mic=null; }
  try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(e){}
  playThroughSilentSwitch();
}
function onHide(){
  pauseSilentSwitch();
  if(recState){ capturing=false; recState=null; setRecUI(false); teachQueue=null; if(!$('recSheet').hidden){ $('recSheet').hidden=true; document.body.style.overflow=''; } if(rs.mode){ const r=rs.resume; rs.mode=null; S.target=null; if(r) restoreSnap(r.snap).then(()=>{ hist.cur=r.snap; takeBar=r.bar; renderTracks(); }); else renderTracks(); } }
  if(ctx){ stopAll(); if(origSrc){ try{origSrc.stop();}catch(e){} origSrc=null; } playing=false; try{ ctx.suspend(); }catch(e){} }
  dropMic();
}
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ onHide(); dropSync(); projSaveCurrent().catch(()=>{}); } });
window.addEventListener('pagehide',onHide);
function micBlocked(){ micOff=true; $('recBtn').hidden=true; }
/* the microphone was refused (or there is none): say how to turn it on (in the iPhone app, Settings opens at Noodle's page), or import a file */
function micSheet(id, why){ const app=!!(window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.noodleNative), denied=why!=='NotFoundError';
  nxSheet(`<h2>Noodle can’t hear you</h2><p style="color:var(--muted);font-size:15px;margin:-4px 0 14px">${!denied?'Noodle couldn’t find a microphone on this device.':app?'Turn on Microphone for Noodle in Settings, then come back and record.':'Allow the microphone for this page in your browser’s settings, then reload the page.'}${S.tracks.some(x=>x.id===id)?' You can also import a recording instead.':''}</p>
    ${denied&&app?'<button class="nx-primary" id="micSet">Open Settings</button>':''}${S.tracks.some(x=>x.id===id)?'<button class="nx-ghost" id="micImp" style="margin-top:10px">Import a recording</button>':''}`);
  if($('micSet')) $('micSet').onclick=()=>{ native({type:'settings'}); nxClose(); };
  if($('micImp')) $('micImp').onclick=()=>{ nxClose(); importInto(id); }; }   /* no live mic here (blocked by the page or the person): recording asks for a file instead */
// Safari/iOS don't report output delay; real iPhone takes measure about 0.1 s. autoAdj is learned from your own takes.
const autoLat=()=>(ctx?(ctx.outputLatency?ctx.outputLatency+(ctx.baseLatency||0)+0.012:(ctx.baseLatency||0)+0.09):0.09)+(S.autoAdj||0);
const latency=()=>S.latAuto?autoLat():S.latMs/1000;
async function startRecord(calib=false, teach=null){ if(!calib&&!teach&&feelBeat()) native({type:'metroWarm'});   /* start the phone's vibration engine now, before the count-in */
  ensureCtx();
  if(recState){ cancelRecord(); return; }
  if(takeReading){ toast('Still reading your last take…'); return; }
  if(!await ensureMic(S.ec || (!calib && !teach && S.inst==='vox'))) return;
  await renderDirty();
  if(playing){ stopAll(); playing=false; }
  const bar=240/S.bpm, tgp=(!calib&&!teach)?S.tracks.find(t=>t.id===S.target):null, L=teach?Math.min(loopLen(),2*bar):tgp?pSteps(tgp)*stepDur():loopLen(), when=ctx.currentTime+0.25;
  const along = !calib && !teach && (S.playAlong || S.inst==='vox');
  // metronome loop starts one bar early = count-in; parts start on bar 1
  stopAll(when);
  const P=(tgp&&tgp.off?tgp.off:0)*stepDur();   /* where in the song this take starts */
  t0=when+bar-P;
  // vocal takes pre-roll: the song's last bar plays under the count-in, so you hear the groove coming in, echo cancellation adapts
  // before you sing, and the count-in gives a clean stretch to measure this take's real delay
  const preroll = along && !calib && !teach && S.inst==='vox', SL=loopLen(), poff=(((tgp&&tgp.off?tgp.off:0)*stepDur()-bar)%SL+SL)%SL;   /* the bar before where this take starts */
  if(along) S.tracks.forEach(tr=>{ if(tr._buf && !tr.guide){ ensureNodes(tr); tr._src=preroll?startSrc(tr._buf,tr._g,when,poff):startSrc(tr._buf,tr._g,when+bar,P); } });
  if(along && !calib && !teach){ if(preroll) mfxStart(when,poff); else mfxStart(when+bar,P); if(chain) chain.input.gain.setTargetAtTime(trimBase()*mixTrim*REC_ALONG, ctx.currentTime, 0.05); }   /* the song plays a little quieter while you record: less of it bleeds into the mic without headphones (owner) */   /* Mix effects play along too, so a take is sung against what the song will sound like */
  if(guideAlong && !calib && !teach) S.tracks.forEach(tr=>{ if(tr._buf && tr.guide){ ensureNodes(tr); tr._src=startSrc(tr._buf,tr._g,when+bar,P); } });   /* hum-along screens: the tune under your take */
  if(!metroGain){ metroGain=ctx.createGain(); metroGain.connect(ctx.destination); }
  metroGain.gain.value=0.75; metroSrc=startSrc(metroBuf,metroGain,when,0); gateOpen(when);
  if(!calib && !teach && feelBeat()){   /* felt metronome: the count-in clicks and buzzes, then only the buzz (no click in the take) */
    metroGain.gain.setValueAtTime(0.75,ctx.currentTime); metroGain.gain.setValueAtTime(0,when+bar-0.03);
    native({type:'metro', ...metroAt(when), beatMs:bar/4*1000, beats:Math.ceil((bar+L)/(bar/4)), perBar:4}); }
  let arp=false; if(S.keyRef && !calib && !teach && INST[S.inst].kind==='pitched'){ const K=keyKnown(), g=S.prompt&&S.tracks.find(t=>t.guide&&t.notes&&t.notes.length), first=g?g.notes.slice().sort((a,b)=>a.s-b.s)[0]:null;
    if(first){ playKeyArp(K, when, bar, pitchOf(first)); arp=true; } else if(K){ playKeyArp(K, when, bar); arp=true; } }   /* a guided tune: the arpeggio starts and ends on its first note */
  recState={arp, calib, teach, taps:[], inst:S.inst, countStart:when, start:when+bar, end:when+bar+L, preroll, poff, along, lat:calib?0:(!teach&&S.inst==='vox'&&S.vocLat!=null?S.vocLat:latency()), chunks:[]};
  if(!teach) teachQueue=null;
  capturing=true; setRecUI(true);
}
/* ---- record screen: options -> count-in & recording -> review (Keep / Retry / Discard) ---- */
let rs={mode:null, pre:null, histLen:0};
function openRec(mode='take', partId=null){
  flushSave(); rs={mode, pre:hist.cur, histLen:hist.undo.length};
  const sh=$('recSheet'); sh.hidden=false; document.body.style.overflow='hidden';
  $('rsTitle').textContent = mode==='calib'?'Fix late notes' : mode==='teach'?'Drum sounds' : 'Record into '+partName(S.tracks.find(t=>t.id===S.target));
  $('rsHint').textContent = mode==='calib'?'After the four count-in clicks, clap sharply on every click.' : mode==='teach'?'Make each noise on every click after the count-in. It does one sound at a time.' : INST[S.inst].hint.split(/(?<=\.) /)[0];
  $('rsReview').hidden=true; $('rsReady').hidden=false;
}
let teachBack=false;   /* teaching from Your drum sounds: come back to that list, to teach the next one */
function closeRec(){ if(teachBack){ teachBack=false; setTimeout(()=>{ const d=$('nxDrums'); if(d && !$('nxMore').hidden) d.click(); },60); } if(s2.afterTeach){ s2.afterTeach=false; setTimeout(()=>{ if(s2On()) toast(taughtSlots().length>=2?'Learned. Now tap record for your beat.':'Tap record when you’re ready.'); },60); } if(recState) cancelRecord(); S.target=null; $('recSheet').hidden=true; document.body.style.overflow=''; rs.mode=null; renderTracks(); }
function showReview(){   /* after calibrating or teaching drum sounds */
  $('rsReady').hidden=true; $('rsReview').hidden=false; $('rsMsg').textContent=lastMsg||'';
  $('rsKeep').textContent='Done'; $('rsRetry').hidden=rs.mode!=='calib';
}
async function discardTake(p=rs){ if(snapNow().json!==p.pre.json){ await restoreSnap(p.pre); hist.cur=p.pre; hist.undo.length=p.histLen; hist.redo=[]; } }
function cancelRecord(){ teachQueue=null; capturing=false; recState=null; stopAll(); setRecUI(false); dropMic(); toast('Recording cancelled'); if(rs.mode==='take'){ const r=rs.resume; S.target=null; rs.mode=null; if(r) restoreSnap(r.snap).then(()=>{ hist.cur=r.snap; takeBar=r.bar; renderTracks(); }); else renderTracks(); } }
/* ---- recording into a part happens on the part itself: count-in and meter show on its row, and the take lands there, already open ---- */
const RSE=$('recStatus');
let micOff=false, takeBar=null, bleedHint=false;
function takeMode(){ return rs.mode==='take' && $('recSheet').hidden; }
async function recordInto(id, resume=null){
  if(recState){ cancelRecord(); return; }
  if(takeReading){ toast('Still reading your last take…'); return; }
  const tr=S.tracks.find(t=>t.id===id); if(!tr) return;
  if(micOff){ micSheet(id); return; }   /* explain again, with Import */
  flushSave(); rs={mode:'take', pre:hist.cur, histLen:hist.undo.length, resume}; takeBar=null;
  S.target=tr.id; S.activeId=tr.id; S.inst=tr.inst; 
  if((tr.len||S.bars)>S.bars){ S.bars=tr.len; save(); }
  await startRecord(false);
  if(!recState){ S.target=null; rs.mode=null; if(resume) await restoreSnap(resume.snap).then(()=>{ hist.cur=resume.snap; takeBar=resume.bar; }); }
  renderTracks();
}
function importInto(id){ lastNoise=null;
  const tr=S.tracks.find(t=>t.id===id); if(!tr) return;
  flushSave(); rs={mode:'take', pre:hist.cur, histLen:hist.undo.length}; takeBar=null;
  S.target=tr.id; S.activeId=tr.id; S.inst=tr.inst; $('fileIn').click();
}
function afterTake(){ setTimeout(()=>{ try{ inviteSend(false); }catch(e){} },1500);
  const changed = rs.pre && snapNow().json!==rs.pre.json;
  if(changed && S.tracks.some(t=>t.id===S.activeId&&hasContent(t))){ takeBar={id:S.activeId, pre:rs.pre, histLen:rs.histLen, hint:bleedHint, prevBars:s2.recPrev}; try{ const t=S.tracks.find(x=>x.id===S.activeId); setTimeout(()=>s2PlayheadTo((t.off||0)/16),0); }catch(e){} } bleedHint=false;   /* a new take: the playhead waits at its start, ready to play it back (Keep leaves it there) */
  S.target=null; rs.mode=null; renderTracks();
  const tr=S.tracks.find(t=>t.id===S.activeId);
  if(changed && tr && hasContent(tr)){ statsSess.takes++; track('take',tr.inst); trackOnce('first_take',tr.inst); const n=S.tracks.filter(t=>hasContent(t)&&!t.guide&&!t.mfx).length; if(n>=2) trackOnce('first_song','',n); }
}
/* Tap along: while a melody records into a part, a pad under the timeline takes one tap per note (optional; More > Timing & mic turns it off) */
function tapPadOn(){ const r=recState; return !!(r && !r.calib && !r.teach && INST[r.inst].kind==='pitched' && takeMode() && S.tapPad!==false); }
$('s2TapPad').addEventListener('pointerdown',e=>{ e.preventDefault(); const r=recState; if(!r||!ctx) return; r.taps.push(ctx.currentTime);   /* no buzz: the Silent metronome's beat stays clear */ const b=$('s2TapPad'); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); });
/* When the first count-in click (audio time `when`) is actually heard, for the phone's buzz: inMs from now, sentMs = the clock time it was
   worked out. The app takes off everything since sentMs, including the trip to the app (it used to count only from when the message
   arrived, and the trip is slow right as recording starts, so every buzz landed late). getOutputTimestamp says when audio is really
   heard (output delay included); older WebKit falls back to outputLatency. buzzMs: the owner's nudge (Mic and timing, Buzz timing). */
function metroAt(when){ const now=performance.now(); let heardIn;
  try{ const ts=ctx.getOutputTimestamp&&ctx.getOutputTimestamp(); if(ts&&ts.contextTime>0&&ts.performanceTime>0&&Math.abs(now-ts.performanceTime)<1000) heardIn=ts.performanceTime+(when-ts.contextTime)*1000-now; }catch(e){}
  if(heardIn==null) heardIn=(when-ctx.currentTime+Math.min(0.15,ctx.outputLatency||ctx.baseLatency||0))*1000;
  return {inMs:Math.round(heardIn+(Number.isFinite(+S.buzzMs)&&S.buzzMs!=null?+S.buzzMs:BUZZ_MS)), sentMs:Date.now()}; }
const BUZZ_MS=-15;   /* the default nudge: the owner's iPhone felt right at −15 ms (Nov 2026); Buzz timing changes it */
/* the felt metronome runs only in the iPhone app (the web can't buzz an iPhone) */
const feelBeat=()=>S.feelBeat!==false&&!!(window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.noodleNative);
const REC_ALONG=0.6;   /* about −4 dB */
function setRecUI(on){ if(!on){ native({type:'metroStop'}); try{ applyTrim(); }catch(e){} }   /* back to the normal level */
 $('s2TapPad').hidden=!(on&&tapPadOn());
 RSE.hidden=!on; $('recBtn').classList.toggle('live',on); $('recTxt').textContent=on?'Stop':'Start recording';
 }
function assemble(chunks, a, b, sr){
  const n=Math.max(1,Math.round((b-a)*sr)), out=new Float32Array(n);
  for(const ch of chunks){ const s=Math.round((ch.t-a)*sr); for(let i=0;i<ch.d.length;i++){ const k=s+i; if(k>=0&&k<n) out[k]=ch.d[i]; } }
  return out;
}
/* Too noisy? Notes stay accurate while the voice is 20 dB or more above the background (measured on real street, cafe and
   park noise mixed into guided takes); below that, extra and wrong notes climb fast. The background is read during the count-in. */
const NOISY_DB=20, VOX_TOP=-30;   /* a typical take's loud level before Noodle has heard yours */
function frameDbs(x, sr){ const y=biquad(x,'hp',45,0.707,sr), w=Math.round(0.01*sr), out=[]; for(let i=0;i+w<=y.length;i+=w){ let e=0; for(let k=i;k<i+w;k++) e+=y[k]*y[k]; out.push(10*Math.log10(e/w+1e-12)); } return out.sort((a,b)=>a-b); }
function countInFloor(r, upTo){ if(r.calib||r.teach||r.preroll||r.arp) return null;   /* needs a count-in with only clicks in it */
  const a=r.countStart+r.lat+0.05, b=Math.min(upTo??1e9, r.start+r.lat-0.05); if(b-a<0.6) return null;
  const d=frameDbs(assemble(r.chunks,a,b,ctx.sampleRate),ctx.sampleRate); return d.length?d[Math.floor((d.length-1)*0.3)]:null; }
/* Noisy take: subtract the background's spectrum (learned from the count-in, where only the background and clicks are heard) from
   the recording. Only used under the NOISY_DB line; quiet takes are never touched. */
function denoiseTake(x, sr, pre, over=2, flo=0.1){
  const n=2**Math.round(Math.log2(0.032*sr)), h=n>>2, nb=n/2+1, w=new Float64Array(n); for(let i=0;i<n;i++) w[i]=Math.sqrt(0.5-0.5*Math.cos(2*Math.PI*i/n));
  const re=new Float64Array(n), im=new Float64Array(n);
  // the background: per-frequency median power over the count-in (the median ignores the few frames with a click in them)
  const kp=Math.floor((pre.length-n)/h)+1; if(kp<8) return x; const PP=new Float32Array(kp*nb);
  for(let f=0;f<kp;f++){ for(let i=0;i<n;i++){ re[i]=pre[f*h+i]*w[i]; im[i]=0; } readerFFT(re,im); for(let k=0;k<nb;k++) PP[f*nb+k]=re[k]*re[k]+im[k]*im[k]; }
  const N=new Float64Array(nb), col=new Float32Array(kp); for(let k=0;k<nb;k++){ for(let f=0;f<kp;f++) col[f]=PP[f*nb+k]; col.sort(); N[k]=col[kp>>1]/0.693; }
  const L=x.length+2*n, yp=new Float64Array(L); yp.set(x,n); const K=Math.floor((L-n)/h)+1, YR=new Float32Array(K*nb), YI=new Float32Array(K*nb), G=new Float32Array(K*nb);
  for(let f=0;f<K;f++){ for(let i=0;i<n;i++){ re[i]=yp[f*h+i]*w[i]; im[i]=0; } readerFFT(re,im);
    for(let k=0;k<nb;k++){ const o=f*nb+k; YR[o]=re[k]; YI[o]=im[k]; G[o]=Math.max(0,1-over*N[k]/(re[k]*re[k]+im[k]*im[k]+1e-20)); } }
  // smooth the gain a little over time, then over frequency
  const G2=new Float32Array(K*nb); for(let f=0;f<K;f++){ const a=(f+K-1)%K, b=(f+1)%K; for(let k=0;k<nb;k++) G2[f*nb+k]=(G[f*nb+k]+G[a*nb+k]+G[b*nb+k])/3; }
  for(let f=0;f<K;f++) for(let k=0;k<nb;k++){ const o=f*nb; G[o+k]=Math.max(flo,(G2[o+k]+G2[o+(k+nb-1)%nb]+G2[o+(k+1)%nb])/3); }
  const out=new Float64Array(L), ws=new Float64Array(L);
  for(let f=0;f<K;f++){ for(let k=0;k<nb;k++){ const o=f*nb+k; re[k]=YR[o]*G[o]; im[k]=-YI[o]*G[o]; } for(let k=1;k<nb-1;k++){ re[n-k]=re[k]; im[n-k]=-im[k]; }
    readerFFT(re,im);   /* forward FFT of the conjugate = inverse, times n */
    for(let i=0;i<n;i++){ out[f*h+i]+=re[i]/n*w[i]; ws[f*h+i]+=w[i]*w[i]; } }
  const y=new Float32Array(x.length); for(let i=0;i<x.length;i++) y[i]=out[n+i]/Math.max(ws[n+i],1e-6); return y; }
/* A take of nothing: in a quiet room the loudest moment is still tiny, or it barely rises above what the count-in heard. Without this, the
   note finder (which judges sounds against the take's own loudest moment) turns the room's small noises into notes and hits.
   Measured Nov 17: the owner's real takes peak at -34 dBFS or louder (10 ms frames) over a room at -65 to -78; background-only recordings stay within 8 dB of their own floor when steady. */
function takeIsSilence(x, sr, nf){ const y=biquad(x,'hp',45,0.707,sr), w=Math.round(0.01*sr), e=[]; for(let i=0;i+w<=y.length;i+=w){ let q=0; for(let k=i;k<i+w;k++) q+=y[k]*y[k]; e.push(q/w); }
  let pk=0; for(let i=0;i+3<=e.length;i++){ const m=(e[i]+e[i+1]+e[i+2])/3; if(m>pk) pk=m; } const db=10*Math.log10(pk+1e-12);   /* the loudest 30 ms */
  return nf==null ? db<-55 : (db-nf<8 || (db<-45 && db-nf<20)); }
async function finishRecord(){
  const r=recState; capturing=false; recState=null; stopAll(); setRecUI(false); if(!r.teach) dropMic();
  let leak=0;
  if(r.inst==='vox' && !r.calib && !r.teach){ const m=measureTakeDelay(r); if(m!=null){ r.lat=m;
      const bar=r.start-r.countStart, cin=biquad(assemble(r.chunks, r.countStart+bar/2+m, r.start+m-0.02, ctx.sampleRate),'hp',150,0.707,ctx.sampleRate); let q=0; for(let i=0;i<cin.length;i++) q+=cin[i]*cin[i]; leak=Math.sqrt(q/Math.max(1,cin.length)); S.vocLat=S.vocLat==null?m:+(0.5*S.vocLat+0.5*m).toFixed(4); save(); } }
  const sr=ctx.sampleRate, pre=0.08, a=r.start+r.lat-pre, b=r.end+r.lat+0.25;
  let x=assemble(r.chunks,a,b,sr);
  if(r.cut!=null){ const i0=Math.max(0,Math.round((r.cut-a)*sr)), f=Math.round(0.02*sr); for(let i=i0;i<x.length;i++) x[i]*=Math.max(0,1-(i-i0)/f); }   /* stopped by a tap: drop the tap's own noise */
  // only mention headphones when the beat actually leaked in: compare the count-in (you're silent) with your singing
  bleedHint=false; if(r.inst==='vox' && leak>0){ const h=biquad(x,'hp',150,0.707,sr); let q=0; for(let i=0;i<h.length;i++) q+=h[i]*h[i]; const voice=Math.sqrt(q/Math.max(1,h.length)); bleedHint = voice>0 && leak/voice>0.15; }
  if(r.calib){ finishCalib(x,sr,pre); showReview(); return; }
  if(r.teach){ finishTeach(x,sr,r.teach); if(!teachQueue) showReview(); return; }
  const nf=countInFloor(r); try{ const ck=countInClick(r,sr,pre); if(ck) x.click=ck; }catch(e){}
  if(takeIsSilence(x,sr,nf)){ lastNoise=null; toast('Nothing recorded: Noodle only heard the room.'); flushSave(); if(takeMode()) afterTake(); else showReview(); return; }
  const fd=frameDbs(x,sr), top=fd.length?fd[Math.floor((fd.length-1)*0.99)]:null; lastNoise = nf!=null&&top!=null ? {floor:+nf.toFixed(1), top:+top.toFixed(1)} : null;
  if(lastNoise && lastNoise.top-lastNoise.floor<NOISY_DB && INST[r.inst].kind==='pitched'){   /* noisy: clean the take before reading notes from it */
    try{ const ck=x.click; x=denoiseTake(x, sr, assemble(r.chunks, r.countStart+r.lat+0.05, r.start+r.lat-0.05, sr)); if(ck) x.click=ck; lastNoise.den=1; }catch(e){} }
  const taps=r.taps.filter(t=>t>=r.start-0.1 && t<=r.end+0.1).map(t=>t+r.lat-a);   /* in the take's seconds */
  await addTake(x, sr, r.inst, {align:pre, notch:true, live:true, taps:taps.length>=2?taps:null});
  if(lastNoise){ const loud=lastNoise.top-lastNoise.floor; if(loud>=NOISY_DB && INST[r.inst].kind==='pitched'){ S.voxTop=+(S.voxTop==null?lastNoise.top:0.7*S.voxTop+0.3*lastNoise.top).toFixed(1); save(); }   /* your usual level, for the count-in check */
    if(loud<NOISY_DB) toast((lastMsg?lastMsg+' ':'')+(lastNoise.den?'Noisy here, so Noodle cleaned it up. Holding the phone closer gives cleaner notes.':'Noisy here: hold the phone closer and retake for cleaner notes.'),6000); }
  flushSave(); if(takeMode()) afterTake(); else showReview();
}
/* What the phone played during the count-in (metronome + pre-rolled parts), and how late the mic heard it.
   Normalized cross-correlation at ~4 kHz over 0–500 ms; returns seconds, or null when there's no clear match. */
function countInRef(r){ const sr=ctx.sampleRate, n=Math.floor((r.start-r.countStart)*sr), ref=new Float32Array(n);
  if(metroBuf){ const md=metroBuf.getChannelData(0); for(let i=0;i<n;i++) ref[i]+=md[i%md.length]*0.75; }
  if(r.preroll) S.tracks.forEach(t=>{ const g=trackGain(t); if(!t._buf||!g) return; const L=t._buf.getChannelData(0), Rr=t._buf.getChannelData(t._buf.numberOfChannels>1?1:0), len=t._buf.length, off=Math.round(r.poff*sr);
    for(let i=0;i<n;i++){ const k=(off+i)%len; ref[i]+=g*0.5*(L[k]+Rr[k]); } });
  return ref; }
function measureTakeDelay(r, micOverride){ try{
  const sr=ctx.sampleRate, D=Math.max(1,Math.round(sr/6000)), fs=sr/D, maxLag=0.5;
  const dec=x=>{ const n=Math.floor(x.length/D), o=new Float32Array(n); for(let i=0;i<n;i++){ let s2=0; for(let k=0;k<D;k++) s2+=x[i*D+k]; o[i]=s2/D; } for(let i=n-1;i>0;i--) o[i]-=o[i-1]; o[0]=0; return o; };   // block-average, then emphasize attacks
  // above ~1 kHz only: clicks and drum attacks line up sharply, while sustained bass and pads would blur the match
  const hp=x=>biquad(biquad(x,'hp',1000,0.707,sr),'hp',1000,0.707,sr), mic=dec(hp(micOverride||assemble(r.chunks, r.countStart, r.start+maxLag, sr))), rf=dec(hp(countInRef(r)));
  const N=rf.length, nL=Math.min(Math.floor(maxLag*fs), mic.length-N); if(nL<10) return null;
  let e1=0; for(let i=0;i<N;i++) e1+=rf[i]*rf[i]; if(e1<1e-9) return null;
  const cs=new Float32Array(nL); let best=0, bl=0;
  for(let lag=0;lag<nL;lag++){ let c=0,e2=0; for(let i=0;i<N;i++){ const v=mic[i+lag]; c+=rf[i]*v; e2+=v*v; } const nc=Math.abs(c)/Math.sqrt(e1*e2+1e-12); cs[lag]=nc; if(nc>best){ best=nc; bl=lag; } }
  let side=0; const w=Math.round(0.015*fs); for(let l=0;l<nL;l++) if(Math.abs(l-bl)>w && cs[l]>side) side=cs[l];
  if(best<0.12 || best<1.25*side) return null;
  const y0=cs[bl-1]??best, y2=cs[bl+1]??best, den=y0-2*best+y2, d=den? (y0-y2)/(2*den) : 0, lag=(bl+clamp(d,-0.5,0.5))/fs;
  return lag>=0.004 && lag<=0.45 ? +lag.toFixed(4) : null; }catch(e){ return null; } }
function startTeach(ids){
  openRec('teach');
  teachQueue=ids.map(slotOf).filter(Boolean).map(x=>({d:x.id, say:x.say||slotLabel(x.id)}));
  if(!teachQueue.length) return;
  toast(`Teaching ${teachQueue.length} sound${teachQueue.length>1?'s':''}. Make each noise on every click.`);
  nextTeach();
}
function nextTeach(){
  if(!teachQueue||!teachQueue.length) return;
  const t=teachQueue[0]; setTimeout(()=>{ if(teachQueue && teachQueue[0]===t) startRecord(false,t); }, 700);
}
function encodeVoice(x,sr,t0){ // 0.4 s of the hit at 24 kHz, 16-bit, base64
  const R=24000, n=Math.round(0.4*R), out=new Int16Array(n); let pk=1e-6;
  for(let i=0;i<n;i++){ const p=t0*sr+i*sr/R, i0=Math.floor(p), fr=p-i0; const v=(x[i0]||0)*(1-fr)+(x[i0+1]||0)*fr; out[i]=0; pk=Math.max(pk,Math.abs(v)); }
  const g=0.9/pk; for(let i=0;i<n;i++){ const p=t0*sr+i*sr/R, i0=Math.floor(p), fr=p-i0; let v=((x[i0]||0)*(1-fr)+(x[i0+1]||0)*fr)*g; if(i>n-480) v*= (n-i)/480; out[i]=Math.max(-32767,Math.min(32767,Math.round(v*32767))); }
  const u=new Uint8Array(out.buffer); let bin=''; for(let i=0;i<u.length;i+=4096) bin+=String.fromCharCode.apply(null,u.subarray(i,i+4096)); return {sr:R, b64:btoa(bin)};
}
function finishTeach(x,sr,t){
  const sl=slotOf(t.d); if(!sl){ teachQueue=null; dropMic(); return; }
  const an=analyzeTake(x,sr,'kick',60,true); const cb=removeClickBleed(an.onsets,0.08);
  const ons=cb.ons.slice().sort((a,b)=>b.db-a.db).slice(0,12);
  if(ons.length<3){ teachQueue=null; dropMic(); toast(`I only heard ${ons.length} “${t.say}” sounds. Tap Teach and make it louder on every click.`); return; }
  sl.ex=ons.map(o=>o.fv); const loud=ons[0]; sl.voice=encodeVoice(x,sr,Math.max(0,loud.t-0.005));
  scaleCache=null; teachQueue.shift();
  if(teachQueue.length){ save(); toast(`Got your “${t.say}”. Next: “${teachQueue[0].say}” on every click.`); nextTeach(); return; }
  teachQueue=null; dropMic(); save();
  let n=0; S.tracks.forEach(tr=>{ let hit=false; (tr._takes||[]).forEach(tk=>{ if(tk.inst==='kit'){ classifyKit(tk.an.onsets); hit=true; n++; } }); if(hit){ quantizeTrack(tr); tr._dirty=true; redrawTrack(tr); } });
  if(n) scheduleRender();
 
  const w=kitWarnings();
  toast(Object.keys(w).length ? `Learned. Heads up: some sounds are easy to mix up (marked in Your kit).` : `Learned your sounds. Drum kit takes now sort by your own examples`+(n?' (this session’s takes were re-sorted).':'.'));
}
function finishCalib(x,sr,pre){
  const ons=removeClickBleed(detectOnsets(biquad(biquad(x,'notch',1500,4,sr),'notch',2000,4,sr), sr, 60, 0.12), pre).ons;
  const beat=60/S.bpm, lo=-0.12*beat;
  // claps always come after the click they answer, so measure each one in a window from just before a click to most of a beat after
  const dev=ons.map(o=>{ const t=o.t-pre; return ((((t-lo)%beat)+beat)%beat)+lo; });
  if(dev.length<4){ toast('Noodle heard '+dev.length+' claps. Clap louder on every click and try again.'); return; }
  const md=median(dev), spread=median(dev.map(d=>Math.abs(d-md)));
  if(md<0.015){ toast('That measured almost no delay, which usually means the mic heard the click instead of your claps. Wear headphones and calibrate again.'); return; }
  if(spread>0.06){ toast('Those claps were too uneven to measure. Try again, clapping right on each click.'); return; }
  S.latAuto=false; S.calibrated=true; S.latMs=clamp(Math.round(md*1000),-50,600); save();
  toast('Mic delay set to '+S.latMs+' ms from '+dev.length+' claps');
}
const CLICK_TOL=0.006, CLICK_DB=8;
/* The click as the mic hears it, measured on the count-in (four clicks, nothing else expected): where in the beat it lands and how loud. Null when it can't be heard (headphones) or the count-in isn't clean. */
function countInClick(r, sr, pre){ if(r.calib||r.teach||r.preroll||r.arp) return null; const beat=(r.start-r.countStart)/4;
  let y=biquad(assemble(r.chunks, r.countStart+r.lat-pre, r.start+r.lat-pre, sr),'hp',45,0.707,sr); for(const f of [1500,2000]){ y=biquad(y,'notch',f,4,sr); y=biquad(y,'notch',f,4,sr); }
  const ons=detectOnsets(y, sr, S.sens??55, 0.035); let best=[];
  for(const o of ons){ const ph=(((o.t-pre)%beat)+beat)%beat, m=ons.filter(q=>{ const d=(((q.t-pre-ph)%beat)+beat*1.5)%beat-beat/2; return Math.abs(d)<0.004; }); if(m.length>best.length) best=m; }
  if(best.length<3) return null; const ph=median(best.map(o=>(((o.t-pre)%beat)+beat)%beat)); if(ph>0.25) return null;   /* a leak arrives within a quarter second of the beat */
  return {ph, db:median(best.map(o=>o.db)), n:best.length}; }
/* Metronome bleed: when the click plays through the speaker, the mic hears it with machine-exact timing on every beat.
   Find the phase where many onsets sit within a few ms of a perfect beat comb, and drop those (they're quieter than your hits). */
function removeClickBleed(ons, pre, dur, click){
  if(click){   /* the count-in told us exactly when the click reaches the mic and how loud: drop what sits on that moment at about that loudness (your own hits on the beat are far louder) */
    const beat=60/S.bpm, keep=ons.filter(o=>{ const d=(((o.t-pre-click.ph)%beat)+beat*1.5)%beat-beat/2; return !(Math.abs(d)<CLICK_TOL && o.db<=click.db+CLICK_DB); }); return {ons:keep, removed:ons.length-keep.length}; }
  if(ons.length<4) return {ons, removed:0};
  const beat=60/S.bpm; let best=null;
  for(const o of ons){ const ph=(((o.t-pre)%beat)+beat)%beat;
    const m=ons.filter(q=>{ const d=(((q.t-pre-ph)%beat)+beat*1.5)%beat-beat/2; return Math.abs(d)<0.0025; });
    if(!best||m.length>best.length) best=m; }
  const beats=Math.round((dur||loopLen())/beat);   /* beats in this take (it used to count the whole song, so in a long song the leak was never recognised) */
  if(!best || best.length<Math.max(4,beats*0.75)) return {ons, removed:0};
  const loud=median(ons.map(o=>o.db)), bleedDb=median(best.map(o=>o.db));
  const others=ons.filter(o=>!best.includes(o));
  // only treat it as bleed if your own sounds are clearly louder (or there are none, e.g. a silent take)
  if(others.length && bleedDb > median(others.map(o=>o.db))-5) return {ons, removed:0};
  return {ons:others, removed:best.length};
}
/* slide the grid by up to half a step so the take's hits sit as close to it as possible */
function fitAlign(times, align){
  const g=stepDur()*(S.quant==8?2:1); if(times.length<2) return align;
  let best=0,bs=-1e9;
  for(let d=-0.45*g; d<=0.45*g; d+=0.002){ let sc=0; for(const t of times){ const r=(t-align-d)/g; const dv=(r-Math.round(r))*g; sc+=Math.exp(-(dv*dv)/(2*0.02*0.02)); }
    sc-=0.15*Math.abs(d)/g; if(sc>bs){bs=sc;best=d;} }
  return align+best;
}
function takeTimes(an,inst){ return INST[inst].kind==='pitched'? an.notes.map(n=>n.t0) : an.onsets.map(o=>o.t); }
