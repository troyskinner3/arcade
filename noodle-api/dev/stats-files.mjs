// Writes the Noodle usage dashboard's data files from the takes service's owner-only stats route.
// Usage (in a Claude Code cloud session, where the admin key is added to requests to the takes service):
//   NODE_USE_ENV_PROXY=1 node noodle-api/dev/stats-files.mjs <out-dir> [days]
// Out: events.json, daily.json, opens.json, split.json, phones.json (each a JSON list of rows), for the "Noodle Usage" dashboard.
import { writeFile, mkdir } from 'node:fs/promises';
const [out = 'stats-out', days = '30'] = process.argv.slice(2);
const r = await fetch(`https://noodle-takes.cracked.workers.dev/v1/admin/stats?days=${days}`, { headers: process.env.ADMIN_KEY ? { Authorization: `Bearer ${process.env.ADMIN_KEY}` } : {} });
const s = await r.json();
if (!r.ok || s.error) { console.error('stats failed:', r.status, s.error || ''); process.exit(1); }
await mkdir(out, { recursive: true });
const files = {
  'events.json': s.totals.map((x) => ({ event: x.e, label: x.p || '', count: x.n, value: x.v })),
  'daily.json': s.daily.map((x) => ({ day: x.day, event: x.e, count: x.n })),
  'opens.json': s.opens.map((x) => ({ days_since_first_open: x.d, opens: x.n })),
  'split.json': s.split.map((x) => ({ app: x.app, plan: x.plan, opens: x.n })),
  'phones.json': phoneRows(s.phones || []),
};
for (const [f, rows] of Object.entries(files)) await writeFile(`${out}/${f}`, JSON.stringify(rows) + '\n');
console.log(JSON.stringify({ at: s.at, days: s.days, rows: Object.fromEntries(Object.entries(files).map(([f, v]) => [f, v.length])) }));

// One row per phone (its usage-stats ID, shortened to 8 characters): where, first and last seen, opens, takes, and the furthest step reached.
function phoneRows(rows) {
  const STEPS = [['first_open', 'Opened'], ['take', 'Recorded a take'], ['first_song', 'Song with 2+ parts'], ['export', 'Exported'], ['share_link', 'Shared a link'], ['pro_buy', 'Tapped Unlock Pro']];
  const by = new Map();
  for (const r of rows) {
    const p = by.get(r.id) ?? { phone: r.id.slice(0, 8), app: r.app, first_seen: r.first, last_seen: r.last, opens: 0, takes: 0, events: new Set() };
    if (r.first < p.first_seen) p.first_seen = r.first; if (r.last > p.last_seen) p.last_seen = r.last;
    if (r.e === 'open') p.opens += r.n; if (r.e === 'take') p.takes += r.n; p.events.add(r.e); by.set(r.id, p);
  }
  return [...by.values()].map(({ events, ...p }) => ({ ...p, furthest: [...STEPS].reverse().find(([e]) => events.has(e))?.[1] ?? 'Opened' })).sort((a, b) => (a.last_seen < b.last_seen ? 1 : -1));
}
