# Noodle takes service

Stores takes people chose to share (opt-in, 13+) so Noodle can learn from them. Cloudflare Worker + R2 bucket `noodle-takes`,
separate from Fan to See. API and rules are at the top of `src/index.js`. `npm test` runs the tests (no dependencies).

- No accounts. Each install has a random id only that phone knows; it can add, update and delete its own takes.
- A record is stored only if it carries `consent: {v, age13: true}`; audio only after its record. No IP addresses are stored.
- Limits: 3 MB audio (WAV), 256 KB record, 300 takes per install per day.
- Owner access (`/v1/admin/*`) needs the `ADMIN_KEY` secret.

## One-time setup (owner)
1. Cloudflare dashboard → R2 → enable R2 (asks for a payment card; the first 10 GB are free, about 30,000 takes).
2. Cloudflare → My Profile → API Tokens → Create Token → Custom: **Workers Scripts: Edit** and **Workers R2 Storage: Edit** on the account.
3. GitHub → arcade → Settings → Secrets and variables → Actions → New repository secret `CLOUDFLARE_API_TOKEN` = that token.
4. GitHub → Actions → "Noodle takes service" → Run workflow.
5. Cloudflare → Workers → noodle-takes → Settings → Variables and Secrets → add secret `ADMIN_KEY` (any long random text; keep it private).
