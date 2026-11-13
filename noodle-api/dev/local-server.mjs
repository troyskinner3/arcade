// Runs the takes service on localhost with an in-memory bucket, for testing the app against it: node dev/local-server.mjs [port]
import http from 'node:http'; import worker from '../src/index.js';
const m = new Map(), bucket = {
  async put(k, v) { m.set(k, typeof v === 'string' ? new TextEncoder().encode(v).buffer : v); },
  async get(k) { if (!m.has(k)) return null; const v = m.get(k); return { body: v, async json() { return JSON.parse(new TextDecoder().decode(v)); } }; },
  async head(k) { return m.has(k) ? { key: k } : null; },
  async delete(ks) { for (const k of [].concat(ks)) m.delete(k); },
  async list({ prefix = '' }) { return { objects: [...m.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ key: k, size: m.get(k).byteLength, uploaded: new Date() })), truncated: false }; } };
const port = +process.argv[2] || 8787;
http.createServer(async (q, r) => { const chunks = []; for await (const c of q) chunks.push(c);
  const res = await worker.fetch(new Request(`http://localhost:${port}${q.url}`, { method: q.method, headers: q.headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(q.method) ? undefined : Buffer.concat(chunks) }), { TAKES: bucket, ADMIN_KEY: 'local' });
  r.writeHead(res.status, Object.fromEntries(res.headers)); r.end(Buffer.from(await res.arrayBuffer())); }).listen(port, () => console.log('takes service on', port));
