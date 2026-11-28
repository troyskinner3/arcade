"use strict";
/* ============================== before → after video ==============================
   The share video that sells Noodle (noodle/SHARE_VIDEO.md): one bar of what you put in (your hum, beatbox or singing as the mic
   heard it; for a part you drew or played, that part alone), then a hard cut on the next downbeat to the whole song picking up at
   the next bar, so it flows straight on. Captions: "So I went like this…" then "To make this." */
const BA_BEFORE='So I went like this…', BA_AFTER='To make this.', BA_MAX_S=15;

/* A part's own recording, kept on the phone so the video can play it after Noodle closes (vocals already keep theirs). Saved under
   'src'+id: not in song links or backups (only 'vox' recordings travel), so nothing new leaves the phone. */
function keepSource(tr){ try{ if(!tr||!tr._raw||tr.inst==='vox'||!tr._an||!(tr._an.align>=0)) return false; const {x,sr}=tr._raw, pcm=new Int16Array(x.length);
  for(let i=0;i<x.length;i++) pcm[i]=Math.max(-32767,Math.min(32767,Math.round(x[i]*32767)));
  tr.srcAlign=+tr._an.align.toFixed(4); tr.srcBpm=S.bpm; takeStore.put('src'+tr.id,{sr,pcm}); return true; }catch(e){ return false; } }
/* the recording behind a part, with `at` = the second in it where the part's first step is, and the tempo it was recorded at */
async function baSource(tr, depth=0){
  if(tr.inst==='vox'){ if(!tr._raw && tr.va!=null){ try{ await loadVox(tr); }catch(e){} } return tr._raw?{x:tr._raw.x, sr:tr._raw.sr, at:tr.va||0, bpm:S.bpm}:null; }
  if(tr._raw && tr._an && tr._an.align>=0) return {x:tr._raw.x, sr:tr._raw.sr, at:tr._an.align, bpm:tr.srcBpm||S.bpm};
  if(tr.srcAlign!=null){ const r=await takeStore.get('src'+tr.id); if(r&&r.pcm&&r.pcm.length&&r.sr>0){ const x=new Float32Array(r.pcm.length); for(let i=0;i<x.length;i++) x[i]=r.pcm[i]/32767; return {x, sr:r.sr, at:tr.srcAlign, bpm:tr.srcBpm||S.bpm}; } }
  const o=tr.copyOf!=null&&depth<4&&S.tracks.find(t=>t.id===tr.copyOf); return o?baSource(o,depth+1):null; }   /* a copy plays the same recording */
/* what kind of "before" a part gives: hummed, sang, beatboxed (from the mic), or just the part ("part": drawn, Play Pad, typed) */
const baType=(tr,src)=>!src?'part':tr.inst==='vox'?'sing':INST[tr.inst].kind==='pitched'?'hum':'beatbox';
/* The parts the video can start with, best first (owner, 28 Nov). Parts recorded with the mic: hummed, then sung, then beatboxed, each the
   earliest first. With none: Lead, then Keys and other tune parts, then Bass, then drums. More settings in Share picks another (S.baPart). */
const BA_TYPE_RANK={hum:0, sing:1, beatbox:2}, BA_INST_RANK=t=>t.inst==='lead'?0:t.inst==='keys'?1:t.inst==='bass'?3:INST[t.inst].kind==='pitched'?2:4;
async function baChoices(){
  const ps=S.tracks.filter(t=>hasContent(t)&&!t.guide&&!t.mfx&&!t._pvTemp&&INST[t.inst].kind!=='mix'&&t.inst!=='fx'&&(t.inst==='vox'||(t.notes&&t.notes.length)||(t.hits&&t.hits.length)));
  const mic=[]; for(const t of ps){ const src=await baSource(t); if(src) mic.push({tr:t, src, type:baType(t,src)}); }
  if(mic.length) return mic.sort((a,b)=>BA_TYPE_RANK[a.type]-BA_TYPE_RANK[b.type]||(a.tr.off||0)-(b.tr.off||0));
  return ps.filter(t=>t.inst!=='vox').map(t=>({tr:t, src:null, type:'part'})).sort((a,b)=>BA_INST_RANK(a.tr)-BA_INST_RANK(b.tr)||(a.tr.off||0)-(b.tr.off||0)); }
