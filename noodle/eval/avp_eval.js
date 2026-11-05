// Beatbox evaluation on AVP (28 amateurs). For each person and each mode (Fixed / Personal sounds):
//  - untaught: the app's default kit sorting on their freestyle take
//  - taught:   their isolated kick / snare / closed-hat / open-hat recordings become taught examples (like "Teach your sounds")
// Scores: hits found within 50 ms (onset F1) and, for found hits, whether the drum is right.
const {chromium}=require('playwright'); const fs=require('fs');
const D='data/avp/AVP_Dataset';
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle.html'); await p.waitForTimeout(800);
  const res=[];
  for(const mode of ['Fixed','Personal']) for(let k=1;k<=28;k++){
    const dir=`${D}/${mode}/Participant_${k}`; if(!fs.existsSync(dir)) continue;
    const f=(n)=>`${dir}/P${k}_${n}_${mode}`; if(!fs.existsSync(f('Improvisation')+'.csv')) continue;
    const truth=fs.readFileSync(f('Improvisation')+'.csv','utf8').trim().split('\n').map(l=>l.split(',')).filter(r=>r.length>=2).map(r=>[+r[0],r[1].trim()]);
    const r=await p.evaluate(async([f,truth])=>{
      const load=async u=>{ const ab=await new OfflineAudioContext(1,1,44100).decodeAudioData(await (await fetch('/'+u+'.wav')).arrayBuffer()); return [mono(ab),ab.sampleRate]; };
      const [x,sr]=await load(f.imp);
      const run=()=>analyzeTake(x,sr,'kit',55,false).onsets.map(o=>[o.t,o.cls]);
      S.kit=defaultKit(); scaleCache=null; const untaught=run();
      const teach=async(name,id,sound)=>{ const [y,s2]=await load(name); const an=analyzeTake(y,s2,'kick',60,false); const ons=an.onsets.slice().sort((a,b)=>b.db-a.db).slice(0,12);
        return {id,sound,say:'',ex:ons.map(o=>o.fv)}; };
      S.kit={next:9,slots:[await teach(f.kick,'kick','kick'),await teach(f.snare,'snare','snare'),await teach(f.hhc,'hat','hat'),await teach(f.hho,'hho','hat')]}; scaleCache=null;
      const taught=run(); S.kit=defaultKit(); scaleCache=null; return {untaught,taught}; },
      [{imp:f('Improvisation'),kick:f('Kick'),snare:f('Snare'),hhc:f('HHclosed'),hho:f('HHopened')},truth]);
    res.push({mode,k,truth,...r}); process.stdout.write('.'); }
  fs.writeFileSync('results/avp.json',JSON.stringify(res)); console.log('\npeople-takes',res.length,'errors',errs.slice(0,3)); await b.close(); })();
