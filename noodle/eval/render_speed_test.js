// Rendering a part makes each note just before it plays: the same sound as making them all first (compared sample by sample, every kind of
// part: synth stacks, sampled instruments, arp, drums, sliding notes, a part's own envelope, Your voice, String pluck), and much faster on long parts.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const r=await p.evaluate(async()=>{ ensureCtx(); const out={}; S.bpm=110; S.bars=12; const ch=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]];
    const mk=(inst,sound,notes,extra={})=>{ const t=mkTrack(inst,{id:S.nextId++,off:0,len:12,rep:false,lenSet:true,sound,notes,...extra}); t.oct=0; t.chordType='off'; return t; };
    const cases={ pad:mk('pad','Warm pad',Array.from({length:12},(_,i)=>ch[i%4].map(m=>({s:i*16,l:16,p:m,v:.7,x:true}))).flat()),
      supersaw:mk('lead','Supersaw',Array.from({length:48},(_,i)=>({s:i*4,l:3,p:64+[0,2,4,7][i%4],v:.8,x:true}))),
      slides:(()=>{ const t=mk('lead','Saw',Array.from({length:24},(_,i)=>({s:i*8,l:8,p:60+[0,5,3,7][i%4],v:.8,x:true,g:i>0}))); t.slides=true; return t; })(),
      adsr:(()=>{ const t=mk('lead','Square',Array.from({length:24},(_,i)=>({s:i*8,l:6,p:62,v:.8,x:true}))); t.adsr={a:0.2,d:0.3,s:0.5,r:0.6}; return t; })(),
      piano:mk('keys','Piano',Array.from({length:24},(_,i)=>({s:i*8,l:6,p:57+[0,4,7,12][i%4],v:.8,x:true}))),
      pluck:mk('keys','String pluck',Array.from({length:24},(_,i)=>({s:i*8,l:6,p:48+[0,4,7,12][i%4],v:.8,x:true}))),
      arp:mk('arp','Pluck',Array.from({length:12},(_,i)=>({s:i*16,l:16,p:ch[i%4][0],v:.8,x:true}))),
      drums:(()=>{ const t=mkTrack('kit',{id:S.nextId++,off:0,len:12,rep:false,lenSet:true,sound:'Rock',hits:Array.from({length:96},(_,i)=>({s:i*2,d:i%4==0?'kick':i%4==2?'snare':i%8==1?'openhat':'hat',v:.8}))}); return t; })() };
    await loadSampled('Piano'); await loadSmp('rockkit');
    for(const [k,t] of Object.entries(cases)){ window.RENDER_EAGER=true; let a0=performance.now(); const A=await renderStem(t); const ta=performance.now()-a0; window.RENDER_EAGER=false; a0=performance.now(); const B=await renderStem(t); const tb=performance.now()-a0;
      let worst=0, pk=0; for(let c=0;c<2;c++){ const x=A.getChannelData(c), y=B.getChannelData(c); for(let i=0;i<x.length;i++){ worst=Math.max(worst,Math.abs(x[i]-y[i])); pk=Math.max(pk,Math.abs(x[i])); } }
      out[k]={diffDb:worst>0?+(20*Math.log10(worst/pk)).toFixed(1):-999, before:Math.round(ta), after:Math.round(tb)}; }
    return out; });
  const bad=Object.entries(r).filter(([k,v])=>v.diffDb>-100).map(([k])=>k); if(bad.length) errs.push('not the same sound: '+bad.join(','));
  for(const [k,v] of Object.entries(r)) console.log(k.padEnd(9),JSON.stringify(v)); console.log(errs); await b.close(); })();
