"use strict";
/* ============================== UI ============================== */
let lastMsg='';
let toastQuiet=false;   /* the voice check shows its own messages */
function toast(msg,ms=4200){ lastMsg=msg; if(toastQuiet || !$('recSheet').hidden) return;   /* that screen shows its own messages */
  const t=$('toast'); t.textContent=msg; t.classList.remove('act'); t.onclick=null; toastPlace(t); t.classList.add('on'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('on'),ms); }
function toastPlace(t){ t.style.bottom=''; try{ if(s2On()){ const r=($('s2Ed').hidden?$('s2Tl'):$('s2EdBody')).getBoundingClientRect(); t.style.bottom=Math.max(8,window.innerHeight-r.bottom+8)+'px'; } }catch(e){} }
document.addEventListener('pointerdown',()=>{ const t=$('toast'); if(t&&t.classList.contains('on')&&!t._busy){ clearTimeout(t._h); t.classList.remove('on'); } },{capture:true,passive:true});   /* any tap puts the message away */
function showBusy(msg){ if(toastQuiet) return ()=>{}; const t=$('toast'); t.textContent=msg; toastPlace(t); t._busy=true; t.classList.add('on'); clearTimeout(t._h); return ()=>{ t._busy=false; }; }
/* instrument picker: grouped, with the mouth sounds and a one-line description */
const PICK_GROUPS=[['Percussion',['kit']],   /* one drum track type (the kit); older songs' single Kick / Snare / Hi-hat / Clap tracks still play and edit */['Melodic',['bass','lead','keys','pad','arp']],['Vocals',['vox']],['Ear candy',['fx','mix']]];
/* ---- spotlight ruler (vocals): drag to create, drag edges to resize, drag the middle to move, tap to select then ✕ to remove ---- */
// (renderTracks keeps tr._spotSel, so a new region stays selected)
/* ---- envelope designer: attack, decay/sustain and release points on a graph ---- */
const ENV_MAX={a:2,d:3,r:3};
/* ---- part tools: length, repeat, duplicate, change instrument ---- */
function deletePart(tr){ const nm=partName(tr); disposeTrack(tr); S.tracks=S.tracks.filter(t=>t!==tr); takeBar=null; keyChanged(); save(); applyAllMix(); renderTracks(); scheduleRender(); toast('Deleted '+nm+'. Tap Undo to bring it back.'); }
/* legato: every note lasts until the next note starts; the last one runs to the end of the part's loop */
/* Tidy (the note editor): one tap for a cleaner, more musical part. Recorded blips one step long join the note before; a note starting just off
   the 8th grid moves onto it; then every note lasts until the next one starts (no gaps). Measured on the owner's 31 guided takes: join + grid
   3.88 -> 3.82 edits per 10 notes (tidy_exp.py); the gap filling changes no notes. Undo brings it back. */
function fillGaps(tr){ const n=pSteps(tr), q=S.quant==8?2:1; let joined=0, moved=0, changed=0;
  let ns=tr.notes.filter(x=>x.s>=0&&x.s<n).sort((a,b)=>a.s-b.s); if(!ns.length) return;
  for(let i=1;i<ns.length;i++){ const a=ns[i-1], b=ns[i]; if(!b.x && b.l<=1 && b.s-(a.s+a.l)<=1){ a.l=b.s+b.l-a.s; tr.notes.splice(tr.notes.indexOf(b),1); ns.splice(i,1); i--; joined++; } }
  if(q===1) ns.forEach((x,i)=>{ if(x.s%2 && !x.x){   /* recorded notes only: notes you drew stay where you put them */ const to=x.s-1, pv=ns[i-1]; if(!pv||pv.s<to){ x.s=to; x.l+=1; moved++; } } });
  const starts=[...new Set(ns.map(x=>x.s))].sort((a,b)=>a-b);
  ns.forEach(x=>{ const nx=starts.find(v=>v>x.s), l=(nx==null?n:nx)-x.s; if(l!==x.l){ x.l=l; changed++; } });
  if(!joined&&!moved&&!changed){ toast('Already tidy'); return; }
  logEdit(tr,{k:'tidy',joined,moved}); tr.notes.sort((a,b)=>a.s-b.s); tr._dirty=true; keyCache=null; save(); redrawTrack(tr); renderNoteBar(tr); scheduleRender();
  toast(`Tidied ${partName(tr)}${joined?`: ${joined} tiny note${joined>1?'s':''} joined`:''}${moved?`${joined?',':':'} ${moved} lined up on the beat`:''}. Tap Undo to go back.`); }
function changeInst(tr,k){ if(tr.inst===k) return; const from=INST[tr.inst], to=INST[k];
  if(to.kind==='drum'){ const m=new Map(); tr.hits.forEach(h=>{ if(!m.has(h.s)||m.get(h.s).v<h.v) m.set(h.s,{...h,d:to.drum}); }); tr.hits=[...m.values()].sort((a,b)=>a.s-b.s); tr._an=null; tr._takes=null; }
  if(k==='kit'){ tr.hits.forEach(h=>{ if(!slotOf(h.d) && S.kit.slots.length<MAX_SLOTS && !S.kit.slots.some(x=>x.sound===h.d)) S.kit.slots.push({id:h.d,sound:h.d,say:''}); }); tr._an=null; tr._takes=null; }
  const was=partName(tr); tr.inst=k; if(!to.sounds.includes(tr.sound)) tr.sound=mkTrack(k).sound; if(from.kind==='pitched') tr.oct=to.oct||0; autoOct(tr);
  tr._dirty=true; keyCache=null; keyChanged(); save(); renderTracks(); scheduleRender(); toast(`${was} now plays ${to.label}`); }
const pct=v=>v+'%';
function partName(tr){ if(tr.name) return tr.name; const same=S.tracks.filter(t=>t.inst===tr.inst); return INST[tr.inst].label+(same.length>1?' '+(same.indexOf(tr)+1):''); }
let gridCW=16; try{ const z=+localStorage.getItem('noodle.zoom'); if(isFinite(z)&&z>0) gridCW=z; }catch(e){}
const zoomCW=()=>isFinite(gridCW)&&gridCW>0?gridCW:16;
function setZoom(tr,cw,anchorX){ const G=tr._grid, wrap=tr._cv&&tr._cv.parentElement.parentElement; if(!G||!wrap) return;
  const ax=anchorX==null?wrap.clientWidth/2:anchorX, step=(wrap.scrollLeft+ax-G.gut)/G.cw;
  if(!isFinite(cw)||cw<=0) return;   // a bad pinch reading (two touches at one point) must never become the zoom
  gridCW=clamp(cw,G.fit,40); try{ localStorage.setItem('noodle.zoom',gridCW); }catch(e){}
  drawGrid(tr); const G2=tr._grid; wrap.scrollLeft=Math.max(0,step*G2.cw+G2.gut-ax); tr._scrollX=wrap.scrollLeft; }
/* overview under the grid: the whole part in miniature, with a window over the part you're looking at */
function drawOverview(tr){ const cv=tr._cv; if(!cv||!cv.isConnected) return; const box=cv.closest('.track'), ov=box&&box.querySelector('.ovw'); if(!ov) return;
  const wrap=cv.parentElement.parentElement, over=wrap.scrollWidth>wrap.clientWidth+2; ov.hidden=!over; if(!over) return;
  const oc=ov.querySelector('canvas'), W=ov.clientWidth||300, H=ov.clientHeight||26, dpr=Math.min(2,window.devicePixelRatio||1); oc.width=Math.round(W*dpr); oc.height=Math.round(H*dpr);
  const g=oc.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H); const n=pSteps(tr), cw=W/n, col=INST[tr.inst].color;
  g.fillStyle=cssVar('--beat'); for(let s0=0;s0<n;s0+=8) g.fillRect(s0*cw,0,cw*4,H);
  g.fillStyle=cssVar('--barline'); for(let s0=16;s0<n;s0+=16) g.fillRect(s0*cw,0,1,H);
  g.fillStyle=col;
  if(INST[tr.inst].kind==='pitched'){ const ps=tr.notes.map(pitchOf); if(ps.length){ const lo=Math.min(...ps)-1, hi=Math.max(...ps)+1, rh=Math.max(2,(H-4)/Math.max(6,hi-lo+1));
    tr.notes.forEach(nt=>{ if(nt.s>=n) return; g.globalAlpha=0.55+0.45*nt.v; g.fillRect(nt.s*cw,Math.max(1,H-2-(pitchOf(nt)-lo+1)*rh),Math.max(1.5,nt.l*cw-0.5),Math.max(2,rh-0.5)); }); } }
  else { const rows=tr._grid?tr._grid.rows:[INST[tr.inst].drum], rh=(H-2)/Math.max(rows.length,1); tr.hits.forEach(h=>{ if(h.s>=n) return; const i=Math.max(0,rows.indexOf(h.d)); g.globalAlpha=0.45+0.55*h.v; g.fillRect(h.s*cw,1+i*rh,Math.max(1.5,cw-0.5),Math.max(2,rh-0.5)); }); }
  g.globalAlpha=1; overviewWin(tr); }
function overviewWin(tr){ const cv=tr._cv; if(!cv||!cv.isConnected) return; const ov=cv.closest('.track').querySelector('.ovw'); if(!ov||ov.hidden) return;
  const wrap=cv.parentElement.parentElement, sw=wrap.scrollWidth||1, win=ov.querySelector('.ovw-win');
  win.style.left=(wrap.scrollLeft/sw*100)+'%'; win.style.width=(wrap.clientWidth/sw*100)+'%'; }
