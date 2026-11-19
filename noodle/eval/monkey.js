// Random taps and drags across the app (studio, sheets, editors, More), logging any page error with the last few actions.
const {chromium,devices}=require('playwright');
const seed=+(process.argv[2]||1), pro=process.argv[3]!=='free', steps=+(process.argv[4]||400); let st=seed*2654435761>>>0; const rnd=()=>{ st^=st<<13; st^=st>>>17; st^=st<<5; return (st>>>0)/4294967296; };
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13']}); if(pro) await c.addInitScript(()=>localStorage.setItem('noodle.pro','1'));
  await c.addInitScript(()=>{ window.__nat=[]; window.webkit={messageHandlers:{noodleNative:{postMessage:m=>{}}}}; window.open=()=>null; });
  const p=await c.newPage(); const errs=[], log=[]; p.on('pageerror',e=>errs.push({msg:e.message, stack:(e.stack||'').split('\n').slice(0,3).join(' | '), last:log.slice(-6)})); p.on('dialog',d=>d.dismiss());
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  await p.evaluate(async()=>{ ensureCtx(); const o=defaultState(); o.bpm=110; o.bars=8; o.pid=projId(); o.title='Monkey';
    o.tracks=[mkTrack('lead',{id:S.nextId++,off:0,len:4,rep:false,lenSet:true,sound:'Saw',notes:[{s:0,l:4,p:60,v:.8,x:true},{s:8,l:4,p:64,v:.8,x:true}]}), mkTrack('kit',{id:S.nextId++,off:0,len:8,rep:false,lenSet:true,sound:'Rock',hits:[{s:0,d:'kick',v:.8},{s:4,d:'snare',v:.8},{s:2,d:'hat',v:.6}]}), mkTrack('pad',{id:S.nextId++,off:16,len:2,rep:false,lenSet:true,sound:'Warm pad',notes:[{s:0,l:16,p:57,v:.7,x:true}]}), mkTrack('fx',{id:S.nextId++,off:32,len:2,rep:false,lenSet:true,fxs:[{s:0,l:16,k:'riser',v:.8,c:[0,1],a:[1,1]}]})];
    const m=mkTrack('mix',{id:S.nextId++,off:8,len:2,rep:false,lenSet:true}); m.mfx={k:'lp',curve:null,params:{}}; o.tracks.push(m); await projLoadState(o); s2Render(); });
  for(let i=0;i<steps;i++){
    const els=await p.evaluate(()=>{ const vis=e=>{ const r=e.getBoundingClientRect(); if(r.width<4||r.height<4||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth) return false; const s=getComputedStyle(e); if(s.visibility==='hidden'||s.display==='none') return false; let n=e; while(n){ if(n.hidden) return false; n=n.parentElement; } return true; };
      const top=!$('nxScrim').hidden?[...document.querySelectorAll('#nxSheet button,#nxSheet input,#nxSheet select,#nxSheet [data-a]')]:!$('s2Ed').hidden?[...document.querySelectorAll('#s2Ed button,#s2Ed canvas,#s2Ed input')]:[...document.querySelectorAll('#s2 button,#s2 canvas,#s2 [data-ln],#s2Marks,.nx-tabs button,#nxMore button')];
      return top.filter(vis).filter(e=>!e.matches('#s2Back,#s2RecB,[data-arm],#s2Share,#nxShSw,#nxEmail,.nx-train,#nxTrainCard,#nxTiming,#nxDrums,#nxOpenFile,#nxBackup')).map(e=>{ const r=e.getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height,tag:e.tagName,id:e.id,txt:(e.textContent||'').trim().slice(0,18),type:e.type||''}; }); });
    if(!els.length){ await p.evaluate(()=>{ nxClose(); s2EdClose&&s2EdClose(); }); continue; }
    const e=els[Math.floor(rnd()*els.length)], x=e.x+rnd()*e.w, y=e.y+rnd()*e.h, act=rnd();
    try{
      if(e.tag==='SELECT'){ log.push(`select ${e.id}`); await p.evaluate(({x,y})=>{ const s=document.elementFromPoint(x,y); if(s&&s.tagName==='SELECT'&&s.options.length){ s.selectedIndex=Math.floor(Math.random()*s.options.length); s.dispatchEvent(new Event('change',{bubbles:true})); } },{x,y}); }
      else if(e.type==='range'){ log.push(`slide ${e.id}`); await p.mouse.click(x,y); }
      else if(e.tag==='INPUT'){ log.push(`type ${e.id}`); await p.mouse.click(x,y); await p.keyboard.type('ab'); }
      else if(act<0.25 && (e.tag==='CANVAS'||e.id==='')){ const dx=(rnd()-0.5)*160, dy=(rnd()-0.5)*80; log.push(`drag ${e.tag}#${e.id} ${e.txt} ${dx|0},${dy|0}`); await p.mouse.move(x,y); await p.mouse.down(); await p.mouse.move(x+dx,y+dy,{steps:4}); await p.mouse.up(); }
      else { log.push(`tap ${e.tag}#${e.id} "${e.txt}"`); await p.mouse.click(x,y); }
    }catch(err){ log.push('(action failed)'); }
    await p.waitForTimeout(40+rnd()*120);
    if(rnd()<0.04){ log.push('close'); await p.evaluate(()=>{ nxClose(); }); }
    if(rnd()<0.02){ log.push('undo'); await p.evaluate(()=>{ try{ undo(); }catch(e){} }); }
  }
  await p.waitForTimeout(500);
  const uniq=[...new Map(errs.map(e=>[e.msg,e])).values()];
  console.log(`seed ${seed} ${pro?'pro':'free'}: ${errs.length} errors, ${uniq.length} distinct`); uniq.slice(0,6).forEach(e=>console.log(JSON.stringify(e)));
  await b.close(); })();
