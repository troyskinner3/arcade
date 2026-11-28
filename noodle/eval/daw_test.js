// Send to computer (noodle/DAW.md): in the iPhone app (a stand-in bridge here), the pad screen shows Send to computer; when it's on, note
// pads, chord pads, drum pads and the Play pad send MIDI (note on at the touch, note off on release; drums on channel 10 with General MIDI
// notes; the Play pad's up as CC 74), the pads are quiet on the phone unless Sound on the phone is on, and closing sends every note off.
// The setup sheet asks the app for its connections, opens Bluetooth and the timing test. Usage events: daw on, setup, bluetooth, timing
// test, connected (no device names), notes per pad kind, delay. In the browser (no app) the row isn't there. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const errs=[], out={};
  const page=async app=>{ const c=await b.newContext({...devices['iPhone 13']});
    await c.addInitScript(a=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1'));
      if(a){ window.__nat=[]; window.webkit={messageHandlers:{noodleNative:{postMessage:m=>{ window.__nat.push(m);
        if(m.type==='midiState') setTimeout(()=>window.noodleMidi&&window.noodleMidi({dests:['Network Session 1','IDAM MIDI Host'],med:4.2,worst:11.6,n:12}),5); }}}}; } },app);
    const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200); return p; };
  const web=await page(false);
  out.webNoRow=await web.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)); await projNew(); await w(100); const t=mkTrack('lead',{id:S.nextId++}); S.tracks.push(t); renderTracks(); await tapOpen('xy',t.id); await w(200); const r=!$('tiDaw'); tapClose(); return r; });
  const p=await page(true);
  Object.assign(out, await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), o={}, N=()=>window.__nat.filter(m=>m.type==='midi');
    const down=(el,x,y)=>el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:x,clientY:y,pointerId:1})), up=el=>el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
    await projNew(); await w(100); S.key='0'; S.scale='major'; keyCache=null; scaleCache=null;
    const add=inst=>{ const t=mkTrack(inst,{id:S.nextId++}); S.tracks.push(t); renderTracks(); return t; };
    // note pads: the row is there and off; turning it on is remembered and counted
    const keys=add('keys'); await tapOpen('notes',keys.id); await w(200);
    o.row=!!$('tiDaw')&&!$('tiDawOn').checked&&$('tiDawHereL').hidden;
    $('tiDawOn').click(); await w(50); o.on=DAW.on&&localStorage.getItem('noodle.daw')==='1'&&!$('tiDawHereL').hidden;
    window.__nat.length=0; let sounded=0; const lv=leadNote; window.leadNote=(...a)=>{ sounded++; return lv(...a); };
    const pad=document.querySelector('#tapIn .ti-pad[data-i="0"]'), T=tapIn, want=T.pads[0].p+12*T.oct;
    down(pad); await w(20); up(pad); await w(20);
    const m=N(); o.noteMsgs=m.map(x=>x.b.join(',')).join(' ');
    o.notesOk=m.length===2&&m[0].b[0]===0x90&&m[0].b[1]===want&&m[0].b[2]>0&&m[1].b[0]===0x80&&m[1].b[1]===want&&m[0].sentMs>0&&m[0].lateMs>=0;
    o.quiet=sounded===0;
    $('tiDawOn').checked&&($('tiDawHere').click()); await w(20); down(pad); await w(20); up(pad); o.phoneSound=sounded===1&&DAW.here; $('tiDawHere').click(); window.leadNote=lv;
    tapClose(); await w(50);
    // chord pads: three notes on, three off
    await tapOpen('chords',keys.id); await w(200); window.__nat.length=0; const cp=document.querySelector('#tapIn .ti-pad[data-i="0"]'); down(cp); await w(20); up(cp); await w(20);
    const cm=N(); o.chord=cm.filter(x=>x.b[0]===0x90).length===3&&cm.filter(x=>x.b[0]===0x80).length===3;
    // held when closing: all notes off
    down(cp); await w(20); window.__nat.length=0; tapClose(); await w(50); o.closeOff=N().filter(x=>x.b[0]===0x80).length===3;
    // drum pads: channel 10, the export's General MIDI note
    const kit=add('kit'); await tapOpen('drums',kit.id); await w(200); window.__nat.length=0; const dp=document.querySelector('#tapIn .ti-pad[data-i="0"]'); down(dp); await w(20); up(dp); await w(20);
    const dm=N(); o.drum=dm.length===2&&dm[0].b[0]===0x99&&dm[0].b[1]===drumNote(tapIn.pads[0].id)&&dm[1].b[0]===0x89; tapClose(); await w(50);
    // the Play pad: a note, brightness as CC 74, sliding to a new note releases the old one
    const lead=add('lead'); await tapOpen('xy',lead.id); await w(300); window.__nat.length=0; const box=$('tiXY'), r=box.getBoundingClientRect();
    down(box,r.left+5,r.bottom-5); await w(20); box.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:r.right-5,clientY:r.top+5,pointerId:1})); await w(20); up(box); await w(20);
    const xm=N(), ons=xm.filter(x=>x.b[0]===0x90), offs=xm.filter(x=>x.b[0]===0x80), ccs=xm.filter(x=>x.b[0]===0xB0&&x.b[1]===74);
    o.xy=ons.length===2&&offs.length===2&&ons[0].b[1]<ons[1].b[1]&&ccs.length>=2&&ccs[0].b[2]<20&&ccs[ccs.length-1].b[2]>110;
    // the setup sheet: asks the app, shows the connection and delay, Bluetooth and the timing test
    window.__nat.length=0; $('tiDawSet').click(); await w(100);
    o.sheet=$('dawStat').textContent.includes('IDAM MIDI Host')&&/4 ms/.test($('dawMs').textContent)&&window.__nat.some(x=>x.type==='midiState');
    $('dawBt').click(); $('dawTest').click(); await w(20); o.sheetBtns=window.__nat.some(x=>x.type==='midiBluetooth')&&window.__nat.some(x=>x.type==='midiTest'&&x.bpm===120&&x.bars===4);
    nxClose(); await w(50); tapClose(); await w(100);
    const ev=(window.statsSent||[]).concat(statsQ).filter(x=>x.e==='daw').map(x=>x.p+(x.v?'='+x.v:'')); o.events=ev.join(' | ');
    o.eventsOk=['on','setup','bluetooth','timing test','connected cable=2','notes notes=','notes chords=','notes drums=','notes xy=','delay ms=4','delay ms worst=12'].every(k=>ev.some(e=>e.startsWith(k)));
    o.noNames=!ev.some(e=>/IDAM|Network/.test(e));
    // off again: nothing is sent
    await tapOpen('notes',keys.id); await w(200); $('tiDawOn').click(); window.__nat.length=0; const p2=document.querySelector('#tapIn .ti-pad[data-i="0"]'); down(p2); up(p2); await w(20); o.offSendsNothing=N().length===0; tapClose();
    return o; }));
  const ok=out.webNoRow&&out.row&&out.on&&out.notesOk&&out.quiet&&out.phoneSound&&out.chord&&out.closeOff&&out.drum&&out.xy&&out.sheet&&out.sheetBtns&&out.eventsOk&&out.noNames&&out.offSendsNothing;
  if(!ok) errs.push('daw check failed'); console.log(JSON.stringify(out),errs); await b.close(); })();
