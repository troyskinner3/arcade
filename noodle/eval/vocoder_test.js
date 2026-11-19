// Vocoder and Talkbox (Pro vocal sounds): on one of the owner's sung takes (or a synthetic vowel), both render without errors, are
// clearly audible, follow the voice (silent where the take is silent), and Talkbox sits at the sung note. Pro-locked for free users. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright'); const fs=require('fs'); const D=__dirname+'/data/user';
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000);
  const r=await p.evaluate(async()=>{ const out={}; S.bars=2; S.bpm=120; S.key='9'; S.scale='minor'; keyCache=null; const sr=44100, n=sr*4, x=new Float32Array(n); let ph=0;
    for(let i=0;i<n;i++){ const t=i/sr, on=t<1.5||(t>2&&t<3.5); ph+=220/sr; let v=0; for(let h=1;h<=20;h++){ const f=220*h, fmt=Math.exp(-Math.pow((f-700)/250,2))+0.6*Math.exp(-Math.pow((f-1200)/300,2))+0.3*Math.exp(-Math.pow((f-2600)/400,2)); v+=Math.sin(2*Math.PI*h*ph)*fmt; } x[i]=on?0.2*v:0; }
    const t=mkTrack('vox',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,sound:'Pop'}); t._raw={x,sr}; t.va=0; S.tracks.push(t); renderTracks();
    out.locked=proLocked('Vocoder')&&proLocked('Talkbox'); PRO.owned=true; out.unlocked=!proLocked('Vocoder');
    const lvl=(d,a,b)=>{ let q=0; for(let i=Math.floor(a*sr);i<Math.floor(b*sr);i++) q+=d[i]*d[i]; return +(10*Math.log10(q/((b-a)*sr)+1e-12)).toFixed(1); };
    const hz=(y,a)=>{ const s0=Math.floor(sr*a), L=4096; let best=0,bl=0; for(let lag=60;lag<500;lag++){ let s=0,e=0; for(let i=s0;i<s0+L;i++){ s+=y[i]*y[i+lag]; e+=y[i+lag]*y[i+lag]; } const cc=s/Math.sqrt(e+1e-9); if(cc>best){ best=cc; bl=lag; } } return +(69+12*Math.log2(sr/bl/440)).toFixed(1); };
    for(const snd of ['Vocoder','Talkbox']){ t.sound=snd; t.fx=Object.assign({},VOX_PRESETS[snd],{echo:0,dbl:0}); t._dirty=true; t._tuned=null; await renderDirty(); const d=t._buf.getChannelData(0);
      out[snd]={on:lvl(d,0.3,1.3), gap:lvl(d,1.65,1.9), note:snd==='Talkbox'?hz(d,0.6):null}; }
    return out; });
  if(!r.locked||!r.unlocked) errs.push('pro');
  for(const k of ['Vocoder','Talkbox']){ const v=r[k]; if(!(v.on>-35)) errs.push(k+' quiet '+v.on); if(!(v.on-v.gap>25)) errs.push(k+' does not follow the voice '+v.on+' / '+v.gap); }
  if(Math.abs(((r.Talkbox.note-57)%12+12)%12)>0.4&&Math.abs(((r.Talkbox.note-57)%12+12)%12-12)>0.4) errs.push('talkbox note '+r.Talkbox.note);
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
