# Noodle: launch roadmap

The running list of what has to happen before Noodle launches on the App Store. Tick items off as they land, add new ones as they
come up, and keep one line of status per item. `[ ]` to do, `[~]` started, `[x]` done. **Owner** marks a decision only the owner can make.

## 1. Analytics
Today Noodle sends no usage analytics: only crash reports, opt-in shared takes, song links, invites and email sign-ups.
- [x] **Owner:** questions picked: first-song funnel, Pro funnel, feature use, return rates (day 1 / 7 / 30).
- [x] How: Cloudflare Workers Analytics Engine behind the takes service (`POST /v1/events`), no outside company. Free plan: 100,000 events a day, kept 3 months.
- [x] Events in the app (`noodle/js/takes.js`, `track()`): first open / take / 2-part song / export / share, daily open, takes by part type,
      exports by kind, song links, parts and sounds in finished songs, session totals, Pro sheet, Pro tries, buy, purchase result, restore.
- [x] Anonymous: no install ID, no song content, no IP. More → Send usage stats turns it off (on by default, like crash reports).
- [x] All three privacy files updated (Product Interaction, not linked, Analytics).
- [ ] Deploy the takes service so `/v1/events` is live (Actions → Noodle takes service), then check events arrive.
- [ ] Dashboard (owner asked for one): needs a Cloudflare API token with Account Analytics: Read to query the numbers.

## 2. Final UI deep dive
- [ ] Screen-by-screen review against `noodle/STYLE.md`: first open, recording, note editor, drum editor, track menus, mix, More,
      Pro sheet, export, song links.
- [ ] First-run flow: a new person gets from opening the app to hearing their own song quickly, with no explanations needed.
- [ ] Empty, error and offline states (no mic permission, server unreachable, nothing heard).
- [ ] Small and large iPhones, Dynamic Type, dark mode, VoiceOver labels on the main buttons.
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
- [ ] **Owner:** Pro price ($6.99 suggested).
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
- [ ] Privacy policy reviewed, effective date set, draft notice removed (`noodle/privacy/`).
- [ ] Terms of use for song links (user-generated content), or Apple's standard terms named in the listing.
- [ ] Sample and sound licenses checked for commercial use (`noodle/samples/CREDITS.md`) and credited in the app.
- [ ] Reporting a shared song works and someone gets told (Apple requires this for user content).

## 7. Server (takes service) readiness
- [ ] **Owner:** move the deploy out of the Fan to See repo into its own Cloudflare token and workflow (see `noodle-api/README.md`), or keep it.
- [ ] Check Cloudflare free-plan limits (requests, KV reads/writes, storage) against launch-day traffic; know what happens if they're hit.
- [ ] Alerts when errors spike or the service is down.
- [ ] Rate limits on sign-ups, song links and invites, so one person can't fill the storage.

## 8. Quality
- [ ] Crash reports reviewed and the top crashes fixed.
- [ ] A TestFlight beta with a handful of outside people; collect what confuses them.
- [ ] Songs survive an app update (saved songs open in the new build).

## 9. Launch
- [ ] **Owner:** launch date, and whether to release by hand after Apple approves.
- [ ] Website landing page with the App Store link, and the support page (`noodle/support/`) current.
- [ ] Launch posts and a short demo video for TikTok, Reels and Shorts.
- [ ] First-week plan: read reviews and crash reports daily, ship a quick fix build if needed.

## After launch (not blocking)
Ideas in `noodle/IDEAS.md` (beat pads, strumming, face tracking and more).
