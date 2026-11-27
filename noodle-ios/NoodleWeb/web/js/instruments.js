"use strict";
/* ---- instruments (work in any AudioContext / OfflineAudioContext) ---- */
const noiseCache=new WeakMap();
function noise(c){ let b=noiseCache.get(c); if(!b){ b=c.createBuffer(1,c.sampleRate,c.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; noiseCache.set(c,b); } const s=c.createBufferSource(); s.buffer=b; s.loop=true; return s; }
const voiceCache=new WeakMap();
function voiceBuffer(c,sl){
  if(!sl||!sl.voice) return null; let m=voiceCache.get(c); if(!m){ m=new Map(); voiceCache.set(c,m); }
  const key=sl.id+':'+sl.voice.b64.length; if(m.has(key)) return m.get(key);
  const bin=atob(sl.voice.b64), n=bin.length>>1, b=c.createBuffer(1,n,sl.voice.sr), d=b.getChannelData(0);
  for(let i=0;i<n;i++){ let v=bin.charCodeAt(2*i)|(bin.charCodeAt(2*i+1)<<8); if(v>32767) v-=65536; d[i]=v/32768; }
  m.set(key,b); return b;
}
function tone(c,out,t,f0,f1,sweep,dec,pk,type='sine'){ const o=c.createOscillator(), g=c.createGain(); o.type=type; o.frequency.setValueAtTime(f0,t); if(f1!==f0) o.frequency.exponentialRampToValueAtTime(f1,t+sweep);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(pk,t+0.002); g.gain.exponentialRampToValueAtTime(0.0005,t+dec); o.connect(g); g.connect(out); o.start(t); o.stop(t+dec+0.03); }
function noiseHit(c,out,t,type,f,q,att,dec,pk){ const n=noise(c), fl=c.createBiquadFilter(), g=c.createGain(); fl.type=type; fl.frequency.value=f; fl.Q.value=q;
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(pk,t+att); g.gain.exponentialRampToValueAtTime(0.0005,t+att+dec); n.connect(fl); fl.connect(g); g.connect(out); n.start(t); n.stop(t+att+dec+0.03); }
function metal(c,out,t,dec,pk,bpf,hpf){ const g=c.createGain(), bp=c.createBiquadFilter(), hp=c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=bpf; bp.Q.value=0.9; hp.type='highpass'; hp.frequency.value=hpf;
  [205.3,304.4,369.6,522.7,540,800].forEach(f=>{ const o=c.createOscillator(); o.type='square'; o.frequency.value=f; o.connect(bp); o.start(t); o.stop(t+dec+0.05); });
  bp.connect(hp); hp.connect(g); g.connect(out); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(pk,t+0.002); g.gain.exponentialRampToValueAtTime(0.0005,t+dec); }
function drumHit(c,out,drumId,t,v,style,T){
  let drum=soundOf(drumId); { const sl=slotOf(drumId); if(sl&&sl.kit) style=sl.kit; }   /* your own kit: each drum can come from any kit */
  if(KIT_SAMPLED[style]){ const e=SMP[KIT_SAMPLED[style]]; if(e&&e.ok&&e.slots[drum]){ kitHit(c,out,e,drum,t,v,T); return; } if(!e) loadSmp(KIT_SAMPLED[style]); }
  switch(drum){
    case 'openhat': noiseHit(c,out,t,'highpass',7000+T*1500,0.7,0.002,0.3+T*0.4,0.3*v); metal(c,out,t,0.3+T*0.3,0.06*v,10000,7000); return;
    case 'rim': tone(c,out,t,1750,1650,0.02,0.045,0.45*v,'triangle'); noiseHit(c,out,t,'bandpass',3200,1,0.001,0.02,0.45*v); return;
    case 'snap': noiseHit(c,out,t,'bandpass',2600+T*1200,2.5,0.001,0.03,0.8*v); tone(c,out,t,1150,1100,0.01,0.025,0.15*v); return;
    case 'tomhi': case 'tommid': case 'tomlo': { const f=({tomhi:205,tommid:145,tomlo:98})[drum]*(0.85+0.3*T);
      tone(c,out,t,f*1.7,f,0.07,0.32+T*0.35,0.9*v); noiseHit(c,out,t,'bandpass',1200,0.8,0.001,0.03,0.12*v); return; }
    case 'conga': tone(c,out,t,360*(0.8+0.4*T),320*(0.8+0.4*T),0.03,0.22,0.7*v); noiseHit(c,out,t,'bandpass',2200,1,0.001,0.012,0.2*v); return;
    case 'block': tone(c,out,t,980,950,0.01,0.06,0.6*v); tone(c,out,t,1560,1520,0.01,0.035,0.25*v); return;
    case 'cowbell': { const g=c.createGain(), bp=c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=800; bp.Q.value=2.2; bp.connect(g); g.connect(out);
      [540,800].forEach(f=>{ const o=c.createOscillator(); o.type='square'; o.frequency.value=f*(0.9+0.2*T); o.connect(bp); o.start(t); o.stop(t+0.45); });
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.3*v,t+0.002); g.gain.exponentialRampToValueAtTime(0.0005,t+0.3+T*0.15); return; }
    case 'shaker': noiseHit(c,out,t,'bandpass',6500+T*2000,1.4,0.018,0.07,0.4*v); return;
    case 'tamb': noiseHit(c,out,t,'highpass',7000,0.7,0.002,0.14,0.28*v); metal(c,out,t,0.12,0.12*v,9000,6000); return;
    case 'crash': noiseHit(c,out,t,'highpass',3500+T*2000,0.7,0.002,1.3+T,0.32*v); metal(c,out,t,1.1+T*0.6,0.08*v,8000,5000); return;
    case 'ride': metal(c,out,t,0.8+T*0.6,0.16*v,8500,5000); tone(c,out,t,3300,3300,0.01,0.6,0.05*v); noiseHit(c,out,t,'highpass',8000,0.7,0.002,0.35,0.07*v); return;
    case 'boom': tone(c,out,t,140,45+T*12,0.12,0.9+T*0.9,1.0*v); return;
    case 'zap': tone(c,out,t,2400,120,0.18,0.22,0.3*v,'sawtooth'); return;
    case 'voice': { const b=voiceBuffer(c,slotOf(drumId)); if(!b){ drum='clap'; break; } const s=c.createBufferSource(), g=c.createGain(); s.buffer=b; s.playbackRate.value=0.7+T*0.6; g.gain.value=0.85*v; s.connect(g); g.connect(out); s.start(t); return; }
  }
  if(drum==='kick'){
    const o=c.createOscillator(), g=c.createGain(); const base=40+T*22;
    const dec = style==='808'?0.45+T*0.7: style==='EDM'?0.38+T*0.35 : style==='Rock'?0.18+T*0.14 : style==='Punchy'?0.26+T*0.22:0.3+T*0.3;
    o.frequency.setValueAtTime(base*(style==='Punchy'||style==='EDM'?7:style==='Rock'?5:4.2),t); o.frequency.exponentialRampToValueAtTime(base,t+(style==='808'?0.08:0.045));
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v,t+0.003); g.gain.exponentialRampToValueAtTime(0.0006,t+dec);
    o.connect(g); g.connect(out); o.start(t); o.stop(t+dec+0.03);
    if(style!=='808'){ const n=noise(c), f=c.createBiquadFilter(), ng=c.createGain(); f.type='highpass'; f.frequency.value=1800; ng.gain.setValueAtTime(0.28*v,t); ng.gain.exponentialRampToValueAtTime(0.001,t+0.018); n.connect(f); f.connect(ng); ng.connect(out); n.start(t); n.stop(t+0.03); }
  } else if(drum==='snare'){
    const n=noise(c), f=c.createBiquadFilter(), ng=c.createGain(); const dec=(style==='EDM'?0.2:style==='Rock'?0.17:0.12)+T*0.18;
    if(style==='Rock'){ f.type='bandpass'; f.frequency.value=2100+T*1200; f.Q.value=0.6; } else if(style==='808'){ f.type='bandpass'; f.frequency.value=2600+T*2000; f.Q.value=0.7; } else { f.type='highpass'; f.frequency.value=1100+T*1600; }
    ng.gain.setValueAtTime(0.0001,t); ng.gain.exponentialRampToValueAtTime(0.55*v,t+0.002); ng.gain.exponentialRampToValueAtTime(0.0008,t+dec);
    n.connect(f); f.connect(ng); ng.connect(out); n.start(t); n.stop(t+dec+0.02);
    const o=c.createOscillator(), g=c.createGain(); o.type=style==='808'?'sine':'triangle'; const bf=style==='808'?235:195;
    o.frequency.setValueAtTime(bf,t); o.frequency.exponentialRampToValueAtTime(bf*0.78,t+0.06);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.5*v,t+0.002); g.gain.exponentialRampToValueAtTime(0.0008,t+(style==='808'?0.16:0.1));
    o.connect(g); g.connect(out); o.start(t); o.stop(t+0.2);
    if(style!=='Rock') tone(c,out,t,bf*1.65,bf*1.65*0.85,0.05,style==='808'?0.12:0.08,0.22*v,'sine');   /* the second body tone */
  } else if(drum==='hat'){
    const n=noise(c), f=c.createBiquadFilter(), f2=c.createBiquadFilter(), g=c.createGain(); const dec=0.035+T*0.09;
    f.type='highpass'; f.frequency.value=6500+T*1500; f2.type='peaking'; f2.frequency.value=10000; f2.gain.value=style==='Punchy'?6:2;
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.32*v,t+0.001); g.gain.exponentialRampToValueAtTime(0.0008,t+dec);
    n.connect(f); f.connect(f2); f2.connect(g); g.connect(out); n.start(t); n.stop(t+dec+0.02);
    if(style==='Rock') metal(c,out,t,dec+0.05,0.07*v,9000,6500);
    else if(style==='808'||style==='Punchy') metal(c,out,t,dec+0.02,0.05*v,10000,7000);   /* the metallic ring of a drum machine's hats */
  } else { // clap (also the fallback for anything unknown)
    const n=noise(c), f=c.createBiquadFilter(), g=c.createGain(); f.type='bandpass'; f.frequency.value=1100+T*900; f.Q.value=1.1;
    g.gain.setValueAtTime(0,t);
    for(let k=0;k<3;k++){ const tk=t+k*0.011; g.gain.setValueAtTime(0.0001,tk); g.gain.exponentialRampToValueAtTime(0.7*v,tk+0.001); g.gain.exponentialRampToValueAtTime(0.08*v,tk+0.010); }
    g.gain.setValueAtTime(0.5*v,t+0.034); g.gain.exponentialRampToValueAtTime(0.0008,t+0.034+0.12+T*0.15);
    n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t+0.4);
  }
}
/* One recorded drum hit: the layer for its velocity, a little quieter within the layer, Tone tunes it (±3 semitones). A closed hat or pedal cuts a ringing open hat, as on a real kit. */
function kitHit(c,out,e,drum,t,v,T){ const ls=e.slots[drum], L=ls.find(x=>v<=x.maxV+1e-9)||ls[ls.length-1], lo=ls.indexOf(L)?ls[ls.indexOf(L)-1].maxV:0;
  const src=c.createBufferSource(), g=c.createGain(); src.buffer=L.buf; src.playbackRate.value=Math.pow(2,(T-0.5)*0.5);
  g.gain.value=(e.meta.gain||1)*((e.meta.slotGain||{})[drum]||1)*(0.7+0.3*clamp((v-lo)/Math.max(1e-3,L.maxV-lo),0,1)); src.connect(g); g.connect(out); src.start(t,L.buf.off);
  if(drum==='openhat'){ if(!c._oh||t>=c._oh.t) c._oh={g,t}; }
  else if(drum==='hat' && c._oh && t>c._oh.t){ c._oh.g.gain.setTargetAtTime(0,t,0.025); c._oh=null; } }
