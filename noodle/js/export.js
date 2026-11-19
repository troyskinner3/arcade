"use strict";
/* ============================== export ============================== */
function wavBytes(ab,bits=16){
  const ch=ab.numberOfChannels, n=ab.length, sr=ab.sampleRate, B=bits/8, out=new DataView(new ArrayBuffer(44+n*ch*B));
  const ws=(o,s2)=>{ for(let i=0;i<s2.length;i++) out.setUint8(o+i,s2.charCodeAt(i)); };
  ws(0,'RIFF'); out.setUint32(4,36+n*ch*B,true); ws(8,'WAVE'); ws(12,'fmt '); out.setUint32(16,16,true); out.setUint16(20,1,true); out.setUint16(22,ch,true);
  out.setUint32(24,sr,true); out.setUint32(28,sr*ch*B,true); out.setUint16(32,ch*B,true); out.setUint16(34,bits,true); ws(36,'data'); out.setUint32(40,n*ch*B,true);
  const data=[]; for(let c=0;c<ch;c++) data.push(ab.getChannelData(c));
  let o=44; for(let i=0;i<n;i++) for(let c=0;c<ch;c++){ const v=clamp(data[c][i],-1,1);
    if(bits===24){ let q=Math.round(v<0?v*0x800000:v*0x7fffff); out.setUint8(o,q&255); out.setUint8(o+1,(q>>8)&255); out.setUint8(o+2,(q>>16)&255); o+=3; }
    else { out.setInt16(o,v<0?v*0x8000:v*0x7fff,true); o+=2; } }
  return new Uint8Array(out.buffer);
}
/* MIDI: type 1, 96 ticks per beat, tempo + 4/4 + key signature, one named track per part (drums on channel 10, General MIDI notes) */
function keySigBytes(){ const K=currentKey(); if(K.none) return [0xff,0x59,0x02,0,0]; const fifths={0:0,7:1,2:2,9:3,4:4,11:5,6:6,1:-5,8:-4,3:-3,10:-2,5:-1};
  const R=SCALE_REL[K.scale]||[0,0], rel=(K.tonic+R[0])%12; const sf=fifths[rel]; return [0xff,0x59,0x02,(sf+256)&255, R[1]]; }
