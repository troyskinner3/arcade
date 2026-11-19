"use strict";
/* ---- Your presets: a vocal sound (style, pitch correction, voice character, every knob, backing vocals), a set of track effects, or a drum kit
   built from any of our kits plus your own taught noises. Saved on this phone (and in song backups / song files), named by you, offered in every
   song under "Mine". Free to save and use; one that uses Pro sounds or effects is tried, like anything Pro, until you have Pro. ---- */
const PRESET_KEY='noodle.presets';
function presetsAll(){ let p=null; try{ p=JSON.parse(localStorage.getItem(PRESET_KEY)||'null'); }catch(e){} p=p&&typeof p==='object'?p:{}; for(const k of ['vox','fx','kit']) if(!Array.isArray(p[k])) p[k]=[]; return p; }
function presetsSave(p){ try{ localStorage.setItem(PRESET_KEY,JSON.stringify(p)); }catch(e){ toast('Couldn’t save: this phone’s storage is full.'); } }
const presetId=()=>'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
/* merge presets from a backup or song file: same id = the newer one wins */
function presetsMerge(inc){ if(!inc||typeof inc!=='object') return 0; const p=presetsAll(); let n=0;
  for(const k of ['vox','fx','kit']) for(const x of (Array.isArray(inc[k])?inc[k]:[])){ if(!x||!x.id||!x.name) continue; const i=p[k].findIndex(y=>y.id===x.id); if(i<0){ p[k].push(x); n++; } else if((x.at||0)>(p[k][i].at||0)) p[k][i]=x; }
  presetsSave(p); return n; }
const copyJ=v=>v==null?v:JSON.parse(JSON.stringify(v));
/* what a preset needs Pro for (free users try it) */
function presetPro(kind,x){ if(isPro()) return false;
  if(kind==='vox') return PRO_SOUNDS.has(x.sound)||(x.fx&&x.fx.harm>0);
  if(kind==='fx') return true;   /* track effects are Pro */
  if(kind==='kit') return PRO_SOUNDS.has(x.sound)||(x.slots||[]).some(s=>s.kit&&PRO_SOUNDS.has(s.kit));
  return false; }
/* chips for the sheet: "Mine" + one button per preset (+ Edit) */
function presetChips(kind, cur){ const xs=presetsAll()[kind]; if(!xs.length) return '';
  return `<div class="s2-sg">Mine <button class="pr-edit" data-pre-edit="${kind}">Edit</button></div><div class="s2-opts">${xs.map(x=>`<button data-pre="${kind}:${x.id}" aria-pressed="${x.id===cur}">${nxEsc(x.name)}${presetPro(kind,x)?PRO_LOCK:''}</button>`).join('')}</div>`; }
/* ask for a name (a preset with the same name is replaced) */
function presetNameSheet(title, def, done){ nxSheet(`<h2>${nxEsc(title)}</h2><input class="nx-txt" id="prName" maxlength="28" value="${nxEsc(def)}" autocomplete="off" style="width:100%"><button class="nx-primary" id="prOk">Save</button>`);
  const go=()=>{ const v=$('prName').value.trim().slice(0,28); if(!v) return; done(v); }; $('prOk').onclick=go; $('prName').onkeydown=e=>{ if(e.key==='Enter') go(); }; setTimeout(()=>{ try{ $('prName').select(); }catch(e){} },60); }
function presetPut(kind, name, data){ const p=presetsAll(), i=p[kind].findIndex(x=>x.name.toLowerCase()===name.toLowerCase()), x={id:i>=0?p[kind][i].id:presetId(), name, at:Date.now(), ...data};
  if(i>=0) p[kind][i]=x; else p[kind].push(x); presetsSave(p); return x; }
function presetNextName(kind, base){ const n=presetsAll()[kind].length+1; return base+' '+n; }
/* Edit: rename or delete */
function presetEditSheet(kind, back){ const xs=presetsAll()[kind], label={vox:'vocal presets',fx:'effect presets',kit:'kits'}[kind];
  nxSheet(`<h2>Your ${label}</h2>${xs.length?xs.map(x=>`<div class="sec-row"><div><input class="nx-txt" data-ren="${x.id}" value="${nxEsc(x.name)}" maxlength="28" aria-label="Name"></div><button class="del" data-del="${x.id}" aria-label="Delete ${nxEsc(x.name)}">✕</button></div>`).join(''):'<p style="color:var(--muted)">None yet.</p>'}<button class="nx-ghost" id="prDone" style="margin-top:12px">Done</button>`);
  $('nxSheet').onchange=e=>{ const id=e.target.dataset&&e.target.dataset.ren; if(!id) return; const p=presetsAll(), x=p[kind].find(y=>y.id===id), v=e.target.value.trim().slice(0,28); if(x&&v){ x.name=v; x.at=Date.now(); presetsSave(p); } };
  $('nxSheet').onclick=e=>{ const d=e.target.closest('[data-del]'); if(d){ const p=presetsAll(); p[kind]=p[kind].filter(x=>x.id!==d.dataset.del); presetsSave(p); presetEditSheet(kind,back); return; } if(e.target.closest('#prDone')) back(); }; }
/* apply to a lane's tracks: a Pro preset is tried (goes back when the menu closes) */
function presetApply(kind, id, tracks, part){ const x=presetsAll()[kind].find(y=>y.id===id); if(!x) return false; const pro=presetPro(kind,x);
  if(kind==='vox'){ tracks.forEach(t=>{ const f={sound:x.sound, fx:copyJ(x.fx), vp:x.id}; if(pro) pvTry(t,f,x.name,part); else { pvForget(t,['sound','fx','vp']); Object.assign(t,f); t._tuned=null; t._harm=null; t._dirty=true; } }); }
  if(kind==='fx'){ tracks.forEach(t=>{ const f={tfx:copyJ(x.tfx), fp:x.id}; if(pro) pvTry(t,f,x.name,part); else { Object.assign(t,f); t._dirty=true; } }); }
  if(kind==='kit'){ const k={next:x.next||S.kit.next||1, slots:copyJ(x.slots)};
    if(pro){ if(!S._pvOrig) S._pvOrig={}; if(!('kit' in S._pvOrig)) S._pvOrig.kit=copyJ(S.kit); S.kit=k; tracks.forEach(t=>pvTry(t,{sound:x.sound,kp:x.id},x.name,part)); }
    else { S.kit=k; tracks.forEach(t=>{ pvForget(t,['sound','kp']); t.sound=x.sound; t.kp=x.id; }); }
    scaleCache=null; S.tracks.forEach(t=>{ if(t.hits) t._dirty=true; }); }
  if(!pro) save(); warmSounds(); scheduleRender(); return true; }
/* a kit preset: the kit track's sound and every slot (which drum, from which kit, what you say for it, your taught examples) */
const kitPresetData=tr=>({sound:tr.sound, next:S.kit.next, slots:copyJ(S.kit.slots)});
