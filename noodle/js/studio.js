"use strict";
/* ---- Studio (the timeline). Tracks are rows; each holds parts (regions) placed on a bar ruler. Recording, playback and note reading are the engine above.
   The page's older markup (header, part rows, sections) is no longer shown; it remains only because the engine still reads and writes some of its elements. ---- */
const s2={selId:null, barw:44, armId:null, loop:false, pos:-1, cur:0, recId:null, recLen:0, recPrev:0, post:false, more:(()=>{ try{ return localStorage.getItem('noodle.more')==='1'; }catch(e){ return false; } })()};   /* more: More settings open in track menus */
const s2Use=()=>true;   /* the timeline is the only studio; the older screens underneath are only its engine */
const s2On=()=>!$('s2').hidden;
function s2Show(on){ if(!on&&s2.edId!=null){ s2.edId=null; $('s2Ed').hidden=true; $('s2EdBody').innerHTML=''; GRID_H=176; GRID_RH=15; GRID_DRUM=1; } $('s2').hidden=!on; document.body.classList.toggle('s2-on',on); if(on){ document.body.style.overflow='hidden'; s2Render(); } }
/* A lane is one row of the timeline: one or more parts (clips) that share an instrument, sound and mix. tr.lane names the lane (default: the part itself). */
const s2LaneId=t=>t.lane??t.id;
function s2Lanes(){ const m=new Map(); S.tracks.forEach(t=>{ const k=s2LaneId(t); if(!m.has(k)) m.set(k,{id:k,tracks:[]}); m.get(k).tracks.push(t); }); return [...m.values()]; }
const s2Lane=id=>s2Lanes().find(l=>String(l.id)===String(id));
/* a track's name: its own, or the instrument (numbered only when several tracks share it) */
/* A track's name: what you typed (tr.name), else it follows the sound or effect you picked (tr.picked; owner, Nov 2026): "Bell",
   "Phaser", "Punchy kit", "Pop vocals". Until you pick, or when its parts differ (a Phaser part and a Low pass part), the type: "Mix effects".
   Two tracks with the same name are numbered. A typed name is never changed. */
function s2Auto(L){ const ts=L.tracks, tr=ts[0];
  if(tr.inst==='mix'){ const ks=[...new Set(ts.filter(t=>t.mfx).map(t=>t.mfx.k))]; return ks.length===1&&ts.some(t=>t.picked)&&MFX[ks[0]]?MFX[ks[0]].label:INST.mix.label; }
  if(!tr.picked||!INST[tr.inst].sounds||INST[tr.inst].sounds.length<2) return INST[tr.inst].label;
  const one=xs=>new Set(xs).size===1, pk=tr.inst==='vox'?'vp':tr.inst==='kit'?'kp':null, pre=pk&&tr[pk]&&presetsAll()[tr.inst].find(y=>y.id===tr[pk]);
  if(!one(ts.map(t=>t.sound))||(pk&&!one(ts.map(t=>t[pk]||'')))) return INST[tr.inst].label;
  const base=pre?pre.name:tr.sound; return tr.inst==='kit'?base+' kit':tr.inst==='vox'?base+' vocals':base; }
function s2Name(L){ const tr=L.tracks[0]; if(tr.name) return tr.name; const nm=s2Auto(L), same=s2Lanes().filter(x=>!x.tracks[0].name&&s2Auto(x)===nm); return nm+(same.length>1?' '+(same.findIndex(x=>x.id===L.id)+1):''); }
function s2DrawLane(lane,cv){ const W=cv.clientWidth, H=cv.clientHeight; if(!W||!H) return; const dpr=Math.min(2,window.devicePixelRatio||1); cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H); const n=steps(), sw=W/n, top=6, h=H-12;
  for(const tr of lane.tracks){ if(!hasContent(tr)) continue; const col=INST[tr.inst].color, ps=pSteps(tr), reps=pLoops(tr), off=tr.off||0;
   for(let k=0;k<reps;k++){ const x0=(off+k*ps)*sw+1.5, w=ps*sw-3, pad=4, iw=Math.max(4,w-2*pad), ix=x0+pad, u=iw/ps;   /* notes are drawn inside the region, with a margin */
    g.globalAlpha=k?0.14:0.26; g.fillStyle=col; g.beginPath(); if(g.roundRect) g.roundRect(x0,top,w,h,5); else g.rect(x0,top,w,h); g.fill();
    g.globalAlpha=k?0.45:0.95; g.strokeStyle=col; g.lineWidth=1.25; g.stroke();
    g.globalAlpha=k?0.55:1; g.fillStyle=col; const yIn=top+pad, hIn=h-2*pad-3.5;
    if(tr.notes && INST[tr.inst].kind==='pitched'){ const vis=tr.notes.filter(nt=>nt.s>=0&&nt.s<ps), ps2=vis.map(pitchOf); if(ps2.length){ const lo=Math.min(...ps2), hi=Math.max(...ps2), span=Math.max(5,hi-lo);
        vis.forEach((nt,i)=>{ const y=yIn+hIn*(1-(ps2[i]-lo)/span), xa=ix+nt.s*u, xb=Math.min(ix+iw, ix+Math.min(nt.s+nt.l,ps)*u-1); g.fillRect(xa, y, Math.max(1.5,xb-xa), 3.5); }); } }
    else if(tr.mfx){ const d=pSteps(tr)*stepDur(), N=Math.max(8,Math.floor(iw/2)); g.beginPath(); g.moveTo(ix,yIn+hIn+3.5); for(let i=0;i<=N;i++) g.lineTo(ix+iw*i/N, yIn+hIn+3.5-(hIn)*mfxFrac(tr,d,i/N)); g.lineTo(ix+iw,yIn+hIn+3.5); g.closePath(); const ga=g.globalAlpha; g.globalAlpha=ga*0.55; g.fill(); g.globalAlpha=ga;
      if(iw>34){ g.fillStyle=getComputedStyle(cv).getPropertyValue('--s2-ink').trim()||'#222'; g.font='600 10px system-ui,sans-serif'; g.textBaseline='top'; g.fillText(MFX[tr.mfx.k].label,ix+2,yIn,iw-4); } }
    else if(tr.inst==='fx'){ (tr.fxs||[]).forEach(e=>{ if(e.s<0||e.s>=ps) return; const xa=ix+e.s*u, xb=Math.min(ix+iw, ix+Math.min(e.s+e.l,ps)*u-1), w2=Math.max(3,xb-xa), y0=yIn+hIn+3.5, hh=hIn+3.5; g.beginPath();
        g.moveTo(xa,y0); for(let i=0;i<=24;i++){ const u=i/24; g.lineTo(xa+w2*u, y0-hh*(0.12+0.88*fxShape(e,u))); } g.lineTo(xa+w2,y0);
        g.closePath(); if(e.k==='sweepUp'||e.k==='sweepDown'){ const ga=g.globalAlpha; g.globalAlpha=ga*0.5; g.fill(); g.globalAlpha=ga; g.stroke(); } else g.fill(); }); }
    else if(tr.hits){ const rows=[...new Set(tr.hits.map(x=>x.d))]; tr.hits.forEach(x=>{ if(x.s<0||x.s>=ps) return; const i=rows.indexOf(x.d), y=yIn+hIn*(rows.length>1?i/(rows.length-1):0.5), xa=ix+x.s*u; g.fillRect(xa, y, Math.max(1.5,Math.min(u-1,ix+iw-xa)), 3.5); }); }
    else { const raw=tr._raw; const N=Math.max(8,Math.floor(iw/3)); for(let i=0;i<N;i++){ let a=0.25; if(raw&&raw.x){ const a0=(tr.va||0)*raw.sr, span=ps*stepDur()*raw.sr, i0=Math.floor(a0+i/N*span), i1=Math.min(raw.x.length,Math.floor(a0+(i+1)/N*span)); let m=0; for(let j=i0;j<i1;j+=16) m=Math.max(m,Math.abs(raw.x[j])); a=Math.min(1,m*2.2); } const bh=Math.max(2,a*(h-2*pad)); g.fillRect(ix+i*(iw/N), top+h/2-bh/2, 1.6, bh); } } } }
  g.globalAlpha=1; }
/* A new take replaces whatever it overlaps in its lane: covered parts go, partly covered parts are cut back, and a part it lands inside is split in two. */
function s2Cut(tr, from, to){   /* keep steps [from,to) of a part (in its own steps), as a part starting at its old start + from */
  const fix=e=>{ const s0=e.s, e0=e.s+(e.l||1); if(e0<=from||s0>=to) return null; const o={...e, s:Math.max(s0,from)-from}; if(e.l!=null) o.l=Math.min(e0,to)-Math.max(s0,from); return o; };
  if(tr.notes) tr.notes=tr.notes.map(fix).filter(Boolean); if(tr.hits) tr.hits=tr.hits.map(fix).filter(Boolean); if(tr.fxs) tr.fxs=tr.fxs.map(fix).filter(Boolean);
  if(tr.inst==='vox'){ tr.va=+((tr.va||0)+from*stepDur()).toFixed(4); if(tr.vn) tr.vn=tr.vn.map(v=>({...v,t:v.t-from*stepDur()})).filter(v=>v.t>=0&&v.t<(to-from)*stepDur()); tr._tuned=null; tr._pitch=null; }
  tr.cutAt=Date.now();   /* its notes were cut by a later take or a trim, not corrected */
  tr.off=(tr.off||0)+from; tr.len=Math.max(1/16,(to-from)/16); tr.lenSet=true; tr.rep=false; tr._an=null; tr._takes=null; tr._versions=null; tr._dirty=true; if(tr.expr) tr.expr=0; }
function s2Replace(nw){ const a=nw.off||0, b=a+pSteps(nw); let changed=false;
  for(const t of S.tracks.slice()){ if(t===nw || t.guide || s2LaneId(t)!==s2LaneId(nw) || !hasContent(t)) continue;
    const n=pSteps(t)*pLoops(t), o=t.off||0, e=o+n; if(e<=a || o>=b) continue; changed=true;
    if(pLoops(t)>1 && t.inst!=='vox'){ const base=t.notes?'notes':'hits', one=t[base].filter(x=>x.s<pSteps(t)), all=[]; for(let r=0;r<pLoops(t);r++) one.forEach(x=>all.push({...x,s:x.s+r*pSteps(t)})); t[base]=all; t.len=Math.round(n/16); }   /* a repeating part becomes one long part first */
    if(o>=a && e<=b){ disposeTrack(t); S.tracks=S.tracks.filter(x=>x!==t); continue; }
    if(o<a && e>b){ const right=JSON.parse(JSON.stringify(t,(k,v)=>k[0]==='_'?undefined:v)); right.id=S.nextId++; right.lane=s2LaneId(t); delete right.sid; right._dirty=true; if(t._raw){ right._raw=t._raw; } s2Cut(right, b-o, n); if(right._raw) storeVox(right); S.tracks.push(right); s2Cut(t, 0, a-o); continue; }
    if(o<a) s2Cut(t, 0, a-o); else s2Cut(t, b-o, n); }
  if(changed){ S.tracks=S.tracks.filter(t=>hasContent(t)||t.guide||!S.tracks.some(o=>o!==t&&s2LaneId(o)===s2LaneId(t))); keyCache=null; } }
/* after a take, a discard or a cancel: drop clips that ended up empty, fit the new clip's length to what was recorded, and end the song where its last part ends */
function s2Tidy(){ const before=S.tracks.length; const lone=t=>!S.tracks.some(o=>o!==t&&s2LaneId(o)===s2LaneId(t)); S.tracks=S.tracks.filter(t=>{ if(hasContent(t)||t.guide||lone(t)) return true; disposeTrack(t); return false; });
  const tr=S.tracks.find(t=>t.id===s2.recId); if(tr && hasContent(tr) && tr.off!=null && s2.recLen){ const last=tr.inst==='vox' ? (tr._raw?Math.max(1,(tr._raw.x.length/tr._raw.sr-(tr.va||0)-0.3)/stepDur()):16) : Math.max(0,...(tr.notes||[]).map(n=>n.s+n.l),...(tr.hits||[]).map(h=>h.s+1),...(tr.fxs||[]).map(e=>e.s+e.l)); tr.len=clamp(Math.ceil(last/16),1,s2.recLen); tr.lenSet=true; tr._dirty=true; s2Replace(tr); }
  if(s2.recPrev){ const end=Math.ceil(Math.max(1,...S.tracks.filter(hasContent).map(t=>(t.off||0)/16+(t.off!=null&&t.len?t.len:s2.recPrev)))-1e-9); const nb=Math.min(64,S.tracks.some(hasContent)?end:s2.recPrev); if(nb!==S.bars){ S.bars=nb; } }
  s2.recId=null; s2.recLen=0; s2.recPrev=0; if(S.tracks.length!==before) keyCache=null; save(); scheduleRender(); }
function s2Render(){ if(!s2On()) return; const el=$('s2'), bars=S.bars, view=Math.max(bars+8, Math.ceil((window.innerWidth||400)/s2.barw));
  el.style.setProperty('--s2-bars',bars); el.style.setProperty('--s2-view',view); el.style.setProperty('--s2-barw',s2.barw+'px');
  if(s2.armId!=null && !s2Lane(s2.armId)) s2.armId=null;
  { const A=s2.armId!=null&&s2Lane(s2.armId), t=$('s2RecTo'); if(t){ t.textContent=A?s2Name(A):''; t.hidden=!A; } }   /* the big record button says which track it records into */
  $('s2Name').textContent=S.title||'Untitled'; $('s2Undo').disabled=!hist.undo.length; $('s2Redo').disabled=!hist.redo.length;
  const anySolo=S.tracks.some(t=>t.solo);
  let h=`<div class="s2-ruler"><div class="s2-corner"><button class="s2-secs-b" id="s2Secs">Sections</button></div><div class="s2-marks" id="s2Marks">${(S.secs||[]).map((x,i)=>[x,i]).filter(([x])=>x.a<bars).map(([x,i])=>`<span class="s2-sec${s2.mark&&s2.mark.edit===i?' editing':''}" style="left:calc(${x.a} * var(--s2-barw));width:calc(${Math.min(x.b,bars)-x.a} * var(--s2-barw))"><b data-seci="${i}">${nxEsc(x.name)}</b></span>`).join('')}${s2.mark?`<div class="s2-mband" id="s2MBand"><i class="mh l" data-mh="l"></i><span id="s2MBandN"></span><i class="mh r" data-mh="r"></i></div>`:''}${(s2SecValid(),s2.sec)?`<button class="s2-secb" data-secx="1" aria-label="Stop looping this section" style="left:calc(${s2.sec.a/16} * var(--s2-barw));width:calc(${(s2.sec.b-s2.sec.a)/16} * var(--s2-barw))"></button>`:s2.loop&&!s2.mark?`<button class="s2-secb all" data-secx="1" aria-label="Stop looping" style="left:0;width:calc(${bars} * var(--s2-barw))"></button>`:''}${Array.from({length:view},(_,i)=>`<span class="s2-mk${i>=bars?' out':''}" style="left:calc(${i} * var(--s2-barw))">${i+1}</span>`).join('')}<span class="s2-phh" id="s2PhH"></span></div></div><div class="s2-side"></div>`;
  const lanes=s2Lanes();
  lanes.forEach(L=>{ const tr=L.tracks[0], nm=nxEsc(s2Name(L)); h+=`<div class="s2-trk${(tr.mute||(anySolo&&!tr.solo))?' dim':''}"><div class="s2-th"><button class="s2-nm" data-t="${L.id}"><i style="background:${INST[tr.inst].color}"></i><span>${nm}</span><b class="mo" aria-hidden="true"><svg viewBox="0 0 12 12"><circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/><circle cx="10" cy="6" r="1.2"/></svg></b></button><div class="s2-ct">${tr.guide||tr.inst==='mix'?'':`<button class="s2-arm" data-arm="${L.id}" aria-pressed="${String(s2.armId)===String(L.id)}" aria-label="Arm ${nm} for recording">R</button>`}<button class="s2-ms" data-m="${L.id}" aria-pressed="${!!tr.mute}" aria-label="Mute ${nm}">M</button><button class="s2-ms so" data-s="${L.id}" aria-pressed="${!!tr.solo}" aria-label="Solo ${nm}">S</button></div></div><div class="s2-ln" data-ln="${L.id}"><canvas data-cv="${L.id}"></canvas>${s2.empty&&String(s2.empty.lane)===String(L.id)?`<div class="s2-ghost" id="s2Ghost" style="left:calc(${s2.empty.at/16} * var(--s2-barw));width:calc(${emptyLen(L,s2.empty)/16} * var(--s2-barw))"><i class="hl" aria-label="Drag to change where the new part starts"></i><i class="hr" aria-label="Drag to change how long the new part is"></i></div>`:''}${(()=>{ const t=L.tracks.find(x=>x.id===s2.selId&&hasContent(x)); return t?`<div class="s2-sel${pBars(t)*pLoops(t)*s2.barw<40?' narrow':''}" id="s2Sel" style="left:calc(${(t.off||0)/16} * var(--s2-barw));width:calc(${pBars(t)*pLoops(t)} * var(--s2-barw))">${pLoops(t)>1?'':'<i class="hl"></i><i class="hr"></i>'}</div>`:''; })()}</div></div>`; });
  if(!S.tracks.length) h+=`<div class="s2-hint"><b>New song</b>Tap record and pick what you’re recording.<button class="nx-ghost" id="s2Beat" style="margin-top:14px">Start from a beat</button></div>`;
  h+=`<div class="s2-add"><button id="s2Add">+ Add track</button></div><div class="s2-ph" id="s2Ph"></div>${s2.mark?'<div class="s2-mdim" id="s2MDimL"></div><div class="s2-mdim" id="s2MDimR"></div>':''}`;
  $('s2In').innerHTML=h; s2MarkDraw(); lanes.forEach(L=>{ const cv=$('s2In').querySelector(`canvas[data-cv="${L.id}"]`); if(cv) s2DrawLane(L,cv); });
  if(s2.selId!=null && !S.tracks.some(t=>t.id===s2.selId&&hasContent(t))) s2.selId=null;
  const tk=takeBar&&!recState; $('s2Take').hidden=!tk; if(s2.selId!=null||tk||recState||(s2.empty&&!s2Lane(s2.empty.lane))) s2.empty=null;
  { const t=S.tracks.find(x=>x.id===s2.selId), show=!!t&&!tk&&!recState, em=!!s2.empty; $('s2Clip').hidden=!show&&!em; $('s2CbNew').hidden=!em; ['s2CbEdit','s2CbDup','s2CbDel'].forEach(id=>{ $(id).hidden=em; });
    if(em){ const L=s2Lane(s2.empty.lane); $('s2CbL').innerHTML=`<b>${nxEsc(s2Name(L))}</b>${partWhere({off:s2.empty.at,len:emptyLen(L,s2.empty)/16,rep:false})} · empty`; }
    if(show){ $('s2CbL').innerHTML=`<b>${nxEsc(s2Name(s2Lane(s2LaneId(t))))}</b>${partWhere(t)}`; $('s2CbEdit').hidden=t.inst==='vox'; $('s2CbEdit').lastChild.textContent='Edit'; } }
  { const cb=$('s2CbCopy'), has=cb.querySelector('.pro-b'); if(!isPro()&&!has) cb.insertAdjacentHTML('beforeend',PRO_LOCK); else if(isPro()&&has) has.remove(); }   /* copying a part to another song is Pro */
  s2.pos=-1; s2Chips(); s2Seek(); s2Clip(); { const t=$('toast'); if(t.classList.contains('on')) toastPlace(t); } }
