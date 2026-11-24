// Round 16 (owner review, 24 Nov): track names follow the picked sound or effect ("Bell", "Phaser", "Punchy kit") until you type one, and go
// back to the type when a track's parts differ; the empty spot's handles set where a new part starts and how long it is; risers and
// downlifters have an Octave (and sit an octave higher); the example song opens looping, with a noise sweep up in bar 2; the Transitions
// editor has bar numbers on top; the renames (Transitions, Mix effects, FX). Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('noodle.onboard','1'); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), out={}, nm=t=>s2Name(s2Lane(s2LaneId(t)));
    // the example song
    await nxExample(); await w(600); out.exLoop=s2.loop&&$('s2Loop').getAttribute('aria-pressed')==='true'&&!!document.querySelector('.s2-secb.all');
    out.exNames=s2Lanes().map(L=>s2Name(L)).join('|'); const fx=S.tracks.find(t=>t.inst==='fx'); out.exFx=fx.fxs.map(e=>e.k+'@'+e.s+':'+e.v).join(' ');
    await projNew(); await w(100); out.newNoLoop=!s2.loop;
    // names
    S.bars=4; const ld=mkTrack('lead',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true,notes:[{s:0,l:4,p:60,v:.8,x:true}]}); S.tracks.push(ld); renderTracks(); s2Render();
    out.before=nm(ld); s2PickSheet(s2Lane(s2LaneId(ld)),'sound'); document.querySelector('#nxSheet [data-x="Bell"]').click(); await w(50); out.afterPick=nm(ld); nxClose();
    s2Render(); out.laneShows=[...document.querySelectorAll('.s2-nm span')].map(x=>x.textContent).includes('Bell');
    ld.name='My hook'; out.typed=nm(ld); ld.sound='Pluck'; out.typedStays=nm(ld); delete ld.name; out.follows=nm(ld); ld.sound='Bell';
    const kit=mkTrack('kit',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true,sound:'Punchy',hits:[{s:0,d:'kick',v:1}]}); S.tracks.push(kit); out.kitBefore=nm(kit); kit.picked=true; out.kitAfter=nm(kit);
    const vx=mkTrack('vox',{id:S.nextId++,sound:'Pop'}); vx.picked=true; out.vox=s2Auto({tracks:[vx]});
    const m1=mkTrack('mix',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true}); m1.mfx={k:'lp',curve:null,params:{}}; S.tracks.push(m1); renderTracks(); out.mixBefore=nm(m1);
    s2Edit(m1); await w(200); document.querySelector('.mfx-k [data-k="phaser"]').click(); await w(50); out.mixAfter=nm(m1); out.edTitle=$('s2EdT').textContent; s2EdClose(); m1.mfx.k='phaser';   /* (a free user's Phaser try goes back on close) */
    const m2=mkTrack('mix',{id:S.nextId++,off:32,len:1,rep:false,lenSet:true,lane:s2LaneId(m1)}); m2.mfx={k:'lp',curve:null,params:{}}; S.tracks.push(m2); renderTracks(); out.mixMixed=nm(m1);
    const ld2=mkTrack('lead',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true,sound:'Bell',picked:true,notes:[{s:0,l:4,p:60,v:.8,x:true}]}); S.tracks.push(ld2); renderTracks(); out.twoBells=[nm(ld),nm(ld2)].join('|');
    // the empty spot's handles
    S.tracks=S.tracks.filter(t=>t!==ld2&&t!==kit); const L=s2Lane(s2LaneId(ld)); s2.selId=null; s2.empty={lane:L.id,at:32}; s2Render(); await w(50);
    const gh=$('s2Ghost'), hr=gh.querySelector('.hr'), hl=gh.querySelector('.hl'), bw=s2.barw; out.handles=!!hr&&!!hl;
    const drag=(el,dx)=>{ const r=el.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2, o={bubbles:true,pointerId:7,isPrimary:true};
      el.dispatchEvent(new PointerEvent('pointerdown',{...o,clientX:x,clientY:y})); el.dispatchEvent(new PointerEvent('pointermove',{...o,clientX:x+dx,clientY:y})); el.dispatchEvent(new PointerEvent('pointerup',{...o,clientX:x+dx,clientY:y})); };
    drag(hr,bw*2); await w(50); out.longer=s2.empty&&s2.empty.len; drag($('s2Ghost').querySelector('.hl'),-bw); await w(50); out.earlier=s2.empty&&[s2.empty.at,s2.empty.len].join(',');
    out.clipSays=$('s2CbL').textContent; await w(450); $('s2CbNew').click(); await w(100); const np=S.tracks.filter(t=>s2LaneId(t)===L.id).sort((a,b)=>(b.off||0)-(a.off||0))[0]; out.newPart=(np.off||0)+':'+pSteps(np);
    // octave
    const f2=mkTrack('fx',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true}); f2.fxs=[fxNew('riser',0,32),fxNew('impact',16,32)]; S.tracks.push(f2); renderTracks(); s2Edit(f2); await w(250);
    out.ruler=[...document.querySelectorAll('.fxg .edrul span')].map(x=>x.textContent).join(',');
    f2._fxSel=f2.fxs[0]; s2EdMount(); await w(100); out.octShown=!!document.querySelector('.fxsel [data-fo="1"]'); document.querySelector('.fxsel [data-fo="1"]').click(); await w(50); out.oct=f2.fxs[0].o;
    f2._fxSel=f2.fxs[1]; s2EdMount(); await w(100); out.noOctOnImpact=!document.querySelector('.fxsel [data-fo]');
    // round 17: drag the selected effect's middle dot up to bend its loudness; the drawn shape and the sound follow
    f2._fxSel=f2.fxs[0]; s2EdMount(); await w(150); { const cv=document.querySelector('.fxg canvas'), R=cv.getBoundingClientRect(), G=f2._fxg, e=f2.fxs[0], w0=Math.min(e.l,G.ps-e.s)*G.cw-2, x=R.left+G.gut+e.s*G.cw+1+3+(w0-6)/2;
      const h=G.rh-10, y=R.top+5+h-3-(h-8)*(0.1+0.9*fxShape(e,0.5)), o={bubbles:true,pointerId:9,isPrimary:true}, flat=fxShape(e,0.5);
      cv.dispatchEvent(new PointerEvent('pointerdown',{...o,clientX:x,clientY:y})); cv.dispatchEvent(new PointerEvent('pointermove',{...o,clientX:x,clientY:y-30})); cv.dispatchEvent(new PointerEvent('pointerup',{...o,clientX:x,clientY:y-30})); await w(50);
      out.bent=(e.b||0)>0.3&&e.s===0&&e.l===16; out.bendShape=fxBend(e,0.5)>1.3&&fxBend(e,0)===1&&fxShape(e,0.5)>flat-0.01; }
    s2EdClose();
    out.labels=[INST.fx.label,INST.mix.label,PICK_GROUPS[3][0]].join('|');
    return out; });
  const want={exNames:'Punchy kit|Pluck|Bell|Piano|Transitions',exLoop:true,exFx:'sweepDown@0:0.4 riser@16:0.25 sweepUp@16:0.3',newNoLoop:true,before:'Lead',afterPick:'Bell',laneShows:true,typed:'My hook',typedStays:'My hook',follows:'Pluck',
    kitBefore:'Drum kit',kitAfter:'Punchy kit',vox:'Pop vocals',mixBefore:'Mix effects',mixAfter:'Phaser',edTitle:'Phaser',mixMixed:'Mix effects',twoBells:'Bell 1|Bell 2',
    handles:true,longer:48,earlier:'16,64',newPart:'16:64',ruler:'1,2',octShown:true,oct:1,noOctOnImpact:true,bent:true,bendShape:true,labels:'Transitions|Mix effects|FX'};
  for(const [k,v] of Object.entries(want)) if(r[k]!==v) errs.push(k+': '+JSON.stringify(r[k]));
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
