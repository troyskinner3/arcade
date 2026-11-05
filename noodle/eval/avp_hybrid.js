// Hybrid drum sorting on AVP, tested on people left out. For each test freestyle, record per hit:
// the current rules' choice, and nearest-example choices against examples pooled from the other half of the people
// (3-way, kick-vs-snare only, snare-vs-hat only). Also hits found at several detection sensitivities.
const {chromium}=require('playwright'); const fs=require('fs');
const EX=JSON.parse(fs.readFileSync('results/avp_examples.json','utf8')), D='data/avp/AVP_Dataset';
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8800/noodle.html'); await p.waitForTimeout(800); const out=[];
  for(const fold of [0,1]){ const train=EX.filter(q=>(q.k<=14)===(fold===0)), test=EX.filter(q=>(q.k<=14)!==(fold===0));
    const pool={kick:[],snare:[],hat:[]}; train.forEach(q=>{ for(const c in pool) pool[c].push(...q.ex[c].slice(0,6)); });
    for(const q of test){ const dir=`${D}/${q.mode}/Participant_${q.k}`;
      const r=await p.evaluate(async([u,pool])=>{ const ab=await new OfflineAudioContext(1,1,44100).decodeAudioData(await (await fetch('/'+u)).arrayBuffer()); const x=mono(ab), sr=ab.sampleRate;
        const sens={}; for(const s of [35,45,55,65,75]){ S.kit=defaultKit(); scaleCache=null; sens[s]=analyzeTake(x,sr,'kit',s,false).onsets.map(o=>o.t); }
        S.kit=defaultKit(); scaleCache=null; const ons=analyzeTake(x,sr,'kit',55,false).onsets; const rule=ons.map(o=>o.cls);
        const mk=ids=>{ S.kit={next:9,slots:ids.map(id=>({id,sound:id,say:'',ex:pool[id]}))}; scaleCache=null; const T=taughtSlots(), sc=featScale(); return ons.map(o=>o.fv?nearestSlot(o.fv,T,sc).id:null); };
        const k3=mk(['kick','snare','hat']), ks=mk(['kick','snare']), sh=mk(['snare','hat']); S.kit=defaultKit(); scaleCache=null;
        return {t:ons.map(o=>o.t), rule, k3, ks, sh, low:ons.map(o=>o.low), cen:ons.map(o=>o.cen), dur:ons.map(o=>o.dur), sens}; },[`${dir}/P${q.k}_Improvisation_${q.mode}.wav`,pool]);
      out.push({mode:q.mode,k:q.k,truth:fs.readFileSync(`${dir}/P${q.k}_Improvisation_${q.mode}.csv`,'utf8').trim().split('\n').map(l=>l.split(',')).filter(x=>x.length>=2).map(x=>[+x[0],x[1].trim()]),...r}); process.stdout.write('.'); } }
  fs.writeFileSync('results/avp_hybrid.json',JSON.stringify(out)); console.log('\n',out.length,'errors',errs.slice(0,3)); await b.close(); })();
