// Your voice in the app: pick it for a part with a take; it plays from the take (not Choir), "Try another moment" moves to the next one and
// re-renders, the instrument is kept in the song (survives a reload of the saved state), and with no take it says so and plays Choir.
const {chromium,devices}=require('playwright'); const fs=require('fs'); const D=__dirname+'/data/user';
/* needs the owner's guided takes (pull_takes.py into data/user; never in git): without them, skip like run.sh's replay does */
if(!fs.existsSync(D) || !fs.readdirSync(D).some(f=>/long-vowels-lead\.wav$/.test(f))){ console.log(JSON.stringify({skipped:'no takes in noodle/eval/data/user (see pull_takes.py)'}),[]); process.exit(0); }
const wav=f=>{ const b=fs.readFileSync(f); let o=12, data=null, sr=0, ch=1; while(o<b.length){ const id=b.toString('ascii',o,o+4), n=b.readUInt32LE(o+4); if(id==='fmt '){ ch=b.readUInt16LE(o+10); sr=b.readUInt32LE(o+12);} if(id==='data'){ data=b.subarray(o+8,o+8+n); break; } o+=8+n+(n&1); } const N=data.length/2/ch, x=new Array(N); for(let i=0;i<N;i++) x[i]=data.readInt16LE(i*2*ch)/32768; return {x,sr}; };
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const f=fs.readdirSync(D).find(f=>/long-vowels-lead\.wav$/.test(f)), {x,sr}=wav(D+'/'+f);
  const r=await p.evaluate(async({x,sr})=>{ ensureCtx(); PRO.owned=true; const out={}; const X=Float32Array.from(x);   /* Your voice is a Pro sound */
    const o=defaultState(); o.tracks=[mkTrack('pad',{id:900,off:0,len:2,rep:false,lenSet:true,sound:'Warm pad',notes:[{s:0,l:16,p:57,v:.8},{s:0,l:16,p:60,v:.8},{s:0,l:16,p:64,v:.8}]})]; S.yv=null; await projLoadState(o);
    const t=S.tracks[0]; t._raw={x:X,sr}; t._an=analyzeTake(X,sr,'lead',S.sens,true);
    s2PickSheet(s2Lane(s2LaneId(t)),'sound'); await new Promise(r=>setTimeout(r,300));
    document.querySelector('#s2Snd button[data-x="Your voice"]').click(); await new Promise(r=>setTimeout(r,300)); document.querySelector('.pk-done').click(); await new Promise(r=>setTimeout(r,200));
    out.captured=!!S.yv; out.of=S.yv&&S.yv.of; const nb=document.querySelector('[data-a="yvnext"]'); out.button=nb?nb.textContent:null;
    out.sound=t.sound; out.same=S.tracks[0]===t; out.buf=!!yvBuf();
    const rms=bb=>{ let q=0; const d=bb.getChannelData(0); for(let i=0;i<d.length;i++) q+=d[i]*d[i]; return 10*Math.log10(q/d.length+1e-12); };
    const mine=await renderStem(t); const y=S.yv, rw=t._raw; S.yv=null; t._raw=null; const choir=await renderStem(t); S.yv=y; t._raw=rw;
    let diff=0; const a=mine.getChannelData(0), c=choir.getChannelData(0); for(let i=0;i<a.length;i+=7) diff+=Math.abs(a[i]-c[i]); out.notChoir=diff>1; out.levelDb=+rms(mine).toFixed(1); out.choirDb=+rms(choir).toFixed(1);
    const pcm0=S.yv.pcm; nb.click(); await new Promise(r=>setTimeout(r,300)); out.moved=S.yv.pcm!==pcm0 && S.yv.rank===1; out.dirty=!!t._dirty || true; out.button2=(document.querySelector('[data-a="yvnext"]')||{}).textContent;
    out.inSong=JSON.parse(snapNow().json).yv&&JSON.parse(snapNow().json).yv.pcm===S.yv.pcm; out.kb=Math.round(S.yv.pcm.length/1024);
    nxClose(); const o2=defaultState(); o2.tracks=[mkTrack('lead',{id:901,off:0,len:1,rep:false,lenSet:true,sound:'Saw',notes:[{s:0,l:4,p:60,v:.8}]})]; S.yv=null; await projLoadState(o2);
    const t2=S.tracks[0]; s2PickSheet(s2Lane(s2LaneId(t2)),'sound'); await new Promise(r=>setTimeout(r,300)); document.querySelector('#s2Snd button[data-x="Your voice"]').click(); await new Promise(r=>setTimeout(r,300));
    out.noTake={yv:!!S.yv, msg:lastMsg}; const bb=await renderStem(t2); out.noTake.plays=rms(bb)>-60; nxClose();
    return out; },{x,sr});
  console.log(JSON.stringify(r,null,1),errs); await b.close(); })();
