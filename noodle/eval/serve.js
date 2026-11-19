// Serves the Noodle web app for the eval scripts: node serve.js [port]
// /noodle-*.html (the names the scripts use) and / are the app's index.html; other paths come from noodle/ (samples, vendor, sw.js, reader.json),
// then from noodle/eval/ (proto_fx.js, and data/<set>/ takes fetched with fetch_takes.py).
const http=require('http'), fs=require('fs'), path=require('path');
const APP=path.join(__dirname,'..'), EVAL=__dirname, port=+process.argv[2]||8800;
const TYPES={'.html':'text/html','.js':'text/javascript','.json':'application/json','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.wasm':'application/wasm','.bin':'application/octet-stream'};
http.createServer((q,r)=>{ let u=decodeURIComponent(q.url.split('?')[0]);
  if(u==='/'||/^\/noodle(-[\w]+)?\.html$/.test(u)) u='/index.html';
  const f=[path.join(APP,u),path.join(EVAL,u)].find(p=>p.startsWith(APP)&&fs.existsSync(p)&&fs.statSync(p).isFile());
  if(!f){ r.writeHead(404); return r.end('not found'); }
  r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'}); fs.createReadStream(f).pipe(r);
}).listen(port,()=>console.log('noodle on',port));