function wireOverview(tr,el){ const ov=el.querySelector('.ovw'); if(!ov) return; let drag=null;
  const go=e=>{ const wrap=tr._cv.parentElement.parentElement, r=ov.getBoundingClientRect(), f=clamp((e.clientX-r.left)/r.width,0,1);
    tr._touchT=Date.now(); wrap.scrollLeft=clamp(f*wrap.scrollWidth-wrap.clientWidth/2, 0, wrap.scrollWidth-wrap.clientWidth); overviewWin(tr); };
  ov.addEventListener('pointerdown',e=>{ drag=e.pointerId; try{ ov.setPointerCapture(e.pointerId); }catch(_){} go(e); });
  ov.addEventListener('pointermove',e=>{ if(drag===e.pointerId) go(e); });
  ['pointerup','pointercancel'].forEach(ev=>ov.addEventListener(ev,()=>{ drag=null; })); }
function wireGrid(tr,el){ const wrap=el.querySelector('.gridwrap'); if(!wrap) return; const touched=()=>{ tr._touchT=Date.now(); };
  wireOverview(tr,el); wrap.addEventListener('scroll',()=>overviewWin(tr),{passive:true});
  wrap.addEventListener('scroll',()=>{ if(!tr._autoScroll) { tr._scrollX=wrap.scrollLeft; } tr._autoScroll=false; },{passive:true});
  ['pointerdown','wheel','touchstart'].forEach(ev=>wrap.addEventListener(ev,touched,{passive:true}));
  let pinch=null; const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
  wrap.addEventListener('touchstart',e=>{ if(e.touches.length===2 && tr._grid){ const r=wrap.getBoundingClientRect(); pinch=dist(e.touches)<12?null:{d:dist(e.touches),cw:tr._grid.cw,x:(e.touches[0].clientX+e.touches[1].clientX)/2-r.left}; tr._drag=null; } },{passive:true});
  wrap.addEventListener('touchmove',e=>{ if(pinch && e.touches.length===2){ e.preventDefault(); const cw=pinch.cw*dist(e.touches)/pinch.d; if(!pinch.raf) pinch.raf=requestAnimationFrame(()=>{ if(pinch){ pinch.raf=0; setZoom(tr,cw,pinch.x); } }); } },{passive:false});
  wrap.addEventListener('touchend',e=>{ if(e.touches.length<2) pinch=null; },{passive:true});
  wrap.addEventListener('wheel',e=>{ if(e.ctrlKey && tr._grid){ e.preventDefault(); const r=wrap.getBoundingClientRect(); setZoom(tr,tr._grid.cw*Math.exp(-e.deltaY*0.01),e.clientX-r.left); } },{passive:false});
  const zi=el.querySelector('.zi'), zo=el.querySelector('.zo');
  if(zi) zi.onclick=()=>{ touched(); setZoom(tr,(tr._grid?tr._grid.cw:gridCW)*1.5); }; if(zo) zo.onclick=()=>{ touched(); setZoom(tr,(tr._grid?tr._grid.cw:gridCW)/1.5); };
}
function renderTracks(){ warmSounds(); }   /* the Studio (s2Render) draws the tracks; this name is the redraw hook */
/* The song's recorded instruments and kits, read into memory as soon as it opens (or a part changes sound), so even the first note you tap plays the recording.
   Each loads once (cached); only what the song uses, to keep memory low. */
function warmSounds(){ const used=new Set();
  for(const k of ((S.kit&&S.kit.slots)||[]).map(x=>x.kit)) if(KIT_SAMPLED[k]&&S.tracks.some(t=>t.hits)){ used.add(KIT_SAMPLED[k]); loadSmp(KIT_SAMPLED[k]); }   /* drums taken from another kit */
  for(const t of S.tracks){ if(INST[t.inst].kind==='pitched'){ if(SAMPLED[t.sound]){ used.add(SAMPLED[t.sound]); loadSampled(t.sound); } } else if(t.hits && KIT_SAMPLED[t.sound]){ used.add(KIT_SAMPLED[t.sound]); loadSmp(KIT_SAMPLED[t.sound]); } }
  for(const k of Object.keys(SMP)) if(!used.has(k) && SMP[k].ok) delete SMP[k];   /* let go of instruments this song no longer uses (they load again if picked); the piano alone is ~130 MB */
  if(!S.tracks.some(t=>t.sound==='String pluck')) KS_C.clear(); }
