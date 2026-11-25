// first launch: welcome -> straight in; email news asked once after the first finished song; the voice offer after the third kept take;
// the first kept take asks about sharing (needs the 13+ box); More: stop + delete, email off. Against the local takes service.
const {chromium,devices}=require('playwright');
const H={Authorization:'Bearer local'}, A='http://localhost:8787/v1/admin/list?prefix=';
const keys=async pre=>(await (await fetch(A+pre,{headers:H})).json()).keys.map(k=>k.key);
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({...devices['iPhone 13'],colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{ localStorage.setItem('noodle.api','http://localhost:8787'); }catch(e){} });
  await p.goto('http://localhost:8800/noodle-s2.html'); await p.waitForTimeout(1000); const out={};
  out.welcome=await p.$eval('#nxOb h1',e=>e.textContent); await p.screenshot({path:'results/ob0.png'}); await p.tap('#obN'); await p.waitForTimeout(200);
  out.straightIn=await p.evaluate(()=>$('nxOb').hidden&&!$('obEm')&&!$('vcSkip'));   /* Get started goes straight in: no email step, no voice check */
  await p.waitForTimeout(400);
  // the first finished song makes email news due; back on the Songs list it's asked once
  await p.evaluate(()=>{ emailAskDue(); nxGo('projects'); }); await p.waitForTimeout(1300); out.emailAsked=await p.evaluate(()=>!!$('nxEm'));
  await p.screenshot({path:'results/ob2.png'}); await p.fill('#nxEm','nope'); await p.tap('#nxEmOk'); await p.waitForTimeout(200); out.badEmail=await p.$eval('#toast',e=>e.textContent);
  await p.fill('#nxEm','tester@example.com'); await p.tap('#nxEmOk'); await p.waitForTimeout(1200);
  out.emailOnce=await p.evaluate(()=>emailAsk()===false);
  out.after=await p.evaluate(()=>({at:nxAt, nav:!$('nxNav').hidden, list:[...document.querySelectorAll('.nx-tt')].map(e=>e.textContent), onboard:localStorage.getItem('noodle.onboard'), email:localStorage.getItem('noodle.email')})); await p.screenshot({path:'results/ob4.png'}); await p.tap('#nxPlus'); await p.waitForTimeout(500); out.signups=(await keys('signups/')).length;
  // the first kept take asks about sharing (once): needs the 13+ box
  await p.evaluate(()=>{ takeBar={id:0}; $('s2Take').hidden=false; $('s2TkOk').click(); }); await p.waitForTimeout(600);
  out.share=await p.evaluate(()=>({h:document.querySelector('#nxSheet h2').textContent, disabled:$('nxShOk').disabled})); await p.screenshot({path:'results/ob1.png'});
  await p.tap('#nxAge'); out.enabledAfterAge=await p.evaluate(()=>!$('nxShOk').disabled); await p.tap('#nxShOk'); await p.waitForTimeout(200);
  out.sharing=await p.evaluate(()=>({api:drop&&drop.api, age13:drop&&drop.consent.age13, id:drop&&drop.install.length}));
  out.askedOnce=await p.evaluate(()=>shareAsk()===false);
  // share a take, then stop + delete from More
  await p.evaluate(async()=>{ ensureCtx(); const sr=ctx.sampleRate, x=new Float32Array(sr*4); for(let n=0;n<4;n++) for(let i=0;i<sr*0.8;i++){ const t=i/sr; x[Math.floor(n*sr+i)]=0.3*Math.sin(2*Math.PI*[196,220,247,262][n]*t)*Math.min(1,t*40)*Math.min(1,(0.8-t)*40); }
    const tr=mkTrack('lead',{id:S.nextId++}); S.tracks.push(tr); S.target=tr.id; S.title='My secret title'; await addTake(x,sr,'lead',{align:0.0,notch:true,live:true}); S.target=null; await new Promise(r=>setTimeout(r,2500)); });
  const tk=await keys('takes/'); out.takeKeys=tk.map(k=>k.split('/').slice(2).join('/')); const meta=await (await fetch('http://localhost:8787/v1/admin/get?key='+tk.find(k=>k.endsWith('meta.json')),{headers:H})).json(); out.metaHasTitle=JSON.stringify(meta).includes('secret'); out.metaConsent=meta.consent.age13;
  if(await p.evaluate(()=>playing)) await p.evaluate(()=>togglePlay()); await p.tap('#s2Back'); await p.waitForTimeout(400); await p.tap('#nxTabM'); await p.waitForTimeout(300); out.moreLabel=await p.$eval('#nxShS',e=>e.textContent); await p.screenshot({path:'results/ob3.png'});
  await p.tap('#nxShSw'); await p.waitForTimeout(200); await p.tap('#nxSheet [data-a="del"]'); await p.waitForTimeout(1200); out.afterDelete={takes:(await keys('takes/')).length, drop:await p.evaluate(()=>drop), toast:await p.$eval('#toast',e=>e.textContent)};
  await p.tap('#nxEmail'); await p.waitForTimeout(200); await p.tap('#nxEmOff'); await p.waitForTimeout(800); out.emailOff={signups:(await keys('signups/')).length, stored:await p.evaluate(()=>localStorage.getItem('noodle.email'))};
  await p.reload(); await p.waitForTimeout(900); out.secondLaunch=await p.evaluate(()=>({onboard:$('nxOb').hidden}));
  out.voice=await p.evaluate(()=>{ nxClose(); localStorage.removeItem('noodle.voice'); localStorage.removeItem('noodle.voiceAsk'); localStorage.setItem('noodle.keeps','0'); const a=voiceAsk(), b=voiceAsk(), c=voiceAsk(); const shown=!!$('vaGo'); nxClose(); return [a,b,c,shown].join(','); });   /* the voice offer on the third kept take, once */
  if(!out.straightIn||!out.emailAsked||!out.emailOnce||out.voice!=='false,false,true,true') errs.push('first run: '+JSON.stringify({straightIn:out.straightIn,emailAsked:out.emailAsked,emailOnce:out.emailOnce,voice:out.voice}));
  if(!out.share||out.share.h!=='Help Noodle get better?'||!out.share.disabled||!out.enabledAfterAge||!out.sharing.api||!out.askedOnce) errs.push('sharing ask after the first kept take');
  console.log(JSON.stringify(out,null,1),errs); await b.close(); })();
