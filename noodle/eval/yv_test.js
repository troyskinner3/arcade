// "Your voice": from each real phone take, the moment it picks (found? how steady), pitch when played at other notes, and whether the
// loop holds steady (largest level jump between 20 ms frames over a 3 s note). Writes a few demos to results/yv/. Usage: node mm/yv_test.js
const {chromium,devices}=require('playwright'); const fs=require('fs'); const D=__dirname+'/data/user';
const wav=f=>{ const b=fs.readFileSync(f); let o=12, sr=0, ch=1, data=null; while(o<b.length){ const id=b.toString('ascii',o,o+4), n=b.readUInt32LE(o+4); if(id==='fmt '){ ch=b.readUInt16LE(o+10); sr=b.readUInt32LE(o+12); } if(id==='data'){ data=b.subarray(o+8,o+8+n); break; } o+=8+n+(n&1); }
  const N=data.length/2/ch, x=new Array(N); for(let i=0;i<N;i++) x[i]=data.readInt16LE(i*2*ch)/32768; return {x,sr}; };
(async()=>{ const files=fs.readdirSync(D).filter(f=>/^2.*-(hum|la|da|mm|words|vowels|swell|whistle)-lead\.wav$/.test(f)).sort(); const pick=(process.env.ONLY||'').split(',').filter(Boolean);
  const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900); fs.mkdirSync(__dirname+'/results/yv',{recursive:true});
  const rows=[];
  for(const f of files){ const {x,sr}=wav(D+'/'+f); const demo=['scale-la','long-vowels','joy-la','scale-hum','mary-hum','ode-whistle'].some(k=>f.includes(k));
    const r=await p.evaluate(async({x,sr,demo})=>{ ensureCtx(); const X=Float32Array.from(x); S.tracks=[]; S.yv=null; S.bpm=90; S.bars=2;
      const t=mkTrack('lead',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,sound:'Your voice',notes:[]}); t._raw={x:X,sr}; t._an=analyzeTake(X,sr,'lead',S.sens,true); S.tracks.push(t);
      const ms=yvMoments(); if(!yvCapture()) return {found:false};
      const M=ms[0], out={found:true, moments:ms.length, root:S.yv.root, loopMs:Math.round((S.yv.le-S.yv.ls)/S.yv.sr*1000), score:+M.sc.toFixed(2)};
      const ac=(d,sr0,a,m0)=>{ const L=4800, i0=Math.round(a*sr0), k0=sr0/mtof(m0), nc=k=>{ let c=0,e1=0,e2=0; for(let i=i0;i<i0+L;i++){ c+=d[i]*d[i+k]; e1+=d[i]*d[i]; e2+=d[i+k]*d[i+k]; } return c/Math.sqrt(e1*e2+1e-12); }; let bk=0,bv=-2; for(let k=Math.floor(k0/1.09);k<=Math.ceil(k0*1.09);k++){ const v=nc(k); if(v>bv){ bv=v; bk=k; } } const y0=nc(bk-1),y1=nc(bk),y2=nc(bk+1); return 69+12*Math.log2(sr0/(bk+0.5*(y0-y2)/(y0-2*y1+y2))/440); };   /* near the note asked for, refined between samples */
      out.cents=[]; out.jumpDb=0; const R=Math.round(S.yv.root);
      for(const [inst,dm] of [['lead',-5],['lead',0],['lead',7],['pad',-12],['pad',3]]){ const tt=mkTrack(inst,{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,sound:'Your voice',notes:[{s:0,l:24,p:R+dm,v:.8,x:true}]}); tt.oct=0; tt.chordType='off'; tt.tone=60;
        const bb=await renderStem(tt), d=bb.getChannelData(0); if(inst==='lead') { const tt1=mkTrack('lead',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,sound:'Your voice',notes:[{s:0,l:24,p:R+dm,v:.8,x:true}]}); tt1.oct=0; tt1.chordType='off'; const sv=yvVoice; const rd=[0.6,1.0,1.4,1.8].map(q=>100*(ac(d,bb.sampleRate,q,R+dm)-(R+dm))).sort((a,b)=>a-b); out.cents.push(Math.round((rd[1]+rd[2])/2)); out.wander=Math.max(out.wander||0,Math.round(rd[3]-rd[0])); }
        const fr=Math.round(bb.sampleRate*0.02), lv=[]; for(let i=Math.round(0.5*bb.sampleRate);i+fr<Math.round(3.4*bb.sampleRate);i+=fr){ let q=0; for(let j=0;j<fr;j++) q+=d[i+j]*d[i+j]; lv.push(10*Math.log10(q/fr+1e-12)); }
        for(let i=1;i<lv.length;i++) out.jumpDb=Math.max(out.jumpDb,+Math.abs(lv[i]-lv[i-1]).toFixed(1)); }
      if(demo){ const mel=[[0,4,0],[4,4,2],[8,4,4],[12,4,5],[16,8,7],[24,4,5],[28,4,4]], tl=mkTrack('lead',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,sound:'Your voice',notes:mel.map(([s,l,d])=>({s,l,p:R+d,v:.8,x:true}))}); tl.oct=0; tl.chordType='off'; tl.tone=60;
        const tp=mkTrack('pad',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,sound:'Your voice',notes:[[R-12,R-5,R],[R-10,R-7,R-3]].flatMap((ch,i)=>ch.map(m=>({s:i*16,l:16,p:m,v:.7,x:true})))}); tp.oct=0; tp.chordType='off'; tp.tone=55;
        const a=await renderStem(tl), c=await renderStem(tp), n=Math.min(a.length,c.length), mix=new Float32Array(n*2); for(let i=0;i<n;i++){ mix[2*i]=0.8*a.getChannelData(0)[i]+0.7*c.getChannelData(0)[i]; mix[2*i+1]=0.8*a.getChannelData(1)[i]+0.7*c.getChannelData(1)[i]; }
        out.demo=Array.from(mix,v=>Math.round(clamp(v,-1,1)*32767)); out.demoSr=a.sampleRate; }
      return out; },{x,sr,demo});
    if(r.demo){ const n=r.demo.length, B=Buffer.alloc(44+n*2); B.write('RIFF',0); B.writeUInt32LE(36+n*2,4); B.write('WAVEfmt ',8); B.writeUInt32LE(16,16); B.writeUInt16LE(1,20); B.writeUInt16LE(2,22); B.writeUInt32LE(r.demoSr,24); B.writeUInt32LE(r.demoSr*4,28); B.writeUInt16LE(4,32); B.writeUInt16LE(16,34); B.write('data',36); B.writeUInt32LE(n*2,40); for(let i=0;i<n;i++) B.writeInt16LE(r.demo[i],44+i*2);
      fs.writeFileSync(__dirname+'/results/yv/'+f.replace(/^\d+-\d+-/,'').replace('.wav','')+'.wav',B); delete r.demo; delete r.demoSr; }
    rows.push(r); r.f=f; console.log(f.replace(/^\d+-\d+-/,'').padEnd(26), JSON.stringify(r)); }
  const ok=rows.filter(r=>r.found); const wc=Math.max(...ok.flatMap(r=>r.cents.map(Math.abs))), wj=Math.max(...ok.map(r=>r.jumpDb)); console.log('found', ok.length,'/',rows.length, '| worst cents', wc, '| worst jump dB', wj, '| median wander', ok.map(r=>r.wander).sort((a,b)=>a-b)[ok.length>>1], 'worst', Math.max(...ok.map(r=>r.wander))); const sung=rows.filter((r,i)=>!/whistle/.test(files[i])).length; if(ok.length<sung*0.85||wc>20||wj>8) errs.push('Your voice check out of range'); console.log(errs); await b.close(); })();
