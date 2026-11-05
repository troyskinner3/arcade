// Built-in drum examples from many people, tested on people left out.
// 1. collect each participant's isolated kick / snare / hat fingerprints (the same features "Teach your sounds" stores)
// 2. for two folds (people 1–14 vs 15–28): pool the training people's examples as the kit's taught examples,
//    then sort the test people's freestyle hits with them (the user teaches nothing).
const {chromium}=require('playwright'); const fs=require('fs');
const D='data/avp/AVP_Dataset', CL=[['Kick','kick'],['Snare','snare'],['HHclosed','hat'],['HHopened','hat']];
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle.html'); await p.waitForTimeout(800);
  const people=[];
  for(const mode of ['Fixed','Personal']) for(let k=1;k<=28;k++){ const dir=`${D}/${mode}/Participant_${k}`; if(!fs.existsSync(`${dir}/P${k}_Improvisation_${mode}.csv`)) continue;
    const ex=await p.evaluate(async([dir,k,mode,CL])=>{ const out={kick:[],snare:[],hat:[]};
      for(const [n,c] of CL){ const ab=await new OfflineAudioContext(1,1,44100).decodeAudioData(await (await fetch(`/${dir}/P${k}_${n}_${mode}.wav`)).arrayBuffer());
        analyzeTake(mono(ab),ab.sampleRate,'kick',60,false).onsets.forEach(o=>{ if(o.fv) out[c].push(Array.from(o.fv)); }); }
      return out; },[dir,k,mode,CL]);
    people.push({mode,k,dir,ex,truth:fs.readFileSync(`${dir}/P${k}_Improvisation_${mode}.csv`,'utf8').trim().split('\n').map(l=>l.split(',')).filter(r=>r.length>=2).map(r=>[+r[0],r[1].trim()])}); process.stdout.write('.'); }
  const res=[];
  for(const [cap,tag] of [[4,'4pp'],[12,'12pp']]) for(const fold of [0,1]){
    const train=people.filter(q=>(q.k<=14)===(fold===0)), test=people.filter(q=>(q.k<=14)!==(fold===0));
    const pool={kick:[],snare:[],hat:[]}; train.forEach(q=>{ for(const c in pool) pool[c].push(...q.ex[c].slice(0,cap)); });
    for(const q of test){ const est=await p.evaluate(async([q,pool])=>{
        S.kit={next:9,slots:[{id:'kick',sound:'kick',say:'',ex:pool.kick},{id:'snare',sound:'snare',say:'',ex:pool.snare},{id:'hat',sound:'hat',say:'',ex:pool.hat}]}; scaleCache=null;
        const ab=await new OfflineAudioContext(1,1,44100).decodeAudioData(await (await fetch(`/${q.dir}/P${q.k}_Improvisation_${q.mode}.wav`)).arrayBuffer());
        const r=analyzeTake(mono(ab),ab.sampleRate,'kit',55,false).onsets.map(o=>[o.t,o.cls]); S.kit=defaultKit(); scaleCache=null; return r; },[{dir:q.dir,k:q.k,mode:q.mode},pool]);
      res.push({variant:'pooled_'+tag,mode:q.mode,k:q.k,truth:q.truth,taught:est}); } }
  fs.writeFileSync('results/avp_pool.json',JSON.stringify(res)); fs.writeFileSync('results/avp_examples.json',JSON.stringify(people.map(q=>({mode:q.mode,k:q.k,ex:q.ex}))));
  console.log('\npeople-takes',people.length,'results',res.length,'errors',errs.slice(0,3)); await b.close(); })();
