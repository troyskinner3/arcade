// Round 28 (owner's TestFlight notes, 26 Nov): the note editor scrolls through every octave (swipe the grid or drag the keys up and
// down), opening on the part's notes; Octave − / + moves the selected note an octave; a note's front edge moves its start (end stays);
// stretching or moving a note into another at the same pitch pushes that one later, removes it once covered and brings it back when
// dragged back (different pitches may overlap); Another version is grey when there's none, with its ⓘ last in the bar; no double-tap zoom,
// and no zoom at all in the app. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const errs=[], out={};
  for(const app of [false,true]){ const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(app=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); if(app) window.webkit={messageHandlers:{noodleNative:{postMessage:()=>{}}}}; },app);
    await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
    out[app?'appZoom':'webZoom']=await p.evaluate(()=>document.querySelector('meta[name=viewport]').content+'|'+getComputedStyle(document.documentElement).touchAction);
    if(app){ await c.close(); continue; }
    const r=await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), o={};
      await projNew(); await w(100); S.bars=2; S.key='0'; S.scale='major'; keyCache=null; scaleCache=null;
      const t=mkTrack('lead',{id:S.nextId++,off:0,len:2,lenSet:true,rep:false,sound:'Bell',notes:[{s:0,l:4,p:60,v:.8,x:true},{s:6,l:4,p:60,v:.8,x:true},{s:2,l:6,p:64,v:.8,x:true},{s:20,l:4,p:67,v:.8,x:true}]}); S.tracks.push(t); save(); flushSave(); renderTracks(); s2Edit(t); await w(400);
      const G=()=>t._grid, R=()=>t._cv.getBoundingClientRect(), X=s=>R().left+G().gut+s*G().cw, Y=p=>R().top+1+(G().rows.indexOf(p)+0.5)*G().rh;
      let tgt=null; const pe=(type,x,y)=>{ if(type==='pointerdown') tgt=document.elementFromPoint(x,y); (tgt||t._cv).dispatchEvent(new PointerEvent(type,{bubbles:true,clientX:x,clientY:y,pointerId:3,isPrimary:true})); };
      o.window=G().rows.length+'/'+t._rowsAll.length+':'+G().rows.includes(60)+G().rows.includes(67)+':'+t._rowsAll[0]+'-'+t._rowsAll[t._rowsAll.length-1];
      // the note sounds as the finger lands (round 28: the preview felt late when it waited for the finger to lift)
      { let heard=0; const pn=previewNote; previewNote=(...a)=>{ heard++; }; selectNote(t,null); pe('pointerdown',X(3),Y(64)); o.onDown=heard; pe('pointerup',X(3),Y(64)); o.once=heard; previewNote=pn; selectNote(t,null); }
      // swipe down on empty grid: higher notes come into view
      const top0=t._vTop, ey=R().top+20, ex=X(13); pe('pointerdown',ex,ey); for(let k=1;k<=6;k++) pe('pointermove',ex,ey+k*G().rh); pe('pointerup',ex,ey+6*G().rh); o.swipeUp=t._vTop>top0; o.noNoteAdded=t.notes.length===4;
      // drag the keys up: back down
      const lab=document.querySelector('#s2EdBody .glabels'), lr=lab.getBoundingClientRect(), t1=t._vTop; const ld=(type,y)=>lab.dispatchEvent(new PointerEvent(type,{bubbles:true,clientX:lr.left+10,clientY:y,pointerId:4}));
      ld('pointerdown',lr.top+200); ld('pointermove',lr.top+200-6*G().rh); ld('pointerup',lr.top+200-6*G().rh); o.keysScroll=t._vTop<t1;
      t._vTop=null; s2EdMount(); await w(200);
      // octave up on a selected note
      const n67=t.notes.find(n=>n.p===67); selectNote(t,n67); renderNoteBar(t); await w(50); const ob=document.querySelector('#s2EdBody .sb-o-up'); o.octShown=!!ob&&!ob.closest('[hidden]'); ob.click(); await w(200); o.oct=t.notes.find(n=>n.s===20).p+':'+G().rows.includes(79);
      document.querySelector('#s2EdBody .sb-o-dn').click(); await w(200);
      // front edge: the 64 note (2..8) starts at 0, ends at 8
      t._vTop=null; s2EdMount(); await w(200); const n64=t.notes.find(n=>n.p===64); selectNote(t,n64); drawGrid(t); placeHandle(t); await w(50);
      pe('pointerdown',X(2)+3,Y(64)); pe('pointermove',X(1)+3,Y(64)); pe('pointermove',X(0)+3,Y(64)); pe('pointerup',X(0)+3,Y(64)); await w(100); o.front=n64.s+':'+(n64.s+n64.l);
      // same-pitch overlap: stretch the first 60 (0..4) into the second (6..10)
      const a=t.notes.find(n=>n.p===60&&n.s===0); selectNote(t,a); drawGrid(t); placeHandle(t); await w(50); const sec=()=>t.notes.filter(n=>n.p===60&&n!==a).map(n=>n.s+':'+n.l).join();
      pe('pointerdown',X(3)+G().cw-3,Y(60)); pe('pointermove',X(7)+2,Y(60)); o.pushed=a.l+'|'+sec(); pe('pointermove',X(11)+2,Y(60)); o.covered=a.l+'|'+sec(); pe('pointermove',X(4)+2,Y(60)); o.back=a.l+'|'+sec(); pe('pointermove',X(7)+2,Y(60)); pe('pointerup',X(7)+2,Y(60)); await w(400); flushSave();
      o.final=t.notes.filter(n=>n.p===60).map(n=>n.s+':'+n.l).join()+'|64:'+t.notes.filter(n=>n.p===64).map(n=>n.s+':'+n.l).join();   /* the 64 overlapping the 60s stays */
      // Another version: grey (no recorded notes), its ⓘ last and still tappable
      const vb=$('s2EdVer'), bar=vb.parentElement, vis=[...bar.children].filter(x=>!x.hidden).map(x=>x.id); o.ver=vb.disabled+':'+!$('s2EdVerI').disabled+':'+vis.slice(-2).join(',');
      ensureCtx(); o.heard=typeof heardNow==='function'&&heardNow()<=ctx.currentTime+1e-6&&outDelay()>=0&&outDelay()<=0.6;   /* the playhead follows what's heard */
      s2EdClose(); return o; });
    Object.assign(out,r); await c.close(); }
  const want={heard:true, onDown:1, once:1, swipeUp:true, noNoteAdded:true, keysScroll:true, octShown:true, oct:'79:true', front:'0:8', pushed:'8|8:2', covered:'12|', back:'5|6:4', final:'0:8,8:2|64:0:8', ver:'true:true:s2EdVer,s2EdVerI'};
  for(const [k,v] of Object.entries(want)) if(out[k]!==v) errs.push(k+': '+JSON.stringify(out[k]));
  if(!/^\d+\/\d+:truetrue:108-24$/.test(out.window)) errs.push('window: '+out.window);
  if(!/user-scalable=no/.test(out.appZoom)||/user-scalable/.test(out.webZoom)||!/manipulation/.test(out.webZoom)) errs.push('zoom: '+out.webZoom+' / '+out.appZoom);
  console.log(JSON.stringify({...out,errs})); await b.close(); })();