/* keep the playhead out from under the track headers, and the header panel as tall as the timeline */
function s2Clip(){ const tl=$('s2Tl'), a=$('s2Ph'), b=$('s2PhH'); if(!a) return; $('s2').style.setProperty('--s2-sideh',Math.max(0,tl.clientHeight-26)+'px'); const hid=Math.max(0,s2.pos)*s2.barw<tl.scrollLeft-1?'hidden':'visible'; a.style.visibility=hid; b.style.visibility=hid; }
/* ---- The iPhone app's native pieces ---- */
const native=m=>{ try{ if(window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.noodleNative) window.webkit.messageHandlers.noodleNative.postMessage(m); }catch(e){} };
const haptic=style=>native({type:'haptic', style});   /* light: a note or point placed, a part dropped; medium: recording starts or stops; success */
function nowPlaying(){ native({type:'now', playing:!!playing, title:S.title||'Untitled', pos:playing&&ctx?(((ctx.currentTime-t0)%loopLen())+loopLen())%loopLen():(playFrom||0), dur:loopLen()}); }
window.noodleRemote=cmd=>{ if(recState) return; if(cmd==='toggle'||(cmd==='play'&&!playing)||(cmd==='pause'&&playing)) togglePlay(); };   /* from the lock screen */
/* the part clipboard: one part, kept on this device (with a vocal's recording) until another is copied */
async function partCopy(t){ if(!isPro()){ proSheet('Copying a part into another song is part of Noodle Pro.'); return; }
  const part=JSON.parse(JSON.stringify(t,(k,v)=>k[0]==='_'?undefined:v)), take=t.inst==='vox'?await takeStore.get('vox'+t.id):null;
  delete part.sid; delete part.lane; await takeStore.put('clipboard',{part, take, bpm:S.bpm, from:S.title||'', at:Date.now()});
  toast(`Copied ${partName(t)}. In any song: Add track, then Paste part.`,5200); }
async function partPaste(){ const c=await takeStore.get('clipboard'); if(!c||!c.part) return;
  const tr=JSON.parse(JSON.stringify(c.part)); tr.id=S.nextId++; tr.off=Math.round(Math.max(0,Math.floor(s2.cur||0))*16); tr.ex=false; tr._dirty=true; delete tr.lane;
  if(c.take){ tr._raw=null; await takeStore.put('vox'+tr.id,c.take); }
  S.tracks.push(tr); const end=Math.ceil((tr.off+pSteps(tr)*pLoops(tr))/16-1e-9); if(S.bars<end) S.bars=Math.min(64,end); keyCache=null; S.activeId=tr.id; s2.selId=tr.id;
  save(); renderTracks(); scheduleRender(); if(c.take) reloadRaw(); toast(`Pasted ${partName(tr)} at bar ${tr.off/16+1}.`); }
/* the section being looped, in steps of the song (null: the whole song) */
function s2SecSet(t){ const a=t.off||0, b=Math.min(S.bars*16, a+pSteps(t)*pLoops(t)); if(b-a<4) return; s2.sec={a,b,id:t.id}; s2.loop=true; $('s2Loop').setAttribute('aria-pressed','true');
  if(playing){ const now=ctx.currentTime+0.03, L=loopLen(), pos=(((now-t0)%L)+L)%L; if(pos<a*stepDur()||pos>=b*stepDur()) startAll(now,a*stepDur()); } else playFrom=a*stepDur();
  s2Render(); toast(`Looping ${partWhere(t).toLowerCase()}. Tap the highlight on the ruler to loop the whole song.`,5200); }
function s2SecClear(quiet){ if(!s2.sec) return; s2.sec=null; s2Render(); if(!quiet) toast('Looping the whole song'); }
function s2SecValid(){ const c=s2.sec; if(c && (c.a>=S.bars*16-1 || (c.id!=null && !S.tracks.some(t=>t.id===c.id&&hasContent(t))))) s2.sec=null; else if(c) c.b=Math.min(c.b,S.bars*16); }   /* its part is gone, or the song ended before it */
function s2SecTick(){ s2SecValid(); const c=s2.sec; if(!c||!playing||recState||!ctx||s2.secJump) return; const L=loopLen(), A=c.a*stepDur(), B=Math.min(c.b*stepDur(),L), now=ctx.currentTime, pos=now-t0;
  if(pos>=B-0.12){ s2.secJump=true; startAll(Math.max(t0+B,now+0.01), A); setTimeout(()=>{ s2.secJump=false; },200); } }   /* jump back exactly at the end of the section */
const SNAPS=[1,0.5,0.25,0.125], snapBars=()=>SNAPS.includes(S.snap)?S.snap:1, fracTxt=v=>({1:'1',0.5:'½',0.25:'¼',0.125:'⅛'})[v]||String(v);
/* a length in bars, for labels: 2, 1½, ¾ … */
const barsTxt=b=>{ const w=Math.floor(b+1e-9), f=+(b-w).toFixed(3), F={0.5:'½',0.25:'¼',0.75:'¾',0.125:'⅛',0.375:'⅜',0.625:'⅝',0.875:'⅞'}[f]||(f?'.'+String(f).slice(2):''); return (w||!F?w:'')+F; };
function s2Chips(){ { const sp=$('s2Snap').lastElementChild, v=fracTxt(snapBars()); if(sp.textContent!==v) sp.textContent=v; } const b=$('s2Bpm').lastElementChild, k=$('s2Key').lastElementChild, kl=projKeyLabel()||(S.key!=='auto'?(NOTE_NAMES[+S.key]+' '+(SCALE_LABEL[S.scale]||'')).trim():'Auto');   /* a key picked before anything is recorded still shows */ if(b.textContent!==String(S.bpm)) b.textContent=S.bpm; if(k.textContent!==kl) k.textContent=kl;
  const m=$('s2Metro'), on=String(!!S.metro); if(m.getAttribute('aria-pressed')!==on) m.setAttribute('aria-pressed',on); }
/* called every frame: playhead, position readout, recording banner, stop at the end when Loop is off */
/* the editor's playhead strip: where the playhead is within the part being edited */
function edSeekDraw(){ const t=S.tracks.find(x=>x.id===s2.edId); if(!t||!t._grid||!t._cv||!t._cv.isConnected) return; const R=t._cv.parentElement.querySelector('.edrul'); if(!R) return;
  const G=t._grid, ps=pSteps(t), pos=s2.cur*16-(t.off||0), m=R.querySelector('.edrul-ph'), inside=pos>=0&&pos<ps; m.style.display=inside?'block':'none'; if(inside) m.style.left=(G.gut+pos*G.cw)+'px';
  if(!playing&&!recState&&t._ph){ t._ph.style.display=inside?'block':'none'; if(inside) t._ph.style.transform=`translate(${G.gut+pos*G.cw}px,0)`; } }
function s2Tick(frac){ if(!s2On()) return;
  if(s2.edId!=null){ const t=S.tracks.find(x=>x.id===s2.edId); if(t&&t._mfxph&&t._mfxph.el.isConnected){ const P=t._mfxph, st=clamp(frac,0,1)*S.bars*16-(t.off||0), n=pSteps(t), on=(playing||!!recState)&&st>=0&&st<n; P.el.style.display=on?'block':'none'; if(on) P.el.style.transform=`translateX(${P.PL+st/n*(P.W-P.PL-P.PR)}px)`; } } if(s2.edId!=null) edSeekDraw();
  if(s2.edId!=null){ const t=S.tracks.find(x=>x.id===s2.edId); if(t&&t._fxg&&t._fxph&&t._fxph.isConnected){ const st=clamp(frac,0,1)*S.bars*16-(t.off||0), G=t._fxg, on=(playing||!!recState)&&st>=0&&st<G.ps; t._fxph.style.display=on?'block':'none'; if(on) t._fxph.style.transform=`translateX(${G.gut+st*G.cw}px)`; const rp=t._fxrph, rin=st>=0&&st<G.ps; if(rp){ rp.style.display=rin?'block':'none'; if(rin) rp.style.left=(G.gut+st*G.cw)+'px'; } } } const bars=S.bars, live=playing||!!recState; if(live) s2.cur=clamp(frac,0,1)*bars; const pos=live?s2.cur:s2.cur;
  s2SecTick();
  if(playing && !recState && !s2.loop && ctx && ctx.currentTime-t0>=loopLen()-0.03){ togglePlay().then(()=>{ playFrom=0; s2.cur=0; }); }
  if(Math.abs(pos-s2.pos)>0.002){ s2.pos=pos; const a=$('s2Ph'), b=$('s2PhH'); if(a){ a.style.left=`calc(var(--s2-hdr) + ${pos} * var(--s2-barw))`; b.style.left=`calc(${pos} * var(--s2-barw))`; }
    $('s2Pos').textContent=(Math.floor(pos)+1)+'.'+(Math.floor((pos%1)*4)+1); s2Clip();
    if((playing||recState) && !s2.free){ const tl=$('s2Tl'), hw=parseFloat(getComputedStyle($('s2')).getPropertyValue('--s2-hdr')), x=hw+pos*s2.barw; if(x>tl.scrollLeft+tl.clientWidth-24||x<tl.scrollLeft+hw){ s2.auto=Date.now(); tl.scrollLeft=x-hw-8; } } }
  { const live2=playing||!!recState; if(live2!==s2.wasLive){ s2.wasLive=live2; s2.free=false; } }   /* each Play or take starts out following again */
  const rec=!!recState; if($('s2').classList.contains('recording')!==rec){ haptic('medium'); $('s2').classList.toggle('recording',rec); $('s2Rec').hidden=!rec; $('s2RecB').setAttribute('aria-label',rec?'Stop recording':'Record'); if(!rec) s2Render(); }
  if(rec){ const r=recState, live=ctx&&ctx.currentTime>=r.start, t=live&&!r.calib&&!r.teach ? `● Recording · bar ${Math.floor(pos)+1} · tap ■ to stop` : $('recLabel').textContent; if($('s2RecL').textContent!==t) $('s2RecL').textContent=t; }
  const pi=playing?'<path d="M7 5v14M17 5v14" stroke-width="3"/>':'<path d="M7 4l13 8-13 8V4z" fill="currentColor"/>'; if(s2._pi!==playing){ s2._pi=playing; nowPlaying(); $('s2PlayI').innerHTML=pi; $('s2EdPlayI').innerHTML=pi; $('s2Play').setAttribute('aria-label',playing?'Pause':'Play'); }
  s2Chips(); }
function s2Seek(){ const m=$('s2Marks'); if(!m) return; let drag=false; const set=e=>{ if(recState) return; const r=m.getBoundingClientRect(), bar=clamp((e.clientX-r.left)/s2.barw,0,63.99), L=loopLen(); s2.cur=playing?Math.min(bar,S.bars):bar; playFrom=Math.min(Math.min(bar,S.bars)/S.bars*L, L-0.001); if(playing&&ctx) startAll(ctx.currentTime+0.02, playFrom); };
  let mk=null; const barAt=e=>(e.clientX-m.getBoundingClientRect().left)/s2.barw;
  m.onpointerdown=e=>{ const M=s2.mark, lab=e.target.closest('[data-seci]');
    if(M){ const h=e.target.closest('[data-mh]'), x=barAt(e); if(h||(x>=M.a&&x<=M.b)){ mk={k:h?h.dataset.mh:'mv', x0:x, a0:M.a, b0:M.b}; try{ m.setPointerCapture(e.pointerId); }catch(_){} return; } }
    else if(lab&&!recState){ secMenu(+lab.dataset.seci); return; }
    drag=true; try{ m.setPointerCapture(e.pointerId); }catch(_){} set(e); };
  m.onpointermove=e=>{ if(mk){ const M=s2.mark, x=barAt(e), n=S.bars; if(mk.k==='l') M.a=clamp(Math.round(x),0,M.b-1); else if(mk.k==='r') M.b=clamp(Math.round(x),M.a+1,n); else { const len=mk.b0-mk.a0; M.a=clamp(mk.a0+Math.round(x-mk.x0),0,n-len); M.b=M.a+len; } s2MarkDraw(); return; } if(drag) set(e); };
  m.onpointerup=m.onpointercancel=()=>{ drag=false; mk=null; }; }
/* ---- marking a section on the timeline: a band with a handle at each end (whole bars), a name, Done (stays in the mode for the next one), Exit ---- */
function secMarkStart(edit){ secsTidy(); const secs=S.secs; let a,b,name;
  if(edit!=null&&secs[edit]){ ({a,b,name}=secs[edit]); }
  else { const cur=Math.min(S.bars-1,Math.max(0,Math.floor(s2.cur||0))), free=x=>!secs.some(q=>x>=q.a&&x<q.b); a=free(cur)?cur:(()=>{ for(let x=0;x<S.bars;x++) if(free(x)) return x; return cur; })(); b=Math.min(S.bars,a+4); name=SEC_NAMES[Math.min(secs.length,SEC_NAMES.length-1)]; }
  nxClose(); s2.mark={a,b,name,edit:edit!=null?edit:null}; $('s2MarkBar').hidden=false; document.querySelector('#s2 .s2-info').hidden=true; s2Render();
  try{ if(!localStorage.getItem('noodle.markTip')){ localStorage.setItem('noodle.markTip','1'); toast('Drag the edges to cover the bars, then tap Done.',5000); } }catch(e){} }
function secMarkEnd(){ s2.mark=null; $('s2MarkBar').hidden=true; document.querySelector('#s2 .s2-info').hidden=false; s2Render(); }
function s2MarkDraw(){ const M=s2.mark; if(!M){ return; } const band=$('s2MBand'); if(!band) return;
  band.style.left=`calc(${M.a} * var(--s2-barw))`; band.style.width=`calc(${M.b-M.a} * var(--s2-barw))`; $('s2MBandN').textContent=`${M.name} · ${M.b-M.a>1?'bars '+(M.a+1)+'–'+M.b:'bar '+(M.a+1)}`;
  const L=$('s2MDimL'), R=$('s2MDimR'); if(L){ L.style.left='var(--s2-hdr)'; L.style.width=`calc(${M.a} * var(--s2-barw))`; } if(R){ R.style.left=`calc(var(--s2-hdr) + ${M.b} * var(--s2-barw))`; R.style.right='0'; R.style.width=''; }
  const over=(S.secs||[]).some((q,i)=>i!==M.edit&&q.a<M.b&&q.b>M.a); band.classList.toggle('over',over);
  $('s2MkN').innerHTML=SEC_NAMES.map(n=>`<button data-mkn="${n}" aria-pressed="${n===M.name}">${n}</button>`).join('');
  $('s2MkOk').textContent=over?'Replace':'Done'; }
function secMarkDone(){ const M=s2.mark; if(!M) return; flushSave(); const keep=(S.secs||[]).filter((q,i)=>i!==M.edit&&(q.b<=M.a||q.a>=M.b));
  S.secs=keep.concat([{a:M.a,b:M.b,name:M.name}]); secsTidy(); save(); toast(`${M.name}: ${M.b-M.a>1?'bars '+(M.a+1)+'–'+M.b:'bar '+(M.a+1)}`);
  if(M.edit!=null){ secMarkEnd(); return; }
  const len=M.b-M.a, a=Math.min(M.b,S.bars-1); s2.mark={a, b:Math.min(S.bars,a+len), name:SEC_NAMES[Math.min(SEC_NAMES.indexOf(M.name)+1,SEC_NAMES.length-1)], edit:null}; s2Render(); }   /* ready for the next one */
/* tapping a section's name on the ruler */
function secMenu(i){ secsTidy(); const x=S.secs[i]; if(!x) return;
  nxSheet(`<h2>${nxEsc(x.name)}</h2><p style="color:var(--muted);margin:-6px 0 6px">${x.b-x.a>1?`Bars ${x.a+1}–${x.b}`:`Bar ${x.a+1}`}</p><div class="nx-grp" style="padding-top:6px">Name</div><div class="s2-opts" id="smN">${SEC_NAMES.map(n=>`<button data-n="${n}" aria-pressed="${n===x.name}">${n}</button>`).join('')}</div>
    <button class="nx-act" data-a="loop">Loop it</button><button class="nx-act" data-a="dup">Duplicate it</button><button class="nx-act" data-a="move">Move or resize</button><button class="nx-act" data-a="rm">Remove the name</button>`);
  $('nxSheet').onclick=e=>{ let b;
    if(b=e.target.closest('#smN button')){ flushSave(); x.name=b.dataset.n; save(); s2Render(); secMenu(i); }
    else if(b=e.target.closest('[data-a]')){ const k=b.dataset.a;
      if(k==='loop'){ nxClose(); s2.sec={a:x.a*16,b:x.b*16,id:null}; s2.loop=true; $('s2Loop').setAttribute('aria-pressed','true'); s2Render(); toast('Looping '+x.name+'. Tap the yellow band to stop.'); }
      else if(k==='dup'){ if(secDuplicate(x)){ nxClose(); toast(x.name+' duplicated: bars '+(x.b+1)+'–'+(2*x.b-x.a)+'.'); } }
      else if(k==='move') secMarkStart(i);
      else if(k==='rm'){ flushSave(); S.secs.splice(i,1); save(); nxClose(); s2Render(); } } }; }
const s2Fld=(id,label,min,max,v,step=1)=>`<div class="s2-fld"><label for="${id}">${label}</label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${v}" oninput="this.nextElementSibling.value=this.value"><output>${v}</output></div>`;
async function s2AddSheet(thenRecord){ const mine=thenRecord?s2Lanes().filter(L=>!L.tracks[0].guide&&L.tracks[0].inst!=='mix'):[], clip=!thenRecord&&isPro()?await takeStore.get('clipboard'):null;
  nxSheet(`<h2>${thenRecord?'What are you recording?':'Add a track'}</h2>${clip&&clip.part?`<button class="mfx-btn" id="s2Paste" style="width:100%;margin:0 0 10px;text-align:left">Paste part<small style="display:block;font-weight:400;color:var(--muted);font-size:13px">${nxEsc(clip.part.name||INST[clip.part.inst].label)}${clip.from?' from “'+nxEsc(clip.from)+'”':''}, at the playhead</small></button>`:''}${thenRecord?'':'<button class="nx-rowbtn" id="s2AddBeat">Add a beat<small style="display:block;font-weight:400;color:var(--muted);font-size:13px">Drums, bass and chords to rap or sing over</small></button>'}${mine.length?`<div class="nx-grp" style="padding-top:6px">Your tracks</div><div class="s2-opts">${mine.map(L=>`<button data-lane="${L.id}"><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${INST[L.tracks[0].inst].color};margin-right:6px"></i>${nxEsc(s2Name(L))}</button>`).join('')}</div><div class="nx-grp" style="padding-top:0">A new track</div>`:''}${PICK_GROUPS.map(([g,ids])=>[g,ids.filter(k=>!thenRecord||k!=='mix')]).map(([g,ids])=>`<div class="nx-grp" style="padding-top:6px">${g}</div><div class="s2-opts">${ids.map(k=>`<button data-k="${k}"><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${INST[k].color};margin-right:6px"></i>${INST[k].label}</button>`).join('')}</div>`).join('')}`);
  if($('s2Paste')) $('s2Paste').onclick=()=>{ nxClose(); partPaste(); };
  if($('s2AddBeat')) $('s2AddBeat').onclick=()=>beatSheet();
  $('nxSheet').onclick=e=>{ const ln=e.target.closest('[data-lane]'); if(ln){ nxClose(); s2.armId=s2Lane(ln.dataset.lane).id; s2Render(); s2Record(); return; }
    const b=e.target.closest('[data-k]'); if(!b) return; nxClose(); const tr=mkTrack(b.dataset.k,{id:S.nextId++}); S.tracks.push(tr); if(tr.inst==='mix'){ keyCache=null; save(); renderTracks(); toast('Mix effects: tap an empty spot in its row to add an effect.',5200); return; } S.activeId=tr.id; s2.armId=tr.id; keyCache=null; save(); renderTracks(); if(thenRecord) s2Record(); else toast(tr.inst==='fx'?'FX: try a rising “woooop”, a falling one, a “shhh”, or a short “pshh”.':'Ready: tap record',tr.inst==='fx'?6000:4200); }; }
const TAP_CUT=0.25;   /* seconds before the stop tap that are thrown away: reaching for the button and the tap itself thump the mic, and were heard as kicks */
/* The first time someone records a drum kit without having taught their sounds: offer to learn their kick, snare and hi-hat first.
   Measured on 28 amateur beatboxers (AVP): the right drum 63% / 56% of the time untaught, 79% / 77% taught. Offered once; More → Your drum sounds any time. */