let EXPR_DET=null, VOICE_DONE=null;   // VOICE_DONE: while rendering a part, each note's output and when it has finished (so it can be let go)   // Follow my voice: a pitch-bend curve (cents) every oscillator of the next voice follows
let ENV_OVR=null, ENV_LAST=null;   // a part's own ADSR (replaces the sound's), and the last envelope a sound asked for
/* ---- Sampled instruments: real recordings, played back at the right pitch and loudness ----
   Built by samples/build_samples.py from open libraries (see samples/CREDITS.md). Each instrument loads the first time a song uses it;
   until then (or if it can't load) the synthesized sound of the same name plays, so nothing ever goes silent. */
const SAMPLED={'Piano':'piano','E-piano':'epiano','Strings':'strings','Rock bass':'bass','Guitar':'guitar','Acoustic guitar':'acoustic','Nylon guitar':'nylon','Clean guitar':'cleangtr','Finger bass':'fingerbass','Marimba':'marimba','Glockenspiel':'glock','Flute':'flute','Horns':'horn','Trumpet':'trumpet','Clarinet':'clarinet','Xylophone':'xylo'};
const SOUND_CREDITS=[   /* shown in More > Sound credits (required by CC BY; CC0 libraries are listed too, as thanks) */
  {sound:'Piano', lib:'Salamander Grand Piano', by:'Alexander Holm', lic:'CC BY 3.0', url:'https://creativecommons.org/licenses/by/3.0/'},
  {sound:'Strings, Marimba, Glockenspiel, Flute, Horns', lib:'VS Chamber Orchestra: Community Edition', by:'Versilian Studios', lic:'CC0 (public domain)', url:'https://creativecommons.org/publicdomain/zero/1.0/'},
  {sound:'Rock bass', lib:'Growlybass', by:'Karoryfer Samples', lic:'CC0 (public domain)', url:'https://creativecommons.org/publicdomain/zero/1.0/'},
  {sound:'Glass, Chip, Theremin, Vowel pad, Digital pad, Growl', lib:'Adventure Kid Waveforms (AKWF)', by:'Kristoffer Ekstrand', lic:'CC0 (public domain)', url:'https://creativecommons.org/publicdomain/zero/1.0/'},
  {sound:'Rock drums', lib:'Big Rusty Drums', by:'Karoryfer Samples', lic:'CC0 (public domain)', url:'https://creativecommons.org/publicdomain/zero/1.0/'},
  {sound:'Brushes drums', lib:'Swirly Drums', by:'Karoryfer Samples', lic:'CC0 (public domain)', url:'https://creativecommons.org/publicdomain/zero/1.0/'},
  {sound:'Guitar', lib:'Emilyguitar', by:'Karoryfer Samples', lic:'CC0 (public domain)', url:'https://creativecommons.org/publicdomain/zero/1.0/'},
  {sound:'Acoustic guitar, Nylon guitar', lib:'Meta Steel Guitar and Meta Nylon Guitar (Meta Open Sound)', by:'Meta', lic:'CC0 (public domain)', url:'https://creativecommons.org/publicdomain/zero/1.0/'},
  {sound:'Clean guitar', lib:'Electric Guitar FSBS', by:'FreePats', lic:'CC0 (public domain)', url:'https://creativecommons.org/publicdomain/zero/1.0/'},
  {sound:'Finger bass', lib:'Fashionbass', by:'Karoryfer Samples', lic:'CC0 (public domain)', url:'https://creativecommons.org/publicdomain/zero/1.0/'},
  {sound:'Musical mode and Finish song (melodies, chords, bass)', lib:'PDMX: a public-domain MusicXML dataset', by:'Phillip Long, Zachary Novack, Taylor Berg-Kirkpatrick and Julian McAuley', lic:'CC BY 4.0', url:'https://creativecommons.org/licenses/by/4.0/'},
  {sound:'E-piano', lib:'Wurlitzer EP200 from Greg Sullivan’s E-Pianos', by:'Greg Sullivan', lic:'CC BY 3.0', url:'https://creativecommons.org/licenses/by/3.0/'},
];   /* sound name -> folder in samples/ */
const SMP={};
/* a sound's own envelope (what the Envelope sliders start from): a synth's, read by playing it silently once; a recording's: as recorded */
const ENV_DEF={};
function envDefault(sound){ if(ENV_DEF[sound]) return ENV_DEF[sound]; let d=null;
  if(SAMPLED[sound]) d={a:0.002, d:2.5, s:1, r:(SMP[SAMPLED[sound]]&&SMP[SAMPLED[sound]].meta&&SMP[SAMPLED[sound]].meta.release)||0.25};
  else { try{ const oc=new OfflineAudioContext(1,128,8000), keep=ENV_OVR; ENV_OVR=null; ENV_LAST=null; voice(oc,oc.destination,sound,0,0.1,60,0.8,0.5); ENV_OVR=keep; d=ENV_LAST; }catch(e){} }
  return ENV_DEF[sound]=Object.assign({a:0.005,d:0.2,s:0.7,r:0.1},d||{}); }
const STRUM=new Set(['Acoustic guitar','Nylon guitar','Clean guitar','Guitar']);   /* chords on a guitar are strummed: each string 13 ms after the last */
const GLIDE=new Set(['Glide lead','Whistle lead']);   /* these slide into any note that starts where the last one ends */
const KIT_SAMPLED={'Rock':'rockkit','Brushes':'brushkit'};   /* drum kits played from recordings (by kit name; separate from instrument sounds, which reuse some names) */
function smpReady(sound){ const k=SAMPLED[sound]; return !!(k && SMP[k] && SMP[k].ok); }
const kitReady=style=>{ const e=SMP[KIT_SAMPLED[style]]; return !!(e&&e.ok); };
function loadSampled(sound){ return loadSmp(SAMPLED[sound]); }
function loadSmp(k){ if(!k) return Promise.resolve(false); if(SMP[k]) return SMP[k].p;
  const e=SMP[k]={ok:false}; e.p=(async()=>{ try{
      const meta=await (await fetch(`samples/${k}/map.json`)).json(), dc=new OfflineAudioContext(2,1,32000);   /* decoded at 32 kHz: everything up to 16 kHz, a third less memory than 48 kHz */
      const one=async f=>{ const ab=await (await fetch(`samples/${k}/${f}`)).arrayBuffer(); const b=await new Promise((res,rej)=>{ const q=dc.decodeAudioData(ab,res,rej); if(q&&q.then) q.then(res,rej); });
        const d=b.getChannelData(0); let pk=0; for(let i=0;i<Math.min(d.length,b.sampleRate*0.3);i++) pk=Math.max(pk,Math.abs(d[i]));   /* where the note starts: MP3 adds a little silence first */
        let i0=0; const th=pk*0.01; while(i0<d.length && Math.abs(d[i0])<th) i0++; b.off=Math.max(0,i0/b.sampleRate-0.001); return b; };
      e.layers=[]; const files=new Map(), file=f=>{ if(!files.has(f)) files.set(f,one(f)); return files.get(f); };
      if(meta.slots){ e.slots={}; await Promise.all(Object.entries(meta.slots).map(async([sl,ls])=>{ e.slots[sl]=await Promise.all(ls.map(async L=>({maxV:L.maxV, buf:await file(L.file)}))); })); e.meta=meta; e.ok=true; return true; }   /* a drum kit: a few velocity layers per drum */
      for(const L of meta.layers){ if(L.regions){ const regs=await Promise.all(L.regions.map(async r=>({...r, buf:await file(r.file)}))); e.layers.push({maxV:L.maxV, regs}); continue; }   /* mapped by key range (from an SFZ), with each recording's tuning and level */
        const map=new Map(); await Promise.all(Object.entries(L.notes).map(async([mm,f])=>{ map.set(+mm, await file(f)); })); e.layers.push({maxV:L.maxV, map, roots:[...map.keys()].sort((a,b)=>a-b)}); }
      e.meta=meta; e.ok=true; return true; }catch(err){ console.error('samples',k,err); return false; } })(); return e.p; }
function sampleVoice(c,out,sound,t,dur,m,v,T,fromM){ const e=SMP[SAMPLED[sound]], L=e.layers.find(x=>v<=x.maxV+1e-9)||e.layers[e.layers.length-1];
  if(e.meta.fold&&L.regs){ const low=Math.min(...L.regs.map(r=>r.root)); while(m<low-1){ m+=12; if(fromM!==null) fromM+=12; } }   /* below the instrument's range: an octave (or two) up, as a player would */
  let root, buf, rdb=0, loop=null; if(L.regs){ let R=L.regs.find(r=>m>=r.lo&&m<=r.hi); if(!R){ R=L.regs[0]; for(const r of L.regs) if(Math.abs(r.root-m)<Math.abs(R.root-m)) R=r; } root=R.root; buf=R.buf; rdb=R.db||0; loop=R.loop||null; }
  else { root=L.roots[0]; for(const r of L.roots) if(Math.abs(r-m)<Math.abs(root-m)) root=r; buf=L.map.get(root); } const EO=ENV_OVR, rel=EO?EO.r:(e.meta.release||0.25);
  const src=c.createBufferSource(); src.buffer=buf; const rate=Math.pow(2,(m-root)/12);
  if(fromM!==null && fromM!==m){ const gt=Math.min(0.09,Math.max(0.03,dur*0.35)); src.playbackRate.setValueAtTime(rate*Math.pow(2,(fromM-m)/12),t); src.playbackRate.exponentialRampToValueAtTime(rate,t+gt); } else src.playbackRate.value=rate;
  const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=0.5; lp.frequency.value=Math.min(20000,1500*Math.pow(13,T));   /* Brightness: 1.5 kHz to the full sound; 50 = about 5.4 kHz */
  const g=c.createGain(), gv=(e.meta.gain||1)*Math.pow(10,rdb/20)*(0.3+0.7*v); if(EO){ g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(gv,t+EO.a); g.gain.setTargetAtTime(gv*EO.s,t+EO.a,EO.d/3); g.gain.setTargetAtTime(0,Math.max(t+dur,t+EO.a+0.01),EO.r/4); }   /* the track's Envelope (Pro), on recorded instruments too */
  else { g.gain.setValueAtTime(gv,t); g.gain.setTargetAtTime(0,t+dur,rel/4); }
  src.connect(lp); const A=e.meta.amp; if(A){ const pre=c.createGain(), sh=c.createWaveShaper(), hp=c.createBiquadFilter(), cab=c.createBiquadFilter(); pre.gain.value=A.pre||1; sh.curve=driveCurve(A.drive||0.3); hp.type='highpass'; hp.frequency.value=A.hp||80; cab.type='lowpass'; cab.frequency.value=A.lp||5000; cab.Q.value=0.9;   /* a light amp: drive, then a speaker-like band */
    lp.connect(pre); pre.connect(sh); sh.connect(hp); hp.connect(cab); cab.connect(g); } else lp.connect(g); g.connect(out);
  if(loop){ const lead=(buf.off+0.001)-(loop[2]||0); src.loop=true; src.loopStart=Math.max(0,lead+loop[0]); src.loopEnd=Math.min(buf.duration,lead+loop[1]); src.start(t,buf.off); src.stop(t+dur+rel*2+0.01); if(VOICE_DONE) VOICE_DONE.push({n:g,end:t+dur+rel*2+0.01}); return; }   /* a sustained sound: holds as long as the note (the loop's joins were blended when it was built) */
  const avail=(buf.duration-buf.off)/rate; src.start(t,buf.off); src.stop(t+Math.min(avail,dur+rel*2)+0.01); if(VOICE_DONE) VOICE_DONE.push({n:g,end:t+Math.min(avail,dur+rel*2)+0.01}); }
