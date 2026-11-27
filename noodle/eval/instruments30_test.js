// Round 30 instruments (owner, 27 Nov): Acoustic guitar (free), Nylon guitar, Clean guitar, Finger bass (Pro) from CC0 recordings; synths Glide
// lead, Sine lead, Juno chords, Moog bass (free), Whistle lead, Future chords, Island pluck, FM bass (Pro). Each is offered on the instruments it
// suits, plays at its reference's level (within 2.5 dB before the master), and the Envelope section (Pro; attack, decay, sustain, release)
// shapes synths and recordings alike, is previewed by free users and put back when the sheet closes, and Reset clears it. Prints {..., errs:[]}.
const {chromium,devices}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ ['noodle.onboard','noodle.shareAsk','noodle.kitOffer'].forEach(k=>localStorage.setItem(k,'1')); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200);
  const r=await p.evaluate(async()=>{ const w=ms=>new Promise(q=>setTimeout(q,ms)), o={};
    const free=['Acoustic guitar','Glide lead','Sine lead','Juno chords','Moog bass'], pro=['Nylon guitar','Clean guitar','Finger bass','Whistle lead','Future chords','Island pluck','FM bass'];
    o.split=free.every(x=>!PRO_SOUNDS.has(x))&&pro.every(x=>PRO_SOUNDS.has(x));
    o.offered=['lead:Acoustic guitar','keys:Acoustic guitar','keys:Juno chords','pad:Future chords','arp:Island pluck','bass:Moog bass','bass:Finger bass','lead:Glide lead'].every(x=>{ const [i,s]=x.split(':'); return INST[i].sounds.includes(s); });
    for(const s of ['Acoustic guitar','Nylon guitar','Clean guitar','Finger bass','Piano','Rock bass']) await loadSampled(s);
    const level=async(inst,snd,adsr,secs=1)=>{ await projNew(); S.bpm=100; S.bars=1; const t=mkTrack(inst,{id:S.nextId++,off:0,len:1,lenSet:true,rep:false,sound:snd,vol:80,notes:[{s:0,l:8,p:inst==='bass'?40:inst==='lead'?67:60,v:0.8,x:true}]}); if(adsr) t.adsr=adsr; S.tracks.push(t); ensureCtx(); await renderDirty();
      const d=t._buf.getChannelData(0), n=Math.min(d.length,Math.round(t._buf.sampleRate*secs)); let q=0; for(let i=0;i<n;i++) q+=d[i]*d[i]; return 10*Math.log10(q/n+1e-12); };
    const ref={keys:await level('keys','Piano'), lead:await level('lead','Saw'), bass:(await level('bass','Synth bass')+await level('bass','Rock bass'))/2};
    const pairs=[['keys','Acoustic guitar'],['keys','Nylon guitar'],['keys','Clean guitar'],['keys','Juno chords'],['keys','Future chords'],['keys','Island pluck'],['lead','Glide lead'],['lead','Sine lead',2],['lead','Whistle lead',2],['bass','Moog bass'],['bass','FM bass'],['bass','Finger bass']];
    o.levels=[]; for(const [i,s,extra] of pairs){ const L=await level(i,s); o.levels.push(s+':'+(L-ref[i]).toFixed(1)); if(!(Math.abs(L-ref[i]-(extra||0))<=2.5)) o.off=(o.off||'')+s+' '; }
    // the envelope shapes sound: a 2 s attack makes the first quarter second far quieter (a synth and a recording)
    for(const [i,s] of [['lead','Saw'],['keys','Acoustic guitar']]){ const a=await level(i,s,null,0.25), b2=await level(i,s,{a:2,d:0.3,s:1,r:0.2},0.25); o['env_'+s]=+(a-b2).toFixed(1); }
    // the Envelope section: pitched tracks only; Pro sets it; free users preview it; Reset clears it
    await nxExample(); await w(600); const lead=S.tracks.find(t=>t.inst==='lead'), kit=S.tracks.find(t=>t.inst==='kit');
    s2TrackSheet(s2Lane(s2LaneId(kit))); await w(150); o.noKitEnv=!document.querySelector('#nxSheet [data-sub="env"]'); nxClose();
    PRO.owned=true; s2TrackSheet(s2Lane(s2LaneId(lead))); await w(150); o.leadEnv=!!document.querySelector('#nxSheet [data-sub="env"]'); const sl=$('s2Env_a'); sl.value=80; sl.dispatchEvent(new Event('input',{bubbles:true})); o.proSet=!!lead.adsr&&lead.adsr.a>1;
    document.querySelector('#nxSheet [data-a="envreset"]').click(); await w(100); o.reset=!lead.adsr; nxClose();
    PRO.owned=false; s2TrackSheet(s2Lane(s2LaneId(lead))); await w(150); const s2=$('s2Env_r'); s2.value=90; s2.dispatchEvent(new Event('input',{bubbles:true})); await w(150); o.preview=!!lead.adsr&&!!document.querySelector('#nxSheet .pv-line'); nxClose(); await w(200); o.putBack=!lead.adsr;
    return o; });
  for(const k of ['split','offered','noKitEnv','leadEnv','proSet','reset','preview','putBack']) if(!r[k]) errs.push(k);
  if(r.off) errs.push('levels: '+r.levels.join(' ')); if(!(r['env_Saw']>10&&r['env_Acoustic guitar']>10)) errs.push('envelope: '+r['env_Saw']+' '+r['env_Acoustic guitar']);
  console.log(JSON.stringify({...r,errs})); await b.close(); })();
