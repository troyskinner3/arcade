"use strict";
/* ============================== audio engine ============================== */
let ctx=null, chain=null, playing=false, t0=0, metroBuf=null, metroDirty=true, irBuf=null, irSize=-1, renderedLen=0; let renderedBpm=0;
/* iPhone silent switch: web audio counts as "ambient" sound and the switch mutes it. Declaring the page as media
   playback (Audio Session API where the browser has it, otherwise a silent looping <audio> element, started from a tap)
   makes Noodle play like a music app. The silent element pauses while the mic is held and when the page is hidden. */
const IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
let unmuteEl=null;
function silentWavURL(){ const n=4000, b=new DataView(new ArrayBuffer(44+n)), w=(o,t)=>{ for(let i=0;i<t.length;i++) b.setUint8(o+i,t.charCodeAt(i)); };
  w(0,'RIFF'); b.setUint32(4,36+n,true); w(8,'WAVE'); w(12,'fmt '); b.setUint32(16,16,true); b.setUint16(20,1,true); b.setUint16(22,1,true); b.setUint32(24,8000,true); b.setUint32(28,8000,true); b.setUint16(32,1,true); b.setUint16(34,8,true); w(36,'data'); b.setUint32(40,n,true);
  for(let i=0;i<n;i++) b.setUint8(44+i,128); return URL.createObjectURL(new Blob([b.buffer],{type:'audio/wav'})); }
function playThroughSilentSwitch(){
  try{ if(navigator.audioSession && !mic) navigator.audioSession.type='playback'; }catch(e){}
  if(!IOS || mic || document.hidden) return;
  if(!unmuteEl){ unmuteEl=document.createElement('audio'); unmuteEl.setAttribute('x-webkit-airplay','deny'); unmuteEl.preload='auto'; unmuteEl.loop=true; unmuteEl.src=silentWavURL(); unmuteEl.disableRemotePlayback=true; }
  if(unmuteEl.paused){ const p=unmuteEl.play(); if(p&&p.catch) p.catch(()=>{}); }
}
function pauseSilentSwitch(){ if(unmuteEl && !unmuteEl.paused) unmuteEl.pause(); }
if(IOS) ['touchend','click'].forEach(ev=>document.addEventListener(ev,()=>{ if(typeof mic!=='undefined') playThroughSilentSwitch(); },{passive:true,capture:true}));
function ensureCtx(){
  playThroughSilentSwitch();
  if(!ctx){
    const AC=window.AudioContext||window.webkitAudioContext; ctx=new AC({latencyHint:'interactive'});
    chain=buildChain(ctx, true); applyMaster();
    S.tracks.forEach(t=>{ t._dirty=true; });
  }
  if(ctx.state!=='running') ctx.resume();
  return ctx;
}
/* A room: RT60 0.7-3.7 s by the Reverb setting (its darkening tail then measures as long as the old one: T30 1.0-2.8 s at 15-80), predelay 8-25 ms, early reflections in the first 40-110 ms,
   then a dense tail whose highs fade faster than its lows, with the lows under ~120 Hz taken out. */
function roomIR(sr, size, c){ const rt=0.7+3.04*size, pre=0.008+0.017*size, len=Math.floor(sr*(pre+rt*1.05)), b=(c||ctx).createBuffer(2,len,sr);
  for(let ch=0;ch<2;ch++){ let st=(ch?0x9e3779b9:0x85ebca6b)>>>0; const rnd=()=>{ st=(st+0x6D2B79F5)>>>0; let x=st; x=Math.imul(x^(x>>>15),x|1); x^=x+Math.imul(x^(x>>>7),x|61); return ((x^(x>>>14))>>>0)/4294967296; };
    const d=b.getChannelData(ch), p0=Math.round(pre*sr), er=0.03+0.08*size, k=6.91/rt;   /* k: -60 dB over rt */
    for(let j=0;j<10;j++){ const t=pre+0.004+er*Math.pow(rnd(),0.8), i=Math.round(t*sr); if(i<len) d[i]+=(rnd()<0.5?-1:1)*(0.55-0.35*j/10)*Math.exp(-k*(t-pre)); }   /* early reflections */
    let lp=0, hp=0, hx=0; const ahp=Math.exp(-2*Math.PI*120/sr);
    for(let i=p0;i<len;i++){ const t=(i-p0)/sr, n=(rnd()+rnd()+rnd()-1.5)*1.15, env=Math.exp(-k*t)*Math.min(1,t/0.015);
      const fc=1800+9000*Math.exp(-t/(rt*0.35)), a=Math.exp(-2*Math.PI*fc/sr); lp=a*lp+(1-a)*n;   /* the tail darkens as it decays */
      d[i]+=lp*env*0.6; }
    for(let i=0;i<len;i++){ const x=d[i]; hp=ahp*(hp+x-hx); hx=x; d[i]=hp; }   /* low cut */
  } return b; }
const REV_RET=0.8;   /* the reverb's return: the room impulse comes out about 1 dB hotter than the old noise one after the convolver normalizes it (mm/reverb_test.js) */
function makeIR(c){
  const size=S.master.rev/100; if(irBuf && irSize===size) return irBuf;
  irBuf=roomIR(c.sampleRate,size,c); irSize=size; return irBuf;
}
const SAFE_CURVE=(()=>{ const n=4096, c=new Float32Array(n); for(let i=0;i<n;i++){ const x=i/(n-1)*2-1, a=Math.abs(x); c[i]=Math.sign(x)*(a<0.9?a:0.9+0.1*Math.tanh((a-0.9)/0.1)); } return c; })();
/* auto gain staging: measure how loud the whole mix gets and trim the master input so it sits at a steady level with headroom
   (busy mixes come down, sparse ones come up a little), so nothing slams the drive stage or clips */
let mixTrim=1, trimTimer=0;
function measureMix(){ if(!ctx) return; const live=S.tracks.filter(t=>t._buf && trackGain(t)>0); if(!live.length) return;
  const n=Math.round(loopLen()*ctx.sampleRate), st=3; let pk=0;
  const parts=live.map(t=>{ const g=trackGain(t), pan=t.pan/100, b=t._buf; return {L:b.getChannelData(0),R:b.getChannelData(b.numberOfChannels>1?1:0),len:b.length,gl:g*Math.cos((pan+1)*Math.PI/4)*Math.SQRT2,gr:g*Math.sin((pan+1)*Math.PI/4)*Math.SQRT2}; });
  for(let i=0;i<n;i+=st){ let l=0,r=0; for(const q of parts){ const k=i%q.len; l+=q.L[k]*q.gl; r+=q.R[k]*q.gr; } const m=l>r?(l>-r?l:-r):(r>-l?r:-l); if(m>pk) pk=m; }
  const rev=1+Math.pow(S.master.rev/100,1.5)*0.25;   // the reverb return adds a little on top
  mixTrim=clamp(0.72/Math.max(pk*rev,1e-4),0.12,1.6); applyTrim(); }
