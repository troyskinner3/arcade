// Noodle takes service: stores takes that people chose to share so Noodle can learn from them.
// A take = the recording (16 kHz mono WAV) + a JSON record (what Noodle heard, the notes now, edits, context).
// No accounts: each install has a random id that only that phone knows; it can add, update and delete its own takes.
// Nothing here stores IP addresses or anything that identifies a person.
//
//   PUT    /v1/takes/:install/:take/audio   body = WAV bytes
//   PUT    /v1/takes/:install/:take/meta    body = JSON (must carry consent: {v, age13: true})
//   DELETE /v1/takes/:install/:take         delete one take
//   DELETE /v1/installs/:install            delete everything this install shared
//   PUT    /v1/signups                      body = {email, consent: {v, text}}  optional email list (news), separate from sharing takes
//   DELETE /v1/signups                      body = {email}                      take that email off the list
// Shared takes are kept for 3 years at most (KEEP_DAYS), counted from when the take first arrived; storage removes them on its own.
//   PUT    /v1/errors                       body = {msg, stack, build, app, where}  an anonymous error report (no recordings, no song content)
//                                           stored once per distinct error per day, kept 90 days, at most MAX_ERRORS_PER_DAY a day
//   POST   /v1/events                       body = {app, build, plan, ev: [{e, p, v, d}]}  anonymous usage counts (no id, no song content)
//                                           e = an event name from EVENTS, p = a short label (a part type, a sound), v = a number,
//                                           d = days since this phone first opened Noodle. Written to Workers Analytics Engine (binding
//                                           EVENTS, kept 3 months by Cloudflare), never to storage; at most MAX_EVENTS per request.
// Song links (someone chose to share a song by link: anyone with the link can listen and copy it into their own Noodle to remix it):
//   PUT    /v1/songs/:id                    body = the song file (JSON, a Noodle song file with one song), header X-Owner = the sharer's install id
//   PUT    /v1/songs/:id/preview            body = WAV, the start of the song for the listen page (X-Owner)
//   GET    /v1/songs/:id                    the song file (Remix in the app);  GET /v1/songs/:id/preview  the preview
//   DELETE /v1/songs/:id                    X-Owner: only the phone that shared it can delete it
//   POST   /v1/songs/:id/report             someone reports it; after REPORTS_TO_HIDE reports it is no longer served
//   GET    /s/:id                           the listen page (Smart App Banner opens the app when it is installed)
//   GET    /.well-known/apple-app-site-association   lets /s/ links open the iPhone app (APPLE_APP_ID, e.g. TEAMID.io.tuttii.Noodle)
// Song links are kept SONG_DAYS from when they were shared. The sharer's install id is stored only as a hash.
// Invites (Noodle Pro for bringing friends): each phone has an invite code; a friend's phone joins with it after making its first song.
//   GET    /v1/invites/mine                 X-Owner: this phone's code (made on first ask), how many friends joined, and its reward code once earned
//   PUT    /v1/invites/:code/join           X-Owner = the friend's install id: counts once per friend phone, never your own code
//   GET    /i/:code                         the invite page (App Store link, and the code to type in if the link can't open the app)
// With Apple DeviceCheck set up (secrets DC_KEY = the .p8 key's text, DC_KEY_ID; APPLE_APP_ID gives the Team ID; DC_ENV = development for Xcode
// builds), a join must carry a DeviceCheck token (header X-Device) from a real iPhone running Noodle, and each iPhone can join only once ever,
// even after reinstalling (Apple keeps one bit per device for us). Without those secrets, joins count once per install id.
// A reward is one Noodle Pro offer code (App Store Connect → the app → Offer Codes, for the Pro in-app purchase) from a pool the owner
// uploads (PUT /v1/admin/codes, a JSON list); INVITES_FOR_PRO friends earn one; at most REWARDS_PER_DAY are handed out a day.
//   GET    /v1/admin/list?prefix=&cursor=   owner only (Authorization: Bearer ADMIN_KEY)
//   GET    /v1/admin/get?key=               owner only
const ORIGINS = ['noodle://app', 'https://troyskinner3.github.io'];
const KEEP_DAYS = 3 * 365, MAX_SIGNUPS_PER_DAY = 400, ERROR_DAYS = 90, MAX_ERRORS_PER_DAY = 150;
const MAX_AUDIO = 3 * 1024 * 1024, MAX_META = 256 * 1024, MAX_TAKES_PER_DAY = 300;
const ID = /^[A-Za-z0-9_-]{22,64}$/, TAKE = /^[A-Za-z0-9_-]{6,96}$/;
const INVITE = /^[A-Z2-9]{6}$/, INVITES_FOR_PRO = 3, REWARDS_PER_DAY = 25;
const EVENTS = new Set(['first_open', 'first_take', 'first_song', 'first_export', 'first_share', 'open', 'take', 'song_parts', 'export',
  'share_link', 'part_used', 'session', 'pro_sheet', 'pro_try', 'pro_buy', 'pro_result', 'restore']);