function midiBytes(list){
  const SP=spotRanges(), keepM=e=>!SP.length||!inSpot(e.s!==undefined?e.s:e.x,SP);
  const PPQ=96, tick16=24, n=steps(), loops=S.loops; list=(list||S.tracks).filter(tr=>INST[tr.inst].kind!=='audio'&&INST[tr.inst].kind!=='mix')   /* no MIDI for audio or Song FX */;
  const vlq=v=>{ const b=[v&0x7f]; while(v>>=7) b.unshift((v&0x7f)|0x80); return b; };
  const trk=(events)=>{ events.sort((a,b)=>a.t-b.t||a.o-b.o); let last=0; const bytes=[]; for(const e of events){ bytes.push(...vlq(e.t-last),...e.b); last=e.t; } bytes.push(0,0xff,0x2f,0); return [0x4d,0x54,0x72,0x6b,(bytes.length>>>24)&255,(bytes.length>>>16)&255,(bytes.length>>>8)&255,bytes.length&255,...bytes]; };
  const name=s2=>{ const b=[...new TextEncoder().encode(s2)]; return [0xff,0x03,...vlq(b.length),...b]; };
  const us=Math.round(60000000/S.bpm);
  const tracks=[trk([{t:0,o:0,b:name(songTitle())},{t:0,o:0,b:[0xff,0x51,0x03,(us>>16)&255,(us>>8)&255,us&255]},{t:0,o:0,b:[0xff,0x58,0x04,4,2,24,8]},{t:0,o:0,b:keySigBytes()}])];
  const sw=s2=>Math.round((s2%2===1?(S.swing/100)*0.5:0)*tick16);
  let chan=0;
  list.forEach(tr=>{ const ev=[{t:0,o:0,b:name(partName(tr)+' ('+tr.sound+')')}]; const pitched=INST[tr.inst].kind==='pitched'; const ch=pitched?(chan++%9):9;
    for(let L=0;L<loops;L++){ const base=L*n*tick16;
      if(pitched && tr.inst==='arp') songEvents(tr,arpEvents(tr)).filter(keepM).map(e=>SP.length?spotClip(e,SP,'x'):e).forEach(e=>{ const t=base+Math.round(e.x*tick16)+sw(Math.floor(e.x)), p=clamp(e.p+12*tr.oct,0,127); ev.push({t,o:1,b:[0x90|ch,p,Math.round(e.v*120)]},{t:t+Math.max(2,Math.round(e.l*tick16)),o:0,b:[0x80|ch,p,0]}); });
      else if(pitched) songEvents(tr,tr.notes).filter(keepM).map(e=>SP.length?spotClip(e,SP):e).forEach(nt=>{ const t=base+nt.s*tick16+sw(nt.s); notePitches(tr,nt).forEach(pp=>{ const p=clamp(pp+12*tr.oct,0,127); ev.push({t,o:1,b:[0x90|ch,p,Math.round(nt.v*120)]},{t:t+nt.l*tick16-2,o:0,b:[0x80|ch,p,0]}); }); });
      else withFills(tr,songEvents(tr,tr.hits)).filter(keepM).forEach(h=>{ const t=base+h.s*tick16+sw(h.s); ev.push({t,o:1,b:[0x99,drumNote(h.d),Math.round(h.v*120)]},{t:t+12,o:0,b:[0x89,drumNote(h.d),0]}); }); }
    tracks.push(trk(ev)); });
  const head=[0x4d,0x54,0x68,0x64,0,0,0,6,0,1,0,tracks.length,0,PPQ];
  return new Uint8Array([...head,...tracks.flat()]);
}
const drumNote=d=>{ const snd=soundOf(d); const m=(SOUNDS[snd]||{}).midi; if(m) return m; const i=S.kit.slots.findIndex(x=>x.id===d); return 84+Math.max(0,i); };
const CRC=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xedb88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
function crc32(u){ let c=0xffffffff; for(let i=0;i<u.length;i++) c=CRC[(c^u[i])&255]^(c>>>8); return (c^0xffffffff)>>>0; }
function zip(files){
  const parts=[], cd=[]; let off=0;
  for(const f of files){ const nm=new TextEncoder().encode(f.name), crc=crc32(f.data), sz=f.data.length;
    const h=new DataView(new ArrayBuffer(30)); h.setUint32(0,0x04034b50,true); h.setUint16(4,20,true); h.setUint16(10,0,true); h.setUint16(12,33,true); h.setUint32(14,crc,true); h.setUint32(18,sz,true); h.setUint32(22,sz,true); h.setUint16(26,nm.length,true);
    parts.push(new Uint8Array(h.buffer),nm,f.data);
    const c=new DataView(new ArrayBuffer(46)); c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(14,33,true); c.setUint32(16,crc,true); c.setUint32(20,sz,true); c.setUint32(24,sz,true); c.setUint16(28,nm.length,true); c.setUint32(42,off,true);
    cd.push(new Uint8Array(c.buffer),nm); off+=30+nm.length+sz; }
  const cdSize=cd.reduce((a,b)=>a+b.length,0); const e=new DataView(new ArrayBuffer(22)); e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true); e.setUint32(12,cdSize,true); e.setUint32(16,off,true);
  return new Blob([...parts,...cd,new Uint8Array(e.buffer)],{type:'application/zip'});
}
/* the full mix through the master bus, K loops long, with a short fade so shared clips end cleanly */
async function renderMix(K, fade){
  await renderDirty();
  const sr=ctx.sampleRate, L=loopLen(), n=Math.round(L*sr), len=n*K+Math.round(2.5*sr);
  const oc=new OfflineAudioContext(2,len,sr); const ch=buildChain(oc,false); mfxOffline(oc,ch,K);
  S.tracks.forEach(tr=>{ if(!tr._buf) return; const g=oc.createGain(), p=oc.createStereoPanner(), s2=oc.createGain(); g.gain.value=trackGain(tr); p.pan.value=tr.pan/100; s2.gain.value=Math.pow(tr.send/100,1.5);
    g.connect(p); p.connect(ch.input); p.connect(s2); s2.connect(ch.revIn); const src=oc.createBufferSource(); src.buffer=tr._buf; src.loop=true; src.connect(g); src.start(0); src.stop(n*K/sr); });
  const mix=await oc.startRendering();
  if(fade){ const f0=n*K, f1=Math.min(mix.length, f0+Math.round(2.2*sr)); for(let c=0;c<2;c++){ const d=mix.getChannelData(c); for(let i=f0;i<mix.length;i++) d[i]*= i<f1 ? Math.pow(1-(i-f0)/(f1-f0),2) : 0; } }
  return mix;
}
const songTitle=()=>{ if(S.title) return S.title; const K=currentKey(); return `Noodle ${S.bpm} BPM${K.none?'':' '+NOTE_NAMES[K.tonic].replace('♯','#').replace('♭','b')+' '+(SCALE_LABEL[PARENT[K.scale]||K.scale]||K.scale)}`; };
const fileSafe=t=>t.replace(/[\/\\:*?"<>|]/g,'-');
/* Producer pack: a folder you can drop into any DAW */
async function exportZip(){
  ensureCtx(); if(!S.tracks.length){ toast('Add a part first'); return; }
  try{
    const sr=ctx.sampleRate, L=loopLen(), n=Math.round(L*sr), K=S.loops, len=n*K+Math.round(2.5*sr), top=fileSafe(songTitle())+'/';
    const mix=await renderMix(K,false);
    const files=[{name:top+'Audio/00 Full mix.wav',data:wavBytes(mix,24)}];
    const midiFiles=[]; const parts=S.tracks.filter(tr=>tr._buf);
    parts.forEach((tr,i)=>{ const num=String(i+1).padStart(2,'0'), nm=fileSafe(partName(tr)); const b=ctx.createBuffer(2,len,sr);
      for(let c=0;c<2;c++){ const s2=tr._buf.getChannelData(c), d=b.getChannelData(c); for(let k=0;k<K;k++) d.set(s2,k*n); }
      files.push({name:`${top}Audio/${num} ${nm} (${tr.sound}).wav`,data:wavBytes(b,24)});
      if(tr.inst==='vox' && tr._raw){ const {x,sr:rs}=tr._raw, va=tr.va||0, rb=ctx.createBuffer(1,len,sr), d=rb.getChannelData(0);
        for(let k=0;k<K;k++) for(let i=0;i<n;i++){ const p=(va+i/sr)*rs, i0=Math.floor(p), fr=p-i0; d[k*n+i]=(x[i0]||0)*(1-fr)+(x[i0+1]||0)*fr; }
        files.push({name:`${top}Audio/${num} ${nm} (raw take, no effects).wav`,data:wavBytes(rb,24)}); }
      if(INST[tr.inst].kind!=='audio') midiFiles.push({name:`${top}MIDI/${num} ${nm}.mid`,data:midiBytes([tr])}); });
    if(midiFiles.length) files.push({name:top+'MIDI/All parts.mid',data:midiBytes()},...midiFiles);
    files.push({name:top+'READ ME - how to import.txt',data:new TextEncoder().encode(packReadme(parts,K))});
    await offerFile(fileSafe(songTitle())+'.zip', zip(files));
  } catch(e){ toast('Export failed: '+(e&&e.message||e)); }
  finally{}
}
function packReadme(parts,K){
  const Kk=currentKey(), kR=SCALE_REL[Kk.scale], kSame=(!Kk.none&&kR&&!['major','minor','pent-major','pent-minor','blues'].includes(Kk.scale)) ? ` (set your DAW's key to ${NOTE_NAMES[(Kk.tonic+kR[0])%12]} major${['harm-minor','mel-minor','phryg-dom'].includes(Kk.scale)?', the closest match; one note of this scale sits outside it':', which has the same notes'})` : '',
      key=Kk.none?'no fixed key':NOTE_NAMES[Kk.tonic]+' '+(SCALE_LABEL[Kk.scale]||Kk.scale)+kSame, bars=S.bars*K;
  const drums=parts.filter(t=>INST[t.inst].kind!=='pitched'&&INST[t.inst].kind!=='audio'&&INST[t.inst].kind!=='mix');
  const map=[...new Set(drums.flatMap(t=>t.hits.map(h=>h.d)))].map(d=>`  note ${drumNote(d)}  ${slotLabel(d)}`).join('\n');
  return `${songTitle()}
Made with Noodle

Tempo: ${S.bpm} BPM   Time signature: 4/4   Key: ${key}   Length: ${bars} bars${S.swing?`   Swing: ${S.swing}% (already in the audio and MIDI timing)`:''}

WHAT'S INSIDE
Audio/  Every part as a 24-bit, ${ctx.sampleRate/1000} kHz WAV. All files start at bar 1 and are the same length, so they line up when placed at the start of a session. "00 Full mix" is the whole song with the master effects. Part files are dry: no master effects, volume or pan, so you can mix them yourself.
${parts.some(t=>t.inst==='vox')?'        Vocals come twice: processed (tuning, EQ, compression, doubling, echo) and the raw take with no effects.\n':''}MIDI/   "All parts.mid" has every part on its own named track, plus the tempo, time signature and key. There's also one file per part for dragging single clips. (Vocals are audio only.)

LOGIC PRO
1. File > Open "MIDI/All parts.mid". Opening (not importing) brings in the tempo, key and track names.
2. Drag the WAVs from Audio/ into the tracks area at bar 1. If Logic asks to use tempo information from the file, choose No.
3. Pick instruments for the MIDI tracks (drums use General MIDI notes, so a Drum Kit works right away).

ABLETON LIVE
1. Set the tempo to ${S.bpm}.
2. In Settings > Record, Warp & Launch, turn off "Auto-Warp Long Samples" so the files aren't stretched.
3. Drag the WAVs to bar 1 (in Arrangement view, drop them together to get one track each).
4. Drag the .mid files onto MIDI tracks; for drums use a Drum Rack.

FL STUDIO
1. Set the tempo to ${S.bpm}.
2. Drag "MIDI/All parts.mid" into the window and choose to import it. Drag the WAVs into the Playlist at bar 1.

GARAGEBAND (Mac or iPhone)
1. Set the tempo to ${S.bpm} and the key to ${key}.
2. Drag the WAVs and .mid files into the tracks area at bar 1.
${map?`
DRUM NOTES (General MIDI)
${map}
`:''}`;
}
/* ---- share your song: audio (WAV) or a vertical video, through the phone's share sheet ---- */
let shareFile=null, shareMsg='', shareCan=false;
async function prepareShare(kind,onProg){
  ensureCtx(); if(!S.tracks.length){ toast('Add a part first'); return; }
  try{
    const mix=await renderMix(S.loops,true), base=fileSafe(songTitle());
    if(kind==='audio'){ shareFile=new File([wavBytes(mix,16)], base+'.wav', {type:'audio/wav'}); }
    else { const blob=await recordVideo(mix, sec=>{ if(onProg) onProg(sec); }); const ext=blob.type.includes('mp4')?'mp4':'webm'; shareFile=new File([blob], base+'.'+ext, {type:blob.type}); }
    const canShare=!!(navigator.canShare && navigator.canShare({files:[shareFile]}));
    shareCan=canShare; shareMsg=`Your ${kind==='audio'?'audio':'video'} is ready (${(shareFile.size/1048576).toFixed(1)} MB, ${Math.round(mix.duration)} s). `+(canShare?(kind==='video'?'Tap Share to save it to Photos or send it to Messages, CapCut, TikTok and more.':'Tap Share to send it to Messages, CapCut, TikTok and more.'):'Save it, then add it to any app.');
  } catch(e){ toast((kind==='video'?'Video export':'Export')+' didn’t work here: '+(e&&e.message||e)); }
}
async function shareNow(){ if(!shareFile) return; try{ await navigator.share({files:[shareFile], title:songTitle(), text:'Made with Noodle'}); } catch(e){ if(e&&e.name!=='AbortError') toast('Sharing didn’t open. Tap Save to Files instead.'); } }
/* real-time render of a 720x1280 clip: the parts as lanes with a moving playhead, pulsing on each beat */
/* Video export. Preferred: encode frame by frame (WebCodecs) into a regular MP4: faster than real time, silent, and the
   file has a correct length everywhere (Photos included). Fallback: record the canvas and audio in real time (MediaRecorder). */
async function videoEncodeConfig(sr){
  if(!window.VideoEncoder||!window.AudioEncoder||!window.VideoFrame||!window.AudioData) return null;
  try{ const v={codec:'avc1.42001f',width:720,height:1280,bitrate:3000000,framerate:30}, a={codec:'mp4a.40.2',sampleRate:sr,numberOfChannels:2,bitrate:160000};
    if(!(await VideoEncoder.isConfigSupported(v)).supported || !(await AudioEncoder.isConfigSupported(a)).supported) return null; return {v,a}; }catch(e){ return null; } }
let muxerLoad=null;
function loadMuxer(){ return muxerLoad||(muxerLoad=new Promise((res,rej)=>{ if(window.Mp4Muxer) return res(); const sc=document.createElement('script'); sc.src=new URL('vendor/mp4-muxer.min.js',location.href).href; sc.onload=res; sc.onerror=()=>{ muxerLoad=null; rej(new Error('couldn’t load the video maker')); };   /* mp4-muxer 5.1.3 (MIT), bundled */ document.head.appendChild(sc); })); }
async function encodeVideo(mix, cfg, onProgress){
  await loadMuxer(); const FPS=30, sr=mix.sampleRate, {cv,draw,W,H}=videoPainter(mix);
  const muxer=new Mp4Muxer.Muxer({target:new Mp4Muxer.ArrayBufferTarget(), video:{codec:'avc',width:W,height:H,frameRate:FPS}, audio:{codec:cfg.a.codec.startsWith('mp4a')?'aac':'opus',sampleRate:sr,numberOfChannels:2}, fastStart:'in-memory', firstTimestampBehavior:'offset'});
  let err=null; const fail=e=>{ err=err||e; };
  const ve=new VideoEncoder({output:(c,m)=>muxer.addVideoChunk(c,m), error:fail}); ve.configure(cfg.v);
  const ae=new AudioEncoder({output:(c,m)=>muxer.addAudioChunk(c,m), error:fail}); ae.configure(cfg.a);
  const L=mix.getChannelData(0), R=mix.numberOfChannels>1?mix.getChannelData(1):L, N=mix.length, B=1024;
  for(let i=0;i<N;i+=B){ const n=Math.min(B,N-i), d=new Float32Array(n*2); d.set(L.subarray(i,i+n),0); d.set(R.subarray(i,i+n),n);
    const ad=new AudioData({format:'f32-planar',sampleRate:sr,numberOfFrames:n,numberOfChannels:2,timestamp:Math.round(i*1e6/sr),data:d}); ae.encode(ad); ad.close(); }
  const frames=Math.ceil(mix.duration*FPS);
  for(let f=0;f<frames;f++){ if(err) throw err; draw(f/FPS); const vf=new VideoFrame(cv,{timestamp:Math.round(f*1e6/FPS),duration:Math.round(1e6/FPS)});
    ve.encode(vf,{keyFrame:f%60===0}); vf.close();
    if(ve.encodeQueueSize>8 || f%15===0){ onProgress&&onProgress((frames-f)/FPS); await new Promise(r=>setTimeout(r,0)); } }
  await ve.flush(); await ae.flush(); if(err) throw err; ve.close(); ae.close(); muxer.finalize();
  return new Blob([muxer.target.buffer],{type:'video/mp4'}); }
async function recordVideo(mix, onProgress){
  const cfg=await videoEncodeConfig(mix.sampleRate);
  if(cfg){ try{ return await encodeVideo(mix,cfg,onProgress); }catch(e){ console.warn('frame-by-frame video failed, recording in real time instead',e); } }
  return recordVideoRT(mix,onProgress); }
/* the video's picture at time tt: the parts as lanes with a moving playhead, pulsing on each beat */
function videoPainter(mix){
  const W=720,H=1280, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d');
  const parts=S.tracks.filter(t=>t._buf), L=loopLen(), beat=60/S.bpm, title=S.title?S.title:songTitle().replace('Noodle ','');
  const draw=tt=>{
    g.fillStyle='#121418'; g.fillRect(0,0,W,H);
    const pulse=Math.max(0,1-((tt%beat)/beat)*3); g.fillStyle=`rgba(241,199,91,${0.08+0.12*pulse})`; g.beginPath(); g.arc(W/2,H*0.2,150+40*pulse,0,7); g.fill();
    g.font='700 56px Unbounded, Arial Black, sans-serif'; g.textAlign='left'; const w1=g.measureText('N').width, w2=g.measureText('oo').width, w3=g.measureText('dle').width, tx=(W-w1-w2-w3)/2; g.fillStyle='#eceef2'; g.fillText('N',tx,H*0.2+20); g.fillText('dle',tx+w1+w2,H*0.2+20); g.fillStyle='#f1c75b'; g.fillText('oo',tx+w1,H*0.2+20); g.textAlign='center';
    g.fillStyle='#9aa1ad'; g.font='500 30px Figtree, sans-serif'; g.fillText(title,W/2,H*0.2+80);
    const top=H*0.36, laneH=Math.min(130,(H*0.52)/Math.max(1,parts.length)), songEnd=S.loops*L, ph=tt>=songEnd?1:((tt%L)+L)%L/L, n=steps(), x0=60, lw=W-120;
    parts.forEach((tr,i)=>{ const y=top+i*laneH, col=INST[tr.inst].color; g.fillStyle='#1b1e24'; g.fillRect(x0,y,lw,laneH-18);
      g.fillStyle=col; g.textAlign='left'; g.font='700 24px Figtree, sans-serif'; g.fillText(partName(tr),x0,y-6+0);
      const lit=x=>{ const d=ph*n-x; return d>=0&&d<1.2?1:0.45; };
      if(tr.inst==='vox' && tr._raw){ const {x,sr}=tr._raw, va=tr.va||0, PL=pSteps(tr)*stepDur(); for(let px=0;px<lw;px+=3){ const t1=px/lw*L, rp=Math.floor(t1/PL); if(rp>0&&!pRep(tr)) break; const a=Math.floor((va+t1-rp*PL)*sr); let m=0; for(let k=a;k<a+Math.floor(L*sr/lw*3);k+=8) m=Math.max(m,Math.abs(x[k]||0)); const h=Math.min(laneH-26,m*(laneH-26)*1.6); g.globalAlpha=px/lw<ph?0.95:0.4; g.fillRect(x0+px,y+(laneH-18-h)/2,2,h); } }
      else if(INST[tr.inst].kind==='pitched'){ const ps=tr.notes.map(pitchOf); if(ps.length){ const lo=Math.min(...ps)-1, hi=Math.max(...ps)+1, rh=(laneH-26)/Math.max(6,hi-lo+1); songEvents(tr,tr.notes).forEach(nt=>{ g.globalAlpha=lit(nt.s)>0.5||(ph*n>=nt.s&&ph*n<nt.s+nt.l)?1:0.45; g.fillRect(x0+nt.s/n*lw,y+laneH-22-(pitchOf(nt)-lo+1)*rh,Math.max(4,nt.l/n*lw-3),Math.max(4,rh-2)); }); } }
      else { const rows=INST[tr.inst].kind==='drums'?S.kit.slots.map(z=>z.id).reverse():[INST[tr.inst].drum], rh=(laneH-22)/Math.max(rows.length,1); songEvents(tr,tr.hits).forEach(h=>{ const r=Math.max(0,rows.indexOf(h.d)); g.globalAlpha=lit(h.s); g.fillRect(x0+h.s/n*lw+1,y+2+r*rh,Math.max(4,lw/n-3),Math.max(4,rh-3)); }); }
      g.globalAlpha=1; });
    g.fillStyle='#eceef2'; g.fillRect(x0+ph*lw,top-4,3,parts.length*laneH-14);
    g.fillStyle='#2f343d'; g.fillRect(x0,H-120,lw,6); g.fillStyle='#ef4a3c'; g.fillRect(x0,H-120,lw*Math.min(1,tt/mix.duration),6);
    if(!isPro()){ g.fillStyle='#5d6470'; g.font='500 24px Figtree, sans-serif'; g.textAlign='center'; g.fillText('made with Noodle',W/2,H-60); }   /* the free version's tag */
  };
  return {cv,draw,W,H};
}
async function recordVideoRT(mix, onProgress){
  const mime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(m=>window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  if(!mime) throw new Error('this browser can’t record video');
  const {cv,draw}=videoPainter(mix);
  const dest=ctx.createMediaStreamDestination(), src=ctx.createBufferSource(), mon=ctx.createGain(); src.buffer=mix; src.connect(dest); mon.gain.value=0; src.connect(mon); mon.connect(ctx.destination);   // silent: keeps the graph running, nothing plays out loud
  const stream=new MediaStream([...cv.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const rec=new MediaRecorder(stream,{mimeType:mime, videoBitsPerSecond:3000000}); const chunks=[]; rec.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
  const stopped=new Promise(r=>rec.onstop=r);
  draw(0); rec.start(250); const startAt=ctx.currentTime+0.15; src.start(startAt);
  await new Promise(res=>{ const step=()=>{ const tt=ctx.currentTime-startAt; draw(Math.max(0,tt)); onProgress&&onProgress(Math.max(0,mix.duration-tt)); if(tt>=mix.duration+0.15){ res(); return; } requestAnimationFrame(step); }; requestAnimationFrame(step); });
  rec.stop(); await stopped; try{ mon.disconnect(); }catch(e){}
  return new Blob(chunks,{type:mime.split(';')[0]});
}
async function offerFile(filename, blob){
  let dl=null; try{ if(window.claude&&window.claude.use) dl=await window.claude.use('downloads'); }catch(e){}
  if(dl && !/\.(gif|png|jpe?g|webp|mp4|webm|mov|txt|json|md|docx|pptx|epub|csv|ttf|html|svg|pdf|xlsx|zip|fig)$/i.test(filename)){ const u=new Uint8Array(await blob.arrayBuffer()); blob=zip([{name:filename,data:u}]); filename=filename.replace(/\.[^.]+$/,'')+'.zip'; }
  if(dl){ try{ await dl.save({filename,data:blob}); toast('Saved '+filename); } catch(e){ if(e&&e.code==='declined') toast('Download cancelled'); else toast('The download couldn’t start here ('+(e&&e.code||'error')+').'); } return; }
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },4000);
}
init();