function scheduleTrim(){ clearTimeout(trimTimer); trimTimer=setTimeout(measureMix,160); }
function trimBase(){ return 1/(1+S.master.drive/100*0.6); }
function applyTrim(){ if(chain&&ctx) chain.input.gain.setTargetAtTime(trimBase()*mixTrim, ctx.currentTime, 0.06); }
function driveCurve(amt){ if(amt<=0.01) return null; const k=amt*14, n=2048, c=new Float32Array(n); for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; c[i]=Math.tanh(k*x)/Math.tanh(k); } return c; }
/* ---- Noodle Pro ---- */
/* What Pro unlocks: noodle/PRO.md (keep both in step). A one-time purchase in the iPhone app, kept for life; the app checks it with the App Store
   on every launch and tells the page (window.noodlePro). The last answer is remembered so Pro works offline. */
const PRO={owned:false, price:''}; try{ PRO.owned=localStorage.getItem('noodle.pro')==='1'; }catch(e){}
/* Builds run from Xcode (DEBUG) set NOODLE_DEV: More then has "Test as: Free / Pro / App Store" to try both versions; App Store and TestFlight builds don't */
const devAs=()=>{ if(!window.NOODLE_DEV) return ''; try{ return localStorage.getItem('noodle.devAs')||''; }catch(e){ return ''; } };
const isPro=()=>devAs()?devAs()==='pro':PRO.owned;
const PRO_SOUNDS=new Set(['Brushes','Vocoder','Talkbox','Trumpet','Clarinet','Xylophone','Marimba','Glockenspiel','Flute','Horns','Your voice','Glass','Chip','Theremin','Vowel pad','Digital pad','Growl','Acid','Wobble','String pluck','Chorus pad','Pump pad']);
/* a long sound list in groups: synths, recorded instruments (and kits), your voice */
const soundGroups=list=>{ if(list.length<7||list===INST.vox.sounds) return [['',list]];   /* vocal styles are not instruments: no groups ("Rock" is a vocal style and a kit) */ const rec=x=>!!SAMPLED[x]||!!KIT_SAMPLED[x], g=[['Synths',list.filter(x=>!rec(x)&&x!=='Your voice')],['Recorded',list.filter(rec)],['',list.filter(x=>x==='Your voice')]]; return g.filter(([,xs])=>xs.length); };
const proLocked=snd=>!isPro()&&PRO_SOUNDS.has(snd);
/* The Pro badge: a small amber sparkle, shown to free users only (on option buttons it sits on the top-right corner) */
const PRO_LOCK='<i class="pro-b" role="img" aria-label="Pro" title="Noodle Pro"><svg viewBox="0 0 24 24"><path d="M12 1.5c.9 6.6 3.9 9.6 10.5 10.5-6.6.9-9.6 3.9-10.5 10.5-.9-6.6-3.9-9.6-10.5-10.5C8.1 11.1 11.1 8.1 12 1.5z"/></svg></i>';
/* ---- Previews of Pro features for free users: try a Pro sound or effect and hear it in your song. A preview is never saved, undone,
   shared or exported (pvKeep writes the song as it was), and it goes back when you leave the menu or editor, with a note.
   tr._pvOrig holds the real values of the fields being previewed; tracks marked _pvTemp exist only for the preview. ---- */
let proPv=null;   /* {label, started (we started playback), sec, loop} */
const pvKeep=function(k,v){ if(k[0]==='_') return undefined; if(k==='tracks'&&Array.isArray(v)&&v.some(t=>t&&t._pvTemp)) return v.filter(t=>!t._pvTemp);
  const o=this&&this._pvOrig; return o&&Object.prototype.hasOwnProperty.call(o,k)?o[k]:v; };
const pvCopy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
function pvTry(tr, fields, label, part){ for(const k in fields){ if(!tr._pvOrig) tr._pvOrig={}; if(!(k in tr._pvOrig)) tr._pvOrig[k]=pvCopy(tr[k]); tr[k]=fields[k]; }
  pvOpen(label, part||tr); tr._dirty=true; tr._tuned=null; tr._harm=null; scheduleRender(); }
/* the start of a preview: the part plays, looping, so you hear it at once */
function pvOpen(label, part){ if(!proPv) proPv={labels:[]}; proPv.labels=proPv.labels.filter(x=>x!==label).concat([label]); if(part) pvPlay(part); }
function pvPlay(t){ const p=proPv; if(!p||p.started!=null||recState) return; p.sec=s2.sec; p.loop=s2.loop; p.started=!playing;
  try{ if(hasContent(t)&&!t.guide) s2SecSet(t); }catch(e){} if(!playing) togglePlay(); }
/* a free choice made while previewing (say Piano after trying Trumpet) becomes the real value */
function pvForget(tr, keys){ if(!tr._pvOrig) return; keys.forEach(k=>delete tr._pvOrig[k]); if(!Object.keys(tr._pvOrig).length) delete tr._pvOrig; }
/* leave the preview: everything goes back; a note says what was Pro (quiet: no note) */
function pvEnd(quiet){ const p=proPv; let back=false;
  for(const t of S.tracks) if(t._pvOrig){ for(const k in t._pvOrig){ if(JSON.stringify(t[k])!==JSON.stringify(t._pvOrig[k])) back=true; if(t._pvOrig[k]===undefined) delete t[k]; else t[k]=t._pvOrig[k]; } delete t._pvOrig; t._dirty=true; t._tuned=null; t._harm=null; }
  if(S._pvOrig){ for(const k in S._pvOrig){ if(JSON.stringify(S[k])!==JSON.stringify(S._pvOrig[k])) back=true; S[k]=S._pvOrig[k]; } delete S._pvOrig; scaleCache=null; S.tracks.forEach(t=>{ if(t.hits) t._dirty=true; }); }   /* a kit tried */
  const tmp=S.tracks.filter(t=>t._pvTemp); if(tmp.length){ back=true; tmp.forEach(t=>{ try{ disposeTrack(t); }catch(e){} }); S.tracks=S.tracks.filter(t=>!t._pvTemp); keyCache=null; }
  proPv=null; if(!p&&!back) return false;
  if(p&&p.started!=null){ s2.sec=p.sec; s2.loop=p.loop; try{ $('s2Loop').setAttribute('aria-pressed',String(!!s2.loop)); }catch(e){} if(p.started&&playing) togglePlay(); }
  if(back){ try{ renderTracks(); }catch(e){} scheduleRender(); if(!quiet&&p&&p.labels&&p.labels.length&&!isPro()) proNote(p.labels.slice(-2)); } else { try{ s2Render(); }catch(e){} }
  return back; }
