// Remove dead code from noodle/index.html: stub the old part-row builder, then delete every top-level function / const-arrow that nothing else mentions (repeat until stable).
// "Mentions" is counted on the whole file text (markup and strings included), so anything named anywhere else is kept.
const fs=require('fs'), acorn=require('acorn');
const file=process.argv[2]; let html=fs.readFileSync(file,'utf8');
const a=html.indexOf('<script>')+8, b=html.lastIndexOf('</script>'); let js=html.slice(a,b); const head=html.slice(0,a), tail=html.slice(b);
const parse=()=>acorn.parse(js,{ecmaVersion:'latest',sourceType:'script'});
// 1. the old part rows: keep the name (the Studio wraps it), drop the body
{ const ast=parse(); const n=ast.body.find(x=>x.type==='FunctionDeclaration'&&x.id.name==='renderTracks'); if(n && n.end-n.start>200){ js=js.slice(0,n.start)+'function renderTracks(){}   /* the Studio (s2Render) draws the tracks; this name is the redraw hook */'+js.slice(n.end); console.log('stubbed renderTracks,',n.end-n.start,'chars'); } }
const KEEP=new Set(process.argv.slice(3));
let removed=[], round=0;
for(;;){ round++; const ast=parse(); const decls=[];
  for(const n of ast.body){
    if(n.type==='FunctionDeclaration') decls.push({name:n.id.name,start:n.start,end:n.end});
    else if(n.type==='VariableDeclaration' && n.declarations.length===1){ const d=n.declarations[0]; if(d.id.type==='Identifier' && d.init && (d.init.type==='ArrowFunctionExpression'||d.init.type==='FunctionExpression')) decls.push({name:d.id.name,start:n.start,end:n.end}); } }
  const all=head+js+tail, off=head.length; const dead=[];
  for(const d of decls){ if(KEEP.has(d.name)) continue; const re=new RegExp('(?<![\\w$.])'+d.name.replace(/\$/g,'\\$')+'(?![\\w$])','g'); let m, used=false;
    while((m=re.exec(all))){ const i=m.index; if(i>=off+d.start && i<off+d.end) continue; used=true; break; }
    if(!used){ // also catch obj.name style calls (e.g. window.name)
      const re2=new RegExp('[.\\[\'"`]'+d.name.replace(/\$/g,'\\$')+'(?![\\w$])','g'); while((m=re2.exec(all))){ const i=m.index+1; if(i>=off+d.start && i<off+d.end) continue; used=true; break; } }
    if(!used) dead.push(d); }
  if(!dead.length) break;
  dead.sort((x,y)=>y.start-x.start); for(const d of dead){ let s=d.start, e=d.end; while(js[e]===' '||js[e]==='\t') e++; if(js[e]==='\n') e++; js=js.slice(0,s)+js.slice(e); removed.push(d.name); }
  if(round>30) break; }
parse();   // must still be valid
fs.writeFileSync(file, head+js+tail);
console.log('removed',removed.length,'declarations in',round,'rounds:',removed.join(' '));
console.log('size',html.length,'->',(head+js+tail).length);
