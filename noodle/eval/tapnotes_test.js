// Tap notes (testing, Xcode builds): the owner's rules on a made-up take. A tap splits a held C (new attack); the C-D-E run with no taps
// joins (legato) on Lead; a loudness dip inside a held G ("da-da") starts a new note; a tap in silence makes nothing. Joined notes play
// as one sound (no dip between them); on Keys they don't join. The note editor's test button flips a take between today and tap notes.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const errs=[], out={};
  const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ window.NOODLE_DEV=true; localStorage.setItem('noodle.onboard','1'); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000);
  out.rules=await p.evaluate(()=>{ const fr=[]; for(let t=0;t<2.6;t+=0.01){ let m=NaN, db=-80, conf=0.1;
      if(t<1.0) m=60; else if(t<1.25) m=62; else if(t<1.5) m=64; else if(t>=1.7&&t<2.5) m=67;
      if(!isNaN(m)){ db=-20; if(Math.abs(t-2.1)<0.02) db=-34; } else conf=0.9; fr.push({t:+t.toFixed(3),m,db,conf}); }
    const mk=()=>{ const ns=[{t0:0,t1:1.0,p:60,g:0,v:.8},{t0:1.0,t1:1.25,p:62,g:1,v:.8},{t0:1.25,t1:1.5,p:64,g:1,v:.8},{t0:1.7,t1:2.5,p:67,g:0,v:.8}]; ns.frames=fr; ns.tune=0; return ns; };
    const lead={notes:mk()}; tapNotes(lead,[0.0,0.5,1.55],true);
    const keys={notes:mk()}; tapNotes(keys,[0.0,0.5,1.55],false);
    const f=ns=>ns.map(n=>`${n.t0.toFixed(2)}-${n.t1.toFixed(2)}:${Math.round(n.p)}${n.tp?'T':''}${n.lg?'L':''}`).join(' ');
    return {lead:f(lead.notes), keys:f(keys.notes)}; });
  out.legato=await p.evaluate(async()=>{ S.bpm=120; S.bars=1; const mk=lg=>mkTrack('lead',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true,sound:'Saw',notes:[{s:0,l:8,p:60,v:.8},{s:8,l:8,p:64,v:.8,...(lg?{lg:1,g:1}:{})}]});
    const dip=async lg=>{ const t=mk(lg); S.tracks=[t]; let n=0; const v0=window.voice; window.voice=function(...a){ n++; return v0.apply(this,a); }; try{ await renderStem(t); } finally{ window.voice=v0; } return n; };   /* how many sounds were started */
    return {attack:await dip(false), joined:await dip(true)}; });
  out.swap=await p.evaluate(()=>{ const t=mkTrack('lead',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true}); S.tracks=[t]; S.bpm=120; S.bars=1;
    const A=[{t0:0,t1:0.5,p:60,v:.8},{t0:0.5,t1:1,p:62,v:.8}], B=[{t0:0,t1:0.25,p:60,v:.8,tp:1},{t0:0.25,t1:0.5,p:60,v:.8,tp:1},{t0:0.5,t1:1,p:62,v:.8,g:1,lg:1}];
    t._an={notes:A, altNotes:B, tapNew:false, align:0, onsets:[]}; quantizeTrack(t); renderTracks(); s2Edit(t);
    const bt=document.getElementById('s2EdTap'), r={shown:!bt.hidden, label:bt.textContent, n:t.notes.length}; bt.click();
    r.label2=document.getElementById('s2EdTap').textContent; r.n2=S.tracks[0].notes.length; r.lg=S.tracks[0].notes.some(n=>n.lg); r.tp=S.tracks[0].notes.filter(n=>n.tp).length; return r; });
  out.devSwitch=await p.evaluate(()=>!document.getElementById('nxDevTap').hidden);
  out.pad=await p.evaluate(()=>document.getElementById('s2TapPad').textContent.trim());
  await c.close();
  const want={lead:'0.00-0.50:60T 0.50-1.00:60T 1.00-1.25:62L 1.25-1.50:64L 1.70-2.09:67 2.09-2.50:67', keys:'0.00-0.50:60T 0.50-1.00:60T 1.00-1.25:62 1.25-1.50:64 1.70-2.09:67 2.09-2.50:67'};
  if(out.rules.lead!==want.lead) errs.push('lead rules '+out.rules.lead); if(out.rules.keys!==want.keys) errs.push('keys rules '+out.rules.keys);
  if(!(out.legato.attack===2&&out.legato.joined===1)) errs.push('legato '+JSON.stringify(out.legato));
  const s=out.swap; if(!s.shown||s.label!=='Today'||s.label2!=='Tap notes'||s.n2!==3||!s.lg||s.tp<2) errs.push('swap '+JSON.stringify(s));
  if(!out.devSwitch) errs.push('no test switch'); if(out.pad!=='Tap for a new note') errs.push('pad '+out.pad);
  console.log(JSON.stringify({...out,errs})); await b.close(); })();