/* small one-line picture of a part's pattern, for the parts list and the review step */
function buildCard(tr){
    const d=INST[tr.inst];
    const el=document.createElement('article'); el.className='track'; el.style.setProperty('--c',d.color); tr._el=el;
    const pitched=d.kind==='pitched';
    el.innerHTML=`<div class="gridbox"><div class="gridwrap"><div class="gridin">${tr.inst==="vox"?"":`<div class="edrul" aria-label="Bar numbers: tap or drag to move the playhead"><i class="edrul-ph"></i></div>`}<canvas></canvas><div class="ph"></div><div class="nsel" hidden></div></div></div><div class="glabels"></div></div><div class="selbar" hidden><span class="sb-n"></span><span class="sb-mv"><button class="btn sb-l" aria-label="Earlier"><svg class="nx-ico" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><button class="btn sb-r" aria-label="Later"><svg class="nx-ico" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button></span><span class="sb-pt"><button class="btn sb-dn" aria-label="Lower"><svg class="nx-ico" viewBox="0 0 24 24"><path d="M5 9l7 7 7-7"/></svg></button><button class="btn sb-up" aria-label="Higher"><svg class="nx-ico" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7"/></svg></button></span><button class="btn sb-split" title="Split into repeats (or double-tap the note)">Split</button><button class="btn sb-join" hidden aria-pressed="false"><svg class="nx-ico" viewBox="0 0 24 24"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></svg><span>Join</span></button><span class="sb-sp" hidden>Into <button class="btn" data-n="2">2</button><button class="btn" data-n="3">3</button><button class="btn" data-n="4">4</button></span><button class="btn sb-del">Delete</button><label class="sb-vel"><span>Velocity</span><input type="range" min="5" max="100" step="1" aria-label="Velocity: how hard this note or hit is played"><output></output></label></div><div class="ovrow"><div class="ovw" hidden aria-hidden="true"><canvas></canvas><div class="ovw-win"></div></div></div>`;
    if(tr._sel && !evs(tr).includes(tr._sel)) tr._sel=null;
    const cv=el.querySelector('canvas');
    const hs=el.querySelector('.nsel'); tr._nsel=hs; 
    tr._selbar=el.querySelector('.selbar'); tr._ndel=null; tr._nsplit=null;
    if(tr._selbar){ const sb=tr._selbar; sb.querySelector('.sb-del').onclick=()=>tr._msel&&tr._msel.length?deleteGroup(tr):deleteSelNote(tr); sb.querySelector('.sb-split').onclick=()=>splitAsk(tr); sb.querySelector('.sb-join').onclick=()=>joinToggle(tr);
      sb.querySelector('.sb-sp').onclick=e=>{ const b=e.target.closest('[data-n]'); if(b) splitInto(tr,+b.dataset.n); };
      sb.querySelector('.sb-up').onclick=()=>nudge(tr,0,1); sb.querySelector('.sb-dn').onclick=()=>nudge(tr,0,-1); sb.querySelector('.sb-l').onclick=()=>nudge(tr,-1,0); sb.querySelector('.sb-r').onclick=()=>nudge(tr,1,0);
      const vs=tr._selbar.querySelector('.sb-vel input'), vo=tr._selbar.querySelector('.sb-vel output');   /* velocity of the selected note or hit: how hard it is played (louder; brighter for some sounds) */
      vs.oninput=()=>{ vo.textContent=vs.value; }; vs.onchange=()=>{ if(tr._msel&&tr._msel.length){ const to=+vs.value/100; tr._msel.forEach(n=>{ logEdit(tr,{k:'vel',s:n.s,from:+(n.v??0.85).toFixed(2),to}); n.v=to; }); evChanged(tr); return; } const n=tr._sel; if(!n||!evs(tr).includes(n)) return; const to=+vs.value/100; logEdit(tr,{k:'vel',s:n.s,from:+(n.v??0.85).toFixed(2),to}); n.v=to; evChanged(tr); if(!playing) previewEv(tr,n); }; }
    if(tr._ndel){ tr._ndel.addEventListener('pointerdown',e=>e.stopPropagation()); tr._ndel.onclick=e=>{ e.stopPropagation(); deleteSelNote(tr); }; }
    if(hs){ hs.addEventListener('pointerdown',e=>{ e.stopPropagation(); noteDown(tr,e,true); }); hs.addEventListener('pointermove',e=>noteMove(tr,e)); hs.addEventListener('pointerup',e=>noteUp(tr,e)); hs.addEventListener('pointercancel',e=>noteUp(tr,e,true)); }
    if(d.kind!=='audio'){ cv.style.touchAction='pan-x pan-y'; cv.addEventListener('touchstart',e=>{ if(e.touches.length===1 && groupHit(tr,e.touches[0])) e.preventDefault(); },{passive:false}); cv.addEventListener('touchmove',e=>{ const dd=tr._drag; if(dd&&(dd.box||dd.group)) e.preventDefault(); },{passive:false}); cv.addEventListener('pointerdown',e=>noteDown(tr,e)); cv.addEventListener('pointermove',e=>noteMove(tr,e)); cv.addEventListener('pointerup',e=>noteUp(tr,e)); cv.addEventListener('pointercancel',e=>noteUp(tr,e,true)); }   /* notes and drum hits alike */
    tr._cv=cv; tr._ph=el.querySelector('.ph');
    wireGrid(tr,el);
    drawGrid(tr);
    return el;
}
function redrawTrack(tr){ if(tr._cv&&tr._cv.isConnected) drawGrid(tr); }
let origSrc=null;
let GRID_H=176, GRID_RH=15, GRID_DRUM=1;   /* grid height budget, tallest pitched row, drum row scale */
function gridRows(tr){
  const d=INST[tr.inst];
  if(d.kind==='drums'){ const rows=S.kit.slots.map(x=>x.id).reverse(); (tr.hits||[]).forEach(h=>{ if(!rows.includes(h.d)) rows.unshift(h.d); }); return {rows, rh:rows.length>6?17:20}; }
  if(d.kind==='drum') return {rows:[d.drum], rh:30};
  const ps=tr.notes.filter(nt=>nt.s>=0&&nt.s<pSteps(tr)).map(pitchOf); let lo=ps.length?Math.min(...ps):60, hi=ps.length?Math.max(...ps):67;
  lo-=2; hi+=2;
  // keep the visible pitch range steady while editing: it only grows when a note goes past the edge
  if(tr._range && ps.length){ lo=Math.min(lo,tr._range.lo); hi=Math.max(hi,tr._range.hi); }
  else if(tr._range){ lo=tr._range.lo; hi=tr._range.hi; }
  else { while(hi-lo<11){ hi++; if(hi-lo<11) lo--; } }
  tr._range={lo,hi};
  const rows=[]; for(let m=hi;m>=lo;m--) rows.push(m);
  /* key notes only (the note editor's default when the song has a key): rows for notes in the key, plus any note already placed outside it */
  const K=currentKey(); if(!K.none && !s2.chrom && s2.edId===tr.id){ const ink=m=>K.set.includes(((m-K.tonic)%12+12)%12), used=new Set(ps); let a=lo, z=hi; const pick=()=>{ const r=[]; for(let m=z;m>=a;m--) if(ink(m)||used.has(m)) r.push(m); return r; }; let kr=pick(); while(kr.length<10){ a--; z++; kr=pick(); } return {rows:kr, rh:kr.length>14?10:12}; }
  return {rows, rh:rows.length>20?9:11};
}
function cssVar(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function drawVox(tr){
  const cv=tr._cv, wrap=cv.parentElement.parentElement, W=Math.max(200,wrap.clientWidth||320), H=170, n=pSteps(tr), dpr=window.devicePixelRatio||1, cw=W/n;
  cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); cv.style.width=W+'px'; cv.style.height=H+'px'; cv.parentElement.style.width=W+'px'; tr._ph.style.height=H+'px';
  tr._grid={cw,rh:H,rows:[],W,gut:0,sPL:n,lineH:H,gapH:0,lines:1};
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H); const col=INST[tr.inst].color;
  g.fillStyle=cssVar('--beat'); for(let s0=0;s0<n;s0+=8) g.fillRect(s0*cw,0,cw*4,H);
  g.fillStyle=cssVar('--barline'); for(let s0=16;s0<n;s0+=16) g.fillRect(s0*cw,0,1,H);
  g.fillStyle=cssVar('--muted'); g.font='700 9px '+cssVar('--f-mono'); for(let s0=0;s0<n;s0+=16) g.fillText(String(s0/16+1),s0*cw+3,10);
  (tr.spot||[]).forEach(z=>{ g.fillStyle=cssVar('--lcd-ink'); g.globalAlpha=0.14; g.fillRect(z.s*cw,0,(z.e-z.s)*cw,H); g.globalAlpha=0.7; g.fillRect(z.s*cw,0,1,H); g.fillRect(z.e*cw-1,0,1,H); g.globalAlpha=1; });
  if(!tr._raw){ g.fillStyle=cssVar('--muted'); g.font='13px '+cssVar('--f-body'); g.fillText('This take isn’t saved on this device. Record it again.',10,H/2); return; }
  const {x,sr}=tr._raw, va=tr.va||0, L=pSteps(tr)*stepDur(); g.fillStyle=col; g.globalAlpha=0.35;
  for(let px=0;px<W;px++){ const a=Math.floor((va+px/W*L)*sr), b2=Math.floor((va+(px+1)/W*L)*sr); let m=0; for(let i=Math.max(0,a);i<Math.min(x.length,b2);i+=3) m=Math.max(m,Math.abs(x[i])); const h=Math.min(H-20,m*H*1.4); g.fillRect(px,(H-h)/2+6,1,Math.max(1,h)); }
  g.globalAlpha=1;
  const fr=voxPitch(tr), corr=voxTarget(tr), ms=fr.map(f=>f.ms).filter(v=>!isNaN(v)); if(!ms.length) return;
  const lo=Math.floor(Math.min(...ms))-2, hi=Math.ceil(Math.max(...ms))+2, y=m=>H-8-(m-lo)/(hi-lo)*(H-24), K=currentKey();
  g.strokeStyle=cssVar('--barline'); g.globalAlpha=0.35; g.lineWidth=1; for(let m=lo;m<=hi;m++){ if(!K.none && !K.set.includes(((m-K.tonic)%12+12)%12)) continue; g.beginPath(); g.moveTo(0,y(m)); g.lineTo(W,y(m)); g.stroke(); } g.globalAlpha=1;
  const line=(val,color,wid)=>{ g.strokeStyle=color; g.lineWidth=wid; g.beginPath(); let on=false; fr.forEach((f,i)=>{ const v=val(f,i); const px=(f.t-va)/L*W; if(isNaN(v)||px<0||px>W){ on=false; return; } if(!on){ g.moveTo(px,y(v)); on=true; } else g.lineTo(px,y(v)); }); g.stroke(); };
  line(f=>f.ms, cssVar('--muted'), 1.5);
  if(fxOf(tr).tune>0) line((f,i)=>f.ms+corr[i], cssVar('--ink'), 2);
}
const EDRUL_H=26;   /* the editor's bar ruler above the grid (tap or drag it to move the playhead) */
function edRulerWire(tr,R){ if(R._wired) return; R._wired=true; let drag=false;
  const at=e=>{ const G=tr._grid; if(!G) return null; const x=e.clientX-R.getBoundingClientRect().left-G.gut, s=clamp(x/G.cw,0,pSteps(tr)-0.001), L=loopLen(); return Math.min(((tr.off||0)+s)*stepDur(),L-0.001); };
  const set=(e,go)=>{ if(recState) return; const a=at(e); if(a==null) return; playFrom=a; s2.cur=a/loopLen()*S.bars; s2.pos=-1; edSeekDraw(); if(go&&playing&&ctx) startAll(ctx.currentTime+0.02,a); };
  R.addEventListener('pointerdown',e=>{ e.stopPropagation(); drag=true; try{ R.setPointerCapture(e.pointerId); }catch(_){} set(e,false); });
  R.addEventListener('pointermove',e=>{ if(drag){ e.stopPropagation(); set(e,false); } });
  R.addEventListener('pointerup',e=>{ if(!drag) return; drag=false; set(e,true); }); R.addEventListener('pointercancel',()=>{ drag=false; }); }
