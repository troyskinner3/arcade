# Noodle: before → after share video

The share video that sells Noodle by itself, and the faceless videos we post on TikTok, Reels and Shorts. Started 28 Nov 2026 from
`briefs/share-video.md`. Future sessions: read this before touching the share videos (`js/beforeafter.js`, `js/export.js`); log each
round's decisions here and tick action items off. **agreed** = owner confirmed; **proposed** = waiting on the owner.

## What it is (v1, built 28 Nov)
- **Before:** one bar of the first part recorded with the mic (hum, beatbox, singing), exactly as recorded: light clean-up (no rumble), turned
  up to sit just under the song, never sped up or tuned. Caption **"So I went like this…"**, the recording drawn as a waveform while it plays,
  the beats of the bar as dots. (agreed)
- **The cut:** a hard cut on the next downbeat; the song picks up at the **next bar**, so it flows straight on from the recording. A short
  white flash on the cut. Caption **"To make this."** (agreed: the owner's wording, to be tuned; custom captions are an idea for later)
- **After:** the song from that bar, the parts as lanes with a playhead, up to about 15 s in all (2–8 bars), ending on a bar line with the last
  notes ringing out. Near the song's end it carries on from bar 1. (agreed: start of the song)
- **Fast songs:** when a bar is shorter than 2 s (above 120 BPM) the before is 2 bars, so there is time to hear it. (proposed)
- **No mic recording** (drawn, Play Pad, typed parts): the before is that part on its own (the first tune part, else the first part), then the
  whole song comes in. (proposed; owner asked 28 Nov what to do here)
- **Size:** 1080×1920 when the phone can encode it, else 720×1280. (agreed)
- **Free vs Pro:** the video is free. Free videos carry a small see-through Noodle mark (top left, clear of the apps' buttons) and end on a
  1.5 s card ("Free on the App Store"); Pro has neither. No audio tag ever. (agreed 28 Nov; in `PRO.md` as proposed until confirmed there)
- **Share sheet:** "Before and after" and "Song video" (the whole song, as before) are both rows. (agreed)
- **Usage events:** `export` with `video ba <hum|beatbox|sing|part>` and the length in seconds; `export` `shared <kind>` when the share sheet
  sends it somewhere (iPhone doesn't say where). No new event names, so no takes-service change. Privacy texts say kind and length.

## How it works (for sessions)
- `keepSource(tr)` (after every take, `takes.js` addTake) saves a mic part's recording as `src`+id in the takes store, with `srcAlign` (the
  second in the recording where the part's first step is) and `srcBpm`. Vocals already keep theirs (`vox`+id, `va`). `src` recordings are not
  in song links or `.noodle` backups (nothing new leaves the phone); duplicate and delete carry them.
- `baMix()` builds the audio (before bar + song slice) and `_ba` (cut time, window, type); `baPainter()` draws the frames; `recordVideo()`
  takes a painter. Test: `eval/ba_test.js` (frames in `eval/results/ba_*.png`).

## Action items
- [x] Step 1: before → after video, 1080×1920, watermark, 1.5 s end card, kept hum and beatbox recordings, events, test. (28 Nov)
- [ ] **Owner:** try it on TestFlight with a real hum, a beatbox and a drawn song; send notes (what feels off at the cut, the captions, length).
- [ ] Step 2: polish rounds with the owner: the hum's pitch line turning into the notes at the cut, caption style and timing, loudness.
- [ ] Step 3: better "before" pictures for parts with no recording: Play Pad presses, the drawn line being drawn.
- [ ] Step 4: post straight to TikTok (Share Kit; needs a TikTok developer app, their review and Photos access) and Instagram Reels (Meta app
      ID, "Go Live"). Both free; setup is the owner's. A source tag on the end card's link to count installs.
- [ ] Later: custom captions; templates; choose which part is the before; include `src` recordings in `.noodle` backups (owner to decide).

## Open questions
- Is 2 bars right for fast songs, or always exactly 1 bar?
- For songs with no mic recording: is "that part alone, then the song" enough for now?

## Research notes (28 Nov)
- The first 1.5–2 s decide whether people keep watching; showing the result early does well (vendor data, not platform data). Many views start
  muted, so the captions must carry it without sound.
- 1080×1920, 9:16; keep text out of the bottom and right edges (each app's buttons).
- TikTok Share Kit (iOS) opens TikTok with the video from Photos (Photos access needed); Instagram's `instagram-reels://share` needs a Meta app ID.
- No common, documented "hum → song" before/after format found on TikTok: open space.
