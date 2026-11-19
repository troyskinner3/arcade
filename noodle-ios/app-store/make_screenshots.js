// App Store screenshots (6.9" iPhone, 1320 x 2868): a demo song in Noodle, each screen captured at 440 x 956 x3, then framed under a caption.
// Run from noodle/eval with the app served on :8800 and the takes service on :8787 (bash noodle/eval/run.sh starts both):
//   node ../../noodle-ios/app-store/make_screenshots.js
const {chromium}=require('playwright'); const fs=require('fs'), path=require('path'); const OUT=path.join(__dirname,'screenshots');
const CAPS=[['01','Hum it.','Get a song.'],['02','Beatbox','your beat.'],['03','Hum a melody,','get the chords.'],['04','Sing real vocals,','tuned.'],['05','Fix any note','with a tap.'],
  ['06','Draw your own','filter sweeps.'],['07','Share a video','in one tap.'],['08','Send a link.','Friends remix it.'],['09','Try Pro sounds','before you buy.']];
const DEMO=async()=>{ PRO.owned=true; S.title='Late Night Hum'; S.bpm=96; S.key='9'; S.scale='minor'; S.bars=8; keyCache=null; S.tracks=[];
  const mel=[[0,4,69],[4,4,72],[8,4,71],[12,4,69],[16,8,67],[24,8,64],[32,4,65],[36,4,69],[40,8,72],[48,4,71],[52,4,72],[56,8,74],[64,4,76],[68,4,74],[72,4,72],[76,4,71],[80,8,69],[88,8,72],[96,4,74],[100,4,72],[104,8,71],[112,16,69]];
  const lead=mkTrack('lead',{id:S.nextId++,off:0,len:8,rep:false,lenSet:true,sound:'Supersaw',name:'Melody',vol:70,send:25,notes:mel.map(([s,l,p])=>({s,l,p:p-12,v:.8}))});
  const kit=mkTrack('kit',{id:S.nextId++,len:2,sound:'Rock',fill:4,vol:78,hits:[0,6,8,16,22,26].map(s=>({s,d:'kick',v:s%8?.75:1})).concat([4,12,20,28].map(s=>({s,d:'snare',v:.92})),[30].map(s=>({s,d:'clap',v:.7})),Array.from({length:16},(_,i)=>({s:i*2,d:'hat',v:i%2?.55:.75})))});
  S.tracks.push(kit,lead); addChords(s2Lane(s2LaneId(lead)),'pad',16); const ch=S.tracks.find(t=>t.name==='Chords'); ch.inst='keys'; ch.sound='E-piano'; ch.name='Chords';
  const bass=mkTrack('bass',{id:S.nextId++,off:0,len:8,rep:false,lenSet:true,sound:'Synth bass',vol:72,notes:ch.notes.flatMap(n=>[{s:n.s,l:6,p:(n.p%12)+45,v:.85},{s:n.s+8,l:6,p:(n.p%12)+45,v:.7}])});
  const sr=44100, sd=stepDur(), x=new Float32Array(Math.round(sr*64*sd)+sr); let ph=0;
  for(const [s,l,p] of mel.filter(m=>m[0]>=64)){ const a=Math.round((s-64)*sd*sr), n=Math.round(l*sd*sr*0.92), f=440*Math.pow(2,(p-12-69)/12);
    for(let i=0;i<n;i++){ ph+=f*(1+0.006*Math.sin(2*Math.PI*5.5*i/sr))/sr; let v=0; for(let h=1;h<=24;h++){ const fh=f*h, fm=Math.exp(-Math.pow((fh-650)/220,2))+0.7*Math.exp(-Math.pow((fh-1100)/280,2))+0.35*Math.exp(-Math.pow((fh-2500)/400,2)); v+=Math.sin(2*Math.PI*h*ph)*fm; } x[a+i]=0.22*v*Math.min(1,i/900,(n-i)/1800); } }
  const vox=mkTrack('vox',{id:S.nextId++,off:64,len:4,rep:false,lenSet:true,sound:'Pop',name:'Vocals'}); vox._raw={x,sr}; vox.va=0; vox.fx=Object.assign({},VOX_PRESETS.Pop,{harm:40});
  const fx=mkTrack('mix',{id:S.nextId++,off:48,len:1,rep:false,lenSet:true}); fx.mfx={k:'lp',curve:null,params:{}};
  S.tracks.splice(S.tracks.indexOf(lead)+2,0,bass); S.tracks.push(vox,fx); S.secs=[{a:0,b:4,name:'Verse'},{a:4,b:8,name:'Chorus'}];
  S.tracks.forEach(t=>t._dirty=true); save(); flushSave(); renderTracks(); s2Render(); };
