# Noodle: launch roadmap

The running list of what has to happen before Noodle launches on the App Store. Tick items off as they land, add new ones as they
come up, and keep one line of status per item. `[ ]` to do, `[~]` started, `[x]` done. **Owner** marks a decision only the owner can make.

## 1. Analytics
Today Noodle sends no usage analytics: only crash reports, opt-in shared takes, song links, invites and email sign-ups.
- [x] **Owner:** questions picked: first-song funnel, Pro funnel, feature use, return rates (day 1 / 7 / 30).
- [x] How: Cloudflare Workers Analytics Engine behind the takes service (`POST /v1/events`), no outside company. Free plan: 100,000 events a day, kept 3 months.
- [x] Events in the app (`noodle/js/takes.js`, `track()`): first open / take / 2-part song / export / share, daily open, takes by part type,
      exports by kind, song links, parts and sounds in finished songs, session totals, Pro sheet, Pro tries, buy, purchase result, restore.
- [x] Private by design: no song content, no IP, no name or email. A random usage-stats ID (separate from the takes/links/invites ID)
      lets one phone's path be followed and the owner's phones be left out. More → Send usage stats turns it off and deletes the ID.
- [x] All three privacy files updated (Product Interaction, not linked, Analytics).
- [x] Takes service deployed with `/v1/events` (Analytics Engine enabled on the Cloudflare account).
- [x] Dashboard: "Noodle Usage" (private claude.ai page), refreshed daily at 04:13 UTC by a scheduled task, or on request
      (steps in `noodle-api/README.md`). Reads `GET /v1/admin/stats` (token: `ANALYTICS_TOKEN` secret on the takes service).
- [ ] New iPhone build (Xcode / TestFlight): the app runs its bundled copy of the web app, so iPhone usage is only counted
      from the first build made after the usage stats change.
- [ ] After that build: find the owner's usage-stats ID and add it to the leave-out list (`PUT /v1/admin/stats-exclude`).
- [ ] App Store Connect privacy answers: enter them from `noodle-ios/APP_STORE_PRIVACY.md` (Device ID now also for Analytics; Product Interaction).

## 2. Final UI deep dive
- [ ] Screen-by-screen review against `noodle/STYLE.md`: first open, recording, note editor, drum editor, track menus, mix, More,
      Pro sheet, export, song links.
- [ ] First-run flow: a new person gets from opening the app to hearing their own song quickly, with no explanations needed.
  Done: Get started goes straight to the Studio. Sharing takes is asked after the first kept take, email news after the first finished
  song (back on the Songs list), Teach Noodle your voice after the third kept take.
