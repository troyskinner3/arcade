// Mix FX in the studio. Free: Add track offers Mix FX (not when recording), no record button on it, tapping an empty spot gives New part, which
// opens a Low pass, 4 bars; a Pro effect opens the Pro screen and doesn't change it; the shape can't be drawn. Pro: all effects; tap the curve to
// add a point, drag it, bend a segment, delete a point, reset; a control changes; the mix renders with it.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const errs=[];
  const page=async(pro)=>{ const c=await b.newContext({...devices['iPhone 13']}); if(pro) await c.addInitScript(()=>{ try{ localStorage.setItem('noodle.pro','1'); }catch(e){} }); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message)); await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
    await p.evaluate(async()=>{ const o=defaultState(); o.bpm=120; o.bars=8; o.tracks=[mkTrack('pad',{id:900,off:0,len:8,rep:false,lenSet:true,sound:'Warm pad',notes:[{s:0,l:64,p:57,v:.8,x:true}]})]; o.pid=projId(); await projLoadState(o); s2Render(); }); await p.waitForTimeout(300); return p; };
  const out={};
  { const p=await page(false), r={};
    await p.click('#s2Add'); await p.waitForTimeout(200); r.offered=await p.isVisible('#nxSheet [data-k="mix"]'); await p.click('#nxSheet [data-k="mix"]'); await p.waitForTimeout(300);
    r.lanes=await p.evaluate(()=>s2Lanes().map(L=>L.tracks[0].inst)); r.armOnMix=await p.evaluate(()=>{ const L=s2Lanes().find(L=>L.tracks[0].inst==='mix'); return !!document.querySelector(`[data-arm="${L.id}"]`); });
    const box=await p.evaluate(()=>{ const L=s2Lanes().find(L=>L.tracks[0].inst==='mix'), el=document.querySelector(`[data-ln="${L.id}"]`), R=el.getBoundingClientRect(); return {x:R.left+s2.barw*2.5, y:R.top+R.height/2}; });
    await p.mouse.click(box.x,box.y); await p.waitForTimeout(250); r.newShown=await p.isVisible('#s2CbNew'); await p.click('#s2CbNew'); await p.waitForTimeout(500);
    r.part=await p.evaluate(()=>{ const t=S.tracks.find(t=>t.mfx); return t&&{k:t.mfx.k, off:t.off, len:t.len, editor:!$('s2Ed').hidden, chips:document.querySelectorAll('.mfx-k button').length}; });
await p.click('.mfx-k button[data-k="phaser"]'); await p.waitForTimeout(250); r.proSheet=await p.evaluate(()=>/Noodle Pro/.test($('nxSheet').textContent)&&!$('nxScrim').hidden); r.stillLp=await p.evaluate(()=>S.tracks.find(t=>t.mfx).mfx.k);
    await p.evaluate(()=>nxClose()); await p.click('.mfx-k button[data-k="hp"]'); await p.waitForTimeout(150); r.hpFree=await p.evaluate(()=>S.tracks.find(t=>t.mfx).mfx.k);
    r.noDraw=await p.evaluate(()=>!document.querySelector('.mfx-tools'));
    r.fits=await p.evaluate(()=>{ const b=$('s2EdBody'); return b.scrollWidth<=b.clientWidth+1 && document.querySelector('.mfxe canvas').getBoundingClientRect().right<=innerWidth; });   /* no sideways scrolling */
    // delete the lane's only effect with the clip bar's trash: it goes (the track stays, empty); then with two, the selected one goes
    r.del=await p.evaluate(async()=>{ s2EdClose(); const t=S.tracks.find(t=>t.mfx); s2.selId=t.id; s2Render(); await new Promise(r=>setTimeout(r,100)); $('s2CbDel').click(); await new Promise(r=>setTimeout(r,100));
      const one=S.tracks.filter(t=>t.mfx).length, laneKept=s2Lanes().some(L=>L.tracks[0].inst==='mix');
      const L=s2Lanes().find(L=>L.tracks[0].inst==='mix'), a=L.tracks[0]; a.off=0; a.len=2; a.mfx={k:'lp',curve:null,params:{}}; const b=mkTrack('mix',{id:S.nextId++,lane:L.id,off:32,len:2,rep:false,lenSet:true}); b.mfx={k:'hp',curve:null,params:{}}; S.tracks.push(b); save(); renderTracks();
      s2.selId=b.id; s2Render(); await new Promise(r=>setTimeout(r,100)); $('s2CbDel').click(); await new Promise(r=>setTimeout(r,100));
      return {afterOnly:one, laneKept, afterTwo:S.tracks.filter(t=>t.mfx).map(t=>t.mfx.k).join(','), mixAfter:mfxParts().length}; });
    await p.evaluate(()=>s2EdClose()); await p.waitForTimeout(200); await p.click('.s2-tr [id], #s2Rec').catch(()=>{}); await p.waitForTimeout(200);
    r.recordSheetHasMix=await p.evaluate(()=>{ s2.armId=null; s2AddSheet(true); return !!document.querySelector('#nxSheet [data-k="mix"]')||[...document.querySelectorAll('#nxSheet [data-lane]')].some(b=>s2Lane(b.dataset.lane).tracks[0].inst==='mix'); });
    out.free=r; }
  { const p=await page(true), r={};
    await p.evaluate(()=>{ const t=mkTrack('mix',{id:S.nextId++,off:16,len:4,rep:false,lenSet:true}); t.mfx={k:'lp',curve:null,params:{}}; S.tracks.push(t); save(); renderTracks(); s2Edit(t); }); await p.waitForTimeout(400);
    const R=await p.evaluate(()=>{ const c=document.querySelector('.mfxe canvas').getBoundingClientRect(); return {x:c.left,y:c.top,w:c.width,h:c.height}; }), P=14, X=t=>R.x+P+t*(R.w-2*P), Y=v=>R.y+P+(1-v)*(R.h-2*P);
    await p.mouse.click(X(0.3),Y(0.8)); await p.waitForTimeout(150); r.added=await p.evaluate(()=>S.tracks.find(t=>t.mfx).mfx.curve.nodes.length);
    await p.mouse.move(X(0.3),Y(0.8)); await p.mouse.down(); await p.mouse.move(X(0.4),Y(0.5),{steps:5}); await p.mouse.up(); await p.waitForTimeout(150);
    r.dragged=await p.evaluate(()=>{ const n=S.tracks.find(t=>t.mfx).mfx.curve.nodes[1]; return [+n.t.toFixed(2),+n.v.toFixed(2)]; });
    const ns=await p.evaluate(()=>S.tracks.find(t=>t.mfx).mfx.curve.nodes); const m=(ns[0].t+ns[1].t)/2, mv=(ns[0].v+ns[1].v)/2;
    await p.mouse.move(X(m),Y(mv)); await p.mouse.down(); await p.mouse.move(X(m),Y(Math.min(1,mv+0.3)),{steps:5}); await p.mouse.up(); await p.waitForTimeout(150);
    r.bent=await p.evaluate(()=>S.tracks.find(t=>t.mfx).mfx.curve.curves[0]);
    await p.mouse.click(X(0.4),Y(0.5)); await p.waitForTimeout(100); await p.click('.mfx-tools [data-a="del"]'); await p.waitForTimeout(150); r.afterDelete=await p.evaluate(()=>S.tracks.find(t=>t.mfx).mfx.curve.nodes.length);
    await p.click('.mfx-tools [data-a="reset"]'); await p.waitForTimeout(150); r.reset=await p.evaluate(()=>S.tracks.find(t=>t.mfx).mfx.curve===null);
    await p.click('.mfx-k button[data-k="echo"]'); await p.waitForTimeout(150); await p.click('.mfx-par button[data-pv="1"]'); await p.waitForTimeout(150);
    r.echo=await p.evaluate(()=>S.tracks.find(t=>t.mfx).mfx); r.undo=await p.evaluate(()=>hist.undo.length>0);
    r.mix=await p.evaluate(async()=>{ const m=await renderMix(1,false); let q=0; const d=m.getChannelData(0); for(let i=0;i<d.length;i++) q+=d[i]*d[i]; return +(10*Math.log10(q/d.length)).toFixed(1); });
    out.pro=r; }
  const f=out.free, pr=out.pro, bad=[];
  if(!f.offered||!f.lanes.includes('mix')||f.armOnMix||!f.newShown||!f.part||f.part.k!=='lp'||f.part.len!==4||!f.part.editor||f.part.chips!==11||!f.proSheet||f.stillLp!=='lp'||f.hpFree!=='hp'||!f.noDraw||f.recordSheetHasMix||f.del.afterOnly!==0||!f.del.laneKept||f.del.afterTwo!=='lp'||f.del.mixAfter!==1||!f.fits) bad.push('free');
  if(pr.added!==4||pr.dragged[0]!==0.4||Math.abs(pr.dragged[1]-0.5)>0.05||typeof pr.bent!=='number'||pr.afterDelete!==3||!pr.reset||pr.echo.k!=='echo'||pr.echo.params.div!==1||!pr.undo||!(pr.mix>-40)) bad.push('pro');
  if(bad.length) errs.push('mix fx ui: '+bad.join(', '));
  console.log(JSON.stringify(out),errs); await b.close(); })();