/* someone bought Pro while trying something: keep it */
function pvCommitAll(){ delete S._pvOrig; S.tracks.forEach(t=>{ delete t._pvOrig; delete t._pvTemp; }); if(proPv){ proPv=null; save(); } }
function proNote(ls){ toast((ls.length>1?ls.join(' and ')+' are':ls[0]+' is')+' Pro. Get Pro to keep '+(ls.length>1?'them':'it')+'.',5000); const t=$('toast'); t.classList.add('act'); t.onclick=()=>{ t.classList.remove('on'); proSheet(); }; }
const proBridge=()=>!!(window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.noodlePro);
/* from the app: whether Pro is owned, and its price in the App Store's own words (e.g. "$6.99") */
window.noodlePro=(owned, price)=>{ const was=PRO.owned; PRO.owned=!!owned; if(price) PRO.price=price; try{ localStorage.setItem('noodle.pro',PRO.owned?'1':'0'); }catch(e){}
  nxProSync(); if(was!==PRO.owned){ if(PRO.owned) pvCommitAll(); try{ renderTracks(); if(s2.edId!=null) s2EdMount(); }catch(e){} } };
window.noodleProResult=r=>{ PRO.busy=false; const m={bought:'Pro unlocked. Thank you!', restored:'Pro restored.', none:'No Pro purchase found for this Apple ID.', pending:'Waiting for approval. Pro unlocks as soon as it’s approved.', failed:'The purchase didn’t go through. Nothing was charged.', unavailable:'The App Store isn’t reachable right now. Try again in a moment.'}[r];
  if(r==='bought'||r==='restored'){ nxClose(); haptic('success'); } if(m) toast(m,5200); nxProSync(); };
/* the Pro sheet: what Pro adds, grouped by what it's for (keep in step with PRO.md and PRO_SOUNDS / MFX / BEATS / CHORD_STYLES) */
const PRO_CARDS=[
  {t:'Sounds', d:'22 more instruments and a recorded brush kit', ic:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
   x:['Trumpet','Flute','Horns','Marimba','Clarinet','Glockenspiel','Xylophone','Glass','Theremin','Acid','Wobble','Brushes drums','+ 10 more']},
  {t:'Your voice', d:'Instruments and harmonies made from your singing', ic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
   x:['Your voice','Backing vocals','Vocoder','Talkbox']},
  {t:'Effects', d:'On one track or across the whole song', ic:'<circle cx="12" cy="12" r="8"/><path d="M12 12l4-4"/><path d="M12 4v2M4 12h2M18 12h2"/>',
   x:['Echo','Chorus','Drive','Phaser','Washout','Echo throw','Tremolo','Auto-pan','Bitcrusher','Vinyl brake','Reverse swell','Ring mod']},
  {t:'Beats and chords', d:'6 more beats to sing over, 2 more chord styles', ic:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
   x:['Glacier','Corner Store','Paper Plane','Cold Front','Weekend','Lagos Sun','Pulse chords','Arp chords']},
  {t:'Export and share', d:'Take your song anywhere', ic:'<path d="M12 15V3M7 8l5-5 5 5M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5"/>',
   x:['MIDI','Stems for your DAW','Videos without the tag','Copy parts between songs']}];
function proSheet(why){ const have=isPro();
  nxSheet(`<h2>Noodle Pro</h2><p class="pro-sub">${nxEsc(why||(have?'You have every sound, effect and export.':'Every sound, effect and export in Noodle.'))}</p>
    <div class="pro-cards">${PRO_CARDS.map(c=>`<div class="pro-card"><div class="pro-ic"><svg class="nx-ico" viewBox="0 0 24 24">${c.ic}</svg></div><div class="pro-tx"><b>${c.t}</b><small>${c.d}</small><div class="pro-chips">${c.x.map(v=>`<span>${nxEsc(v)}</span>`).join('')}</div></div>${have?'<svg class="nx-ico pro-ok" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>':''}</div>`).join('')}</div>
    ${have?'':`<p class="pro-try">${PRO_LOCK} Try anything marked like this on your own song first.</p><button class="nx-primary" id="proBuy">Unlock Pro${PRO.price?' · '+nxEsc(PRO.price):''}</button><p class="pro-once">One-time purchase</p><button class="nx-ghost" id="proRestore">Restore purchase</button>`}`);
  if(!have){ $('proBuy').onclick=()=>proBuy(); $('proRestore').onclick=()=>proRestore(); } }
function proBuy(){ if(!proBridge()){ toast('Noodle Pro is in the Noodle iPhone app.'); return; } if(PRO.busy) return; PRO.busy=true; try{ window.webkit.messageHandlers.noodlePro.postMessage('buy'); }catch(e){ PRO.busy=false; } setTimeout(()=>{ PRO.busy=false; },60000); }
function proRestore(){ if(!proBridge()){ toast('Noodle Pro is in the Noodle iPhone app.'); return; } try{ window.webkit.messageHandlers.noodlePro.postMessage('restore'); }catch(e){} toast('Checking with the App Store…'); }
function nxProSync(){ const e=$('nxProS'); if(!e) return; e.textContent=(devAs()?'Testing: ':'')+(isPro()?'You have Pro':'More sounds, effects and exports'+(PRO.price?' · '+PRO.price:'')); }
/* ---- Mix FX editor ---- */
/* The Song FX editor, as in the Tuttii FX prototype: pick the effect; its curve over the region (x: bars of the region, so it scales with it;
   y: the cutoff in Hz on a log scale for High pass / Low pass, how much of the effect is mixed in for the rest); + adds a point in the widest gap,
   tap a point then − to remove it, drag points to reshape, drag a line's middle up or down to bow it, Reset; then the effect's own settings. */
