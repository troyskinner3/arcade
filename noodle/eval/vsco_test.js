// Marimba, Glockenspiel, Flute and Horns (VS Chamber Orchestra CE): they load, play in tune across their range (Glockenspiel: below its range
// it plays an octave or two up), stay under full scale, and sit at their neighbours' level (Piano/Saw, Bell, Saw, Warm pad).
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const r=await p.evaluate(async()=>{ ensureCtx(); S.bpm=100; S.bars=2; const out={};
    const mk=(inst,sound,notes)=>{ const t=mkTrack(inst,{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,sound,notes}); t.oct=0; t.chordType='off'; t.tone=50; return t; };
    const pitch=(d,sr,a,m0)=>{ const L=4096, i0=Math.round(a*sr), k0=sr/mtof(m0), nc=k=>{ let c=0,e1=0,e2=0; for(let i=i0;i<i0+L;i++){ c+=d[i]*d[i+k]; e1+=d[i]*d[i]; e2+=d[i+k]*d[i+k]; } return c/Math.sqrt(e1*e2+1e-12); }; let bk=0,bv=-2; for(let k=Math.floor(k0/1.08);k<=Math.ceil(k0*1.08);k++){ const v=nc(k); if(v>bv){ bv=v; bk=k; } } const y0=nc(bk-1),y1=nc(bk),y2=nc(bk+1); return 69+12*Math.log2(sr/(bk+0.5*(y0-y2)/(y0-2*y1+y2))/440); };
    for(const [snd,inst,ms,at] of [['Marimba','keys',[43,48,55,60,62,67,72,79,84],0.25],['Flute','lead',[60,62,65,69,72,76,79,84,88],0.5],['Horns','pad',[36,40,43,48,52,55,60,64,67,72],0.5]]){
      out[snd]={loaded:await loadSampled(snd), cents:[]}; for(const m of ms){ const bb=await renderStem(mk(inst,snd,[{s:0,l:16,p:m,v:.8,x:true}])); out[snd].cents.push(Math.round(100*(pitch(bb.getChannelData(0),bb.sampleRate,at,m)-m))); } }
    out.Glockenspiel={loaded:await loadSampled('Glockenspiel')};
    { const lo=SMP.glock.layers[0].regs.map(r=>r.root); out.Glockenspiel.lowest=Math.min(...lo); const L=SMP.glock.layers[0];
      // which recording and rate a note below the range uses: render a low note and a note two octaves up; they should match
      const a=await renderStem(mk('arp','Glockenspiel',[{s:0,l:8,p:60,v:.8,x:true}])), c=await renderStem(mk('arp','Glockenspiel',[{s:0,l:8,p:84,v:.8,x:true}])); let diff=0, q=0; const x=a.getChannelData(0), y=c.getChannelData(0); for(let i=0;i<x.length;i+=3){ diff+=Math.abs(x[i]-y[i]); q+=Math.abs(y[i]); } out.Glockenspiel.lowPlaysUp=diff/q<0.01; }
    out.peakDb={}; for(const [snd,inst] of [['Marimba','keys'],['Glockenspiel','arp'],['Flute','lead'],['Horns','pad']]){ const notes=[[57,60,64],[55,59,62]].flatMap((ch,i)=>ch.map(m=>({s:i*16,l:16,p:m+(snd==='Flute'?12:0),v:1,x:true}))); const bb=await renderStem(mk(inst,snd,notes)); let pk=0; for(let c=0;c<2;c++){ const d=bb.getChannelData(c); for(let i=0;i<d.length;i++) pk=Math.max(pk,Math.abs(d[i])); } out.peakDb[snd]=+(20*Math.log10(pk)).toFixed(1); }
    return out; });
  const bad=['Marimba','Flute','Horns'].some(k=>!r[k].loaded||r[k].cents.some(c=>Math.abs(c)>15))||!r.Glockenspiel.loaded||!r.Glockenspiel.lowPlaysUp||Object.values(r.peakDb).some(x=>x>6); if(bad) errs.push('VSCO sounds out of range');
  console.log(JSON.stringify(r),errs); await b.close(); })();