const kitOfferDue=()=>{ if(micOff || taughtSlots().length>=2) return false; try{ return !localStorage.getItem('noodle.kitOffer'); }catch(e){ return false; } };
function kitOffer(){ try{ localStorage.setItem('noodle.kitOffer','1'); }catch(e){}
  const say=id=>{ const sl=slotOf(id)||S.kit.slots.find(x=>x.sound===id); return sl?nxEsc(sl.say||slotLabel(sl.id)):''; };
  nxSheet(`<h2>Teach Noodle your drum sounds?</h2><p style="color:var(--muted);font-size:15px;margin:0 0 4px">Everyone beatboxes differently. Make each sound on every click: kick (“${say('kick')}”), snare (“${say('snare')}”), then hi-hat (“${say('hat')}”).</p><p style="color:var(--muted);font-size:15px;margin:0 0 6px">About 20 seconds. Your drum takes come out right more often.</p><button class="nx-primary" id="kitTeach">Teach my sounds</button><button class="nx-ghost" id="kitSkip" style="width:100%;margin-top:8px">Not now</button>`);
  $('kitSkip').onclick=()=>{ nxClose(); s2Record(); };
  $('kitTeach').onclick=()=>{ nxClose(); ensureCtx(); s2.afterTeach=true; startTeach(['kick','snare','hat'].map(k=>(slotOf(k)||S.kit.slots.find(x=>x.sound===k)||{}).id).filter(Boolean)); }; }
const S2_MAX=16;   /* longest single take, in bars */
function s2Record(){ ensureCtx(); s2.selId=null; if(recState){ const r=recState; if(ctx.currentTime<r.start+0.4) cancelRecord(); else { r.end=Math.min(r.end, ctx.currentTime-r.lat-0.05); r.cut=ctx.currentTime-TAP_CUT; } return; }   /* tap again: stop and keep what was recorded */
  const L=s2Lane(s2.armId); if(!L||L.tracks[0].guide||L.tracks[0].inst==='mix'){ s2AddSheet(true); return; } const first=L.tracks[0]; let tr=first; takeBar=null;
  if(first.inst==='kit' && kitOfferDue()){ kitOffer(); return; }
  { const P=clamp(Math.floor(s2.cur+1e-6),0,63);
    tr=L.tracks.find(t=>!hasContent(t));
    if(!tr){ tr=mkTrack(first.inst,{id:S.nextId++, lane:L.id, sound:first.sound, vol:first.vol, mute:first.mute, solo:first.solo, send:first.send, tone:first.tone, oct:first.oct, sens:first.sens}); if(first.adsr) tr.adsr=first.adsr; if(first.fx) tr.fx=Object.assign({},first.fx); S.tracks.push(tr); }
    s2.recPrev=S.bars; s2.recLen=Math.min(S2_MAX,64-P); tr.off=P*16; tr.rep=false; tr.len=s2.recLen; tr.lenSet=true; if(S.bars<P+tr.len){ S.bars=P+tr.len; } save(); }
  s2.recId=tr.id; s2.post=true; S.activeId=tr.id; recordInto(tr.id); }
/* An FX part's events: change what each one is, how long it lasts, or remove it */
/* The note editor: one part, full screen. The grid is the same one as before (tap to select, drag to move, double-tap or tap a seam to split), with bigger rows. */
/* FX editor: one row per kind, like the drum kit. Each effect is a bar from where it starts to where it ends, with the shape of your voice drawn inside.
   Tap an empty spot to add one (a build lasts a bar, an impact a beat); tap one to remove it; drag it to move it or change its kind; drag its right end to make it longer or shorter. */
const FX_ROWS=['riser','down','sweepUp','sweepDown','impact'];
const FX_V=0.4;   /* a new effect starts at volume 40: FX are background ear candy, not a lead part (owner) */
function fxNew(k, s, ps){ const N=16, up=k==='riser'||k==='sweepUp', l=k==='impact'?Math.min(4,ps-s):Math.min(16,ps-s);
  return {s, l:Math.max(1,l), k, v:FX_V, c:Array.from({length:N},(_,i)=>+(up?i/(N-1):1-i/(N-1)).toFixed(3)), a:Array.from({length:N},(_,i)=>k==='impact'?+(1-i/N).toFixed(3):0.8)}; }
function fxGridMount(tr, host){ const ps=pSteps(tr), wrap=document.createElement('div'); wrap.className='fxg'; wrap.innerHTML='<div class="fxg-in"><div class="edrul" aria-label="Bar numbers: tap or drag to move the playhead"><i class="edrul-ph"></i></div><canvas></canvas><div class="fxg-ph"></div></div>'; host.appendChild(wrap);   /* bar numbers on top, as in the note and drum editors */
  const cv=wrap.querySelector('canvas'), ph=wrap.querySelector('.fxg-ph'), H=Math.max(170,Math.min(400,(host.clientHeight||400)-290))   /* room for the bar numbers above and the selected effect's controls below (Octave included) */, gut=86, rh=H/FX_ROWS.length, W0=Math.max((host.clientWidth||340)-2, gut+ps*9), cw=(W0-gut)/ps, W=gut+cw*ps;
  const G={gut,cw,rh,W,H,ps}; tr._fxg=G; tr._fxph=ph; ph.style.top='26px';
  { const R=wrap.querySelector('.edrul'), b0=Math.floor((tr.off||0)/16); R.style.width=W+'px'; for(let k=0;k*16<ps;k++) R.insertAdjacentHTML('beforeend',`<span style="left:${gut+k*16*cw}px">${b0+k+1}</span>`); tr._fxrph=R.querySelector('.edrul-ph'); edRulerWire(tr,R,()=>G); }
  const draw=()=>{ const dpr=Math.min(2,window.devicePixelRatio||1); cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); cv.style.width=W+'px'; cv.style.height=H+'px'; ph.style.height=H+'px';
    const g=cv.getContext('2d'), cs=getComputedStyle($('s2')), v=n=>cs.getPropertyValue(n).trim(), col=INST.fx.color; g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
    FX_ROWS.forEach((k,r)=>{ g.fillStyle=r%2?v('--s2-lane2'):v('--s2-lane'); g.fillRect(gut,r*rh,W-gut,rh); g.fillStyle=v('--s2-panel'); g.fillRect(0,r*rh,gut-2,rh-1); g.fillStyle=v('--s2-ink'); g.font='600 12px '+(v('--f-body')||'sans-serif'); g.textBaseline='middle'; g.fillText(FX_KINDS[k],8,r*rh+rh/2); });
    for(let st=0;st<=ps;st+=4){ g.fillStyle=st%16===0?v('--s2-ink'):v('--s2-line'); g.globalAlpha=st%16===0?0.35:0.8; g.fillRect(gut+st*cw-(st===ps?1:0),0,1,H); } g.globalAlpha=1;
    (tr.fxs||[]).forEach(e=>{ const r=FX_ROWS.indexOf(e.k); if(r<0||e.s>=ps) return; const x=gut+e.s*cw+1, w=Math.max(6,Math.min(e.l,ps-e.s)*cw-2), y=r*rh+5, h=rh-10, sel=tr._fxSel===e;
      g.fillStyle=col; g.globalAlpha=0.28; g.beginPath(); if(g.roundRect) g.roundRect(x,y,w,h,5); else g.rect(x,y,w,h); g.fill(); g.globalAlpha=1; g.strokeStyle=sel?v('--s2-amber'):col; g.lineWidth=sel?2.5:1.5; g.stroke();
      g.fillStyle=col; g.beginPath(); const y0=y+h-3, hh=h-8;   /* the shape of your voice */
      g.moveTo(x+3,y0); for(let i=0;i<=32;i++){ const u=i/32; g.lineTo(x+3+(w-6)*u, y0-hh*(0.1+0.9*fxShape(e,u))); } g.lineTo(x+w-3,y0);
      g.closePath(); g.globalAlpha=0.85; g.fill(); g.globalAlpha=1;
      if(sel&&w>30){ const p=fxDot(e); g.beginPath(); g.arc(p.x,p.y,7,0,7); g.fillStyle=v('--s2-amber'); g.fill(); g.lineWidth=2; g.strokeStyle=v('--s2-bg'); g.stroke(); }   /* drag up or down to bend its loudness */
      g.fillStyle=v('--s2-ink'); g.globalAlpha=0.6; g.fillRect(x+w-6,y+h/2-8,2.5,16); g.globalAlpha=1; }); };   /* the grip at the right end */
  const fxDot=e=>{ const r=FX_ROWS.indexOf(e.k), x=gut+e.s*cw+1, w=Math.max(6,Math.min(e.l,ps-e.s)*cw-2), h=rh-10, y0=r*rh+5+h-3, hh=h-8; return {x:x+3+(w-6)*0.5, y:y0-hh*(0.1+0.9*fxShape(e,0.5)), hh}; };
  const at=ev=>{ const R=cv.getBoundingClientRect(), x=ev.clientX-R.left, y=ev.clientY-R.top; return {x, y, st:Math.floor((x-gut)/cw), row:clamp(Math.floor(y/rh),0,FX_ROWS.length-1)}; };
  const hitAt=q=>(tr.fxs||[]).slice().reverse().find(e=>FX_ROWS.indexOf(e.k)===q.row && q.x>=gut+e.s*cw-4 && q.x<=gut+(e.s+e.l)*cw+4);
  const changed=()=>{ tr.blank=tr.blank||!(tr.fxs||[]).length; tr._dirty=true; save(); scheduleRender(); draw(); const L=s2Lane(s2LaneId(tr)), lc=L&&$('s2In').querySelector(`canvas[data-cv="${L.id}"]`); if(lc) s2DrawLane(L,lc); $('s2EdS').textContent=partWhere(tr)+' · '+(tr.fxs||[]).length+' FX'; };
  let d=null;
  cv.style.touchAction='pan-x';
  cv.addEventListener('touchstart',ev=>{ if(ev.touches.length!==1) return; const q=at(ev.touches[0]); if(q.x>=gut && hitAt(q)) ev.preventDefault(); },{passive:false});   /* on an effect: drag it, don't scroll */
  cv.addEventListener('touchmove',ev=>{ if(d&&d.e) ev.preventDefault(); },{passive:false});
  cv.addEventListener('pointerdown',ev=>{ const q=at(ev); if(q.x<gut||q.st<0||q.st>=ps) return; flushSave(); const sd=tr._fxSel&&(tr.fxs||[]).includes(tr._fxSel)?fxDot(tr._fxSel):null, onDot=sd&&Math.hypot(q.x-sd.x,q.y-sd.y)<22;
    const e=onDot?tr._fxSel:hitAt(q); d={q, e, s0:e&&e.s, l0:e&&e.l, k0:e&&e.k, b0:e&&(e.b||0), moved:false, mode:onDot?'bend':e&&q.x>gut+(e.s+e.l)*cw-16?'len':'move', id:ev.pointerId}; if(e){ tr._fxSel=e; draw(); try{ cv.setPointerCapture(ev.pointerId); }catch(_){} } });
  cv.addEventListener('pointermove',ev=>{ if(!d||!d.e||ev.pointerId!==d.id) return; const q=at(ev), ds=Math.round((q.x-d.q.x)/cw);
    if(!d.moved && Math.abs(q.x-d.q.x)<6 && Math.abs(q.y-d.q.y)<8) return; d.moved=true; ev.preventDefault();
    if(d.mode==='bend'){ const b=clamp(d.b0-(q.y-d.q.y)/(fxDot(d.e).hh*0.6),-1,1); if(Math.abs(b)<0.06) delete d.e.b; else d.e.b=+b.toFixed(2); }   /* snaps back to straight near the middle */
    else if(d.mode==='len') d.e.l=clamp(d.l0+ds,1,ps-d.e.s);
    else { d.e.s=clamp(d.s0+ds,0,ps-1); d.e.l=Math.min(d.l0,ps-d.e.s); d.e.k=FX_ROWS[q.row]; }
    draw(); });
  const up=ev=>{ if(!d) return; const q=d; d=null;
    if(q.e && q.moved){ if(q.e.k!==q.k0) logEdit(tr,{k:'fxkind',s:q.e.s,from:q.k0,to:q.e.k}); changed(); panel(); return; }
    if(q.e){ tr._fxSel=q.e; draw(); panel(); return; }   /* a tap selects it; Delete is in the bar below */
    if(ev.type==='pointercancel') return;
    if(tr._fxSel){ tr._fxSel=null; draw(); panel(); return; }   /* a tap on empty space first just deselects (as in the note editor) */
    const k=FX_ROWS[q.q.row], e=fxNew(k,q.q.st,ps); tr.fxs=(tr.fxs||[]).concat([e]); tr._fxSel=e; logEdit(tr,{k:'fxadd',s:e.s,kind:k}); changed(); panel(); };
  cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
  const bar=document.createElement('div'); bar.className='fxsel'; host.appendChild(bar);
  const panel=()=>{ const e=tr._fxSel; if(!e||!(tr.fxs||[]).includes(e)){ tr._fxSel=null; bar.hidden=true; bar.innerHTML=''; return; } bar.hidden=false; const st=(tr.off||0)+e.s;
    bar.innerHTML=`<div class="fxsel-h"><b>${FX_KINDS[e.k]}</b><small>${partWhere({off:st,len:e.l/16,rep:false}).replace('Bars','bars').replace('Bar','bar')}</small><button class="del" id="fxDel">Delete</button></div>${s2Fld('fxVol','Volume',0,100,Math.round((e.v??0.8)*100))}${s2Fld('fxPan','Left / right',-100,100,Math.round((e.pan||0)*100))}${e.k==='riser'||e.k==='down'?`<div class="s2-fld"><label>Octave</label><div class="s2-opts" style="padding:0"><button data-fo="-1" aria-label="Octave down" ${(e.o||0)<=-2?'disabled':''}>−</button><output id="fxOct" style="width:36px;text-align:center;align-self:center;font:700 15px var(--f-mono)">${(e.o||0)>0?'+':''}${e.o||0}</output><button data-fo="1" aria-label="Octave up" ${(e.o||0)>=2?'disabled':''}>+</button></div></div>`:''}`;
    bar.querySelectorAll('[data-fo]').forEach(b=>{ b.onclick=()=>{ const o=clamp((e.o||0)+(+b.dataset.fo),-2,2); if(o) e.o=o; else delete e.o; changed(); panel(); }; });   /* risers and downlifters: up or down an octave */
    $('fxDel').onclick=()=>{ tr.fxs=tr.fxs.filter(x=>x!==e); tr._fxSel=null; logEdit(tr,{k:'fxdel',s:e.s,kind:e.k}); changed(); panel(); };
    $('fxVol').onchange=ev2=>{ e.v=+ev2.target.value/100; changed(); }; $('fxPan').onchange=ev2=>{ e.pan=+ev2.target.value/100; changed(); }; };
  draw(); panel(); }
function s2Edit(tr){ s2.edId=tr.id; S.activeId=tr.id; $('s2Ed').hidden=false; s2EdMount(); }
function s2EdMount(){ if(s2.edId==null) return; const tr=S.tracks.find(t=>t.id===s2.edId); if(!tr||!hasContent(tr)){ s2EdClose(); return; }
  const host=$('s2EdBody'), kind=INST[tr.inst].kind, avail=Math.max(200,(host.clientHeight||window.innerHeight*0.6)-90-26);
  GRID_H=Math.min(520,avail); GRID_RH=30; GRID_DRUM=kind==='pitched'||tr.inst==='fx'||tr.mfx?1:Math.min(60,Math.max(30,(avail-60)/gridRows(tr).rows.length))/gridRows(tr).rh;   /* drum rows as tall as the note editor's rows (a little taller when there's room), so hits read as notes */
  if(tr.mfx){ host.innerHTML=''; tr._cv=null; mfxEdMount(tr,host); }
  else if(tr.inst==='fx'){ const sx=host.querySelector('.fxg')?host.querySelector('.fxg').scrollLeft:0; host.innerHTML=''; tr._cv=null; fxGridMount(tr,host); if(sx) host.querySelector('.fxg').scrollLeft=sx; }
  else { const sx=tr._cv&&tr._cv.isConnected?tr._cv.parentElement.parentElement.scrollLeft:0; host.innerHTML='';
    if(kind==='pitched'){ const K=currentKey(); if(!K.none){ const bar=document.createElement('div'); bar.className='ed-keys'; bar.innerHTML=`<span>${s2.chrom?'All 12 notes':'Notes in '+nxEsc(NOTE_NAMES[K.tonic]+' '+(SCALE_LABEL[K.scale]||K.scale))}</span><button id="edChrom">${s2.chrom?'− Key notes only':'+ All notes'}</button>`; host.appendChild(bar);
      bar.querySelector('#edChrom').onclick=()=>{ s2.chrom=!s2.chrom; tr._range=null; s2EdMount(); }; } }   /* the piano roll shows the key's notes; + opens all 12 */
    if(kind==='drums'&&tr.hits){ const n=Math.floor(pSteps(tr)*pLoops(tr)/16), bar=document.createElement('div'); bar.className='ed-keys ed-fill';   /* fills belong to this part (region), set right in its editor */
      bar.innerHTML=`<span>Fills${s2Inf('The last beat of every 4 or 8 bars of this part becomes a drum fill, with a crash after it.')}</span><div class="ed-seg" id="edFill">${[[0,'Off'],[4,'Every 4 bars'],[8,'Every 8 bars']].map(([v,l])=>`<button data-f="${v}" aria-pressed="${(tr.fill||0)===v}" ${v&&n<v?'disabled':''}>${l}</button>`).join('')}</div>`; host.appendChild(bar);
      bar.onclick=e=>{ const i=e.target.closest('[data-info]'); if(i){ e.preventDefault(); infoPop(i); return; } const b=e.target.closest('[data-f]'); if(!b||b.disabled) return; const v=+b.dataset.f; if(v) tr.fill=v; else delete tr.fill; tr._dirty=true; save(); scheduleRender(); s2EdMount(); toast(v?'Fill every '+v+' bars':'Fills off'); }; }
    host.appendChild(buildCard(tr));
  requestAnimationFrame(()=>{ if(tr._cv&&tr._cv.isConnected){ drawGrid(tr); if(sx){ tr._autoScroll=true; tr._cv.parentElement.parentElement.scrollLeft=sx; } } }); }
  $('s2EdT').textContent=s2Name(s2Lane(s2LaneId(tr))); $('s2EdS').textContent=partWhere(tr)+' · '+(tr.mfx?MFX[tr.mfx.k].label:tr.inst==='fx'?(tr.fxs||[]).length+' FX':tr.notes?tr.notes.length+' notes':tr.hits?tr.hits.length+' hits':'audio');
  { const b=$('s2EdMz'), on=kind==='pitched'&&tr.inst!=='arp'&&!!tr.notes&&!!tr.heardNotes; b.hidden=!on; if(on){ b.textContent=tr.mzOn?'Musical':'As heard'; b.setAttribute('aria-pressed',String(!!tr.mzOn)); b.onclick=()=>{ musicalSwap(tr); s2EdMount(); toast(tr.mzOn?'Musical version':'As heard'); }; } }   /* Musical mode: back to the take as heard, or musical again */
  { const b=$('s2EdTap'), an=tr._an, on=!!window.NOODLE_DEV&&kind==='pitched'&&!!an&&!!an.altNotes; b.hidden=!on; if(on){ b.textContent=an.tapNew?'Tap notes':'Today'; b.setAttribute('aria-pressed',String(!!an.tapNew)); b.onclick=()=>{ tapSwap(tr); s2EdMount(); toast(an.tapNew?'Tap notes':'Today'); }; } }   /* testing: the same take read today or with tap notes */
  const pit=kind==='pitched'&&tr.inst!=='arp'; $('s2EdVer').hidden=!pit; $('s2EdVerI').hidden=!pit; $('s2EdFill').hidden=!pit; if(pit){ if(tr._vi && verSig(tr)!==tr._verSig) tr._vi=0; verUI(tr); } else $('s2EdMine').hidden=true;
  $('s2EdHint').textContent=tr.mfx?mfxHint(tr):tr.inst==='fx'?'Tap to add an effect. Drag it to move, its end to resize, its dot to bend it.':kind==='pitched'?'Tap a note to select it. Drag to move. Double-tap to split. Hold and drag to select several.':tr.hits?'Tap to add a hit. Drag to move. Hold and drag to select several.':'';
  $('s2EdUndo').disabled=!hist.undo.length; $('s2EdRedo').disabled=!hist.redo.length; }
