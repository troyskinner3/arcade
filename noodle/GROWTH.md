# Noodle: growth and launch plan

The running plan for getting Noodle's first 1,000 users. Owner + Claude, $0 budget unless the owner approves a spend, ~5 h a week
(weeknights and weekends). Future sessions: read this first for any marketing, launch or growth work, tick items off, log results in
**Results log** at the bottom, and add new ideas under **Ideas backlog**. `[ ]` to do, `[~]` started, `[x]` done.
**Owner** = only the owner can do or decide it. Status: **agreed** (owner confirmed) or **proposed** (waiting on the owner).

Started 27 Nov 2026. Launch tasks that are product or store work stay in `ROADMAP.md`; this file is the marketing side.

## Goal and the number we count
- **North star: people who made a song** (first song with 2+ parts, `first_song2`). Installs are tracked but are not the goal. (agreed)
- Target: 1,000 song-makers. Growth over money for this cohort: generous Pro, no paywall pressure. (agreed)
- Expectations (Claude's estimate, not data: there are no solid public numbers for a solo, no-ad music app launch):

  | Stage | Guess | What would make it faster |
  |---|---|---|
  | Private beta | 25–50 testers | a Reddit post that lands |
  | Launch month | 150–400 installs | press pickup, one video that takes off |
  | ~3 months after launch | ~1,000 installs, ~400–600 song-makers | a working share loop (people bring people) |
  | 1,000 song-makers | 4–6 months after launch | same |

  One viral short video can do all of this in a week. The plan doesn't count on that happening.

## Who it's for (agreed 27 Nov)
1. **Producers and music-tech fans** (first): "music note-taking": catch an idea when it strikes, take it to the DAW later (DAW pack, MIDI).
   Reachable through communities and press, at small numbers. These people care about how well it works and give good feedback.
2. **Teens and casual makers** (second, bigger): beats, loops and raps to send to friends. Reachable through short video and sharing
   between friends. This is where volume comes from, if the share loop works.

Positioning: a hummed idea becomes a whole song (beatbox → drums, written chords and bass, Finish song), not just a pitch-to-MIDI tool.
No account, no ads, one-time Pro. Don't call it AI (r/WeAreTheMusicMakers bans AI posts; a lot of producers dislike "AI music").

Competitors seen 27 Nov (all on iPhone): Nada, HumTrack (Jun 2026), Hum2MIDI (Jul 2026), ToneScribe Pro, AnySing, Humming Note, HumBeatz.
The space is crowded, but no app in it is the clear leader.

## Phases
No launch date yet: the owner is polishing the core first (agreed). Each phase starts when the one before it meets its exit check, not on a date.

### Phase 0: get ready (now, while polishing)
Exit check: funnel tracking live, accounts reserved, the landing page collects emails.
- [ ] **Owner:** reserve handles for Noodle (TikTok, Instagram, YouTube, X), same name everywhere, from a tuttii.io email.
- [ ] **Owner:** Kit email list (steps already in `ROADMAP.md` §7).
- [ ] Funnel tracking: see **Measurement** below (Claude, in the app and takes-service folders; coordinate with those sessions).
- [ ] Landing page: one line, a 15-second demo, App Store button (until launch, a TestFlight or email sign-up), "Try it in your browser".
- [ ] **Owner:** try 2–3 competitors (Nada, HumTrack, AnySing) on the same hum; note where Noodle wins. Claude: their prices and ratings.

### Phase 1: private beta (from mid-December, when the new Reddit account is ready)
Exit check: 25+ outside testers; from the data, most testers finish a first song, and some come back in week 1. Fix what confuses people.
- [ ] TestFlight public link (Apple reviews the first external build; usually about a day).
- [ ] Recruit: one beta post per community, in each one's allowed thread (see **Channels**), plus BetaList (free, slow queue).
- [ ] If we're doing Android: run Google Play's required closed test (12+ testers for 14 days) at the same time, with the same testers.
- [ ] Short in-app question after the first song: "How did you find Noodle?" (one tap). Testers who reply become our first fans.

### Phase 2: soft launch (App Store live, no push yet)
Exit check: about a week with no bad crashes, and the store page converts visits into installs.
- [ ] **Owner:** Apple featuring nomination in App Store Connect (Featuring → Nominations → App Launch). Apple asks for at least 2 weeks'
      notice and suggests up to 3 months: submit it as soon as there's a launch date.
- [ ] Store page: screenshots and a 15–30 s preview video (ROADMAP §4); keywords checked against competitors.
- [ ] Rating prompt after a finished song (ROADMAP §4), so launch week starts with some ratings.

### Phase 3: launch week
- [ ] One day with everything: Reddit posts, Product Hunt (web version as the try-it link), a press email, first videos.
- [ ] Press: music-tech sites that cover small iPhone apps (MusicRadar covered HumBeatz): MusicRadar, CDM, Gearnews, MusicTech, Synth
      Anatomy, Sonicstate. Pitch = 2 lines + a 30 s video + TestFlight or promo codes. Claude drafts, **owner** sends.
- [ ] iOS music communities: Audiobus forum, KVR iOS forum, r/ipadmusic.
- [ ] Founding-member offer is live (see **Product changes**).

### Phase 4: months 1–3 after launch
- [ ] Faceless video engine (below), 3 posts a week.
- [ ] Seed creators: 20 small music creators (1k–50k followers) get free Pro codes, no strings. Claude finds and drafts; **owner** sends.
- [ ] Android + web listing (if agreed).
- [ ] Weekly challenge prompt ("hum a villain theme"): material for posts and a reason to come back.
- [ ] Month 2: if the free channels have data, consider a small paid test (see **Paid, later**).

## Product changes for growth (proposed, waiting on the owner; Pro changes also go into `PRO.md`)
In order of expected effect:
1. **Share video built for TikTok and Reels.** Vertical, shows the hum first and then the finished song (that before/after is the
   pitch), a small "Made with Noodle" tag with the link. Then direct posting to TikTok (TikTok Share Kit, free; the app needs
   photo-library access). Every shared song becomes an ad, and the same videos are our own faceless content.
2. **Listen page → "Make your own" / "Remix this".** Every song link page gets an install button (with a source tag, so installs from
   song links are counted) and, on the web, "Open in your browser".
3. **Founding-member Pro.** The first 1,000 song-makers get Pro free for life (App Store offer codes or a launch-period unlock; check
   Apple's code limits). Cost: a few % of 1,000 × $4.99, small next to what we gain from the goodwill and the shares. Producers get the DAW pack, so they
   can show their Noodle ideas finished in their DAW.
4. **Easier invite reward** for the launch period: 1 friend who makes a song (instead of 3) earns Pro, or both sides get something.
5. **Remix chain:** "finish my hook": send a hum, a friend adds a part, it comes back. Song links mostly already do this; make it obvious.
6. **Web as the free trial.** No-install "try it" for Reddit, Product Hunt and press, which avoids the App Store step that puts people off.
7. **Android** through Google Play (wrapping the web app). Costs the $25 developer fee (**owner** to approve) and the 12-tester rule
   above. Recommend: after the iOS beta, once the core is settled.

## Measurement (proposed): every step of the funnel visible
Already sent (`noodle/js/takes.js`, dashboard "Noodle Usage"): first open, takes, 2-part song, export, share link, sessions, Pro sheet /
try / buy / restore, day-1/7/30 returns. Missing pieces, in order:
1. **Where installs come from.** Every link we post carries an App Store Connect campaign link (`pt`/`ct`, free; installs and store
   page views by source in App Store Connect). One `ct` per channel: `reddit-<sub>`, `ph`, `press-<site>`, `tiktok`, `songlink`, `invite`.
2. **Web:** read `?src=` on first open and send it as the `first_open` label (no personal data).
3. **Listen pages and landing page:** count page views and taps on the install button, by source (takes service, no IP stored).
4. **Self-reported source:** the one-tap "How did you find Noodle?" answer as an event. iPhone attribution is incomplete; this fills the gaps.
5. **Funnel view on the dashboard:** store views → installs (from App Store Connect, entered by hand weekly) → first open → first take →
   first song → share → day-7 return → Pro, per week and per source.
Privacy: each new event or page count needs the three privacy files updated (CLAUDE.md rule).

## Channels (free)
| Channel | Fit | Effort | Notes |
|---|---|---|---|
| Share loop (product) | both | build once | the main bet; see Product changes 1–2 |
| Faceless short video | teens | ~1 h/week owner | screen recordings of the app: hum → song. Slideshow posts work for app accounts per 2026 guides (vendor-written, so weak evidence) |
| Reddit | producers | 30 min/week | from mid-Dec, new account. Follow each sub's rules: r/WeAreTheMusicMakers allows promotion only in its promo thread and bans AI posts. Try r/ipadmusic, r/makinghiphop, r/edmproduction feedback threads, r/SideProject, r/AppHookup for deals. Share useful posts much more often than promotional ones |
| iOS music forums | producers | low | Audiobus forum, KVR iOS forum |
| Press | producers | 1 evening | at launch, then with big updates |
| Product Hunt | tech fans | 1 evening | launches are up ~55% year on year (2,345 in Q2 2026), so it's crowded; worth one try with the web demo |
| App Store search + featuring | both | low | keywords, nomination, ratings |
| Creator seeding | teens | ~1 h/month | free Pro codes |

### Faceless video engine (no face, owner's voice optional)
- Formats: (a) "I hummed this → it became this" screen recording; (b) beatbox → drum kit; (c) "finish my hook" with viewers; (d) a
  slideshow of short steps; (e) the same hum made into 3 genres.
- Claude makes: scripts, captions, hashtags, screen recordings of the web app (automated browser), a posting calendar. Owner: records the
  hums (or uses testers' shared songs, with permission), posts. Batch-record once a week.

## Weekly routine (~5 h)
- 1 h: record hums and batch 3 videos (Claude edits and writes captions).
- 1 h: Reddit and forum replies (useful answers first).
- 30 min: metrics review with Claude: funnel by source, pick the week's one experiment, log it below.
- The rest: product growth features (Claude builds; owner tests on TestFlight).

## Paid, later (needs the owner's approval)
- First test, only after free channels give a baseline: Apple Search Ads, ~$100 cap, one keyword group. Music's typical cost per
  install (US, 2025 data) is about $1.92–2.11 → roughly 50 installs. Its point is to measure what a paying install is worth, not to grow.
  Avoid late Nov–Dec (holiday prices are higher).
- Google Play developer fee $25 (if Android).

## Decisions for the owner
1. Share video (Product change 1) as the next big product item after polishing? (Claude recommends yes.)
2. Founding-member Pro for the first 1,000: yes / no / a different number?
3. Invite reward at 1 friend for the launch period?
4. Android: after the iOS beta (recommended), or with it?
5. Measurement items 1–5: build now, before the beta (recommended)?
6. Handle name for the social accounts (e.g. noodleapp, noodle.music, humnoodle)?

## Ideas backlog
- A gallery of community songs on the website (works for search too).
- Producer-made "hum packs" or genre templates.
- Shared stems as a "made in Noodle, finished in my DAW" series on YouTube Shorts.
- School and music-teacher outreach (age rating 12+/13+; check before doing it).

## Results log
Date · what we tried · source tag · result · keep / drop.
- 27 Nov 2026 · plan written · – · – · –

## Sources (checked 27 Nov 2026)
- Google Play testing rule: https://support.google.com/googleplay/android-developer/answer/14151465
- Apple featuring nominations: https://developer.apple.com/app-store/getting-featured/
- Apple Ads cost by category: https://www.apptweak.com/en/aso-blog/apple-ads-benchmarks
- Product Hunt Q2 2026 report: https://www.producthunt.com/p/general/product-hunt-s-state-of-tech-discovery-q2-2026
- TikTok Share Kit (iOS): https://developers.tiktok.com/docs/en/share-kit-ios-quickstart-v2
- Faceless slideshow guides (vendor-written): https://stormy.ai/blog/tiktok-organic-strategy-viral-app-growth
- Referral benchmarks (vendor roundup, directional only): https://growsurf.com/statistics/mobile-app-referral-statistics/
- WATMM rules summary: https://dynamoi.com/learn/ai-music-distribution/reddit-communities-for-ai-music-creators
- Competitors: App Store listings for Nada, HumTrack, Hum2MIDI, ToneScribe Pro, AnySing, Humming Note, HumBeatz
