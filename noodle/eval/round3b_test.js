// Review round 3b: a finger on an FX effect drags it (the grid doesn't scroll), on empty grid it scrolls; the editor's rewind goes to the part's start;
// a hummed chord part lands in a good register unless you set the octave; Lead and Bass have no chord option; chord type is above Mix
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); const cdp=await c.newCDPSession(p);
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000); const out={};
  await p.evaluate(()=>{ ensureCtx(); S.bars=4; const t=mkTrack('fx',{id:S.nextId++,off:16,len:4,rep:false,lenSet:true}); t.fxs=[fxNew('riser',0,64),fxNew('impact',20,64)]; S.tracks.push(t); save(); renderTracks(); s2Edit(t); return ctx.resume(); }); await p.waitForTimeout(500);
  const touchDrag=async(x0,y0,dx)=>{ await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0}]}); for(let i=1;i<=8;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+dx*i/8,y:y0}]}); await p.waitForTimeout(16); } await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await p.waitForTimeout(300); };
  const st=()=>p.evaluate(()=>({scroll:Math.round(document.querySelector('.fxg').scrollLeft), fx:S.tracks[0].fxs.map(e=>e.k+'@'+e.s+'+'+e.l).join(' ')}));
  const pos=(k,end)=>p.evaluate(([k,end])=>{ const t=S.tracks[0], G=t._fxg, e=t.fxs.find(x=>x.k===k), r=document.querySelector('.fxg canvas').getBoundingClientRect(), row=FX_ROWS.indexOf(k); return {x:r.left+G.gut+(end?(e.s+e.l)*G.cw-5:(e.s+1)*G.cw), y:r.top+(row+0.5)*G.rh, cw:G.cw}; },[k,end]);
  out.start=await st(); let a=await pos('riser',false); await touchDrag(a.x,a.y,a.cw*4); out.dragEffect=await st();
  a=await pos('riser',true); await touchDrag(a.x,a.y,a.cw*4); out.dragEnd=await st();
  const r=await p.evaluate(()=>{ const t=S.tracks[0], G=t._fxg, cv=document.querySelector('.fxg canvas').getBoundingClientRect(); return {x:cv.left+G.gut+40*G.cw, y:cv.top+(FX_ROWS.indexOf('sweepDown')+0.5)*G.rh}; });
  await p.evaluate(()=>{ document.querySelector('.fxg').scrollLeft=200; }); await p.waitForTimeout(100); const before=await st(); await touchDrag(Math.min(r.x,330),r.y,120); out.emptyScrolls={before:before.scroll, after:(await st()).scroll, fxSame:(await st()).fx===before.fx};
  // rewind in the editor: the part's start (bar 2)
  await p.tap('#s2EdPlay'); await p.waitForTimeout(700); await p.tap('#s2EdRew'); await p.waitForTimeout(150); out.rewind=await p.evaluate(()=>({playing, bar:+(s2.cur+1).toFixed(2), playFromSteps:Math.round(playFrom/stepDur())})); await p.tap('#s2EdPlay'); await p.tap('#s2EdBack'); await p.waitForTimeout(300);
  // chords: hummed roots around A2-D3 land an octave up; a hand-set octave is kept; leads have no chords
  out.chords=await p.evaluate(async()=>{ const r={}; const sr=ctx.sampleRate, x=new Float32Array(sr*3), hz=[110,123.5,130.8,146.8]; for(let n=0;n<4;n++) for(let i=0;i<sr*0.6;i++){ const t=i/sr; x[Math.floor(n*0.7*sr+i)]=0.3*Math.sin(2*Math.PI*hz[n]*t)*Math.min(1,t*40)*Math.min(1,(0.6-t)*40); }
    const k=mkTrack('keys',{id:S.nextId++}); S.tracks.push(k); S.target=k.id; await addTake(x,sr,'keys',{align:0,notch:true,live:true}); S.target=null; if(playing) togglePlay();
    const roots=k.notes.map(pitchOf); r.roots=roots.join(','); r.oct=k.oct; r.sounding=roots.map(p=>p+12*k.oct).join(',');
    k.oct=0; k.octSet=true; r.handSetKept=!autoOct(k)&&k.oct===0;
    const l=mkTrack('lead',{id:S.nextId++}); l.chordType='triad'; r.leadChord=chordType(l); r.bassChord=chordType(mkTrack('bass',{id:999})); return r; });
  // the sheet: chord type above Mix for Keys; no chord control for Lead
  await p.evaluate(()=>{ const k=S.tracks.find(t=>t.inst==='keys'); s2TrackSheet(s2Lane(s2LaneId(k))); }); await p.waitForTimeout(200);
  out.keysSheet=await p.evaluate(()=>{ const h=[...document.querySelectorAll('#nxSheet .nx-adv .s2-row > span, #nxSheet .nx-adv .s2-fld > label, #nxSheet .nx-adv .nx-sub > span')].filter(x=>!x.closest('.nx-subb')).map(x=>x.childNodes[0].textContent.trim()); return {groups:h.join(' > '), chordBeforeMix:h.indexOf('Chord')>=0&&h.indexOf('Chord')<h.indexOf('Reverb')};   /* round 28: no headings; Chord first, Effects a section that opens in place */ }); await p.screenshot({path:'results/keys_sheet.png'}); await p.evaluate(()=>nxClose());
  await p.evaluate(()=>{ const l=mkTrack('lead',{id:S.nextId++,notes:[{s:0,l:4,p:60,v:.8,x:true}]}); S.tracks.push(l); renderTracks(); s2TrackSheet(s2Lane(s2LaneId(l))); }); await p.waitForTimeout(200); out.leadSheetHasChord=await p.evaluate(()=>!!document.querySelector('#nxSheet [data-pick="chord"]')); await p.evaluate(()=>nxClose());
  if(!/^Chord > Octave > Brightness( > Expression)? > Reverb > Left \/ right > Effects$/.test(out.keysSheet.groups)||out.leadSheetHasChord) errs.push('sheet: '+out.keysSheet.groups+' lead chord '+out.leadSheetHasChord);
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
