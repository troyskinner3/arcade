// The recorded Rock kit: loads, every recorded drum plays (level vs the synth Rock kit, per drum), velocity spans a range, Tone tunes it,
// a closed hat cuts a ringing open hat, and a groove sits at the synth kit's level. Drums it doesn't have still play (synth).
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const r=await p.evaluate(async()=>{ ensureCtx(); S.bpm=100; S.bars=1; const out={};
    const db=(bb,a=0,z=1e9)=>{ let q=0,n=0; for(let c=0;c<2;c++){ const d=bb.getChannelData(c); for(let i=Math.round(a*bb.sampleRate);i<Math.min(d.length,Math.round(z*bb.sampleRate));i++){ q+=d[i]*d[i]; n++; } } return +(10*Math.log10(q/Math.max(1,n)+1e-12)).toFixed(1); };
    const pk=bb=>{ let m=0; for(let c=0;c<2;c++){ const d=bb.getChannelData(c); for(let i=0;i<d.length;i++) m=Math.max(m,Math.abs(d[i])); } return +(20*Math.log10(m+1e-9)).toFixed(1); };
    const mk=(sound,hits,tone=50)=>{ const t=mkTrack('kit',{id:S.nextId++,off:0,len:1,rep:false,lenSet:true,sound,hits}); t.tone=tone; return t; };
    out.loaded=await loadSmp('rockkit'); out.drums=Object.keys(SMP.rockkit.slots).length;
    out.per={}; for(const d of ['kick','snare','rim','hat','openhat','tomhi','tommid','tomlo','crash','ride','clap']){ const h=[{s:0,d,v:.85}]; const a=await renderStem(mk('Rock',h)); delete KIT_SAMPLED.Rock; const z=await renderStem(mk('Rock',h)); KIT_SAMPLED.Rock='rockkit';
      out.per[d]={rec:db(a,0,0.5), syn:db(z,0,0.5), recPk:pk(a), synPk:pk(z)}; }
    out.vel=[]; for(const v of [0.2,0.45,0.7,0.95]) out.vel.push(db(await renderStem(mk('Rock',[{s:0,d:'snare',v}])),0,0.4));
    const zc=bb=>{ const d=bb.getChannelData(0); let e=0,w=0; for(let i=1;i<bb.sampleRate*0.3;i++){ e+=(d[i]-d[i-1])**2; w+=d[i]*d[i]; } return Math.round(bb.sampleRate/(2*Math.PI)*Math.sqrt(e/w)); };
    out.toneHz=[0,50,100].map(async x=>0); out.toneHz=[]; for(const T of [0,50,100]) out.toneHz.push(zc(await renderStem(mk('Rock',[{s:0,d:'tomlo',v:.85}],T))));
    { const a=await renderStem(mk('Rock',[{s:0,d:'openhat',v:.9}])), c=await renderStem(mk('Rock',[{s:0,d:'openhat',v:.9},{s:4,d:'hat',v:.3}])), st=4*stepDur()+0.15; out.choke={ring:db(a,st,st+0.3), cut:db(c,st,st+0.3)}; }
    const groove=[]; for(let s=0;s<16;s++){ groove.push({s,d:'hat',v:s%2?0.55:0.8}); if(s%8===0) groove.push({s,d:'kick',v:.9}); if(s%8===4) groove.push({s,d:'snare',v:.9}); }
    { const a=await renderStem(mk('Rock',groove)); delete KIT_SAMPLED.Rock; const z=await renderStem(mk('Rock',groove)); KIT_SAMPLED.Rock='rockkit'; out.groove={rec:db(a,0,2.4), syn:db(z,0,2.4), recPk:pk(a), synPk:pk(z)}; }
    return out; });
  console.log(JSON.stringify(r,null,1),errs); await b.close(); })();