async function baPick(){ const cs=await baChoices(); return cs.find(c=>c.tr.id===S.baPart)||cs[0]||null; }
const baLabel=c=>partName(c.tr)+({hum:' (hummed)', sing:' (sung)', beatbox:' (beatboxed)'}[c.type]||'');
const baRms=(d,a,b)=>{ let s=0, n=0; for(let i=Math.max(0,a);i<Math.min(d.length,b);i+=4){ s+=d[i]*d[i]; n++; } return n?Math.sqrt(s/n):0; };
/* The audio: [bar B of the before part] then the song from bar B+1. A bar shorter than 2 s (fast songs) becomes 2 bars, so there's
   time to hear it. The before is turned up to sit just under the song, so the cut hits harder without jumping in volume. */
async function baMix(){
  const pick=await baPick(); if(!pick) throw new Error('nothing to show yet');
  const {tr,src,type}=pick, sr=ctx.sampleRate, bar=16*stepDur(), n16=steps(), songBars=Math.max(1,Math.round(n16/16));
  const B=Math.floor((tr.off||0)/16)%songBars, nb=bar<2?2:1, cutBar=B+nb;
  const after=Math.max(2,Math.min(8,Math.floor((BA_MAX_S-nb*bar)/bar)));   /* about 15 s in all */
  const K=cutBar+after<=songBars?1:2;   /* near the song's end it carries on from bar 1 (a song made to loop) */
  const mix=await renderMix(K,false), barN=Math.round(bar*sr), beforeN=nb*barN, tailN=Math.round(0.8*sr), afterN=Math.min(after*barN+tailN, mix.length-cutBar*barN);
  const out=new AudioBuffer({numberOfChannels:2, length:beforeN+afterN, sampleRate:sr}), before=baBefore(pick,beforeN,barN,B);
  const mL=mix.getChannelData(0), mR=mix.getChannelData(1), a0=cutBar*barN, ref=Math.max(baRms(mL,a0,a0+2*barN),baRms(mR,a0,a0+2*barN),1e-4), have=baRms(before,0,beforeN);
  let gain=have>1e-5?Math.min(24,0.8*ref/have):1; let pk=0; for(let i=0;i<beforeN;i++) pk=Math.max(pk,Math.abs(before[i]*gain)); if(pk>0.95) gain*=0.95/pk;
  const fadeN=Math.round(0.012*sr); for(let i=0;i<beforeN;i++) before[i]*=gain*(i>beforeN-fadeN?(beforeN-i)/fadeN:1);   /* no click at the cut */
  const oL=out.getChannelData(0), oR=out.getChannelData(1); oL.set(before,0); oR.set(before,0);
  oL.set(mL.subarray(a0,a0+afterN),beforeN); oR.set(mR.subarray(a0,a0+afterN),beforeN);
  const f0=beforeN+after*barN; for(let i=f0;i<out.length;i++){ const k=Math.pow(Math.max(0,1-(i-f0)/tailN),2); oL[i]*=k; oR[i]*=k; }   /* ends on a bar line, the last notes ringing out */
  out._ba={cut:beforeN/sr, w0:cutBar*16, w1:(cutBar+after)*16, n16, type, partId:tr.id, before, beforeBars:nb, afterBars:after};
  return out; }