function drawGrid(tr){
  if(tr.inst==='vox'){ if(tr._cv) drawVox(tr); return; }
  if(!tr._ovRaf) tr._ovRaf=requestAnimationFrame(()=>{ tr._ovRaf=0; drawOverview(tr); });
  const cv=tr._cv; if(!cv) return; const wrap=cv.parentElement.parentElement; const n=pSteps(tr); const VN=(tr.notes||[]).filter(nt=>nt.s>=0&&nt.s<n), VH=(tr.hits||[]).filter(h=>h.s>=0&&h.s<n);   /* only what is inside the part's window (a trim keeps the rest) */
  const pitched=INST[tr.inst].kind==='pitched';
  const gr=gridRows(tr), rows=gr.rows, rh=pitched?clamp(Math.floor(GRID_H/Math.max(1,rows.length)),8,GRID_RH):Math.round(gr.rh*GRID_DRUM); const gut=pitched?40:(rows.length>1?52:0);
  const VW=Math.max(200,wrap.clientWidth||320), fit=(VW-gut)/n, cw=Math.max(fit, Math.min(zoomCW(),40)), W=Math.ceil(gut+n*cw);
  const sPL=n, lines=1, lineH=rows.length*rh+2, gapH=0, H=lineH;
  tr._grid={cw,rh,rows,W,gut,sPL,lineH,gapH,lines,fit};
  const dpr=Math.min(2,window.devicePixelRatio||1); cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); cv.style.width=W+'px'; cv.style.height=H+'px';
  cv.parentElement.style.width=W+'px'; tr._ph.style.height=(lineH+EDRUL_H)+'px';
  { const R=cv.parentElement.querySelector('.edrul'); if(R){ const b0=Math.floor((tr.off||0)/16); R.style.width=W+'px'; R.querySelectorAll('span').forEach(x=>x.remove()); for(let k=0;k*16<n;k++) R.insertAdjacentHTML('beforeend',`<span style="left:${gut+k*16*cw}px">${b0+k+1}</span>`); edRulerWire(tr,R); } }
  const lab=wrap.parentElement.querySelector('.glabels'); if(lab){ lab.style.width=gut?gut+'px':'0'; lab.innerHTML=!gut?'':pitched
      ? rows.map((r,i)=>{ const m=r+12*(tr.oct||0), pc=((m%12)+12)%12, blk=[1,3,6,8,10].includes(pc), nm=NOTE_NAMES[pc]+(Math.floor(m/12)-1), show=rh>=10||pc===0;
          return `<span class="pkey${blk?' blk':''}${pc===0?' c':''}" data-m="${r}" style="top:${1+i*rh}px;height:${rh}px;width:${gut}px">${show?nm:''}</span>`; }).join('')
      : rows.map((r,i)=>`<span style="top:${1+i*rh}px;height:${rh}px;width:${gut}px">${slotLabel(r).slice(0,8)}</span>`).join('');
    lab.classList.toggle('keys',pitched); if(pitched && !lab._wired){ lab._wired=true; lab.addEventListener('pointerdown',e=>{ const k=e.target.closest('.pkey'); if(!k) return; k.classList.add('hit'); setTimeout(()=>k.classList.remove('hit'),160); previewNote(tr,+k.dataset.m); }); } }
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
  const cCell=cssVar('--cell'), cBeat=cssVar('--beat'), cBar=cssVar('--barline'), cPanel=cssVar('--panel'), col=INST[tr.inst].color, mono=cssVar('--f-mono');
  const X=s=>gut+(s%sPL)*cw, Y=s=>Math.floor(s/sPL)*(lineH+gapH);
  if(gapH){ g.fillStyle=cPanel; for(let L=1;L<lines;L++) g.fillRect(0,L*(lineH+gapH)-gapH,W,gapH); }
  for(let s=0;s<n;s++){ if(Math.floor(s/4)%2===0){ g.fillStyle=cBeat; g.fillRect(X(s),Y(s),cw,lineH); } }
  const K=currentKey();
  if(pitched && !K.none){ g.fillStyle=cBar; g.globalAlpha=0.12; for(let L=0;L<lines;L++) rows.forEach((m,i)=>{ if(K.set.includes(((m-K.tonic)%12+12)%12)) g.fillRect(0,L*(lineH+gapH)+1+i*rh,W,rh-1); }); g.globalAlpha=1; }
  g.fillStyle=cBar; for(let s=0;s<n;s+=16) if(s%sPL!==0) g.fillRect(X(s),Y(s),1,lineH);
  // bar numbers, top-left of each bar
  /* bar numbers: on the ruler above the grid */
  if(!pitched){
    g.fillStyle=cBar; g.globalAlpha=0.18; for(let L=0;L<lines;L++) rows.forEach((r,i)=>{ g.fillRect(0,L*(lineH+gapH)+1+(i+1)*rh-0.5,W,1); }); g.globalAlpha=1;   /* a line between drums, like between keys */
    rawTicks(tr,g,X,Y,cw,lineH,n,sPL,gut,lines,gapH);
    const selH=tr._sel, hw=Math.max(cw-2,6);
    VH.forEach(h=>{ const i=rows.indexOf(h.d); if(i<0) return; g.globalAlpha=h===selH?1:0.45+0.55*h.v; g.fillStyle=col; rr(g,X(h.s)+1,Y(h.s)+1+i*rh+0.5,hw,rh-1,1.5); g.fill(); }); g.globalAlpha=1;
    (tr._msel||[]).forEach(h=>{ const i=rows.indexOf(h.d); if(i<0||!VH.includes(h)) return; g.strokeStyle=cssVar('--ink'); g.lineWidth=2; rr(g,X(h.s)+1,Y(h.s)+1+i*rh+0.5,hw,rh-1,1.5); g.stroke(); });
    if(selH && VH.includes(selH)){ const i=rows.indexOf(selH.d); if(i>=0){ g.strokeStyle=cssVar('--ink'); g.lineWidth=2; rr(g,X(selH.s)+1,Y(selH.s)+1+i*rh+0.5,hw,rh-1,1.5); g.stroke(); } }
    placeHandle(tr);
  } else {
    rawTicks(tr,g,X,Y,cw,lineH,n,sPL,gut,lines,gapH);
    const selN=tr._sel; (tr.notes||[]).forEach(nt=>{ if(nt.lg&&!joinPrev(tr,nt)) delete nt.lg; });   /* a gap breaks a join */
    VN.forEach(nt=>{ const i=rows.indexOf(pitchOf(nt)); if(i<0) return; g.globalAlpha=nt===selN?1:0.45+0.55*nt.v; g.fillStyle=col;
      let s=nt.s, left=Math.min(nt.l,n-nt.s); while(left>0){ const room=sPL-(s%sPL), seg=Math.min(left,room); rr(g,X(s)+1,Y(s)+1+i*rh+0.5,Math.max(cw*seg-2,3),rh-1,1.5); g.fill(); s=(s+seg)%n; left-=seg; } });
    /* joined notes: a thin line from where one note ends to where the joined note starts */
    if(TAP_MONO.has(tr.inst)){ g.strokeStyle=cssVar('--ink'); g.globalAlpha=0.85; g.lineWidth=1.5; g.setLineDash([3,2]); VN.forEach(nt=>{ if(!nt.lg) return; const pv=joinPrev(tr,nt), i=rows.indexOf(pitchOf(nt)), j=pv?rows.indexOf(pitchOf(pv)):-1; if(i<0||j<0) return;
      const x=X(nt.s), y0=Y(nt.s)+1+j*rh+rh/2, y1=Y(nt.s)+1+i*rh+rh/2; g.beginPath(); g.moveTo(x-Math.min(6,cw/2),y0); g.lineTo(x,y0); g.lineTo(x,y1); g.lineTo(x+Math.min(6,cw/2),y1); g.stroke(); }); g.setLineDash([]); g.globalAlpha=1; }
    /* split hints: a faint seam where a held note may be two notes (tap it to split) */
    g.globalAlpha=0.55; g.fillStyle=cCell; VN.forEach(nt=>{ if(!nt.hs) return; const i=rows.indexOf(pitchOf(nt)); if(i<0) return;
      nt.hs.forEach(o=>{ if(o<=0||o>=nt.l) return; const s=(nt.s+o)%n; g.fillRect(X(s)-1,Y(s)+1+i*rh+2,2,Math.max(2,rh-5)); }); });
    g.globalAlpha=1;
    // chord name on each note (when chords are on): e.g. Am, C7, Fmaj7
    if(chordsOn(tr)){ g.font='700 '+Math.max(8,Math.min(10,rh-1))+'px '+mono; g.textBaseline='middle';
      VN.forEach(nt=>{ const i=rows.indexOf(pitchOf(nt)); if(i<0) return; const w=Math.min(nt.l,sPL-(nt.s%sPL))*cw-2, name=chordName(notePitches(tr,nt));
        if(!name) return; const tw=g.measureText(name).width; const x=X(nt.s)+1, y=Y(nt.s)+1+i*rh+rh/2+0.5;
        if(tw+6<=w){ g.fillStyle=cssVar('--bg'); g.globalAlpha=0.9; g.fillText(name,x+3,y); }
        else if(cw>=12 && !VN.some(o=>o!==nt && o.s>nt.s && o.s<=nt.s+nt.l+Math.ceil((tw+4)/cw) && Math.abs(pitchOf(o)-pitchOf(nt))<=1)){ g.fillStyle=col; g.globalAlpha=0.9; g.fillText(name,x+Math.max(w,3)+2,y); } });
      g.globalAlpha=1; g.textBaseline='alphabetic'; }
    (tr._msel||[]).forEach(nt=>{ if(!VN.includes(nt)) return; const i=rows.indexOf(pitchOf(nt)); if(i<0) return; g.strokeStyle=cssVar('--ink'); g.lineWidth=2; rr(g,X(nt.s)+1,Y(nt.s)+1+i*rh+0.5,Math.max(cw*Math.min(nt.l,n-nt.s)-2,3),rh-1,1.5); g.stroke(); });
    if(selN && tr.notes.includes(selN)){ const i=rows.indexOf(pitchOf(selN)); if(i>=0){ g.strokeStyle=cssVar('--ink'); g.lineWidth=2;
      let s2=selN.s, left=selN.l; while(left>0){ const room=sPL-(s2%sPL), seg=Math.min(left,room); rr(g,X(s2)+1,Y(s2)+1+i*rh+0.5,Math.max(cw*seg-2,3),rh-1,1.5); g.stroke(); s2=(s2+seg)%n; left-=seg; }
      const e=selN.s+selN.l-1; g.fillStyle=cssVar('--ink'); g.fillRect(X(e)+cw-5,Y(e)+1+i*rh+2,3,Math.max(3,rh-5)); } }
    placeHandle(tr);
  }
}
function rawTicks(tr,g,X,Y,cw,lineH,n,sPL,gut,lines,gapH){
  const an=tr._an; if(!an) return; const sd=stepDur(); g.fillStyle=cssVar('--ink'); g.globalAlpha=0.55;
  const sets = tr._takes ? tr._takes.map(tk=>takeTimes(tk.an,tk.inst)) : [takeTimes(an,tr.inst)];
  for(const t of sets.flat()){ const r=(t-an.align)/sd; if(r<-0.5||r>=n-0.5) continue; const rc=r<0?0:r; const L=Math.min(lines-1,Math.floor((rc+0.5)/sPL)); const x=gut+(r-L*sPL+0.5)*cw; g.fillRect(x-0.75,L*(lineH+gapH),1.5,4); }
  g.globalAlpha=1;
}
function rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function cellAt(tr,e,clampIt){
  const G=tr._grid; if(!G) return null; const r=tr._cv.getBoundingClientRect(); const x=e.clientX-r.left, y=e.clientY-r.top;
  let line=Math.floor(y/(G.lineH+G.gapH)), col=Math.floor((x-G.gut)/G.cw);
  if(clampIt){ line=clamp(line,0,G.lines-1); col=clamp(col,0,G.sPL-1); }
  if(line<0||line>=G.lines||col<0||col>=G.sPL) return null;
  const i=Math.floor((y-line*(G.lineH+G.gapH)-1)/G.rh); return {s:line*G.sPL+col, row:G.rows[clamp(i,0,G.rows.length-1)], inRow:i>=0&&i<G.rows.length};
}
/* tonal grid editing:
   - tap a note to select it; drag a selected note anywhere (sideways and to another pitch, snapped to the key),
     or drag its last cell to trim or extend it; the edit bar under the grid does the same with buttons
   - press and drag on an empty spot to draw a new note (it stays selected); tapping empty space deselects */
