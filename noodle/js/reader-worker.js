"use strict";
/* The background reader: runs the take reader (reader.js, the same code the page uses) off the page, so the screen never freezes
   while a take is read. The page sends everything the reader looks at (its settings, the kit, the learned weights), so the result
   is the same as reading the take on the page. */
let S={}, INST={}, READER=null, loaded=false;
self.onmessage=e=>{ const m=e.data;
  try{
    if(m.op==='init'){ if(!loaded){ importScripts(m.src); loaded=true; } postMessage({id:m.id,out:true}); return; }
    if(m.reader) READER=m.reader;
    let out=null;
    if(m.op==='analyze'){ S=m.s; INST={[m.inst]:{kind:m.kind}}; Object.assign(NT,m.nt); scaleCache=null; out=analyzeTake(m.x,m.sr,m.inst,m.sens,m.notch); }
    else if(m.op==='onsets') out=readerOnsets(m.x,m.sr,m.frames,m.grid);
    postMessage({id:m.id,out});
  }catch(err){ postMessage({id:m.id,err:String(err&&err.stack||err)}); }
};