/* Single-cycle waves from AKWF by Adventure Kid (CC0): the first 48 harmonics (cosine, sine) of each. vowelOo AKWF_hvoice_0004, vowelAh AKWF_hvoice_0067, glass AKWF_fmsynth_0011, chip AKWF_vgame_0133, theremin AKWF_theremin_0015, growl AKWF_distorted_0007, digiA AKWF_granular_0019, digiB AKWF_granular_0025 */
const WT={vowelOo:[[8982.9419,-5311.8942,224.508,-4984.3912,-679.8507,-708.6655,21.8504,644.3691,138.6704,87.1964,62.8412,1675.7114,-173.8942,-242.1743,-608.9391,308.873,308.758,109.9733,-50.3032,305.8971,60.387,29.5922,-186.7175,-172.7603,-174.715,-185.0246,929.0818,-312.4866,10.9295,-26.8611,-257.2296,37.5018,-26.3848,64.4866,66.5567,-59.8809,49.1939,133.9125,89.8526,51.6887,40.8226,38.198,-39.0468,10.0091,26.2474,26.2847,31.8977,-59.4307],[4465.7908,10565.7525,2648.4877,-1555.1875,-675.6116,-362.1675,-624.7761,-445.8056,37.3508,-141.4478,147.1075,42.6546,1472.1648,-732.7636,1294.4713,-1285.2914,-238.5597,-392.8176,-42.5035,793.2413,173.228,120.3227,0.889,127.0817,25.5901,-463.4343,157.6353,135.3116,-10.5071,37.8293,-100.0834,53.2306,66.9431,-105.4245,136.1362,301.6241,71.3951,-134.0644,-20.8061,-13.412,-49.6186,47.4875,-6.0762,2.0142,-4.3545,-14.2548,144.569,49.6985]],vowelAh:[[2638.6971,-2010.2308,-2038.7921,2693.484,-260.4723,-1733.3777,2501.6348,-2919.3835,2199.9413,-655.2118,-1147.1512,1086.4051,-323.4634,-435.75,389.0348,-241.2919,269.9518,191.0123,-296.3294,236.5266,120.6917,-27.0421,36.1677,-14.2517,-95.1747,8.786,-2.142,-66.6237,0.9354,20.474,-5.2032,-7.1975,20.4011,4.3213,-12.449,4.3982,-3.9023,-26.622,-5.7124,-12.1303,-11.3197,2.6913,-6.8718,0.261,-1.7904,3.2137,-2.7895,0.2279],[649.7152,4011.9113,-2358.7534,-950.9418,2377.6517,-1312.2605,-68.5407,2671.3888,-3276.9452,2537.4199,-903.5923,-203.9169,377.354,-824.7653,-280.419,328.6448,-315.2123,619.7701,20.7652,-148.1693,164.5501,27.5821,-21.2837,66.4326,53.9492,-58.9376,18.6336,32.9535,-25.074,26.6193,0.2111,-23.4994,-7.596,8.322,-15.0109,2.8025,14.3018,-2.5571,-8.1294,9.7646,-1.9832,1.004,4.753,-0.3421,-0.5004,0.8729,-0.5922,3.9537]],glass:[[803.2288,249.2035,3843.5904,631.5817,-3520.3907,-1764.5384,875.0647,-2299.3011,-2507.5197,1650.7935,4216.6715,2254.5008,198.911,-861.1027,-1587.454,-1258.5123,-561.9827,-124.6149,991.1907,475.6472,-4.0984,117.9391,-308.9732,-58.9161,-42.5335,-116.563,99.9388,-31.7374,66.2096,22.2908,-18.7631,27.6549,-66.2124,17.2708,-36.0495,-7.1015,30.1622,-27.6802,50.1789,-18.0747,7.1901,11.3227,-38.8319,25.9822,-35.2778,8.3778,8.2138,-21.5742],[15454.9525,-247.4917,1223.0587,-1201.3263,13331.3597,-1504.452,16112.7545,919.0371,5186.4435,2750.5019,-12207.0932,-1880.5161,2831.9668,-1270.8393,5737.3525,737.6124,-191.9914,724.6376,-1516.1334,-456.9049,453.8574,-292.3688,335.4111,174.4552,-167.5368,172.4997,-85.1058,-51.9222,61.9224,-91.1533,60.324,-31.2779,-0.5305,27.4286,-52.7363,49.273,-38.1316,9.5462,24.1361,-35.7641,41.3052,-28.2531,2.98,3.2306,-26.3115,19.8246,-23.6639,20.2884]],chip:[[1848.8129,-4834.392,5977.2978,-3444.6808,-1077.4015,4316.0833,-4357.9475,1977.868,744.1332,-2030.1252,1540.1304,-157.6269,-926.8379,1149.5178,-772.8132,566.3498,-665.7727,524.7386,248.5659,-1128.3262,1137.9878,0.6184,-1191.8284,1304.6676,-363.111,-561.1709,668.2859,-232.1335,80.2004,-284.7039,351.9759,31.5089,-501.7341,505.6802,9.0249,-501.3443,662.1099,-479.0643,154.2332,149.6733,-314.6568,256.9917,42.8217,-250.8524,208.1548,-67.8931,95.3205,-252.7071],[16689.8605,2194.3549,-6151.6253,4372.9658,-1894.3231,1063.6603,2438.5978,1293.6908,-192.1324,-1047.7721,1270.2208,-332.8684,-786.2195,2911.5844,-128.4038,-1004.3536,1418.4083,-855.9316,-74.4995,578.7914,813.7822,198.9181,-243.8527,434.4877,-206.3105,-593.2642,1340.815,-310.9468,376.3191,522.6335,-685.2121,219.9149,184.83,-144.9906,702.1501,40.2195,173.9249,-189.8304,-123.2939,442.7975,-405.2217,667.0693,380.1613,-544.5744,414.524,-56.0186,-388.0815,678.0121]],theremin:[[11519.9415,-6813.3222,1.0221,1266.4043,-1927.6025,-642.2437,434.1267,-936.1651,-637.1075,138.2707,-441.4654,-508.8857,-15.1804,-168.9352,-316.5368,-54.9054,-74.0405,-78.5487,-4.018,-42.4843,-25.9325,55.2218,8.1047,-7.6883,39.7141,23.3603,6.7679,20.9945,15.4799,8.7412,9.1944,6.6917,5.4397,5.3474,3.9775,2.4365,2.5792,2.9305,1.3044,-0.3141,-0.1973,0.69,-2.2821,-4.7174,-0.0514,-2.232,-6.7375,-0.4581],[24149.6778,8483.7254,-15.0067,3350.3171,2379.6283,-170.995,1002.9502,1116.1056,-164.7704,230.4618,513.981,-104.2336,-35.6463,227.3439,-30.3232,-89.4128,10.6964,-55.1608,-42.1987,-2.4335,-88.0015,-34.9437,16.1933,-30.0706,-16.3822,21.2123,6.1559,5.995,18.7184,16.1791,15.9387,16.8951,15.3985,15.1593,15.0714,13.4472,11.6596,11.4435,11.2986,9.3092,7.1333,7.3412,8.2973,3.282,1.8436,6.0116,0.2403,-3.6279]],growl:[[12284.9427,-8.9733,679.4235,-2.6146,-10019.5994,4.8752,-9798.8629,10.2559,-1458.7011,11.1998,5165.9018,7.2985,5071.7958,0.2398,1497.2053,-6.9227,-369.1908,-11.0903,245.9337,-10.4601,448.4246,-5.3047,-1128.3994,2.1455,-2379.936,8.6676,-1224.9156,11.44,1193.1571,9.2632,2213.1863,3.0791,1259.2537,-4.4371,102.5263,-10.0337,22.766,-11.2897,277.9776,-7.6615,-263.9559,-0.719,-1155.0204,6.5347,-1031.3341,10.9613,248.8752,10.6459],[34842.1041,7.1121,348.8849,11.1475,1096.0217,10.3603,9794.3795,5.0911,13034.0374,-2.3806,8218.6507,-8.8224,1799.7779,-11.4475,-466.0198,-9.1203,734.6198,-2.8475,1427.7561,4.6571,348.2787,10.147,-170.5384,11.2472,1479.1151,7.4817,3512.9756,0.4795,3401.5568,-6.7301,1410.6127,-11.0282,-95.6603,-10.5553,-1.3873,-5.5161,534.9538,1.9095,303.0817,8.509,-145.2402,11.4274,382.478,9.4022,1643.6507,3.3094,2159.0691,-4.215]],digiA:[[1380.4868,7714.3808,-12616.0531,-160.0156,1987.9513,2557.426,-2553.9327,-1442.1463,962.6224,1220.0912,-110.4516,-1181.5817,-537.4663,1259.8313,744.6015,-1241.7259,-732.2001,1043.6847,598.6062,-667.4742,-547.8073,247.4666,595.4794,73.1861,-701.481,-229.3017,758.1666,215.4547,-684.5129,-127.655,459.893,19.7856,-35.3127,-162.6867,-234.4826,371.5784,297.3179,-455.016,-270.6248,395.6996,243.2291,-251.946,-245.6906,62.9643,312.0651,70.9101,-384.9499,-139.5305],[-6377.3976,16681.8416,-3366.5595,-2390.732,-1854.6068,679.7483,2469.2826,-742.2884,-2516.6047,392.1288,2125.5823,-318.2773,-1674.3291,87.0451,1016.5472,317.6711,-659.8063,-688.8699,401.9987,967.7747,-382.4516,-991.7523,317.4126,860.012,-232.1517,-623.9479,14.5612,451.6067,169.7658,-344.3883,-270.9304,225.8351,258.1475,-13.4762,-342.4425,-67.434,289.208,198.1809,-217.9819,-347.2772,181.2931,453.8353,-183.3013,-461.4793,161.8665,389.634,-84.9449,-287.4597]],digiB:[[-364.0434,1258.1762,2956.3967,-1304.1767,-849.7648,-3904.1354,75.1,176.2962,1610.5388,707.3101,219.6295,-1219.7877,-878.6441,-344.252,348.1907,982.5389,417.2063,335.8668,-862.6058,-371.8975,-471.6246,481.1728,405.1009,706.2229,-77.5176,-257.6774,-538.2709,-201.4341,217.9424,367.0125,563.3634,-41.509,-121.6709,-521.541,-65.5268,-44.0793,506.609,239.6903,219.6007,-276.8591,-274.7653,-217.3851,18.6564,344.6131,246.6116,197.2664,-242.2917,-174.2712],[3518.3271,3674.8299,675.6884,4029.9436,3177.4669,-672.0805,-1405.1335,-930.9515,-296.9764,1417.4132,943.6117,1342.9302,-664.0889,-403.993,-935.0321,145.1743,344.2177,1062.0478,366.4779,-24.5091,-548.7295,-561.5711,-17.508,181.3166,800.9731,190.9192,122.6486,-574.0453,-259.4359,-334.4429,382.1715,321.7855,411.6617,-79.1811,-303.5234,-342.7621,-259.4333,243.8722,245.5542,384.0497,-113.4341,-122.8214,-467.3116,-66.5396,-21.3461,378.1546,174.2877,69.4885]]}, WTC=new WeakMap();
function wtWave(c,k){ let m=WTC.get(c); if(!m){ m={}; WTC.set(c,m); } if(!m[k]){ const [re,im]=WT[k]; m[k]=c.createPeriodicWave(new Float32Array([0,...re]),new Float32Array([0,...im])); } return m[k]; }
/* String pluck: a plucked string modelled by Karplus-Strong (a burst of noise circulating in a delay one period long, softened on each pass),
   made once per note, brightness step and sample rate. Low notes ring longer. */