/* the before as it sounds (not yet turned up): bar B of the part's recording, or of the part itself */
function baBefore(pick,beforeN,barN,B){ const {tr,src}=pick, sr=ctx.sampleRate, before=new Float32Array(beforeN);
  if(src){ const rel=(B*16-(tr.off||0))*(60/src.bpm/4), x=biquad(src.x,'hp',80,0.707,src.sr);   /* light clean-up: no rumble. Played as recorded (never sped up), so a tempo changed later doesn't change your voice */
    for(let i=0;i<beforeN;i++){ const p=(src.at+rel+i/sr)*src.sr, i0=Math.floor(p), fr=p-i0; before[i]=(x[i0]||0)*(1-fr)+(x[i0+1]||0)*fr; } }
  else if(tr._buf){ const L=tr._buf.getChannelData(0), R=tr._buf.numberOfChannels>1?tr._buf.getChannelData(1):L, a=B*barN; for(let i=0;i<beforeN;i++){ const j=(a+i)%L.length; before[i]=0.5*((L[j]||0)+(R[j]||0)); } }
  return before; }
/* More settings → Starts with: play a choice's before, turned up a little, so you can hear which is best */
let baPrevSrc=null;
async function baPreview(c){ try{ ensureCtx(); if(baPrevSrc){ try{ baPrevSrc.stop(); }catch(e){} baPrevSrc=null; } await renderDirty(); const sr=ctx.sampleRate, barN=Math.round(16*stepDur()*sr), nb=16*stepDur()<2?2:1;
  const d=baBefore(c,nb*barN,barN,Math.floor((c.tr.off||0)/16)%Math.max(1,Math.round(steps()/16))); let pk=1e-4; for(let i=0;i<d.length;i++) pk=Math.max(pk,Math.abs(d[i])); const g=Math.min(12,0.8/pk);
  const ab=ctx.createBuffer(1,d.length,sr), o=ab.getChannelData(0); for(let i=0;i<d.length;i++) o[i]=d[i]*g; const s0=ctx.createBufferSource(); s0.buffer=ab; s0.connect(ctx.destination); s0.start(); baPrevSrc=s0; }catch(e){} }