const mfxHint=tr=>isPro()||MFX[tr.mfx.k].free?'Tap + to add a point. Drag to reshape. Drag a line’s middle to curve it.':'Pro effect: try it here. It goes back when you leave, unless you get Pro.';
function s2EdClose(){ try{ pvEnd(); }catch(e){} const tr=S.tracks.find(t=>t.id===s2.edId); if(tr){ tr._cv=null; tr._sel=null; tr._msel=null; try{ learnSqueezeFromFixes(tr); }catch(e){} } s2.edId=null; GRID_H=176; GRID_RH=15; GRID_DRUM=1; $('s2Ed').hidden=true; $('s2EdBody').innerHTML=''; s2Render(); }
/* Share, inside the Studio. A linear song is exported once through (Loop is only for listening). */
function s2ShareSheet(){ if(!S.tracks.some(hasContent)){ toast('Record something first'); return; } if(playing) togglePlay();
  nxSheet(`<h2>Share “${nxEsc(S.title||'Untitled')}”</h2>
    <button class="nx-act" data-k="daw"><span>DAW pack${isPro()?'':PRO_LOCK}<small>Every track as audio and MIDI, for Logic, Ableton, GarageBand</small></span></button>
    <button class="nx-act" data-k="audio"><span>Audio<small>The whole song, one file</small></span></button>
    <button class="nx-act" data-k="video"><span>Video<small>For TikTok, Reels and YouTube: your parts move to the beat</small></span></button>
    <button class="nx-act" data-k="link"><span>Link to remix<small>Friends listen, then add their own part in Noodle</small></span></button>
    ${S.link?`<div class="s2-lk"><span>Shared by link</span><button id="s2LkStop">Stop sharing</button></div>`:''}
    ${S.remixOf&&S.remixOf.id?`<div class="s2-lk"><span>From a shared link: “${nxEsc(S.remixOf.title||'a song')}”</span><button id="s2Rep">Report</button></div>`:''}
    <div class="s2-shst" id="s2ShSt" hidden></div><div class="nx-bar s2-shbar" id="s2ShBar" hidden><i></i></div><div class="s2-shgo" id="s2ShGo" hidden><button class="go" id="s2ShNow">Share</button><button id="s2ShSave">Save to Files</button></div>`);
  const st=m=>{ const e=$('s2ShSt'); if(e){ e.hidden=!m; e.textContent=m||''; } }, bar=(mode,frac)=>{ const e=$('s2ShBar'); if(!e) return; e.hidden=!mode; e.classList.toggle('ind',mode==='ind'); if(mode==='pct') e.firstElementChild.style.width=Math.round(clamp(frac,0,1)*100)+'%'; else e.firstElementChild.style.width=''; }, lock=v=>$('nxSheet').querySelectorAll('.nx-act').forEach(b=>{ b.disabled=v; });
  $('s2ShNow').onclick=()=>shareNow(); $('s2ShSave').onclick=()=>{ if(shareUrl){ try{ navigator.clipboard.writeText(shareUrl); toast('Link copied'); }catch(e){ toast(shareUrl); } return; } if(shareFile) offerFile(shareFile.name, shareFile); };
  if($('s2Rep')) $('s2Rep').onclick=()=>songReportSheet();
  if($('s2LkStop')) $('s2LkStop').onclick=async()=>{ const ok=await songLinkDelete(); toast(ok?'The link no longer works. Your song is still here.':'Couldn’t reach Noodle’s server. Try again with a connection.'); if(ok) s2ShareSheet(); };
  const linkGo=async()=>{ lock(true); $('s2ShGo').hidden=true; bar('ind'); shareFile=null; shareUrl=null;
    try{ shareUrl=await songLinkShare(st); bar(null); st('Your link is ready. Anyone with it can listen, and open it in Noodle to add their own part.'); $('s2ShGo').hidden=false; $('s2ShNow').hidden=!navigator.share; $('s2ShSave').textContent='Copy link'; }
    catch(e){ bar(null); st('The link couldn’t be made: '+(e&&e.message||e)+'.'); } lock(false); };
  $('nxSheet').onclick=async e=>{ if(e.target.closest('#s2LkOk')){ try{ localStorage.setItem('noodle.linkOk','1'); }catch(_){} return linkGo(); }
    const b=e.target.closest('[data-k]'); if(!b||b.disabled) return; const k=b.dataset.k; $('s2ShSave').textContent='Save to Files'; shareUrl=null;
    if(k==='link'){ let ok=null; try{ ok=localStorage.getItem('noodle.linkOk'); }catch(_){} if(ok) return linkGo();
      st('Anyone with the link can listen to this song and copy it into their own Noodle (your recordings included). You can stop sharing it here any time.'); $('s2ShGo').hidden=true;
      $('s2ShSt').insertAdjacentHTML('beforeend',`<p style="color:var(--muted);font-size:13px;margin:8px 0">Shared songs follow the <a href="${NX_TERMS}" target="_blank" rel="noopener" style="color:inherit">terms of use</a>: nothing hateful, explicit or someone else’s work.</p>`);   /* Apple 1.2: people agree to terms before sharing (once) */
      const c=document.createElement('button'); c.className='nx-primary'; c.id='s2LkOk'; c.textContent='Agree and make the link'; $('s2ShSt').appendChild(c); return; }
    if(k==='daw'&&!isPro()){ proSheet('The DAW pack (every track as audio and MIDI, ready for Logic, Ableton or GarageBand) is part of Noodle Pro.'); return; } S.loops=1; lock(true); $('s2ShGo').hidden=true;
    S.exportedAt=new Date().toISOString(); save(); try{ dropSync(true); }catch(e){}   /* exporting says: these notes are what I meant */
    if(k==='daw'){ st('Preparing your tracks…'); bar('ind'); await exportZip(); bar(null); st('Done. Look for the .zip in your downloads or the share sheet.'); lock(false); return; }
    st(k==='video'?'Making your video…':'Making your audio…'); bar('ind'); shareFile=null; let total=0; const prog=sec=>{ const left=Math.ceil(sec); total=Math.max(total,left); if(total>1){ bar('pct',1-left/total); st('Making your video… about '+left+' s left'); } };
    await prepareShare(k,prog); bar(null); lock(false); if(!$('s2ShSt')) return;
    if(shareFile){ st(shareMsg); $('s2ShGo').hidden=false; $('s2ShNow').hidden=!shareCan; } else st('That didn’t work here. Try the other option.'); }; }
/* Report a song that came from someone else's link (offensive, spam, someone else's work...): the takes service hides it on the first report, until the owner looks.
   Offers to remove it from your songs too. With no accounts there is no one to block: songs only arrive when you open a link yourself. */
function songReportSheet(){ const r=S.remixOf; if(!r||!r.id) return;
  nxSheet(`<h2>Report this song</h2><p style="color:var(--muted);font-size:14px;margin:-4px 0 12px">“${nxEsc(r.title||'This song')}” came from a shared link. What’s wrong with it?</p>
    <div class="s2-opts" id="repWhy">${['Offensive or hateful','Sexual content','Spam or scam','Someone else’s work','Something else'].map(x=>`<button data-r="${nxEsc(x)}">${nxEsc(x)}</button>`).join('')}</div>
    <p style="color:var(--muted);font-size:13px;margin:12px 0 0">Reports go to Tuttii (info@tuttii.io). A reported song is hidden while we look at it.</p>`);
  $('nxSheet').onclick=async e=>{ const b=e.target.closest('[data-r]'), d=e.target.closest('#repDel'); if(d){ nxClose(); await projDelete(S.pid); try{ nxGo('projects'); }catch(_){} toast('Removed from your songs.'); return; } if(!b) return;
    let ok=false; try{ ok=(await fetch(`${NOODLE_API}/v1/songs/${r.id}/report`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:b.dataset.r})})).ok; }catch(_){}
    nxSheet(`<h2>${ok?'Thanks for telling us':'Couldn’t send the report'}</h2><p style="color:var(--muted);font-size:14px">${ok?'We’ll look at it.':'Check your connection and try again, or email info@tuttii.io.'}</p><button class="nx-primary" id="repDel">Remove this song from my songs</button>`); }; }
/* Move a part along its lane, in whole bars. It can't land on another part. */
/* where a part sits, for labels: "Bars 3–4", or with fractions "From bar 3½ · 1½ bars" */
function partWhere(t){ const st=(t.off||0)/16, len=pBars(t)*pLoops(t); if(st%1===0 && len%1===0){ const b0=st+1, b1=st+len; return b1>b0?`Bars ${b0}–${b1}`:`Bar ${b0}`; } return `From bar ${barsTxt(st+1)} · ${barsTxt(len)} bar${len>1?'s':''}`; }
/* A new empty part: one bar (shorter if the next part starts sooner), at the snap step you tapped. Reuses the lane's empty track when it has one. */
/* the empty spot's length: what you dragged its handles to (s2.empty.len), else the default, never running into the next part */
function emptyLen(L, e){ const room=Math.min(64*16,...L.tracks.filter(t=>hasContent(t)&&(t.off||0)>e.at).map(t=>t.off||0))-e.at; return e.len?Math.max(1,Math.min(e.len,room)):newPartLen(L,e.at); }
function newPartLen(L, at){ const next=Math.min(64*16,...L.tracks.filter(t=>hasContent(t)&&(t.off||0)>at).map(t=>t.off||0)); return Math.max(1,Math.min(L.tracks[0].inst==='mix'?64:16,next-at)); }
function s2NewPart(){ const e=s2.empty; if(!e) return; const L=s2Lane(e.lane); s2.empty=null; if(!L) return; const first=L.tracks[0], len=emptyLen(L,e);
  let tr=L.tracks.find(t=>!hasContent(t));
  if(!tr){ tr=mkTrack(first.inst,{id:S.nextId++, lane:L.id, sound:first.sound, vol:first.vol, mute:first.mute, solo:first.solo, send:first.send, tone:first.tone, oct:first.oct, sens:first.sens}); if(first.adsr) tr.adsr=first.adsr; if(first.chordType) tr.chordType=first.chordType; S.tracks.push(tr); }
  tr.off=e.at; tr.len=len/16; tr.lenSet=true; tr.rep=false; tr.blank=true; if(tr.notes) tr.notes=[]; if(tr.hits) tr.hits=[]; if(tr.fxs) tr.fxs=[]; tr._dirty=true;
  if(tr.inst==='mix'){ const last=L.tracks.filter(t=>t.mfx&&t!==tr).pop(); tr.mfx={k:last&&(isPro()||MFX[last.mfx.k].free)?last.mfx.k:'lp', curve:null, params:{}}; tr.blank=false; }   /* the lane's last effect, else Low pass */
  const end=Math.ceil((e.at+len)/16-1e-9); if(S.bars<end) S.bars=Math.min(64,end); S.activeId=tr.id; s2.selId=tr.id; save(); renderTracks(); scheduleRender();
  s2Edit(tr); }
/* Duplicate a whole track: every part, its notes and settings, as a new track right under it. Handy to reuse a melody's notes for chords or another sound. */
function s2DupTrack(L){ const src=S.tracks.filter(t=>s2LaneId(t)===L.id); if(!src.length||src[0].guide) return null; let laneId=null;
  const copies=src.map((t,i)=>{ const c=JSON.parse(JSON.stringify(t,(k,v)=>k[0]==='_'?undefined:v)); c.id=S.nextId++; if(i===0){ laneId=c.id; delete c.lane; } else c.lane=laneId; if(c.name) c.name=c.name+' copy';   /* an unnamed copy takes its instrument's name, so switching it to Keys reads "Keys" */
    delete c.sid; delete c.sidAt; delete c.sidHeard; delete c.ed; c.copyOf=t.id; c.solo=false; c._dirty=true; if(t._raw){ c._raw=t._raw; storeVox(c); } return c; });
  const at=Math.max(...src.map(t=>S.tracks.indexOf(t)))+1; S.tracks.splice(at,0,...copies); keyCache=null; save(); scheduleRender(); return laneId; }
function s2MoveClip(tr, bars){ const off=Math.round((tr.off||0)+bars*16), len=pSteps(tr)*pLoops(tr); if(pLoops(tr)>1) return false; if(off<0 || off+len>64*16) return false;
  const hit=S.tracks.some(t=>t!==tr&&s2LaneId(t)===s2LaneId(tr)&&hasContent(t)&&off<(t.off||0)+pSteps(t)*pLoops(t)&&(t.off||0)<off+len); if(hit) return false;
  const L=pBars(tr); tr.len=L; tr.lenSet=true; tr.rep=false; const need=Math.ceil(Math.max(1,...S.tracks.filter(hasContent).map(t=>t===tr?off/16+L:(t.off||0)/16+(t.off!=null&&t.len?t.len:S.bars)))-1e-9);
  if(need>S.bars){ S.bars=Math.min(64,need); } tr.off=off; if(need<S.bars && S.tracks.filter(hasContent).every(t=>t.off!=null&&t.len)) S.bars=need; tr._dirty=true; save(); scheduleRender(); return true; }
/* Trim or extend a part by whole bars: ds moves its start (+ later, - earlier), de moves its end (+ later, - earlier). Never onto another part. */
function s2ResizeClip(tr, ds, de){ if(pLoops(tr)>1 || (!ds&&!de)) return false; let n=pSteps(tr); const off=tr.off||0, a=off+16*ds, b=off+n+16*de;
  if(b-a<Math.round(16*Math.min(1,snapBars())) || a<0 || b>64*16) return false; if(S.tracks.some(t=>t!==tr&&s2LaneId(t)===s2LaneId(tr)&&hasContent(t)&&(t.off||0)<b&&(t.off||0)+pSteps(t)*pLoops(t)>a)) return false;
  if(tr.inst!=='vox' && !tr.mfx){ const lo=Math.max(0,16*ds), hi=n+Math.min(0,16*de); if(![...(tr.notes||[]),...(tr.hits||[]),...(tr.fxs||[])].some(x=>x.s<hi&&x.s+(x.l||1)>lo)) return false; }   /* a trim never leaves a part with nothing in it */
  tr.len=pBars(tr); tr.lenSet=true; tr.rep=false; if(S.bars<b/16) S.bars=Math.ceil(b/16-1e-9);
  if(ds){ const k=-ds*16;   /* the window's start moves by -k steps: the content shifts by +k so it stays where it was in the song (nothing is removed) */ if(tr.notes) tr.notes.forEach(x=>{ x.s+=k; }); if(tr.hits) tr.hits.forEach(x=>{ x.s+=k; }); if(tr.fxs) tr.fxs.forEach(x=>{ x.s+=k; }); if(tr.inst==='vox'){ tr.va=+((tr.va||0)-k*stepDur()).toFixed(4); if(tr.vn) tr.vn.forEach(v=>{ v.t+=k*stepDur(); }); tr._tuned=null; tr._pitch=null; } tr.off=off-k; tr.len+=-ds; }
  tr.len+=de;   /* the window's end: whatever is past it stays, unheard, until you extend again */
  tr._an=null; tr._takes=null; tr._dirty=true;
  if(S.tracks.filter(hasContent).every(t=>t.off!=null&&t.len)) S.bars=Math.ceil(Math.max(1,...S.tracks.filter(hasContent).map(t=>t.off/16+t.len))-1e-9);
  keyCache=null; save(); scheduleRender(); return true; }
const s2TrimClip=(tr,how)=>how==='start'?(pBars(tr)<2?false:s2ResizeClip(tr,1,0)):how==='end'?(pBars(tr)<2?false:s2ResizeClip(tr,0,-1)):s2ResizeClip(tr,0,1);
/* A copy of a part, placed right after it (or in the next gap that fits) on the same track. */
function s2DupClip(tr){ if(pLoops(tr)>1) return null; const len=pSteps(tr), mates=S.tracks.filter(t=>s2LaneId(t)===s2LaneId(tr)&&hasContent(t)).sort((x,y)=>(x.off||0)-(y.off||0));
  let at=(tr.off||0)+len; for(const m of mates){ const o=m.off||0, e=o+pSteps(m)*pLoops(m); if(o<at+len && e>at) at=e; } if(at+len>64*16) return null;
  const c=JSON.parse(JSON.stringify(tr,(k,v)=>k[0]==='_'?undefined:v)); c.id=S.nextId++; c.lane=s2LaneId(tr); c.off=at; c.len=pBars(tr); c.lenSet=true; c.rep=false; delete c.sid; delete c.sidAt; delete c.sidHeard; delete c.ed; c.copyOf=tr.id; c._dirty=true;
  if(tr._raw){ c._raw=tr._raw; storeVox(c); } S.tracks.push(c); if(S.bars<(at+len)/16) S.bars=Math.ceil((at+len)/16-1e-9); keyCache=null; save(); scheduleRender(); return c; }
function s2DeleteClip(tr){ const mates=S.tracks.filter(o=>o!==tr&&s2LaneId(o)===s2LaneId(tr)); s2.selId=null;
  if(mates.length){ if(tr.lane==null) mates.forEach(o=>{ o.lane=mates[0].id; }); s2.recPrev=0; deletePart(tr); }
  else { tr.blank=false; if(tr.notes) tr.notes=[]; if(tr.hits) tr.hits=[]; if(tr.fxs) tr.fxs=[]; delete tr.mfx; tr._mfxph=null; tr._an=null; tr._takes=null; if(tr._raw){ tr._raw=null; tr.va=null; takeStore.del('vox'+tr.id); } tr._dirty=true; keyCache=null; save(); renderTracks(); scheduleRender(); toast('Part deleted'); } }
function s2MixSheet(L){ const tr=L.tracks[0], nm=nxEsc(s2Name(L));
  nxSheet(`<input class="s2-tn" id="s2Tn" maxlength="32" value="${nxEsc(tr.name||'')}" placeholder="${nxEsc(s2Auto(L))}" aria-label="Track name (tap to rename)"><p style="color:var(--muted);font-size:14px;margin:0 0 10px">Effects on the whole song. Tap an empty spot in this track to add one.</p><button class="nx-act danger" data-a="del">Delete track</button>`);
  $('s2Tn').onchange=e=>{ const v=e.target.value.trim().slice(0,32)||undefined; S.tracks.forEach(t=>{ if(s2LaneId(t)===L.id) t.name=v; }); save(); renderTracks(); };
  $('nxSheet').onclick=e=>{ if(e.target.closest('[data-a="del"]')){ nxClose(); S.tracks=S.tracks.filter(t=>s2LaneId(t)!==L.id); s2.selId=null; save(); renderTracks(); } }; }
