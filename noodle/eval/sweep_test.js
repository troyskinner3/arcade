// Owner, 28 Nov: the Play pad's sweep (moving up and down while holding a note) is the fun of it, so every setting a finger moves on a pad
// is kept as a curve with the part and plays back as played (tr.mods, MODS in instruments.js). Here: a take holds one note while sweeping
// from dark to bright; the part keeps one note and a rising Brightness curve; the rendered part gets brighter over the note (compared
// with the same part without its curve); a trim keeps the curve in place; MIDI export carries it as CC 74; a hostile curve in a song file is ignored.
// Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), out={};
    const until=async f=>{ for(let i=0;i<1500&&!f();i++) await w(10); };
    await projNew(); await w(100); S.bpm=100; S.bars=1; S.key='0'; S.scale='major'; keyCache=null; scaleCache=null;
    const lead=mkTrack('lead',{id:S.nextId++,sound:'Saw'}); S.tracks.push(lead); renderTracks(); lead.rin='xy'; s2.armId=lead.id; s2Record();
    await until(()=>$('tiXY')&&tapIn&&tapIn.xy); await w(200);
    const box=$('tiXY'), R=box.getBoundingClientRect(), pe=(type,y)=>box.dispatchEvent(new PointerEvent(type,{bubbles:true,clientX:R.left+R.width*0.45,clientY:R.top+y*R.height,pointerId:1}));
    tapRec(); await until(()=>tapIn.start); const T=tapIn, waitSt=async st=>until(()=>ctx.currentTime>=T.start+st*stepDur()+T.lat);
    await waitSt(0.5); pe('pointerdown',0.95); for(let k=0;k<=20;k++){ await waitSt(2+k*0.5); pe('pointermove',0.95-0.9*k/20); } await waitSt(13); pe('pointerup',0.05);
    await until(()=>ctx.currentTime>=T.start+16*stepDur()+T.lat); document.querySelector('#tiBar [data-a="stop"]').click();
    await until(()=>tapIn&&tapIn.state==='review'); const tr=tapIn.tr; out.notes=tr.notes.length; const P=modPts(tr,'tn')||[];
    out.points=P.length; out.first=P.length?P[0][1]:null; out.last=P.length?P[P.length-1][1]:null; out.rises=P.length>5&&P[0][1]<0.2&&P[P.length-1][1]>0.8;
    tapKeep(); await w(200);
    // the rendered part: brighter at the end of the note than at the start (zero crossings per frame), and flat without the curve
    const zc=(buf,a,b)=>{ const d=buf.getChannelData(0), sr=buf.sampleRate; let z=0; for(let i=Math.round(a*sr)+1;i<Math.round(b*sr);i++) if((d[i]>0)!==(d[i-1]>0)) z++; return z; };
    const sd=stepDur(), n0=tr.notes[0], t0=n0.s*sd;
    const on=await renderStem(tr), keep=tr.mods; tr.mods=null; const off=await renderStem(tr); tr.mods=keep;
    out.withCurve=[zc(on,t0+0.15,t0+0.35),zc(on,t0+n0.l*sd-0.3,t0+n0.l*sd-0.1)]; out.noCurve=[zc(off,t0+0.15,t0+0.35),zc(off,t0+n0.l*sd-0.3,t0+n0.l*sd-0.1)];
    // a trim: keep steps 4..16 of the part; the curve moves with it and starts from the value it had at step 4
    const cp=JSON.parse(JSON.stringify(tr)); s2Cut(cp,4,16); const C=modPts(cp,'tn')||[]; out.cutStart=C.length?C[0][0]:null; out.cutVal=C.length?+C[0][1].toFixed(2):null;
    const atCut=P.filter(q=>q[0]<4).pop(); out.cutOk=C.length>0&&C[0][0]===0&&!!atCut&&Math.abs(C[0][1]-atCut[1])<0.01;
    // MIDI export: CC 74 on the part's channel
    const mb=midiBytes([tr]); let cc=0; for(let i=0;i+2<mb.length;i++) if((mb[i]&0xF0)===0xB0&&mb[i+1]===74) cc++; out.midiCC=cc;
    // a hostile curve from a song file: ignored, the part still renders
    tr.mods={tn:[['x',1],[1,'y'],null,[2,NaN]], __proto__:{tn:[[0,1]]}}; out.hostile=modPts(tr,'tn'); try{ await renderStem(tr); out.hostileRenders=true; }catch(e){ out.hostileRenders=String(e); }
    return out; });
  if(r.notes!==1) errs.push('one held note expected: '+r.notes); if(!r.rises) errs.push('curve '+r.points+' '+r.first+'..'+r.last);
  const rise=r.withCurve[1]/r.withCurve[0], flat=r.noCurve[1]/r.noCurve[0]; r.rise=+rise.toFixed(2); r.flat=+flat.toFixed(2);   /* the same note with and without the curve: only the curve makes it brighter towards the end */
  if(!(rise>flat*1.3)) errs.push('the curve does not make the part brighter: '+r.withCurve+' vs '+r.noCurve);
  if(!r.cutOk) errs.push('trim lost the curve '+r.cutStart+' '+r.cutVal); if(!(r.midiCC>5)) errs.push('MIDI CC 74: '+r.midiCC); if(r.hostile!==null||r.hostileRenders!==true) errs.push('hostile '+JSON.stringify(r.hostile)+' '+r.hostileRenders);
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
