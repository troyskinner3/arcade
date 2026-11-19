// Backing vocals (Pro): a sung A3 in A minor gets a voice a third above (C4) and a third below (F3); the slider is Pro (a Pro button
// for free users); harm 0 renders exactly like before; with harmonies on, they sound clearly under the lead. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000);
  const r=await p.evaluate(async()=>{ const out={}; S.bars=2; S.bpm=120; S.key='9'; S.scale='minor'; keyCache=null; const sr=44100, n=sr*3, x=new Float32Array(n); let ph=0;
    for(let i=0;i<n;i++){ const f=220*(1+0.004*Math.sin(2*Math.PI*5*i/sr)); ph+=f/sr; let v=0; for(let h=1;h<=12;h++) v+=Math.sin(2*Math.PI*h*ph)/h*(h<4?1:0.6); x[i]=0.25*v*Math.min(1,i/2000,(n-i)/2000); }
    const t=mkTrack('vox',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,sound:'Pop'}); t._raw={x,sr}; t.va=0; t.fx=Object.assign({},VOX_PRESETS.Pop,{tune:0}); S.tracks.push(t); renderTracks();
    PRO.owned=false; s2TrackSheet(s2Lane(s2LaneId(t))); out.freeBtn=!!document.querySelector('#s2Fx_harm')&&!!document.querySelector('label[for="s2Fx_harm"] .pro-b');   /* free users try it (badge) */ nxClose();
    PRO.owned=true; s2TrackSheet(s2Lane(s2LaneId(t))); out.slider=!!document.querySelector('#s2Fx_harm'); nxClose();
    const hz=y=>{ const a=Math.floor(sr*1), L=4096; let best=0,bl=0; for(let lag=80;lag<400;lag++){ let s=0,e=0; for(let i=a;i<a+L;i++){ s+=y[i]*y[i+lag]; e+=y[i+lag]*y[i+lag]; } const c=s/Math.sqrt(e+1e-9); if(c>best){ best=c; bl=lag; } } return sr/bl; };
    const H=voxHarm(t), midi=f=>+(69+12*Math.log2(f/440)).toFixed(1); out.up=midi(hz(H.up)); out.dn=midi(hz(H.dn)); out.lead=midi(hz(x));
    // no key (Chromatic): the voices follow the chords playing (an F chord under a sung A: C above, F below); with no chords, a major third
    S.scale='chromatic'; keyCache=null; t._harm=null; const H0=voxHarm(t); out.chromNone=[Math.round(midi(hz(H0.up))),Math.round(midi(hz(H0.dn)))];
    const k=mkTrack('keys',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,notes:[{s:0,l:32,p:53,v:.7}]}); S.tracks.push(k); t._harm=null; const H1=voxHarm(t); out.chromChord=[Math.round(midi(hz(H1.up))),Math.round(midi(hz(H1.dn)))];
    S.tracks=S.tracks.filter(x=>x!==k); S.scale='minor'; keyCache=null; t._harm=null;
    const rend=async()=>{ t._dirty=true; await renderDirty(); return [t._buf.getChannelData(0).slice(0,sr*2), t._buf.getChannelData(1).slice(0,sr*2)]; };
    const [l0,r0]=await rend(); t.fx.harm=0; const [l1]=await rend(); let mx=0; for(let i=0;i<l0.length;i++) mx=Math.max(mx,Math.abs(l0[i]-l1[i])); out.zeroSame=mx<1e-5;
    t.fx.harm=80; const [l2,r2]=await rend(); let d=0,e=0; for(let i=sr*0.5;i<sr*1.5;i++){ d+=(l2[i]-l1[i])**2; e+=l1[i]**2; } out.harmDb=+(10*Math.log10((d+1e-12)/(e+1e-12))).toFixed(1);
    return out; });
  if(!r.freeBtn||!r.slider) errs.push('sheet'); if(Math.abs(r.lead-57)>0.3||Math.abs(r.up-60)>0.3||Math.abs(r.dn-53)>0.3) errs.push('pitches '+[r.lead,r.up,r.dn]);
  if(!r.zeroSame) errs.push('harm 0 differs'); if(JSON.stringify(r.chromNone)!=='[61,53]'||JSON.stringify(r.chromChord)!=='[60,53]') errs.push('chromatic '+JSON.stringify([r.chromNone,r.chromChord])); if(!(r.harmDb>-12&&r.harmDb<0)) errs.push('harmony level '+r.harmDb);
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
