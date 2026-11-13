import test from 'node:test'; import assert from 'node:assert/strict';
import worker from '../src/index.js';
// an in-memory stand-in for the R2 bucket
function bucket() { const m = new Map(); return { m,
  async put(k, v) { m.set(k, typeof v === 'string' ? new TextEncoder().encode(v).buffer : v); },
  async get(k) { if (!m.has(k)) return null; const v = m.get(k); return { body: v, async json() { return JSON.parse(new TextDecoder().decode(v)); } }; },
  async head(k) { return m.has(k) ? { key: k } : null; },
  async delete(ks) { for (const k of [].concat(ks)) m.delete(k); },
  async list({ prefix = '' }) { return { objects: [...m.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ key: k, size: m.get(k).byteLength, uploaded: new Date() })), truncated: false }; } }; }
const I = 'a'.repeat(22), I2 = 'b'.repeat(22), U = 'https://x.test';
const wav = () => { const b = new Uint8Array(100); b.set(new TextEncoder().encode('RIFF'), 0); b.set(new TextEncoder().encode('WAVE'), 8); return b.buffer; };
const call = (env, method, path, body, headers = {}) => worker.fetch(new Request(U + path, { method, body, headers }), env);
const meta = (o = {}) => JSON.stringify({ consent: { v: 1, age13: true }, heard: { notes: [] }, ua: 'x', ...o });

test('meta needs consent; audio needs meta first; both are stored', async () => {
  const env = { TAKES: bucket(), ADMIN_KEY: 'k' };
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take01/audio`, wav())).status, 409);
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take01/meta`, JSON.stringify({ heard: {} }))).status, 403);
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take01/meta`, JSON.stringify({ consent: { v: 1, age13: false } }))).status, 403);
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take01/meta`, meta())).status, 200);
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take01/audio`, wav())).status, 200);
  const stored = JSON.parse(new TextDecoder().decode(env.TAKES.m.get(`takes/${I}/take01/meta.json`)));
  assert.equal(stored.ua, undefined); assert.ok(stored.receivedAt);
  assert.ok(env.TAKES.m.has(`takes/${I}/take01/audio.wav`));
});
test('rejects bad ids, non-WAV audio and oversized bodies', async () => {
  const env = { TAKES: bucket() };
  assert.equal((await call(env, 'PUT', `/v1/takes/short/take01/meta`, meta())).status, 400);
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/..%2Fx/meta`, meta())).status, 400);
  await call(env, 'PUT', `/v1/takes/${I}/take01/meta`, meta());
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take01/audio`, new Uint8Array(100).buffer)).status, 415);
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take01/audio`, new Uint8Array(4 * 1024 * 1024).buffer)).status, 413);
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take01/meta`, JSON.stringify({ consent: { v: 1, age13: true }, pad: 'x'.repeat(300 * 1024) }))).status, 413);
});
test('an install deletes only its own takes', async () => {
  const env = { TAKES: bucket() };
  for (const i of [I, I2]) { await call(env, 'PUT', `/v1/takes/${i}/take01/meta`, meta()); await call(env, 'PUT', `/v1/takes/${i}/take01/audio`, wav()); }
  const r = await call(env, 'DELETE', `/v1/installs/${I}`); assert.equal((await r.json()).deleted, 2);
  assert.equal([...env.TAKES.m.keys()].filter((k) => k.includes(I)).length, 0);
  assert.equal([...env.TAKES.m.keys()].filter((k) => k.startsWith(`takes/${I2}/`)).length, 2);
  await call(env, 'DELETE', `/v1/takes/${I2}/take01`); assert.equal([...env.TAKES.m.keys()].filter((k) => k.startsWith('takes/')).length, 0);
});
test('admin needs the key; daily cap holds', async () => {
  const env = { TAKES: bucket(), ADMIN_KEY: 'k' };
  await call(env, 'PUT', `/v1/takes/${I}/take01/meta`, meta());
  assert.equal((await call(env, 'GET', '/v1/admin/list')).status, 401);
  assert.equal((await call({ TAKES: env.TAKES }, 'GET', '/v1/admin/list', undefined, { Authorization: 'Bearer undefined' })).status, 401);
  const l = await (await call(env, 'GET', '/v1/admin/list', undefined, { Authorization: 'Bearer k' })).json(); assert.equal(l.keys.length, 1);
  assert.equal((await call(env, 'GET', `/v1/admin/get?key=quota/x`, undefined, { Authorization: 'Bearer k' })).status, 400);
  env.TAKES.m.set(`quota/${I}/${new Date().toISOString().slice(0, 10)}.json`, new TextEncoder().encode(JSON.stringify(Array.from({ length: 300 }, (_, i) => 't' + i))).buffer);
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take99x/meta`, meta())).status, 429);
});
test('CORS answers the app and the site only', async () => {
  const env = { TAKES: bucket() };
  const a = await call(env, 'OPTIONS', `/v1/takes/${I}/take01/meta`, undefined, { Origin: 'noodle://app' }); assert.equal(a.headers.get('Access-Control-Allow-Origin'), 'noodle://app');
  const b = await call(env, 'OPTIONS', `/v1/takes/${I}/take01/meta`, undefined, { Origin: 'https://evil.example' }); assert.notEqual(b.headers.get('Access-Control-Allow-Origin'), 'https://evil.example');
});