const KS_C=new Map();
function ksBuf(sr,m,bright){ const k=sr+'/'+m+'/'+bright; if(KS_C.has(k)){ const b=KS_C.get(k); KS_C.delete(k); KS_C.set(k,b); return b; }   /* used again: now the newest */ const f=mtof(m), t60=clamp(4.2-(m-40)*0.06,1.2,4.5), len=Math.round(sr*(t60+0.2)), y=new Float32Array(len);
  const D=sr/f-0.5, N0=Math.floor(D), fr=D-N0, rho=Math.pow(10,-3/(t60*f)), a=0.06+0.3*bright/4; let st=(m*2654435761)>>>0, lp=0;
  for(let i=0;i<=N0+1&&i<len;i++){ st^=st<<13; st^=st>>>17; st^=st<<5; const n=(st>>>0)/4294967296*2-1; lp=lp+a*(n-lp); y[i]=lp; }   /* the pluck: brighter when played harder or with more Tone */
  let prev=0; for(let i=N0+2;i<len;i++){ const sNow=y[i-N0]*(1-fr)+y[i-N0-1]*fr; y[i]=rho*0.5*(sNow+prev); prev=sNow; }
  let pk=0; for(let i=0;i<len;i++) pk=Math.max(pk,Math.abs(y[i])); for(let i=0;i<len;i++) y[i]/=pk||1;
  const b=new AudioBuffer({length:len,sampleRate:sr,numberOfChannels:1}); b.getChannelData(0).set(y); KS_C.set(k,b); if(KS_C.size>48) KS_C.delete(KS_C.keys().next().value); return b; }   /* at most ~45 MB of strings; the oldest made goes first */
function ksVoice(c,out,t,dur,m,v,T,fromM){ const b=ksBuf(c.sampleRate,Math.round(m),clamp(Math.round(T*2+v*2),0,4)), src=c.createBufferSource(), g=c.createGain(), pn=c.createStereoPanner(); src.buffer=b;
  const rate=Math.pow(2,(m-Math.round(m))/12); if(fromM!==null&&fromM!==m){ const gt=Math.min(0.09,Math.max(0.03,dur*0.35)); src.playbackRate.setValueAtTime(rate*Math.pow(2,(fromM-m)/12),t); src.playbackRate.exponentialRampToValueAtTime(rate,t+gt); } else src.playbackRate.value=rate;
  if(EXPR_DET) EXPR_DET.connect(src.detune); const pk=0.84*(0.3+0.7*v), rel=ENV_OVR?ENV_OVR.r:0.12;   /* between the Piano's level (Keys) and the Saw's (Arp) */ g.gain.setValueAtTime(pk,t); g.gain.setTargetAtTime(0,t+dur,rel/3);
  pn.pan.value=clamp((m-60)/40,-0.4,0.4); const lpf=c.createBiquadFilter(); lpf.type='lowpass'; lpf.Q.value=0.5; lpf.frequency.value=Math.min(16000,1200*Math.pow(10,T)); src.connect(lpf); lpf.connect(g); g.connect(pn); pn.connect(out);   /* Tone: 1.2 kHz to the full string */ src.start(t); src.stop(t+Math.min(b.duration,dur+rel*3)+0.02); if(VOICE_DONE) VOICE_DONE.push({n:pn,end:t+Math.min(b.duration,dur+rel*3)+0.02}); }   /* low strings a little left, high a little right, as across a harp */
/* ---- Your voice ---- */
const YV_SR=24000; let VOICE_INST=null, YV_BUF=null, YV_KEY=null;
function yvTakes(){ const out=[]; for(const t of S.tracks){ if(!(t.inst==='vox'||INST[t.inst].kind==='pitched')) continue;
    const ks=t._takes&&t._takes.length?t._takes.map(k=>({raw:k.raw,an:k.an})):t._raw?[{raw:t._raw,an:t._an}]:[];
    for(const k of ks){ if(!k.raw||!k.raw.x) continue; let fr=k.an&&k.an.notes&&k.an.notes.frames;
      if(!fr){ try{ fr=analyzeTake(k.raw.x,k.raw.sr,t.inst==='vox'?'lead':t.inst,t.sens??S.sens,true).notes.frames; }catch(e){ fr=null; } }
      if(fr&&fr.length>40) out.push({x:k.raw.x,sr:k.raw.sr,fr}); } } return out; }
/* the steadiest stretches of singing: voiced all through, loud, little pitch wobble; best first, one per take moment */
function yvMoments(){ const W=60, res=[];
  for(const k of yvTakes()){ const fr=k.fr, top=Math.max(...fr.map(f=>f.db));
    for(let i=0;i+W<=fr.length;i+=5){ const w=fr.slice(i,i+W); if(w.some(f=>!(f.conf<0.25)||f.db<top-14||f.db<-50)) continue;
      const ms=w.map(f=>f.m), mean=ms.reduce((a,b)=>a+b,0)/W, sd=Math.sqrt(ms.reduce((a,b)=>a+(b-mean)**2,0)/W);
      if(sd>0.35 || mean>78) continue;   /* above G5 is whistling: the pitch tracker can't follow it there, and it would only give a plain tone */ const sc=-8*sd-3*w.reduce((a,f)=>a+f.conf,0)/W+(w.reduce((a,f)=>a+f.db,0)/W-top)/10; res.push({k, t0:w[0].t-0.02, t1:w[W-1].t+0.02, m:median(ms), sc}); } }
  res.sort((a,b)=>b.sc-a.sc); const pick=[]; for(const r of res) if(!pick.some(p=>p.k===r.k && Math.abs(p.t0-r.t0)<0.8)) pick.push(r); return pick; }
/* cut it out, loop it on whole pitch cycles (the join blended), store it in the song */
function yvCapture(rank=0){ const ms=yvMoments(); if(!ms.length) return false; const M=ms[rank%ms.length], {x,sr}=M.k;
  const a=Math.max(0,Math.round(M.t0*sr)), z=Math.min(x.length,Math.round(M.t1*sr)); let y=biquad(biquad(x.subarray(a,z),'lp',10000,0.707,sr),'hp',70,0.707,sr);
  const n=Math.floor(y.length*YV_SR/sr), w=new Float32Array(n); for(let i=0;i<n;i++){ const q=i*sr/YV_SR, i0=Math.floor(q), f=q-i0; w[i]=(y[i0]||0)*(1-f)+(y[i0+1]||0)*f; }
  { const hop=Math.round(0.01*YV_SR), half=Math.round(0.02*YV_SR), env=[]; for(let c=0;c<n;c+=hop){ let q=0,k=0; for(let i=Math.max(0,c-half);i<Math.min(n,c+half);i++){ q+=w[i]*w[i]; k++; } env.push(Math.sqrt(q/k)+1e-6); }
    const sm=env.map((_,i)=>{ let a=0,k=0; for(let j=Math.max(0,i-3);j<=Math.min(env.length-1,i+3);j++){ a+=env[j]; k++; } return a/k; }), ref=median(sm);
    for(let i=0;i<n;i++){ const f=i/hop, i0=Math.min(sm.length-1,Math.floor(f)), i1=Math.min(sm.length-1,i0+1), e=sm[i0]+(sm[i1]-sm[i0])*(f-i0); w[i]*=ref/e; } }   /* an even level: a swell or a fade doesn't jump at each repeat */
  const ls=Math.round(0.12*YV_SR), xf=Math.round(0.07*YV_SR);
  let f0=mtof(M.m); { const a0=ls, L=Math.min(n-a0-1,Math.round(0.3*YV_SR)), nc=k=>{ let c=0,e1=0,e2=0; for(let i=a0;i<a0+L-k;i++){ c+=w[i]*w[i+k]; e1+=w[i]*w[i]; e2+=w[i+k]*w[i+k]; } return c/Math.sqrt(e1*e2+1e-12); };
    const k0=YV_SR/f0, lo=Math.max(2,Math.floor(k0/1.09)), hi=Math.ceil(k0*1.09); let bk=lo, bv=-2; for(let k=lo;k<=hi;k++){ const v=nc(k); if(v>bv){ bv=v; bk=k; } }
    const y0=nc(bk-1), y1=nc(bk), y2=nc(bk+1), den=y0-2*y1+y2, kk=bk+(Math.abs(den)>1e-9?0.5*(y0-y2)/den:0); f0=YV_SR/kk; }   /* the pitch of the part that loops (within 1.5 semitones of the moment's) */
  const root=69+12*Math.log2(f0/440), P=YV_SR/f0; let le=n-Math.round(0.01*YV_SR); le=ls+Math.max(1,Math.round((le-ls)/P))*P;
  { let best=-2, bl=Math.round(le); for(let e=Math.round(le-P);e<=Math.min(n-1,Math.round(le+P));e++){ let c=0,e1=0,e2=0; for(let j=1;j<=Math.round(P*2);j++){ const u=w[e-j]||0, v=w[ls-j]||0; c+=u*v; e1+=u*u; e2+=v*v; } const nc=c/Math.sqrt(e1*e2+1e-12); if(nc>best){ best=nc; bl=e; } } le=Math.min(n-1,bl); }   /* the end that best matches the start */
  for(let i=0;i<xf;i++){ const g=i/xf; w[le-xf+i]=w[le-xf+i]*(1-g)+w[ls-xf+i]*g; }   /* the loop's end turns into what comes just before its start */
  let q=0; for(let i=ls;i<le;i++) q+=w[i]*w[i]; const k=0.125/Math.sqrt(q/(le-ls)+1e-12); const pcm=new Int16Array(le); for(let i=0;i<le;i++) pcm[i]=clamp(Math.round(w[i]*k*32767),-32767,32767);
  let bin=''; const u8=new Uint8Array(pcm.buffer); for(let i=0;i<u8.length;i+=8192) bin+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));
  S.yv={sr:YV_SR, root:+root.toFixed(3), ls, le, pcm:btoa(bin), rank:rank%ms.length, of:ms.length}; YV_BUF=null; return true; }
function yvBuf(){ const Y=S.yv; if(!Y||!Y.pcm) return null; if(YV_BUF&&YV_KEY===Y.pcm) return YV_BUF;
  const bin=atob(Y.pcm), u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i); const pcm=new Int16Array(u8.buffer);
  const b=new AudioBuffer({length:pcm.length, sampleRate:Y.sr, numberOfChannels:1}), d=b.getChannelData(0); for(let i=0;i<pcm.length;i++) d[i]=pcm[i]/32767; YV_BUF=b; YV_KEY=Y.pcm; return b; }
function yvVoice(c,out,t,dur,m,v,T,fromM){ const b=yvBuf(), Y=S.yv, pad=VOICE_INST==='pad', E=ENV_OVR, atk=E?E.a:pad?0.22:0.025, rel=E?E.r:pad?0.6:0.18;
  const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=0.5; lp.frequency.value=Math.min(11000,1200*Math.pow(9,T)); const g=c.createGain(); g.gain.value=0;
  const pk=(pad?1.41:1.15)*(0.35+0.65*v);   /* level with Choir (Pad) and Saw (Lead) on 12 real takes, within 0.5 dB */ g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(pk,t+atk); if(E) g.gain.setTargetAtTime(pk*E.s,t+atk,E.d/3); g.gain.setTargetAtTime(0,t+Math.max(dur,atk),rel/4);
  lp.connect(g); g.connect(out); const end=t+Math.max(dur,atk)+rel*1.5+0.02;
  (pad?[[-9,-0.6,0],[0,0,0.011],[9,0.6,0.019]]:[[0,0,0],[6,0.25,0.013]]).forEach(([det,pan,dl],i)=>{ const src=c.createBufferSource(), pn=c.createStereoPanner(), sg=c.createGain(); src.buffer=b; src.loop=true; src.loopStart=Y.ls/Y.sr; src.loopEnd=Y.le/Y.sr;
    const rate=Math.pow(2,(m-Y.root)/12); src.detune.value=det; if(fromM!==null&&fromM!==m){ const gt=Math.min(0.09,Math.max(0.03,dur*0.35)); src.playbackRate.setValueAtTime(rate*Math.pow(2,(fromM-m)/12),t); src.playbackRate.exponentialRampToValueAtTime(rate,t+gt); } else src.playbackRate.value=rate;
    if(EXPR_DET) EXPR_DET.connect(src.detune); sg.gain.value=i&&!pad?0.45:pad?0.62:1; pn.pan.value=pan; src.connect(sg); sg.connect(pn); pn.connect(lp);
    const off=pad?(i*0.137)%((Y.le-Y.ls)/Y.sr):0; src.start(t+dl, Math.min(b.duration-0.01, off?Y.ls/Y.sr+off:0)); src.stop(end); }); if(VOICE_DONE) VOICE_DONE.push({n:g,end}); }   /* pad copies start at different points of the loop, so they don't move together */