const isPitchedTr=tr=>INST[tr.inst].kind==='pitched';
const evs=tr=>(isPitchedTr(tr)?tr.notes:tr.hits)||[];          /* what the editor edits: notes, or drum hits */
const evRow=(tr,e)=>isPitchedTr(tr)?pitchOf(e):e.d;               /* its row: a pitch, or a drum */
const evLen=e=>e.l??1;                                            /* a hit is one step long on the grid */
function previewHit(tr,d,v=0.85){ if(playing) return; ensureCtx(); const out=ctx.createGain(); out.gain.value=trackGain(tr)||0.6; out.connect(chain.input); drumHit(ctx,out,d,ctx.currentTime+0.01,v,tr.sound,(tr.tone??50)/100); }
const previewEv=(tr,e)=>isPitchedTr(tr)?previewNote(tr,pitchOf(e),e.v??0.8):previewHit(tr,e.d,e.v??0.85);
function hitsChanged(tr){ tr.hits.sort((a,b)=>a.s-b.s); tr._dirty=true; save(); redrawTrack(tr); renderNoteBar(tr); scheduleRender(); }
const evChanged=tr=>isPitchedTr(tr)?noteChanged(tr):hitsChanged(tr);
function selectNote(tr,n){ tr._sel=n||null; drawGrid(tr); renderNoteBar(tr); }
/* What was changed by hand on a recorded part, in order: kind, where, old and new pitch, what was actually sung there (raw), and how many seconds after the take.
   Kept with the part and sent with shared takes. Telling a fix from a creative change is done later, from these facts (how soon, how far from what was sung, before or after export). */
function logEdit(tr,o){ if(!tr||tr.guide) return; const t=tr.sidAt?Math.round((Date.now()-Date.parse(tr.sidAt))/1000):null; (tr.ed=tr.ed||[]).push({...o,t}); if(tr.ed.length>80) tr.ed.splice(0,tr.ed.length-80); }
function noteChanged(tr){ keyCache=null; tr.notes.sort((a,b)=>a.s-b.s); enforceMono(tr); tr._dirty=true; save(); redrawTrack(tr); renderNoteBar(tr); scheduleRender(); }
/* ---- learning from your corrections (no setup): small nudges to the same settings you can see and change ---- */
let learnToldThisSession=false;
function learnNote(msg){ if(learnToldThisSession) return; learnToldThisSession=true; toast(msg); }
function learnFromPitchFix(a,b){ const K=currentKey(); if(K.none||a===b||Math.abs(a-b)>2) return; const ink=m=>K.set.includes(((m-K.tonic)%12+12)%12);
  let d=0; if(!ink(a)&&ink(b)) d=5; else if(ink(a)&&!ink(b)) d=-5; if(!d) return;
  S.snapStr=clamp((S.snapStr??100)+d,0,100); setSnap(S.snapStr); save();
  learnNote(d>0?'Noted: recorded notes will snap a little more to the key. Change it any time: tap KEY.':'Noted: recorded notes will keep a little more of what you sang. Change it any time: tap KEY.'); }
function learnDetail(d){ S.detailBias=clamp((S.detailBias||0)+d,-30,30); save(); if(S.detailBias<=-6) learnNote('Noted: future takes will lean toward fewer, longer notes.'); }
/* Replacing a wrong note is often easier as "draw the right one, delete the old one" (either order) than dragging it.
   Within 30 s, a deleted recorded note and a drawn note over the same spot count as one fix (learned like a drag),
   not as "too many notes". */
const REPLACE_MS=30000;
const overlaps=(a,b)=>a.s<b.s+b.l+1 && b.s<a.s+a.l+1;
function learnReplace(oldP,newP){ learnFromPitchFix(oldP,newP); }
function noteDrawn(tr,nt){ const now=Date.now(); tr._recent=(tr._recent||[]).filter(r=>now-r.at<REPLACE_MS);
  const i=tr._recent.findIndex(r=>r.kind==='del' && overlaps(r,nt));
  if(i>=0){ const r=tr._recent.splice(i,1)[0]; clearTimeout(r.timer); learnReplace(r.p,pitchOf(nt)); return; }
  tr._recent.push({kind:'add',s:nt.s,l:nt.l,p:pitchOf(nt),at:now,note:nt}); }
function recordedDeleted(tr,n){ const now=Date.now(); tr._recent=(tr._recent||[]).filter(r=>now-r.at<REPLACE_MS);
  const i=tr._recent.findIndex(r=>r.kind==='add' && tr.notes.includes(r.note) && overlaps(r.note,n));
  if(i>=0){ const r=tr._recent.splice(i,1)[0]; learnReplace(pitchOf(n),pitchOf(r.note)); return; }
  const short=n.l<=2, rec={kind:'del',s:n.s,l:n.l,p:pitchOf(n),at:now};
  rec.timer=setTimeout(()=>{ tr._recent=(tr._recent||[]).filter(r=>r!==rec); if(short) learnDetail(-2); },REPLACE_MS);   // no replacement drawn: it really was an extra note
  tr._recent.push(rec); }
/* Split: a held note becomes two on the same pitch (cut on a beat when it spans one, else in half) - for repeated notes sung as one */
function splitSelNote(tr,at){ const n=tr._sel, q=S.quant==8?2:1; if(!n||!tr.notes.includes(n)||n.l<2*q) return; logEdit(tr,{k:'split',s:n.s,l:n.l,at:at??null,hint:!!(n.hs&&at!=null&&n.hs.includes(at-n.s))});
  const mid=n.s+n.l/2; let cut=at!=null?Math.round(at/q)*q:Math.round(mid/4)*4; if(cut<=n.s||cut>=n.s+n.l) cut=n.s+Math.max(q,Math.round(n.l/2/q)*q);
  const b={...n, s:cut, l:n.s+n.l-cut}; n.l=cut-n.s; delete b.g;
  if(n.hs){ const o=cut-n.s, L=n.hs.filter(h=>h<o), R=n.hs.filter(h=>h>o).map(h=>h-o); if(L.length) n.hs=L; else delete n.hs; if(R.length) b.hs=R; else delete b.hs; }
  tr.notes.push(b); tr._sel=b; keyCache=null; noteChanged(tr); }
function deleteSelNote(tr){ const n=tr._sel; if(!n||!evs(tr).includes(n)) return; haptic('light');
  if(!isPitchedTr(tr)){ logEdit(tr,{k:'hitdel',s:n.s,d:n.d}); tr.hits.splice(tr.hits.indexOf(n),1); tr._sel=null; hitsChanged(tr); return; } logEdit(tr,{k:'del',s:n.s,l:n.l,from:pitchOf(n),raw:n.x?(n.r0??null):+(+n.p).toFixed(2),drawn:!!n.x&&n.r0==null}); if(!n.x) recordedDeleted(tr,n); tr.notes.splice(tr.notes.indexOf(n),1); tr._sel=null; keyCache=null; noteChanged(tr); }
function placeHandle(tr){ const h=tr._nsel, G=tr._grid, n=tr._sel, x=tr._ndel; if(!h) return;
  const i=(n&&G)?G.rows.indexOf(evRow(tr,n)):-1; if(i<0||!evs(tr).includes(n)){ h.hidden=true; if(x) x.hidden=true; if(tr._nsplit) tr._nsplit.hidden=true; return; }
  if(x){ const top=1+i*G.rh, above=top>=26; x.hidden=false; x.style.left=Math.max(0,G.gut+(n.s+evLen(n))*G.cw-12)+'px'; x.style.top=((above?top-26:top+G.rh+2)+EDRUL_H)+'px'; }
  const sp=tr._nsplit; if(sp){ const q=S.quant==8?2:1, top=1+i*G.rh, above=top>=26; sp.hidden=!isPitchedTr(tr)||evLen(n)<2*q; sp.style.left=Math.max(0,G.gut+(n.s+evLen(n))*G.cw-40)+'px'; sp.style.top=((above?top-26:top+G.rh+2)+EDRUL_H)+'px'; }
  const pad=8; h.hidden=false; h.style.left=(G.gut+n.s*G.cw-pad)+'px'; h.style.top=(Math.max(0,1+i*G.rh-pad)+EDRUL_H)+'px'; h.style.width=(evLen(n)*G.cw+pad*2)+'px'; h.style.height=(G.rh+pad*2)+'px'; }
