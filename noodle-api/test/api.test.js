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
// a WAV like the app's: 44-byte header, 16-bit mono PCM, sizes matching the file
const wav = (bytes = 100) => { const b = new ArrayBuffer(bytes), d = new DataView(b), w = (o, t) => [...t].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); d.setUint32(4, bytes - 8, true); w(8, 'WAVE'); w(12, 'fmt '); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true);
  d.setUint32(24, 16000, true); d.setUint32(28, 32000, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, 'data'); d.setUint32(40, bytes - 44, true); return b; };
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
test('works on KV storage too, and a storage refusal is a clean 507', async () => {
  const m = new Map(), kv = {
    async put(k, v, o) { m.set(k, { v: typeof v === 'string' ? new TextEncoder().encode(v).buffer : v, metadata: o && o.metadata }); },
    async get(k) { return m.has(k) ? m.get(k).v : null; },
    async getWithMetadata(k) { return m.has(k) ? { value: { async cancel() {} }, metadata: m.get(k).metadata } : { value: null }; },
    async delete(k) { m.delete(k); },
    async list({ prefix = '' }) { return { keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ name: k, metadata: m.get(k).metadata })), list_complete: true }; } };
  const env = { TAKES_KV: kv, ADMIN_KEY: 'k' };
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take01/audio`, wav())).status, 409);
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take01/meta`, meta())).status, 200);
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take01/audio`, wav())).status, 200);
  const l = await (await call(env, 'GET', '/v1/admin/list', undefined, { Authorization: 'Bearer k' })).json();
  assert.deepEqual(l.keys.map((k) => k.size).sort(), [100, l.keys.find((k) => k.key.endsWith('json')).size].sort());
  assert.equal((await (await call(env, 'DELETE', `/v1/installs/${I}`)).json()).deleted, 2);
  kv.put = async () => { throw new Error('KV put() limit exceeded for the day'); };
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take02/meta`, meta())).status, 507);
});
test('email signup: needs consent wording, dedupes, can be removed; admin can read it', async () => {
  const env = { TAKES: bucket(), ADMIN_KEY: 'k' }, C = { v: 1, text: 'Get news about Noodle and what we are building next.' };
  assert.equal((await call(env, 'PUT', '/v1/signups', JSON.stringify({ email: 'not-an-email', consent: C }))).status, 400);
  assert.equal((await call(env, 'PUT', '/v1/signups', JSON.stringify({ email: 'a@b.co' }))).status, 403);
  assert.equal((await call(env, 'PUT', '/v1/signups', JSON.stringify({ email: ' A@B.co ', consent: C }))).status, 200);
  assert.equal((await call(env, 'PUT', '/v1/signups', JSON.stringify({ email: 'a@b.co', consent: C }))).status, 200);
  const keys = [...env.TAKES.m.keys()].filter((k) => k.startsWith('signups/')); assert.equal(keys.length, 1);
  const got = await (await call(env, 'GET', '/v1/admin/get?key=' + keys[0], undefined, { Authorization: 'Bearer k' })).json();
  assert.equal(got.email, 'a@b.co'); assert.equal(got.source, 'noodle'); assert.equal(got.consent.text, C.text);
  assert.equal((await call(env, 'DELETE', '/v1/signups', JSON.stringify({ email: 'a@b.co' }))).status, 200);
  assert.equal([...env.TAKES.m.keys()].filter((k) => k.startsWith('signups/')).length, 0);
});
test('takes expire 1 year after they first arrived, even when the record is updated later', async () => {
  const puts = [], B = bucket(), put0 = B.put; B.put = async (k, v, o) => { puts.push([k, o && o.expiresAt]); return put0(k, v); };
  const env = { TAKES: B };
  await call(env, 'PUT', `/v1/takes/${I}/take01/meta`, meta()); await call(env, 'PUT', `/v1/takes/${I}/take01/audio`, wav());
  const first = JSON.parse(new TextDecoder().decode(B.m.get(`takes/${I}/take01/meta.json`))).receivedAt;
  await new Promise((r) => setTimeout(r, 15)); await call(env, 'PUT', `/v1/takes/${I}/take01/meta`, meta({ now: { notes: [1] } }));
  const exp = puts.filter(([k]) => k.startsWith('takes/')).map(([, e]) => e), want = Date.parse(first) + 365 * 864e5;
  assert.equal(exp.length, 3); for (const e of exp) assert.equal(e, want);
  assert.equal(JSON.parse(new TextDecoder().decode(B.m.get(`takes/${I}/take01/meta.json`))).receivedAt, first);
});
test('more than 40 writes a minute from one address are refused; other addresses are not affected', async () => {
  const env = { TAKES: bucket() }; let last = 0;
  for (let i = 0; i < 45; i++) last = (await call(env, 'PUT', `/v1/takes/${I}/take${String(i).padStart(3, '0')}/meta`, meta(), { 'CF-Connecting-IP': '203.0.113.9' })).status;
  assert.equal(last, 429);
  assert.equal((await call(env, 'PUT', `/v1/takes/${I2}/take001/meta`, meta(), { 'CF-Connecting-IP': '203.0.113.10' })).status, 200);
});