function voice(c,out,sound,t,dur,m,v,T,fromM=null){
  if(sound==='String pluck'){ ksVoice(c,out,t,dur,m,v,T,fromM); return; }
  if(sound==='Your voice'){ if(S.yv&&yvBuf()){ yvVoice(c,out,t,dur,m,v,T,fromM); return; } sound='Choir'; }   /* until there's a take to make it from */
  if(SAMPLED[sound]){ if(smpReady(sound)){ sampleVoice(c,out,sound,t,dur,m,v,T,fromM); return; } loadSampled(sound); }
  const f=mtof(m), g=c.createGain(); g.gain.value=0; g.connect(out); const oscs=[], vb=0.7+0.3*v;   /* vb: harder notes a little brighter */
  const osc=(type,freq,det=0,dest=g,gain=1)=>{ const o=c.createOscillator(); if(type.startsWith('wt:')) o.setPeriodicWave(wtWave(c,type.slice(3))); else o.type=type; o.frequency.value=freq; o.detune.value=det; if(gain!==1){ const gg=c.createGain(); gg.gain.value=gain; o.connect(gg); gg.connect(dest);} else o.connect(dest); oscs.push(o); return o; };
  const pn=(p,dest)=>{ const s=c.createStereoPanner(); s.pan.value=p; s.connect(dest); return s; };
  const ph=i=>{ const x=Math.sin(m*12.9898+i*78.233)*43758.5453; return x-Math.floor(x); };   /* each stacked voice starts at its own point in the wave (the same every render) */
  const uni=(type,freq,dets,pans,dest,gain=1,cg=gain)=>dets.map((d,i)=>{ const o=osc(type,freq,d,pans?pn(pans[i],dest):dest,d===0?cg:gain); o._ph=ph(i)/freq; return o; });
  const vib=(hz,cents,delay)=>{ const l=c.createOscillator(), lg=c.createGain(); l.frequency.value=hz; lg.gain.setValueAtTime(0,t); lg.gain.linearRampToValueAtTime(0,t+delay); lg.gain.linearRampToValueAtTime(cents,t+delay+0.35); l.connect(lg); oscs.forEach(o=>{ if(!o._lfo) lg.connect(o.detune); }); l._lfo=1; oscs.push(l); };   /* vibrato that comes in after the start, on what's been made so far */
  const fenv=(b,hi,lo,tau)=>{ b.frequency.setValueAtTime(hi,t); b.frequency.setTargetAtTime(lo,t,tau); };   /* the filter opens at the start of the note and settles */
  const lp=(fr,q=0.7)=>{ const b=c.createBiquadFilter(); b.type='lowpass'; b.frequency.value=fr; b.Q.value=q; b.connect(g); return b; };
  const env=(a,d,s,r,pk)=>{ ENV_LAST={a,d,s,r}; if(ENV_OVR){ a=ENV_OVR.a; d=ENV_OVR.d; s=ENV_OVR.s; r=ENV_OVR.r; } g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(pk,t+a); g.gain.setTargetAtTime(pk*s,t+a,d/3); const te=t+Math.max(dur,a+0.01); g.gain.setTargetAtTime(0,te,r/4); return te+r+0.05; };
  let end;
  switch(sound){
    case 'Glass': { const cut=(2500+T*8000)*vb, b=lp(cut,0.8); fenv(b,cut*1.5,cut,0.25); uni('wt:glass',f,[-6,0,6],[-0.5,0,0.5],b,0.7,1); vib(5.2,8,0.3); end=env(0.006,0.4,0.7,0.2,0.21*v); break; }
    case 'Chip': { osc('wt:chip',f,0,g); oscs[oscs.length-1].frequency.setValueAtTime(f*Math.pow(2,1/12),t); oscs[oscs.length-1].frequency.setValueAtTime(f,t+0.03); vib(6.5,14,0.25); end=env(0.002,0.12,0.8,0.06,0.338*v); break; }   /* a blip a semitone up at the start, as old game music did */
    case 'Theremin': { const b=lp((1500+T*5000)*vb,0.7); osc('wt:theremin',f,0,b); osc('wt:theremin',f,7,pn(0.35,b),0.4); vib(5.6,26,0.2); end=env(0.08,0.4,0.9,0.3,0.217*v); break; }
    case 'Vowel pad': { const cut=(1800+T*5000)*vb, b=lp(cut,0.7), oo=c.createGain(), ah=c.createGain(); oo.connect(b); ah.connect(b);
      oo.gain.setValueAtTime(1,t); oo.gain.linearRampToValueAtTime(0.35,t+1.6); ah.gain.setValueAtTime(0,t); ah.gain.linearRampToValueAtTime(1,t+1.6);   /* "oo" opening to "ah" */
      uni('wt:vowelOo',f,[-10,0,10],[-0.7,0,0.7],oo,0.8); uni('wt:vowelAh',f,[-10,0,10],[-0.7,0,0.7],ah,0.8); end=env(0.35,0.6,0.85,0.8,0.354*v); break; }
    case 'Digital pad': { const cut=(1500+T*6000)*vb, b=lp(cut,0.8), A=c.createGain(), B=c.createGain(); A.connect(b); B.connect(b); A.gain.value=0.5; B.gain.value=0.5;
      { const l=c.createOscillator(), la=c.createGain(), lb=c.createGain(); l.frequency.value=0.18+0.04*ph(5); la.gain.value=0.45; lb.gain.value=-0.45; l.connect(la); l.connect(lb); la.connect(A.gain); lb.connect(B.gain); l._lfo=1; oscs.push(l); }   /* slowly moving between two waves */
      uni('wt:digiA',f,[-8,8],[-0.7,0.7],A,0.8); uni('wt:digiB',f,[-8,8],[0.7,-0.7],B,0.8); end=env(0.3,0.6,0.85,0.7,0.332*v); break; }
    case 'Growl': { const b=lp(300,3); fenv(b,(1400+T*3600)*vb,350,0.12); osc('wt:growl',f,0,b); osc('sine',f,0,g,0.4); end=env(0.004,0.3,0.7,0.08,0.225*v); break; }
    case 'Acid': { const b=lp(200,13), sh=c.createWaveShaper(); sh.curve=driveCurve(0.3); b.disconnect(); b.connect(sh); sh.connect(g); fenv(b,(500+T*4200)*vb*(0.6+0.6*v),180,0.11); osc('sawtooth',f,0,b); end=env(0.003,0.25,0.75,0.06,0.271*v); break; }   /* a resonant filter that snaps shut, slightly driven */
    case 'Wobble': { const cut=600+T*1500, b=lp(cut,6), per=stepDur()*2; osc('sawtooth',f,0,b); osc('square',f,-7,b,0.6); osc('sine',f,0,g,0.5);
      { const l=c.createOscillator(), lg=c.createGain(); l.frequency.value=1/per; lg.gain.value=cut*0.8; l.connect(lg); lg.connect(b.frequency); l._lfo=1; l._t0=Math.max(0,Math.floor(t/per)*per); oscs.push(l); }   /* the filter opens and closes twice a beat, on the beat */
      end=env(0.004,0.2,0.85,0.08,0.185*v); break; }
    case 'Chorus pad': { const cut=(900+T*4000)*vb, b=c.createBiquadFilter(); b.type='lowpass'; b.frequency.value=cut; b.Q.value=0.7; b.frequency.setValueAtTime(cut*0.4,t); b.frequency.setTargetAtTime(cut,t,0.25);
      osc('sawtooth',f,0,b); osc('square',f/2,0,b,0.3); b.connect(g);
      [[0.0072,0.51,-0.8],[0.0091,0.83,0.8]].forEach(([dt,hz,pan])=>{ const dl=c.createDelay(0.03), l=c.createOscillator(), lg=c.createGain(), p2=pn(pan,g), dg=c.createGain(); dl.delayTime.value=dt; l.frequency.value=hz; lg.gain.value=0.0022; l.connect(lg); lg.connect(dl.delayTime); dg.gain.value=0.8; b.connect(dl); dl.connect(dg); dg.connect(p2); l._lfo=1; oscs.push(l); });   /* two moving copies, left and right: the classic chorus */
      end=env(0.12,0.6,0.85,0.6,0.146*v); break; }
    case 'Pump pad': { const cut=(1200+T*4500)*vb, b=c.createBiquadFilter(), pg=c.createGain(); b.type='lowpass'; b.frequency.value=cut; b.Q.value=0.7; b.connect(pg); pg.connect(g); uni('sawtooth',f,[-14,-5,5,14],[-0.8,-0.3,0.3,0.8],b,0.8);
      const beat=stepDur()*4, b0=Math.floor(t/beat)*beat; pg.gain.setValueAtTime(1,t); for(let bt=b0;bt<t+dur+1;bt+=beat){ if(bt<t) continue; pg.gain.setValueAtTime(0.12,bt); pg.gain.setTargetAtTime(1,bt+0.01,beat*0.3); }   /* ducks on every beat, as if pushed by the kick */
      end=env(0.05,0.5,0.9,0.5,0.205*v); break; }
    /* round 30 (owner): synths in the spirit of sounds common in modern pop, hip hop and EDM; Noodle's own oscillators, no copied presets */
    case 'Glide lead': { const cut=(1300+T*5200)*vb, b=lp(cut,1.2); fenv(b,cut*1.6,cut,0.15); uni('sawtooth',f,[-7,7],[-0.35,0.35],b,0.7); osc('square',f/2,0,b,0.18); vib(5.3,10,0.35); end=env(0.01,0.3,0.8,0.14,0.39*v); break; }   /* glides into touching notes (GLIDE) */
    case 'Sine lead': { osc('sine',f); osc('sine',f*2,0,g,0.12); osc('triangle',f,0,g,0.1); vib(5.0,6,0.45); end=env(0.012,0.4,0.85,0.18,0.24*v); break; }
    case 'Whistle lead': { const b=lp(3200+T*2500,0.7); osc('sine',f,0,b); osc('triangle',f,0,b,0.08); { const n=noise(c), nf=c.createBiquadFilter(), ng=c.createGain(); nf.type='bandpass'; nf.frequency.value=Math.min(9000,f*2); nf.Q.value=6; ng.gain.value=0.018*v; n.connect(nf); nf.connect(ng); ng.connect(g); n.start(t); n.stop(t+dur+0.6); }   /* a little breath */
      vib(5.6,22,0.28); end=env(0.035,0.3,0.9,0.2,0.23*v); break; }
    case 'Juno chords': { const cut=(1000+T*4200)*vb, b=c.createBiquadFilter(); b.type='lowpass'; b.Q.value=1.1; b.frequency.setValueAtTime(cut*2.2,t); b.frequency.setTargetAtTime(cut,t,0.12); osc('sawtooth',f,-4,b,0.7); osc('square',f,4,b,0.45); osc('square',f/2,0,b,0.2); b.connect(g);
      [[0.0065,0.6,-0.7],[0.0085,0.9,0.7]].forEach(([dt,hz,pan])=>{ const dl=c.createDelay(0.03), l=c.createOscillator(), lg=c.createGain(), dg=c.createGain(); dl.delayTime.value=dt; l.frequency.value=hz; lg.gain.value=0.0018; l.connect(lg); lg.connect(dl.delayTime); dg.gain.value=0.7; b.connect(dl); dl.connect(dg); dg.connect(pn(pan,g)); l._lfo=1; oscs.push(l); });   /* the chorus that makes it wide */
      end=env(0.006,0.45,0.6,0.35,0.256*v); break; }
    case 'Future chords': { const cut=(2600+T*7000)*vb, b=c.createBiquadFilter(), pg=c.createGain(); b.type='lowpass'; b.frequency.value=cut; b.Q.value=0.6; b.connect(pg); pg.connect(g); uni('sawtooth',f,[-22,-12,-4,4,12,22],[-0.9,-0.55,-0.2,0.2,0.55,0.9],b,0.6); uni('sawtooth',f*2,[-9,9],[-0.6,0.6],b,0.22);
      const beat=stepDur()*4, b0=Math.floor(t/beat)*beat; pg.gain.setValueAtTime(1,t); for(let bt=b0;bt<t+dur+1;bt+=beat){ if(bt<t) continue; pg.gain.setValueAtTime(0.05,bt); pg.gain.linearRampToValueAtTime(1,bt+beat*0.55); }   /* the pump: silent on each beat, swelling back */
      end=env(0.01,0.4,0.92,0.3,0.228*v); break; }
    case 'Island pluck': { const b=lp(200,2); fenv(b,(2600+T*5000)*vb,500,0.05); osc('sine',f,0,b); osc('triangle',f*2,0,b,0.25); osc('sine',f*4,0,b,0.08); end=env(0.002,0.22,0.0,0.12,0.85*v); break; }
    case 'Moog bass': { const b1=c.createBiquadFilter(), b2=lp(300,1.6); b1.type='lowpass'; b1.Q.value=0.7; b1.connect(b2); fenv(b1,(900+T*2600)*vb,260,0.1); fenv(b2,(900+T*2600)*vb,260,0.1); osc('sawtooth',f,0,b1); osc('square',f,-5,b1,0.5); osc('square',f/2,0,b1,0.35); end=env(0.004,0.3,0.7,0.09,0.28*v); break; }   /* two filters in a row: a steep, round low-pass */
    case 'FM bass': { const car=osc('sine',f,0,g), mod=c.createOscillator(), mg=c.createGain(); mod.frequency.value=f; mg.gain.setValueAtTime(f*(2.5+T*3)*vb,t); mg.gain.setTargetAtTime(f*0.4,t,0.06); mod.connect(mg); mg.connect(car.frequency); oscs.push(mod); osc('sine',f/2,0,g,0.35); end=env(0.002,0.25,0.7,0.07,0.33*v); break; }
    case 'Sub': osc('sine',f); osc('triangle',f,0,g,0.22); end=env(0.006,0.25,0.85,0.08,0.62*v); break;
    case 'Reese': { const b=lp(220+T*1900,2.2); osc('sawtooth',f,-9,b); osc('sawtooth',f,9,b); osc('sine',f,0,g,0.5); end=env(0.01,0.3,0.85,0.1,0.32*v); break; }
    case 'Pluck': { const b=lp(200,5); fenv(b,(700+T*5200)*vb,160,0.07); uni('sawtooth',f,[-6,6],[-0.4,0.4],b,0.6); osc('sine',f,0,g,0.4); end=env(0.003,0.3,0.3,0.1,0.792*v); break; }
    case 'Saw': { const cut=(1100+T*6000)*vb, b=lp(cut,1); fenv(b,cut*1.8,cut,0.18); uni('sawtooth',f,[-8,0,8],[-0.6,0,0.6],b,0.8,0.6); const l=c.createOscillator(), lg=c.createGain(); l.frequency.value=5.4; lg.gain.setValueAtTime(0,t); lg.gain.linearRampToValueAtTime(9,t+0.35); l.connect(lg); oscs.forEach(o=>lg.connect(o.detune)); l._lfo=1; oscs.push(l); end=env(0.012,0.25,0.75,0.12,0.353*v); break; }
    case 'Square': { const cut=(800+T*5000)*vb, b=lp(cut,1); fenv(b,cut*1.5,cut,0.12); uni('square',f,[-5,0,5],[-0.5,0,0.5],b,0.3,1); osc('square',f*2,4,b,0.18); end=env(0.005,0.18,0.6,0.1,0.264*v); break; }
    case 'Bell': { const car=osc('sine',f,-3,pn(-0.3,g)), car2=osc('sine',f,3,pn(0.3,g)); const mod=c.createOscillator(), mg=c.createGain(); mod.frequency.value=f*3.5; mg.gain.setValueAtTime(f*(1.5+T*4)*vb,t); mg.gain.setTargetAtTime(0,t,0.35); mod.connect(mg); mg.connect(car.frequency); mg.connect(car2.frequency); oscs.push(mod); osc('sine',f*2,0,g,0.15);
      { const pg=c.createGain(); pg.gain.setValueAtTime(0.12*v,t); pg.gain.setTargetAtTime(0,t,0.12); pg.connect(g); osc('sine',f*2.756,0,pg); }   /* the bright strike that fades fast, as on a real bell */ end=env(0.002,1.5,0,0.6,0.289*v); break; }
    case 'E-piano': { const car=osc('sine',f); const mod=c.createOscillator(), mg=c.createGain(); mod.frequency.value=f; mg.gain.setValueAtTime(f*(0.6+T*2.2),t); mg.gain.setTargetAtTime(f*0.15,t,0.15); mod.connect(mg); mg.connect(car.frequency); oscs.push(mod); osc('sine',f*4.01,0,g,0.05); end=env(0.003,1.2,0.35,0.25,0.34*v); break; }
    case 'Organ': { const b=lp(1500+T*6000,0.7); [1,2,3,4,6].forEach((h,i)=>osc('sine',f*h,0,b,[1,0.7,0.4,0.25,0.12][i]));
      { const n=noise(c), hp=c.createBiquadFilter(), kg=c.createGain(); hp.type='bandpass'; hp.frequency.value=2500; hp.Q.value=0.8; kg.gain.setValueAtTime(0.05*v,t); kg.gain.setTargetAtTime(0,t,0.006); n.connect(hp); hp.connect(kg); kg.connect(out); n.start(t); n.stop(t+0.05); }   /* the key click of a tonewheel organ */ end=env(0.008,0.1,1,0.06,0.13*v); break; }
    case 'Warm pad': { const cut=(450+T*2600)*vb, b=lp(cut,0.8); uni('sawtooth',f,[-14,-5,5,14],[-0.8,-0.3,0.3,0.8],b,0.8); osc('sine',f/2,0,g,0.3);
      { const l=c.createOscillator(), lg=c.createGain(); l.frequency.value=0.13+0.03*ph(7); lg.gain.value=cut*0.3; l.connect(lg); lg.connect(b.frequency); l._lfo=1; oscs.push(l); }   /* slowly breathing */ end=env(0.32,0.6,0.85,0.7,0.188*v); break; }
    case 'Supersaw': { const cut=(2200+T*6500)*vb, b=lp(cut,0.8); fenv(b,cut*1.4,cut,0.2); uni('sawtooth',f,[-28,-17,-8,0,8,17,28],[-0.85,-0.57,-0.28,0,0.28,0.57,0.85],b,0.7,1); osc('sawtooth',f/2,0,b,0.35); end=env(0.008,0.25,0.8,0.18,0.136*v); break; }
    case 'Guitar': { const sh=c.createWaveShaper(); sh.curve=driveCurve(0.85); const pre=c.createGain(); pre.gain.value=2.2; const b=lp(2600+T*2600,0.9); pre.connect(sh); sh.connect(b);
      osc('sawtooth',f,-5,pre,0.7); osc('square',f,6,pre,0.5); osc('square',f/2,0,pre,0.3); end=env(0.004,0.5,0.7,0.12,0.18*v); break; }
    case 'Piano': { [1,2,3,4].forEach((h,i)=>osc(i?'sine':'triangle',f*h*(1+0.0008*h*h),0,g,[1,0.45,0.18,0.08][i])); const dk=Math.max(0.5,2.2-(m-48)*0.03); end=env(0.002,dk,0.06,0.3,0.3*v); break; }
    case 'Stab': { const b=lp(300,2); fenv(b,(1800+T*5000)*vb,400,0.06); uni('sawtooth',f,[-12,0,12],[-0.6,0,0.6],b); end=env(0.003,0.16,0.15,0.08,0.348*v); break; }
    case 'Choir': { const b1=c.createBiquadFilter(), b2=c.createBiquadFilter(); b1.type=b2.type='bandpass'; b1.frequency.value=720; b2.frequency.value=1150; b1.Q.value=b2.Q.value=4; b1.connect(g); b2.connect(g);
      const mix=c.createGain(); mix.gain.value=2.2; mix.connect(b1); mix.connect(b2); uni('sawtooth',f,[-9,0,9],[-0.6,0,0.6],mix); const l=c.createOscillator(), lg=c.createGain(); l.frequency.value=5.2; lg.gain.value=9; l.connect(lg); oscs.forEach(o=>lg.connect(o.detune)); l._lfo=1; oscs.push(l); end=env(0.28,0.4,0.9,0.5,0.318*v); break; }
    case 'Sweep': { const b=lp(600,3); const l=c.createOscillator(), lg=c.createGain(); l.frequency.value=0.22; lg.gain.value=1500+T*1500; l.connect(lg); lg.connect(b.frequency); b.frequency.value=1600+T*1200; l._lfo=1; uni('sawtooth',f,[-14,0,14],[-0.7,0,0.7],b); oscs.push(l); end=env(0.45,0.5,0.85,0.7,0.171*v); break; }
    case '808 glide': { const sh=c.createWaveShaper(); sh.curve=driveCurve(0.35); sh.connect(g); osc('sine',f,0,sh); osc('triangle',f,0,sh,0.15); end=env(0.004,1.4,0.55,0.18,0.75*v); break; }
    case 'Synth bass': { const b=lp(250,4); fenv(b,(900+T*3500)*vb,220,0.09); osc('sawtooth',f,0,b); osc('square',f,-6,b,0.5); osc('sine',f/2,0,g,0.45); end=env(0.004,0.22,0.6,0.08,0.3*v); break; }
    case 'Rock bass': { const b=lp(700+T*1600,1); osc('triangle',f,0,b); osc('sawtooth',f,0,b,0.35); const n=noise(c), nf=c.createBiquadFilter(), ng=c.createGain(); nf.type='bandpass'; nf.frequency.value=1800; ng.gain.setValueAtTime(0.08*v,t); ng.gain.exponentialRampToValueAtTime(0.001,t+0.02); n.connect(nf); nf.connect(ng); ng.connect(out); n.start(t); n.stop(t+0.03); end=env(0.004,0.35,0.55,0.1,0.5*v); break; }
    case 'Strings': { const b=lp(1300+T*3500,0.7); [-7,7].forEach(d=>osc('sawtooth',f,d,b)); const l=c.createOscillator(), lg=c.createGain(); l.frequency.value=5; lg.gain.value=7; l.connect(lg); oscs.forEach(o=>lg.connect(o.detune)); l._lfo=1; oscs.push(l); end=env(0.16,0.3,0.9,0.45,0.15*v); break; }
    default: osc('triangle',f); end=env(0.005,0.2,0.7,0.1,0.3*v);
  }
  if(fromM!==null && fromM!==m){ // portamento: every pitched oscillator starts at the previous note and slides here
    const ratio=Math.pow(2,(fromM-m)/12), gt=Math.min(0.09,Math.max(0.03,dur*0.35));
    oscs.forEach(o=>{ if(o._lfo) return; const f0=o.frequency.value; o.frequency.setValueAtTime(f0*ratio,t); o.frequency.exponentialRampToValueAtTime(f0,t+gt); }); }
  if(EXPR_DET) oscs.forEach(o=>{ if(!o._lfo) EXPR_DET.connect(o.detune); });
  oscs.forEach(o=>{ o.start(o._t0!=null?Math.min(t,o._t0):Math.max(0,t-(o._ph||0))); o.stop(end); }); if(VOICE_DONE) VOICE_DONE.push({n:g,end});
}
/* Follow my voice: for each note, curves from the moment of the take where it was sung - pitch bend (scoops, vibrato, bends,
   in cents around the note), loudness, and brightness (mouth shape: "ooo" darker, "aaa" brighter) as a filter. Amount 0-100. */
