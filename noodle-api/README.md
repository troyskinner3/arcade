# Noodle takes service

Stores takes people chose to share (opt-in, 13+) so Noodle can learn from them. Cloudflare Worker + KV namespace `noodle-takes`
(free plan, no card), separate from Fan to See. API and rules are at the top of `src/index.js`. `npm test` runs the tests (no dependencies).

- No accounts. Each install has a random id only that phone knows; it can add, update and delete its own takes.
- A record is stored only if it carries `consent: {v, age13: true}`; audio only after its record. No IP addresses are stored.
- Limits: 3 MB audio (WAV), 256 KB record, 300 takes per install per day, 150 MB of take audio a day for everyone together, 40 writes and
  240 reads a minute per address (counted in memory only, best-effort; admin calls included).
- Takes are kept 3 years at most, counted from when they first arrived (storage expires them on its own).
- Optional email list (`/v1/signups`): address + date + the consent wording agreed to, deduplicated, removable; 400 new addresses a day at most.
  Not linked to takes. To be copied into Tuttii's marketing sheet (by hand or a script using the admin endpoints).
- Crash reports (`/v1/errors`): error message, a few stack lines, app build, app or web, screen. No recordings, song content or ID. One record per distinct error per day (`errors/<day>/<hash>.json`), kept 90 days, at most 150 new ones a day. Read them with `/v1/admin/list?prefix=errors/`.
- Song links (`/v1/songs/*`, listen page `/s/<id>`): a song someone chose to share by link (song file up to 8 MB + a 30 s WAV preview of 1.5 MB at most; new links share a 150 MB daily budget, preview room included).
  Anyone with the link can read it; only the sharing phone (its install id, stored hashed) can replace or delete it. Kept 2 years;
  The first report hides it until the owner looks (restore puts it back); 250 new links a day at most (about 750 of the free plan's 1,000 daily writes in the worst case).
  Reports (from the app or the page) carry a reason. `GET /v1/admin/reports` lists every reported song (title, reports, reasons, whether it is
  hidden, first and last report), newest first. Take one down with `DELETE /v1/admin/songs/<id>`, or put back one hidden by mistake with
  `PUT /v1/admin/songs/<id>/restore` (all with the admin key). Reply to anyone who writes to info@tuttii.io.
  **Email on every report (Apple asks for timely responses to reports):** turn on Cloudflare Email Routing for tuttii.io, add your address as a
  verified destination, uncomment the `send_email` block in `wrangler.toml`, and set `REPORT_FROM` (e.g. noodle@tuttii.io) and `REPORT_TO`
  under Workers & Pages → noodle-takes → Settings → Variables. Then deploy. The email names the song, the reasons and the two admin calls.
  One report from anyone hides a song (reports aren't tied to people, by design: nothing identifying is stored), so a false report hides a
  song until the owner looks; the email says so, and `PUT /v1/admin/songs/<id>/restore` puts it back. Review within 2 working days.
  Variables: `APPLE_APP_ID` (for `/.well-known/apple-app-site-association`), `APP_STORE_ID`, `APP_STORE_URL` (listen page).
- Invites (`/v1/invites/*`, page `/i/<code>`): a 6-letter code per phone; friends' phones count once (hashed ids). 3 friends earn a Noodle Pro
  offer code from a pool: App Store Connect → Noodle → Monetization → In-App Purchases → Noodle Pro → Offer Codes → create one-time-use
  codes, download them, then `curl -X PUT -H "Authorization: Bearer $ADMIN_KEY" --data '["CODE1","CODE2"]' https://noodle-takes.cracked.workers.dev/v1/admin/codes`.
  At most 25 handed out a day.
- **DeviceCheck (stops fake friends):** developer.apple.com → Certificates, IDs & Profiles → **Keys** → **+** → name `Noodle DeviceCheck`, tick
  **DeviceCheck** → Continue → Register → **Download** the `.p8` (only once) and note its **Key ID**. Cloudflare → noodle-takes → Settings →
  Variables and Secrets: add **Secret** `DC_KEY` = the whole `.p8` file's text, **Secret** `DC_KEY_ID` = the Key ID. While testing with builds run
  from Xcode, also add Text `DC_ENV` = `development`; delete it before the App Store release (TestFlight and App Store use production).
  From then on a join needs a real iPhone running Noodle, and each iPhone can join only once, ever. Without `DC_KEY`, joins are refused with 503 (the app keeps the
  code and tries later), because install ids are free to make up and anyone could collect Pro codes. `INVITES_WITHOUT_DEVICECHECK` = `1`
  turns that off; it is for local testing only (`dev/local-server.mjs` sets it).
- Owner access (`/v1/admin/*`) needs the `ADMIN_KEY` secret.

## Cost: none, by design
Storage is Workers KV on the free plan: no payment card, and when a limit is reached Cloudflare refuses the write (the app just keeps the
take on the phone) instead of charging. Free limits: 1 GB stored (about 3,400 takes), 1,000 writes a day (about 250–300 takes a day),
100,000 requests a day. This only stays true while the Cloudflare account is on the **Free** Workers plan: on the $5/month paid plan,
going over is billed. If Noodle outgrows this, bind an R2 bucket as `TAKES` and the same code uses it.

## How it deploys (read this first: it is unusual)
**The code lives here, but it is deployed from a different repository.** The Fan to See repo (`Persnickety-Games/fantasy-lab`) already holds the
Cloudflare token as its `CLOUDFLARE_API_TOKEN` secret, so its workflow `.github/workflows/noodle-takes.yml` checks out **this** repo's `main`
branch and deploys `noodle-api/` with that token. Chosen so the owner had no new token to create; the two projects are otherwise separate.

- To release a change: push it to `main` here, then run **"Noodle takes service"** in the fantasy-lab repo's Actions tab (Run workflow).
  It is never triggered by pushes to either repo and is not part of the Fan to See site deploy.
- The Worker is `noodle-takes` and its KV namespace is `noodle-takes`, on the same Cloudflare account as Fan to See, sharing nothing with it.
- If that token is ever rotated or removed in fantasy-lab, this deploy stops working until it is replaced there.
- To move the deploy into this repo later: add a `CLOUDFLARE_API_TOKEN` secret here (Workers Scripts: Edit, Workers KV Storage: Edit),
  copy the deploy steps from fantasy-lab's `noodle-takes.yml` into `.github/workflows/noodle-api.yml`, and delete the workflow there.
- Owner step after the first deploy: Cloudflare → Workers → noodle-takes → Settings → Variables and Secrets → add secret `ADMIN_KEY`
  (any long random text; keep it private). Without it, the owner-only read endpoints refuse everyone.

Local testing: `node dev/local-server.mjs` runs the service on localhost:8787 with in-memory storage (admin key `local`).

## Usage stats (`POST /v1/events`)
Anonymous counts from the app go to Workers Analytics Engine (binding `EVENTS`, dataset `noodle_events`, in `wrangler.toml`), not to KV.
The dataset is created on the first write. Free plan: 100,000 data points written and 10,000 read queries a day; data is kept 3 months.
Each point: index and blob 1 = the event name, blob 2 = a short label, blob 3 = ios/web, blob 4 = build, blob 5 = free/pro,
blob 6 = the phone's random usage-stats ID (made in the app only for stats, deleted when stats are turned off; empty from older builds);
double 1 = a number (e.g. parts in a song), double 2 = days since that phone first opened Noodle. Allowed names: `EVENTS` in `src/index.js`.
Reading them needs the SQL API (`https://api.cloudflare.com/client/v4/accounts/<account_id>/analytics_engine/sql`) and a token with
Account → Account Analytics → Read, e.g. `SELECT blob1 AS e, SUM(_sample_interval) AS n FROM noodle_events GROUP BY e`.
The owner's dashboard reads them through `GET /v1/admin/stats?days=30` (Authorization: Bearer ADMIN_KEY), which runs the SQL queries with the
`ANALYTICS_TOKEN` secret (set in the dashboard: Workers & Pages → noodle-takes → Settings → Variables and Secrets) and `CF_ACCOUNT_ID` from `wrangler.toml`.

## Refreshing the Noodle Usage dashboard
The owner's dashboard is a private claude.ai artifact, "Noodle Usage" (https://claude.ai/artifact/CXDKybVBgjdcEJ4smrxRxZ). Its four datasets
(`events`, `daily`, `opens`, `split`, `phones`) are JSON files made by `dev/stats-files.mjs`. A scheduled task ("Noodle Usage dashboard refresh",
04:13 UTC daily) refreshes them; the owner can also ask Claude for a refresh at any time. In a Claude Code cloud session (which adds the
admin key to requests to the takes service):
1. `NODE_USE_ENV_PROXY=1 node noodle-api/dev/stats-files.mjs <scratch>/stats 30`
2. Upload the five files to the artifact as assets (Artifact tool: publish, `asset: true`).
3. Read `datasets/<id>` for each and, in one ArtifactData batch pinned to those versions, update `source.url` to the new `/_blob/...`
   and `updated: {at, by}`. Change nothing else.
4. Delete the five old assets (the id after `/_blob/` in each old `source.url`).

The owner's own phones are left out of every number: `PUT /v1/admin/stats-exclude` with a JSON list of usage-stats IDs (replaces the
list; `GET` shows it). To find a phone's ID: it is the `id` of its rows in `GET /v1/admin/stats` (`phones`), e.g. the only `ios` phone
while TestFlight has one tester.
