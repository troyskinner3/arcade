// Reverb impulse: decay time (T30 from backward integration) per setting kept from the old one; the tail darkens (highs fade first); little
// below 100 Hz; the same every time; and a snare through the convolver comes out at about the old wet level.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const r=await p.evaluate(async()=>{ ensureCtx(); const sr=48000, out={};
    const oldIR=size=>{ const len=Math.floor(sr*(0.6+size*2.6)), b=ctx.createBuffer(2,len,sr); for(let ch=0;ch<2;ch++){ const d=b.getChannelData(ch); for(let i=0;i<len;i++){ const tt=i/len; d[i]=(Math.random()*2-1)*Math.pow(1-tt,3.2)*(i<sr*0.012?i/(sr*0.012):1); } } return b; };
    const t30=b=>{ const d=b.getChannelData(0), E=new Float64Array(d.length+1); for(let i=d.length-1;i>=0;i--) E[i]=E[i+1]+d[i]*d[i]; const L=i=>10*Math.log10(E[i]/E[0]+1e-30); let a=-1,z=-1; for(let i=0;i<d.length;i++){ if(a<0&&L(i)<=-5) a=i; if(z<0&&L(i)<=-35){ z=i; break; } } return +((z-a)/sr*2).toFixed(2); };
    const band=(b,t0,t1,lo,hi)=>{ const d=b.getChannelData(0), i0=Math.round(t0*sr), n=Math.round((t1-t0)*sr); let q=0; for(let f=lo;f<=hi;f*=1.25){ let re=0,im=0; for(let i=0;i<n;i+=2){ const ph=2*Math.PI*f*i/sr; re+=d[i0+i]*Math.cos(ph); im+=d[i0+i]*Math.sin(ph); } q+=re*re+im*im; } return q; };
    const tilt=(b,t0,t1)=>+(10*Math.log10(band(b,t0,t1,4000,12000)/band(b,t0,t1,300,1200))).toFixed(1);   /* highs vs mids, dB */
    const low=b=>+(10*Math.log10(band(b,0.05,0.35,30,90)/band(b,0.05,0.35,300,1200))).toFixed(1);
    for(const size of [0.15,0.45,0.8]){ const o=oldIR(size), n=roomIR(sr,size);
      out['size'+size]={T30:{old:t30(o),new:t30(n)}, tiltEarly:{old:tilt(o,0.03,0.13),new:tilt(n,0.03,0.13)}, tiltLate:{old:tilt(o,0.45*(0.7+3.04*size),0.45*(0.7+3.04*size)+0.1),new:tilt(n,0.45*(0.7+3.04*size),0.45*(0.7+3.04*size)+0.1)}, lowVsMid:{old:low(o),new:low(n)}}; }
    { const a=roomIR(sr,0.4), c=roomIR(sr,0.4); let same=true; for(let i=0;i<a.length;i+=97) if(a.getChannelData(1)[i]!==c.getChannelData(1)[i]) same=false; out.repeatable=same; }
    // wet level: a snare through each, normalized by the convolver as in the app
    const wet=async ir=>{ const oc=new OfflineAudioContext(2,sr*3,sr), cv=oc.createConvolver(); cv.buffer=ir; cv.connect(oc.destination); const g=oc.createGain(); g.connect(cv); drumHit(oc,g,'snare',0.05,0.9,'Punchy',0.5); const bb=await oc.startRendering(); let q=0; for(let c=0;c<2;c++){ const d=bb.getChannelData(c); for(let i=0;i<d.length;i++) q+=d[i]*d[i]; } return 10*Math.log10(q/d0(bb)); }, d0=bb=>bb.length*2;
    out.wetDb={}; for(const size of [0.15,0.45,0.8]) out.wetDb['size'+size]=+((await wet(roomIR(sr,size)))+20*Math.log10(REV_RET/0.9)-(await wet(oldIR(size)))).toFixed(1);   /* with the app's return levels: new REV_RET, old 0.9 */
    { const d=roomIR(sr,0.45).getChannelData(0); let first=0; while(Math.abs(d[first])<1e-4) first++; out.predelayMs=+(first/sr*1000).toFixed(1); }
    return out; });
  console.log(JSON.stringify(r,null,1),errs); await b.close(); })();