(async()=>{ fs.mkdirSync(OUT,{recursive:true}); const b=await chromium.launch();
  const c=await b.newContext({viewport:{width:440,height:956},deviceScaleFactor:3,isMobile:true,hasTouch:true,colorScheme:'dark'}); const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ localStorage.setItem('noodle.api','http://localhost:8787'); });
  await p.goto('http://localhost:8800/noodle-s2.html?studio'); await p.waitForTimeout(1200); await p.evaluate(DEMO); await p.waitForTimeout(1500);
  const quiet=()=>p.evaluate(()=>{ const t=document.getElementById('toast'); t.classList.remove('on'); t.style.display='none'; });
  const shot=async(n,prep)=>{ await p.evaluate(()=>{ try{ nxClose(); }catch(e){} try{ if(s2.edId!=null) s2EdClose(); }catch(e){} s2.selId=null; s2Render(); }); await p.waitForTimeout(200); if(prep) await prep(); await p.waitForTimeout(500); await quiet(); return p.screenshot(); };
  const raw={};
  raw['01']=await shot('01');
  raw['02']=await shot('02',()=>p.evaluate(()=>s2Edit(S.tracks.find(t=>t.inst==='kit'))));
  raw['03']=await shot('03',async()=>{ await p.evaluate(()=>{ const tl=document.getElementById('s2Tl'); chordSheet(s2Lane(s2LaneId(S.tracks.find(t=>t.name==='Melody')))); }); await p.tap('#chSt [data-k="piano"]'); });
  raw['04']=await shot('04',()=>p.evaluate(()=>s2TrackSheet(s2Lane(s2LaneId(S.tracks.find(t=>t.inst==='vox'))))));
  raw['05']=await shot('05',async()=>{ await p.evaluate(()=>{ const t=S.tracks.find(t=>t.name==='Melody'); s2Edit(t); }); await p.waitForTimeout(300); await p.evaluate(()=>{ const t=S.tracks.find(t=>t.name==='Melody'); selectNote(t,t.notes[4]); }); });
  raw['06']=await shot('06',async()=>{ await p.evaluate(()=>{ const t=S.tracks.find(t=>t.mfx); t.mfx.curve=null; s2Edit(t); }); await p.waitForTimeout(300); await p.tap('.mfxe [data-a="add"]'); });
  raw['07']=await shot('07',()=>p.evaluate(()=>{ s2ShareSheet(); const st=document.getElementById('s2ShSt'); st.hidden=false; st.textContent='Your video is ready (6.1 MB, 20 s). Tap Share to save it to Photos or send it to Messages, CapCut, TikTok and more.'; document.getElementById('s2ShGo').hidden=false; }));
  // 08: the listen page a friend gets
  const url=await p.evaluate(async()=>{ ensureCtx(); return await songLinkShare(()=>{}); });
  const p2=await c.newPage(); await p2.goto(url); await p2.waitForTimeout(600); raw['08']=await p2.screenshot(); await p2.close();
  raw['09']=await shot('09',async()=>{ await p.evaluate(()=>{ PRO.owned=false; renderTracks(); s2TrackSheet(s2Lane(s2LaneId(S.tracks.find(t=>t.name==='Melody')))); }); await p.tap('#s2Snd [data-x="Trumpet"]'); await p.waitForTimeout(300);
    await p.evaluate(()=>{ const sh=document.getElementById('nxSheet'), y=document.querySelector('#s2Snd').getBoundingClientRect().top-sh.getBoundingClientRect().top; sh.scrollTop=Math.max(0,y-150); try{ togglePlay(); }catch(e){} }); });
  await p.evaluate(()=>{ try{ songLinkDelete(); }catch(e){} });
  // frame each under its caption (1320 x 2868)
  const f=await b.newPage({viewport:{width:1320,height:2868},deviceScaleFactor:1}); const font=fs.readFileSync(path.join(__dirname,'../../noodle/vendor/fonts/Unbounded-700-latin.woff2')).toString('base64');
  for(const [k,l1,l2] of CAPS){ const img=raw[k].toString('base64');
    await f.setContent(`<style>@font-face{font-family:U;src:url(data:font/woff2;base64,${font})}body{margin:0;width:1320px;height:2868px;overflow:hidden;background:radial-gradient(120% 60% at 50% 0%,#2a2414 0%,#121418 55%);font-family:U,sans-serif}
      h1{margin:0;padding:190px 90px 0;color:#eceef2;font-size:112px;line-height:1.08;letter-spacing:-1px;text-align:center}h1 b{color:#f1c75b;font-weight:700}
      .ph{position:absolute;left:50%;top:640px;width:1050px;transform:translateX(-50%);border-radius:96px;overflow:hidden;border:14px solid #2c3038;box-shadow:0 40px 120px rgba(0,0,0,.55)}.ph img{display:block;width:100%}</style>
      <h1>${l1}<br><b>${l2}</b></h1><div class="ph"><img src="data:image/png;base64,${img}"></div>`);
    await f.waitForTimeout(150); await f.screenshot({path:path.join(OUT,`${k}.png`)}); }
  console.log(JSON.stringify({made:CAPS.length, errs})); await b.close(); })();