const MAX_EVENTS = 50, LABEL = /^[A-Za-z0-9 _.+\-]{0,40}$/;
const SONG = /^[A-Za-z0-9_-]{10,32}$/, SONG_DAYS = 2 * 365, MAX_SONG = 8 * 1024 * 1024, MAX_PREVIEW = 3 * 1024 * 1024, MAX_SONGS_PER_DAY = 250, REPORTS_TO_HIDE = 3;
const sha = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((x) => x.toString(16).padStart(2, '0')).join('');
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// A light brake on floods: at most RATE writes a minute from one address, counted in this worker's memory only (nothing about the address is stored).
// It is best-effort (each worker instance counts on its own); the free plan's daily limits are the hard stop.
const RATE = 40, hits = new Map();
function tooFast(req) {
  const ip = req.headers.get('CF-Connecting-IP') || ''; if (!ip) return false;
  const now = Date.now(), win = Math.floor(now / 60000), k = ip + '|' + win, n = (hits.get(k) || 0) + 1; hits.set(k, n);
  if (hits.size > 5000) for (const key of hits.keys()) { if (!key.endsWith('|' + win)) hits.delete(key); }
  return n > RATE;
}
// error reports a day, counted in memory (best-effort, per worker instance), so a crash loop can't use up the free plan's daily writes
const errDays = new Map();
function errorsToday(day) { const n = (errDays.get(day) || 0) + 1; errDays.clear(); errDays.set(day, n); return n; }
function cors(req) {
  const o = req.headers.get('Origin') || '';
  const ok = ORIGINS.includes(o) || /^http:\/\/localhost(:\d+)?$/.test(o);
  return { 'Access-Control-Allow-Origin': ok ? o : ORIGINS[1], 'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Owner', 'Access-Control-Max-Age': '86400' };
}
const json = (req, status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(req) } });