test('error reports: stored once per distinct error a day, capped, admin can read them', async () => {
  const env = { TAKES: bucket(), ADMIN_KEY: 'k' }; const E = (o) => call(env, 'PUT', '/v1/errors', JSON.stringify(o));
  assert.equal((await E({})).status, 400);
  assert.equal((await E({ msg: 'boom', stack: 'at a\nat b', build: 'x', app: 'ios' })).status, 200);
  assert.equal((await E({ msg: 'boom', stack: 'at a\nat b', build: 'x', app: 'ios' })).status, 200);
  const list = await (await call(env, 'GET', '/v1/admin/list?prefix=errors/', null, { Authorization: 'Bearer k' })).json();
  assert.equal(list.keys.length, 1);
  const one = await call(env, 'GET', '/v1/admin/get?key=' + encodeURIComponent(list.keys[0].key), null, { Authorization: 'Bearer k' });
  assert.equal((await one.json()).msg, 'boom');
  assert.equal((await call(env, 'PUT', '/v1/errors', 'x'.repeat(9000))).status, 413);
});
const songFile = (title = 'My song') => JSON.stringify({ noodle: 'songs', v: 1, songs: [{ title, song: { tracks: [] }, takes: {} }] });
test('song links: the sharer uploads, anyone can get it, only the sharer can replace or delete it', async () => {
  const env = { TAKES: bucket(), APPLE_APP_ID: 'T.io.tuttii.Noodle', APP_STORE_ID: '123' }, S = 'song_abc123XYZ';
  assert.equal((await call(env, 'PUT', `/v1/songs/${S}`, songFile())).status, 403);   // no owner
  const r = await call(env, 'PUT', `/v1/songs/${S}`, songFile(), { 'X-Owner': I }); assert.equal(r.status, 200); assert.equal((await r.json()).url, `${U}/s/${S}`);
  assert.equal((await call(env, 'PUT', `/v1/songs/${S}`, songFile('Hijack'), { 'X-Owner': I2 })).status, 403);
  assert.equal((await call(env, 'PUT', `/v1/songs/${S}/preview`, wav(), { 'X-Owner': I })).status, 200);
  assert.equal((await call(env, 'PUT', `/v1/songs/${S}/preview`, 'nope', { 'X-Owner': I })).status, 415);
  const g = await call(env, 'GET', `/v1/songs/${S}`); assert.equal(g.status, 200); assert.equal((await g.json()).songs[0].title, 'My song');
  assert.equal((await call(env, 'GET', `/v1/songs/${S}/preview`)).status, 200);
  const meta = JSON.parse(new TextDecoder().decode(env.TAKES.m.get(`songs/${S}/meta.json`))); assert.notEqual(meta.owner, I); assert.equal(meta.owner.length, 64);   // only a hash
  const pg = await call(env, 'GET', `/s/${S}`); const html = await pg.text(); assert.equal(pg.status, 200);
  assert.match(html, /My song/); assert.match(html, /app-id=123/); assert.match(html, /noodleapp:\/\/s\/song_abc123XYZ/);
  const aasa = await (await call(env, 'GET', '/.well-known/apple-app-site-association')).json(); assert.deepEqual(aasa.applinks.details[0].appIDs, ['T.io.tuttii.Noodle']);
  assert.equal((await call(env, 'DELETE', `/v1/songs/${S}`, null, { 'X-Owner': I2 })).status, 403);
  assert.equal((await call(env, 'DELETE', `/v1/songs/${S}`, null, { 'X-Owner': I })).status, 200);
  assert.equal((await call(env, 'GET', `/v1/songs/${S}`)).status, 404); assert.equal((await call(env, 'GET', `/s/${S}`)).status, 404);
});
test('song links: not a song file is refused, titles are escaped, a report hides a song', async () => {
  const env = { TAKES: bucket() }, S = 'song_def456UVW';
  assert.equal((await call(env, 'PUT', `/v1/songs/${S}`, JSON.stringify({ noodle: 'songs', songs: [] }), { 'X-Owner': I })).status, 400);
  assert.equal((await call(env, 'PUT', `/v1/songs/bad`, songFile(), { 'X-Owner': I })).status, 400);
  await call(env, 'PUT', `/v1/songs/${S}`, songFile('<script>x</script>'), { 'X-Owner': I });
  assert.doesNotMatch(await (await call(env, 'GET', `/s/${S}`)).text(), /<script>x/);
  for (let i = 0; i < 3; i++) assert.equal((await call(env, 'POST', `/v1/songs/${S}/report`)).status, 200);
  assert.equal((await call(env, 'GET', `/v1/songs/${S}`)).status, 404);
});
test('reported songs: the owner sees them (title, count, reasons), can take one down or put it back', async () => {
  const env = { TAKES: bucket(), ADMIN_KEY: 'k' }, A = { Authorization: 'Bearer k' }, S = 'song_rep123ABC';
  await call(env, 'PUT', `/v1/songs/${S}`, songFile('Night ride'), { 'X-Owner': I });
  assert.equal((await call(env, 'GET', '/v1/admin/reports')).status, 401);
  await call(env, 'POST', `/v1/songs/${S}/report`, JSON.stringify({ reason: 'Offensive' }), { 'Content-Type': 'application/json' });
  let list = await (await call(env, 'GET', '/v1/admin/reports', null, A)).json();
  assert.equal(list.length, 1); assert.equal(list[0].id, S); assert.equal(list[0].title, 'Night ride'); assert.equal(list[0].reports, 1); assert.deepEqual(list[0].reasons, ['Offensive']); assert.equal(list[0].hidden, true);
  assert.equal((await call(env, 'GET', `/v1/songs/${S}`)).status, 404);   // the first report hides it while the owner looks
  for (let i = 0; i < 2; i++) await call(env, 'POST', `/v1/songs/${S}/report`);
  list = await (await call(env, 'GET', '/v1/admin/reports', null, A)).json(); assert.equal(list[0].reports, 3); assert.equal(list[0].hidden, true);
  assert.equal((await call(env, 'GET', `/v1/songs/${S}`)).status, 404);
  assert.equal((await call(env, 'PUT', `/v1/admin/songs/${S}/restore`, null, A)).status, 200);   // a false alarm: back up
  assert.equal((await call(env, 'GET', `/v1/songs/${S}`)).status, 200); assert.equal((await (await call(env, 'GET', '/v1/admin/reports', null, A)).json()).length, 0);
  await call(env, 'POST', `/v1/songs/${S}/report`);
  assert.equal((await call(env, 'DELETE', `/v1/admin/songs/${S}`, null, A)).status, 200);   // taken down for good
  assert.equal((await call(env, 'GET', `/v1/songs/${S}`)).status, 404); assert.equal([...env.TAKES.m.keys()].filter((k) => k.includes(S)).length, 0);
  assert.equal((await call(env, 'DELETE', `/v1/admin/songs/${S}`)).status, 401);
});
test('a report emails the owner when email is set up, and the report is kept even if sending fails', async () => {
  const S = 'song_mail456DEF', sent = [];
  const env = { TAKES: bucket(), ADMIN_KEY: 'k', REPORT_FROM: 'noodle@tuttii.io', REPORT_TO: 'owner@example.com', REPORT_MAIL: { async send(m) { sent.push(m); } } };
  await call(env, 'PUT', `/v1/songs/${S}`, songFile('Hello'), { 'X-Owner': I });
  // cloudflare:email exists only on Cloudflare: here the import fails, so nothing is sent, and the report must still count
  assert.equal((await call(env, 'POST', `/v1/songs/${S}/report`, JSON.stringify({ reason: 'Spam' }))).status, 200);
  assert.equal((await (await call(env, 'GET', '/v1/admin/reports', null, { Authorization: 'Bearer k' })).json())[0].reports, 1);
});
test('invites: a code per phone, friends join once (never your own code), 3 friends earn a Pro code from the pool', async () => {
  const env = { TAKES: bucket(), ADMIN_KEY: 'k', INVITES_WITHOUT_DEVICECHECK: '1' }, F = (c) => c.repeat(22), H = (o) => ({ 'X-Owner': o });
  const mine = async (o) => (await call(env, 'GET', '/v1/invites/mine', null, H(o))).json();
  const me = await mine(I); assert.match(me.code, /^[A-Z2-9]{6}$/); assert.equal(me.joined, 0); assert.equal((await mine(I)).code, me.code);
  assert.equal((await call(env, 'PUT', `/v1/invites/${me.code}/join`, null, H(I))).status, 409);
  assert.equal((await call(env, 'PUT', `/v1/invites/ZZZZZZ/join`, null, H(F('c')))).status, 404);
  for (const c of 'cde') assert.equal((await call(env, 'PUT', `/v1/invites/${me.code.toLowerCase()}/join`, null, H(F(c)))).status, 200);
  await call(env, 'PUT', `/v1/invites/${me.code}/join`, null, H(F('c')));   // the same friend again: not counted twice
  let r = await mine(I); assert.equal(r.joined, 3); assert.equal(r.reward, null);   // earned, but the pool is empty
  assert.equal((await call(env, 'PUT', '/v1/admin/codes', JSON.stringify(['PROCODE1', 'PROCODE2', 'bad code']), { Authorization: 'Bearer k' })).status, 200);
  r = await mine(I); assert.ok(['PROCODE1', 'PROCODE2'].includes(r.reward)); assert.equal((await mine(I)).reward, r.reward);
  assert.ok(env.TAKES.m.has(`rewards/given/${r.reward}.json`));   // marked, so it is never handed out again
  await call(env, 'PUT', '/v1/admin/codes', JSON.stringify([r.reward]), { Authorization: 'Bearer k' });   // re-uploading it doesn't put it back
  assert.deepEqual(JSON.parse(new TextDecoder().decode(env.TAKES.m.get('rewards/pool.json'))), ['PROCODE1', 'PROCODE2'].filter((c) => c !== r.reward));
  assert.match(await (await call(env, 'GET', `/i/${me.code}`)).text(), new RegExp(me.code));
});
test('invites with DeviceCheck: a join needs a real device token, and an iPhone can join only once', async () => {
  const { privateKey } = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const p8 = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey('pkcs8', privateKey))));
  const env = { TAKES: bucket(), DC_KEY: `-----BEGIN PRIVATE KEY-----\n${p8}\n-----END PRIVATE KEY-----`, DC_KEY_ID: 'KEY123', APPLE_APP_ID: 'TEAM123.io.tuttii.Noodle' };
  const bits = new Map(), seen = []; const real = globalThis.fetch;
  globalThis.fetch = async (u, o) => { const b = JSON.parse(o.body); seen.push({ u, auth: o.headers.Authorization });
    if (b.device_token === 'fake') return new Response('Missing or badly formatted device token', { status: 400 });
    if (u.endsWith('/query_two_bits')) return bits.has(b.device_token) ? Response.json({ bit0: bits.get(b.device_token), bit1: false }) : new Response('Failed to find bit state', { status: 200 });
    bits.set(b.device_token, b.bit0); return new Response('', { status: 200 }); };
  try {
    const H = (o, d) => ({ 'X-Owner': o, ...(d ? { 'X-Device': d } : {}) }), F = (c) => c.repeat(22);
    const me = await (await call(env, 'GET', '/v1/invites/mine', null, { 'X-Owner': I })).json();
    assert.equal((await call(env, 'PUT', `/v1/invites/${me.code}/join`, null, H(F('c')))).status, 403);            // no token
    assert.equal((await call(env, 'PUT', `/v1/invites/${me.code}/join`, null, H(F('c'), 'fake'))).status, 403);    // not a real device
    assert.equal((await call(env, 'PUT', `/v1/invites/${me.code}/join`, null, H(F('c'), 'phone1'))).status, 200);
    assert.equal((await call(env, 'PUT', `/v1/invites/${me.code}/join`, null, H(F('d'), 'phone1'))).status, 409);  // same iPhone, reinstalled
    assert.equal((await call(env, 'PUT', `/v1/invites/${me.code}/join`, null, H(F('e'), 'phone2'))).status, 200);
    assert.equal((await (await call(env, 'GET', '/v1/invites/mine', null, { 'X-Owner': I })).json()).joined, 2);
    const [h, b] = seen[0].auth.slice(7).split('.'); assert.equal(JSON.parse(atob(h)).kid, 'KEY123'); assert.equal(JSON.parse(atob(b)).iss, 'TEAM123');
    assert.match(seen[0].u, /^https:\/\/api\.devicecheck\.apple\.com\//);
  } finally { globalThis.fetch = real; }
});
test('usage events: known names only, labels checked, no id kept, at most 50 a request', async () => {
  const pts = [], env = { TAKES: bucket(), EVENTS: { writeDataPoint: (d) => pts.push(d) } };
  const post = (b) => call(env, 'POST', '/v1/events', JSON.stringify(b), { 'Content-Type': 'application/json' });
  const r = await post({ app: 'ios', build: 'b1', plan: 'pro', owner: I, ev: [{ e: 'take', p: 'lead', v: 1, d: 3 }, { e: 'nope' }, { e: 'pro_try', p: '<script>' }, { e: 'open', d: -4 }] });
  assert.equal(r.status, 200); assert.equal((await r.json()).n, 2);
  assert.deepEqual(pts[0], { indexes: ['take'], blobs: ['take', 'lead', 'ios', 'b1', 'pro', ''], doubles: [1, 3] });
  assert.deepEqual(pts[1].doubles, [0, 0]); assert.ok(!JSON.stringify(pts).includes(I));
  assert.equal(env.TAKES.m.size, 0);
  pts.length = 0; await post({ ev: Array.from({ length: 80 }, () => ({ e: 'session', v: 2 })) }); assert.equal(pts.length, 50);
  assert.equal(pts[0].blobs[2], 'web'); assert.equal(pts[0].blobs[4], 'free');
  assert.equal((await post({ ev: 'x' })).status, 400);
  assert.equal((await call({ TAKES: bucket() }, 'POST', '/v1/events', JSON.stringify({ ev: [{ e: 'open' }] }))).status, 200);   // no dataset bound: accepted, dropped
});
test('usage stats: owner only; reads Analytics Engine with the token; says what is missing', async () => {
  const env = { TAKES: bucket(), ADMIN_KEY: 'k' }, A = { Authorization: 'Bearer k' };
  assert.equal((await call(env, 'GET', '/v1/admin/stats')).status, 401);
  assert.match((await (await call(env, 'GET', '/v1/admin/stats', null, A)).json()).error, /ANALYTICS_TOKEN/);
  const seen = [], real = globalThis.fetch;
  globalThis.fetch = async (u, o) => { seen.push({ u, o }); const sql = o.body;
    const data = sql.includes('GROUP BY e, p') ? [{ e: 'take', p: 'lead', n: '3', v: '0' }] : sql.includes('AS day') ? [{ day: '2026-11-22', e: 'open', n: '5' }] : sql.includes('AS d,') ? [{ d: '0', n: '4' }, { d: '1', n: '2' }] : [{ app: 'ios', plan: 'free', n: '5' }];
    return new Response(JSON.stringify({ data })); };
  try {
    const r = await (await call({ ...env, ANALYTICS_TOKEN: 't', CF_ACCOUNT_ID: 'acc' }, 'GET', '/v1/admin/stats?days=7', null, A)).json();
    assert.equal(seen.length, 5); assert.ok(seen.every((s) => s.u.includes('/accounts/acc/analytics_engine/sql') && s.o.headers.Authorization === 'Bearer t' && s.o.body.includes("INTERVAL '7' DAY")));
    assert.deepEqual(r.totals[0], { e: 'take', p: 'lead', n: 3, v: 0 }); assert.equal(r.opens[1].n, 2); assert.equal(r.days, 7);
  } finally { globalThis.fetch = real; }
});
test('usage events: the stats ID is kept when well formed; the owner can leave phones out of the stats', async () => {
  const pts = [], env = { TAKES: bucket(), ADMIN_KEY: 'k', EVENTS: { writeDataPoint: (d) => pts.push(d) } }, A = { Authorization: 'Bearer k' }, SID = 'Abc_def-0123456789xyzQ';
  await call(env, 'POST', '/v1/events', JSON.stringify({ id: SID, ev: [{ e: 'open' }] }));
  await call(env, 'POST', '/v1/events', JSON.stringify({ id: "x' OR 1=1", ev: [{ e: 'open' }] }));
  assert.equal(pts[0].blobs[5], SID); assert.equal(pts[1].blobs[5], '');
  assert.equal((await call(env, 'PUT', '/v1/admin/stats-exclude', JSON.stringify([SID]))).status, 401);
  assert.equal((await call(env, 'PUT', '/v1/admin/stats-exclude', JSON.stringify(["x'"]), A)).status, 400);
  assert.equal((await (await call(env, 'PUT', '/v1/admin/stats-exclude', JSON.stringify([SID, SID]), A)).json()).excluded, 1);
  assert.deepEqual(await (await call(env, 'GET', '/v1/admin/stats-exclude', null, A)).json(), [SID]);
  const seen = [], real = globalThis.fetch;
  globalThis.fetch = async (u, o) => { seen.push(o.body); return new Response(JSON.stringify({ data: o.body.includes('blob6 AS id') ? [{ id: SID, app: 'ios', e: 'open', n: '2', first: '2026-11-22 10:00:00', last: '2026-11-22 11:00:00' }] : [] })); };
  try {
    const r = await (await call({ ...env, ANALYTICS_TOKEN: 't', CF_ACCOUNT_ID: 'acc' }, 'GET', '/v1/admin/stats', null, A)).json();
    assert.ok(seen.every((b) => b.includes(`blob6 NOT IN ('${SID}')`))); assert.equal(r.excluded, 1); assert.equal(r.phones[0].n, 2);
  } finally { globalThis.fetch = real; }
});