function exprFrames(tr){ let an=tr._an&&tr._an.notes&&tr._an.notes.frames?tr._an:tr._anX;
  if(!an && tr._raw && tr.exprAlign!=null){ an=analyzeTake(tr._raw.x,tr._raw.sr,tr.inst,tr.sens??S.sens,true); an.align=tr.exprAlign; tr._anX=an; }   /* after a reload: from the saved take */
  const fr=an&&an.notes&&an.notes.frames; if(!fr||!tr._raw) return null;
  if(an._expr) return an._expr;
  const {x,sr}=tr._raw, N=512, win=new Float64Array(N); for(let i=0;i<N;i++) win[i]=0.5-0.5*Math.cos(2*Math.PI*i/(N-1));
  const re=new Float64Array(N), im=new Float64Array(N), hop=sr/16000, cent=new Float32Array(fr.length);
  for(let f=0;f<fr.length;f++){ const c=Math.round(fr[f].t*sr)-N/2*hop;
    for(let i=0;i<N;i++){ const j=Math.round(c+i*hop); re[i]=(j>=0&&j<x.length?x[j]:0)*win[i]; im[i]=0; }
    readerFFT(re,im); let num=0,den=1e-9; for(let k=2;k<N/2;k++){ const a=Math.hypot(re[k],im[k]), hz=k*16000/N; num+=a*hz; den+=a; } cent[f]=num/den; }
  return an._expr={fr,cent,tune:an.notes.tune||0,align:an.align}; }
