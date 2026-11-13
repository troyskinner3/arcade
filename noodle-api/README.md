# Noodle takes service

Stores takes people chose to share (opt-in, 13+) so Noodle can learn from them. Cloudflare Worker + KV namespace `noodle-takes`
(free plan, no card), separate from Fan to See. API and rules are at the top of `src/index.js`. `npm test` runs the tests (no dependencies).

- No accounts. Each install has a random id only that phone knows; it can add, update and delete its own takes.
- A record is stored only if it carries `consent: {v, age13: true}`; audio only after its record. No IP addresses are stored.
- Limits: 3 MB audio (WAV), 256 KB record, 300 takes per install per day.
- Owner access (`/v1/admin/*`) needs the `ADMIN_KEY` secret.

## Cost: none, by design
Storage is Workers KV on the free plan: no payment card, and when a limit is reached Cloudflare refuses the write (the app just keeps the
take on the phone) instead of charging. Free limits: 1 GB stored (about 3,400 takes), 1,000 writes a day (about 250–300 takes a day),
100,000 requests a day. This only stays true while the Cloudflare account is on the **Free** Workers plan: on the $5/month paid plan,
going over is billed. If Noodle outgrows this, bind an R2 bucket as `TAKES` and the same code uses it.

## One-time setup (owner)
1. Cloudflare → My Profile → API Tokens → Create Token → Custom: **Workers Scripts: Edit** and **Workers KV Storage: Edit** on the account.
2. GitHub → arcade → Settings → Secrets and variables → Actions → New repository secret `CLOUDFLARE_API_TOKEN` = that token.
3. Push to main (or GitHub → Actions → "Noodle takes service" → Run workflow).
4. Cloudflare → Workers → noodle-takes → Settings → Variables and Secrets → add secret `ADMIN_KEY` (any long random text; keep it private).

Local testing: `node dev/local-server.mjs` runs the service on localhost:8787 with in-memory storage (admin key `local`).
