// the long-note guided takes through a page version: how many notes does one sustained sound become?
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const page=process.argv[2]; const D=__dirname+'/../data/user';
  const files=fs.readdirSync(D).filter(f=>/long-.*\.wav$/.test(f)).sort();
  const b=await chromium.launch(); const p=await b.newPage(); await p.goto('http://localhost:8800/'+page); await p.waitForTimeout(900);
  await p.evaluate(()=>{ drop={url:'http://localhost:9/',k:'x'}; });
  for(const f of files){ const pr=f.replace(/^\d+-\d+-/,'').replace('-lead.wav','');
    const r=await p.evaluate(async([f,pr])=>{ await guidedSetup(pr); const ab=await ctx.decodeAudioData(await (await fetch('/user/'+f)).arrayBuffer());
      const tr=activePart(); S.target=tr.id; await addTake(mono(ab),ab.sampleRate,'lead',{align:0.06,notch:true,live:true}); S.target=null;
      return activePart().notes.map(n=>`${n.s}/${n.l}/${pitchOf(n)}${n.hs?"|"+n.hs.join(","):""}`).join(' '); },[f,pr]);
    console.log(pr.padEnd(12), r); }
  await b.close(); })();
