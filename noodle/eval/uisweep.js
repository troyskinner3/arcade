// Every screen, sheet and editor at three phone sizes, light and dark: flag clipped text, sideways scrolling, things off-screen; screenshot each.
const {chromium,devices}=require('playwright'); const fs=require('fs');
const SETUP=`(async()=>{ ensureCtx(); const o=defaultState(); o.bpm=110; o.bars=8; o.pid=projId(); o.title='My first Noodle song with a long name';
  o.tracks=[mkTrack('lead',{id:S.nextId++,off:0,len:4,rep:false,lenSet:true,sound:'Saw',notes:[{s:0,l:4,p:60,v:.8,x:true},{s:8,l:4,p:64,v:.8,x:true}]}), mkTrack('kit',{id:S.nextId++,off:0,len:8,rep:false,lenSet:true,sound:'Rock',hits:[{s:0,d:'kick',v:.8},{s:4,d:'snare',v:.8},{s:2,d:'hat',v:.6}]}), mkTrack('pad',{id:S.nextId++,off:16,len:2,rep:false,lenSet:true,sound:'Warm pad',notes:[{s:0,l:16,p:57,v:.7,x:true}]}), mkTrack('fx',{id:S.nextId++,off:32,len:2,rep:false,lenSet:true,fxs:[{s:0,l:16,k:'riser',v:.8,c:[0,1],a:[1,1]}]}), mkTrack('vox',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,sound:'Pop'})];
  const m=mkTrack('mix',{id:S.nextId++,off:8,len:2,rep:false,lenSet:true}); m.mfx={k:'echo',curve:null,params:{}}; o.tracks.push(m); await projLoadState(o); await projSaveCurrent(); s2Render(); })()`;
const T=id=>`S.tracks.find(t=>t.inst==='${id}')`;
const SCREENS=[['studio',''],['studio-selected',`s2.selId=${T('lead')}.id; s2Render();`],['track-lead',`s2TrackSheet(s2Lane(s2LaneId(${T('lead')})))`],['track-kit',`s2TrackSheet(s2Lane(s2LaneId(${T('kit')})))`],['track-vox',`s2TrackSheet(s2Lane(s2LaneId(${T('vox')})))`],['track-songfx',`s2TrackSheet(s2Lane(s2LaneId(${T('mix')})))`],
  ['add-track','s2AddSheet(false)'],['record-what','s2.armId=null; s2AddSheet(true)'],['tempo',"s2Sheets('tempo')"],['key',"s2Sheets('key')"],['mix',"s2Sheets('mix')"],['share','s2ShareSheet()'],['pro','proSheet()'],
  ['edit-notes',`s2Edit(${T('lead')})`],['edit-drums',`s2Edit(${T('kit')})`],['edit-soundfx',`s2Edit(${T('fx')})`],['edit-songfx',`s2Edit(${T('mix')})`],['email','nxEmailSheet()'],['sharetakes','nxShareSheet()'],['credits',"$('nxCredits').click()"]];
(async()=>{ const b=await chromium.launch(); const report=[];
  for(const dev of ['iPhone SE','iPhone 13','iPhone 15 Pro Max']) for(const scheme of (dev==='iPhone 13'?['dark','light']:['dark'])){
    const c=await b.newContext({...devices[dev],deviceScaleFactor:1,colorScheme:scheme}); await c.addInitScript(()=>localStorage.setItem('noodle.pro','1')); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900); await p.evaluate(SETUP); await p.waitForTimeout(400);
    for(const [name,js] of SCREENS){
      await p.evaluate(()=>{ try{ nxClose(); }catch(e){} try{ s2EdClose(); }catch(e){} }); await p.waitForTimeout(120);
      try{ await p.evaluate(js); }catch(e){ report.push(`${dev}/${scheme}/${name}: could not open (${e.message.slice(0,60)})`); continue; } await p.waitForTimeout(450);
      const issues=await p.evaluate(()=>{ const out=[], vw=innerWidth, vh=innerHeight; if(document.documentElement.scrollWidth>vw+1) out.push('page scrolls sideways ('+document.documentElement.scrollWidth+')');
        const vis=e=>{ const r=e.getBoundingClientRect(); if(r.width<2||r.height<2) return false; const s=getComputedStyle(e); if(s.visibility==='hidden'||s.display==='none'||+s.opacity===0) return false; let n=e; while(n){ if(n.hidden) return false; n=n.parentElement; } return true; };
        for(const e of document.querySelectorAll('body *')){ if(!vis(e)) continue; const s=getComputedStyle(e), r=e.getBoundingClientRect();
          const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
          if(own && (e.scrollWidth>e.clientWidth+2) && /hidden|clip/.test(s.overflowX+s.overflow) ) out.push('text clipped: '+(e.id||e.className||e.tagName)+' "'+e.textContent.trim().slice(0,30)+'"');
          if(own && s.textOverflow==='ellipsis' && e.scrollWidth>e.clientWidth+1) out.push('text shortened…: '+(e.id||e.className||e.tagName)+' "'+e.textContent.trim().slice(0,30)+'"');
          if((e.tagName==='BUTTON'||e.tagName==='INPUT'||e.tagName==='SELECT') && (r.right>vw+1||r.left<-1) && !e.closest('#s2Tl,.s2-tl,#s2Marks,.fxg,.s2-edb,[class*=scroll]')) out.push('control off-screen: '+(e.id||e.textContent.trim().slice(0,20)||e.className)+' at '+Math.round(r.left)+'..'+Math.round(r.right));
          if((s.overflowX==='auto'||s.overflowX==='scroll') && e.scrollWidth>e.clientWidth+2 && !e.closest('#s2Tl,.s2-tl') && !e.matches('#s2Tl,.s2-tl,.fxg,.s2-edb *')) out.push('scrolls sideways: '+(e.id||e.className||e.tagName)+' ('+e.scrollWidth+'>'+e.clientWidth+')'); }
        return [...new Set(out)]; });
      issues.forEach(i=>report.push(`${dev}/${scheme}/${name}: ${i}`));
      await p.screenshot({path:`out/ui/${dev.replace(/ /g,'')}_${scheme}_${name}.png`}); }
    if(errs.length) report.push(`${dev}/${scheme}: page errors ${JSON.stringify(errs)}`); await c.close(); }
  fs.writeFileSync('results/uisweep.txt',report.join('\n')); console.log(report.length+' findings'); console.log(report.join('\n')); await b.close(); })();