function noteDown(tr,e,onSel){
  const q=S.quant==8?2:1; tr._touchT=Date.now();
  if(onSel && tr._sel){ const n=tr._sel, c=cellAt(tr,e,true); if(!c) return;
    try{ tr._nsel.setPointerCapture(e.pointerId); }catch(_){}
    tr._drag={note:n, mode:(isPitchedTr(tr)&&c.s>=n.s+n.l-q)?'resize':'move', s0:c.s, row0:c.row, ns:n.s, np:evRow(tr,n), moved:false, created:false, rec:isPitchedTr(tr)&&!n.x};
    previewEv(tr,n); return; }
  const c=cellAt(tr,e); if(!c||!c.inRow) return;
  if(groupHit(tr,e)){ try{ tr._cv.setPointerCapture(e.pointerId); }catch(_){} tr._drag={group:true, s0:c.s, row0:c.row, orig:tr._msel.map(n=>({n,s:n.s,p:evRow(tr,n),x:n.x,r0:n.r0,pv:n.p})), moved:false, id:e.pointerId}; return; }
  // the grid only reacts to a tap (so a swipe always scrolls): tap a note to select it, tap empty space to deselect or add a note
  const n=evs(tr).find(nt=>evRow(tr,nt)===c.row && nt.s>=0 && nt.s<pSteps(tr) && c.s>=nt.s && c.s<nt.s+evLen(nt));
  tr._drag={pending:true, c, hit:n||null, x0:e.clientX, y0:e.clientY, id:e.pointerId};
  if(!n){ const dd=tr._drag; dd.hold=setTimeout(()=>{ if(tr._drag!==dd) return; dd.pending=false; dd.box={c0:c, c1:c}; haptic('light'); try{ tr._cv.setPointerCapture(dd.id); }catch(_){} tr._sel=null; tr._msel=[]; drawGrid(tr); drawBox(tr); },380); }   /* hold still on an empty spot, then drag: select several */
}
function startNewNote(tr,c){ haptic('light'); if(!isPitchedTr(tr)){ const q=S.quant==8?2:1, h={s:Math.floor(c.s/q)*q, d:c.row, v:0.85}; tr.hits.push(h); tr._drag={note:h,mode:'move',s0:c.s,row0:c.row,ns:h.s,np:c.row,moved:false,created:true}; tr._sel=h; drawGrid(tr); previewHit(tr,c.row); return; }
  const q=S.quant==8?2:1, kp=snap(c.row); const nt={s:Math.floor(c.s/q)*q,l:q,p:kp,v:0.85,x:true}; tr.notes.push(nt); keyCache=null;
  tr._drag={note:nt,mode:'resize',s0:c.s,row0:c.row,ns:nt.s,np:kp,moved:false,created:true}; tr._sel=nt; drawGrid(tr); previewNote(tr,kp); }
function noteMove(tr,e){
  let d=tr._drag; if(!d) return;
  if(d.pending){ const dx=Math.abs(e.clientX-d.x0), dy=Math.abs(e.clientY-d.y0); if(dx>=8||dy>=8){ clearTimeout(d.hold); tr._drag=null; } return; }   // a swipe scrolls
  if(d.box){ const c=cellAt(tr,e,true); if(c){ d.box.c1=c; boxSelect(tr,d.box); } return; }
  if(d.group){ const c=cellAt(tr,e,true); if(!c) return; const ds=Math.round((c.s-d.s0)/(S.quant==8?2:1))*(S.quant==8?2:1), G=tr._grid, dr=isPitchedTr(tr)?keyIndex(snap(c.row))-keyIndex(snap(d.row0)):0;
    if(!d.moved && !ds && !dr) return; d.moved=true; groupPlace(tr,d,ds,isPitchedTr(tr)?dr:0, isPitchedTr(tr)?0:G.rows.indexOf(c.row)-G.rows.indexOf(d.row0)); return; }
  tr._touchT=Date.now(); const c=cellAt(tr,e,true); if(!c) return; const n=pSteps(tr), q=S.quant==8?2:1;
  if(c.s!==d.s0 || c.row!==d.row0) d.moved=true; if(!d.moved) return;
  if(d.mode==='resize') d.note.l=clamp(Math.floor((c.s-d.note.s)/q)*q+q, q, n-d.note.s);
  else { d.note.s=clamp(d.ns+Math.round((c.s-d.s0)/q)*q, 0, n-evLen(d.note));
    if(!isPitchedTr(tr)){ if(c.row!==d.note.d){ d.note.d=c.row; previewHit(tr,c.row); } drawGrid(tr); return; }   /* a hit moves in time and to another drum */
    const np=snap(c.row); if(np!==pitchOf(d.note)){ if(!d.note.x && d.note.r0==null) d.note.r0=+(+d.note.p).toFixed(2);   /* keep what was sung */ d.note.p=np; d.note.x=true; previewNote(tr,np); } }
  drawGrid(tr);
}
function noteUp(tr,e,cancel){
  const d=tr._drag; if(!d) return; tr._drag=null; clearTimeout(d.hold);
  if(d.box){ drawBox(tr,true); if(!tr._msel.length){ tr._msel=null; } else if(tr._msel.length===1){ tr._sel=tr._msel[0]; tr._msel=null; } drawGrid(tr); renderNoteBar(tr); return; }
  if(d.group){ if(d.moved){ d.orig.forEach(o=>logEdit(tr,isPitchedTr(tr)?{k:'move',s:o.n.s,from:o.s,group:1}:{k:'hitmove',s:o.n.s,from:o.s,d:o.n.d,fromD:o.p})); evChanged(tr); } else { tr._msel=null; drawGrid(tr); renderNoteBar(tr); } return; }
  if(d.pending){ if(cancel) return;
    if(tr._msel && tr._msel.length){ tr._msel=null; if(!d.hit){ drawGrid(tr); renderNoteBar(tr); return; } }
    if(isPitchedTr(tr) && d.hit && d.c && d.hit.hs && tr._sel!==d.hit){ const o=d.hit.hs.find(h=>d.c.s===d.hit.s+h||d.c.s===d.hit.s+h-1);
      if(o!=null){ tr._sel=d.hit; tr._lastTap=null; splitSelNote(tr, d.hit.s+o); return; } }   /* tap a split hint: split there */
    if(d.hit){ const lt=tr._lastTap, now=Date.now(); tr._lastTap={n:d.hit,t:now};
      if(isPitchedTr(tr) && lt && lt.n===d.hit && now-lt.t<400){ tr._sel=d.hit; tr._lastTap=null; splitSelNote(tr, d.c?d.c.s:null); return; }   /* double-tap: split where tapped */
      selectNote(tr,d.hit); previewEv(tr,d.hit); }
    else if(tr._sel) selectNote(tr,null);
    else { startNewNote(tr,d.c); tr._drag=null; if(!isPitchedTr(tr)) logEdit(tr,{k:'hitadd',s:tr._sel.s,d:tr._sel.d}); evChanged(tr); }
    return; }
  if(!isPitchedTr(tr)){ if(d.created) logEdit(tr,{k:'hitadd',s:d.note.s,d:d.note.d}); else if(d.moved) logEdit(tr,{k:'hitmove',s:d.note.s,from:d.ns,d:d.note.d,fromD:d.np});
    if(d.moved||d.created) hitsChanged(tr); else { drawGrid(tr); renderNoteBar(tr); } return; }
  if(d.moved && d.rec && d.mode==='move') learnFromPitchFix(d.np, pitchOf(d.note));
  if(d.moved && !d.created){ const to=pitchOf(d.note); if(d.mode==='move' && to!==d.np) logEdit(tr,{k:'pitch',s:d.note.s,from:d.np,to,raw:d.note.r0??null}); if(d.mode==='move' && d.note.s!==d.ns) logEdit(tr,{k:'move',s:d.note.s,from:d.ns}); if(d.mode==='resize') logEdit(tr,{k:'len',s:d.note.s,to:d.note.l}); }
  if(d.created) logEdit(tr,{k:'add',s:d.note.s,to:pitchOf(d.note),l:d.note.l});
  if(d.created) noteDrawn(tr,d.note);
  if(d.moved||d.created) noteChanged(tr);
  else { const lt=tr._lastTap, now=Date.now();   /* a second tap on the selected note: split it there */
    if(d.note && lt && lt.n===d.note && now-lt.t<400){ tr._lastTap=null; splitSelNote(tr,d.s0); return; }
    tr._lastTap={n:d.note,t:now}; drawGrid(tr); renderNoteBar(tr); }
}
/* ---- faster fixes: nudge with arrows, split into 2-4 repeats, select several notes (hold an empty spot, then drag) and move them together ---- */
const qStep=()=>S.quant==8?2:1;
function groupHit(tr,e){ const ms=tr._msel; if(!ms||ms.length<2) return false; const c=cellAt(tr,e); if(!c||!c.inRow) return false; return ms.some(n=>evRow(tr,n)===c.row && c.s>=n.s && c.s<n.s+evLen(n)); }
function boxSelect(tr,b){ const G=tr._grid, s0=Math.min(b.c0.s,b.c1.s), s1=Math.max(b.c0.s,b.c1.s), i0=Math.min(G.rows.indexOf(b.c0.row),G.rows.indexOf(b.c1.row)), i1=Math.max(G.rows.indexOf(b.c0.row),G.rows.indexOf(b.c1.row));
  tr._msel=evs(tr).filter(n=>{ const i=G.rows.indexOf(evRow(tr,n)); return i>=i0&&i<=i1 && n.s<=s1 && n.s+evLen(n)>s0; }); drawGrid(tr); drawBox(tr); renderNoteBar(tr); }
function drawBox(tr,off){ let el=tr._boxEl; const d=tr._drag; if(off||!d||!d.box){ if(el) el.hidden=true; return; }
  if(!el){ el=tr._boxEl=document.createElement('div'); el.className='nbox'; tr._cv.parentElement.appendChild(el); }
  const G=tr._grid, b=d.box, s0=Math.min(b.c0.s,b.c1.s), s1=Math.max(b.c0.s,b.c1.s), i0=Math.min(G.rows.indexOf(b.c0.row),G.rows.indexOf(b.c1.row)), i1=Math.max(G.rows.indexOf(b.c0.row),G.rows.indexOf(b.c1.row));
  el.hidden=false; Object.assign(el.style,{left:(G.gut+s0*G.cw)+'px', top:(1+i0*G.rh+EDRUL_H)+'px', width:((s1-s0+1)*G.cw)+'px', height:((i1-i0+1)*G.rh)+'px'}); }
