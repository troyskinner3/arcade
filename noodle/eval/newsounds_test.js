// New sounds (wavetable and coded): each plays (not silent, no errors) in its parts; String pluck is in tune across its range; Wobble's
// filter moves twice a beat; Pump pad dips on every beat.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const r=await p.evaluate(async()=>{ ensureCtx(); S.bpm=120; S.bars=2; const out={};
    const mk=(inst,sound,notes,tone=50)=>{ const t=mkTrack(inst,{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,sound,notes}); t.oct=0; t.chordType='off'; t.tone=tone; return t; };
    const db=(d,a,z,sr)=>{ let q=0; for(let i=Math.round(a*sr);i<Math.round(z*sr);i++) q+=d[i]*d[i]; return 10*Math.log10(q/Math.max(1,Math.round((z-a)*sr))+1e-12); };
    out.plays={}; for(const [inst,snd] of [['lead','Glass'],['lead','Chip'],['lead','Theremin'],['pad','Vowel pad'],['pad','Digital pad'],['bass','Growl'],['bass','Acid'],['bass','Wobble'],['keys','String pluck'],['arp','String pluck'],['pad','Chorus pad'],['pad','Pump pad'],['arp','Chip'],['arp','Glass']]){
      const bb=await renderStem(mk(inst,snd,[{s:0,l:8,p:inst==='bass'?40:60,v:.8,x:true},{s:8,l:8,p:inst==='bass'?43:64,v:.8,x:true}])); out.plays[inst+'/'+snd]=+db(bb.getChannelData(0),0,1.9,bb.sampleRate).toFixed(1); }
    const pitch=(d,sr,a,m0)=>{ const L=4096, i0=Math.round(a*sr), k0=sr/mtof(m0), nc=k=>{ let c=0,e1=0,e2=0; for(let i=i0;i<i0+L;i++){ c+=d[i]*d[i+k]; e1+=d[i]*d[i]; e2+=d[i+k]*d[i+k]; } return c/Math.sqrt(e1*e2+1e-12); }; let bk=0,bv=-2; for(let k=Math.floor(k0/1.08);k<=Math.ceil(k0*1.08);k++){ const v=nc(k); if(v>bv){ bv=v; bk=k; } } const y0=nc(bk-1),y1=nc(bk),y2=nc(bk+1); return 69+12*Math.log2(sr/(bk+0.5*(y0-y2)/(y0-2*y1+y2))/440); };
    out.pluckCents={}; for(const m of [40,48,55,60,67,72,79,84]){ const bb=await renderStem(mk('keys','String pluck',[{s:0,l:16,p:m,v:.8,x:true}])); out.pluckCents[m]=Math.round(100*(pitch(bb.getChannelData(0),bb.sampleRate,0.15,m)-m)); }
    { const bb=await renderStem(mk('bass','Wobble',[{s:0,l:32,p:40,v:.8,x:true}])), d=bb.getChannelData(0), sr=bb.sampleRate, fr=Math.round(sr*0.01), br=[]; for(let i=Math.round(0.2*sr);i+fr<Math.round(3.8*sr);i+=fr){ let a=0,q=0; for(let j=i+1;j<i+fr;j++){ a+=(d[j]-d[j-1])**2; q+=d[j]*d[j]; } br.push(Math.sqrt(a/(q+1e-12))); }
      const mn=br.reduce((x,y)=>x+y,0)/br.length, z=br.map(x=>x-mn), ac=k=>{ let c=0; for(let i=0;i+k<z.length;i++) c+=z[i]*z[i+k]; return c; }; let bk=10,bv=-1e9; for(let k=10;k<=60;k++){ const v=ac(k); if(v>bv){ bv=v; bk=k; } } out.wobblePerBeat=+((stepDur()*4)/(bk*0.01)).toFixed(2); }   /* the brightness curve repeats every bk x 10 ms */
    { const bb=await renderStem(mk('pad','Pump pad',[{s:0,l:32,p:60,v:.8,x:true}])), d=bb.getChannelData(0), sr=bb.sampleRate, beat=stepDur()*4, dips=[]; for(let k=1;k<7;k++){ const bt=k*beat; dips.push(+(db(d,bt-0.09,bt-0.01,sr)-db(d,bt+0.01,bt+0.09,sr)).toFixed(1)); } out.pumpDipDb=dips; }
    return out; });
  const bad=Object.values(r.plays).some(x=>x<-45)||Object.values(r.pluckCents).some(c=>Math.abs(c)>10)||Math.abs(r.wobblePerBeat-2)>0.3||(r.pumpDipDb.reduce((a,b)=>a+b,0)/r.pumpDipDb.length<8||Math.min(...r.pumpDipDb)<3); if(bad) errs.push('a new sound is out of range');
  console.log(JSON.stringify(r,null,1),errs); await b.close(); })();
