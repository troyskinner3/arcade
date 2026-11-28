<overview>
Noodle (repo troyskinner3/arcade: web app in noodle/, iPhone shell in noodle-ios/, takes service in noodle-api/) is my iPhone music app, getting ready for a private beta (from mid-December) and then launch. Goal: 1,000 people who make a song, as fast as we can, for free. The plan is noodle/GROWTH.md.

Before outside people arrive, I need to see the whole funnel and where people come from, so we can improve the app and the marketing from data. Noodle already sends private usage counts (noodle/js/takes.js `track()`, takes service `/v1/events`, a "Noodle Usage" dashboard). What's missing: where installs come from, what happens on our web pages, and a simple way to ask people how they found us. Also, song links (listen pages) should turn listeners into new users.

I'd like you to be my lead engineer on this: check what exists, propose the smallest set of changes that gives a clear funnel by source, and build it.
</overview>

<rules>
Don't do anything that costs money or creates security risks for the app or my users. Privacy matters: no personal data, no IP addresses stored, no outside analytics companies unless I approve. You may suggest things that cost money or carry risk for me to approve.

Research before big conclusions (e.g. how App Store Connect campaign links and source reports work today, what iPhone apps can and can't know about where an install came from). Don't rely on memory alone.

Read CLAUDE.md and the docs it names first (noodle/ROADMAP.md, PRO.md, STYLE.md, GROWTH.md, noodle-api/README.md). Follow its rules: analytics with every change, the three privacy files must match what Noodle sends, STYLE.md for any UI and copy, sync-web.sh and the eval suite before merging, merge to main after each round. The takes service deploys by hand only (see its README) and has its own session: say so before changing noodle-api/, and tell me what needs deploying. Other sessions work on Noodle too; keep changes focused.

I work a full-time job, about 5–10 hours a week, often from my phone. Keep responses short. When you need answers, give a numbered list and restate every open question in full each time. Document decisions in the repo and keep a list of agreed action items. Ask me clarifying questions.
</rules>

<inputs to consider (from the growth-planning session; check and challenge them)>
- North star: people who made a song (`first_song2`). Funnel: store page views → installs → first open → first take → first song → share → day-7 return → Pro.
- Install sources: App Store Connect campaign links (`pt`/`ct`) on every link we post, one `ct` per channel (reddit-<sub>, ph, press-<site>, tiktok, songlink, invite, video). Free; reports in App Store Connect.
- Web: read `?src=` on first open and send it with `first_open`.
- Listen pages (`/s/<id>`) and the landing page: count views and taps on an install / "Make your own" / "Open in browser" button, by source, without storing IPs. Adding that button is part of this.
- A one-tap "How did you find Noodle?" after the first song (short list + Other), sent as an event. Self-reported, but it fills gaps iPhone attribution leaves.
- A funnel view on the dashboard, per week and per source (App Store numbers entered by hand weekly is fine at first).
- Note: the repo and site are being moved to private hosting (Cloudflare) soon (top of GROWTH.md); page URLs may change, so keep source tags independent of the domain.
</inputs to consider>

<goal>
Before the beta: I can open the dashboard and see, for each source, how many people arrived, made a song, came back and bought Pro. We agree on the event list, the privacy text and what's deployed when.

Does this make sense? Ask me anything you need to get started.
</goal>