test('invites stay closed (503, the app tries later) until DeviceCheck is set up, so friends cannot be invented', async () => {
  const env = { TAKES: bucket() }, me = await (await call(env, 'GET', '/v1/invites/mine', null, { 'X-Owner': I })).json();
  assert.equal((await call(env, 'PUT', `/v1/invites/${me.code}/join`, null, { 'X-Owner': I2 })).status, 503);
  assert.equal((await call(env, 'GET', '/v1/invites/mine', null, { 'X-Owner': I })).status, 200);
});
test('daily storage budgets: song links and take audio stop at their daily total, across all phones', async () => {
  const env = { TAKES: bucket() }, day = new Date().toISOString().slice(0, 10), enc = (o) => new TextEncoder().encode(JSON.stringify(o)).buffer;
  const song = JSON.stringify({ noodle: 'songs', songs: [{ title: 'x', song: { tracks: [] } }] });
  env.TAKES.m.set(`quota/songs/${day}.json`, enc({ n: 3, bytes: 150 * 1024 * 1024 - 1024 * 1024 }));   // 1 MB left: less than a song plus its preview
  assert.equal((await call(env, 'PUT', '/v1/songs/sBUDGET0001', song, { 'X-Owner': I })).status, 429);
  env.TAKES.m.set(`quota/songs/${day}.json`, enc({ n: 3, bytes: 0 }));
  assert.equal((await call(env, 'PUT', '/v1/songs/sBUDGET0001', song, { 'X-Owner': I })).status, 200);
  assert.ok(JSON.parse(new TextDecoder().decode(env.TAKES.m.get(`quota/songs/${day}.json`))).bytes > 1024 * 1024);   // preview room counted
  assert.equal((await call(env, 'PUT', '/v1/songs/sBUDGET0001/preview', wav(1600 * 1024), { 'X-Owner': I })).status, 413);   // previews are 1.5 MB at most
  await call(env, 'PUT', `/v1/takes/${I}/take01/meta`, meta());
  env.TAKES.m.set(`quota/audio/${day}.json`, enc({ n: 9, bytes: 150 * 1024 * 1024 - 50 }));
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take01/audio`, wav())).status, 429);
  env.TAKES.m.set(`quota/audio/${day}.json`, enc({ n: 9, bytes: 0 }));
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take01/audio`, wav())).status, 200);
});
test('reads are limited too (240 a minute from one address), so a flood cannot use up the free plan for everyone', async () => {
  const env = { TAKES: bucket() }; let last = 0;
  for (let i = 0; i < 245; i++) last = (await call(env, 'GET', '/v1/songs/sNOSUCHSONG1', null, { 'CF-Connecting-IP': '203.0.113.20' })).status;
  assert.equal(last, 429);
  assert.equal((await call(env, 'GET', '/v1/songs/sNOSUCHSONG1', null, { 'CF-Connecting-IP': '203.0.113.21' })).status, 404);
});