function exprCurves(tr, nt, dur, target){ const E=exprFrames(tr); if(!E) return null; const a=(tr.expr||0)/100; if(a<=0) return null;
  const sd=stepDur(), t0=E.align+(nt.s%pSteps(tr))*sd, T0=E.fr[0].t, n=Math.max(2,Math.round(dur/0.01)), bend=new Float32Array(n), gain=new Float32Array(n), cut=new Float32Array(n);
  let lastB=0, mx=-200; const idx=k=>Math.max(0,Math.min(E.fr.length-1,Math.round((t0+k*0.01-T0)/0.01)));
  for(let k=0;k<n;k++) mx=Math.max(mx,E.fr[idx(k)].db);
  for(let k=0;k<n;k++){ const f=E.fr[idx(k)], voiced=f.conf<0.2&&f.db>mx-25;
    if(voiced) lastB=Math.max(-250,Math.min(250,(f.m-E.tune-target)*100)); bend[k]=a*lastB;
    const g=Math.max(0.12,Math.min(1,Math.pow(10,(f.db-mx)/20))); gain[k]=1-a*(1-g);
    const c=Math.max(250,Math.min(4000,E.cent[idx(k)])), open=Math.log(c/250)/Math.log(16); cut[k]=Math.exp(Math.log(20000)*(1-a)+Math.log(900*Math.pow(14,open))*a); }
  const sm=(A,w)=>{ const B=A.slice(); for(let k=0;k<A.length;k++){ let s=0,c=0; for(let j=Math.max(0,k-w);j<=Math.min(A.length-1,k+w);j++){ s+=A[j]; c++; } B[k]=s/c; } return B; };
  return {bend:sm(bend,2),gain:sm(gain,2),cut:sm(cut,3)}; }
function stepTime(s){ const sd=stepDur(); return (s + (s%2===1 ? (S.swing/100)*0.5 : 0))*sd; }
/* ---- Effects on one track (Pro): echo (dotted eighth, ping-pong), chorus, drive. Built into the part's sound when it is rendered,
   so playback and every export carry them. tr.tfx = {echo, chorus, drive}, 0-100 each (0 = off). ---- */
const TFX=[['echo','Echo'],['chorus','Chorus'],['drive','Drive']];
const tfxOn=tr=>!!(tr.tfx&&TFX.some(([k])=>tr.tfx[k]>0));
function tfxChain(oc,tr){ if(!tfxOn(tr)) return null; const f=tr.tfx, input=oc.createGain(); let node=input;
  if(f.drive>0){ const a=f.drive/100, pre=oc.createGain(), sh=oc.createWaveShaper(), post=oc.createGain(), lp=oc.createBiquadFilter();
    const amt=0.25+0.75*a, k=amt*14, x0=0.08; pre.gain.value=1+4*a; sh.curve=driveCurve(amt); sh.oversample='2x'; post.gain.value=1.2*x0*Math.tanh(k)/Math.tanh(k*pre.gain.value*x0);   /* about the same loudness, just dirtier */ lp.type='lowpass'; lp.frequency.value=9000-4000*a;
    node.connect(pre); pre.connect(sh); sh.connect(lp); lp.connect(post); node=post; }
  if(f.chorus>0){ const a=f.chorus/100, out=oc.createGain(); node.connect(out);
    [[0.011,0.55,-0.75],[0.016,0.8,0.75]].forEach(([dt,rate,pan])=>{ const dl=oc.createDelay(0.05), lfo=oc.createOscillator(), lg=oc.createGain(), p=oc.createStereoPanner(), g=oc.createGain();
      dl.delayTime.value=dt; lfo.frequency.value=rate; lg.gain.value=0.0035; lfo.connect(lg); lg.connect(dl.delayTime); lfo.start(0); p.pan.value=pan; g.gain.value=0.7*a; node.connect(dl); dl.connect(g); g.connect(p); p.connect(out); });
    node=out; }
  if(f.echo>0){ const a=f.echo/100, out=oc.createGain(), t=Math.min(1.9,stepDur()*3), d1=oc.createDelay(2), d2=oc.createDelay(2), fb=oc.createGain(), lp=oc.createBiquadFilter(), wet=oc.createGain(), pl=oc.createStereoPanner(), pr=oc.createStereoPanner();
    node.connect(out); d1.delayTime.value=t; d2.delayTime.value=t; fb.gain.value=0.25+0.3*a; lp.type='lowpass'; lp.frequency.value=4200; wet.gain.value=0.55*a; pl.pan.value=-0.6; pr.pan.value=0.6;
    node.connect(lp); lp.connect(d1); d1.connect(pl); d1.connect(d2); d2.connect(pr); d2.connect(fb); fb.connect(d1); pl.connect(wet); pr.connect(wet); wet.connect(out); node=out; }
  return {input, output:node}; }
async function renderStem(tr){
  if(SAMPLED[tr.sound] && !smpReady(tr.sound) && INST[tr.inst].kind==='pitched') await loadSampled(tr.sound);
  if(tr.hits && INST[tr.inst].kind!=='pitched' && KIT_SAMPLED[tr.sound] && !kitReady(tr.sound)) await loadSmp(KIT_SAMPLED[tr.sound]);
  if(tr.hits && INST[tr.inst].kind!=='pitched') for(const k of new Set(((S.kit&&S.kit.slots)||[]).map(x=>x.kit).filter(k=>KIT_SAMPLED[k]&&!kitReady(k)))) await loadSmp(KIT_SAMPLED[k]);
  if(tr.inst==='vox') return renderVox(tr);
  if(tr.inst==='fx') return renderFx(tr);
  const sr=ctx.sampleRate, L=bufLen(tr), PN=pSteps(tr), n=Math.round(L*sr), tail=3, oc=new OfflineAudioContext(2,n+tail*sr,sr), T=tr.tone/100;
  let out=oc.createGain(), sink=oc.destination; { const fx=tfxChain(oc,tr); if(fx){ fx.output.connect(oc.destination); sink=fx.input; } }   /* effects on this track */
  out.connect(sink);
  const d=INST[tr.inst];
  if(d.kind!=='pitched' && tr.sound==='Lo-fi'){ const lp=oc.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3600; const sh=oc.createWaveShaper(); sh.curve=driveCurve(0.5); out.disconnect(); out.connect(sh); sh.connect(lp); lp.connect(sink); }
  enforceMono(tr);
  ENV_OVR=INST[tr.inst].kind==='pitched'?(tr.adsr||null):null;
  const SC=scOn(tr), FULL=fullSong(tr), SP=spotRanges(), keep=x=>!SP.length||!inSpot(x,SP);
  const NL=(!tr.notes?[]:FULL?songEvents(tr,tr.notes):inWin(tr.notes,PN)).filter(x=>keep(x.s)).map(x=>SP.length?spotClip(x,SP):x);
  VOICE_INST=tr.inst; if(tr.sound==='Your voice' && !S.yv) yvCapture();   /* Your voice: made from a take the first time it's needed */
  /* each note or hit is made just before it plays (the render pauses every 2 s to add the next ones): sounds that haven't started would
     otherwise be worked through for the whole song, so a long part took notes x length (a 72 s pad: 45 s). Same sound either way. */
  const jobs=[], envK=ENV_OVR, at=(t,f)=>{ if(window.RENDER_EAGER) f(); else jobs.push({t,f}); }, done=[], job=f=>()=>{ ENV_OVR=envK; VOICE_INST=tr.inst; VOICE_DONE=window.RENDER_EAGER?null:done; try{ f(); } finally{ ENV_OVR=null; EXPR_DET=null; VOICE_DONE=null; } };
  if(d.kind==='pitched' && tr.inst==='arp'){ for(const e of (FULL?songEvents(tr,arpEvents(tr)):inWin(arpEvents(tr),PN)).filter(e=>keep(e.x)).map(e=>SP.length?spotClip(e,SP,'x'):e)){ const t=tAt(e.x)+0.002; at(t,job(()=>voice(oc,out,tr.sound,t,Math.max(0.03,e.l*stepDur()),e.p+12*tr.oct,e.v,T))); } }
  else if(d.kind==='pitched'){
    /* joined notes (lg, from tap notes): one sound that changes pitch, no new attack; on Lead and Bass */
    const chain=new Map(), inChain=new Set(); if(TAP_MONO.has(tr.inst)) for(const a0 of NL){ if(inChain.has(a0)) continue; const ch=[a0]; let cur=a0;
      for(;;){ const nx=NL.find(o=>o.lg && o!==cur && o.s===cur.s+cur.l && !inChain.has(o)); if(!nx) break; ch.push(nx); inChain.add(nx); cur=nx; } if(ch.length>1) chain.set(a0,ch); }
    for(const nt of NL){ if(inChain.has(nt)) continue; const ch=chain.get(nt);
    const ts=stepTime(nt.s), dur=Math.max(0.05,(ch?ch[ch.length-1].s+ch[ch.length-1].l-nt.s:nt.l)*stepDur()-0.012); const ps=notePitches(tr,nt); const pv=!ch&&(slidesOn(tr)&&nt.g||GLIDE.has(tr.sound)) ? NL.find(o=>o!==nt && o.s+o.l===nt.s) : null; const pps=pv?notePitches(tr,pv):null;
    const X=!ch && tr.expr>0 && !nt.x ? exprCurves(tr,nt,dur,pitchOf(nt)) : null; at(ts-0.03,job(()=>{ let nout=out;
    if(ch){ const p0=ps[0], cs=oc.createConstantSource(); cs.offset.setValueAtTime(0,ts); for(const q of ch.slice(1)){ const tq=stepTime(q.s), c=100*(notePitches(tr,q)[0]-p0); cs.offset.setValueAtTime(cs._last??0,tq-0.012); cs.offset.linearRampToValueAtTime(c,tq); cs._last=c; }
      cs.start(ts); cs.stop(ts+dur+1); EXPR_DET=cs; }
    if(X){ const g=oc.createGain(), lpf=oc.createBiquadFilter(); lpf.type='lowpass'; lpf.Q.value=0.8; g.connect(lpf); lpf.connect(out);
      g.gain.setValueCurveAtTime(X.gain,ts+0.002,dur); lpf.frequency.setValueCurveAtTime(X.cut,ts+0.002,dur);
      const cs=oc.createConstantSource(); cs.offset.value=0; cs.offset.setValueCurveAtTime(X.bend,ts+0.002,dur); cs.start(ts); cs.stop(ts+dur+1); EXPR_DET=cs; nout=g; if(VOICE_DONE) VOICE_DONE.push({n:lpf,end:ts+dur+1}); }
    ps.forEach((pp,j)=>voice(oc,nout,tr.sound,ts+0.002+(STRUM.has(tr.sound)&&ps.length>2?j*0.013:0),dur,pp+12*tr.oct,nt.v*(ps.length>1?1.1/Math.sqrt(ps.length+0.2):1),Number.isFinite(nt.tn)?Math.min(1,Math.max(0,nt.tn)):T, pps?pps[Math.min(j,pps.length-1)]+12*tr.oct:null)); EXPR_DET=null; })); } }
  else { for(const h of (FULL?withFills(tr,songEvents(tr,tr.hits)):inWin(tr.hits,PN)).filter(h=>keep(h.s))){ const t=stepTime(h.s)+0.002; at(t,job(()=>drumHit(oc,out,h.d,t,h.v,tr.sound,T))); } }
  ENV_OVR=null;
  let jobErr=null; if(jobs.length){ const CH=2, LEAD=0.25, total=(n+tail*sr)/sr; jobs.sort((a,b)=>a.t-b.t); let ji=0; const run=lim=>{ while(ji<jobs.length && jobs[ji].t<lim){ try{ jobs[ji++].f(); }catch(e){ jobErr=jobErr||e; } } };   /* an error never stalls the render; it's reported after */   /* a stable sort: same-time notes keep their order */
    run(CH+LEAD); for(let k=1;k*CH<total && k*CH<=jobs[jobs.length-1].t+LEAD;k++){ const lim=(k+1)*CH+LEAD; const now=k*CH; oc.suspend(now).then(()=>{ for(const v of done) if(!v.x && v.end+0.5<now){ try{ v.n.disconnect(); }catch(e){} v.x=1; }   /* notes over for half a second: let go */
      run(lim); oc.resume(); }); } }   /* at each pause, add what starts before the next pause (+0.25 s: some start a little early) */
  const r=await oc.startRendering(); if(jobErr) throw jobErr;
  const b=ctx.createBuffer(2,n,sr);
  foldTail(b,r,n);
  if(SC) applyDuck(b,tr);
  return b;
}
/* a part's render runs a few seconds past its end; that ring-over is folded into the start so the loop is seamless. The first time through nothing
   has played yet, so starting at bar 1 began mid-release: a sudden short pluck (owner, 27 Nov). b._cut is that fold, negated, played once from
   the start alongside the loop (startSrc) and added to exports, so the first pass is clean and every later pass keeps the ring-over.
   Used for every part: notes and beats (renderStem), vocal takes (renderVox), sound effects (renderFx). */
