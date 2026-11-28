<overview>
Noodle (repo troyskinner3/arcade: web app in noodle/, iPhone shell in noodle-ios/) is my iPhone music app: quick, fun ways to make music with everything a phone can do (hum, beatbox, sing, Play Pad, draw-to-MIDI). It turns *your* ideas into music, unlike AI apps that make up the ideas for you.

I want a share video that sells Noodle by itself: it starts with the raw input (my humming, beatboxing, singing or a Play Pad take) and then, right on a downbeat, cuts to the full finished song. That before → after moment is the whole pitch. I picture it being very cool; it will take iteration to make it feel great. It's our main growth bet: every shared video is an ad, and the same videos become the faceless content we post on TikTok, Reels and Shorts (I don't want to show my face).

I'd like you to be my lead engineer and product designer on this: scope it, propose options, build it in small testable steps, and iterate with me on how it looks and sounds.
</overview>

<rules>
Don't do anything that costs money or creates security risks for the app or my users. You may suggest things that cost money or carry risk for me to approve by hand.

Research before big conclusions: what makes short music videos work on TikTok/Reels/Shorts now (length, aspect, the first 1–2 seconds, captions, sound-on vs. off), how other music apps' share videos look, and platform rules (e.g. TikTok's Share Kit for posting straight from the app). Don't rely on memory alone.

Read CLAUDE.md and the docs it names first (noodle/ROADMAP.md, PRO.md, STYLE.md, GROWTH.md). Follow its rules: STYLE.md for UI and copy, analytics with every change, the privacy files must match what Noodle sends, Free vs Pro goes in PRO.md marked "proposed" until I confirm, sync-web.sh and the eval suite before merging, and merge to main after each round. Other Claude sessions work on Noodle at the same time (app, takes service in noodle-api/, DAW connection); keep changes focused and say so before touching files outside this work, to avoid merge conflicts.

I work a full-time job and give Noodle about 5–10 hours a week, often from my phone, testing on TestFlight. Keep responses short. When you need answers from me, give a numbered list and restate every open question in full each time (don't point back to earlier messages). Document decisions in the repo (suggest where) and keep a list of agreed action items. Ask me clarifying questions; I'm happy to brainstorm.
</rules>

<inputs to consider (from the growth-planning session; check and challenge them)>
- Video export already exists (noodle/js/export.js): 720×1280 MP4 encoded frame by frame (WebCodecs, real-time fallback), parts as lanes with a moving playhead, free videos end on a 2.5 s "Free on the App Store" card, Pro removes the tag. Build on it or rethink it.
- The raw takes are kept with the song (recordings are stored once per song), so the "before" audio should be available; for draw/tap/pad parts the "before" may need a visual instead (the finger on the pad, the drawn line).
- Ideas to weigh, not requirements: the cut lands on bar 1 of a chorus or the first downbeat after the hum phrase; a visual that turns the hum's pitch line into notes at the cut; a big readable caption in the first second ("I hummed this →"); length 10–20 s for the first version; choose which part is the "before"; sound that works on phone speakers.
- Sharing: today a file goes out through the share sheet. TikTok Share Kit can open TikTok with the video as a draft (needs photo-library access; check current docs). Instagram/YouTube options to check.
- Free vs Pro: my lean is the before → after video is free with the small "Made with Noodle" tag (it is marketing), Pro removes the tag. Propose.
- Analytics to plan: video made (type, length), shared (to where if known), and later whether installs come from it (a source tag on the end card link).
</inputs to consider>

<goal>
We agree on what the first version looks and sounds like, build it in small steps I can try on TestFlight, and iterate until it's something people want to post. Then plan the next steps (posting straight to TikTok, templates, more "before" types).

Does this make sense? Ask me anything you need to get started.
</goal>