test('only the WAV the app writes is stored, and every reply tells browsers not to guess its type', async () => {
  const env = { TAKES: bucket() }; await call(env, 'PUT', `/v1/takes/${I}/take01/meta`, meta());
  const bad = (f) => { const b = wav(200); f(new DataView(b)); return b; };
  for (const b of [bad((d) => d.setUint32(4, 1, true)), bad((d) => d.setUint16(20, 3, true)), bad((d) => d.setUint8(36, 0x58)), bad((d) => d.setUint32(40, 9999, true))])
    assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take01/audio`, b)).status, 415);
  const ok = await call(env, 'PUT', `/v1/takes/${I}/take01/audio`, wav(200)); assert.equal(ok.status, 200); assert.equal(ok.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal((await call(env, 'GET', '/s/sNOSUCHSONG1')).headers.get('X-Content-Type-Options'), 'nosniff');
});
test('reports stop being stored after 10 (the song is hidden from the first); the owner sees storage use by kind', async () => {
  const env = { TAKES: bucket(), ADMIN_KEY: 'k' }, song = JSON.stringify({ noodle: 'songs', songs: [{ title: 'x', song: { tracks: [] } }] });
  await call(env, 'PUT', '/v1/songs/sREPORTED001', song, { 'X-Owner': I });
  for (let i = 0; i < 14; i++) assert.equal((await call(env, 'POST', '/v1/songs/sREPORTED001/report', JSON.stringify({ reason: 'Spam' }))).status, 200);
  assert.equal(JSON.parse(new TextDecoder().decode(env.TAKES.m.get('songs/sREPORTED001/meta.json'))).reports, 10);
  const u = await (await call(env, 'GET', '/v1/admin/usage', null, { Authorization: 'Bearer k' })).json();
  assert.equal(u.of, 1024); assert.equal(u.by.songs.keys, 2); assert.ok(u.keys >= 3);
  assert.equal((await call(env, 'GET', '/v1/admin/usage')).status, 401);
});

test('a take older than its year (stored under the old 3-year rule) is deleted when it is sent again, not re-stored', async () => {
  const env = { TAKES: bucket() }, old = new Date(Date.now() - 400 * 864e5).toISOString();
  env.TAKES.m.set(`takes/${I}/take01/meta.json`, new TextEncoder().encode(JSON.stringify({ consent: { v: 1, age13: true }, receivedAt: old })).buffer);
  env.TAKES.m.set(`takes/${I}/take01/audio.wav`, wav());
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take01/audio`, wav())).status, 410);
  assert.equal([...env.TAKES.m.keys()].filter((k) => k.startsWith('takes/')).length, 0);
  env.TAKES.m.set(`takes/${I}/take02/meta.json`, new TextEncoder().encode(JSON.stringify({ consent: { v: 1, age13: true }, receivedAt: old })).buffer);
  assert.equal((await call(env, 'PUT', `/v1/takes/${I}/take02/meta`, meta())).status, 410);
  assert.equal(env.TAKES.m.has(`takes/${I}/take02/meta.json`), false);
});

test('usage events: finish_song is counted; unknown names are still skipped', async () => {
  const pts = [], env = { TAKES: bucket(), EVENTS: { writeDataPoint: (d) => pts.push(d) } };
  const r = await (await call(env, 'POST', '/v1/events', JSON.stringify({ app: 'ios', build: 'b1', plan: 'free', id: 'x'.repeat(20), ev: [{ e: 'finish_song' }, { e: 'nope' }] }))).json();
  assert.equal(r.n, 1); assert.equal(pts[0].blobs[0], 'finish_song');
});