function foldTail(b,r,n){ const sr=b.sampleRate, tl=r.length-n, C=tl>0?ctx.createBuffer(2,tl,sr):null; let any=false;
  for(let ch=0;ch<2;ch++){ const src=r.getChannelData(Math.min(ch,r.numberOfChannels-1)), dst=b.getChannelData(ch), c=C&&C.getChannelData(ch);
    for(let i=0;i<src.length;i++){ const x=src[i]; dst[i%n]+=x; if(i<n||!x) continue; any=true; for(let t=i%n;t<i&&t<tl;t+=n) c[t]-=x; } }
  if(any) b._cut=C; return b; }
async function renderMetro(){
  const sr=ctx.sampleRate, L=loopLen(), n=Math.round(L*sr), oc=new OfflineAudioContext(1,n,sr), beat=60/S.bpm;
  for(let i=0;i<S.bars*4;i++){ const t=i*beat, o=oc.createOscillator(), g=oc.createGain(); o.frequency.value=i%4===0?2000:1500;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(i%4===0?0.5:0.32,t+0.002); g.gain.exponentialRampToValueAtTime(0.001,t+0.03); o.connect(g); g.connect(oc.destination); o.start(t); o.stop(t+0.04); }
  metroBuf=await oc.startRendering(); metroDirty=false;
}
let spotSigLast='[]|0';
let rendering=false, renderAgain=false, renderTimer=0, renderDone=Promise.resolve();
function scheduleRender(){ clearTimeout(renderTimer); renderTimer=setTimeout(renderDirty,90); }
let renderErrShown='';
async function renderDirty(){
  if(!ctx) return;
  if(rendering){ renderAgain=true; return renderDone; }   // callers (exports) wait for the render already in progress
  rendering=true; let finish; renderDone=new Promise(r=>finish=r);
  try{
    do{ renderAgain=false;
      const lenChanged = Math.abs(renderedLen-loopLen())>1e-6;
      if(lenChanged){ S.tracks.forEach(t=>t._dirty=true); metroDirty=true; }
      S.tracks.forEach(t=>{ const sg=scSig(t); if(sg!==(t._scSig||'')){ t._scSig=sg; t._dirty=true; } });
      { const sp=JSON.stringify(spotRanges())+'|'+S.bars; if(sp!==spotSigLast){ spotSigLast=sp; S.tracks.forEach(t=>{ if(t.inst!=='vox') t._dirty=true; }); } }
      const todo=S.tracks.filter(t=>(t._dirty||!t._buf)&&t.inst!=='mix');
      for(const tr of todo){ tr._dirty=false; ensureNodes(tr); let b;
        try{ b=await renderStem(tr); }catch(err){   /* one track that can't be made here must not stop the others from playing: it stays silent and says why */
          b=ctx.createBuffer(2,Math.max(1,Math.round(bufLen(tr)*ctx.sampleRate)),ctx.sampleRate); const msg=`${partName(tr)} couldn't play here (${(err&&(err.name||'')+(err.message?': '+err.message:''))||err}).`; console.error(msg,err); crashReport('render: '+((err&&(err.name||'')+(err.message?': '+err.message:''))||err)+' ('+tr.inst+'/'+tr.sound+')', err&&err.stack); if(renderErrShown!==msg){ renderErrShown=msg; toast(msg,8000); } }
        if(!tr._dirty){ tr._buf=b; if(playing && !lenChanged) swapSource(tr); } }
      if(metroDirty){ try{ await renderMetro(); }catch(err){ console.error('metronome',err); metroDirty=false; } }
      if(lenChanged){ const old=renderedLen, sameTempo=renderedBpm===S.bpm; renderedLen=loopLen(); renderedBpm=S.bpm; if(playing){ const now=ctx.currentTime+0.04; const ph=old>0?(((now-t0)/old)%1+1)%1:0;   /* a new tempo keeps your place in the bar; a longer or shorter song keeps the same moment */
        startAll(now, sameTempo ? (ph*old<renderedLen-0.01?ph*old:0) : ph*renderedLen); } }
    } while(renderAgain);
    try{ measureMix(); }catch(err){ console.error('measureMix',err); }
  } finally { rendering=false; finish(); }
}
let metroSrc=null, metroGain=null;
/* abs: seconds since the song began playing (the same as off unless it has looped); on the first pass, buf._cut takes out the ring-over */
function startSrc(buf, dest, when, off, abs=off){ const s=ctx.createBufferSource(); s.buffer=buf; s.loop=true; s.connect(dest); s.start(when, off%buf.duration);
  const C=buf._cut; if(C && abs>=0 && abs<C.duration-0.001){ const c=ctx.createBufferSource(); c.buffer=C; c.connect(dest); c.start(when, abs); const st=s.stop.bind(s); s.stop=t=>{ try{ c.stop(t); }catch(e){} st(t); }; }
  return s; }
function gateOpen(when){ const g=chain&&chain.gate; if(!g) return; g.gain.cancelScheduledValues(0); g.gain.setValueAtTime(1,Math.max(when,ctx.currentTime)); }
const takeStart=()=>{ const t=S.tracks.find(t=>t.id===S.activeId), L=loopLen(), o=t&&t.off?t.off*stepDur():0; return o<L-0.01?o:0; };   /* seconds into the song where the newest take begins */
function startAll(when, off=0, opts={}){
  stopAll(when); gateOpen(when);
  t0=when-off; const L=loopLen(); if(opts.tracks!==false) mfxStart(when, off);
  S.tracks.forEach(tr=>{ if(tr._buf && opts.tracks!==false){ ensureNodes(tr); tr._src=startSrc(tr._buf,tr._g,when+(opts.trackDelay||0),off); } });
  if(!metroGain){ metroGain=ctx.createGain(); metroGain.connect(ctx.destination); }
  metroGain.gain.value=(S.metro||opts.metro)?0.7:0;
  if(metroBuf) metroSrc=startSrc(metroBuf,metroGain,when,off);
}
function stopAll(when){ const t=when??ctx.currentTime; mfxStop(); S.tracks.forEach(tr=>{ if(tr._src){ try{tr._src.stop(t);}catch(e){} tr._src=null; } }); if(metroSrc){ try{metroSrc.stop(t);}catch(e){} metroSrc=null; } }
function swapSource(tr){ const now=ctx.currentTime+0.03, L=loopLen(), off=(((now-t0)%L)+L)%L; const old=tr._src; ensureNodes(tr); tr._src=startSrc(tr._buf,tr._g,now,off,now-t0); if(old){ try{old.stop(now);}catch(e){} } }
let playFrom=0;   // where Play resumes (seconds into the song), and a seek in progress (0..1)
async function togglePlay(){
  ensureCtx();
  if(recState) return;
  if(playing){ const now=ctx.currentTime, L0=loopLen(); playFrom=(((now-t0)%L0)+L0)%L0; const g=chain&&chain.gate; if(g){ g.gain.cancelScheduledValues(0); g.gain.setValueAtTime(g.gain.value,now); g.gain.linearRampToValueAtTime(0,now+0.025); } stopAll(now+0.03); playing=false; return; }
  playing=true; 
  const ready = renderedLen>0 && Math.abs(renderedLen-loopLen())<1e-6 && S.tracks.every(t=>t._buf || !hasContent(t) || t.inst==='mix');
  if(ready){ startAll(ctx.currentTime+0.02, playFrom%loopLen()); renderDirty(); return; }
  try{ await renderDirty(); }catch(err){ console.error('render',err); toast(`Playback hit a problem here (${(err&&(err.name||'')+(err.message?': '+err.message:''))||err}).`,8000); }
  if(playing){ try{ startAll(ctx.currentTime+0.03, playFrom%loopLen()); }catch(err){ console.error('start',err); playing=false; toast(`Couldn't start playback here (${(err&&err.message)||err}).`,8000); } }
}
/* the Studio reads `playing` each frame (s2Tick) */

