// Learning from fixes: after fixing recorded notes in a part, closing the editor adds that part's sung-vs-shown intervals to the
// interval profile (S.sq) once; editing it again replaces its share. A narrow singer's fixes turn the allowance on; an accurate singer's don't.
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000);
  const r=await p.evaluate(()=>{ S.key='0'; S.scale='major'; S.sq=null; keyCache=null;
    // meant: C E G C' G E C (up 4, up 3, up 5, down 5, down 3, down 4) sung with upward jumps at 60% width
    const meant=[60,64,67,72,67,64,60,64,67,72,67,64,60,64,67,72,67,64,60,64,67,72,67,64,60]; let sung=[meant[0]]; for(let i=1;i<meant.length;i++){ const d=meant[i]-meant[i-1]; sung.push(sung[i-1]+(d>0?d*0.6:d)); }
    const mk=ps=>mkTrack('lead',{id:S.nextId++,off:0,len:4,rep:false,lenSet:true,notes:ps.map((p,i)=>({s:i*2,l:2,p:+p.toFixed(2),v:.8}))});
    const tr=mk(sung); S.tracks.push(tr); renderTracks(); const out={};
    const fixAll=t=>t.notes.forEach((n,i)=>{ const want=meant[i]-meant[0]+Math.round(sung[0]); if(pitchOf(n)!==want){ n.r0=+n.p; n.p=want; n.x=true; } });
    s2Edit(tr); fixAll(tr); s2EdClose(); out.after1={nu:S.sq.nu, ratio:+(S.sq.xyu/S.sq.xxu).toFixed(2), on:squeezeOn()};
    s2Edit(tr); s2EdClose(); out.again={nu:S.sq.nu};   /* the same part again: replaced, not added */
    const t2=mk(meant.map(m=>m+0.1)); S.tracks.push(t2); s2Edit(t2); t2.notes[3].r0=+t2.notes[3].p; t2.notes[3].p=71; t2.notes[3].x=true; s2EdClose(); out.accurate=+(S.sq.xyu/S.sq.xxu).toFixed(2);
    // an accurate singer alone (one wrong reading fixed) stays off
    S.sq=null; tr.sqc=null; S.tracks=[t2]; delete t2.sqc; s2Edit(t2); s2EdClose(); out.accurateOnly={on:squeezeOn(), nu:S.sq.nu};
    return out; });
  const want={after1:{nu:12,ratio:0.6,on:true},again:{nu:12},accurateOnly:{on:false,nu:12}};
  for(const [k,v] of Object.entries(want)) if(JSON.stringify(r[k])!==JSON.stringify(v)) errs.push(k+': '+JSON.stringify(r[k])+' want '+JSON.stringify(v));
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