function s2TrackSheet(L){ if(L.tracks[0].inst==='mix') return s2MixSheet(L); const tr=L.tracks[0], all=()=>S.tracks.filter(t=>s2LaneId(t)===L.id), I=INST[tr.inst], nm=nxEsc(s2Name(L)), pit=I.kind==='pitched';
  const fam=pit?PICK_GROUPS[1][1]:I.kind==='audio'||I.kind==='mix'?[]:I.kind==='drum'?['kit',tr.inst]:[],   /* an old single-drum track can become a kit */ hasVoice=all().some(t=>t._raw&&(t._an||t.exprAlign!=null))&&tr.inst!=='arp';
  const dot=k=>`<i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${INST[k].color};margin-right:6px"></i>`;
  const preName=k=>{ const id=tr[k==='vox'?'vp':'kp'], x=id&&presetsAll()[k].find(y=>y.id===id); return x?x.name:null; };
  const menu=[(pit&&!CHORD_ZONE[tr.inst]||tr.inst==='vox')?['chords','Add chords to this melody']:null, tr.inst==='vox'?['save:vox','Save vocals as a preset']:null, (pit||I.kind==='drums'||I.kind==='drum')?['save:fx','Save effects as a preset']:null,
    tr.inst==='kit'?['save:kit','Save kit as a preset']:null, ['dup','Duplicate track']].filter(Boolean);   /* Delete track is its own red button next to ••• */
  nxSheet(`<div class="s2-hd"><input class="s2-tn" id="s2Tn" maxlength="32" value="${nxEsc(tr.name||'')}" placeholder="${nxEsc(s2Auto(L))}" aria-label="Track name (tap to rename)"><button class="s2-trash" data-a="del" aria-label="Delete track"><svg class="nx-ico" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button><button class="s2-dots" data-a="menu" aria-label="More actions" aria-expanded="false"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></button></div>
    <div class="s2-menu" id="s2Menu" hidden>${menu.map(([a,l])=>`<button data-a="${a}" class="${a==='del'?'danger':''}">${l}</button>`).join('')}</div>
    ${fam.length>1?`<button class="s2-row" data-pick="inst"><span>Instrument</span><b>${dot(tr.inst)}${nxEsc(I.label)}</b><svg class="nx-ico" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>`:''}
    ${I.sounds&&I.sounds.length?`<button class="s2-row" data-pick="sound"><span>${tr.inst==='kit'?'Kit':tr.inst==='vox'?'Style':'Sound'}</span><b>${nxEsc((tr.inst==='vox'||tr.inst==='kit')&&preName(tr.inst)||tr.sound)}${proLocked(tr.sound)?PRO_LOCK:''}</b><svg class="nx-ico" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>`:''}${tr._pvOrig&&'sound' in tr._pvOrig?pvLine('Previewing '+tr.sound):''}${tr.sound==='Your voice'&&S.yv&&S.yv.of>1?`<button class="nx-ghost" data-a="yvnext" style="width:100%;margin-top:10px">Try another moment · ${S.yv.rank+1} of ${S.yv.of}</button>`:''}
    ${tr.inst==='vox'?(()=>{ const fx=fxOf(tr); return `${s2Fld('s2Fx_tune','Pitch correction'+s2Inf('0 leaves your singing as it is. 100 is the hard-tuned sound.'),0,100,fx.tune)}${s2Fld('s2Fx_harm','Backing vocals'+s2Inf('Two more voices, above and below you.'+(isPro()?'':' Free to preview while this menu is open.'))+(isPro()?'':PRO_LOCK),0,100,fx.harm||0)}${tr._pvOrig&&'fx' in tr._pvOrig?pvLine('Previewing backing vocals'):''}`; })():''}
    ${s2Fld('s2Vol','Volume',0,100,tr.vol??80)}
    <button class="nx-more" data-more aria-expanded="${s2.more?'true':'false'}"><span>More settings<small>${tr.inst==='vox'?'Voice character, EQ, compression, echo, reverb':I.kind==='drums'?'Your kit, effects, tone, reverb':pit?'Chords, octave, effects, tone, reverb':'Tone, reverb, left / right'}</small></span><svg class="nx-ico" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>
    <div class="nx-adv" ${s2.more?'':'hidden'}>
    ${CHORD_ZONE[tr.inst]?`<div class="nx-grp" style="padding-top:0">Chord</div><select class="nx-txt" id="s2Chd" aria-label="Chord type" style="margin-bottom:12px">${Object.entries(CHORD_TYPES).map(([k,v])=>`<option value="${k}" ${k===chordType(tr)?'selected':''}>${v}</option>`).join('')}</select>`:''}
    ${tr.inst==='vox'?(()=>{ const fx=fxOf(tr), L={form:'Voice character',low:'Low cut',pres:'Presence',air:'Air',comp:'Compression',dbl:'Double',echo:'Echo'}; return `<div class="nx-grp" style="padding-top:6px">Voice</div>${VOX_KNOBS.filter(([k])=>k!=='tune').map(([k])=>s2Fld('s2Fx_'+k,L[k]||k,0,100,fx[k])).join('')}`; })():''}
    ${pit?`<div class="nx-grp" style="padding-top:6px">Notes</div><div class="s2-fld"><label>Octave</label><div class="s2-opts" style="padding:0"><button data-o="-1" aria-label="Octave down">−</button><output id="s2Oct" style="width:36px;text-align:center;align-self:center;font:700 15px var(--f-mono)">${tr.oct>0?'+':''}${tr.oct||0}</output><button data-o="1" aria-label="Octave up">+</button></div></div>
      ${hasVoice?s2Fld('s2Expr','Expression'+s2Inf('0 plays clean, steady notes. Turn it up to keep the slides, wobbles and swells of your take.'),0,100,tr.expr||0,10):''}`:''}
    <div class="nx-grp" style="padding-top:6px">Mix</div>${s2Fld('s2Rev','Reverb',0,100,tr.send??0)}${s2Fld('s2Pan','Left / right',-100,100,tr.pan??0)}${tr.inst==='vox'||tr.inst==='fx'?'':s2Fld('s2Tone',pit?'Brightness':'Tone',0,100,tr.tone??50)}
    ${(pit||I.kind==='drums'||I.kind==='drum')?`<div class="nx-grp" style="padding-top:6px">Effects${isPro()?'':s2Inf('Free to preview while this menu is open.')+PRO_LOCK}</div>${presetChips('fx',tr.fp)}${TFX.map(([k,l])=>s2Fld('s2Tfx_'+k,l,0,100,(tr.tfx&&tr.tfx[k])||0)).join('')}${tr._pvOrig&&'tfx' in tr._pvOrig?pvLine('Previewing effects'):''}`:''}
    ${tr.inst==='kit'?`<div class="nx-grp" style="padding-top:6px">Your kit${s2Inf('Take each drum from any kit. Save the result as a preset under •••.')}</div>${S.kit.slots.map(sl=>`<div class="s2-fld"><label for="kd_${nxEsc(sl.id)}">${nxEsc(slotLabel(sl.id))}</label><select class="nx-txt" id="kd_${nxEsc(sl.id)}" data-kd="${nxEsc(sl.id)}"><option value="">${nxEsc(tr.sound)} (this kit)</option>${DRUM_SOUNDS.filter(k=>k!==tr.sound).map(k=>`<option value="${k}" ${sl.kit===k?'selected':''}>${k}${proLocked(k)?' ✦':''}</option>`).join('')}</select></div>`).join('')}${S._pvOrig&&'kit' in S._pvOrig?pvLine('Previewing drums from another kit'):''}`:''}
    </div>
    `);
  const each=f=>all().forEach(f), rerender=()=>{ save(); scheduleRender(); };
  $('s2Tn').onchange=e=>{ const v=e.target.value.trim().slice(0,32)||undefined; each(t=>{ t.name=v; }); save(); renderTracks(); };
  $('nxSheet').onclick=e=>{ let b;
    if(b=e.target.closest('[data-info]')){ e.preventDefault(); infoPop(b); }
    else if(e.target.closest('[data-a="menu"]')){ const m=$('s2Menu'); m.hidden=!m.hidden; e.target.closest('[data-a="menu"]').setAttribute('aria-expanded',String(!m.hidden)); }
    else if(b=e.target.closest('[data-pick]')){ s2PickSheet(L,b.dataset.pick); }
    else if((b=e.target.closest('[data-a]'))&&b.dataset.a.startsWith('save:')){ if(b.dataset.a==='save:fx'&&!tfxOn(tr)) toast('Turn on an effect first (More settings, Effects).'); else s2SavePreset(L,b.dataset.a.slice(5)); }
    else if(b=e.target.closest('[data-pre]')){ const [k,id]=b.dataset.pre.split(':'), part=all().find(t=>t.id===s2.selId)||all().find(hasContent); presetApply(k,id,all(),part); s2TrackSheet(s2Lane(L.id)); }
    else if(b=e.target.closest('[data-pre-edit]')){ presetEditSheet(b.dataset.preEdit,()=>s2TrackSheet(s2Lane(L.id))); }
    else if(e.target.closest('[data-more]')){ s2.more=!s2.more; try{ localStorage.setItem('noodle.more',s2.more?'1':''); }catch(_){} const a=$('nxSheet').querySelector('.nx-adv'), m=$('nxSheet').querySelector('[data-more]'); a.hidden=!s2.more; m.setAttribute('aria-expanded',String(s2.more)); }
    else if(e.target.closest('[data-a="pvpro"]')){ proSheet(); }
    else if(b=e.target.closest('[data-o]')){ each(t=>{ t.oct=clamp((t.oct||0)+(+b.dataset.o),-3,3); t.octSet=true; t._dirty=true; }); $('s2Oct').textContent=(tr.oct>0?'+':'')+tr.oct; rerender(); renderTracks(); }
    else if((b=e.target.closest('[data-a]')) && b.dataset.a==='yvnext'){ const r=(S.yv.rank||0)+1; if(yvCapture(r)){ S.tracks.forEach(t=>{ if(t.sound==='Your voice') t._dirty=true; }); rerender(); s2TrackSheet(s2Lane(L.id)); } }   /* the next steadiest moment of your singing */
    else if((b=e.target.closest('[data-a]')) && b.dataset.a==='chords'){ chordSheet(L); }
    else if((b=e.target.closest('[data-a]')) && b.dataset.a==='dup'){ nxClose(); const nl=s2DupTrack(L); if(nl){ s2.selId=null; renderTracks(); setTimeout(()=>s2TrackSheet(s2Lane(nl)),80); toast('Track duplicated. Pick its instrument, e.g. Keys or Pad for chords.'); } }
    else if((b=e.target.closest('[data-a]'))&&b.dataset.a==='del'){ nxClose(); const ms=all(); ms.slice(1).forEach(t=>{ disposeTrack(t); }); S.tracks=S.tracks.filter(t=>!ms.slice(1).includes(t)); deletePart(ms[0]); } };
  $('nxSheet').oninput=e=>{ const id=e.target.id, v=+e.target.value;
    if(id==='s2Vol'){ each(t=>{ t.vol=v; }); applyAllMix(); save(); } if(id==='s2Rev'){ each(t=>{ t.send=v; }); applyAllMix(); save(); } if(id==='s2Pan'){ each(t=>{ t.pan=v; }); applyAllMix(); save(); } };
  $('nxSheet').onchange=e=>{ const id=e.target.id, v=e.target.value;
    if(id==='s2Tone'){ each(t=>{ t.tone=+v; t._dirty=true; }); rerender(); }
    if(id.startsWith('s2Tfx_')){ const k=id.slice(6);
      if(!isPro()){ const part=all().find(t=>t.id===s2.selId)||all().find(hasContent); each(t=>{ const f=Object.assign({},t.tfx,{[k]:+v}); pvTry(t,{tfx:TFX.some(([q])=>f[q]>0)?f:undefined},'Track effects',part); }); if(!$('nxSheet').querySelector('.pv-line')) s2TrackSheet(s2Lane(L.id)); return; }
      each(t=>{ t.tfx=Object.assign({},t.tfx,{[k]:+v}); if(!tfxOn(t)) delete t.tfx; t._dirty=true; }); rerender(); }
    if(id==='s2Fx_harm' && !isPro()){ const part=all().find(t=>t.id===s2.selId)||all().find(hasContent); each(t=>pvTry(t,{fx:Object.assign({},fxOf(t),{harm:+v})},'Backing vocals',part)); if(!$('nxSheet').querySelector('.pv-line')) s2TrackSheet(s2Lane(L.id)); return; }
    if(id.startsWith('s2Fx_')||id.startsWith('s2Tfx_')) each(t=>{ delete t[id.startsWith('s2Tfx_')?'fp':'vp']; });
    if(id.startsWith('s2Fx_')){ const k=id.slice(5); each(t=>{ if(t._pvOrig&&t._pvOrig.fx) t._pvOrig.fx[k]=+v; /* a free knob moved while trying backing vocals: keep it */ t.fx=Object.assign(fxOf(t),{[k]:+v}); t._tuned=null; t._dirty=true; }); rerender(); }
    if(e.target.dataset&&e.target.dataset.kd){ const sid=e.target.dataset.kd, k=v||undefined, part=all().find(t=>t.id===s2.selId)||all().find(hasContent);
      if(k&&proLocked(k)){ if(!S._pvOrig) S._pvOrig={}; if(!('kit' in S._pvOrig)) S._pvOrig.kit=copyJ(S.kit); pvOpen(k+' drums',part); }
      const sl=S.kit.slots.find(x=>x.id===sid); if(sl){ if(k) sl.kit=k; else delete sl.kit; } each(t=>{ delete t.kp; }); S.tracks.forEach(t=>{ if(t.hits) t._dirty=true; }); warmSounds(); rerender(); s2TrackSheet(s2Lane(L.id)); return; }
    if(id==='s2Chd'){ each(t=>{ t.chordType=v; delete t.chords; t._dirty=true; }); if(autoOct(tr)) $('s2Oct').textContent=(tr.oct>0?'+':'')+tr.oct; rerender(); renderTracks(); }
    if(id==='s2Expr'){ each(t=>{ t.expr=+v; if(t.expr>0&&t._raw){ if(t._an) t.exprAlign=t._an.align; storeVox(t); } t._dirty=true; }); rerender(); } }; }
/* the line under something being tried: what it is, and a way to get Pro */
/* the ⓘ's text pops out next to it (below, or above when near the bottom); a tap anywhere closes it */
function infoPop(btn){ document.querySelectorAll('.info-pop').forEach(x=>x.remove()); const r=btn.getBoundingClientRect(), d=document.createElement('div'); d.className='info-pop'; d.setAttribute('role','tooltip'); d.textContent=btn.dataset.info;
  document.body.appendChild(d); const W=Math.min(300,window.innerWidth-24), h=(d.style.width=W+'px',d.offsetHeight), below=r.bottom+10+h<window.innerHeight-90, left=Math.max(12,Math.min(window.innerWidth-W-12,r.left+r.width/2-W/2));
  d.style.left=left+'px'; d.style.top=(below?r.bottom+10:r.top-10-h)+'px'; d.classList.add(below?'below':'above'); d.style.setProperty('--ax',(r.left+r.width/2-left)+'px');
  const close=e=>{ if(e&&e.target===btn) return; d.remove(); document.removeEventListener('pointerdown',close,true); }; setTimeout(()=>document.addEventListener('pointerdown',close,true),0); setTimeout(close,9000); }
/* a small ⓘ that shows its text when tapped (instead of a sentence under every control) */
const s2Inf=t=>`<button class="s2-i" data-info="${nxEsc(t)}" aria-label="About this" type="button">i</button>`;
/* a list to pick from (same look as Sound ›): stays open so each choice can be heard; Done or ‹ goes back */
function nxList(title, groups, cur, pick, back){ const tick='<svg class="nx-ico pk-ok" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>';
  nxSheet(`<div class="pk-head"><button class="pk-back" data-done aria-label="Back"><svg class="nx-ico" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><h2>${nxEsc(title)}</h2><button class="pk-done" data-done>Done</button></div>`
    +groups.filter(g=>g[1].length).map(([g,xs])=>`${g?`<div class="s2-sg">${nxEsc(g)}</div>`:''}<div class="pk-list">${xs.map(([v,l])=>`<button class="pk-row" data-v="${nxEsc(v)}" aria-pressed="${v===cur}"><span>${nxEsc(l)}</span>${v===cur?tick:''}</button>`).join('')}</div>`).join(''));
  $('nxSheet').onclick=e=>{ if(e.target.closest('[data-done]')){ back(); return; } const b=e.target.closest('[data-v]'); if(!b) return; const y=$('nxSheet').scrollTop; pick(b.dataset.v); nxList(title,groups,b.dataset.v,pick,back); $('nxSheet').scrollTop=y; }; }
/* save the lane's vocal style, effects or kit as one of "Mine" */
function s2SavePreset(L,k){ const all=S.tracks.filter(t=>s2LaneId(t)===L.id), tr=all[0], back=()=>s2TrackSheet(s2Lane(L.id));
  presetNameSheet(k==='vox'?'Save vocals as a preset':k==='fx'?'Save effects as a preset':'Save kit as a preset', presetNextName(k,k==='vox'?'My voice':k==='fx'?'My effects':'My kit'), name=>{
    const x=presetPut(k,name,k==='vox'?{sound:tr.sound,fx:copyJ(fxOf(tr))}:k==='fx'?{tfx:copyJ(tr.tfx)}:kitPresetData(tr)); all.forEach(t=>{ t[k==='vox'?'vp':k==='fx'?'fp':'kp']=x.id; }); save(); back(); toast(`Saved “${name}”. It’s under Mine in every song.`); }); }
/* the list behind "Sound ›" / "Instrument ›": stays open so you can tap through and hear each one on your part (it loops while the list is open) */
function s2PickSheet(L, kind){ const all=()=>S.tracks.filter(t=>s2LaneId(t)===L.id), tr=all()[0], I=INST[tr.inst], part=all().find(t=>t.id===s2.selId)||all().find(hasContent);
  const hear=()=>{ if(!part) return; if(!proPv) proPv={labels:[]}; pvPlay(part); };   /* free choices: hear them too (stops when the menu closes) */
  const tick='<svg class="nx-ico pk-ok" viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>';
  const row=(attr,label,on,extra='')=>`<button class="pk-row" ${attr} aria-pressed="${on}"><span>${label}</span>${extra}${on?tick:''}</button>`;
  let body='';
  if(kind==='inst'){ const fam=INST[tr.inst].kind==='pitched'?PICK_GROUPS[1][1]:['kit',tr.inst];
    body=`<div class="pk-list" id="s2Ins">${fam.map(k=>row(`data-k="${k}"`,`<i class="pk-dot" style="background:${INST[k].color}"></i>${INST[k].label}`,k===tr.inst)).join('')}</div>`; }
  else { const pk=tr.inst==='vox'?'vox':tr.inst==='kit'?'kit':null, mine=pk?presetsAll()[pk]:[], cur=pk?tr[pk==='vox'?'vp':'kp']:null;
    body=(mine.length?`<div class="s2-sg">Mine <button class="pr-edit" data-pre-edit="${pk}">Edit</button></div><div class="pk-list">${mine.map(x=>row(`data-pre="${pk}:${x.id}"`,nxEsc(x.name),x.id===cur,presetPro(pk,x)?PRO_LOCK:'')).join('')}</div>`:'')
      +soundGroups(I.sounds).map(([g,xs])=>`${g?`<div class="s2-sg">${g}</div>`:''}<div class="pk-list">${xs.map(x=>row(`data-x="${nxEsc(x)}"`,nxEsc(x),!cur&&x===tr.sound,proLocked(x)?PRO_LOCK:'')).join('')}</div>`).join('');
    const pv=tr._pvOrig&&('sound' in tr._pvOrig)?pvLine('Previewing '+tr.sound):S._pvOrig&&('kit' in S._pvOrig)?pvLine('Previewing drums from another kit'):''; body=pv+`<div id="s2Snd">${body}</div>`; }
  nxSheet(`<div class="pk-head"><button class="pk-back" data-done aria-label="Back"><svg class="nx-ico" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><h2>${kind==='inst'?'Instrument':tr.inst==='kit'?'Kit':tr.inst==='vox'?'Vocal style':'Sound'}</h2><button class="pk-done" data-done>Done</button></div>${body}`);
  const again=()=>{ const y=$('nxSheet').scrollTop; s2PickSheet(s2Lane(L.id)||L,kind); $('nxSheet').scrollTop=y; };
  $('nxSheet').onclick=e=>{ let b;
    if(e.target.closest('[data-done]')){ s2TrackSheet(s2Lane(L.id)); return; }
    if(e.target.closest('[data-a="pvpro"]')){ proSheet(); return; }
    if(b=e.target.closest('[data-pre-edit]')){ presetEditSheet(b.dataset.preEdit,again); return; }
    if(b=e.target.closest('[data-k]')){ const k=b.dataset.k; all().forEach(t=>changeInst(t,k)); keyCache=null; save(); renderTracks(); scheduleRender(); hear(); again(); return; }
    if(b=e.target.closest('[data-pre]')){ const [k,id]=b.dataset.pre.split(':'); all().forEach(t=>{ t.picked=true; }); presetApply(k,id,all(),part); hear(); again(); return; }
    if(!(b=e.target.closest('[data-x]'))) return; const x=b.dataset.x;
    all().forEach(t=>{ t.picked=true; });   /* the track's name follows the sound from now on (unless you typed one) */
    if(proLocked(x)){ all().forEach(t=>pvTry(t, t.inst==='vox'?{sound:x, fx:Object.assign({},VOX_PRESETS[x]||VOX_PRESETS.Pop,t.fx&&t.fx.harm?{harm:t.fx.harm}:{})}:{sound:x}, x, part)); }   /* a Pro sound: try it on this part */
    else { all().forEach(t=>{ pvForget(t,['sound','fx']); t.sound=x; delete t.vp; delete t.kp; if(t.inst==='vox') t.fx=Object.assign({},VOX_PRESETS[t.sound],t.fx&&t.fx.harm?{harm:t.fx.harm}:{}); t._dirty=true; }); save(); scheduleRender(); hear(); }
    warmSounds(); if(x==='Your voice' && !S.yv && !yvCapture()) toast('Sing a take first: Your voice is made from it. Until then it plays Choir.'); again(); }; }