async function readLimited(req, max) {
  const len = +req.headers.get('Content-Length') || 0;
  if (len > max) return null;
  const buf = await req.arrayBuffer();
  return buf.byteLength > max ? null : buf;
}
// Storage: Cloudflare KV on the free plan (no card; when a daily or size limit is reached, writes are refused instead of billed).
// The same four calls also fit an R2 bucket, if this ever outgrows KV: bind one as TAKES and it is used instead.
function store(env) {
  if (env.TAKES) return env.TAKES;
  const kv = env.TAKES_KV;
  return {
    async put(k, v, o) { await kv.put(k, v, { ...(o && o.expiresAt ? { expiration: Math.floor(o.expiresAt / 1000) } : {}), metadata: { size: typeof v === 'string' ? v.length : v.byteLength, at: Date.now() } }); },
    async get(k) { const v = await kv.get(k, { type: 'arrayBuffer' }); return v === null ? null : { body: v, async json() { return JSON.parse(new TextDecoder().decode(v)); } }; },
    async head(k) { const r = await kv.getWithMetadata(k, { type: 'stream' }); if (r.value === null) return null; try { await r.value.cancel(); } catch {} return { key: k }; },
    async delete(ks) { for (const k of [].concat(ks)) await kv.delete(k); },
    async list({ prefix, cursor, limit }) { const r = await kv.list({ prefix, cursor, limit: Math.min(limit || 1000, 1000) });
      return { objects: r.keys.map((x) => ({ key: x.name, size: x.metadata && x.metadata.size, uploaded: x.metadata && new Date(x.metadata.at) })), truncated: !r.list_complete, cursor: r.cursor }; },
  };
}
function isWav(buf) {
  if (buf.byteLength < 44) return false;
  const b = new Uint8Array(buf, 0, 12), s = (i) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
  return s(0) === 'RIFF' && s(8) === 'WAVE';
}
async function deletePrefix(bucket, prefix) {
  let cursor, n = 0;
  do {
    const page = await bucket.list({ prefix, cursor, limit: 500 });
    if (page.objects.length) { await bucket.delete(page.objects.map((o) => o.key)); n += page.objects.length; }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return n;
}
// a simple daily cap per install, so one phone can't fill the bucket
async function underDailyCap(bucket, install, take) {
  const day = new Date().toISOString().slice(0, 10), key = `quota/${install}/${day}.json`;
  const cur = await bucket.get(key); const seen = cur ? await cur.json() : [];
  if (seen.includes(take)) return true;
  if (seen.length >= MAX_TAKES_PER_DAY) return false;
  seen.push(take); await bucket.put(key, JSON.stringify(seen), { expiresAt: Date.now() + 3 * 864e5 }); return true;
}

export default {
  async fetch(req, env) {
    try { return await handle(req, env); } catch (e) { return json(req, 507, { error: 'storage unavailable' }); }
  },
};
async function handle(req, env) {
  {
    const url = new URL(req.url), p = url.pathname.split('/').filter(Boolean), B = store(env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    if (p[0] === '.well-known' && p[1] === 'apple-app-site-association') return new Response(JSON.stringify({ applinks: { details: [{ appIDs: env.APPLE_APP_ID ? [env.APPLE_APP_ID] : [], components: [{ '/': '/s/*' }, { '/': '/i/*' }] }] } }), { headers: { 'Content-Type': 'application/json' } });
    if (p[0] === 's' && p.length === 2 && req.method === 'GET') return listenPage(req, env, B, p[1]);
    if (p[0] === 'i' && p.length === 2 && req.method === 'GET') return invitePage(req, env, p[1]);
    if (p[0] !== 'v1') return json(req, 404, { error: 'not found' });
    if ((req.method === 'PUT' || req.method === 'DELETE' || req.method === 'POST') && tooFast(req)) return json(req, 429, { error: 'slow down' });

    if (p[1] === 'invites') {
      const owner = req.headers.get('X-Owner') || ''; if (!ID.test(owner)) return json(req, 403, { error: 'owner' }); const oh = await sha(owner);
      if (p[2] === 'mine' && req.method === 'GET') {
        const k = `invites/owners/${oh}.json`, cur = await B.get(k); let me = cur ? await cur.json() : null;
        if (!me) { let code; for (let i = 0; i < 6; i++) { const b = crypto.getRandomValues(new Uint8Array(6)); code = [...b].map((x) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[x % 32]).join(''); if (!(await B.head(`invites/codes/${code}.json`))) break; }
          me = { code, joined: [], reward: null }; await B.put(`invites/codes/${code}.json`, JSON.stringify({ owner: oh })); await B.put(k, JSON.stringify(me)); }
        if (!me.reward && me.joined.length >= INVITES_FOR_PRO) {   // earned: hand out a code from the pool, if there is one today
          const day = new Date().toISOString().slice(0, 10), dk = `quota/rewards/${day}.json`, dc = await B.get(dk), n = dc ? (await dc.json()).n : 0, pc = await B.get('rewards/pool.json'), pool = pc ? await pc.json() : [];
          if (n < REWARDS_PER_DAY && pool.length) { me.reward = pool.shift(); await B.put('rewards/pool.json', JSON.stringify(pool)); await B.put(dk, JSON.stringify({ n: n + 1 }), { expiresAt: Date.now() + 3 * 864e5 }); await B.put(k, JSON.stringify(me)); }
        }
        return json(req, 200, { code: me.code, joined: me.joined.length, need: INVITES_FOR_PRO, reward: me.reward, url: `${url.origin}/i/${me.code}` });
      }
      if (p.length === 4 && p[3] === 'join' && req.method === 'PUT') {
        const code = String(p[2] || '').toUpperCase(); if (!INVITE.test(code)) return json(req, 400, { error: 'code' });
        const c = await B.get(`invites/codes/${code}.json`); if (!c) return json(req, 404, { error: 'no such code' }); const inviter = (await c.json()).owner;
        if (inviter === oh) return json(req, 409, { error: 'own code' });
        if (await B.head(`invites/joined/${oh}.json`)) return json(req, 200, { ok: true, already: true });   // a phone joins once, with one code
        if (env.DC_KEY) { const dc = await deviceOnce(env, req.headers.get('X-Device') || ''); if (dc !== 'ok') return json(req, dc === 'used' ? 409 : 403, { error: dc === 'used' ? 'this iPhone already joined' : 'device check' }); }
        const k = `invites/owners/${inviter}.json`, cur = await B.get(k), me = cur ? await cur.json() : { code, joined: [], reward: null };
        if (!me.joined.includes(oh)) me.joined.push(oh); await B.put(k, JSON.stringify(me)); await B.put(`invites/joined/${oh}.json`, JSON.stringify({ code, at: new Date().toISOString() }));
        return json(req, 200, { ok: true });
      }
      return json(req, 404, { error: 'not found' });
    }
    if (p[1] === 'songs' && (p.length === 3 || p.length === 4)) {
      const id = p[2], part = p[3] || ''; if (!SONG.test(id)) return json(req, 400, { error: 'id' });
      const base = `songs/${id}/`, metaKey = base + 'meta.json', m0 = await B.get(metaKey), meta = m0 ? await m0.json() : null;
      const owner = req.headers.get('X-Owner') || '', isOwner = async () => meta && ID.test(owner) && meta.owner === await sha(owner);
      if (req.method === 'GET') {
        if (!meta || meta.reports >= REPORTS_TO_HIDE) return json(req, 404, { error: 'not found' });
        const o = await B.get(base + (part === 'preview' ? 'preview.wav' : 'song.json')); if (!o) return json(req, 404, { error: 'not found' });
        return new Response(o.body, { headers: { 'Content-Type': part === 'preview' ? 'audio/wav' : 'application/json', 'Cache-Control': 'public, max-age=300', ...cors(req) } });
      }
      if (req.method === 'POST' && part === 'report') {
        if (!meta) return json(req, 404, { error: 'not found' }); meta.reports = (meta.reports || 0) + 1;
        let why = ''; try { const buf = await readLimited(req, 1024); why = buf ? String(JSON.parse(new TextDecoder().decode(buf)).reason || '').slice(0, 40) : ''; } catch {}
        if (why) meta.reasons = (meta.reasons || []).concat([why]).slice(-10);   // what reporters chose (no one's identity)
        await B.put(metaKey, JSON.stringify(meta), { expiresAt: Date.parse(meta.at) + SONG_DAYS * 864e5 }); return json(req, 200, { ok: true });
      }
      if (req.method === 'DELETE' && !part) { if (!(await isOwner())) return json(req, 403, { error: 'owner' }); return json(req, 200, { deleted: await deletePrefix(B, base) }); }
      if (req.method !== 'PUT') return json(req, 405, { error: 'method' });
      if (!ID.test(owner)) return json(req, 403, { error: 'owner' });
      if (meta && !(await isOwner())) return json(req, 403, { error: 'owner' });
      if (part === 'preview') {
        if (!meta) return json(req, 409, { error: 'send the song first' });
        const buf = await readLimited(req, MAX_PREVIEW); if (!buf) return json(req, 413, { error: 'too large' }); if (!isWav(buf)) return json(req, 415, { error: 'wav only' });
        await B.put(base + 'preview.wav', buf, { expiresAt: Date.parse(meta.at) + SONG_DAYS * 864e5 }); return json(req, 200, { ok: true });
      }
      if (part) return json(req, 404, { error: 'not found' });
      const buf = await readLimited(req, MAX_SONG); if (!buf) return json(req, 413, { error: 'too large' });
      let f; try { f = JSON.parse(new TextDecoder().decode(buf)); } catch { return json(req, 400, { error: 'json' }); }
      if (!f || f.noodle !== 'songs' || !Array.isArray(f.songs) || f.songs.length !== 1 || !f.songs[0].song) return json(req, 400, { error: 'song file' });
      if (!meta) { const day = new Date().toISOString().slice(0, 10), ck = `quota/songs/${day}.json`, cur = await B.get(ck), n = cur ? (await cur.json()).n : 0;
        if (n >= MAX_SONGS_PER_DAY) return json(req, 429, { error: 'daily limit' }); await B.put(ck, JSON.stringify({ n: n + 1 }), { expiresAt: Date.now() + 3 * 864e5 }); }
      const at = meta ? meta.at : new Date().toISOString(), exp = Date.parse(at) + SONG_DAYS * 864e5;
      await B.put(base + 'song.json', buf, { expiresAt: exp });
      await B.put(metaKey, JSON.stringify({ owner: await sha(owner), title: String(f.songs[0].title || '').slice(0, 80), at, reports: meta ? meta.reports || 0 : 0 }), { expiresAt: exp });
      return json(req, 200, { ok: true, url: `${url.origin}/s/${id}` });
    }

    if (p[1] === 'admin') {
      const auth = req.headers.get('Authorization') || '';
      if (!env.ADMIN_KEY || auth !== `Bearer ${env.ADMIN_KEY}`) return json(req, 401, { error: 'unauthorized' });
      if (p[2] === 'codes' && req.method === 'PUT') {   // a list of unused Noodle Pro offer codes, added to the pool
        const buf = await readLimited(req, 256 * 1024); let codes; try { codes = JSON.parse(new TextDecoder().decode(buf)); } catch { return json(req, 400, { error: 'json' }); }
        if (!Array.isArray(codes)) return json(req, 400, { error: 'list' }); const cur = await B.get('rewards/pool.json'), pool = cur ? await cur.json() : [];
        for (const c of codes) if (typeof c === 'string' && /^[A-Z0-9]{6,32}$/.test(c) && !pool.includes(c)) pool.push(c);
        await B.put('rewards/pool.json', JSON.stringify(pool)); return json(req, 200, { pool: pool.length });
      }
      if (req.method !== 'GET') return json(req, 405, { error: 'method' });
      if (p[2] === 'list') {
        const page = await B.list({ prefix: url.searchParams.get('prefix') || 'takes/', cursor: url.searchParams.get('cursor') || undefined, limit: 1000 });
        return json(req, 200, { keys: page.objects.map((o) => ({ key: o.key, size: o.size, uploaded: o.uploaded })), cursor: page.truncated ? page.cursor : null });
      }
      if (p[2] === 'get') {
        const key = url.searchParams.get('key') || ''; if (!/^(takes|signups|errors|songs|invites|rewards)\//.test(key)) return json(req, 400, { error: 'key' });
        const o = await B.get(key); if (!o) return json(req, 404, { error: 'not found' });
        return new Response(o.body, { headers: { 'Content-Type': key.endsWith('.json') ? 'application/json' : 'audio/wav' } });
      }
      return json(req, 404, { error: 'not found' });
    }

    if (p[1] === 'signups' && p.length === 2 && (req.method === 'PUT' || req.method === 'DELETE')) {
      const buf = await readLimited(req, 4096); if (!buf) return json(req, 413, { error: 'too large' });
      let m; try { m = JSON.parse(new TextDecoder().decode(buf)); } catch { return json(req, 400, { error: 'json' }); }
      const email = String((m && m.email) || '').trim().toLowerCase();
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json(req, 400, { error: 'email' });
      const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email)))].map((x) => x.toString(16).padStart(2, '0')).join('');
      if (req.method === 'DELETE') { await B.delete('signups/' + h + '.json'); return json(req, 200, { ok: true }); }
      // the person must have agreed to the wording shown to them; it is stored with the address
      if (!m.consent || !m.consent.v || typeof m.consent.text !== 'string' || !m.consent.text.trim()) return json(req, 403, { error: 'consent' });
      if (await B.head('signups/' + h + '.json')) return json(req, 200, { ok: true });
      const day = new Date().toISOString().slice(0, 10), ck = `quota/signups/${day}.json`, cur = await B.get(ck), n = cur ? (await cur.json()).n : 0;
      if (n >= MAX_SIGNUPS_PER_DAY) return json(req, 429, { error: 'daily limit' });
      await B.put(ck, JSON.stringify({ n: n + 1 }), { expiresAt: Date.now() + 3 * 864e5 });
      await B.put('signups/' + h + '.json', JSON.stringify({ email, at: new Date().toISOString(), source: 'noodle', consent: { v: m.consent.v, text: m.consent.text.slice(0, 300) } }), { httpMetadata: { contentType: 'application/json' } });
      return json(req, 200, { ok: true });
    }
    if (p[1] === 'events' && p.length === 2 && req.method === 'POST') {
      const buf = await readLimited(req, 16384); if (!buf) return json(req, 413, { error: 'too large' });
      let m; try { m = JSON.parse(new TextDecoder().decode(buf)); } catch { return json(req, 400, { error: 'json' }); }
      const ev = m && Array.isArray(m.ev) ? m.ev.slice(0, MAX_EVENTS) : null; if (!ev) return json(req, 400, { error: 'ev' });
      const str = (v, n) => String(v == null ? '' : v).slice(0, n), num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
      const app = m.app === 'ios' ? 'ios' : 'web', build = str(m.build, 40), plan = m.plan === 'pro' ? 'pro' : 'free';
      let n = 0;
      for (const x of ev) {
        if (!x || !EVENTS.has(x.e)) continue; const label = str(x.p, 40); if (!LABEL.test(label)) continue;
        if (env.EVENTS) env.EVENTS.writeDataPoint({ indexes: [x.e], blobs: [x.e, label, app, build, plan], doubles: [num(x.v), Math.max(0, Math.min(3650, Math.floor(num(x.d))))] });
        n++;
      }
      return json(req, 200, { ok: true, n });
    }
    if (p[1] === 'errors' && p.length === 2 && req.method === 'PUT') {
      const buf = await readLimited(req, 8192); if (!buf) return json(req, 413, { error: 'too large' });
      let m; try { m = JSON.parse(new TextDecoder().decode(buf)); } catch { return json(req, 400, { error: 'json' }); }
      const str = (v, n) => String(v == null ? '' : v).slice(0, n);
      const rec = { msg: str(m && m.msg, 400), stack: str(m && m.stack, 2000), build: str(m && m.build, 40), app: str(m && m.app, 10), where: str(m && m.where, 40) };
      if (!rec.msg) return json(req, 400, { error: 'msg' });
      // one record per distinct error (message and first stack lines) per day: repeats cost no storage writes
      const day = new Date().toISOString().slice(0, 10), sig = rec.msg + '|' + rec.stack.split('\n').slice(0, 3).join('|') + '|' + rec.build;
      const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sig)))].slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
      const key = `errors/${day}/${h}.json`; if (await B.head(key)) return json(req, 200, { ok: true });
      if (errorsToday(day) > MAX_ERRORS_PER_DAY) return json(req, 429, { error: 'daily limit' });
      await B.put(key, JSON.stringify({ ...rec, at: new Date().toISOString() }), { httpMetadata: { contentType: 'application/json' }, expiresAt: Date.now() + ERROR_DAYS * 864e5 });
      return json(req, 200, { ok: true });
    }
    if (p[1] === 'installs' && p.length === 3 && req.method === 'DELETE') {
      if (!ID.test(p[2])) return json(req, 400, { error: 'id' });
      const n = await deletePrefix(B, `takes/${p[2]}/`); await deletePrefix(B, `quota/${p[2]}/`);
      return json(req, 200, { deleted: n });
    }

    if (p[1] === 'takes' && (p.length === 4 || p.length === 5)) {
      const [, , install, take, part] = p;
      if (!ID.test(install) || !TAKE.test(take)) return json(req, 400, { error: 'id' });
      const base = `takes/${install}/${take}/`;
      if (req.method === 'DELETE' && !part) return json(req, 200, { deleted: await deletePrefix(B, base) });
      if (req.method !== 'PUT') return json(req, 405, { error: 'method' });
      if (part === 'meta') {
        const buf = await readLimited(req, MAX_META); if (!buf) return json(req, 413, { error: 'too large' });
        let m; try { m = JSON.parse(new TextDecoder().decode(buf)); } catch { return json(req, 400, { error: 'json' }); }
        // sharing is opt-in and 13+: the record itself must say so, or it is not stored
        if (!m || typeof m !== 'object' || !m.consent || m.consent.age13 !== true || !m.consent.v) return json(req, 403, { error: 'consent' });
        if (!(await underDailyCap(B, install, take))) return json(req, 429, { error: 'daily limit' });
        const prev = await B.get(base + 'meta.json'); let first = null; try { first = prev && (await prev.json()).receivedAt; } catch {}
        delete m.ua; m.receivedAt = first || new Date().toISOString(); m.updatedAt = new Date().toISOString();
        await B.put(base + 'meta.json', JSON.stringify(m), { httpMetadata: { contentType: 'application/json' }, expiresAt: Date.parse(m.receivedAt) + KEEP_DAYS * 864e5 });
        return json(req, 200, { ok: true });
      }
      if (part === 'audio') {
        // the audio is only kept for a take whose record (with consent) is already here
        const rec = await B.get(base + 'meta.json'); if (!rec) return json(req, 409, { error: 'send meta first' });
        let at = Date.now(); try { at = Date.parse((await rec.json()).receivedAt) || at; } catch {}
        const buf = await readLimited(req, MAX_AUDIO); if (!buf) return json(req, 413, { error: 'too large' });
        if (!isWav(buf)) return json(req, 415, { error: 'wav only' });
        await B.put(base + 'audio.wav', buf, { httpMetadata: { contentType: 'audio/wav' }, expiresAt: at + KEEP_DAYS * 864e5 });
        return json(req, 200, { ok: true });
      }
    }
    return json(req, 404, { error: 'not found' });
  }
}
// The listen page for a shared song: its name, the start of it to play, and a way to get Noodle. On an iPhone with Noodle installed,
// the link opens the app directly (universal link) or Safari's banner offers Open; the app then offers to remix it.
async function listenPage(req, env, B, id) {
  const page = (title, body, status = 200) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>${env.APP_STORE_ID ? `<meta name="apple-itunes-app" content="app-id=${esc(env.APP_STORE_ID)}, app-argument=${esc(new URL(req.url).href)}">` : ''}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="Made with Noodle: hum it, get a song.">
<style>:root{color-scheme:dark}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#121418;color:#eceef2;font:16px/1.45 -apple-system,system-ui,sans-serif}
main{width:min(420px,100% - 32px);text-align:center}h1{font-size:30px;margin:6px 0 2px}.wm{font:800 22px system-ui;letter-spacing:.02em}.wm b{color:#f1c75b}p{color:#9aa1ad;margin:6px 0 18px}
audio{width:100%;margin:12px 0 20px}a.btn{display:block;padding:14px;border-radius:12px;background:#f1c75b;color:#121418;font-weight:700;text-decoration:none;margin:10px 0}
a.alt{background:#262a31;color:#eceef2}small{display:block;color:#6b7280;margin-top:22px}small button{background:none;border:0;color:#6b7280;text-decoration:underline;font:inherit;cursor:pointer}</style></head>
<body><main><div class="wm">N<b>oo</b>dle</div>${body}</main></body></html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
  if (!SONG.test(id)) return page('Not found', '<h1>Song not found</h1><p>This link is not right.</p>', 404);
  const m = await B.get(`songs/${id}/meta.json`), meta = m ? await m.json() : null;
  if (!meta || meta.reports >= REPORTS_TO_HIDE) return page('Not found', '<h1>Song not found</h1><p>It may have been deleted, or the link has expired.</p>', 404);
  const store = env.APP_STORE_URL || 'https://apps.apple.com/', title = meta.title || 'A song made with Noodle';
  return page(title, `<h1>${esc(title)}</h1><p>Made with Noodle. Open it in Noodle to hear all of it and add your own part.</p>
<audio controls preload="none" src="/v1/songs/${esc(id)}/preview"></audio>
<a class="btn" href="noodleapp://s/${esc(id)}">Remix in Noodle</a><a class="btn alt" href="${esc(store)}">Get Noodle on the App Store</a>
<small>Hum, beatbox or sing, and Noodle turns it into a song. <button onclick="fetch('/v1/songs/${esc(id)}/report',{method:'POST'}).then(()=>{this.textContent='Reported. Thank you.';this.disabled=true})">Report this song</button></small>`);
}
// The invite page: what Noodle is, the App Store link, and the code to type into Noodle (More → Invite code) if the link didn't open it.
function invitePage(req, env, code) {
  const c = String(code || '').toUpperCase(), store = env.APP_STORE_URL || 'https://apps.apple.com/';
  const body = INVITE.test(c) ? `<h1>You’re invited to Noodle</h1><p>Hum, beatbox or sing, and Noodle turns it into a song.</p>
<a class="btn" href="${esc(store)}">Get Noodle on the App Store</a><a class="btn alt" href="noodleapp://i/${c}">I have Noodle: open it</a>
<p>Your invite code: <b style="color:#eceef2;letter-spacing:.12em">${c}</b><br>Type it in Noodle (More → Invite code) after your first song.</p>` : '<h1>Invite not found</h1>';
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Noodle invite</title>
${env.APP_STORE_ID ? `<meta name="apple-itunes-app" content="app-id=${esc(env.APP_STORE_ID)}, app-argument=${esc(new URL(req.url).href)}">` : ''}
<style>:root{color-scheme:dark}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#121418;color:#eceef2;font:16px/1.45 -apple-system,system-ui,sans-serif}
main{width:min(420px,100% - 32px);text-align:center}h1{font-size:28px;margin:6px 0 2px}.wm{font:800 22px system-ui}.wm b{color:#f1c75b}p{color:#9aa1ad;margin:8px 0 18px}
a.btn{display:block;padding:14px;border-radius:12px;background:#f1c75b;color:#121418;font-weight:700;text-decoration:none;margin:10px 0}a.alt{background:#262a31;color:#eceef2}</style></head>
<body><main><div class="wm">N<b>oo</b>dle</div>${body}</main></body></html>`, { status: INVITE.test(c) ? 200 : 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
// Apple DeviceCheck: is this a real device running Noodle, and has it joined an invite before? Bit 0 = "joined". Returns 'ok', 'used' or 'bad'.
async function dcJwt(env) {
  const b64u = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const pem = String(env.DC_KEY).replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''), der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = enc({ alg: 'ES256', kid: env.DC_KEY_ID }), body = enc({ iss: String(env.APPLE_APP_ID || '').split('.')[0], iat: Math.floor(Date.now() / 1000) });
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(head + '.' + body));
  return head + '.' + body + '.' + b64u(sig); }
async function deviceOnce(env, token) {
  if (!token || token.length > 8000) return 'bad';
  const host = env.DC_ENV === 'development' ? 'https://api.development.devicecheck.apple.com' : 'https://api.devicecheck.apple.com';
  const call = async (path, extra) => fetch(host + path, { method: 'POST', headers: { Authorization: 'Bearer ' + (await dcJwt(env)), 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_token: token, transaction_id: crypto.randomUUID(), timestamp: Date.now(), ...extra }) });
  const q = await call('/v1/query_two_bits'); if (!q.ok) return 'bad';   // a token that isn't from a real device running this app is refused
  const t = await q.text(); let st = null; try { st = JSON.parse(t); } catch {}   // "Failed to find bit state" = never set
  if (st && st.bit0) return 'used';
  const u = await call('/v1/update_two_bits', { bit0: true, bit1: !!(st && st.bit1) }); return u.ok ? 'ok' : 'bad'; }