function mfxEdMount(tr, host){ const pro=true,   /* everyone shapes curves; the 9 Pro effects are previews for free users (mfxTry) */ cfg=()=>MFX[tr.mfx.k], dur=()=>pSteps(tr)*stepDur(), w=document.createElement('div'); w.className='mfxe'; host.appendChild(w);
  const lock=PRO_LOCK, free=()=>isPro()||MFX[tr.mfx.k].free;
  /* a free user on a Pro effect: what is saved stays as it was before trying (tr._pvOrig.mfx); leaving the editor puts it back */
  if(!free()&&(!tr._pvOrig||!('mfx' in tr._pvOrig))){ tr._pvOrig=tr._pvOrig||{}; tr._pvOrig.mfx=pvCopy(tr.mfx); }   /* a Pro effect already in the song (a friend's remix): edits are tries */
  w.innerHTML=`<div class="s2-opts mfx-k">${Object.entries(MFX).map(([k,c])=>`<button data-k="${k}" aria-pressed="${k===tr.mfx.k}">${c.label}${!isPro()&&!c.free?lock:''}</button>`).join('')}</div>
    <div class="mfx-row"><b>Curve</b>${pro?`<span class="mfx-acts"><button class="mfx-btn mfx-ic" data-a="add" aria-label="Add a point">+</button><button class="mfx-btn mfx-ic" data-a="del" aria-label="Remove the selected point" disabled>−</button><button class="mfx-btn" data-a="reset">Reset</button></span>`:''}</div>
    <div class="mfx-cv"><canvas></canvas><div class="mfx-ph"></div></div>
    ${pro?`<div class="mfx-par"></div>`:`<button class="mfx-btn mfx-pro" data-a="pro">Draw your own shape, and 9 more effects ${lock}</button>`}`;
  const W=Math.max(240,Math.floor(w.clientWidth||(host.clientWidth||340)-24)), H=Math.max(140,Math.min(200,(host.clientHeight||420)-(pro&&(MFX[tr.mfx.k].params||[]).length?360:280))), PT=14, PL=58, PR=14, PB=40;
  const cv=w.querySelector('canvas'), ph=w.querySelector('.mfx-ph'); tr._mfxph={el:ph,W,PL,PR};
  let sel=-1, drag=null;
  const LOGR=Math.log(20000/20), isF=()=>cfg().kind==='filter';
  const disp=v=>{ if(!isF()) return v; const c=cfg(), hz=c.fromHz*Math.pow(c.toHz/c.fromHz,v); return Math.log(hz/20)/LOGR; };   /* a curve value as a height: Hz (log) for filters, else the mix */
  const undisp=d=>{ if(!isF()) return clamp(d,0,1); const c=cfg(), hz=20*Math.exp(clamp(d,0,1)*LOGR); return clamp(Math.log(hz/c.fromHz)/Math.log(c.toHz/c.fromHz),0,1); };
  const nodes=()=>mfxNodes(tr,dur()), own=()=>{ if(!tr.mfx.curve){ const n=mfxDefaultNodes(dur()).map(x=>({...x})); tr.mfx.curve={nodes:n, curves:Array(n.length-1).fill(null)}; } return tr.mfx.curve; };
  const X=t=>PL+t*(W-PL-PR), Y=d=>PT+(1-d)*(H-PT-PB), T=x=>clamp((x-PL)/(W-PL-PR),0,1), V=y=>clamp(1-(y-PT)/(H-PT-PB),0,1);
  const draw=()=>{ const dpr=Math.min(2,window.devicePixelRatio||1); cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); cv.style.width=W+'px'; cv.style.height=H+'px'; ph.style.top=PT+'px'; ph.style.height=(H-PT-PB)+'px';
    const g=cv.getContext('2d'), cs=getComputedStyle($('s2')), c=n=>cs.getPropertyValue(n).trim(), col=INST.mix.color, ink=c('--s2-ink'), font=(c('--f-body')||'sans-serif'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
    g.fillStyle=c('--s2-lane'); g.fillRect(X(0),Y(1),X(1)-X(0),Y(0)-Y(1));
    const lbl=(t,x,y,al,bl)=>{ g.fillStyle=ink; g.globalAlpha=0.65; g.font='600 11px '+font; g.textAlign=al; g.textBaseline=bl; g.fillText(t,x,y); g.globalAlpha=1; };
    g.strokeStyle=c('--s2-line'); g.lineWidth=1;
    const ticks=isF()?[[20,'20'],[100,'100'],[1000,'1k'],[10000,'10k'],[20000,'20k']].map(([hz,t])=>[Math.log(hz/20)/LOGR,t]):[[0.25,'25%'],[0.5,'50%'],[0.75,'75%']];
    ticks.forEach(([d,t])=>{ const y=Math.round(Y(d))+0.5; g.beginPath(); g.moveTo(X(0),y); g.lineTo(X(1),y); g.stroke(); g.beginPath(); g.moveTo(X(0)-6,y); g.lineTo(X(0)-1,y); g.stroke(); lbl(t,X(0)-9,y,'right','middle'); });
    const bars=pBars(tr), step=bars<=4?1:bars<=8?2:bars<=16?4:8;   /* bars of the region */
    for(let b=step;b<bars-1e-9;b+=step){ const x=Math.round(X(b/bars))+0.5; g.beginPath(); g.moveTo(x,Y(1)); g.lineTo(x,Y(0)+5); g.stroke(); lbl(String(b),x,Y(0)+8,'center','top'); }
    lbl('Bars',(X(0)+X(1))/2,H-2,'center','bottom'); g.save(); g.translate(12,(Y(0)+Y(1))/2); g.rotate(-Math.PI/2); lbl(isF()?'Frequency (Hz)':'Mix',0,0,'center','middle'); g.restore();
    const ns=nodes(), cvv=tr.mfx.curve&&tr.mfx.curve.curves, N=240, at=t=>Y(disp(clamp(mfxValAt(ns,t,cvv),0,1)));
    g.beginPath(); for(let i=0;i<=N;i++){ const t=i/N; i?g.lineTo(X(t),at(t)):g.moveTo(X(t),at(t)); } g.strokeStyle=col; g.lineWidth=2.5; g.stroke();
    for(let i=0;i<ns.length-1;i++){ const m=(ns[i].t+ns[i+1].t)/2; g.fillStyle=ink; g.globalAlpha=0.45; g.beginPath(); g.arc(X(m),at(m),3,0,7); g.fill(); g.globalAlpha=1; }   /* drag a line's middle to bow it */
    ns.forEach((n,i)=>{ const end=i===0||i===ns.length-1; g.beginPath(); g.arc(X(n.t),Y(disp(n.v)),end?4:6.5,0,7); g.fillStyle=end?c('--s2-line'):col; g.fill(); if(i===sel){ g.lineWidth=2.5; g.strokeStyle=ink; g.stroke(); } });
    const db=w.querySelector('[data-a="del"]'); if(db) db.disabled=!(sel>0&&sel<nodes().length-1); };
  const changed=()=>{ if(!free()) pvOpen(MFX[tr.mfx.k].label,tr); save(); draw(); const L=s2Lane(s2LaneId(tr)), lc=L&&$('s2In').querySelector(`canvas[data-cv="${L.id}"]`); if(lc) s2DrawLane(L,lc); $('s2EdS').textContent=partWhere(tr)+' · '+MFX[tr.mfx.k].label; };
  const pt=ev=>{ const R=cv.getBoundingClientRect(); return {x:ev.clientX-R.left, y:ev.clientY-R.top}; };
  cv.style.touchAction=pro?'none':'pan-y';
  cv.addEventListener('pointerdown',ev=>{ if(!pro){ proSheet('Draw your own shape for each effect, and get 9 more effects.'); return; } const q=pt(ev), ns=nodes(), cvv=tr.mfx.curve&&tr.mfx.curve.curves; flushSave();
    let hit=-1, best=22; ns.forEach((n,i)=>{ const d=Math.hypot(X(n.t)-q.x,Y(disp(n.v))-q.y); if(d<best){ best=d; hit=i; } });
    if(hit>=0) drag={kind:'node',i:hit,moved:false,x0:q.x,y0:q.y};
    else { const t=T(q.x), i=Math.max(0,ns.findIndex((n,j)=>j<ns.length-1&&t>=n.t&&t<=ns[j+1].t)), a=ns[i], b=ns[i+1], u=b&&b.t>a.t?(t-a.t)/(b.t-a.t):0.5, onCurve=b&&Math.abs(Y(disp(clamp(mfxValAt(ns,t,cvv),0,1)))-q.y)<20;
      drag=onCurve&&u>0.04&&u<0.96?{kind:'seg',i,u,moved:false,x0:q.x,y0:q.y}:{kind:'none',moved:false,x0:q.x,y0:q.y}; }   /* grab the line anywhere to bend it */
    try{ cv.setPointerCapture(ev.pointerId); }catch(e){} draw(); });
  cv.addEventListener('pointermove',ev=>{ if(!drag) return; const q=pt(ev); if(!drag.moved && Math.hypot(q.x-drag.x0,q.y-drag.y0)<4) return; drag.moved=true; ev.preventDefault();
    if(drag.kind==='none') return;
    if(drag.kind==='node'){ const C=own(), i=drag.i, n=C.nodes; if(i===0||i===n.length-1) return; sel=i; n[i].t=clamp(T(q.x), n[i-1].t+0.01, n[i+1].t-0.01); n[i].v=undisp(V(q.y)); draw(); }   /* the ends stay where the effect is off */
    else { const C=own(), i=drag.i, a=C.nodes[i], b=C.nodes[i+1], u=drag.u, w=1-u; C.curves[i]=clamp((undisp(V(q.y))-w*w*a.v-u*u*b.v)/(2*w*u),0,1); draw(); } });   /* the bow that puts the line under your finger where you grabbed it */
  const up=()=>{ if(!drag) return; const d=drag; drag=null; if(d.moved && d.kind!=='none'){ changed(); return; }
    if(!d.moved) sel = d.kind==='node' ? (sel===d.i?-1:d.i) : -1;   /* a tap selects a point (again, or elsewhere, to let go) */
    draw(); };
  cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
  const fmt=(v,pm)=>(+v).toFixed(2)+(pm.unit?' '+pm.unit:'');
  const params=()=>{ const box=w.querySelector('.mfx-par'); if(!box) return; const c=cfg(); box.innerHTML=(c.params||[]).map(pm=>{ const v=mfxParam(tr,c,pm.key);
      if(pm.type==='steps') return `<div class="mfx-st"><span>${pm.label}</span><div class="s2-opts mfx-steps">${pm.options.map(([x,l])=>`<button data-pk="${pm.key}" data-pv="${x}" aria-pressed="${x===v}">${l}</button>`).join('')}</div></div>`;
      return `<label class="mfx-sl"><span>${pm.label}</span><input type="range" data-pk="${pm.key}" min="${pm.min}" max="${pm.max}" step="${pm.step}" value="${v}"><b>${fmt(v,pm)}</b></label>`; }).join(''); };
  w.addEventListener('click',ev=>{ const b=ev.target.closest('button'); if(!b) return;
    if(b.dataset.k){ const k=b.dataset.k; if(!isPro()){ if(MFX[k].free){ pvForget(tr,['mfx']); } else if(!tr._pvOrig||!('mfx' in tr._pvOrig)){ tr._pvOrig=tr._pvOrig||{}; tr._pvOrig.mfx=pvCopy(tr.mfx); } }   /* a free effect is kept; a Pro one is tried */
      tr.mfx.k=k; tr.mfx.params={}; try{ $('s2EdHint').textContent=mfxHint(tr); }catch(e){} w.querySelectorAll('.mfx-k button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.k===k))); params(); changed(); return; }
    if(b.dataset.pk){ tr.mfx.params[b.dataset.pk]=+b.dataset.pv; params(); changed(); return; }
    const a=b.dataset.a; if(a==='pro') proSheet('Draw your own shape for each effect, and get 9 more effects.');
    else if(a==='add'){ flushSave(); const C=own(); let i=0, gap=-1; for(let j=0;j<C.nodes.length-1;j++){ const gj=C.nodes[j+1].t-C.nodes[j].t; if(gj>gap){ gap=gj; i=j; } } if(gap<0.02) return;   /* in the widest gap, on the curve as it is */
      const t=(C.nodes[i].t+C.nodes[i+1].t)/2, v=clamp(mfxValAt(C.nodes,t,C.curves),0,1); C.nodes.splice(i+1,0,{t,v}); C.curves.splice(i,1,null,null); sel=i+1; haptic('light'); changed(); }
    else if(a==='reset'){ flushSave(); tr.mfx.curve=null; sel=-1; changed(); }
    else if(a==='del' && tr.mfx.curve && sel>0 && sel<tr.mfx.curve.nodes.length-1){ flushSave(); const C=tr.mfx.curve; C.nodes.splice(sel,1); C.curves.splice(sel-1,2,null); sel=-1; changed(); } });
  w.addEventListener('input',ev=>{ const r=ev.target; if(r.dataset.pk){ tr.mfx.params[r.dataset.pk]=+r.value; const pm=(cfg().params||[]).find(x=>x.key===r.dataset.pk); r.nextElementSibling.textContent=fmt(r.value,pm); } });
  w.addEventListener('change',ev=>{ if(ev.target.dataset.pk) changed(); });
  params(); draw(); }
/* ---- Mix FX ---- */
const MFX={
  hp:{label:'High pass', free:true, kind:'filter', type:'highpass', fromHz:20, toHz:15000},
  lp:{label:'Low pass', free:true, kind:'filter', type:'lowpass', fromHz:20000, toHz:20},
  phaser:{label:'Phaser', kind:'phaser', stages:6, centerHz:800, lfoRateHz:0.3, lfoDepthHz:600, params:[{key:'lfoRateHz',label:'LFO Rate',unit:'Hz',min:0.05,max:5,step:0.01},{key:'centerHz',label:'Center Freq',unit:'Hz',min:200,max:2000,step:10}]},
  washout:{label:'Washout', kind:'washout', fromHz:20, toHz:300},
  echo:{label:'Echo throw', kind:'echo', div:0.5, feedback:0.45, params:[{key:'div',label:'Delay Time',type:'steps',options:[[0.25,'1/16'],[0.5,'1/8'],[0.75,'1/8.'],[1,'1/4'],[1.5,'1/4.'],[2,'1/2']]},{key:'feedback',label:'Feedback',min:0,max:0.85,step:0.01}]},
  tremolo:{label:'Tremolo', kind:'tremolo', lfoRateHz:5, params:[{key:'lfoRateHz',label:'LFO Rate',unit:'Hz',min:0.5,max:20,step:0.1}]},
  autopan:{label:'Auto-pan', kind:'autopan', lfoRateHz:1, params:[{key:'lfoRateHz',label:'LFO Rate',unit:'Hz',min:0.1,max:10,step:0.1}]},
  crush:{label:'Bitcrusher', kind:'crush', bitDepth:4, params:[{key:'bitDepth',label:'Bit Depth',unit:'bit',min:1,max:16,step:1}]},
  brake:{label:'Vinyl brake', kind:'brake', maxDelaySec:0.35, minHz:700, minGain:0.2},
  swell:{label:'Reverse swell', kind:'swell', fromHz:150, toHz:9000},
  ring:{label:'Ring mod', kind:'ring', carrierHz:250, params:[{key:'carrierHz',label:'Frequency',unit:'Hz',min:20,max:2000,step:5}]} };
const MFX_GAP=0.002, MFX_DROP=0.02, MFX_BOW=12;
const mfxParam=(p,cfg,k)=>p.mfx.params&&p.mfx.params[k]!==undefined?p.mfx.params[k]:cfg[k];
/* the curve: points {t,v} in 0..1 joined by segments, each a quadratic bow (curves[i]: its middle value; none = straight). The ends stay at 0, so
   every effect leaves the song as it found it. Default: rises across the part to its peak 20 ms before the end, then lets go. */
function mfxDefaultNodes(dur){ const pk=1-Math.max(MFX_GAP, Math.min(0.5, MFX_DROP/Math.max(dur,1e-3))); return [{t:0,v:0},{t:pk,v:1},{t:1,v:0}]; }
function mfxNodes(p,dur){ return (p.mfx.curve&&p.mfx.curve.nodes)||mfxDefaultNodes(dur); }
function mfxValAt(nodes,t,cv){ if(t<=nodes[0].t) return nodes[0].v; const N=nodes.length; if(t>=nodes[N-1].t) return nodes[N-1].v;
  for(let i=0;i<N-1;i++){ const a=nodes[i], b=nodes[i+1]; if(t<=b.t){ const dt=b.t-a.t, u=dt>0?(t-a.t)/dt:0, c=(cv&&typeof cv[i]==='number')?cv[i]:(a.v+b.v)/2, w=1-u; return w*w*a.v+2*w*u*c+u*u*b.v; } } return nodes[N-1].v; }
function mfxFrac(p,dur,f){ return clamp(mfxValAt(mfxNodes(p,dur),f,p.mfx.curve&&p.mfx.curve.curves),0,1); }
/* where the curve turns, from `off` seconds into the part: a straight segment is exact with one ramp; a bowed one gets MFX_BOW points */
function mfxPoints(p,dur,off){ const nodes=mfxNodes(p,dur), cv=p.mfx.curve&&p.mfx.curve.curves, f0=dur>0?off/dur:1, out=[];
  for(let i=0;i<nodes.length-1;i++){ const a=nodes[i], b=nodes[i+1]; if(b.t<=f0) continue; const n=(cv&&typeof cv[i]==='number')?MFX_BOW:1;
    for(let k=1;k<=n;k++){ const t=a.t+(b.t-a.t)*k/n; if(t<=f0) continue; out.push({s:t*dur, f:clamp(mfxValAt(nodes,t,cv),0,1)}); } } return out; }
function mfxSweep(par,from,to,p,at,off,dur){ const hz=f=>from*Math.pow(to/from,f); par.setValueAtTime(hz(mfxFrac(p,dur,dur>0?off/dur:1)),at); mfxPoints(p,dur,off).forEach(q=>par.exponentialRampToValueAtTime(hz(q.f),at+q.s-off)); }
function mfxWet(dry,wet,p,at,off,dur){ const w0=mfxFrac(p,dur,dur>0?off/dur:1); wet.gain.setValueAtTime(w0,at); dry.gain.setValueAtTime(1-w0,at); mfxPoints(p,dur,off).forEach(q=>{ wet.gain.linearRampToValueAtTime(q.f,at+q.s-off); dry.gain.linearRampToValueAtTime(1-q.f,at+q.s-off); }); }
function mfxDepth(p,off,dur){ return [{s:off,f:mfxFrac(p,dur,dur>0?off/dur:1)}].concat(mfxPoints(p,dur,off)); }
const MFX_CRUSH={}; function mfxCrushCurve(b){ return MFX_CRUSH[b]||(MFX_CRUSH[b]=(()=>{ const st=Math.pow(2,b), c=new Float32Array(1024); for(let i=0;i<1024;i++){ const x=i/1023*2-1; c[i]=Math.round(x*st)/st; } return c; })()); }
const MFX_NOISE=new WeakMap(), MFX_WASH=new WeakMap();
const mfxRand=seed=>{ let st=seed>>>0; return ()=>{ st^=st<<13; st^=st>>>17; st^=st<<5; return ((st>>>0)/4294967296)*2-1; }; };
function mfxNoise(c){ let b=MFX_NOISE.get(c); if(!b){ b=c.createBuffer(1,Math.floor(c.sampleRate*3),c.sampleRate); const d=b.getChannelData(0), r=mfxRand(0x9E3779B9); for(let i=0;i<d.length;i++) d[i]=r(); MFX_NOISE.set(c,b); } return b; }   /* the prototype's: 3 s, mono */
function mfxWash(c){ let b=MFX_WASH.get(c); if(!b){ const len=Math.floor(c.sampleRate*2.5); b=c.createBuffer(2,len,c.sampleRate); for(let ch=0;ch<2;ch++){ const d=b.getChannelData(ch), r=mfxRand(ch?0x2545F491:0x85EBCA6B); for(let i=0;i<len;i++) d[i]=r()*Math.pow(1-i/len,3); } MFX_WASH.set(c,b); } return b; }   /* the prototype's wash: 2.5 s, fading as (1-t)^3 */
/* one effect as a unit: input, output, and automate(at, off, dur) to shape it over one pass of its part (neutral outside it) */
function mfxUnit(c,p,keep){ const cfg=MFX[p.mfx.k], K=n=>keep(n), G=v=>{ const g=K(c.createGain()); g.gain.value=v; return g; };
  const dryWet=()=>{ const i=G(1), o=G(1), dry=G(1), wet=G(0); i.connect(dry); dry.connect(o); wet.connect(o); return {i,o,dry,wet}; };
  const lfo=(hz,type='sine')=>{ const l=K(c.createOscillator()); l.type=type; l.frequency.value=hz; l.start(); return l; };
  switch(cfg.kind){
    case 'filter': { const f=K(c.createBiquadFilter()); f.type=cfg.type; f.frequency.value=cfg.fromHz; return {p,input:f,output:f,automate:(at,off,dur)=>mfxSweep(f.frequency,cfg.fromHz,Math.min(cfg.toHz,c.sampleRate/2-100),p,at,off,dur)}; }
    case 'phaser': { const u=dryWet(), ap=[]; let n=u.i; for(let i=0;i<cfg.stages;i++){ const a=K(c.createBiquadFilter()); a.type='allpass'; a.frequency.value=mfxParam(p,cfg,'centerHz'); n.connect(a); n=a; ap.push(a); } n.connect(u.wet);
      const l=lfo(mfxParam(p,cfg,'lfoRateHz')), d=G(cfg.lfoDepthHz); l.connect(d); ap.forEach(a=>d.connect(a.frequency)); return {p,input:u.i,output:u.o,automate:(at,off,dur)=>mfxWet(u.dry,u.wet,p,at,off,dur)}; }
    case 'washout': { const u=dryWet(), cv=K(c.createConvolver()), f=K(c.createBiquadFilter()); cv.buffer=mfxWash(c); f.type='highpass'; f.frequency.value=cfg.fromHz; u.i.connect(cv); cv.connect(u.wet); u.o.disconnect(); const o=G(1); u.o.connect(f); f.connect(o);
      return {p,input:u.i,output:o,automate:(at,off,dur)=>{ mfxWet(u.dry,u.wet,p,at,off,dur); mfxSweep(f.frequency,cfg.fromHz,cfg.toHz,p,at,off,dur); }}; }
    case 'echo': { const u=dryWet(), dl=K(c.createDelay(2)), fb=G(mfxParam(p,cfg,'feedback')); dl.delayTime.value=mfxParam(p,cfg,'div')*60/S.bpm; u.i.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(u.wet); return {p,input:u.i,output:u.o,automate:(at,off,dur)=>mfxWet(u.dry,u.wet,p,at,off,dur)}; }
    case 'tremolo': { const g=G(1), l=lfo(mfxParam(p,cfg,'lfoRateHz')), d=G(0); l.connect(d); d.connect(g.gain); return {p,input:g,output:g,automate:(at,off,dur)=>mfxDepth(p,off,dur).forEach((q,i)=>{ const m=i?'linearRampToValueAtTime':'setValueAtTime', t=at+q.s-off; g.gain[m](1-q.f/2,t); d.gain[m](q.f/2,t); })}; }
    case 'autopan': { const pn=K(c.createStereoPanner()), l=lfo(mfxParam(p,cfg,'lfoRateHz')), d=G(0); l.connect(d); d.connect(pn.pan); return {p,input:pn,output:pn,automate:(at,off,dur)=>mfxDepth(p,off,dur).forEach((q,i)=>d.gain[i?'linearRampToValueAtTime':'setValueAtTime'](q.f,at+q.s-off))}; }
    case 'crush': { const u=dryWet(), sh=K(c.createWaveShaper()); sh.curve=mfxCrushCurve(mfxParam(p,cfg,'bitDepth')); u.i.connect(sh); sh.connect(u.wet); return {p,input:u.i,output:u.o,automate:(at,off,dur)=>mfxWet(u.dry,u.wet,p,at,off,dur)}; }
    case 'brake': { const dl=K(c.createDelay(1)), f=K(c.createBiquadFilter()), g=G(1); dl.delayTime.value=0.002; f.type='lowpass'; f.frequency.value=Math.min(20000,c.sampleRate/2-100); dl.connect(f); f.connect(g);
      const top=Math.min(20000,c.sampleRate/2-100); return {p,input:dl,output:g,automate:(at,off,dur)=>mfxDepth(p,off,dur).forEach((q,i)=>{ const m=i?'linearRampToValueAtTime':'setValueAtTime', t=at+q.s-off; dl.delayTime[m](0.002+q.f*cfg.maxDelaySec,t); f.frequency[m](top-q.f*(top-cfg.minHz),t); g.gain[m](1-q.f*(1-cfg.minGain),t); })}; }
    case 'swell': { const u=dryWet(), nz=K(c.createBufferSource()), f=K(c.createBiquadFilter()); nz.buffer=mfxNoise(c); nz.loop=true; f.type='bandpass'; f.Q.value=1.2; f.frequency.value=cfg.fromHz; nz.connect(f); f.connect(u.wet); nz.start();   /* as the prototype: rising filtered noise, crossfaded against the mix */
      return {p,input:u.i,output:u.o,automate:(at,off,dur)=>{ mfxWet(u.dry,u.wet,p,at,off,dur); mfxSweep(f.frequency,cfg.fromHz,cfg.toHz,p,at,off,dur); }}; }
    case 'ring': { const u=dryWet(), rg=G(0), car=lfo(mfxParam(p,cfg,'carrierHz')); car.connect(rg.gain); u.i.connect(rg); rg.connect(u.wet); return {p,input:u.i,output:u.o,automate:(at,off,dur)=>mfxWet(u.dry,u.wet,p,at,off,dur)}; } } }
/* which effects play, in order: Mix FX tracks top to bottom (a muted one is bypassed), each track's parts in time */
function mfxParts(){ const lanes=s2Lanes().filter(L=>L.tracks[0].inst==='mix'); const out=[]; lanes.forEach(L=>L.tracks.filter(t=>t.mfx&&MFX[t.mfx.k]&&!t.mute).sort((a,b)=>(a.off||0)-(b.off||0)).forEach(t=>out.push(t))); return out; }
const mfxSig=()=>JSON.stringify([mfxParts().map(t=>[t.id,t.off,t.len,t.mfx]),S.bpm,S.bars]);
function mfxWire(ch, units){ try{ ch.out.disconnect(); }catch(e){} let n=ch.out; for(const u of units){ n.connect(u.input); n=u.output; } n.connect(ch.lim); }   /* the last thing before the limiter, as in the prototype */
const mfxSpan=p=>{ const a=(p.off||0)*stepDur(); return {a, d:Math.max(0.05,Math.min(pSteps(p)*stepDur(), loopLen()-a))}; };
/* playback: units in the live chain, each part's curve scheduled up to 2 s ahead every time round the loop; rebuilt when you stop, seek or edit */
let mfxLive=null;
function mfxStop(){ const M=mfxLive; mfxLive=null; if(!M) return; clearInterval(M.timer); M.nodes.forEach(n=>{ try{ n.disconnect(); }catch(e){} try{ if(n.stop) n.stop(); }catch(e){} }); if(chain) mfxWire(chain,[]); }
function mfxStart(when, off){ mfxStop(); if(!chain) return; const parts=mfxParts(); if(!parts.length) return; const nodes=[], units=parts.map(p=>mfxUnit(ctx,p,n=>{ nodes.push(n); return n; }));
  mfxWire(chain,units); mfxLive={units, nodes, T0:when-off, L:loopLen(), from:when, k:units.map(()=>0), sig:mfxSig(), timer:setInterval(mfxTick,250)}; mfxTick(); }
function mfxTick(){ const M=mfxLive; if(!M||!ctx) return; if(playing && mfxSig()!==M.sig){ const now=ctx.currentTime+0.03; mfxStart(now, (((now-M.T0)%M.L)+M.L)%M.L); return; }
  const until=ctx.currentTime+2; M.units.forEach((u,i)=>{ const {a,d}=mfxSpan(u.p); for(let guard=0;guard<64;guard++){ const s0=M.T0+M.k[i]*M.L+a, e=s0+d; if(s0>until) break; if(e>M.from){ const at=Math.max(s0,M.from); try{ u.automate(at,at-s0,d); }catch(err){} } M.k[i]++; } }); }
/* a mix render: the same units, scheduled for each of its K passes */
function mfxOffline(oc, ch, K){ const parts=mfxParts(); if(!parts.length) return; const units=parts.map(p=>mfxUnit(oc,p,n=>n)); mfxWire(ch,units); const L=loopLen();
  for(let k=0;k<K;k++) units.forEach(u=>{ const {a,d}=mfxSpan(u.p); u.automate(k*L+a,0,d); }); }
function buildChain(c, live){
  const input=c.createGain(), shaper=c.createWaveShaper(), comp=c.createDynamicsCompressor(), out=c.createGain(), revIn=c.createGain(), conv=c.createConvolver(), revRet=c.createGain();
  // master: trim (auto gain staging) → drive → glue compressor → volume → limiter → safety clipper
  const lim=c.createDynamicsCompressor(), safe=c.createWaveShaper();   /* Song FX go between the volume and this limiter (mfxWire) */ lim.threshold.value=-2; lim.knee.value=0; lim.ratio.value=20; lim.attack.value=0.001; lim.release.value=0.12; safe.curve=SAFE_CURVE; safe.oversample='2x';
  input.connect(shaper); shaper.connect(comp); comp.connect(out); out.connect(lim); lim.connect(safe);
  let gate=null; if(live){ gate=c.createGain(); safe.connect(gate); gate.connect(c.destination); } else safe.connect(c.destination);
  revIn.connect(conv); conv.connect(revRet); revRet.connect(input);
  const ch={input,shaper,comp,out,revIn,conv,revRet,c,gate,lim};
  setChain(ch); return ch;
}
function setChain(ch){
  const m=S.master, punch=m.punch/100, drive=m.drive/100;
  ch.shaper.curve=driveCurve(drive); ch.input.gain.value=trimBase()*mixTrim;
  ch.comp.threshold.value=-4-punch*22; ch.comp.ratio.value=1+punch*6; ch.comp.knee.value=8; ch.comp.attack.value=0.006; ch.comp.release.value=0.14;
  ch.out.gain.value=(m.vol/100)*(1+punch*0.7)*0.9;
  ch.conv.buffer=makeIR(ch.c); ch.revRet.gain.value=REV_RET;
}
function applyMaster(){ if(chain) setChain(chain); }
function trackGain(tr){ const anySolo=S.tracks.some(t=>t.solo); return (tr.mute||(anySolo&&!tr.solo))?0:Math.pow(tr.vol/100,1.6); }
function ensureNodes(tr){
  if(tr._g) return;
  tr._g=ctx.createGain(); tr._p=ctx.createStereoPanner(); tr._snd=ctx.createGain();
  tr._g.connect(tr._p); tr._p.connect(chain.input); tr._p.connect(tr._snd); tr._snd.connect(chain.revIn);
  applyMix(tr,true);
}
function applyMix(tr,now){ if(!tr._g) return; const t=ctx.currentTime;
  tr._g.gain.setTargetAtTime(trackGain(tr),t,now?0:0.02); tr._p.pan.setTargetAtTime(tr.pan/100,t,0.02); tr._snd.gain.setTargetAtTime(Math.pow(tr.send/100,1.5),t,0.02); }
function applyAllMix(){ S.tracks.forEach(t=>applyMix(t)); scheduleTrim(); }