/* a pitch moved by k notes of the key (semitones when there is no key), so a moved phrase keeps its shape */
function keySteps(m,k){ const K=currentKey(); if(K.none) return m+k; const ink=x=>K.set.includes(((x-K.tonic)%12+12)%12); let x=snap(m); const d=Math.sign(k); for(let i=0;i<Math.abs(k);i++){ x+=d; while(!ink(x)) x+=d; } return x; }
const keyIndex=m=>{ const K=currentKey(); if(K.none) return m; let i=0; for(let x=0;x<m;x++) if(K.set.includes(((x-K.tonic)%12+12)%12)) i++; return i; };
/* move the selected notes from where they were: ds steps, dr rows up (pitch), or dd drum rows down */
function groupPlace(tr,d,ds,dr,dd){ const n=pSteps(tr), lo=Math.min(...d.orig.map(o=>o.s)), hi=Math.max(...d.orig.map(o=>o.s+evLen(o.n)));
  ds=clamp(ds,-lo,n-hi); const G=tr._grid;
  d.orig.forEach(o=>{ o.n.s=o.s+ds;
    if(isPitchedTr(tr)){ if(dr){ if(!o.x && o.r0==null) o.n.r0=+(+o.pv).toFixed(2); o.n.p=keySteps(o.p,dr); o.n.x=true; } else { o.n.p=o.pv; o.n.x=o.x; if(o.r0===undefined) delete o.n.r0; } }
    else { const i=clamp(G.rows.indexOf(o.p)+dd,0,G.rows.length-1); o.n.d=G.rows[i]; } });
  drawGrid(tr); }
/* the arrows under the grid: one note (pitch) or several (pitch and time) */
function nudge(tr,ds,dp){ const P=isPitchedTr(tr), ms=(tr._msel||[]).filter(x=>evs(tr).includes(x));
  if(ms.length>1){ const d={orig:ms.map(n=>({n,s:n.s,p:evRow(tr,n),x:n.x,r0:n.r0,pv:n.p}))}; groupPlace(tr,d,ds*qStep(),P?dp:0,P?0:-dp);
    d.orig.forEach(o=>logEdit(tr,P?{k:'move',s:o.n.s,from:o.s,group:1}:{k:'hitmove',s:o.n.s,from:o.s,d:o.n.d,fromD:o.p})); evChanged(tr); return; }
  const n=tr._sel; if(!n||!evs(tr).includes(n)||!dp) return; haptic('light');
  if(!P){ const G=tr._grid, i=G?G.rows.indexOf(n.d):-1; if(i<0) return; const j=clamp(i-dp,0,G.rows.length-1); if(j===i) return; logEdit(tr,{k:'hitmove',s:n.s,from:n.s,d:G.rows[j],fromD:n.d}); n.d=G.rows[j]; previewHit(tr,n.d,n.v??0.85); hitsChanged(tr); return; }
  const from=pitchOf(n); let to=from; for(let m=from+dp;Math.abs(m-from)<=12;m+=dp){ const k=snap(m); if(k!==from && Math.sign(k-from)===dp){ to=k; break; } } if(to===from) return;
  if(!n.x && n.r0==null) n.r0=+(+n.p).toFixed(2); n.p=to; n.x=true; logEdit(tr,{k:'pitch',s:n.s,from,to,raw:n.r0??null,nudge:1});
  if(n.r0!=null && Math.abs(to-from)<=2) learnFromPitchFix(from,to); previewNote(tr,to,n.v??0.8); noteChanged(tr); }
function deleteGroup(tr){ const ms=(tr._msel||[]).filter(x=>evs(tr).includes(x)); if(!ms.length) return; haptic('light');
  ms.forEach(n=>{ if(isPitchedTr(tr)){ logEdit(tr,{k:'del',s:n.s,l:n.l,from:pitchOf(n),raw:n.x?(n.r0??null):+(+n.p).toFixed(2),drawn:!!n.x&&n.r0==null,group:1}); tr.notes.splice(tr.notes.indexOf(n),1); } else { logEdit(tr,{k:'hitdel',s:n.s,d:n.d,group:1}); tr.hits.splice(tr.hits.indexOf(n),1); } });
  tr._msel=null; tr._sel=null; evChanged(tr); }
/* Split: two pieces at once, or ask how many when the note is long enough for 3 or 4 */
function splitAsk(tr){ const n=tr._sel, q=qStep(); if(!n||!tr.notes.includes(n)) return; if(n.l<3*q){ splitSelNote(tr); return; }
  const sp=tr._selbar.querySelector('.sb-sp'); sp.hidden=false; sp.querySelectorAll('[data-n]').forEach(b=>b.hidden=+b.dataset.n*q>n.l); tr._selbar.querySelector('.sb-split').hidden=true; tr._selbar.querySelector('.sb-del').hidden=true; }
function splitInto(tr,k){ const n=tr._sel, q=qStep(); if(!n||!tr.notes.includes(n)||n.l<k*q) return; logEdit(tr,{k:'split',s:n.s,l:n.l,into:k});
  const len=n.l, cuts=[]; for(let i=1;i<k;i++) cuts.push(n.s+Math.round(len*i/k/q)*q); const parts=[];
  let start=n.s; [...cuts,n.s+len].forEach((e,i)=>{ if(i===0){ n.l=e-n.s; delete n.hs; parts.push(n); } else { const b={...n, s:start, l:e-start}; delete b.g; delete b.hs; tr.notes.push(b); parts.push(b); } start=e; });
  tr._sel=parts[0]; haptic('light'); keyCache=null; noteChanged(tr); }
/* joined notes (legato, testing in Xcode builds): a note that starts where the one before it ends can be joined to it (one sound that
   changes pitch, no new attack) or broken apart. Moving it away so there's a gap breaks the join on its own. */
const joinPrev=(tr,n)=>(tr.notes||[]).find(o=>o!==n&&o.s+o.l===n.s&&o.s<n.s);
const joinable=(tr,n)=>!!window.NOODLE_DEV&&TAP_MONO.has(tr.inst)&&!!n&&!!joinPrev(tr,n);
function joinToggle(tr){ const n=tr._sel; if(!n||!joinable(tr,n)) return; if(n.lg) delete n.lg; else n.lg=1; haptic('light'); noteChanged(tr); renderNoteBar(tr); toast(n.lg?'Joined to the note before':'Its own note again'); }
function renderNoteBar(tr){
  const sb=tr._selbar; if(sb){ const n=tr._sel, ms=(tr._msel||[]).filter(x=>evs(tr).includes(x)), many=ms.length>1, on=many||!!(n&&evs(tr).includes(n)); sb.hidden=!on;
    if(on){ sb.querySelector('.sb-mv').hidden=!many; sb.querySelector('.sb-pt').hidden=!isPitchedTr(tr)&&!many; sb.querySelector('.sb-sp').hidden=true; sb.querySelector('.sb-del').hidden=false; }
    if(many){ const vs=sb.querySelector('.sb-vel input'); sb.querySelector('.sb-n').textContent=ms.length+(isPitchedTr(tr)?' notes':' hits'); sb.querySelector('.sb-split').hidden=true; if(vs&&document.activeElement!==vs){ vs.value=Math.round(ms.reduce((a,x)=>a+(x.v??0.85),0)/ms.length*100); sb.querySelector('.sb-vel output').textContent=vs.value; } }
    else
    if(on){ const vs=sb.querySelector('.sb-vel input'); if(vs && document.activeElement!==vs){ vs.value=Math.round((n.v??0.85)*100); sb.querySelector('.sb-vel output').textContent=vs.value; } if(!isPitchedTr(tr)){ sb.querySelector('.sb-n').textContent=slotLabel(n.d)+' · step '+(n.s+1); sb.querySelector('.sb-split').hidden=true; }
      else { const nm=m=>NOTE_NAMES[((m%12)+12)%12]+(Math.floor(m/12)-1); sb.querySelector('.sb-n').textContent=nm(pitchOf(n)+12*(tr.oct||0)); sb.querySelector('.sb-split').hidden=n.l<2*(S.quant==8?2:1); } }
    const jb=sb.querySelector('.sb-join'), jn=on&&!many&&isPitchedTr(tr)&&joinable(tr,n); jb.hidden=!jn; if(jn){ jb.setAttribute('aria-pressed',String(!!n.lg)); jb.querySelector('span').textContent=n.lg?'Joined':'Join'; } }
  const bar=tr._el&&tr._el.querySelector('.notebar'); if(!bar||!isPitchedTr(tr)) return; const n=tr._sel;
  if(!n || !tr.notes.includes(n)){ bar.hidden=true; tr._sel=null; return; }
  bar.hidden=false; const nm=m=>NOTE_NAMES[((m%12)+12)%12]+(Math.floor(m/12)-1);
  bar.querySelector('.nb-info').textContent=`${nm(pitchOf(n)+12*tr.oct)} · step ${n.s+1} · ${n.l} step${n.l>1?'s':''} long`;
}
function previewNote(tr,row,v=0.8){ if(playing) return; ensureCtx(); const out=ctx.createGain(); out.gain.value=trackGain(tr)||0.6; out.connect(chain.input); ENV_OVR=tr.adsr||null; VOICE_INST=tr.inst; try{ voice(ctx,out,tr.sound,ctx.currentTime+0.01,0.25,row+12*tr.oct,v,tr.tone/100); } finally{ ENV_OVR=null; } }
/* tempo, length and metronome live in S; the Studio draws them */
const SCALE_OPTS='<option value="auto">Auto (major or minor)</option><option value="major">Major</option><option value="minor">Minor</option><option value="pent-minor">Minor pentatonic</option><option value="pent-major">Major pentatonic</option><option value="blues">Blues</option><option value="dorian">Dorian</option><option value="mixolydian">Mixolydian</option><option value="lydian">Lydian</option><option value="phrygian">Phrygian</option><option value="phryg-dom">Phrygian dominant</option><option value="harm-minor">Harmonic minor</option><option value="mel-minor">Melodic minor</option><option value="locrian">Locrian</option><option value="chromatic">Chromatic (no snapping)</option>';
const keyOpts=()=>'<option value="auto">Auto-detect</option>'+NOTE_NAMES.map((n,i)=>`<option value="${i}">${n}</option>`).join('');
function keyEdited(){ keyChanged(); save(); S.tracks.forEach(redrawTrack); scheduleRender(); }
/* Changing the key moves the song there: every melodic part and the vocals shift by the nearest interval (at most 6 semitones), drums stay. */
function transposeSong(d){ if(!d) return; S.tracks.forEach(t=>{
    if(INST[t.inst].kind==='pitched' && t.notes){ t.notes.forEach(n=>{ n.p+=d; if(n.q!=null) n.q+=d; }); t._versions=null; t._vi=0; t._dirty=true; }
    if(t.inst==='vox'){ t.vt=(t.vt||0)+d; if(t.vn) t.vn.forEach(v=>{ v.p=+(v.p+d).toFixed(2); }); t._tuned=null; t._dirty=true; } }); keyCache=null; }
