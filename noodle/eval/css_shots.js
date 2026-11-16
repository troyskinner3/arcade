// screenshots of every main screen, dark and light, into a folder: node css_shots.js <dir>. Run before and after a styling change and compare with tools/shotdiff.py
const {chromium,devices}=require('playwright'); const DIR=process.argv[2]||'results/shots'; require('fs').mkdirSync(DIR,{recursive:true});
(async()=>{ const b=await chromium.launch(); for(const scheme of ['dark','light']){ const c=await b.newContext({...devices['iPhone 13'],colorScheme:scheme}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('noodle.onboard','1'); }); await p.goto('http://localhost:8800/noodle-s2.html'); await p.waitForTimeout(900);
  const shot=n=>p.screenshot({path:`${DIR}/${scheme}_${n}.png`,animations:'disabled',caret:'hide'});
  await shot('1projects_empty');
  await p.evaluate(async()=>{ const mk=(title,bpm,tracks)=>{ S.title=title; S.bpm=bpm; tracks.forEach(t=>S.tracks.push(t)); };
    const L=(off,len,lane,inst='lead')=>{ const t=mkTrack(inst,{id:S.nextId++,off:off*16,len,rep:false,lenSet:true,notes:Array.from({length:len*4},(_,i)=>({s:i*4,l:i%3?4:3,p:57+[0,2,3,5,7,5,3,2][i%8],v:.8,x:false}))}); if(lane!=null) t.lane=lane; return t; };
    await projNew(); const a=L(0,2), a2=L(3,2,a.id), bs=L(0,4,null,'bass'); const k=mkTrack('kit',{id:S.nextId++,off:0,len:4,rep:false,lenSet:true,hits:Array.from({length:64},(_,i)=>i%8===0?{s:i,d:'kick',v:1}:i%8===4?{s:i,d:'snare',v:.9}:i%2===0?{s:i,d:'hat',v:.6}:null).filter(Boolean)});
    S.bars=5; mk('Subway hook',110,[a,a2,bs,k]); a.notes[2].hs=[2]; save(); flushSave(); await projSaveCurrent();
    await projNew(); mk('Rainy day bassline with a very long name that should cut off',92,[L(0,2,null,'bass')]); save(); flushSave(); await projSaveCurrent(); await nxRenderProjects(); });
  await p.waitForTimeout(300); await shot('2projects'); await p.tap('.nx-row:nth-child(2) .nx-dots'); await p.waitForTimeout(200); await shot('3project_menu'); await p.evaluate(()=>nxClose());
  await p.tap('.nx-row:has-text("Subway") .nx-open'); await p.waitForTimeout(700); await shot('4studio');
  await p.tap('.s2-nm'); await p.waitForTimeout(200); await shot('5track_sheet'); await p.evaluate(()=>nxClose());
  await p.tap('#s2Bpm'); await p.waitForTimeout(200); await shot('6tempo'); await p.evaluate(()=>nxClose()); await p.tap('#s2Key'); await p.waitForTimeout(200); await shot('7key'); await p.evaluate(()=>nxClose());
  await p.tap('#s2Mix'); await p.waitForTimeout(200); await shot('8mix'); await p.evaluate(()=>nxClose()); await p.tap('#s2RecB'); await p.waitForTimeout(250); await shot('9record_pick'); await p.evaluate(()=>nxClose());
  await p.tap('#s2Share'); await p.waitForTimeout(200); await shot('10share'); await p.evaluate(()=>nxClose());
  const lane=await p.$eval('.s2-ln canvas',e=>{ const r=e.getBoundingClientRect(); return {x:r.left,y:r.top+r.height/2}; }); await p.mouse.click(lane.x+30,lane.y); await p.waitForTimeout(250); await shot('11clip_selected'); await p.tap('#s2CbEdit'); await p.waitForTimeout(600); await shot('12editor'); await p.tap('#s2EdBack');
  await p.tap('#s2Back'); await p.waitForTimeout(300); await p.tap('#nxTabM'); await p.waitForTimeout(200); await shot('13more'); await p.evaluate(()=>$('nxTiming').click()); await p.waitForTimeout(200); await shot('14timing'); await p.evaluate(()=>nxClose());
  await p.evaluate(()=>$('nxDrums').click()); await p.waitForTimeout(200); await shot('15drums'); await p.evaluate(()=>nxClose());
  await p.evaluate(()=>{ openRec('calib'); }); await p.waitForTimeout(200); await shot('16recsheet_calib'); await p.evaluate(()=>{ lastMsg='Mic delay set to 120 ms from 8 claps'; showReview(); }); await p.waitForTimeout(200); await shot('17recsheet_review'); await p.evaluate(()=>closeRec());
  await p.evaluate(()=>{ openRec('teach'); }); await p.waitForTimeout(200); await shot('18recsheet_teach'); await p.evaluate(()=>closeRec());
  await p.evaluate(()=>nxGo('projects')); await p.waitForTimeout(200); await p.tap('.nx-row:has-text("Subway") .nx-open'); await p.waitForTimeout(700);
  { const cvs=await p.$$('.s2-ln canvas'); const bx=await cvs[cvs.length-1].boundingBox(); await p.mouse.click(bx.x+30,bx.y+bx.height/2); await p.waitForTimeout(250); await p.tap('#s2CbEdit'); await p.waitForTimeout(600); await shot('19editor_drums'); await p.tap('#s2EdBack'); }
  { const cvs=await p.$$('.s2-ln canvas'); const bx=await cvs[0].boundingBox(); await p.mouse.click(bx.x+30,bx.y+bx.height/2); await p.waitForTimeout(250); await p.tap('#s2CbEdit'); await p.waitForTimeout(600); await p.evaluate(()=>{ const t=S.tracks.find(x=>x.id===s2.edId); t._sel=t.notes[1]; drawGrid(t); }); await p.waitForTimeout(300); await shot('20editor_note_selected'); await p.tap('#s2EdBack'); }
  await p.evaluate(()=>{ toast('Saved.'); }); await p.waitForTimeout(100); await shot('21toast'); await p.tap('#s2Back'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ try{ nxOnboard(); }catch(e){} }); await p.waitForTimeout(400); await shot('22onboard'); console.log(scheme,errs); await c.close(); }
  await b.close(); })();
