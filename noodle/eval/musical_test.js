// Musical mode (testing switch, only with NOODLE_DEV): a messy take gets tidier rhythm, chord notes on strong beats, an octave slip fixed and a
// home ending. Musical mode is on for everyone (no switch); the editor's As heard / Musical swap shows once a part has a heard version; with the learned tables (and the hand-rule fallback still runs); the switch and the editor's As heard / Musical swap exist only in Xcode builds; off by default. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch(); const errs=[], out={};
  for(const dev of [false,true]){ const c=await b.newContext({...devices['iPhone 13']}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
    if(dev) await p.addInitScript(()=>{ window.NOODLE_DEV=true; });
    await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1000);
    out[dev?'dev':'store']=await p.evaluate(()=>({row:!!document.getElementById('nxDevMz'), on:musicalOn()}));
    if(!dev){ await c.close(); continue; }
    out.res=await p.evaluate(async()=>{ await loadMusical(); localStorage.setItem('noodle.musical','1'); S.key='0'; S.scale='major'; keyCache=null; S.bars=2;
      // C major: bar 1 C chord, bar 2 G chord (made by harmonize); flaws: blip (s3), off-grid start (s5), D on beat 3 (s8: the hand rules move it to the chord; the learned model may keep it as a passing note),
      // a note an octave too high (s12), phrase end on A over G (s28)
      const ns=[[0,3,60,.8],[3,1,62,.3],[5,3,64,.8],[8,4,62,.8],[12,2,79,.8],[14,2,65,.8],[16,4,67,.8],[20,4,71,.8],[24,4,74,.8],[28,4,69,.8]].map(([s,l,p,v])=>({s,l,p,v,x:true}));
      const t=mkTrack('lead',{id:S.nextId++,off:0,len:2,rep:false,lenSet:true,notes:ns}); S.tracks.push(t); keyCache=null;
      const mz=musicalize(t,t.notes), old=musicalRules(t,t.notes); return {data:!!MZ, notes:mz.map(x=>[x.s,x.l,x.p]), stat:mz.stat, vel:mz.map(x=>x.v), rules:old.map(x=>[x.s,x.l,x.p])}; });
    out.swap=await p.evaluate(async()=>{ const t=S.tracks[0]; s2Edit(t); await new Promise(q=>setTimeout(q,300)); const hid=document.getElementById('s2EdMore').hidden; musicalPass(t); s2EdMount(); await new Promise(q=>setTimeout(q,300)); const m=document.getElementById('s2EdMore'), cur=()=>{ const p=document.querySelector('#nxSheet [data-mz][aria-pressed="true"]'); return p?p.textContent:''; };
      m.click(); await new Promise(q=>setTimeout(q,200)); const r={hidBefore:hid, shown:!m.hidden, label:cur()};   /* Musical / As heard: in the editor's ••• */
      document.querySelector('#nxSheet [data-mz="0"]').click(); await new Promise(q=>setTimeout(q,200)); r.after=cur(); r.n1=S.tracks[0].notes.length; document.querySelector('#nxSheet [data-mz="1"]').click(); await new Promise(q=>setTimeout(q,200)); r.back=S.tracks[0].notes.length; r.label2=cur(); nxClose(); return r; });
    await c.close(); }
  const N=out.res.notes, at=s=>N.find(x=>x[0]===s);
  if(out.store.row||out.dev.row) errs.push('a Musical mode switch is still shown'); if(!out.store.on||!out.dev.on) errs.push('Musical mode not on by default');
  if(!out.res.data) errs.push('learned tables not loaded'); if(out.res.rules.length<5) errs.push('fallback rules '+JSON.stringify(out.res.rules));
  if(N.some(x=>x[0]===3)) errs.push('blip kept'); if(N.some(x=>x[0]%2)) errs.push('off grid '+JSON.stringify(N));
  if(!at(0)||![60,64,67].includes(at(0)[2])||!at(16)||![67,71,74].includes(at(16)[2])) errs.push('downbeat not a chord note '+JSON.stringify(N));
  if(![60,64,67].includes(out.res.rules.find(x=>x[0]===8)[2])) errs.push('fallback beat 3 not a chord note');
  if(N.some(x=>x[2]>=76)) errs.push('octave slip kept');
  const last=N[N.length-1]; if(![0,4,7].includes(last[2]%12)) errs.push('ending not on the home chord '+JSON.stringify(last));
  for(let i=0;i<N.length-1;i++) if(N[i][0]+N[i][1]<N[i+1][0]&&N[i+1][0]-(N[i][0]+N[i][1])<4) errs.push('gap inside a phrase at '+N[i][0]);
  if(!out.swap.hidBefore||!out.swap.shown||out.swap.label!=='Musical'||out.swap.after!=='As heard'||out.swap.label2!=='Musical'||out.swap.n1<=out.swap.back) errs.push('swap '+JSON.stringify(out.swap));
  console.log(JSON.stringify({...out,errs})); await b.close(); })();