- [x] Empty, error and offline states: mic refused (a sheet with Open Settings and Import), song link offline vs. deleted, nothing heard (already explained).
- [x] Small and large iPhones (SE 375 pt to Pro Max 430 pt: everything fits) and VoiceOver names on every control (ⓘ reads its explanation).
- [ ] **Owner:** larger text (Dynamic Type): the app's text doesn't grow with the iPhone's Text Size setting yet. Decide whether the app
  should zoom with it (Claude's suggestion: up to about 120%, so layouts still fit). Light mode is now a real light theme; owner to check.
- [ ] Copy pass: no AI-sounding words, plain names, ⓘ for explanations.
- [ ] New rules from the review go into `STYLE.md`.

## 3. Final voice-to-MIDI tuning
- [ ] **Owner:** decide the Tap notes A/B test (keep, change or drop) so it can leave Xcode-only builds or be removed.
- [ ] Run the full eval (`noodle/eval/run.sh`) and record a baseline round in `eval/README.md`.
- [ ] Tune the weak spots it shows (repeated notes, fast runs, note ends, beatbox hits in noisy rooms), checked against the owner's takes.
- [ ] Test on older and slower iPhones: no lag between singing and notes, no dropped audio.
- [ ] Quiet-room and noisy-room takes; AirPods and the built-in mic.

## 4. App Store listing and optimization
Draft copy is in `noodle-ios/APP_STORE_LISTING.md`.
- [x] **Owner:** Pro price: $4.99 (set in App Store Connect).
- [ ] Final name, subtitle and keywords; check what similar apps rank for.
- [ ] Screenshots (`noodle-ios/app-store/make_screenshots.js`): final set for the latest UI, first two screenshots carry the pitch.
- [ ] App preview video (hum → song in 15–30 s).
- [ ] Privacy answers entered in App Store Connect from `APP_STORE_PRIVACY.md`.
- [ ] Review notes for Apple (how to test Pro, song links, reporting a song).
- [ ] Ask for ratings in the app at a good moment (after a finished song), not on first open.

## 5. Pro and pricing
- [ ] **Owner:** confirm or change every "proposed" line in `noodle/PRO.md`, so the code and the list match what launches.
- [ ] Purchase, restore and the invite reward (offer codes) tested end to end in TestFlight with a sandbox account.

## 6. Legal and privacy
- [ ] **Owner:** read the privacy policy once more (`noodle/privacy/`; effective date 22 Nov 2026 is set, no draft notice left).
- [x] Terms of use drafted (`noodle/terms/`), agreed to before a first song link, linked in More; App Review note on user content written.
- [ ] **Owner:** review the terms draft (24-hour report response is promised there), then remove the draft box and set the date.
- [x] Sample and sound licenses checked for commercial use (`noodle/samples/CREDITS.md`) and credited in the app (More → Sound credits).
- [x] Reporting a shared song works and the owner can see and act on it: `GET /v1/admin/reports`, take down or restore (takes service).
- [ ] **Owner:** deploy the takes service, and turn on the report email (Cloudflare Email Routing; steps in `noodle-api/README.md`).
- [ ] **Owner:** auto-forward support messages and song reports to your personal email, so you see them in time:
  - Song reports (sent by the takes service once the report email is on): from `REPORT_FROM` (e.g. noodle@tuttii.io), subject
    `Noodle: song reported (<count>) “<song title>”`, or `Noodle: song reported and hidden (<count>) “<song title>”` once it is hidden.
    Filter: subject starts with `Noodle: song reported`.
  - Support (Help and contact, the support page): to info@tuttii.io, subject `Noodle support` (filled in for people, but they can change it),
    so forwarding everything sent to info@tuttii.io is the safe rule.
- [ ] **Owner (decide later):** a support address of its own (e.g. noodle-support@tuttii.io) so a forwarding filter on the address catches
  every support message (a mail app always lets people edit the subject). Then Claude switches the app, support page, privacy policy,
  terms and App Review notes to it. Alternative: an in-app contact form sent through the takes service with a fixed subject prefix
  (more work, and the privacy policy and App Store answers would change).
- [ ] **Owner:** review reported songs within 2 working days (the terms promise it). A report hides the song at once; restore with
  `PUT /v1/admin/songs/<id>/restore`, remove with `DELETE /v1/admin/songs/<id>` (admin key; see `noodle-api/README.md`).

## 7. Server (takes service) readiness
- [ ] **Owner:** move the deploy out of the Fan to See repo into its own Cloudflare token and workflow (see `noodle-api/README.md`), or keep it.
- [ ] Check Cloudflare free-plan limits (requests, KV reads/writes, storage) against launch-day traffic; know what happens if they're hit.
- [x] Alerts: `.github/workflows/noodle-health.yml` checks the service every 30 minutes, and once a day checks crash reports (more than 25
  distinct a day) and reported songs waiting for review. A failed run is the alert: GitHub emails you.
- [ ] **Owner:** for the daily checks, add the repository secret `NOODLE_ADMIN_KEY` (the takes service's `ADMIN_KEY`) in this repo's
  Settings → Secrets and variables → Actions. Check that GitHub emails you about failed workflow runs (github.com → Settings →
  Notifications → Actions). If the repo goes 60 days without changes, GitHub pauses the schedule; turn it back on under Actions.
- [x] App-side security fixes (from the security review): the website ignores a saved Pro flag and console purchase reports (Pro is
  bought in the iPhone app); the app gives the microphone only to Noodle's own pages; a song file with an unknown instrument or broken
  settings opens without errors (the bad part is left out, missing settings get defaults).
- [x] Rate limits on sign-ups, song links and invites, so one person can't fill the storage: reads limited too (240 a minute per address),
      daily storage budgets for song links and take audio (150 MB each), previews 1.5 MB at most, invites closed without DeviceCheck.
      Still true: 1 GB free storage fills in about a week of heavy use (real or not); then move to R2 or clear old takes.
- [ ] **Owner, before launch, in this order** (the code is all on `main`; nothing is live until step 4):
  1. Confirm the Cloudflare account is on the Free Workers plan (Workers & Pages → Plans). On Paid, overuse is billed with no cap: then
     set billing alerts first.
  2. Set `DC_KEY` (the DeviceCheck .p8 file's text) and `DC_KEY_ID` on the noodle-takes Worker: invite joins are refused until they are set.
  3. Check `ADMIN_KEY` is long and random (32+ characters); if you replace it, update it where Claude sessions get it.
  4. Deploy the takes service (Actions → "Noodle takes service" in the Fan to See repo).
  5. Narrow the Cloudflare API token (My Profile → API Tokens) to Workers Scripts Edit and Workers KV Storage Edit on this account only
     (it also controls Fan to See).
- [x] **Owner** decided (25 Nov): takes are kept 1 year (was 3; privacy policy updated). Watch storage with `GET /v1/admin/usage`
  and move to R2 (10 GB free, needs a card; set billing alerts) when it passes about 70% of the free 1 GB.
- [x] Daily storage alert: `.github/workflows/noodle-health.yml` reads `GET /v1/admin/usage` once a day and fails (emails you) above 700 MB
  of the free 1 GB. Until the takes service is deployed with that route, it shows a warning instead.
- [ ] **Owner, before anyone gets news: email list with Kit (free plan, up to 10,000 subscribers).** Sign-ups aren't checked today
  (anyone can add or remove any address), so each address must confirm by email first. Cloudflare can only email verified addresses,
  so Kit sends the confirmation. A 10-minute test first, since Kit's docs don't say whether these two work:
  double opt-in on the free plan, and the confirmation email when someone is added through the API.
  1. Make a free account at https://kit.com/ on the free plan. If it asks for a card, stop and tell Claude. (It will likely ask for a
     mailing address for email footers; anti-spam laws require one.)
  2. Make a form: Grow → Landing Pages & Forms → Create new → Form (any design). In its settings turn on the confirmation email
     (Kit calls it the "incentive email"). If there is no such option on the free plan, tell Claude.
  3. Note the form's number in the address bar while editing it.
  4. Make an API key: https://app.kit.com/account_settings/developer_settings → Add a new key → name it "Noodle" → copy it (shown once).
     Don't paste it in chat: tell Claude, which opens a secure form to save it.
  5. Claude adds your own address through the API. If a "please confirm" email arrives, Claude connects Noodle's sign-ups to Kit
     (the key becomes the Cloudflare secret `KIT_API_KEY`) and moves the addresses already collected over, asking each to confirm once.
  If no confirmation arrives: the service can post to Kit's public form like a website form does (no key; not a documented API),
  or switch to Brevo (300 emails a day free; its double opt-in sign-up still to be checked).
- [x] Cloudflare token given only to the deploy step (Fan to See `noodle-takes.yml`, on its `main` since 25 Nov).
- [x] Hardening (25 Nov): strict WAV check, nosniff on every reply, report emails only on a song's first report (30 a day at most),
      reports stop being stored after 10, Pro codes marked when handed out (no double handout), `GET /v1/admin/usage` storage meter.

## 8. Quality
- [ ] Crash reports reviewed and the top crashes fixed.
- [ ] A TestFlight beta with a handful of outside people; collect what confuses them.
- [ ] Songs survive an app update (saved songs open in the new build).
- [x] Owner review 22 Nov: stuck Pro sheet fixed, FX start quieter, tap empty space to deselect, one Loop button with the yellow band,
  plainer Pro preview text, Delete track button, drum fills per part (round 15 in `eval/README.md`).
- [x] Owner review 24 Nov (round 16 in `eval/README.md`): example loops with a sweep up, risers' Octave, bar numbers in every editor,
  handles on a new part's outline, Transitions / Mix effects names, track names follow the pick, Bitcrusher and Vinyl brake rebuilt.
- [ ] **Owner:** confirm the new "proposed" lines in `PRO.md` (track names, new-part handles, Octave on Transitions).
- [x] Metronome buzz checked by the owner (25 Nov): −15 ms felt right, now the default (Buzz timing still there). The double buzz at the start
  (the record-start tap landing on the first beat) is gone.
- [ ] **Owner:** launch date, and whether to release by hand after Apple approves.
- [ ] Website landing page with the App Store link, and the support page (`noodle/support/`) current.
- [ ] Launch posts and a short demo video for TikTok, Reels and Shorts.
- [ ] First-week plan: read reviews and crash reports daily, ship a quick fix build if needed.

## Faster beat making (owner, 25 Nov; build in small chunks, test each)
- [x] Finish song: one tap fills in what's missing (drums, bass, chords, a melody, transitions, a mix effect). Free.
- [x] Finish song writes real lead melodies (most of the time; otherwise an arp), from the tables Musical mode learned from ~45,000
  public-domain and CC0 tunes: call-and-response 2-bar phrases, chord tones on strong beats, real phrase endings, any key.
- [x] Chords and bass from data (round 24): progressions with their harmonic rhythm, bass patterns and comping rhythms learned from
  15,247 public-domain songs (`harmony.json`).
- [x] Draw notes: Draw (next to + All notes in the note editor); a finger line becomes notes on the beat and in the key, replacing what
  was under it. One voice for now.
- [ ] Draw chords: a second line over the first adds a second voice (toward drawn chords).
- [ ] Chord pads: the key's chords as big buttons; tap them in time to record a progression; the bass can follow.
- [ ] Tap a rhythm, Noodle picks the notes: a melody that fits the chords from tapped timing alone.
- [ ] In-key note pads: one pad per note of the scale for tapping a melody (then Tidy).
- [ ] Continue this: stretch a 2-bar part to 8 bars with variation and an answering phrase.
- [ ] Play pad (an XY pad, inspired by the Kaossilator, own design and name): across = notes in the key, up and down = the sound
  (brightness / effect), recorded with the notes; range, snap and an arpeggio mode under More settings.

## After launch (not blocking)
Ideas in `noodle/IDEAS.md` (beat pads, strumming, face tracking and more).
