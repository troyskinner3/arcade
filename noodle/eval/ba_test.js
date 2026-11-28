// Before and after video (js/beforeafter.js, noodle/SHARE_VIDEO.md). A hummed lead at bar 1 with a drum part: the video's audio is bar 1 of the
// hum as the mic heard it (its notes where they were sung), then the song from bar 2; the hum's recording is kept on the phone (src+id) so it
// still works after Noodle reopens; with no recording (a drawn part) the before is that part alone. Also the Share rows, the 1.5 s end card,
// the watermark (free only) and the usage events. Saves frames to results/ba_*.png. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000);
  const r=await p.evaluate(async()=>{ const o={}; ensureCtx(); PRO.owned=false; S.tracks=[]; S.bpm=100; S.bars=4; window.statsSent=[];
    const sr=ctx.sampleRate, sd=60/S.bpm/4, al=0.3, x=new Float32Array(Math.round(sr*(al+4*16*sd+0.5))), hz=[220,247,262,294];   /* four hummed notes, one a beat, from 0.3 s */
    for(let n=0;n<4;n++){ const t0=al+n*4*sd; for(let i=0;i<sr*3*sd;i++){ const t=i/sr; x[Math.floor((t0+t)*sr)]=0.3*Math.sin(2*Math.PI*hz[n]*t)*Math.min(1,t*60)*Math.min(1,(3*sd-t)*60); } }
    const l=mkTrack('lead',{id:S.nextId++}); S.tracks.push(l); S.target=l.id; await addTake(x,sr,'lead',{align:al,notch:true,live:true}); S.target=null; if(playing) togglePlay();
    const d=mkTrack('kit',{id:S.nextId++,len:4,lenSet:true}); d.hits=[]; for(let s=0;s<64;s+=4) d.hits.push({s,d:S.kit.slots[0].id,v:0.9}); S.tracks.push(d); keyChanged(); save(); renderTracks();
    o.kept=l.srcAlign!=null && !!(await takeStore.get('src'+l.id));
    await renderDirty(); const m=await baMix(); const A=m._ba, bar=16*stepDur();
    o.type=A.type; o.cut=+A.cut.toFixed(3); o.bar=+bar.toFixed(3); o.window=A.w0+'-'+A.w1; o.secs=+m.duration.toFixed(2);
    /* the before is the hum as recorded: loud where each note was sung (beats), quiet between */
    const L=m.getChannelData(0), rms=(a,b)=>{ let s=0; for(let i=Math.round(a*sr);i<Math.round(b*sr);i++) s+=L[i]*L[i]; return Math.sqrt(s/Math.max(1,Math.round((b-a)*sr))); };
    o.onNote=[0,1,2,3].map(n=>+rms(n*4*sd+0.05,n*4*sd+0.25).toFixed(3)); o.gap=+rms(3*sd+0.02,4*sd-0.02).toFixed(4);
    /* after a reload (nothing in memory) the kept recording is used */
    const keepRaw=l._raw, keepAn=l._an; l._raw=null; l._an=null; const src=await baSource(l); o.afterReload=!!src && Math.abs(src.at-l.srcAlign)<1e-3 && src.x.length===keepRaw.x.length; l._raw=keepRaw; l._an=keepAn;
    /* frames: before, just after the cut, the song, the end card */
    const f=withEndCard(m), {cv,draw,W,H}=baPainter(f,1080); o.size=W+'x'+H; o.png={};
    for(const [k,t] of [['before',A.cut*0.6],['cut',A.cut+0.05],['after',A.cut+2],['end',f._songEnd+1]]){ draw(t); o.png[k]=cv.toDataURL('image/png'); }
    draw(A.cut*0.5); const wm=cv.getContext('2d').getImageData(Math.round(60*1.5),Math.round(112*1.5),40,20).data; let lit=0; for(let i=0;i<wm.length;i+=4) lit=Math.max(lit,wm[i]); o.watermarkFree=lit>60;
    PRO.owned=true; draw(A.cut*0.5); const wp=cv.getContext('2d').getImageData(Math.round(60*1.5),Math.round(112*1.5),40,20).data; let lp=0; for(let i=0;i<wp.length;i+=4) lp=Math.max(lp,wp[i]); o.watermarkPro=lp>60; o.proEnd=+(withEndCard(m).duration-m.duration).toFixed(2); PRO.owned=false;
    o.freeEnd=+(f.duration-m.duration).toFixed(2);
    /* a beatbox take too: the hum still comes first; More settings can pick the beatbox (kept with the song) */
    { const bx=new Float32Array(Math.round(sr*(al+64*sd+0.5))); for(let s=0;s<64;s+=4){ const t0=al+s*sd; let ph=0; for(let i=0;i<sr*0.15;i++){ const t=i/sr; ph+=2*Math.PI*(50+100*Math.exp(-t*30))/sr; bx[Math.floor(t0*sr)+i]=0.8*Math.sin(ph)*Math.exp(-t*18)+0.15*(Math.random()*2-1)*Math.exp(-t*80); } }
      const k=mkTrack('kit',{id:S.nextId++}); S.tracks.push(k); S.mergeDrums=false; S.target=k.id; await addTake(bx,sr,'kit',{align:al,notch:false,live:false}); S.target=null; if(playing) togglePlay(); await renderDirty();
      const cs=await baChoices(); o.choices=cs.map(c=>c.type).join(','); o.firstPick=(await baPick()).type; S.baPart=k.id; o.chosen=(await baPick()).type; o.chosenMix=(await baMix())._ba.type;
      s2ShareSheet(); await new Promise(q=>setTimeout(q,300)); o.moreHidden=document.querySelector('#s2BaMore .nx-adv')?.hidden; o.choicesNow=(await baChoices()).map(c=>c.type).join(','); if(!document.querySelector('#s2BaMore [data-more]')) return o; document.querySelector('#s2BaMore [data-more]').click(); o.startsWith=document.querySelector('#s2BaMore [data-pick="baStart"] b')?.textContent;
      document.querySelector('[data-pick="baStart"]').click(); await new Promise(q=>setTimeout(q,100)); o.list=[...document.querySelectorAll('#nxSheet .pk-row span')].map(x=>x.textContent).join('|');
      document.querySelector('#nxSheet .pk-row').click(); await new Promise(q=>setTimeout(q,100)); o.pickedBack=S.baPart===l.id; nxClose(); S.tracks=S.tracks.filter(t=>t!==k); S.baPart=null; }
    /* no recording: a drawn lead starting at bar 3 beats a bass at bar 1 (Lead > Keys > Bass > drums) */
    const keep=S.tracks; S.tracks=[mkTrack('bass',{id:S.nextId++,off:0,len:1,lenSet:true,notes:[{s:0,l:4,p:40,v:.8}]}), mkTrack('lead',{id:S.nextId++,off:32,len:1,lenSet:true,notes:[{s:0,l:4,p:64,v:.8},{s:8,l:4,p:67,v:.8}]}), d]; S.tracks.forEach(t=>t._dirty=true); await renderDirty();
    const m2=await baMix(); o.drawn={type:m2._ba.type, window:m2._ba.w0+'-'+m2._ba.w1, beforeLoud:+(Math.sqrt(m2._ba.before.reduce((a,v)=>a+v*v,0)/m2._ba.before.length)).toFixed(3)}; S.tracks=keep; S.tracks.forEach(t=>t._dirty=true);
    /* the Share sheet and the whole path to a file */
    s2ShareSheet(); await new Promise(q=>setTimeout(q,200)); o.rows=[...document.querySelectorAll('#nxSheet .sh-a span')].map(x=>x.childNodes[0].textContent).join('|');
    await prepareShare('ba'); o.file=shareFile?{name:shareFile.name, type:shareFile.type, mb:+(shareFile.size/1048576).toFixed(2)}:null; o.events=statsSent.concat(statsQ).filter(e=>e.e==='export').map(e=>e.p+':'+e.v).join(','); nxClose();
    return o; });
  for(const k in r.png) fs.writeFileSync(__dirname+'/results/ba_'+k+'.png',Buffer.from(r.png[k].split(',')[1],'base64')); delete r.png;
  const bad=[]; if(!r.kept) bad.push('recording not kept'); if(r.type!=='hum') bad.push('type '+r.type); if(Math.abs(r.cut-r.bar)>0.01) bad.push('cut '+r.cut+' vs bar '+r.bar);
  if(r.window!=='16-96') bad.push('window '+r.window); if(r.onNote.some(v=>v<0.05)||r.gap>0.02) bad.push('before audio '+r.onNote+' gap '+r.gap); if(!r.afterReload) bad.push('reload');
  if(r.size!=='1080x1920') bad.push('size '+r.size); if(!r.watermarkFree||r.watermarkPro) bad.push('watermark '+r.watermarkFree+'/'+r.watermarkPro); if(r.freeEnd!==1.5||r.proEnd!==0) bad.push('end '+r.freeEnd+'/'+r.proEnd);
  if(r.choices!=='hum,beatbox'||r.firstPick!=='hum'||r.chosen!=='beatbox'||r.chosenMix!=='beatbox') bad.push('choices '+r.choices+' '+r.firstPick+' '+r.chosen+' '+r.chosenMix);
  if(r.moreHidden!==true||!/beatboxed/.test(r.startsWith||'')||!/hummed.*\|.*beatboxed/.test(r.list)||!r.pickedBack) bad.push('more settings '+r.moreHidden+' '+r.startsWith+' '+r.list+' '+r.pickedBack);
  if(r.drawn.type!=='part'||r.drawn.window!=='48-128'||r.drawn.beforeLoud<0.01) bad.push('drawn '+JSON.stringify(r.drawn)); if(r.rows!=='Before and after|Song video|Audio|Link to remix|DAW pack') bad.push('rows '+r.rows);
  if(!r.file||!/before and after\.(mp4|webm)$/.test(r.file.name)) bad.push('file '+JSON.stringify(r.file)); if(!/video ba hum:\d+/.test(r.events)) bad.push('events '+r.events);
  errs.push(...bad); console.log(JSON.stringify({...r,errs})); await b.close(); })();
