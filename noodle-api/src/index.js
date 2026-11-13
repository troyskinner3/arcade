// Noodle takes service: stores takes that people chose to share so Noodle can learn from them.
// A take = the recording (16 kHz mono WAV) + a JSON record (what Noodle heard, the notes now, edits, context).
// No accounts: each install has a random id that only that phone knows; it can add, update and delete its own takes.
// Nothing here stores IP addresses or anything that identifies a person.
//
//   PUT    /v1/takes/:install/:take/audio   body = WAV bytes
//   PUT    /v1/takes/:install/:take/meta    body = JSON (must carry consent: {v, age13: true})
//   DELETE /v1/takes/:install/:take         delete one take
//   DELETE /v1/installs/:install            delete everything this install shared
//   GET    /v1/admin/list?prefix=&cursor=   owner only (Authorization: Bearer ADMIN_KEY)
//   GET    /v1/admin/get?key=               owner only
const ORIGINS = ['noodle://app', 'https://troyskinner3.github.io'];
const MAX_AUDIO = 3 * 1024 * 1024, MAX_META = 256 * 1024, MAX_TAKES_PER_DAY = 300;
const ID = /^[A-Za-z0-9_-]{22,64}$/, TAKE = /^[A-Za-z0-9_-]{6,64}$/;

function cors(req) {
  const o = req.headers.get('Origin') || '';
  const ok = ORIGINS.includes(o) || /^http:\/\/localhost(:\d+)?$/.test(o);
  return { 'Access-Control-Allow-Origin': ok ? o : ORIGINS[1], 'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' };
}
const json = (req, status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(req) } });

async function readLimited(req, max) {
  const len = +req.headers.get('Content-Length') || 0;
  if (len > max) return null;
  const buf = await req.arrayBuffer();
  return buf.byteLength > max ? null : buf;
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
  seen.push(take); await bucket.put(key, JSON.stringify(seen)); return true;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), p = url.pathname.split('/').filter(Boolean), B = env.TAKES;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    if (p[0] !== 'v1') return json(req, 404, { error: 'not found' });

    if (p[1] === 'admin') {
      const auth = req.headers.get('Authorization') || '';
      if (!env.ADMIN_KEY || auth !== `Bearer ${env.ADMIN_KEY}`) return json(req, 401, { error: 'unauthorized' });
      if (req.method !== 'GET') return json(req, 405, { error: 'method' });
      if (p[2] === 'list') {
        const page = await B.list({ prefix: url.searchParams.get('prefix') || 'takes/', cursor: url.searchParams.get('cursor') || undefined, limit: 1000 });
        return json(req, 200, { keys: page.objects.map((o) => ({ key: o.key, size: o.size, uploaded: o.uploaded })), cursor: page.truncated ? page.cursor : null });
      }
      if (p[2] === 'get') {
        const key = url.searchParams.get('key') || ''; if (!key.startsWith('takes/')) return json(req, 400, { error: 'key' });
        const o = await B.get(key); if (!o) return json(req, 404, { error: 'not found' });
        return new Response(o.body, { headers: { 'Content-Type': key.endsWith('.json') ? 'application/json' : 'audio/wav' } });
      }
      return json(req, 404, { error: 'not found' });
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
        delete m.ua; m.receivedAt = new Date().toISOString();
        await B.put(base + 'meta.json', JSON.stringify(m), { httpMetadata: { contentType: 'application/json' } });
        return json(req, 200, { ok: true });
      }
      if (part === 'audio') {
        // the audio is only kept for a take whose record (with consent) is already here
        if (!(await B.head(base + 'meta.json'))) return json(req, 409, { error: 'send meta first' });
        const buf = await readLimited(req, MAX_AUDIO); if (!buf) return json(req, 413, { error: 'too large' });
        if (!isWav(buf)) return json(req, 415, { error: 'wav only' });
        await B.put(base + 'audio.wav', buf, { httpMetadata: { contentType: 'audio/wav' } });
        return json(req, 200, { ok: true });
      }
    }
    return json(req, 404, { error: 'not found' });
  },
};
