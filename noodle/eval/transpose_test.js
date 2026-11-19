// Changing the key moves the song: melody notes (drawn and sung) shift by the nearest interval, drums stay, a vocal take is pitch-shifted by the
// same amount (measured), Undo puts it all back; Auto-detect moves nothing.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(900);
  const r=await p.evaluate(async()=>{ ensureCtx(); const out={};
    const sr=48000, x=new Float32Array(sr*2); for(let i=0;i<x.length;i++) x[i]=0.4*Math.sin(2*Math.PI*220*i/sr)+0.15*Math.sin(2*Math.PI*440*i/sr);   /* a sung A3 */
    const o=defaultState(); o.bpm=120; o.bars=2; o.pid=projId(); o.tracks=[mkTrack('lead',{id:900,off:0,len:2,rep:false,lenSet:true,sound:'Saw',notes:[57,60,64,62,60,57,59,57].map((m,i)=>({s:i*4,l:4,p:m,v:.8,x:true}))}), mkTrack('bass',{id:901,off:0,len:2,rep:false,lenSet:true,sound:'Sub',notes:[{s:0,l:16,p:45.2,v:.8},{s:16,l:16,p:40.1,v:.8}]}), mkTrack('kit',{id:902,off:0,len:2,rep:false,lenSet:true,sound:'Punchy',hits:[{s:0,d:'kick',v:.8}]}), mkTrack('vox',{id:903,off:0,len:2,rep:false,lenSet:true,sound:'Natural'})];
    await projLoadState(o); const v=S.tracks.find(t=>t.inst==='vox'); v._raw={x,sr}; v.va=0; v.vn=[{t:0,l:1.5,p:57}]; keyCache=null;
    const pit=()=>S.tracks.filter(t=>t.notes).map(t=>t.notes.map(pitchOf).join(',')); out.key0=currentKey().tonic; out.before=pit(); flushSave();
    const f0=()=>{ const y=voxTuned(v), s=y.subarray(sr/2,sr/2+8192); const nc=k=>{ let c=0,a=0,b=0; for(let i=0;i+k<s.length;i++){ c+=s[i]*s[i+k]; a+=s[i]*s[i]; b+=s[i+k]*s[i+k]; } return c/Math.sqrt(a*b); }; let bk=0,bv=-2; for(let k=80;k<400;k++){ const q=nc(k); if(q>bv){ bv=q; bk=k; } } return +(sr/bk).toFixed(1); };
    out.vox0=f0();
    setKey('0'); out.toC={key:S.key, notes:pit(), hits:S.tracks.find(t=>t.hits).hits[0].d, vt:v.vt, vox:f0(), msg:lastMsg}; flushSave();
    setKey('7'); out.toG={notes:pit(), vt:v.vt};   /* C to G: down 5 is nearer than up 7 */
    flushSave(); undo(); undo(); await new Promise(r=>setTimeout(r,200)); out.undone={notes:pit(), vt:S.tracks.find(t=>t.inst==='vox').vt||0};
    setKey('auto'); out.auto=pit();
    return out; });
  const ok=r.key0===9&&r.toC.notes[0]==='60,63,67,65,63,60,62,60'&&r.toC.notes[1]==='48,43'&&r.toC.hits==='kick'&&r.toC.vt===3&&Math.abs(r.toC.vox-261.6)<4&&/up 3 semitones to C/.test(r.toC.msg)&&r.toG.notes[0]==='55,58,62,60,58,55,57,55'&&r.toG.vt===-2&&JSON.stringify(r.undone.notes)===JSON.stringify(r.before)&&r.undone.vt===0&&JSON.stringify(r.auto)===JSON.stringify(r.before);
  if(!ok) errs.push('transpose check failed'); console.log(JSON.stringify(r),errs); await b.close(); })();