const pvLine=what=>`<div class="pv-line">${PRO_LOCK}<span>${nxEsc(what)}. Add to your song with Pro.</span><button data-a="pvpro">Get Pro</button></div>`;
/* ---- Chords from your melody: a new chord track under the melody, one chord per bar or half bar (harmonize in key.js) ---- */
const CHORD_STYLES={pad:{label:'Pad',inst:'pad',sound:'Warm pad'}, piano:{label:'Piano',inst:'keys',sound:'Piano'}, pulse:{label:'Pulse',inst:'keys',sound:'E-piano',pro:true}, arp:{label:'Arp',inst:'arp',sound:'Pluck',pro:true}};
function melodyNotes(t){ if(t.inst==='vox') return (t.vn||[]).map(v=>({s:Math.round(v.t/stepDur()), l:Math.max(1,Math.round(v.l/stepDur())), p:v.p}));
  return (t.notes||[]).filter(n=>n.s>=0&&n.s<pSteps(t)).map(n=>({s:n.s,l:n.l,p:pitchOf(n)})); }
function chordSheet(L){ const melody=S.tracks.filter(t=>s2LaneId(t)===L.id&&melodyNotes(t).length); if(!melody.length){ toast('Record or draw a melody first: the chords are made to fit it.'); return; }
  if(currentKey().none){ toast('Pick a key first (KEY at the top): chords come from the key.'); return; }
  let style=S.chordStyle&&CHORD_STYLES[S.chordStyle]&&(!CHORD_STYLES[S.chordStyle].pro||isPro())?S.chordStyle:'pad', per=S.chordPer||16;   /* (melody: the parts the chords are made for) */
  const draw=()=>nxSheet(`<h2>Chords from your melody</h2>
    <div class="nx-grp" style="padding-top:0">Style</div><div class="s2-opts" id="chSt">${Object.entries(CHORD_STYLES).map(([k,v])=>`<button data-k="${k}" aria-pressed="${k===style}">${v.label}${v.pro&&!isPro()?PRO_LOCK:''}</button>`).join('')}</div>${CHORD_STYLES[style].pro&&!isPro()?pvLine('Previewing '+CHORD_STYLES[style].label+' chords'):''}
    <div class="nx-grp">Chords change</div><div class="s2-opts" id="chPer"><button data-p="16" aria-pressed="${per===16}">Every bar</button><button data-p="8" aria-pressed="${per===8}">Every half bar</button></div>
    <button class="nx-primary" id="chGo" style="margin-top:16px">Add chords</button>`);
  draw();
  $('nxSheet').onclick=e=>{ let b;
    const trying=()=>CHORD_STYLES[style].pro&&!isPro(), tryIt=()=>{ pvEnd(true); const r=addChords(L,style,per,true); if(r) pvOpen(CHORD_STYLES[style].label+' chords', melody.find(t=>t.id===s2.selId)||melody[0]); };
    if(e.target.closest('[data-a="pvpro"]')){ proSheet(); }
    else if(b=e.target.closest('#chSt button')){ style=b.dataset.k; if(trying()) tryIt(); else pvEnd(true); draw(); }   /* Pulse and Arp (Pro): hear them on your song first */
    else if(b=e.target.closest('#chPer button')){ per=+b.dataset.p; if(trying()) tryIt(); draw(); }
    else if(e.target.closest('#chGo')&&trying()){ proSheet('Pulse and Arp chords are part of Noodle Pro.'); }
    else if(e.target.closest('#chGo')){ pvEnd(true); S.chordStyle=style; S.chordPer=per; const r=addChords(L,style,per); nxClose(); if(r) toast('Chords added: '+r.names.join(' · ')+(r.more?' …':'')+'. Tap the track to change its sound.',6000); } }; }
function addChords(L,style,per,temp){   /* temp: only to try a Pro style (never saved) */ const K=currentKey(), st=CHORD_STYLES[style], melody=S.tracks.filter(t=>s2LaneId(t)===L.id&&melodyNotes(t).length); if(!melody.length||K.none) return null;
  flushSave(); const made=[], names=[]; let laneId=null;
  for(const m of melody){ const steps=pSteps(m), ch=harmonize(melodyNotes(m),K,steps,per); if(!ch) return null;
    let notes=ch.map(c=>({s:c.s,l:c.l,p:c.root,v:0.72,x:true}));
    if(style==='pulse') notes=notes.flatMap(n=>{ const o=[]; for(let s=n.s;s<n.s+n.l;s+=4) o.push({s,l:Math.min(3,n.s+n.l-s),p:n.p,v:s%16===0?0.8:0.62,x:true}); return o; });
    const t=mkTrack(st.inst,{id:S.nextId++, off:m.off||0, len:m.len, lenSet:true, rep:m.rep, notes, sound:st.sound, vol:style==='pad'?62:66, send:30, name:'Chords'}); if(temp) t._pvTemp=true;
    if(laneId==null){ laneId=t.id; delete t.lane; } else t.lane=laneId; made.push(t);
    ch.forEach(c=>{ const nm=chordName(chordTones(c.root,chordType(t))); if(names[names.length-1]!==nm) names.push(nm); }); }
  const at=Math.max(...S.tracks.filter(t=>s2LaneId(t)===L.id).map(t=>S.tracks.indexOf(t)))+1; S.tracks.splice(at,0,...made); made.forEach(t=>autoOct(t));
  warmSounds(); keyCache=null; if(!temp) save(); renderTracks(); scheduleRender(); return {names:names.slice(0,8), more:names.length>8}; }
/* ---- Song sections: name stretches of bars (Intro, Verse, Chorus...), then duplicate one (every part in it is copied right after it and
   the rest of the song moves later), loop it, or remove the name. Kept as S.secs [{a,b,name}] in bars (b not included). ---- */
const SEC_NAMES=['Intro','Verse','Chorus','Bridge','Outro'];
function secsTidy(){ S.secs=(S.secs||[]).filter(x=>x.a<x.b&&x.a<S.bars).sort((x,y)=>x.a-y.a); }
function secSheet(){ secsTidy(); const secs=S.secs;
  nxSheet(`<h2>Sections</h2>${secs.length?`<div class="sec-list">${secs.map((x,i)=>`<div class="sec-row"><div><b>${nxEsc(x.name)}</b><small>${x.b-x.a>1?`Bars ${x.a+1}–${x.b}`:`Bar ${x.a+1}`}</small></div><button data-dup="${i}">Duplicate</button><button data-loop="${i}" aria-label="Loop ${nxEsc(x.name)}">Loop</button><button class="del" data-rm="${i}" aria-label="Remove the name ${nxEsc(x.name)}">✕</button></div>`).join('')}</div>`:'<p style="color:var(--muted);font-size:15px;margin:-4px 0 10px">Name parts of your song (Verse, Chorus…) to loop and duplicate them.</p>'}
    <button class="nx-primary" id="secMark" style="margin-top:12px">Mark a section</button>`);
  $('nxSheet').onclick=e=>{ let b;
    if(e.target.closest('#secMark')){ secMarkStart(); }
    else if(b=e.target.closest('[data-rm]')){ flushSave(); secs.splice(+b.dataset.rm,1); save(); s2Render(); secSheet(); }
    else if(b=e.target.closest('[data-loop]')){ const x=secs[+b.dataset.loop]; nxClose(); s2.sec={a:x.a*16,b:x.b*16,id:null}; s2.loop=true; $('s2Loop').setAttribute('aria-pressed','true'); s2Render(); toast('Looping '+x.name+'. Tap the yellow band to stop.'); }
    else if(b=e.target.closest('[data-dup]')){ const x=secs[+b.dataset.dup]; if(secDuplicate(x)){ nxClose(); toast(x.name+' duplicated: bars '+(x.b+1)+'–'+(2*x.b-x.a)+'.'); } } }; }
function secDuplicate(sec){ const n=sec.b-sec.a, a=sec.a*16, b=sec.b*16, L=n*16; if(S.bars+n>64){ toast('Songs can be up to 64 bars.'); return false; }
  flushSave(); const add=[];
  for(const t of S.tracks.slice()){ if(t.guide) continue; const o=t.off||0;
    if(o>=b){ t.off=o+L; t._dirty=true; continue; }
    if(o<a || pLoops(t)>1) continue;   /* parts from before the section, and parts that loop to the end, play on through the longer song */
    const c=JSON.parse(JSON.stringify(t,(k,v)=>k[0]==='_'?undefined:v)); c.id=S.nextId++; c.lane=s2LaneId(t); c.off=o+L; c.len=pBars(t); c.lenSet=true; c.rep=false;
    delete c.sid; delete c.sidAt; delete c.sidHeard; delete c.ed; c.copyOf=t.id; c._dirty=true; if(t._raw){ c._raw=t._raw; storeVox(c); } add.push(c); }
  S.bars+=n; S.tracks.push(...add); S.tracks.forEach(t=>{ if(pLoops(t)>1) t._dirty=true; });
  S.secs=(S.secs||[]).map(x=>x.a>=sec.b?{...x,a:x.a+n,b:x.b+n}:x).concat([{a:sec.b,b:sec.b+n,name:sec.name}]); secsTidy();
  keyCache=null; save(); renderTracks(); scheduleRender(); return true; }
function s2Sheets(kind){ $('nxSheet').oninput=null;
  if(kind==='tempo'){ nxSheet(`<h2>Tempo</h2>${s2Fld('s2T','Tempo',60,180,S.bpm)}<button class="mfx-btn" id="s2Tap" style="width:100%;margin:2px 0 12px">Tap the beat</button><label class="nx-chk" style="font-weight:400;font-size:15px"><input type="checkbox" id="s2Arp" ${S.keyRef?'checked':''}> <span>Count-in chord</span>${s2Inf('During the count-in, Noodle plays the song’s home chord, one note a beat, so you start in key.')}</label>`);
    $('s2T').onchange=e=>setTempo(+e.target.value);
    { const taps=[]; $('s2Tap').onclick=e=>{ const now=performance.now(); if(taps.length && now-taps[taps.length-1]>2000) taps.length=0; taps.push(now); if(taps.length>8) taps.shift();   /* the last 8 taps; a pause of 2 s starts over */
        if(taps.length<3){ e.currentTarget.textContent=taps.length===1?'Keep tapping…':'One more…'; return; }
        const gaps=taps.slice(1).map((t,i)=>t-taps[i]).sort((a,b)=>a-b), bpm=clamp(Math.round(60000/gaps[gaps.length>>1]),60,180); setTempo(bpm); $('s2T').value=bpm; $('s2T').nextElementSibling.value=bpm; e.currentTarget.textContent=`${bpm} BPM · keep tapping`; }; } $('s2Arp').onchange=e=>{ S.keyRef=e.target.checked; save(); }; $('nxSheet').onclick=null; }
  if(kind==='key'){ const opts=[...SCALE_OPTS.matchAll(/value="([^"]+)">([^<]+)</g)].map(m=>[m[1],m[2]]), scl=v=>(opts.find(o=>o[0]===v)||['',v])[1], kname=v=>v==='auto'?'Auto-detect':NOTE_NAMES[+v];
    const row=(k,l,v)=>`<button class="s2-row" data-pick="${k}"><span>${l}</span><b>${nxEsc(v)}</b></button>`;
    nxSheet(`<h2>Key</h2>${row('key','Key',kname(S.key))}${row('scale','Scale',scl(S.scale))}`);
    $('nxSheet').onclick=e=>{ const b=e.target.closest('[data-pick]'); if(!b) return; const back=()=>s2Sheets('key');
      if(b.dataset.pick==='key') nxList('Key',[['',[['auto','Auto-detect'],...NOTE_NAMES.map((n,i)=>[String(i),n])]]],String(S.key),v=>{ setKey(v); if(v!=='auto') toast('The whole song moved to '+NOTE_NAMES[+v]+'. Drums stay as they are.'); },back);
      else nxList('Scale',[['',opts.filter(o=>['auto','major','minor','pent-minor','pent-major','blues'].includes(o[0]))],['More scales',opts.filter(o=>!['auto','major','minor','pent-minor','pent-major','blues'].includes(o[0]))]],S.scale,v=>setScale(v),back); }; }
  if(kind==='mix'){ nxSheet(`<h2>Mix</h2>${s2Fld('s2Mv','Master volume',0,100,S.master.vol)}${s2Fld('s2Mr','Reverb'+s2Inf('How much room sound the whole song has. Each track has its own amount under More settings.'),0,100,S.master.rev)}${s2Fld('s2Md','Drive'+s2Inf('Warm distortion on the whole mix. A little makes it fuller; a lot makes it gritty.'),0,100,S.master.drive)}${s2Fld('s2Mp','Punch'+s2Inf('Evens out loud and quiet moments so the song hits harder and sounds louder.'),0,100,S.master.punch)}`);
    [['s2Mv','vol'],['s2Mr','rev'],['s2Md','drive'],['s2Mp','punch']].forEach(([id,k])=>{ $(id).oninput=e=>setMaster(k,e.target.value); }); $('nxSheet').onclick=null; }
  if(kind==='name'){ nxSheet(`<h2>Rename</h2><input class="nx-txt" id="s2Rn" maxlength="60" value="${nxEsc(S.title||'')}" placeholder="Untitled" aria-label="Song name"><button class="nx-primary" id="s2RnOk">Save</button>`); $('nxSheet').onclick=null;
    const ok=()=>{ S.title=$('s2Rn').value.trim(); save(); nxClose(); s2Render(); }; $('s2RnOk').onclick=ok; $('s2Rn').onkeydown=e=>{ if(e.key==='Enter') ok(); }; $('s2Rn').focus(); } }
