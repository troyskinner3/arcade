// The sampled instruments (Piano, E-piano, Strings, Rock bass, Guitar): load, plays each note at the right pitch, time and loudness, keeps the synth's level in the mix, and works for chords and slides
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const r=await p.evaluate(async()=>{ ensureCtx(); S.bpm=120; S.bars=2; const out={};
    const t0=performance.now(); out.loaded=await loadSampled('Piano'); out.loadMs=Math.round(performance.now()-t0); const e=SMP.piano; out.layers=e.layers.map(L=>L.roots.length); out.offMs=e.layers[1].roots.map(r=>Math.round(e.layers[1].map.get(r).off*1000));
    const mk=(sound,notes,inst='keys')=>{ const t=mkTrack(inst,{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,sound,notes}); t.chordType='off'; return t; };
    const level=async(t)=>{ const b=await renderStem(t), d=b.getChannelData(0), sr=b.sampleRate; let q=0,on=-1; for(let i=0;i<sr*1.0;i++){ q+=d[i]*d[i]; if(on<0&&Math.abs(d[i])>0.01) on=i; } return {rmsDb:+(10*Math.log10(q/sr)).toFixed(1), onsetMs:Math.round(on/sr*1000)}; };
    out.synth=await level(mk('E-piano',[{s:0,l:8,p:60,v:0.85,x:true}])); out.piano=await level(mk('Piano',[{s:0,l:8,p:60,v:0.85,x:true}]));
    // pitch: render A4 (69) from the nearest sample, find its frequency
    const t=mk('Piano',[{s:0,l:8,p:69,v:0.85,x:true}]), b2=await renderStem(t), d=b2.getChannelData(0), sr=b2.sampleRate, N=8192, s0=Math.round(0.2*sr); let best=0,bf=0; for(let f=400;f<480;f+=0.25){ let re=0,im=0; for(let i=0;i<N;i++){ const a=2*Math.PI*f*i/sr; re+=d[s0+i]*Math.cos(a); im+=d[s0+i]*Math.sin(a); } const m=re*re+im*im; if(m>best){best=m;bf=f;} } out.a4Hz=bf;
    for(const v of [0.3,0.6,0.95]) out['v'+v]=(await level(mk('Piano',[{s:0,l:8,p:60,v,x:true}]))).rmsDb;
    const ch=mk('Piano',[{s:0,l:8,p:57,v:.8,x:true},{s:8,l:8,p:55,v:.8,x:true}]); ch.chordType='triad'; out.chord=await level(ch);
    { const st=mk('Strings',[{s:0,l:32,p:69,v:0.8,x:true}],'pad'); S.bars=2; out.strings={loaded:await loadSampled('Strings')}; const bs=await renderStem(st), ds=bs.getChannelData(0), srs=bs.sampleRate; const seg=(a)=>{ let q=0; for(let i=Math.floor(a*srs);i<Math.floor((a+0.25)*srs);i++) q+=ds[i]*ds[i]; return +(10*Math.log10(q/(0.25*srs)+1e-12)).toFixed(1); }; out.strings.at1s=seg(1); out.strings.at3_5s=seg(3.5); }
    out.epiano={loaded:await loadSampled('E-piano'), layers:SMP.epiano.layers.map(L=>L.regs.length), level:(await level(mk('E-piano',[{s:0,l:8,p:60,v:0.85,x:true}]))).rmsDb};
    const ep=mk('E-piano',[{s:0,l:8,p:69,v:0.85,x:true}]), b3=await renderStem(ep), d3=b3.getChannelData(0); let best3=0,bf3=0; for(let f=420;f<460;f+=0.25){ let re=0,im=0; for(let i=0;i<N;i++){ const a=2*Math.PI*f*i/sr; re+=d3[s0+i]*Math.cos(a); im+=d3[s0+i]*Math.sin(a); } const m=re*re+im*im; if(m>best3){best3=m;bf3=f;} } out.epiano.a4Hz=bf3;
    // Rock bass and Guitar: right pitch across the range (autocorrelation), and at the synth's level in the mix
    { const ac=(d,sr)=>{ const s=d.slice(Math.round(0.25*sr),Math.round(0.25*sr)+16384); const nc=tau=>{ let c=0,e1=0,e2=0; for(let i=0;i+tau<s.length;i+=2){ c+=s[i]*s[i+tau]; e1+=s[i]*s[i]; e2+=s[i+tau]*s[i+tau]; } return c/Math.sqrt(e1*e2+1e-12); }; let best=-1,bt=0; for(let tau=Math.round(sr/1200);tau<Math.round(sr/25);tau++){ const v=nc(tau); if(v>best+0.02){ best=v; bt=tau; } }
        while(nc(bt+1)>nc(bt)) bt++; const y0=nc(bt-1), y1=nc(bt), y2=nc(bt+1), fr=bt+0.5*(y0-y2)/(y0-2*y1+y2||1);   /* the peak between samples */
        return 69+12*Math.log2(sr/fr/440); };
      const rms=b=>{ let q=0,n=0; for(let c=0;c<b.numberOfChannels;c++){ const d=b.getChannelData(c); for(let i=0;i<d.length;i++){ q+=d[i]*d[i]; n++; } } return 10*Math.log10(q/n+1e-12); };
      for(const [snd,syn,inst,ms] of [['Rock bass','Synth bass','bass',[28,33,36,40,45,50,55]],['Guitar','Pluck','lead',[45,52,57,59,60,61,64,69,76]]]){ const o=out[snd]={loaded:await loadSampled(snd)}; o.worstCents=0;
        for(const m of ms){ const t=mk(snd,[{s:0,l:12,p:m,v:.85,x:true}],inst); t.oct=0; const bb=await renderStem(t); { const c=Math.round(100*(ac(bb.getChannelData(0),bb.sampleRate)-m)); (o.cents=o.cents||[]).push(c); o.worstCents=Math.max(o.worstCents,Math.abs(c)); } }
        const line=s=>{ const t=mk(s,[33,36,40,38,33,31,36,40].map((m,i)=>({s:i*4,l:4,p:m+(inst==='lead'?24:0),v:.8,x:true})),inst); t.oct=0; return t; };
        o.vsSynthDb=+(rms(await renderStem(line(snd)))-rms(await renderStem(line(syn)))).toFixed(1); } }
    return out; });
  console.log(JSON.stringify(r,null,1),errs); await b.close(); })();