/* the picture: the caption, the before as a waveform drawn while you hear it, a flash on the cut, then the song's parts as lanes */
function baPainter(mix,px){
  const W=720,H=1280, {cv,g}=videoCanvas(px), A=mix._ba, beat=60/S.bpm, bar=4*beat;
  const parts=S.tracks.filter(t=>hasContent(t)&&!t.guide&&!t.mfx&&!t._pvTemp&&INST[t.inst].kind!=='mix'), win=A.w1-A.w0;
  const COLS=120, peaks=new Float32Array(COLS); { const d=A.before, per=Math.floor(d.length/COLS); let mx=1e-4; for(let c=0;c<COLS;c++){ let m=0; for(let i=c*per;i<(c+1)*per;i+=8) m=Math.max(m,Math.abs(d[i]||0)); peaks[c]=m; mx=Math.max(mx,m); } for(let c=0;c<COLS;c++) peaks[c]=Math.pow(peaks[c]/mx,0.7); }
  const lead=S.tracks.find(t=>t.id===A.partId), leadCol=lead?INST[lead.inst].color:'#f1c75b';
  const caption=(t,y)=>{ g.textAlign='center'; g.fillStyle='#eceef2'; g.font='700 64px "Barlow Semi Condensed", Barlow, sans-serif'; g.fillText(t,W/2,y); };
  const draw=tt=>{
    g.fillStyle='#121418'; g.fillRect(0,0,W,H);
    if(tt<A.cut){ const f=tt/A.cut, pulse=Math.max(0,1-((tt%beat)/beat)*3);
      caption(BA_BEFORE,H*0.27);
      const x0=60, lw=W-120, cy=H*0.5, hh=200, cw=lw/COLS;
      for(let c=0;c<COLS;c++){ const on=c/COLS<f, h=Math.max(4,peaks[c]*hh*(on?1:0.9)); g.globalAlpha=on?1:0.25; g.fillStyle=on?leadCol:'#5d6470'; g.fillRect(x0+c*cw,cy-h/2,Math.max(2,cw-2),h); }
      g.globalAlpha=1; g.fillStyle='#eceef2'; g.fillRect(x0+f*lw-1.5,cy-hh/2-30,3,hh+60);
      g.fillStyle=`rgba(241,199,91,${0.25+0.5*pulse})`; for(let b=0;b<4*A.beforeBars;b++){ g.beginPath(); g.arc(x0+(b+0.5)/(4*A.beforeBars)*lw,cy+hh/2+70,b===Math.floor(tt/beat)?9:5,0,7); g.fill(); }   /* the beats of the bar */
    } else { const ta=tt-A.cut, ph=Math.min(1,ta/((A.w1-A.w0)*stepDur())), pulse=Math.max(0,1-((ta%beat)/beat)*3), sp=A.w0+ph*win;
      caption(BA_AFTER,H*0.27);
      const top=H*0.36, laneH=Math.min(200,(H*0.5)/Math.max(1,parts.length)), x0=60, lw=W-120, X=s=>x0+(s-A.w0)/win*lw;
      parts.forEach((tr,i)=>{ const y=top+i*laneH, col=INST[tr.inst].color, hh=laneH-30; g.fillStyle='#1b1e24'; g.fillRect(x0,y,lw,laneH-14);
        g.fillStyle=col; g.textAlign='left'; g.font='700 22px Barlow, sans-serif'; g.fillText(partName(tr),x0+8,y+24);
        const evs=(list,f)=>{ for(const k of [0,1]) for(const e of songEvents(tr,list)){ const s=e.s+k*A.n16; if(s+(e.l||1)<=A.w0||s>=A.w1) continue; f(e,s); } };
        g.fillStyle=col;
        if(INST[tr.inst].kind==='pitched'&&tr.notes&&tr.notes.length){ const ps=tr.notes.map(pitchOf), lo=Math.min(...ps)-1, hi=Math.max(...ps)+1, rh=(hh-8)/Math.max(6,hi-lo+1);
          evs(tr.notes,(nt,s)=>{ const on=sp>=s&&sp<s+nt.l; g.globalAlpha=on?1:sp>s?0.75:0.35; g.fillRect(X(Math.max(s,A.w0)),y+laneH-18-(pitchOf(nt)-lo+1)*rh,Math.max(4,(Math.min(s+nt.l,A.w1)-Math.max(s,A.w0))/win*lw-2),Math.max(4,rh-2)); }); }
        else if(tr.hits&&tr.hits.length){ const rows=INST[tr.inst].kind==='drums'?S.kit.slots.map(z=>z.id).reverse():[INST[tr.inst].drum], rh=(hh-4)/Math.max(rows.length,1);
          evs(tr.hits,(h,s)=>{ const r=Math.max(0,rows.indexOf(h.d)), d=sp-s; g.globalAlpha=d>=0&&d<1.5?1:d>=0?0.7:0.35; g.fillRect(X(s),y+30+r*rh,Math.max(4,lw/win-2),Math.max(3,rh-2)); }); }
        else if(tr.inst==='vox'&&tr._raw){ g.globalAlpha=0.8; for(let px2=0;px2<lw;px2+=4){ const s=A.w0+px2/lw*win; g.globalAlpha=s<sp?0.95:0.35; const h=hh*0.5*(0.4+0.6*Math.abs(Math.sin(s*1.7))); g.fillRect(x0+px2,y+laneH/2-h/2+8,2,h); } }
        g.globalAlpha=1; });
      g.fillStyle='#eceef2'; g.fillRect(x0+ph*lw-1.5,top-6,3,parts.length*laneH-8);
      g.fillStyle=`rgba(241,199,91,${0.10+0.2*pulse})`; g.fillRect(x0,top+parts.length*laneH+10,lw,8);
      const fl=Math.max(0,1-ta/0.22); if(fl>0){ g.fillStyle=`rgba(255,255,255,${0.55*fl})`; g.fillRect(0,0,W,H); }   /* the cut */
    }
    vWatermark(g); vEndCard(g,mix,tt);
  };
  return {cv,draw,W:cv.width,H:cv.height};
}