function s2Init(){ const _rt=renderTracks; renderTracks=function(){ warmSounds(); if(s2.post && !recState && rs.mode==null){ s2.post=false; try{ s2Tidy(); }catch(e){} }
    /* the old part rows are no longer built (they were never shown) */ if(s2On()){ if(s2.edId!=null) s2EdMount(); else s2Render(); } };
  const _rd=redrawTrack; redrawTrack=function(tr){ _rd.apply(this,arguments); if(s2On()){ const L=s2Lane(s2LaneId(tr)), cv=L&&$('s2In').querySelector(`canvas[data-cv="${L.id}"]`); if(cv) s2DrawLane(L,cv); } };
  $('s2EdBack').onclick=s2EdClose; $('s2EdUndo').onclick=()=>undo(); $('s2EdRedo').onclick=()=>redo(); $('s2EdPlay').onclick=()=>togglePlay();
  $('s2EdRew').onclick=()=>{ if(recState) return; const t=S.tracks.find(x=>x.id===s2.edId), L=loopLen(), at=t?Math.min((t.off||0)*stepDur(),L-0.001):0; playFrom=at; s2.cur=at/L*S.bars; if(playing&&ctx) startAll(ctx.currentTime+0.02,at); };
  $('s2EdFill').onclick=()=>{ const tr=S.tracks.find(t=>t.id===s2.edId); if(tr) fillGaps(tr); };
  $('s2EdVer').onclick=()=>{ const tr=S.tracks.find(t=>t.id===s2.edId); if(!tr) return; verNext(tr); };
  $('s2EdMine').onclick=()=>{ const tr=S.tracks.find(t=>t.id===s2.edId); if(tr) verMine(tr); };
  $('s2EdVerI').onclick=()=>nxSheet(`<h2>Another version</h2><p style="font-size:15px;margin:0 0 10px">Noodle hears your take more than one way. Each tap plays the next way it could go.</p><p style="font-size:15px;margin:0 0 6px"><b>Mine</b> brings back your notes, with your own edits.</p>`);
  $('s2CbEdit').onclick=()=>{ const t=S.tracks.find(x=>x.id===s2.selId); if(t) s2Edit(t); };
  $('s2CbDup').onclick=()=>{ const t=S.tracks.find(x=>x.id===s2.selId); if(!t) return; const c=s2DupClip(t); if(c){ s2.selId=c.id; renderTracks(); const tl=$('s2Tl'), x0=(c.off/16)*s2.barw, x1=x0+pBars(c)*s2.barw, hw=parseFloat(getComputedStyle($('s2')).getPropertyValue('--s2-hdr')); if(x1>tl.scrollLeft+tl.clientWidth-hw-12) tl.scrollLeft=Math.max(0,x1-(tl.clientWidth-hw)+24); else if(x0<tl.scrollLeft) tl.scrollLeft=Math.max(0,x0-12); } else toast('No room for a copy'); };
  $('s2CbCopy').onclick=()=>{ const t=S.tracks.find(x=>x.id===s2.selId); if(t) partCopy(t); };
  $('s2CbNew').onclick=s2NewPart; $('s2CbDel').onclick=()=>{ const t=S.tracks.find(x=>x.id===s2.selId); if(t) s2DeleteClip(t); };
  $('s2Back').onclick=()=>nxGo('projects'); $('s2Name').onclick=()=>s2Sheets('name'); $('s2Undo').onclick=()=>undo(); $('s2Redo').onclick=()=>redo();
  $('s2MkX').onclick=secMarkEnd; $('s2MkOk').onclick=secMarkDone; $('s2MkN').onclick=e=>{ const b=e.target.closest('[data-mkn]'); if(b&&s2.mark){ s2.mark.name=b.dataset.mkn; s2MarkDraw(); } };
  $('s2Share').onclick=s2ShareSheet; $('s2Bpm').onclick=()=>s2Sheets('tempo'); $('s2Key').onclick=()=>s2Sheets('key'); $('s2Snap').onclick=()=>{ const i=SNAPS.indexOf(snapBars()); S.snap=SNAPS[(i+1)%SNAPS.length]; save(); s2Chips(); toast(`Parts move and trim by ${S.snap===1?'1 bar':fracTxt(S.snap)+' bar'}.`); }; $('s2Mix').onclick=()=>s2Sheets('mix');
  $('s2Play').onclick=()=>togglePlay(); $('s2RecB').onclick=s2Record; $('s2Metro').onclick=toggleMetro;
  $('s2Rew').onclick=()=>{ if(recState) return; playFrom=0; s2.cur=0; $('s2Tl').scrollLeft=0; if(playing&&ctx) startAll(ctx.currentTime+0.02,0); };
  /* one loop button: with a part selected it loops that part, with nothing selected the whole song; tapping it again turns looping off */
  $('s2Loop').onclick=()=>{ const t=S.tracks.find(x=>x.id===s2.selId&&hasContent(x));
    if(t&&!(s2.loop&&s2.sec&&s2.sec.id===t.id)){ const was=s2.sec; s2SecSet(t); if(s2.sec!==was) return; }   /* (a part shorter than a beat can't be looped on its own) */
    s2.loop=!s2.loop; $('s2Loop').setAttribute('aria-pressed',String(s2.loop)); s2.sec=null; s2Render(); toast(s2.loop?'Looping the whole song':'Loop off'); };
  $('s2TkOk').onclick=()=>{ takeBar=null; renderTracks(); setTimeout(shareAsk,350); };   /* the first kept take: ask about sharing takes (once) */
  const gone=p=>{ try{ const t=S.tracks.find(x=>x.id===p.id); if(drop&&t&&t.sid) dropPost({sid:t.sid, meta:{...dropMeta(t), discarded:true}}); }catch(e){} };   /* a thrown-away take is worth knowing about */
  $('s2TkDel').onclick=async()=>{ const p=takeBar, pb=p.prevBars; gone(p); takeBar=null; await discardTake(p); s2.recPrev=pb||0; s2.recId=null; s2Tidy(); renderTracks(); toast('Take discarded'); };
  $('s2TkRe').onclick=async()=>{ const p=takeBar; gone(p); takeBar=null; flushSave(); const snap=hist.cur; await discardTake(p); const t=S.tracks.find(x=>x.id===p.id); s2.recId=p.id; s2.recPrev=p.prevBars||S.bars; s2.recLen=t&&t.off!=null?t.len:0; s2.post=true; recordInto(p.id,{snap,bar:p}); };
  $('s2In').onclick=e=>{ const g=k=>e.target.closest(`[data-${k}]`), T=id=>S.tracks.find(t=>String(t.id)===id); let b;
    if(e.target.closest('#s2Secs')){ if(!s2.mark) secSheet(); return; }
    if(e.target.closest('#s2Beat')){ beatSheet(); return; }
    if(g('secx')){ if(s2.sec) s2SecClear(); else { s2.loop=false; $('s2Loop').setAttribute('aria-pressed','false'); s2Render(); toast('Loop off'); } return; }   /* a part or section's band: back to the whole song; the whole song's band: loop off */
    if(b=g('arm')){ const L=s2Lane(b.dataset.arm); s2.armId=String(s2.armId)===String(L.id)?null:L.id; if(s2.armId!=null){ S.activeId=L.tracks[0].id; } s2Render(); }
    else if(b=g('m')){ const L=s2Lane(b.dataset.m), v=!L.tracks[0].mute; L.tracks.forEach(t=>{ t.mute=v; }); save(); applyAllMix(); s2Render(); }
    else if(b=g('s')){ const L=s2Lane(b.dataset.s), v=!L.tracks[0].solo; L.tracks.forEach(t=>{ t.solo=v; }); save(); applyAllMix(); s2Render(); }
    else if(b=g('t')) s2TrackSheet(s2Lane(b.dataset.t));
    else if(b=g('ln')){ if(recState || Date.now()-(s2.noTap||0)<400) return; const L=s2Lane(b.dataset.ln), st=(e.clientX-b.getBoundingClientRect().left)/s2.barw*16, t=L.tracks.find(t=>hasContent(t)&&st>=(t.off||0)&&st<(t.off||0)+pSteps(t)*pLoops(t)); const had=s2.selId!=null; s2.selId=t?t.id:null;
      { const at=Math.floor(st/(16*snapBars()))*Math.round(16*snapBars()), same=s2.empty&&String(s2.empty.lane)===String(L.id)&&s2.empty.at===at;
        s2.empty = !t && !had && !same && L.tracks[0].inst!=='vox' && !L.tracks[0].guide ? {lane:L.id, at} : null; } s2Render(); }   /* an empty spot: offer a new part there (tap it again, or anywhere else, to dismiss; a tap that only deselects doesn't offer) */
    else if(e.target.id==='s2Add') s2AddSheet(false);
    else if(!e.target.closest('button,.s2-th,.s2-ruler,.s2-sel')&&(s2.selId!=null||s2.empty)){ s2.selId=null; s2.empty=null; s2Render(); } };   /* the empty space under the tracks: deselect */
  { const T=$('s2In'); let g=null;
    T.addEventListener('pointerdown',e=>{ const sel=e.target.closest('.s2-sel'); if(!sel||recState) return; const tr=S.tracks.find(x=>x.id===s2.selId); if(!tr) return; e.stopPropagation();
      g={tr,sel,x0:e.clientX,mode:e.target.classList.contains('hl')?'l':e.target.classList.contains('hr')?'r':'m',off:(tr.off||0)/16,len:pBars(tr)*pLoops(tr),d:0}; s2.drag=true; try{ sel.setPointerCapture(e.pointerId); }catch(_){} },true);
    T.addEventListener('pointermove',e=>{ if(!g) return; const G=snapBars(); let d=Math.round((e.clientX-g.x0)/s2.barw/G)*G; if(g.mode==='m') d=Math.max(-g.off,d); if(g.mode==='l') d=Math.min(g.len-G,Math.max(-g.off,d)); if(g.mode==='r') d=Math.max(G-g.len,d); d=+d.toFixed(4); g.d=d;
      const o=g.off+(g.mode==='r'?0:d), w=g.len+(g.mode==='r'?d:g.mode==='l'?-d:0); g.sel.style.left=`calc(${o} * var(--s2-barw))`; g.sel.style.width=`calc(${w} * var(--s2-barw))`; },true);
    const fin=e=>{ if(!g) return; const q=g; g=null; s2.drag=false; s2.noTap=Date.now(); let ok=true;
      if(q.d){ ok = q.mode==='m' ? s2MoveClip(q.tr,q.d) : q.mode==='l' ? s2ResizeClip(q.tr,q.d,0) : s2ResizeClip(q.tr,0,q.d); if(!ok) toast('No room there'); else haptic('light'); }
      else if(q.mode==='m' && e.type==='pointerup' && q.tr.inst!=='vox'){ renderTracks(); s2Edit(q.tr); return; }   /* tap the selected part: edit its notes */
      renderTracks(); };
    T.addEventListener('pointerup',fin,true); T.addEventListener('pointercancel',fin,true); }
  { const T=$('s2In'); let g=null;   /* the empty spot's handles: drag to set where the new part starts and how long it is, before New part */
    T.addEventListener('pointerdown',e=>{ const h=e.target.closest('.s2-ghost i'); if(!h||recState||!s2.empty) return; const L=s2Lane(s2.empty.lane); if(!L) return; e.stopPropagation(); e.preventDefault();
      const at=s2.empty.at, len=emptyLen(L,s2.empty), prev=Math.max(0,...L.tracks.filter(t=>hasContent(t)&&(t.off||0)<at).map(t=>(t.off||0)+pSteps(t)*pLoops(t)));
      g={L,el:h.parentElement,x0:e.clientX,r:h.classList.contains('hr'),at,len,prev}; s2.drag=true; try{ h.setPointerCapture(e.pointerId); }catch(_){} },true);
    T.addEventListener('pointermove',e=>{ if(!g) return; e.stopPropagation(); const G=Math.round(16*snapBars()), d=Math.round((e.clientX-g.x0)/s2.barw*16/G)*G; let at=g.at, len=g.len;
      if(g.r){ const room=emptyLen(g.L,{at,len:64*16}); len=clamp(g.len+d,Math.min(G,room),room); }
      else { at=clamp(g.at+d,g.prev,g.at+g.len-Math.min(G,g.len)); len=g.len-(at-g.at); }
      g.cur={at,len}; g.el.style.left=`calc(${at/16} * var(--s2-barw))`; g.el.style.width=`calc(${len/16} * var(--s2-barw))`; },true);
    const fin=()=>{ if(!g) return; const q=g; g=null; s2.drag=false; s2.noTap=Date.now(); if(q.cur&&s2.empty){ s2.empty.at=q.cur.at; s2.empty.len=q.cur.len; haptic('light'); } s2Render(); };
    T.addEventListener('pointerup',fin,true); T.addEventListener('pointercancel',fin,true); }
  { const T=$('s2In'); let hold=0, dr=null, sx=0, sy=0;
    const clipAt=(ln,x)=>{ const L=s2Lane(ln.dataset.ln), st=(x-ln.getBoundingClientRect().left)/s2.barw*16; return L&&L.tracks.find(t=>hasContent(t)&&st>=(t.off||0)&&st<(t.off||0)+pSteps(t)*pLoops(t)); };
    T.addEventListener('pointerdown',e=>{ const ln=e.target.closest('.s2-ln'); if(!ln||recState||e.target.closest('.s2-sel')) return; sx=e.clientX; sy=e.clientY; clearTimeout(hold);
      hold=setTimeout(()=>{ const tr=clipAt(ln,sx); if(!tr||pLoops(tr)>1) return; dr={tr,ln,off0:tr.off||0,x0:sx,id:e.pointerId,moved:false}; s2.drag=true; try{ ln.setPointerCapture(e.pointerId); }catch(_){} try{ navigator.vibrate&&navigator.vibrate(10); }catch(_){} ln.style.outline='2px solid var(--s2-amber)'; },380); });
    T.addEventListener('pointermove',e=>{ if(!dr){ if(Math.abs(e.clientX-sx)>8||Math.abs(e.clientY-sy)>8) clearTimeout(hold); return; }
      const G=snapBars(), nb=Math.round((e.clientX-dr.x0)/s2.barw/G)*G, off=Math.max(0,Math.round(dr.off0+nb*16)); if(off!==(dr.tr.off||0)){ dr.tr.off=off; dr.moved=true; const L=s2Lane(s2LaneId(dr.tr)), cv=dr.ln.querySelector('canvas'); if(L&&cv) s2DrawLane(L,cv); } });
    const end=e=>{ clearTimeout(hold); if(!dr) return; const d=dr; dr=null; s2.drag=false; d.ln.style.outline=''; s2.noTap=Date.now(); const want=(d.tr.off||0)-d.off0; d.tr.off=d.off0; if(d.moved && want){ if(!s2MoveClip(d.tr,want/16)) toast('No room there'); else s2.selId=d.tr.id; } renderTracks(); };
    T.addEventListener('pointerup',end); T.addEventListener('pointercancel',end); }
  const tl=$('s2Tl'); let d0=0,b0=0,zt=0; const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
  const zoom=z=>{ s2.barw=clamp(z,20,160); $('s2').style.setProperty('--s2-barw',s2.barw+'px'); clearTimeout(zt); zt=setTimeout(s2Render,140); };
  tl.addEventListener('touchstart',e=>{ if(e.touches.length===2){ d0=dist(e.touches); b0=s2.barw; } },{passive:true});
  tl.addEventListener('touchmove',e=>{ if(s2.drag){ e.preventDefault(); return; } if(e.touches.length===2&&d0){ e.preventDefault(); zoom(b0*dist(e.touches)/d0); } },{passive:false});
  tl.addEventListener('touchend',()=>{ d0=0; }); tl.addEventListener('wheel',e=>{ if(e.ctrlKey){ e.preventDefault(); zoom(s2.barw*(e.deltaY<0?1.1:0.9)); } },{passive:false});
  window.addEventListener('resize',()=>{ if(s2On()) s2Render(); }); tl.addEventListener('scroll',s2Clip,{passive:true});
  ['touchstart','wheel','pointerdown'].forEach(ev=>tl.addEventListener(ev,e=>{ if((playing||recState) && !e.target.closest('#s2Marks')) s2.free=true; },{passive:true}));   /* your scroll wins over following the playhead */
  const chk=(id,label,src,info)=>`<label class="nx-chk" style="font-weight:500;font-size:16px;align-items:center"><input type="checkbox" id="${id}" ${S[src]?'checked':''}> <span>${label}${info?s2Inf(info):''}</span></label>`;
  $('nxTiming').onclick=()=>{ nxSheet(`<h2>Mic and timing</h2><button class="nx-primary" id="nxCal" style="margin:0 0 10px">Fix late notes</button>
      ${s2Fld('nxSens','Mic sensitivity'+s2Inf('How quiet a sound can be and still count as a note or hit. Raise it if Noodle misses soft humming or taps. Lower it if it picks up noise or breaths.'),0,100,S.sens??55)}${chk('nxLa','Auto mic delay','latAuto','Measures how late the mic hears you on each take and corrects it. If notes still land late, use Fix late notes: clap along for one loop. Wired headphones give the best timing; Bluetooth adds delay.')}${window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.noodleNative?chk('nxFb','Silent metronome','feelBeat','The count-in clicks. Then, while you record, the phone vibrates on each beat instead, so no click ends up in your take.')+s2Fld('nxBuzz','Buzz timing'+s2Inf('If the buzz lands before or after the count-in click, move it: below 0 buzzes earlier, above 0 later (in milliseconds).'),-150,150,S.buzzMs||0,5):''}${chk('nxPa','Hear the song while recording','playAlong','Your other tracks play while you record. Wear headphones so the mic doesn’t pick them up.')}${chk('nxTp','Tap pad','tapPad','A pad on screen while you record a melody. Tap it on each note to catch repeated notes the mic hears as one.')}${chk('nxEc','Echo cancellation','ec','For drum and melody takes recorded without headphones. It can swallow beatbox hits.')}`);
    $('nxSheet').onclick=e=>{ const b=e.target.closest('[data-info]'); if(b){ e.preventDefault(); infoPop(b); } }; $('nxCal').onclick=()=>{ nxClose(); ensureCtx(); openRec('calib'); startRecord(true); };
    $('nxTp').onchange=e=>{ S.tapPad=e.target.checked; save(); }; if($('nxFb')) $('nxFb').onchange=e=>{ S.feelBeat=e.target.checked; save(); }; if($('nxBuzz')) $('nxBuzz').onchange=e=>{ S.buzzMs=+e.target.value||0; save(); };
    [['nxLa','latAuto'],['nxPa','playAlong'],['nxEc','ec']].forEach(([a,b])=>{ $(a).onchange=e=>{ S[b]=e.target.checked; save(); if(b==='ec') dropMic(); }; });
    $('nxSens').onchange=e=>{ S.sens=+e.target.value; save(); }; };
  $('nxBackup').onclick=async()=>{ const all=(await projDb.all())||[]; if(projWorthKeeping()&&!all.some(p=>p.id===S.pid)){ projSaved=''; await projSaveCurrent(); }   /* the open song, even if it was never stored */ const ids=((await projDb.all())||[]).map(p=>p.id); await songFileSave(ids); };
  $('nxOpenFile').onclick=()=>{ $('songIn').value=''; $('songIn').click(); };
  $('songIn').onchange=async()=>{ const fl=$('songIn').files&&$('songIn').files[0]; if(!fl) return; const n=await songFileOpen(await fl.text()); if(n>0) toast(n===1?'Added 1 song to your songs.':`Added ${n} songs to your songs.`); else if(n===0 && fl) toast('Those songs are already here.'); try{ await nxRenderProjects(); }catch(e){} };
  $('nxCredits').onclick=()=>nxSheet(`<h2>Sound credits</h2><p style="color:var(--muted);font-size:14px;margin:0 0 10px">Noodle's recorded instruments come from open sample libraries. Thank you to their makers.</p>${SOUND_CREDITS.map(c=>`<div class="nx-item" style="padding:10px 0;display:block"><b>${nxEsc(c.sound)}</b><small>${nxEsc(c.lib)} by ${nxEsc(c.by)} · <a href="${c.url}" target="_blank" rel="noopener" style="color:inherit">${nxEsc(c.lic)}</a></small></div>`).join('')}`);
  $('nxDrums').onclick=()=>{ const rows=S.kit.slots.map(sl=>`<div class="nx-item" style="padding:10px 0"><span>${nxEsc(slotLabel(sl.id))}<small>${sl.ex&&sl.ex.length>=3?'Taught':'Say “'+nxEsc(sl.say||slotLabel(sl.id))+'”'}</small></span><button class="nx-ghost" data-teach="${sl.id}" style="width:auto;height:40px;padding:0 14px">${sl.ex&&sl.ex.length>=3?'Teach again':'Teach'}</button></div>`).join('');
    nxSheet(`<h2>Your drum sounds</h2><p style="color:var(--muted);font-size:14px;margin:0 0 6px">Make your noise for a drum on every click, and Noodle learns to tell your sounds apart.</p>${rows}<button class="nx-primary" id="nxTeachAll">Teach them all</button>`);
    $('nxSheet').onclick=e=>{ const b=e.target.closest('[data-teach]'); const all=e.target.closest('#nxTeachAll'); if(!b&&!all) return; nxClose(); ensureCtx(); teachBack=true; startTeach(all?S.kit.slots.map(x=>x.id):[b.dataset.teach]); }; };
  let seen=true; try{ seen=!!localStorage.getItem('noodle.onboard'); }catch(e){}
  if(nxResume || new URLSearchParams(location.search).has('studio')){ if(s2Use()) s2Show(true); } else { nxGo('projects'); if(!seen) nxOnboard(async()=>{ const r=window.__remixAfterOb; if(r){ window.__remixAfterOb=null; await projOpen(r.pid); nxGo('studio'); toast(`Remixing “${r.title}”. Add your own part: tap + Add track.`,6000); return; } if(!((await projList())||[]).length) await nxExample(true); else await nxGo('projects'); });   /* opened from a song link on first launch: the remix opens after the welcome */ } }
function reloadRaw(){ S.tracks.filter(t=>((t.inst==='vox' && t.va!=null) || (t.expr>0 && t.exprAlign!=null)) && !t._raw).forEach(tr=>loadVox(tr).then(ok=>{ if(!ok) return; redrawTrack(tr); if(ctx) scheduleRender(); })); }
function storeVox(tr){ const {x,sr}=tr._raw; const pcm=new Int16Array(x.length); for(let i=0;i<x.length;i++) pcm[i]=Math.max(-32767,Math.min(32767,Math.round(x[i]*32767))); takeStore.put('vox'+tr.id,{sr,pcm}); }
async function loadVox(tr){ const r=await takeStore.get('vox'+tr.id); if(!r) return false; const x=new Float32Array(r.pcm.length); for(let i=0;i<x.length;i++) x[i]=r.pcm[i]/32767; tr._raw={x,sr:r.sr}; tr._dirty=true; return true; }
/* pitch of the take every 10 ms (same hum tracker the melody parts use) */
function voxPitch(tr){
  if(tr._pitch) return tr._pitch; const {x,sr}=tr._raw, R=16000, ratio=sr/R;
  let y=biquad(biquad(biquad(x,'hp',60,0.707,sr),'lp',1000,0.707,sr),'lp',1000,0.707,sr); const len=Math.floor((y.length-1)/ratio), z=new Float32Array(len);
  for(let i=0;i<len;i++){ const q=i*ratio,i0=Math.floor(q),fr=q-i0; z[i]=y[i0]*(1-fr)+y[i0+1]*fr; }
  const W=400,tauMin=16,tauMax=280,hop=160, d=new Float32Array(tauMax+1), fr=[];
  for(let s0=0;s0+W+tauMax<len;s0+=hop){ let e=0; for(let j=0;j<W;j++) e+=z[s0+j]*z[s0+j]; let run=0;
    for(let tau=1;tau<=tauMax;tau++){ let sum=0; for(let j=0;j<W;j++){ const df=z[s0+j]-z[s0+j+tau]; sum+=df*df; } run+=sum; d[tau]=run>0?sum*tau/run:1; }
    let tb=-1; for(let tau=tauMin;tau<=tauMax;tau++){ if(d[tau]<0.18){ while(tau+1<=tauMax&&d[tau+1]<d[tau]) tau++; tb=tau; break; } }
    if(tb<0){ let mv=9; for(let tau=tauMin;tau<=tauMax;tau++) if(d[tau]<mv){ mv=d[tau]; tb=tau; } if(mv>0.3) tb=-1; }
    let tI=tb; if(tb>tauMin&&tb<tauMax){ const a=d[tb-1],b=d[tb],c=d[tb+1],den=a-2*b+c; if(Math.abs(den)>1e-9) tI=tb+0.5*(a-c)/den; }
    fr.push({t:(s0+W/2)/R, db:10*Math.log10(e/W+1e-12), m: tb>0 ? 69+12*Math.log2((R/tI)/440) : NaN}); }
  // voice = within 35 dB of the take's loudest moments (a sung part is voiced nearly all the time, so 'quietest fifth' isn't silence)
  const dbs=fr.map(f=>f.db), gate=Math.max(percentile(dbs,0.99)-35, Math.min(percentile(dbs,0.02)+6, percentile(dbs,0.99)-10));
  fr.forEach((f,i)=>{ if(f.db<gate||isNaN(f.m)||f.m<36||f.m>90) f.m=NaN; });
  fr.forEach((f,i)=>{ const a=i>0?fr[i-1].m:NaN, b=f.m, c=i<fr.length-1?fr[i+1].m:NaN; f.ms = (!isNaN(a)&&!isNaN(b)&&!isNaN(c)) ? [a,b,c].sort((p,q)=>p-q)[1] : b; });
  return tr._pitch=fr;
}
/* corrected pitch: snap to the song's key; "Tune" sets how fast it gets there (100% = instant, the hard-tuned sound) */
function voxTarget(tr){
  const fr=voxPitch(tr), amt=fxOf(tr).tune/100, vt=tr.vt||0; if(!amt) return fr.map(()=>vt);   /* vt: the song was moved to another key */
  const tc=0.005+(1-amt)*0.16, k=1-Math.exp(-0.01/tc); let cs=0; const K=currentKey();
  return fr.map(f=>{ const m=f.ms+vt; if(isNaN(m)){ cs*=0.6; return vt; } const tgt=K.none?Math.round(m):snap(m); cs+=(tgt-m-cs)*k; return vt+cs; });
}
/* pitch shifting by overlapping pitch-period grains (PSOLA): keeps the voice's timing and formants */
function psola(x,sr,fr,corr,F=1){
  const at=t=>{ const i=Math.max(0,Math.min(fr.length-1,Math.round(t/0.01-0.5))); return i; };
  const y=new Float32Array(x.length); let ta=0, ts=0; const marks=[];
  while(ta<x.length){ marks.push(ta); const f=fr[at(ta/sr)], T= f&&!isNaN(f.ms)? sr/(440*Math.pow(2,(f.ms-69)/12)) : sr*0.008; ta+=Math.max(24,Math.round(T)); }
  let ai=0;
  while(ts<x.length){
    while(ai+1<marks.length && Math.abs(marks[ai+1]-ts)<=Math.abs(marks[ai]-ts)) ai++;
    const a=marks[ai], i=at(a/sr), f=fr[i], voiced=f&&!isNaN(f.ms);
    const T=voiced? sr/(440*Math.pow(2,(f.ms-69)/12)) : sr*0.008, r=voiced? Math.pow(2,corr[i]/12) : 1, L=Math.max(16,Math.round(T));
    if(F===1){ const g=1/r; for(let j=-L;j<L;j++){ const xi=a+j, yi=ts+j; if(xi<0||xi>=x.length||yi<0||yi>=y.length) continue; y[yi]+=x[xi]*g*(0.5+0.5*Math.cos(Math.PI*j/L)); } }
    else { const Ls=Math.max(8,Math.round(L/F)), g=F/r;   // formant shift: the grain (two pitch periods) is squeezed or stretched by F as it's placed
      for(let j=-Ls;j<Ls;j++){ const yi=ts+j; if(yi<0||yi>=y.length) continue; const p=a+j*F, k=Math.floor(p), fr2=p-k; if(k<0||k+1>=x.length) continue;
        y[yi]+=(x[k]+(x[k+1]-x[k])*fr2)*g*(0.5+0.5*Math.cos(Math.PI*j/Ls)); } }
    ts+=Math.max(12,Math.round(T/r));
  }
  return y;
}
function voxTuned(tr){
  const fx=fxOf(tr), key=fx.tune+'|'+fx.form+'|'+(tr.vt||0)+'|'+JSON.stringify(currentKey());
  if(tr._tuned && tr._tunedKey===key) return tr._tuned;
  const {x,sr}=tr._raw; let out=x;
  const F=Math.pow(2,(fx.form-50)*0.12/12);
  if(fx.tune>0 || F!==1 || tr.vt){ const fr=voxPitch(tr), corr=fx.tune>0||tr.vt?voxTarget(tr):new Float32Array(fr.length); out=psola(x,sr,fr,corr,F); }
  let pk=1e-6; for(let i=0;i<out.length;i++) pk=Math.max(pk,Math.abs(out[i])); const g=0.7/pk; const o2=new Float32Array(out.length); for(let i=0;i<out.length;i++) o2[i]=out[i]*g;
  tr._tuned=o2; tr._tunedKey=key; return o2;
}
/* Backing vocals (Pro): your take shifted to a third above and a third below the note you sang (in the song's key), with the same
   pitch shifting that tunes vocals. Kept until the take, key, tuning or voice character changes. */