function setKey(v){ const was=currentKey(), has=S.tracks.some(t=>(INST[t.inst].kind==='pitched'&&t.notes&&t.notes.length)||(t.inst==='vox'&&t.va!=null));
  if(v!=='auto' && !was.none && has){ let d=((+v-was.tonic)%12+12)%12; if(d>6) d-=12;
    if(d){ transposeSong(d); S.key=v; keyEdited(); toast(`Moved the song ${d>0?'up':'down'} ${Math.abs(d)} semitone${Math.abs(d)>1?'s':''} to ${NOTE_NAMES[+v]}. Tap Undo to go back.`); return; } }
  S.key=v; keyEdited(); }
function setScale(v){ S.scale=v; keyEdited(); }
let snapT=0; function setSnap(v){ S.snapStr=clamp(+v,0,100); clearTimeout(snapT); snapT=setTimeout(keyEdited,150); }
let mrevT=0; function setMaster(k,v){ S.master[k]=+v; save(); if(k==='rev'){ clearTimeout(mrevT); mrevT=setTimeout(applyMaster,120); } else applyMaster(); }
function toggleMetro(){ S.metro=!S.metro; if(metroGain&&!recState) metroGain.gain.value=S.metro?0.7:0; save(); }
/* the Studio shows the key itself (s2Chips) */
function setTempo(b){ S.bpm=clamp(Math.round(b)||94,60,180); save(); scheduleRender(); }
function init(){
  
  $('rsClose').onclick=closeRec;
  $('rsKeep').onclick=closeRec;
  $('rsRetry').onclick=()=>{ showRetryReady(); startRecord(true); };
  window.showRetryReady=()=>{ $('rsReview').hidden=true; $('rsReady').hidden=false; };
  document.addEventListener('keydown',e=>{ if((e.key==='Delete'||e.key==='Backspace') && !/INPUT|SELECT|TEXTAREA/.test((e.target&&e.target.tagName)||'')){ const t=S.tracks.find(t=>t.id===s2.edId); if(t&&t._sel){ e.preventDefault(); deleteSelNote(t); return; } }
    if(e.key==='Escape'){ if(!$('recSheet').hidden) closeRec(); }
    if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='z' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)){ e.preventDefault(); e.shiftKey?redo():undo(); } });
  $('recBtn').onclick=()=>startRecord(false);
  $('fileIn').onchange=e=>{ const f=e.target.files[0]; e.target.value=''; if(f) importFile(f); };
  if(!micAllowedByPage() || (window.self!==window.top && !(document.permissionsPolicy||document.featurePolicy))) micBlocked();
  renderTracks(); 
  let rw=0; window.addEventListener('resize',()=>{ clearTimeout(rw); rw=setTimeout(()=>S.tracks.forEach(redrawTrack),150); });
  try{ matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>S.tracks.forEach(redrawTrack)); new MutationObserver(()=>S.tracks.forEach(redrawTrack)).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']}); }catch(e){}
  requestAnimationFrame(tick);
  hist.cur=snapNow(); 
  // bring back vocal recordings saved in this browser
  reloadRaw(); nxInit(); s2Init();
  { const q=new URLSearchParams(location.search).get('s')||(location.hash.match(/^#s=([\w-]+)/)||[])[1]; if(q) setTimeout(()=>songLinkOpen(q),300); }   /* a song link opened on the web */
  native({type:'ready'});   /* the iPhone app sends a song link it was opened with (if any) once the page is ready */
  try{ if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')) navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready).then(r=>r.active&&r.active.postMessage('prune')).catch(()=>{}); }catch(e){}   /* so the web version opens without a connection (the iPhone app carries its own copy) */
  // iOS only lets audio start on a finger lift (touchend/click), not on touch-down: unlock (or re-wake) on every such gesture while it's suspended
  const unlockAudio=()=>{ if(ctx && ctx.state!=='running' && !document.hidden){ try{ ctx.resume(); }catch(e){} } };
  ['touchend','click','keydown'].forEach(ev=>document.addEventListener(ev,unlockAudio,{capture:true,passive:true}));
  // build every part's sound right away (the audio stays silent until the first tap), so the first Play starts instantly
  setTimeout(()=>{ try{ if(!ctx){ const AC=window.AudioContext||window.webkitAudioContext; ctx=new AC({latencyHint:'interactive'}); chain=buildChain(ctx,true); applyMaster(); S.tracks.forEach(t=>{ t._dirty=true; }); } scheduleRender(); }catch(e){} }, 250);
}
function tick(){
  requestAnimationFrame(tick);
  if(!ctx){ try{ s2Tick((playFrom%loopLen())/loopLen()); }catch(e){} return; }
  const now=ctx.currentTime, L=loopLen();
  const showPh = (playing||recState) && now>=t0;
  const ph = showPh ? (((now-t0)/L)%1+1)%1 : 0;

  try{ s2Tick(showPh ? ph : (playFrom%L)/L); }catch(e){}
  S.tracks.forEach(tr=>{ if(tr._mph){ tr._mph.style.display=showPh?'block':'none'; if(showPh) tr._mph.style.transform=`translateX(${ph*(tr._mph.parentElement.clientWidth||0)}px)`; } });
  S.tracks.forEach(tr=>{ if(!tr._ph||!tr._grid) return; if(!showPh&&tr.id===s2.edId) return;   /* stopped: the editor shows where play starts (edSeekDraw) */ const ps=pSteps(tr), pp0=(tr.off||!pRep(tr))?ph*steps()-(tr.off||0):((((now-t0)/(ps*stepDur()))%1)+1)%1*ps, pp=pp0<0?ps+1:pp0; tr._ph.style.display=showPh&&pp<ps?'block':'none'; if(showPh&&pp<ps&&playing&&tr._cv&&!(Date.now()-(tr._touchT||0)<3000)){ const G=tr._grid, w=tr._cv.parentElement.parentElement, x=G.gut+pp*G.cw; if(w.scrollWidth>w.clientWidth+2 && (x<w.scrollLeft+G.gut || x>w.scrollLeft+w.clientWidth-24)){ tr._autoScroll=true; w.scrollLeft=Math.max(0,x-G.gut-8); } } if(showPh&&pp<ps){ const G=tr._grid, pos=pp, L=Math.min(G.lines-1,Math.floor(pos/G.sPL)); tr._ph.style.transform=`translate(${G.gut+(pos-L*G.sPL)*G.cw}px,${L*(G.lineH+G.gapH)}px)`; } });
  if(recState){
    const r=recState, beat=60/S.bpm, dots=$('beats').children;
    if(now<r.start){ const b=Math.floor((now-r.countStart)/beat); if(r.noisy==null && now>r.countStart+r.lat+(r.start-r.countStart)*0.7){ const f=countInFloor(r, now-0.03); r.noisy = f!=null && (S.voxTop??VOX_TOP)-f<NOISY_DB; }
      $('recLabel').textContent = now<r.countStart?'Get ready':(r.teach?`Say “${r.teach.say}” on each click · ${4-b}`:`Count-in ${4-b}`+(r.noisy?' · Noisy here: hold the phone close':'')); [...dots].forEach((d,i)=>{ d.className = (now>=r.countStart && i===b)?'on'+(i===0?' one':''):''; }); $('recProg').style.width='0%'; }
    else { const el=now-r.start, b=Math.floor(el/beat)%4, bar=Math.floor(el/(beat*4))+1; [...dots].forEach((d,i)=>d.className=i===b?'on'+(i===0?' one':''):''); const RL=r.end-r.start, nb=Math.round(RL/(beat*4)); $('recLabel').textContent=r.teach?`Say “${r.teach.say}” on every click · ${Math.min(bar,nb)}/${nb}`:r.calib?`Clap along · bar ${Math.min(bar,nb)} of ${nb}`:`● Recording bar ${Math.min(bar,nb)} of ${nb}`; $('recProg').style.width=clamp(el/RL*100,0,100)+'%'; }
    if(mic){ const a=new Float32Array(mic.an.fftSize); mic.an.getFloatTimeDomainData(a); let m=0; for(const v of a) m=Math.max(m,Math.abs(v)); $('meter').style.width=clamp(Math.sqrt(m)*100,0,100)+'%'; }
    if(now>r.end+r.lat+0.3) finishRecord();
  }
}

