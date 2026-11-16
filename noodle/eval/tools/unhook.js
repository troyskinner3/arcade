// Remove calls to top-level functions whose body is empty (left behind as hooks during the cleanup), so prune.js can then delete the functions.
// Only whole statements `name(...);` with side-effect-free arguments are removed; anything else is reported and left alone.
// Usage: node unhook.js <file> [names to leave alone...]
const fs=require('fs'), acorn=require('acorn'), walk=require('acorn-walk');
const file=process.argv[2], SKIP=new Set(process.argv.slice(3)); let html=fs.readFileSync(file,'utf8');
const a=html.indexOf('<script>')+8, b=html.lastIndexOf('</script>'); let js=html.slice(a,b);
const ast=acorn.parse(js,{ecmaVersion:'latest',sourceType:'script'});
const empty=new Set(ast.body.filter(n=>n.type==='FunctionDeclaration'&&n.body.body.length===0&&!SKIP.has(n.id.name)).map(n=>n.id.name));
console.log('empty functions:',[...empty].join(' ')||'(none)');
const pure=n=>!n||n.type==='Identifier'||n.type==='Literal'||(n.type==='MemberExpression'&&pure(n.object)&&(!n.computed||pure(n.property)));
const cuts=[], left=[];
walk.ancestor(ast,{ CallExpression(n,anc){ if(n.callee.type!=='Identifier'||!empty.has(n.callee.name)) return; const par=anc[anc.length-2], gp=anc[anc.length-3];
  const ok=par.type==='ExpressionStatement'&&par.expression===n&&n.arguments.every(pure)&&gp&&(gp.type==='BlockStatement'||gp.type==='Program');
  if(ok) cuts.push([par.start,par.end]); else left.push(n.callee.name+' @'+js.slice(Math.max(0,n.start-50),n.end+10).replace(/\n/g,' ')); } });
cuts.sort((x,y)=>y[0]-x[0]); for(const [s,e0] of cuts){ let e=e0; while(js[e]===' ') e++; js=js.slice(0,s)+js.slice(e); }
acorn.parse(js,{ecmaVersion:'latest',sourceType:'script'});
fs.writeFileSync(file, html.slice(0,a)+js+html.slice(b));
console.log('removed',cuts.length,'calls; left',left.length); left.forEach(l=>console.log('  LEFT',l));