/* With no key (Chromatic), the voices follow the song's chords instead: the nearest chord note 3-7 semitones above / below the note you sing
   (chords from any part playing chords at that moment), else a major third. chordAt: the chord's pitch classes at a song step. */
function songChordMap(){ const m=new Map(); for(const t of S.tracks){ if(t.guide||!t.notes||INST[t.inst].kind!=='pitched'||!chordsOn(t)) continue;
    for(const n of songEvents(t,t.notes)){ const pcs=notePitches(t,n).map(p=>((Math.round(p)%12)+12)%12); for(let s=n.s;s<n.s+n.l;s++){ const a=m.get(s)||new Set(); pcs.forEach(x=>a.add(x)); m.set(s,a); } } }
  return m; }
function chordVoice(n,dir,pcs){ if(pcs&&pcs.size) for(let d=3;d<=7;d++){ const h=n+dir*d; if(pcs.has(((h%12)+12)%12)) return h; } return n+dir*4; }
function voxHarm(tr){ const fx=fxOf(tr), K=currentKey(), CM=K.none?songChordMap():null, key=fx.tune+'|'+fx.form+'|'+(tr.vt||0)+'|'+JSON.stringify(K)+(CM?'|'+JSON.stringify([...CM].map(([s,a])=>s+':'+[...a].sort().join('.'))):'')+'|'+(tr.off||0)+'|'+(tr.va||0);
  if(tr._harm && tr._harmKey===key) return tr._harm;
  const {x,sr}=tr._raw, fr=voxPitch(tr), corr=voxTarget(tr), F=Math.pow(2,(fx.form-50)*0.12/12), sd=stepDur(), va=tr.va||0, off=(tr.off||0);
  const voice=dir=>{ const c=new Float32Array(fr.length); fr.forEach((f,i)=>{ const m=f.ms+corr[i]; if(isNaN(f.ms)){ c[i]=corr[i]; return; }
      const n=K.none?Math.round(m):snap(m), h=K.none?chordVoice(n,dir,CM.get(off+Math.floor((f.t-va)/sd))):keySteps(n,2*dir); c[i]=corr[i]+(h-n); });
    const o=psola(x,sr,fr,c,F); let pk=1e-6; for(let i=0;i<o.length;i++) pk=Math.max(pk,Math.abs(o[i])); const g=0.7/pk; for(let i=0;i<o.length;i++) o[i]*=g; return o; };
  tr._harm={up:voice(1), dn:voice(-1)}; tr._harmKey=key; return tr._harm; }
/* Vocoder and Talkbox (Pro vocal sounds): the vocal (after tuning) is split into 18 bands; how loud each band is moment to moment
   sets the level of the same band of a synth. Talkbox: the synth plays the note you sang (tuned to the key). Vocoder: a chord in the
   key on each note. Noise in the synth lets consonants through. starts: where each copy of the take plays [{o, va, PL}]. */
const VOC_BANDS=18;
function vocoder(oc, modIn, dest, tr, starts){
  const fr=voxPitch(tr), corr=voxTarget(tr), chord=tr.sound==='Vocoder', mix=oc.createGain(); mix.gain.value=chord?1.3:1.6;
  const car=oc.createGain(), noise=oc.createBufferSource(), nb=oc.createBuffer(1,oc.sampleRate*2,oc.sampleRate), nd=nb.getChannelData(0); let seed=1;
  for(let i=0;i<nd.length;i++){ seed=(seed*16807)%2147483647; nd[i]=seed/1073741824-1; } noise.buffer=nb; noise.loop=true; const nh=oc.createBiquadFilter(); nh.type='highpass'; nh.frequency.value=3000; const ng=oc.createGain(); ng.gain.value=0.35;
  noise.connect(nh); nh.connect(ng); ng.connect(car); noise.start(0);
  const voices=chord?[0,1,2]:[0,0.07]; const oscs=voices.map((v,j)=>{ const o=oc.createOscillator(); o.type=chord||j===0?'sawtooth':'square'; const g=oc.createGain(); g.gain.value=chord?0.33:0.5; o.connect(g); g.connect(car); o.start(0); return o; });
  for(const st of starts){ let last=null; fr.forEach((f,i)=>{ const at=st.o+(f.t-st.va); if(at<st.o-0.01||at>st.o+st.PL) return; const m=f.ms+corr[i]; if(isNaN(m)) return;
      const n=snap(m), ps=chord?chordTones(n,'triad').map(p=>p-12):[m, m+0.07]; if(last&&last.n===n&&!(!chord&&Math.abs(last.m-m)>0.05)) return; last={n,m};
      oscs.forEach((o,j)=>o.frequency.setTargetAtTime(mtof(ps[Math.min(j,ps.length-1)]),Math.max(0,at),0.006)); }); }
  const abs=new Float32Array(1025); for(let i=0;i<1025;i++) abs[i]=Math.abs(i/512-1);   /* odd length: silence maps to exactly 0 */
  for(let k=0;k<VOC_BANDS;k++){ const fc=130*Math.pow(8000/130,k/(VOC_BANDS-1)), Q=5;
    const bm=oc.createBiquadFilter(), bc=oc.createBiquadFilter(), sh=oc.createWaveShaper(), lp=oc.createBiquadFilter(), vca=oc.createGain();
    bm.type=bc.type='bandpass'; bm.frequency.value=bc.frequency.value=fc; bm.Q.value=bc.Q.value=Q; sh.curve=abs; lp.type='lowpass'; lp.frequency.value=28; vca.gain.value=0;
    const env=oc.createGain(); env.gain.value=6*Math.sqrt(fc/600);   /* higher bands are quieter in a voice: lift them */
    modIn.connect(bm); bm.connect(sh); sh.connect(lp); lp.connect(env); env.connect(vca.gain); car.connect(bc); bc.connect(vca); vca.connect(mix); }
  mix.connect(dest); }
async function renderVox(tr){
  const sr=ctx.sampleRate, L=bufLen(tr), n=Math.round(L*sr), tail=2, oc=new OfflineAudioContext(2,n+tail*sr,sr), b=ctx.createBuffer(2,n,sr);
  if(!tr._raw){ return b; }
  const fx=fxOf(tr), x=voxTuned(tr), rsr=tr._raw.sr, ab=oc.createBuffer(1,x.length,rsr); ab.copyToChannel(x,0);
  const src=oc.createBufferSource(); src.buffer=ab;
  const hp=oc.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=40+fx.low*2.6; hp.Q.value=0.8;
  const pres=oc.createBiquadFilter(); pres.type='peaking'; pres.frequency.value=3800; pres.Q.value=0.9; pres.gain.value=(fx.pres-25)/75*9;
  const air=oc.createBiquadFilter(); air.type='highshelf'; air.frequency.value=10000; air.gain.value=fx.air/10;
  const mud=oc.createBiquadFilter(); mud.type='peaking'; mud.frequency.value=320; mud.Q.value=1; mud.gain.value=-fx.comp/40;
  const comp=oc.createDynamicsCompressor(); comp.threshold.value=-8-fx.comp*0.3; comp.ratio.value=1.5+fx.comp*0.065; comp.attack.value=0.004; comp.release.value=0.12; comp.knee.value=6;
  const mk=oc.createGain(); mk.gain.value=0.75*(1+fx.comp*0.012);
  src.connect(hp); hp.connect(mud); mud.connect(pres); pres.connect(air); const voc=tr.sound==='Vocoder'||tr.sound==='Talkbox'; if(!voc) air.connect(comp); comp.connect(mk);
  const out=oc.createGain(); out.connect(oc.destination); mk.connect(out);
  if(fx.dbl>0){ [[0.013,0.6,-0.8],[0.021,0.83,0.8]].forEach(([dt,rate,pan])=>{ const dl=oc.createDelay(0.1), lfo=oc.createOscillator(), lg=oc.createGain(), p=oc.createStereoPanner(), g=oc.createGain();
      dl.delayTime.value=dt; lfo.frequency.value=rate; lg.gain.value=0.0025; lfo.connect(lg); lg.connect(dl.delayTime); lfo.start(0); p.pan.value=pan; g.gain.value=fx.dbl/100*0.7;
      mk.connect(dl); dl.connect(g); g.connect(p); p.connect(oc.destination); }); }
  if(fx.echo>0){ const dl=oc.createDelay(2), fb=oc.createGain(), lp=oc.createBiquadFilter(), wet=oc.createGain(); dl.delayTime.value=stepDur()*2; fb.gain.value=0.35; lp.type='lowpass'; lp.frequency.value=4500; wet.gain.value=fx.echo/100*0.5;
    mk.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(oc.destination); }
  const va=tr.va||0, PL=pSteps(tr)*stepDur(), SC=scOn(tr), reps=(SC&&!tr.off)?pLoops(tr):1, offT=(tr.off||0)*stepDur();
  const play=(sN,r)=>{ const o=r*PL+offT; if(va>=0) sN.start(o,va,PL); else sN.start(o-va,0,Math.max(0.01,PL+va)); };
  for(let r=0;r<reps;r++){ const sN=r?oc.createBufferSource():src; if(r){ sN.buffer=ab; sN.connect(hp); } play(sN,r); }
  if(voc) vocoder(oc, air, comp, tr, Array.from({length:reps},(_,r)=>({o:r*PL+offT+(va<0?-va:0), va:Math.max(0,va), PL})));
  if(fx.harm>0){ const H=voxHarm(tr); [[H.up,-0.55],[H.dn,0.55]].forEach(([hx,pan])=>{ const hb=oc.createBuffer(1,hx.length,rsr); hb.copyToChannel(hx,0);
      const hh=oc.createBiquadFilter(); hh.type='highpass'; hh.frequency.value=hp.frequency.value+80; const g=oc.createGain(); g.gain.value=fx.harm/100*0.42; const p=oc.createStereoPanner(); p.pan.value=pan;
      hh.connect(g); g.connect(p); p.connect(out);
      for(let r=0;r<reps;r++){ const sN=oc.createBufferSource(); sN.buffer=hb; sN.connect(hh); play(sN,r); } }); }
  const r=await oc.startRendering();
  for(let ch=0;ch<2;ch++){ const s2=r.getChannelData(ch), dst=b.getChannelData(ch); for(let i=0;i<s2.length;i++) dst[i%n]+=s2[i]; }
  if(SC) applyDuck(b,tr);
  return b;
}
const steps = ()=>S.bars*16;
const stepDur = ()=>60/S.bpm/4;
const loopLen = ()=>steps()*stepDur();
/* Each part has its own length (tr.len, in bars). BARS in the header is the song length.
   A shorter part repeats to fill the song unless its repeat is turned off (tr.rep===false). */
const pBars = tr=>Math.max(Math.min(1,tr.len||1),Math.min(tr.len||S.bars, S.bars-(tr.off||0)/16))   /* whole bars unless the snap made it a fraction */;
const pSteps = tr=>pBars(tr)*16;
const pRep = tr=>tr.rep!==false;
const pLoops = tr=>pRep(tr)?Math.max(1,Math.round(S.bars/pBars(tr))):1;
const scOn = tr=>!!(tr.sc && tr.sc.src && INST[tr.inst].kind!=='drums' && INST[tr.inst].kind!=='drum');
/* spotlight: regions marked on a vocal part where no other part starts a note (tails still ring), song steps */
function spotRanges(){ const out=[]; S.tracks.forEach(t=>{ if(t.inst==='vox' && t.spot && t.spot.length && trackGain(t)>0){ const n=pSteps(t); for(let r=0;r<pLoops(t);r++) t.spot.forEach(z=>{ if(z.s<n) out.push([z.s+r*n, Math.min(z.e,n)+r*n]); }); } }); return out; }
/* a note that starts before a region but is still held when it begins is let go right at the region's start */
function spotClip(e,R,key='s'){ const s0=e[key]; let l=e.l; for(const [a] of R) if(a>s0+1e-6 && a<s0+l) l=a-s0; return l===e.l?e:Object.assign({},e,{l}); }
const inSpot=(x,R)=>{ for(const [a,b] of R) if(x>=a-1e-6 && x<b-1e-6) return true; return false; };
const fullSong = tr=>scOn(tr) || !!tr.off || !!tr.fill || (tr.inst!=='vox' && spotRanges().length>0);   /* a part that starts later (tr.off) is rendered across the whole song */
const bufLen = tr=>(pRep(tr)&&!fullSong(tr)?pBars(tr):S.bars)*16*stepDur();
/* ---- sidechain: duck a part every time a chosen drum hits (built into the part's sound) ---- */
function scHits(src){ const out=[]; S.tracks.forEach(t=>{ const k=INST[t.inst].kind; if((k==='drums'||k==='drum')&&t.hits) songEvents(t,t.hits).forEach(h=>{ if(h.d===src) out.push(h.s); }); }); return [...new Set(out)].sort((a,b)=>a-b); }
function scSig(tr){ return scOn(tr)? [tr.sc.src,tr.sc.amt,S.bpm,S.bars,S.swing,scHits(tr.sc.src).join(',')].join('|') : ''; }
function applyDuck(b,tr){ const hits=scHits(tr.sc.src); if(!hits.length) return;
  const sr=b.sampleRate, n=b.length, L=n/sr, depth=clamp((tr.sc.amt??60)/100,0,1)*0.92, att=0.006, tau=Math.max(0.05,60/S.bpm/2)/2.6;
  const ts=hits.map(s=>stepTime(s)+0.002).filter(t=>t<L); ts.push(...ts.map(t=>t-L));   // the last hits' release wraps into the loop start
  ts.sort((a,b)=>a-b); const B=32, env=new Float32Array(Math.ceil(n/B)+1); let j=0;
  for(let k=0;k<env.length;k++){ const t=k*B/sr; while(j+1<ts.length && ts[j+1]<=t) j++; let g=1;
    for(let q=Math.max(0,j-2);q<=Math.min(ts.length-1,j+1);q++){ const dt=t-ts[q]; if(dt<-att) continue; const e=dt<0? (1+dt/att) : Math.exp(-dt/tau); g=Math.min(g,1-depth*e); }
    env[k]=g; }
  for(let ch=0;ch<b.numberOfChannels;ch++){ const d=b.getChannelData(ch); for(let i=0;i<n;i++){ const k=i/B, k0=k|0, f=k-k0; d[i]*=env[k0]+(env[k0+1]-env[k0])*f; } } }
/* a part's events laid out across the whole song: its own loop, repeated (r>0 marks a repeat) */
/* the part's events inside its window (a trimmed part keeps what's outside it): starts at 0 or later, before the end, and cut at the end */
function inWin(list, n){ const out=[]; for(const e of list){ const s0=e.s!==undefined?e.s:e.x; if(s0<0 || s0>=n) continue; out.push(e.l!=null && s0+e.l>n ? Object.assign({},e,{l:n-s0}) : e); } return out; }
/* Drum fills (set per part in the drum editor: every 4 or 8 bars): the last beat of each phrase becomes a fill and the next phrase starts with a crash.
   Made when the part is rendered, from the part's own beat, so editing the beat keeps its fills. Every 8th bar gets a longer, bigger one. */
const FILLS=[[[12,'S',.55],[13,'S',.65],[14,'S',.75],[15,'S',.9]], [[12,'tomhi',.8],[13,'tomhi',.7],[14,'tommid',.8],[15,'tomlo',.9]],
  [[8,'S',.7],[10,'S',.75],[12,'tomhi',.8],[13,'tomhi',.7],[14,'tommid',.8],[15,'tomlo',.95]]];
function withFills(tr, evs){ const N=tr.fill; if(!N||INST[tr.inst].kind!=='drums') return evs; const off=tr.off||0, span=pSteps(tr)*pLoops(tr), sn=((S.kit&&S.kit.slots||[]).find(x=>x.sound==='snare')||{id:'snare'}).id;
  const bars=Math.floor(span/16); if(bars<N) return evs; let out=evs.slice();
  for(let b=N-1;b<bars;b+=N){ const big=(b+1)%8===0&&N<8||N===8, f=FILLS[big?2:((b+1)/N)%2], from=off+b*16+f[0][0], to=off+b*16+16;
    out=out.filter(h=>h.s<from||h.s>=to||(h.s===from&&soundOf(h.d)==='kick'));
    for(const [st,d,v] of f) out.push({s:off+b*16+st, d:d==='S'?sn:d, v, fill:1});
    if(b+1<bars) out.push({s:off+(b+1)*16, d:'crash', v:0.75, fill:1}); }
  return out.sort((a,c)=>a.s-c.s); }
function songEvents(tr, list){ const n=pSteps(tr), off=tr.off||0, end=steps(), out=[], w=inWin(list,n); for(let r=0;r<pLoops(tr);r++) for(const e of w){ const s0=e.s!==undefined?e.s:e.x; if(s0+r*n+off>=end) continue; out.push(Object.assign({},e, e.s!==undefined?{s:e.s+r*n+off}:{x:e.x+r*n+off}, {r})); } return out; }
const mtof = m=>440*Math.pow(2,(m-69)/12);
const $ = id=>document.getElementById(id);

