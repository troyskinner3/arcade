// Draw notes (round 25): a finger line in the note editor becomes notes. strokeNotes: a flat line is one note on that row; a climbing line
// becomes rising notes; a wobbly line stays one pitch; one-step scraps join a neighbour. In the editor: Draw toggles (amber), a drawn line
// replaces the notes under it and keeps the rest, the notes are in key, one Undo takes it back, Draw is off after leaving the editor, and
// there's no Draw on a drum part; Draw chords (round 27): over a line redoes it (what sticks out stays), above it adds a second voice. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), out={};
    const G={gut:40,cw:20,rh:12,rows:[72,71,69,67,65,64,62,60],sPL:16}, X=s=>40+s*20+10, Y=r=>1+(r+0.5)*12, str=ns=>ns.map(n=>n.s+':'+n.l+':'+n.p).join(' ');
    out.flat=str(strokeNotes(G,[{x:X(0)-8,y:Y(2)},{x:X(7)+8,y:Y(2)}]));
    out.climb=str(strokeNotes(G,[{x:X(0)-8,y:Y(6)},{x:X(3)+8,y:Y(6)},{x:X(4)-8,y:Y(4)},{x:X(7)+8,y:Y(4)},{x:X(8)-8,y:Y(2)},{x:X(11)+8,y:Y(2)}]));
    const wob=[]; for(let i=0;i<=40;i++) wob.push({x:X(0)-8+i*4, y:Y(3)+(i%2?5:-5)}); out.wobble=str(strokeNotes(G,wob));
    out.scrap=str(strokeNotes(G,[{x:X(0)-8,y:Y(5)},{x:X(4)+8,y:Y(5)},{x:X(5)-8,y:Y(1)},{x:X(5)+8,y:Y(1)},{x:X(6)-8,y:Y(5)},{x:X(9)+8,y:Y(5)}]));
    // in the editor
    await nxExample(); await w(700); const ld=S.tracks.find(t=>t.inst==='lead'), keep=ld.notes.filter(n=>n.s>=16).length, undoN=hist.undo.length; s2Edit(ld); await w(400);
    out.drawShown=!!$('s2EdDraw'); $('s2EdDraw').click(); await w(300); out.pressed=$('s2EdDraw').getAttribute('aria-pressed'); out.touch=ld._cv.style.touchAction;
    const cv=ld._cv, R=cv.getBoundingClientRect(), Gd=ld._grid, px=s=>R.left+Gd.gut+s*Gd.cw+Gd.cw/2, py=i=>R.top+1+(i+0.5)*Gd.rh, o={bubbles:true,pointerId:5,isPrimary:true};
    cv.dispatchEvent(new PointerEvent('pointerdown',{...o,clientX:px(0)-Gd.cw/2+1,clientY:py(3)}));
    for(let s=0;s<16;s++) cv.dispatchEvent(new PointerEvent('pointermove',{...o,clientX:px(s),clientY:py(s<8?3:1)}));
    cv.dispatchEvent(new PointerEvent('pointerup',{...o,clientX:px(15)+Gd.cw/2-1,clientY:py(1)})); await w(300);
    const drawn=ld.notes.filter(n=>n.s<16); out.drawn=str(drawn); out.keptRest=ld.notes.filter(n=>n.s>=16).length===keep;
    const K=currentKey(); out.inKey=drawn.every(n=>K.set.includes(((Math.round(n.p)-K.tonic)%12+12)%12));   /* sung notes far from the line stay (a second voice) */
    flushSave(); undo(); await w(300); const ld2=S.tracks.find(t=>t.inst==='lead'); out.undone=!str(ld2.notes.filter(n=>n.s<16)).includes(out.drawn)||out.drawn==='';
    // Draw chords (round 27): over the same line redoes it; a line above adds a second voice
    { ld2.notes=[{s:0,l:16,p:60,v:.8,x:true}]; ld2._dirty=true; s2EdMount(); await w(300); const cv2=ld2._cv, R2=cv2.getBoundingClientRect(), G2=ld2._grid, row=q=>G2.rows.indexOf(q);
      const line=(q)=>{ const x=s=>R2.left+G2.gut+s*G2.cw+G2.cw/2, y=R2.top+1+(row(q)+0.5)*G2.rh; cv2.dispatchEvent(new PointerEvent('pointerdown',{...o,clientX:x(0)-G2.cw/2+1,clientY:y})); for(let s=0;s<8;s++) cv2.dispatchEvent(new PointerEvent('pointermove',{...o,clientX:x(s),clientY:y})); cv2.dispatchEvent(new PointerEvent('pointerup',{...o,clientX:x(7)+G2.cw/2-1,clientY:y})); };
      const r62=G2.rows.includes(62)?62:G2.rows.find(q=>q>60&&q<=62); line(r62); await w(200); out.redo=str(ld2.notes);
      const up=G2.rows.filter(q=>q>=r62+5).sort((a,b)=>a-b)[0]; line(up); await w(200); out.harm=str(ld2.notes)===`0:8:${r62} 0:8:${up} 8:8:60`||str(ld2.notes)===`0:8:${up} 0:8:${r62} 8:8:60`; out.harmStr=str(ld2.notes); }
    s2EdClose(); out.offAfter=!s2.draw;
    const kit=S.tracks.find(t=>t.inst==='kit'); s2Edit(kit); await w(300); out.noDrawOnDrums=!$('s2EdDraw'); s2EdClose();
    return out; });
  const want={flat:'0:8:69', climb:'0:4:62 4:4:65 8:4:69', wobble:'0:9:67', scrap:'0:10:64', drawShown:true, pressed:'true', touch:'none', keptRest:true, inKey:true, undone:true, offAfter:true, noDrawOnDrums:true, harm:true};
  for(const [k,v] of Object.entries(want)) if(r[k]!==v) errs.push(k+': '+JSON.stringify(r[k]));
  if(!/^0:8:6[12] 8:8:60$/.test(r.redo)) errs.push('redo: '+r.redo);
  if(!/^\S+ \S+/.test(r.drawn)) errs.push('drawn: '+r.drawn);   /* two pitches: the line stepped up halfway */
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
