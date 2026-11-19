# Noodle takes service

Stores takes people chose to share (opt-in, 13+) so Noodle can learn from them. Cloudflare Worker + KV namespace `noodle-takes`
(free plan, no card), separate from Fan to See. API and rules are at the top of `src/index.js`. `npm test` runs the tests (no dependencies).

- No accounts. Each install has a random id only that phone knows; it can add, update and delete its own takes.
- A record is stored only if it carries `consent: {v, age13: true}`; audio only after its record. No IP addresses are stored.
- Limits: 3 MB audio (WAV), 256 KB record, 300 takes per install per day, 40 writes a minute per address (counted in memory only, best-effort).
- Takes are kept 3 years at most, counted from when they first arrived (storage expires them on its own).
- Optional email list (`/v1/signups`): address + date + the consent wording agreed to, deduplicated, removable; 400 new addresses a day at most.
  Not linked to takes. To be copied into Tuttii's marketing sheet (by hand or a script using the admin endpoints).
- Crash reports (`/v1/errors`): error message, a few stack lines, app build, app or web, screen. No recordings, song content or ID. One record per distinct error per day (`errors/<day>/<hash>.json`), kept 90 days, at most 150 new ones a day. Read them with `/v1/admin/list?prefix=errors/`.
- Song links (`/v1/songs/*`, listen page `/s/<id>`): a song someone chose to share by link (song file up to 8 MB + a 30 s WAV preview).
  Anyone with the link can read it; only the sharing phone (its install id, stored hashed) can replace or delete it. Kept 2 years;
  3 reports hide it; 250 new links a day at most (about 750 of the free plan's 1,000 daily writes in the worst case).
  Reports (from the app or the page) carry a reason; to review them: `GET /v1/admin/list?prefix=songs/` then `GET /v1/admin/get?key=songs/<id>/meta.json`
  (`reports`, `reasons`). Reply to anyone who writes to info@tuttii.io; delete a song by removing its `songs/<id>/` keys in the KV namespace.
  Variables: `APPLE_APP_ID` (for `/.well-known/apple-app-site-association`), `APP_STORE_ID`, `APP_STORE_URL` (listen page).
- Invites (`/v1/invites/*`, page `/i/<code>`): a 6-letter code per phone; friends' phones count once (hashed ids). 3 friends earn a Noodle Pro
  offer code from a pool: App Store Connect → Noodle → Monetization → In-App Purchases → Noodle Pro → Offer Codes → create one-time-use
  codes, download them, then `curl -X PUT -H "Authorization: Bearer $ADMIN_KEY" --data '["CODE1","CODE2"]' https://noodle-takes.cracked.workers.dev/v1/admin/codes`.
  At most 25 handed out a day. Abuse risk: a script could fake friends; the pool size and daily cap bound it (Apple's DeviceCheck would close it).
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
