# Noodle melody-detection evaluation

Scripts used to measure and tune how well recorded humming / singing turns into notes. They run the app's own
detector (`analyzeTake` in `../index.html`) in headless Chromium and score it with
[mir_eval](https://github.com/craffel/mir_eval): a note counts as correct when it starts within 50 ms of the true
note and is within 50 cents of its pitch ("note F1"; "key-free" also allows the whole melody to be hummed in
another key).

## Data (not in this repo)

- **Vocadito** — 40 solo-singing clips, 15 singers, with note annotations. CC BY 4.0.
  https://zenodo.org/records/5578807 — unzip to `data/vocadito/`.
- **HumTrans** — humming with MIDI ground truth (10 hummers). **CC BY-NC 4.0: used only to measure, never shipped
  or trained on.** https://huggingface.co/datasets/dadinghh2/HumTrans — `remote_zip.py` pulls a subset of the
  test split straight out of the 14.7 GB zip; `all_midi.zip` → `data/humtrans/midi_data/`.

Serve the folder holding `data/` and a link to the app as `noodle.html`: `python3 -m http.server 8800`.

- **VocalSet + Annotated-VocalSet** — 20 trained singers; scales, arpeggios, long tones and songs in many techniques
  (straight, vibrato, breathy, belt, lip trill…) with note labels. CC BY 4.0. https://zenodo.org/records/1193957 and
  https://zenodo.org/records/7061507 — `fetch_vocalset.py` pulls a 150-file subset across all singers.
- **AVP (Amateur Vocal Percussion)** — 28 non-beatboxers: isolated kick / snare / hats plus a labelled freestyle, each
  with prescribed ("Fixed") and their own ("Personal") sounds. CC BY 4.0. https://zenodo.org/records/5036529

## Scripts

- `run_detector.js <list> <out.json>` — notes for each audio file in a list.
- `sweep.js <list> <variants.json> <prefix>` — same, once per set of detector settings (`NT` overrides).
- `score.py <out.json>`, `sweep_score.py <prefix>` — scores. HumTrans labels start at 0 s while recordings have a
  lead-in, so each file's labels are shifted by the single best time offset (the same for every method).
- `diagnose.py` — where errors come from (missed notes, ±1 semitone, octave, timing).
- `conf_snap.py`, `decode_proto.py` — key-snapping experiments.
- `bp_sweep.js` + `bp_eval.html` — Spotify Basic Pitch (Apache-2.0) in the browser with several post-processing settings.
- `sweep_ext.js` + `swift_hook.js` / `crepe_hook.js` — swap the detector's YIN pitch for SwiftF0 (MIT) or CREPE (MIT)
  through the `EXT_PITCH` hook (does nothing in the app unless a test sets it).
- `avp_eval.js`, `avp_score.py`, `avp_pool.js` — beatbox: hits found, right drum, untaught vs taught, and built-in
  examples pooled from other people.
- `vs_breakdown.py` — VocalSet scores by exercise and technique.

## Results (November 2026)

Tuned on half the clips (odd Vocadito tracks, 5 hummers); reported on the other half. Key-free note F1:

| held-out half                                      | singing | humming | mean  |
|----------------------------------------------------|---------|---------|-------|
| before (yin 0.18, 30 ms gaps, drift 4, hard snap)  | 0.371   | 0.617   | 0.494 |
| detector settings now in the app (yin 0.12, 20 ms gaps, drift 6), hard snap | 0.396 | 0.620 | 0.508 |
| same, "confident" snap (keep out-of-key notes sung within ±20 cents) | 0.440 | 0.626 | 0.533 |

The owner's own hummed test melody (5 takes, 40 notes) stayed at 35/40 with the new settings, but dropped with
any looser snap (32/40 at ±20 cents), and dropped to 27/40 with `hyst 0.8`, which looked good on the tuning half
only. So the app defaults to a tight snap, with a Loose ↔ Tight slider and learning from corrections for singers.

### Second round (same day)

- **Smoothing** the pitch over ~0.2 s before deciding where notes change (`smoothW` 2 → 10): held-out 0.508 → 0.524,
  VocalSet 0.248 → 0.263, the owner's takes unchanged (35/40). Now the default.
- **Basic Pitch** (best setting, onset threshold 0.65): mean 0.506 vs 0.554 for the app's detector on Vocadito +
  HumTrans; it finds too many notes on humming (1.3× the true count). Not adopted.
- **SwiftF0 / CREPE as the pitch tracker** under the same note logic: no gain (0.443–0.445 vs 0.452 on all three
  sets). Pitch per frame is not the weak spot; deciding where notes start and end is.
- **VocalSet is hard for every method** (note F1 ~0.25): legato and vibrato blur note boundaries; half of the matched
  note starts are more than 50 ms off.
- **Beatbox (AVP, 28 people)**: hits found F1 0.72 (prescribed sounds) / 0.82 (own sounds). Right drum untaught
  63% / 56%, taught 79% / 77%. Snare is the weak class (28–35% untaught, ~55% taught; mostly mistaken for hi-hat).
  Built-in examples pooled from other people (tested on people left out) lift prescribed-sound accuracy to 72%
  (snare 70%) but not own-sound accuracy (52–57%); a hybrid with the hi-hat rule is the next thing to try.

### Drums: built-in examples (shipped)

Untaught drum sorting now keeps the rules for hi-hats and claps and decides kick vs snare against built-in examples
(3 kick + 3 snare fingerprints from each AVP participant and mode; CC BY 4.0, credited in the code). On people left
out of the examples: prescribed sounds 63% → 66% right drum, own sounds 56% → 57% (kicks 74% → 78% / 49% → 55%).
Letting the examples also overrule rule-"claps" scored higher on AVP (68% / 63%) but turned the owner's deliberate
"k" claps into kicks: AVP's click-like "p" kicks look like Noodle's "k" clap, and Noodle asks for "k" as the clap.

### Learned note starts (shipped as a combination)

`onset_model.py` trains a small network (37 inputs → 32 → 1, ~10 KB of weights) on the detector's own per-frame
readings (`dump_frames.js`): pitch change, voicing, loudness change and confidence across ±80 ms, labelled "a note
starts within 20 ms". Training data: VocalSet + odd Vocadito tracks (CC BY 4.0). Test: even Vocadito tracks (unseen
singers) and HumTrans (humming, never trained on), key-free note F1, plus the owner's 5 takes (40 notes):

| method                                   | singing | humming | owner's takes |
|------------------------------------------|---------|---------|---------------|
| rules (previous)                         | 0.492   | 0.618   | 35/40         |
| model alone                              | 0.593   | 0.632   | 33/40 (splits off scoops, merges legato semitones) |
| model + absorb scoops / split on pitch   | 0.553–0.583 | 0.569–0.632 | — |
| **rules + model splits (p ≥ 0.8) + adds** (default) | **0.538** | **0.625** | **36/40** |

`NT.model` = `'combine'` (default), `true` (model alone) or `false` (rules); `NT.splitThr` sets how sure the model
must be to split a rule note. Whistles always use the rules (the model never saw whistling).

### North Star groundwork (Nov 6)
New scripts: `edits.py` (edits to fix), `synth.py` (synthetic takes), `onset_syn.py`, `intent_net.py` (learned note reader: log-mel + the app's pitch, conv + GRU).

**Edits to fix**: add / delete / fix pitch / move start (lengths reported separately); notes aligned by an order-preserving match. Lower is better.

| held-out, edits per 10 notes | humming (HumTrans) | singing (Vocadito even) |
|---|---|---|
| live app (rules + learned starts) | 4.81 | 5.69 |
| small start model alone (real data) | 4.37 | 4.86 |
| conv+GRU note reader, real data only | 4.33 | 6.10 |
| conv+GRU, **synthetic only** (never heard a real voice) | 4.59 | 5.95 |
| conv+GRU, real + synthetic | 4.39 | 6.03 |

Your 5 takes: 10 edits per 40 notes (2.5 per 10).
Where the edits go: wrong pitch is 30–40%, missed notes 20–55% (singing), extra notes 10–35%.

**Synthetic takes** (`synth.py`, everything generated, no samples, no license limits): procedural melodies, a source-filter voice (hum / sung syllables with consonants / "da" / "oo" / whistle), scoops, glides, vibrato, drift, out-of-tune notes, timing jitter, a room and a phone mic.
- The live app scores about the same on them as on real humming (3–6.5 edits per 10 notes by voice).
- A model trained only on them matches one trained on all our real CC BY takes.

What this says: the note-start detector is no longer the bottleneck. Next targets: the pitch each note was meant to be (scoops, drift, key context) and notes lost at the voicing gate.

### Interval squeeze and the whole-line pitch reading (Nov 6)
Guided takes (`pull_takes.py` with NOODLE_DROP_URL / NOODLE_DROP_KEY set, `score_user.py`, `replay_user.js`): the owner sings upward jumps narrower than meant (+7 sung as about +4, +2 as +1.6); downward ones are close.
HumTrans hummers mostly sing intervals as meant (median 0.98), but about 1 in 10 squeeze to 0.74 or less (`interval_study.py`).

`intent_pitch.py` (ported into the app as `intendedPitches`): Viterbi over the key's notes, scoring each reading by fit to the sung intervals (allowing a per-person up/down squeeze),
closeness to the sung pitch, and how common each step is in melodies; out-of-key notes allowed at a cost tied to Snap strength (Tight = in key only).

| edits per 10 notes | today | whole-line reading |
|---|---|---|
| owner's guided takes, replayed in the app (squeeze learned from earlier takes) | 4.18 | **3.71** |
| HumTrans, no squeeze | 3.88 | 3.80 |
| Vocadito, no squeeze | 6.37 | 6.46 |

Shipped only for people whose guided takes show a squeeze (up-interval ratio < 0.9 over 10+ intervals); everyone else keeps today's key snapping exactly.
Scoring fix: hummed takes may sit up to two octaves from the written tune (was one), which moved HumTrans "round" from 4.81 to 4.58.

### Tried and not shipped (Nov 6)
- **Repeated-note splitter** (split a held note at short loudness dips / pitch sags): owner's guided takes 3.71 → 3.66, HumTrans 4.58 → 4.71 (worse); stricter settings: no gain. Many of the owner's missed repeats have no dip at all (one continuous "mmm").
- **Melody statistics from real tunes** (`corpus_parse.py`: about 7,000 English/Irish/Scottish folk tunes from abc-collection, rights waived; interval frequencies and how often each note of the key is used, in `intent_pitch.py` with PRIOR=corpus / DEGW): offline on the owner's takes 4.35 → 4.09–4.14, but replayed in the app 3.71 → 3.71–3.84, and no change for people without a squeeze. Within noise at this data size.

### Chords and the key (Nov 6)
- **Knowing the right key is the big lever for the owner:** guided takes read in the key they were actually sung in (Guide key moved to the singer's), whole-line reading without squeeze: 4.78 → **3.53** edits per 10 notes (pitch errors 48 → 21). Plain snapping to that key: 3.84. (`eval_harm_user.py`)
- **Chord-tone preference on top adds nothing** (chords made by `harmony.py`, one diatonic triad per 2 beats).
- **But the key can't be found reliably:** from the owner's sung notes alone it is right in 18–24% of takes (`key_study.py`); "ends on the home note / starts on its chord" can't be judged on 4-bar first lines.
- For accurate singers, a known key changes little (HumTrans 3.89 snap vs 3.80 reading, Vocadito 6.41 vs 6.54; `eval_truekey_ds.py`).
- **In-app attempt, not shipped:** read a squeezer's take in the key set by the other parts. With a backing chord part (roots only, as Noodle stores chord parts) the replay got worse (3.71 → 3.88): roots like A–D–E fit several keys.

### Other versions (shipped Nov 6)
After a melody take, "Other versions ⟳" on the take bar cycles through up to 3 alternative readings (other scales, and squeezed-interval readings), each differing from the others in at least 2 steps; picking one sets the song's scale for later takes.
Owner's guided takes replayed in the app (`ver_replay.js`): Noodle's choice 3.71 edits per 10 notes; best of 2 versions 3.28, of 3 3.10, of 4 **3.06**. Another version was better in 8 of 17 takes.

### Learned note reader v2 (shipped Nov 7: splits inside held notes)
`synth2.py`: synthetic singers perform 4-bar excerpts of ~7,000 real folk tunes (labels = the tune, on a known beat grid), with
squeezed upward jumps (half the singers) and repeated notes often hummed as one sound. `intent_net2.py`: conv + 2-layer biGRU
(205k weights) on log-mel + the app's pitch/loudness/confidence + beat/bar phase (grid hidden 25% of the time in training).
Alone it misses pitch changes the rules catch, so it only adds splits inside the app's notes (onset probability >= 0.6, 0.15 s from the edges; each piece gets its own pitch).

| edits per 10 notes | app | + reader splits |
|---|---|---|
| owner's guided takes (offline, same pitch rule) | 4.22 | 3.97 |
| owner's guided takes replayed in the app | 3.71 | **3.41** (missed notes 32 → 22) |
| unseen synthetic singers with grid: accurate hum / other | 5.99 / 4.35 | 5.86 / 4.27 |
| unseen synthetic singers with grid: squeezing hum / other | 7.67 / 7.19 | 7.54 / 7.16 |
| HumTrans / Vocadito (no grid) | 4.58 / 5.69 | 4.60 / 5.69 |

A 48-unit, 1-layer version kept little of the gain (4.18). The app loads `reader.json` (float16) on the first melody take; JS matches PyTorch to 0.004 mean onset probability.
**Update (Nov 7): held notes.** The owner's long-note takes showed the reader splitting one sustained note on the beat (long-swell: 4 pieces).
A split now also needs a hint in the sound: a loudness dip of at least 1 dB or a pitch sag of at least 0.2 semitones at that moment.
Guided melodies replayed in the app (with the new scale-la take): no reader 3.62, reader 3.32 (but chops held notes), reader + sound hint **3.41** (held notes intact).

### Data search and the intended-note model (Nov 7)
- **Data found:** labelled singing datasets usable in a product are only Vocadito and Annotated-VocalSet; Choral Singing Dataset, Cantoría, Dagstuhl ChoirSet, GTSinger, VocalNotes and HumTrans are non-commercial; MLEnd Hums and Whistles has no license.
  Unlabelled and usable: MTG-QBH (118 people singing known songs into laptops, CC BY; cut into clips and labelled by the app in `synthreal_qbh`) and ccMixter's 1,433 CC BY a cappellas (`ccmixter_list.py`; its file server refuses automated downloads, so not used).
  Freesound (CC0/CC BY hums, singing, whistles) needs an API key; the API refused requests from this environment, so `freesound/fetch_freesound.py` runs on a personal computer instead.
- **All 31 guided melody takes, replayed in the app at their recorded tempo:** 3.94 edits per 10 notes (500 notes): pitch 112, missed 60, extra 23, timing 2.
- **Intended-note model (not shipped):** a phrase-level GRU over Noodle's detected notes (sung pitch, jumps, length, beat position), trained on 2,000 synthetic v2 takes.
  Predicting each note's absolute offset or each jump's correction did not beat "no correction" even on unseen synthetic singers (jumps 0.718 vs 0.718 with early stopping);
  on the owner's takes it was worse than today (5.3–5.6 vs 3.94). The synthetic squeeze, softened by the pull back toward the tune and by out-of-tune noise, gives no learnable signal beyond the rules.

### Re-sung takes, FCPE, and the note reader on new tunes (Nov 8)
- **Re-singing (`transplant.py`, WORLD vocoder, MIT):** each guided take re-sung into 20 new melodies (intervals from the folk tunes, the owner's
  measured squeeze applied, notes placed where the voice actually changes pitch, kept inside the sung range): 620 labelled takes in the owner's voice.
- **Jump-correction model trained on them (`pitch_xval.py`):** worse than today on the owner's real takes of the other tune group (5.97 vs 4.40, 6.12 vs 3.41). Dropped.
- **Note reader fine-tuned on them (`finetune_tp.py`):** worse on the other group (4.44 vs 4.03, 4.01 vs 3.88), likely because merged repeats stay merged in the audio while the labels split them.
- **The shipped reader generalises to unseen tunes:** real takes of the new tunes 4.37 → 4.03, of the first tunes 4.09 → 3.88 (offline, same pitch rule).
- **FCPE pitch (MIT, 48 MB ONNX) in place of YIN (`fcpe_extract.py`, `run_detector_fcpe.js`):** HumTrans 4.58 → 4.30, Vocadito 5.69 → 5.97. Mixed; not adopted for the web app.
- SOME (openvpi, MIT code) not tested: weights' license unclear and the release files aren't reachable from this environment.

### Count-in arpeggio (shipped), phrase agreement and rhythm splits (not shipped) — Nov 8
- **Count-in arpeggio:** optional (Timing & mic, off by default): the home chord 1-3-5-8, one note per count-in beat, melody takes only, only when the song already has a key. Effect on accuracy needs real takes recorded with it on.
- **Repeated phrases agree (`repeat_consistency.py`):** take the clearer pitch for both renditions of a repeated bar and copy splits across. All 31 guided takes: 3.94 → 4.08–5.22 (loose matching forces one bar's notes onto a different melody); strict matching 3.96. Dropped.
- **Rhythm split (`rhythm_split.py`):** split notes lasting 2 "pulses" when most notes are one pulse long: 3.94 → 3.98–4.08. Held half notes are as common as merged repeats. Dropped.
- **Learned rhythm model (`rhythm_lm.py`, `rhythm_long.py`):** how long notes last at each spot in the bar, counted from the 4/4 folk tunes, combined with the note reader's
  evidence at each possible split. All 31 guided takes: 3.94 → 4.04 (rhythm alone), 3.90 / 3.84 / 3.84 / 3.82 (audio weight 0.3 / 0.6 / 1 / 2), about 5 fewer fixes in 500 notes.
  The same weights split the sustained long-vowels and long-swell takes (one held note) into 2–3 notes. Dropped: the small gain isn't worth chopping held notes.
- **PESTO pitch (LGPL-3.0, `pesto_extract.py`) in place of YIN:** worse on both test sets, whether it replaces the app's pitch and voicing (HumTrans 4.58 → 4.92,
  Vocadito 5.69 → 6.45) or only fills in pitch where the app hears voice (4.71, 5.76). Dropped. That covers every open pitch model with a usable license here.

### Pitch errors and tuning drift (Nov 9)
- **What the pitch errors are (`pitch_errs.py`):** 66% of matched notes have the right pitch (the raw sung pitch rounded would get 34%). Misses are mostly one scale step
  (±1–2 semitones: 111 of 147), most often after a leap (41–49% wrong vs 25–33% after a step). Each note's sung pitch scatters by about 2 semitones;
  17 of 30 takes also drift by more than half a semitone between bar 1 and bar 4.
- **Following the drift (shipped, squeeze profile only):** after the whole-line reading, each note is re-read against the tuning of the 8 notes on either side
  and changed only when it then lands within 0.3 semitones of another note. Real app, all 31 guided takes: 3.94 → 3.88 (farm-hum, scale-la better; no take worse).
  People without the squeeze profile keep today's snap exactly.
  - Without the 0.3 rule: 3.74, but 4 takes get 1 worse, including a perfect birthday-words. Reading the drift-corrected line again with the decoder: 4.24.
  - As a plain snap for everyone (`drift_ds.py`, held-out singers): HumTrans 3.89 → 3.82, Vocadito 6.41 → 6.46; gating by drift size removes the gain. Not used.

### Where the remaining errors are, and re-ranking readings (Nov 9)
- **Per-note pitch measurement is not the problem (`note_pitch_est.py`):** after fitting each take's squeeze, the app's note pitch is off by a median 0.30 semitones
  (66% within 0.5), better than median / middle half / second half / mode / loudest half of the frames (0.33–0.74). Errors are a tail of notes 1–2 semitones off.
- **The intended melody is often among the other readings (`nbest.py`):** readings over 24 keys × interval widths; best of the top 2 / 4 / 10 / 60:
  3.66 / 3.38 / 2.88 / 2.56 (app 3.94). A perfect chooser among 10 would remove about a quarter of all fixes.
- **Choosing among them — nothing found that picks the right one:**
  - Folk-tune melody judge (`melody_lm.py`, scale-degree/interval trigram, 236 tunes matching a guide removed): best 3.98 vs 4.12 for the same decoder; 4.46 cross-validated by tune.
  - Width prior centred on the singer's measured width (0.74 up / 0.93 down) (`nbest_rerank.py`): 4.36–4.90 (width changes a lot between takes). Major-key bonus: 3.90 in-sample, 4.28 cross-validated.
- **Missed notes (`missed.py`):** of 45 intended notes with nothing near them, 31 are same-pitch repeats heard as one held note (13 in words takes), 11 nothing heard, 3 merged into a pitch change.
- **Sound-colour cue for those repeats (`timbre_cue.py`):** log-mel shape change across the boundary is 3.0 at missed repeats vs 1.5 in held-note middles; a threshold catching half the repeats also fires on 17% of held notes (222 held vs 31 repeats → ~38 false splits for 16 caught). Not usable alone.

### Split hints (shipped) — Nov 9
- A held note (4–16 steps) gets a faint seam at each eighth-note point where the sound's colour changes clearly (log-mel shape, 8 frames each side, ≥ 3.5;
  `splitCue`/`splitHints`, same features as the note reader). Tapping the seam splits the note there. Nothing changes on its own: what Noodle hears is identical on all 31 takes.
- All 31 guided takes (`replay_fast.js`, `hint_eval.py`): 23 seams; 14 sit on a real repeat, 9 stray (mostly a vowel change inside a held word).
  Tapping the useful ones: 3.88 → 3.60. Notes longer than a bar get none (the sustained long-vowels / long-swell takes had 3 each before that limit).
- Shared takes include each note's seams (`hs`), so real use can show how often they're right.

### Background noise (Nov 13)
Real noise (DEMAND, CC BY 4.0: street traffic, cafeteria, bus, town square, park) mixed into all 31 guided takes (`mix_noise.py`, `noise_run.sh`); fixes per 10 notes, clean 3.88:

| voice above noise | traffic | cafeteria | bus | square | park |
|---|---|---|---|---|---|
| 20 dB | 3.94 | 4.18 | 4.10 | 4.24 | 4.18 |
| 10 dB | 6.36 | 5.80 | 4.36 | 4.70 | 4.62 |
| 5 dB | 9.60 | 8.74 | 5.06 | 8.32 | 8.04 |

- The damage is mostly extra notes (deletes 22 → 108 for traffic at 10 dB), then pitch.
- By how far the take's loud level sits above the noise alone (`noise_floor_truth.py`, 465 noisy takes): 28–34 dB +0.20 fixes per 10 notes, 24–28 +0.39, 20–24 +0.73,
  16–20 +1.58, 12–16 +4.16, under 12 +5.66. The take's own loud-minus-quiet range does not work as the measure (clean takes with few pauses read 10–25 dB).
- **Too-noisy hint (shipped):** background = 30th percentile of 10 ms frame levels during the count-in (skipped when the count-in arpeggio or a vocal pre-roll plays).
  During the count-in it is compared with the singer's usual loud level (learned from their takes, −30 dB to start) and the label adds "Noisy here: hold the phone close"
  under 20 dB; after the take the real margin is used and the message suggests a retake. Shared takes carry `noise: {floor, top}`. Checked with a simulated mic (`noise_ui.js`).
- **Stricter voicing when noisy (`replay_gate.js`, frames within 6/10/14 dB of the noise floor ignored):** trades extra notes for missed ones. Traffic 10 dB 6.36 → 6.36–6.66,
  cafeteria 10 dB 5.80 → 5.48–7.78, square 5 dB 8.32 → 7.46–9.18. Dropped.
- **Spectral subtraction from the count-in (shipped, `denoiseTake`):** the background's per-frequency median power over the count-in (32 ms windows), subtracted ×2 with a 0.1 gain floor,
  gain smoothed over 3 frames and 3 bins. Through the app (`replay_den.js`, 2 s of the same background as the count-in): traffic 10 dB 6.36 → 4.32, square 5 dB 8.32 → 6.00;
  offline prototype (`denoise_mix.py`): cafeteria 10 dB 5.80 → 5.48 (other voices are not steady), traffic 20 dB 3.94 → 4.02 (so it only runs under the 20 dB line),
  ×4 subtraction no better. Pitched live takes only (not the Voice instrument, whose sound is kept), ~0.2 s for a 9 s take. Live path checked with a simulated mic (`noise_ui2.js`).

### Saved projects, sharing service, email list (Nov 14)
- **Saved projects (`proj*` functions, no screen yet):** every song with content or a name is kept in IndexedDB (`projects` store): list, open, new, rename, duplicate (sound parts get their own copies), delete.
  Setup (taught drums, timing, learned preferences) is shared by all projects. The untouched example and guided-take songs are never saved. Checked by `proj_test.js`.
- **Sharing to the takes service (`noodle-api/`):** `shareEnable()` / `shareDisable(deleteShared)`; off until an opt-in screen calls it. Checked by `share_e2e.js` against a local copy.
- **Email list:** `emailSignup(email, text)` / `emailRemove(email)`; no screen yet.

### App shell (Nov 14)
- Rebuild plan (agreed with the owner): bottom nav (Projects · + · More) on Projects and More; the Studio is full screen with a back button. Studio = linear timeline with clips,
  loop as a toggle; opens in a new project. Mockup: scratch file `noodle-app-mockup.html` (published as an artifact), not part of the app.
- **Step 1 (shipped):** `nx*` functions and `.nx-*` styles. Projects (search, sort, rows with created date · key · tempo, ⋯ menu: rename, duplicate, delete), More (privacy link for now),
  back button on the existing studio. Opening the app starts a new project unless it was used in the last 10 minutes (a reload mid-work returns to the song). No example song on a fresh install.
  Checked by `shell_test.js`; the 31-take replay is unchanged (3.88).
- Next: Studio in portrait on a clip timeline, track sheets, landscape, first launch and More.
- **Step 2a (shipped): Studio timeline view** (`s2*` functions, `.s2-*` styles), the default studio; More → "Classic studio" switches back. A new front on the same engine:
  bar ruler with draggable playhead, one lane per part drawn as clips (repeats shown lighter), track headers with record-arm / mute / solo, track sheet (sound, volume, edit, delete),
  tempo + length, key + snap and mix sheets, transport (metronome, back to start, play, record, loop; play stops at the end unless Loop is on), take bar (Retake / Discard / Keep),
  pinch to zoom. Record with nothing armed asks what you're recording first. New projects are 4 bars.
  Still the classic screens, opened from here with a back button: note editing (tap a clip), Share/export, timing and drum teaching.
  Not yet linear: a part still starts at bar 1 and the song has a set length (1–16 bars). Checked by `s2_test.js` (simulated mic); 31-take replay unchanged (3.88).
- Next (2b): clips anywhere on the timeline and recording from the playhead until stopped; note editor and Share inside the new Studio; landscape pass; first launch and More.
- **Step 2b (shipped): linear timeline.** A part can start anywhere (`tr.off`, in steps; `songEvents` and `fullSong` place it; recording plays the song from there). A lane (`tr.lane`) is a row of
  parts sharing instrument, sound and mix. Record starts at the bar under the cursor (tap the ruler; it can be past the end) and runs until you tap record again (16 bars at most);
  the new part is cut to the bars that hold notes and the song ends where its last part ends (64 bars at most). Discarding or cancelling a take removes its empty part. Tap a clip: Edit notes / Delete this part.
  Voice (audio) parts still start at bar 1, one per lane. In the classic screens each clip shows as its own part. Checked by `s2_linear.js` (two takes at bars 1 and 5 render as sound in bars 1–2 and 5 only);
  31-take replay unchanged (3.88).
- Still to do: move/trim clips, voice clips anywhere, note editor and Share inside the Studio, landscape pass, first launch, More.
- **Step 2c (shipped):** a new take **replaces** what it overlaps in its lane (`s2Replace`: covered parts removed, partly covered parts cut back, a part it lands inside split in two; Discard restores; drums too,
  layering = another track). **Note editor inside the Studio** (`s2Edit`): the same grid (`buildCard`) full screen with taller rows (`GRID_H`, `GRID_RH`, `GRID_DRUM`), Split / Delete on the selected note,
  split hints, "Other readings", Fill gaps, undo/redo, play. Clips have a border and their notes are drawn inside it; the timeline is one colour; tracks are named per lane.
  Checked by `s2_replace.js` and `s2_editor.js`; 31-take replay unchanged (3.88).
- Still to do: Share inside the Studio, move/trim clips, voice clips anywhere, landscape pass, first launch, More (timing, drum teaching).
- **Step 2d (shipped):** Share sheet inside the Studio (DAW pack, audio, video; a linear song exports once through, `S.loops=1`); move a part by whole bars (press and hold, then drag; or the part's sheet),
  never onto another part; editor zoom buttons removed (pinch works); More → Mic timing (opens the classic section for now). Landscape checked by screenshot. `s2_share_move.js`.
- Still to do: trim clips, voice clips anywhere, first launch (voice check, sharing opt-in, email), More (drum teaching, mic timing in the new style).
- **Step 3 (shipped): first launch and sharing controls.** Shown once: what Noodle is → "Help Noodle get better?" (what is sent, 13+ box required, Not now) → optional email → a new project in the Studio.
  More: "Share my takes" (turn on with the same wording and 13+ box; turn off, or off + delete everything shared; a failed delete keeps the id so it can be retried) and "Email news" (sign up, change, leave).
  Shared takes no longer carry the song's name (not in the record, not in the take id). `onboard_test.js` runs it against the local takes service. Not yet: the voice check.
- **Step 4 (shipped): voice check** (`nxVoiceCheck`): at the end of first launch (skippable) and in More. Noodle plays a tune once, you hum it back, for two tunes (scale, Ode to Joy: 11 rising intervals,
  enough for `squeezeOn`'s 10). Each take updates the interval profile `S.sq` (`learnSqueeze`; when sharing is on, sending the take does it, so it is not counted twice) and, if shared, arrives labelled with its tune.
  A take with fewer than 5 notes gets one retry. Ends back in the song you were in, with a one-line result. `voice_test.js`: a simulated singer at 0.75× intervals reads as 0.75 (profile on), at 1.0× as 1.00 (off).
- **Step 5 (shipped):** the voice check no longer tells people how they sing (it would make some feel judged and others change how they hum); it ends with a plain "All set".
  **Voice (audio) parts anywhere:** `renderVox` places a part at `tr.off`; recording pre-rolls the bar before the take; a take's length comes from its audio; cutting moves the start point into the recording (`va`);
  new takes replace overlapping audio like notes. **Trim / extend** a part by a bar from its sheet (`s2TrimClip`). **More → Mic and timing** (calibrate, sensitivity, automatic delay, play-along, echo cancellation)
  and **Your drum sounds** (teach each or all) as sheets in the new style; the calibration and teaching recorders are the existing ones. Messages show at the top of the screen, clear of the transport and sheets.
  `s2_rest.js`; all eval scripts pass; 31-take replay unchanged (3.88).
- Not done: copying email signups into the marketing sheet (needs the sheet and the admin key once there are signups).
- **Step 6 (shipped):** no classic-studio switch any more (the timeline is the only studio; the older screens remain in the page only as its engine and are not reachable).
  The timing-fix and drum-teaching recorder (`#recSheet`) restyled to match (rounded, no Import button, its own messages instead of pop-ups). `recsheet_cal.js`: 16 simulated claps ~130 ms late → "Mic delay set to 151 ms".

### Review pass and region editing (Nov 15)
- **Regions are edited directly:** tap a part to select it (outline, a grip on each end, and a bar with Edit notes / Duplicate / Delete); drag the body to move, drag a grip to trim or extend by bars
  (`s2ResizeClip`; never onto another part, never down to nothing), tap the selected part again to edit its notes. `s2DupClip` puts a copy in the next gap on the same track. The old part sheet and its nudge / trim buttons are gone. `s2_regions.js`.
- **Shared takes say more about what happened to them** (for telling a fix from a creative change later): an edit log per part (`logEdit`: kind, where, old/new pitch, what was sung there `r0`, seconds since the take),
  `discarded` when a take is thrown away or retaken, `exportedAt` when the song is exported, `cut` when a later take or a trim removed notes, where the part sits (`clip`), and the app build.
- **Small fixes:** record with nothing armed offers your tracks first; the recording bar reads "Recording · bar N · tap ■ to stop"; song-length chips removed from the tempo sheet (length follows the parts);
  pop-up wording no longer points at screens that are gone; fewer storage writes.
- **Profile from pitch fixes: tested, not shipped (`fix_profile.py`).** A user only fixes notes Noodle got wrong, and intervals touching those notes are not a fair sample: for the owner the profile reads 0.61 from them
  vs 0.73 from all intervals; for the held-out singers the "squeezes" verdict rises from 67% to 91% of takes (HumTrans) and 50% to 76% (Vocadito). It would push everyone toward "squeezed". The voice check stays the only source.
- **Pre-review pass (shipped):** track sheet gains name, instrument (within its family, `changeInst`), reverb, left/right, brightness, octave, chord and Follow my voice, applied to every part on the track;
  Share shows a progress bar (moving for audio and the DAW pack, filling for video); an empty Projects screen offers "Open an example song"; `s2Detail` and the last references to the removed screens are gone;
  the root README's Noodle section describes the app as it is. Service: at most 40 writes a minute per address, counted in memory only (best-effort). `s2_extras.js`.
- Known and left for later: the engine still builds the old part rows off-screen on every change (the hidden markup it depends on); removing them is the multi-file refactor.
  The 50 guided-take prompts (owner's test link) have no entry point in the new screens; the voice check covers two of them.
- **Teach Noodle your voice (shipped):** a card at the top of More opens the 50 guided tunes for anyone, three at a time (listen, then sing it back as the prompt says; `nxTrain`, built on the voice-check flow).
  Each good take updates the interval profile and is marked done (progress on the card); with sharing on it arrives labelled with its tune. Drum prompts and the one-long-note prompts are included. `train_test.js`.
- **First launch:** the opening line speaks to people without a DAW too, with three rows on what Audio, Video and the DAW pack are for (the Share sheet says the same); it ends on Projects, nav bar showing, with an example song in the list.
- **Offline and pitch correction (shipped):** the web version registers `sw.js` (the page is fetched fresh when online and from the kept copy when not; its files are kept on first use), so it opens without a connection.
  Shared takes that can't be sent wait in an `outbox` store (one entry per take, later edits update it in place, 150 at most) and go out on reconnect, on return to the app, and at start; turning sharing off empties it; More shows how many are waiting.
  Voice tracks' sheet has Pitch correction (0–100, the existing PSOLA tuner, follows the key) and the rest of the vocal chain. `offline_test.js`; a 226 Hz tone renders at 220 Hz with correction on.
  The iPhone app works offline only once it is rebuilt with the bundled `web` folder (`noodle-ios/README.md`); the older build loads the live site and shows nothing without a connection.
- **Modes and chord shapes (shipped):** scales added: Mixolydian, Lydian, Phrygian, Phrygian dominant, harmonic minor, melodic minor, Locrian (`SCALES`, `SCALE_LABEL`, `SCALE_REL` for the MIDI key signature).
  Chords are stacked from the song's scale, so each mode gives its own (G Mixolydian's 7th on G is G7; in G major it is Gmaj7). Chord shapes added: 11th, 6th, add 9, sus 2, sus 4. `modes_test.js`.
  Automatic key detection still chooses between major and minor only; a mode is picked by hand (tap KEY).

### FX (beta) — Nov 16
- **What it is:** a track type ("FX (beta)", under Ear candy) for risers, downlifters, noise sweeps and impacts made with the mouth. One take can hold several; each becomes an event `{s, l, k, v, c, a}`
  with two 16-point curves from the voice (c drives pitch or brightness, a is loudness), so the effect follows the performance.
- **Sorting (`fxAnalyze`, rules only):** sounds are found by loudness (same gate as notes; under 90 ms ignored); under 0.28 s = impact; mostly pitched = riser or downlifter by pitch change (±2 semitones; a held note counts as a riser unless it clearly fades);
  mostly noisy = sweep up or down by change in zero-crossing rate (brightness), loudness as tie-break. Builds are stretched to end on the bar line when within a beat; hits land on the beat and ring.
- **Sound (`fxPlay`, `renderFx`):** synthesized: riser/downlifter = two detuned oscillators + filtered noise over two octaves from the song's home note, low-pass opening with the curve; sweeps = band-passed noise 250 Hz–10 kHz; impact = sine drop + noise burst.
  **Sample packs:** `FX_PACKS` maps a pack name to files per kind; a pack appears under the track's Sound, kinds it lacks use the synth, builds are aligned to end at the event's end. None shipped yet.
- **Editing:** regions like any other part; "Edit FX" lists each event (change kind, length, remove).
- **Checked:** `fx_test.js` (five synthetic gestures → riser, downlifter, sweep up, sweep down, impact; audio in the right bars), `fx_record.js` (record button with a simulated mic, second take, discard).
  No recordings of real people making these sounds exist yet, so accuracy on real voices is unknown; on the owner's sung takes it runs without errors and calls sung notes risers/downlifters, as expected.
- Side fix: the old in-row editor is no longer built off-screen (`editId` kept null); it crashed for FX parts and was never visible.
- **Removing the first prototype's screens, stage 1 and 2 (shipped):** the old part rows are no longer built at all (`renderTracks` is now an empty redraw hook that the Studio wraps; 9 KB gone) and six functions only they used
  were deleted with `tools/prune.js` (acorn: stub, then drop every top-level function nothing else names, until stable). All eval scripts pass; 31-take replay unchanged (3.88).
  **Still to remove (stage 3):** the old page markup (header, sections, record sheet's unused parts), its CSS, and the start-up code that wires those hidden elements; many engine functions still read values
  from those elements (`$('key')`, `$('bars')`, `$('recLabel')`, the hidden sliders the Studio's sheets write to), so each needs moving to plain state first.

### Stage 3 cleanup log (removing the first prototype's page)
How to work on it: one small step at a time; after each, `tools/suite.sh` from the scratchpad (also in `eval/tools/`) must print ALL PASS (56 scripts, replay 3.88); only then commit and push. `eval/tools/prune.js <file> s2TrimClip` deletes functions nothing names any more.
- **Batch 1 (done):** removed the old "How it works" card, New song button, the header's back button and brand, the +/− tempo buttons, with their wiring and styles; `newSong` went with them (tests use `projNew`).
- **Batch 2 (done):** removed the owner's old test-link UI (`guided`, `dropLine`), the `genre`, `quant` and `loops` rows, `keyInfo`, `snapV`, the old calibrate button, with their wiring; `applyStyle` went with them.
- **Batch 3 (done):** removed the old header (tempo, length, metronome fields), the bottom dock (seek bar, undo/redo, play, record), the song-name field and the old parts container. The Studio's metronome button now calls `toggleMetro`; `syncTransport`, `updatePlayBtn`, `updateDock` and `updateHistBtns` are empty hooks to delete once nothing calls them. `proj_test` and `shell_test` read the title from the Studio.
- **Batch 4 (done):** removed the old Mix, Export and Timing cards. The Studio's sheets now change the song directly (`setKey`, `setScale`, `setSnap`, `setMaster`; mic settings write to `S`); sharing reports progress through a callback and `shareMsg`/`shareCan` instead of hidden buttons. New check `sheets_test.js` (mix, key and snap, tempo, metronome, mic settings, kept after reload). Side fix: a key picked before anything is recorded now shows on the KEY chip (it said Auto). Not in the new app, so no longer reachable: Swing and the manual mic-delay number (calibration still sets the delay).
- **Batch 5 (done):** the old record sheet now only serves calibration and drum teaching; its take-mode parts are gone (mic note, calibrate prompt, merge/replace/detect-tempo checkboxes, Import button). Imported first takes always set the tempo (the checkbox defaulted to on). Fixes a fault from batch 4: `micBlocked` still touched a removed element, so a refused microphone would have thrown instead of falling back to choosing a file.
- **Batch 6 (done):** removed the six empty hooks left by batches 2–4 and their 52 calls (`eval/tools/unhook.js`: deletes whole-statement calls to top-level functions with an empty body, then `prune.js` deletes the functions). Suite fix: the replay's result folder is cleared first, so a replay that crashes can't be scored from the previous run's files (the scripts called `syncTransport`; they no longer do).
- **Batch 7 (done):** removed the old in-row editor's state and helpers (`editId`, `pickFor`, `pendingNew`, `tr._row`, `openEditor`, `closeEditor`, `activePart`, `loopTag`, the unused take mode of `openRec`). Delete/Backspace on a selected note now follows the Studio's editor (`s2.edId`). `replay_fast.js` no longer calls `activePart`.
- **Batch 8 (done):** `buildCard` is now only the note grid the Studio's editor shows. Its hidden sound picker, More panel (name, mix knobs, chord, detail, octave, slides, arp options, length, repeat, nudge, envelope, sidechain, instrument swap, take buttons), spotlight bar and zoom buttons are gone, with 20 functions only they used (14 KB). Fill gaps in the editor calls `fillGaps` directly; `s2_editor.js` now checks it. No longer reachable anywhere (they were already hidden): envelope editing, sidechain, spotlight, per-part nudge, unloop, the arp's pattern/rate/range/gate, the Detail slider. Saved songs that use them still play the same.
- **Batch 9 (done):** stylesheet pruned with `eval/tools/prunecss.py` (drops selectors whose class, id or element type is used nowhere outside the stylesheet): 289 rules or selectors, 58.7 KB → 37.7 KB. Checked by screenshots, because tests can't see styling: `eval/css_shots.js <dir>` takes 22 screens in dark and light, `eval/tools/shotdiff.py <before> <after>` compares them; all 44 were pixel-identical (two differ by a 14×2 px patch between any two runs, also without changes). Not in the screenshots: the voice check, the FX sheet, the count-in and level meter while recording, the bar that appears after a take.
- **Batch 10 (done):** removed the old kit panel, the old test-link line and guided-takes box (their elements were gone, so they always returned early), the take-review parts of the record sheet (preview, Discard, "Keep · next take"), the `<main>` wrapper and `knob`; the record sheet's review step is now just Done / Retry for calibration and drum teaching. `prune.js` no longer counts a style rule with the same name as a use. Screenshots identical.
- **Stage 3 is finished.** `noodle/index.html` went from 495 KB to 412 KB; what remains of the first prototype is the engine the app uses and the record sheet (calibration and drum teaching only).
- **Left on purpose, for the owner to decide:** the old private test link (`?drop=<address>&k=…`, kept in `noodle.drop`) still sends takes to the address in the link instead of the takes service; nothing in the app shows or sets it any more. Remove it once no phone still uses that link (`dropPost`'s non-`api` branch and the `?drop=` reader).
- **Next batches, in a safe order:** none left.

### Phone review, round 1 — Nov 17 (the owner's first session with the rebuilt iPhone app)
- **Extra kicks at the end of a take (fixed):** the recording kept 0.25 s *after* the stop tap, so the tap's own thump was in the take and was read as a kick. A take stopped by a tap now discards everything from 0.25 s before the tap (`TAP_CUT`, `r.cut`, faded over 20 ms). Takes that run to their full length are untouched.
- **Notes from a silent room (fixed):** the note finder judges every sound against the take's own loudest moment, so a take of nothing turned the room's small noises into notes. `takeIsSilence` now ends such a take with "Nothing recorded": the loudest 30 ms is under 8 dB above what the count-in heard, or under −45 dBFS and under 20 dB above it (no count-in reading: under −55 dBFS).
  Numbers behind it (`floor_abs.js`, `floor_take.js`, `silence_check.js`): the owner's 100 real takes peak at −34 dBFS or louder over a room at −65 to −78; none is called silence with a true room level; steady background-only clips are.
  Not done, on purpose: a per-note loudness cut. Real quiet notes and background blips overlap in level (`floor_margin.js`), so it would cost real notes.
- **Playback after a take starts at the take**, not bar 1 (`takeStart`). When the song gets longer or shorter during playback the same moment keeps playing (it used to keep the same fraction of the song, which is only right for a tempo change).
- **Studio:** a line under every track header (the header panel was covering it); the track name is a button shape with a "more" mark; every sheet has a close button and can be swiped down (`nxSheetSwipe`; not while a slider is being dragged or the sheet is scrolled);
  scrolling the timeline during playback is left alone until the next Play (`s2.free`); the message after a take sits at the bottom of the timeline, above the controls, and any tap removes it; a take with nothing in it no longer shows the Retake / Discard / Keep bar.
- `review1_test.js` covers all of the above with a simulated microphone (quiet-room hiss, four hits, a thump at the stop tap).
- **Hum-along screens (voice check and "Teach Noodle your voice"):** the tune is drawn as a piano roll (`nxRoll`: keys down the side, a playhead while it plays and while you record; drum tunes get Hat / Snare / Kick rows);
  after the first listen nothing starts on its own: Record, Listen again (as often as wanted) or Stop, and Record now skips the rest of a listen; "Play the tune while I record (with headphones on)" plays the guide under the take (`guideAlong`), remembered, ticked by default only when a headset shows up among the audio devices.
  The owner turned down drawing the take over the guide and a slower-tempo option: Noodle should learn how people sing, not coach them toward the guide.
- **First tune:** `steps-hum` ("Up and back, twice": next-door notes, five notes wide, the same shape twice) replaces the octave scale in the first-launch check. A shorter seven-note version was tried first and dropped: it left the voice profile with 7 rising steps, under the 10 it needs to switch on, so a squeezed singer would have stayed uncorrected (`voice_test.js`: 11 with this tune, as before).
- `humalong_test.js` covers the screen. Suite: 21 scripts, replay 3.88.
- **What the owner's phone takes showed (8 takes of Nov 16 read from the takes service; `phone_kit.js`, `phone_click.js`):**
  - The "notes from a silent room" were the **metronome click leaking from the phone speaker into the mic**: in both silent drum takes every false hit sits 62 ms after a beat at −41 to −50 dB (6 of 7 and 9 of 10 onsets; the other one in each is the stop tap).
    `removeClickBleed` existed for this but compared the number of on-beat sounds with the beats in the *whole song* (`loopLen()`), which in the Studio is far longer than a take, so it never fired. It now counts the take's own beats.
  - Better than the beat-pattern guess: `countInClick` measures the click on the count-in (where in the beat it reaches the mic, how loud) and the take drops whatever sits within 6 ms of that moment at up to 8 dB over that loudness (`CLICK_TOL`, `CLICK_DB`). Your own hits on the beat are 20–40 dB louder, so they stay.
    On the phone takes (click taken as 62 ms / −45 dB): the silent takes lose all their false hits; the real takes lose 0–2 quiet on-beat hits each, all after the playing stopped. That also explains part of the "extra kicks at the end".
  - Not fixed yet: in the real drum takes the kick is sometimes sorted as snare (the loudest kicks clip the mic, peaks above 0 dBFS), quiet hats as snare, and the backbeat lands on "clap". No drum sounds have been taught on this phone, so the built-in rules are doing the sorting (57–66% on strangers' beatboxing, see the AVP section). There are also faint sounds (−42 to −54 dB) between real hits that pass the loudness gate.
- `review1_test.js` now also plays a leaking click into the simulated mic: a silent take adds nothing, four hits stay four ("Ignored 4 metronome clicks").
- **Grouping the hits of a take before naming them: tested, not shipped** (`avp_feat.js` → `tools/avp_cluster.py`, 56 AVP freestyles, 4,608 hits). k-means on the hit fingerprints (2–4 groups, best silhouette), then each group takes its most common name, or three groups are named darkest to brightest.
  Today: 69.0% right drum on prescribed sounds, 59.5% on people's own. Best grouping variants: 68.1% / 62.2%, with individual people losing 20–58 points. People's kick, snare and hat don't separate cleanly enough for the groups to be the drums.
- **Faint kicks (shipped):** `dropFaintKicks` removes kick-class hits more than 30 dB under the take's other kicks (`FAINT_KICK_DB`; needs 3 kicks). AVP: no real hit lost, 3 false hits fewer (`tools/avp_faint.py`). The owner's phone takes: the stray kicks at −42 to −56 dB between and after the real hits go.
  A cut for *all* faint hits was not shipped: at 25 dB it helps AVP (F1 0.725 → 0.741, 0.825 → 0.842) but on the owner's phone the real hi-hats sit 26–35 dB under the kicks and would be lost.
- **Drum teach offer (shipped, owner's call):** the first time someone records a Drum kit with fewer than two taught sounds, a sheet offers "Teach my sounds" (kick, snare, hi-hat on every click, about 20 s) or "Not now" (straight to recording). Shown once (`noodle.kitOffer`); More → Your drum sounds stays available. After teaching, the Studio says "Learned. Now tap record for your beat." `kitoffer_test.js`.
  Evidence: AVP right drum 63% / 56% untaught → 79% / 77% taught. The owner's `drums A`–`D` takes (before and after teaching) will measure it on a phone.

### Phone review, round 2 — Nov 17
- **"Other readings" → "Another version" (shipped):** an ⓘ next to it opens a short explanation. Tapping cycles the likely versions ("Version 2 of 4"); **Mine** appears while on a version and puts the notes back exactly as they were, hand edits included (`verNext`, `verMine`, `verUI`).
  How Mine works: the first tap saves the part's notes, its reading, the song key settings and the key the notes are heard in (`tr._mine`). Editing while on a version makes that the new Mine at the next tap. Going all the way round the cycle also lands on Mine.
  Found while testing: Noodle's key guess is kept until something resets it, so a part can be heard in a key a fresh guess would not pick. Mine keeps the key that was being heard, so it sounds the same as before.
- **Play under open sheets (shipped):** in the Studio timeline every sheet stops just above the transport, so Play, rewind, loop and the metronome work while a sheet is open, and sound changes are heard as you make them. Record is dimmed while a sheet is open. (`sheetAboveTransport`)
- **Snap (shipped):** a SNAP chip next to KEY cycles 1 → ½ → ¼ → ⅛ bar (per project, `S.snap`, default 1). Dragging a part, or its grips, moves in snap steps; the shortest part is one snap step.
  Parts can now be a fraction of a bar long and start inside a bar (`pBars` allows fractions; `s2Cut` keeps exact lengths); the song itself still ends on a whole bar (every song-length update rounds up). Labels read "From bar 2½ · 1½ bars" when a part isn't on whole bars (`partWhere`, `barsTxt`).
  A part narrower than 40 px keeps its grips outside its edges, so its middle can still be grabbed to move it. To make room in the top row, a long key name shortens with "…" and the Mix button is tighter. Recording still starts on a whole bar.
- **Empty parts (shipped):** tap an empty spot in a track's lane: a dashed outline appears where a part would go (at the snap step you tapped) and the bar below offers **New part**. That makes a 1-bar empty part (shorter if the next part starts sooner) and opens the editor to draw notes or hits.
  An empty part you made is a real part (`tr.blank`, counted by `hasContent`): it can be selected, moved, trimmed, duplicated and deleted, survives a reload, and a recording over it replaces it like any part. Vocal lanes don't offer it (there is nothing to draw). A tap that only deselects a part doesn't offer one; tapping the same spot again dismisses it.
  Found along the way: the clip bar's buttons ignored `hidden` (the stylesheet forced them visible), so "Edit notes" also showed on vocal parts, where it did nothing. Fixed.
- **FX editing as a grid (shipped):** an FX part opens in the editor like the drum kit: a row per kind (Riser, Downlifter, Sweep up, Sweep down, Impact), each effect drawn as a bar with the shape of your voice inside (`fxGridMount`). Tap an empty spot to add one (a build lasts a bar, an impact a beat, with a plain rising or falling shape: `fxNew`); tap one to remove it; drag to move it or change its kind; drag its right end for length; a playhead while playing; Undo.
  The old list sheet (`s2FxSheet`) is gone. Edits are logged for shared takes (`fxadd`, `fxdel`, `fxkind`). Two bars fit on an iPhone-width screen; longer parts scroll.
- **FX quieter by default (shipped):** a new FX track starts at volume 45 instead of 80 (about 8 dB quieter with the app's volume curve). Existing FX tracks keep their volume.
- `round2_test.js`, `snap_test.js`, `blank_test.js`, `fxgrid_test.js`. Suite: 26 scripts, replay 3.88.

### Phone review, round 3 — Nov 18
- **Trimming keeps the notes (shipped):** a part is now a window onto its content, as in a DAW. Trimming either end only moves the window; notes, hits and effects outside it stay in the part, unheard and not drawn, and come back when the part is extended again.
  Before, a trim deleted what it cut (`s2Cut`). Now `s2ResizeClip` only shifts and resizes; `inWin` decides what plays, exports and shows (starts inside the window, cut at its end). The song's key and the editor's pitch range follow what is inside the window.
  Recording over a part still replaces what's under the new take (that is a replace, not a trim). `trimkeep_test.js`.
- **FX editor: tap selects (shipped):** a tap on an effect selects it instead of deleting it; a panel under the grid shows its kind, where it sits, **Volume**, **Left / right** and **Delete**. A tap on empty space first just deselects, as in the note editor; with nothing selected it adds an effect. Pan is per effect (`e.pan`, a stereo panner in `fxPlay`); volume is the effect's existing level (`e.v`). `fxgrid_test.js`.
- **Drum editor works like the note editor (shipped):** each drum is a row (as tall as a note row), each hit a short note. Tap empty space to add a hit (it stays selected); tap a hit to select it (a tap no longer deletes); tap empty space again to deselect; drag a selected hit in time or onto another drum; **Delete** in the bar under the grid. The drum is heard when you add, select or move a hit.
  The note editor's touch code now handles both (`evs`, `evRow`, `evLen`, `previewHit`, `hitsChanged`); the old tap-to-toggle (`gridTap`) is gone. Drum edits are now logged for shared takes (`hitadd`, `hitmove`, `hitdel`), as note edits already were. `drumed_test.js`.
- **Undo / Redo buttons stay current (fixed):** in the editor they were only refreshed when the screen was rebuilt, so after drawing or deleting a note Undo looked unavailable until something else redrew. `histUI` now updates both screens' buttons on every change (a change waiting to be saved counts).
- **Velocity (shipped):** every note and hit already had a velocity (used by playback and MIDI export) but nothing showed it. The bar under the editor's grid now has a **Velocity** slider (5–100) for the selected note or hit, in the note and drum editors; you hear the note at its new velocity when you let go. Logged for shared takes (`vel`); undoable. Unselected notes and hits are drawn fainter the softer they are. `velocity_test.js`.
- Suite: 29 scripts, replay 3.88.
- **FX editor touch (fixed):** a finger that starts on an effect (or its right end) drags it; the grid no longer scrolls under it. On empty grid a finger still scrolls. (Touch events on an effect are claimed with `preventDefault`; checked with real touch input through the browser's protocol, `round3b_test.js`.)
- **Rewind in the editor:** ⏮ next to Play goes back to the start of the part being edited. The editor bar stays on one line (it scrolls sideways on an iPhone SE).
- **Chords in a good register (shipped):** a hummed chord part (Keys, Pad, Arp) gets its octave chosen so its roots sit around C4 (Keys), A3 (Pad) or D4 (Arp), never under C3 (`autoOct`, `CHORD_ZONE`), unless you've set the octave yourself (`octSet`). Applied after each take and when the instrument or chord type changes. A test take hummed at A2–D3 now sounds at A3–D4.
- **Chord type** is the first thing in a chord track's sheet (above Mix); **Lead** and **Bass** have no chord option (`chordType` is off for them).
- **Buttons look like buttons:** the editor's Delete and Split, the red actions in sheets ("Delete track", "Delete project"…) and "+ Add track" now have a border and fill. Standing rule from the owner: anything tappable must look like a button.
- **Playhead at bar 1:** the yellow line now starts right after the track headers instead of half under their edge.
- **Example song:** adds Keys (Am, G, Am, Dm, C on E-piano) and FX (a noise sweep down out of the downbeat, a riser back into the loop; the owner preferred the sweep to an impact).
- **Teaching a drum sound from Your drum sounds** comes back to that list, to teach the next one (`teachBack`).
- **FX levels:** the owner then found 25 a little too quiet and named the noise sweeps as what had been too loud. Final: new FX tracks start at 45 (about 8 dB under an 80 track), and the sweeps play 6 dB lower than before. K-weighted loudness (`fxlevels.js`, BS.1770 filters) had the sweeps level with the risers (−15.5 vs −16 LUFS-ish); their hiss still sounds louder, so the owner's ears decided. Now: risers −16, sweeps −21.6, impact −18.7.
- **Track sheets end with Mix:** Name, Instrument, Sound, Chord, Notes (Octave, Expression) or Voice, then Mix, then Duplicate track and Delete track.
- **"Follow my voice" is now "Expression"**, with a line under it: "0 plays clean, steady notes. Turn it up to keep the slides, wobbles and swells of your take." (It never changed which notes were heard; it adds your take's pitch bends, loudness and tone on top of them.)
- **Playhead in the editors:** a strip above the editor's buttons spans the part, with the song's bar numbers; tap or drag to move the playhead (during playback it carries on from there). The grid's bar numbers are now the song's bars, not the part's.
- **"Couldn't hear you" on a normal hum (fixed):** two Bass takes of Nov 18 (quiet room, steady humming at about −37 dB, pitch ~125–155 Hz) gave no notes. Not a level problem: the hum was breathy/airy (periodicity 0.40–0.47 against 0.88–0.90 for the owner's clear hums; spectral flatness 0.21 against 0.06), so YIN's clarity test passed under 20% of the loud frames.
  `trackNotes` now relaxes the clarity test step by step when under 30% of loud frames pass, until 40% do, keeping only pitches within 9 semitones of the take's middle (noisy frames can read an octave off). Both takes now give C♯3–D♯3 notes; the other shared phone takes are unchanged; the 31-take replay is unchanged (3.88). A third "nothing heard" Keys take is mostly 60 Hz mains hum with very little voice, and still gives nothing. (`nothing2.js`, `nothing4.js`.)
  Ruled out first: the noise cleaner. Applied to a good take, even with a count-in full of humming, it keeps 10 of 11 notes.
- **Guided count-in:** with the count-in chord on, a guided tune's arpeggio starts on the tune's first note and comes back to it (e.g. Ode: A–C–E–A), so the starting note is the last thing heard before singing. Other takes keep the song's home chord.
- **No text selection on long press:** the page can't be selected like text any more (text fields still can).
- **Duplicate track:** in a track's sheet; copies every part and its notes as a new track right under it, then opens its sheet to pick an instrument (e.g. a lead's notes as Keys chords). `duptrack_test.js`.
- **One track failing no longer stops playback:** the owner's example song wouldn't play on the iPhone; it plays in Chromium (`explay.js`) and WebKit isn't available here to reproduce it. Playback used to wait for every track and gave up silently if any one failed to render. Now a failing track stays silent, the rest play, and a message names the track and the error (`renderErrShown`); a failure while starting playback is reported too. `renderfail_test.js` simulates a failing FX render. Waiting on the owner's next run for the message.
- Suite: 33 scripts, replay 3.88.

### Sound design: recorded instruments (Nov 18)
- **Why:** every sound was synthesized (oscillators, filters, a little FM; drums from noise and pitch drops; reverb from noise). Fine for synths, thin for piano, strings, guitar and real drums. The owner wants the App Store release to sound good; app size is not a concern, memory is.
- **Licences, checked in each library's own LICENSE file:** only CC0 / public domain and CC BY are used (CC BY credited in More > Sound credits and `samples/CREDITS.md`).
  Rejected: jRhodes3d (samples are CC BY-NC: non-commercial; one sample collection mislabels it CC0), Splendid Grand Piano ("public domain" but listed as by AKAI, so of unclear origin), anything GPL or share-alike for samples.
  Chosen so far: Salamander Grand Piano (CC BY 3.0, Alexander Holm), Greg Sullivan's E-Pianos (CC BY 3.0), VSCO 2 Community Edition (CC0); Karoryfer basses and guitars (CC0) and SM Drums (public domain) / other CC0 kits to check next.
- **Sampler (shipped):** `SAMPLED` maps a sound name to a folder in `noodle/samples/`; `loadSampled` fetches its `map.json` and MP3s once a song uses it and decodes them at 32 kHz (a third less memory than 48 kHz; keeps everything to 16 kHz); `sampleVoice` picks the velocity layer and the nearest recorded note, sets the pitch by playback rate (slides glide), Brightness is a low-pass (1.5 kHz to full), and the note fades over the instrument's release when it ends.
  Each file's start is found on load (MP3 adds a little silence), so notes land on time (≤ 10 ms, the piano's own attack). A track waits for its samples before it is rendered; anything that can't load falls back to the synthesized sound of the same name.
  `samples/build_samples.py` builds an instrument from its source library (trim by register with a fade, keep chosen velocity layers, MP3 192 kbit/s). Sources are cloned outside the repo.
  iPhone app: `sync-web.sh` now copies `samples/`; the app serves `.mp3` as audio (Swift change: needs a rebuild in Xcode).
- **Piano (shipped):** Salamander, 30 notes (every minor third) × 3 of 16 velocity layers (v4 soft ≤0.45, v8 ≤0.9 including drawn notes, v15 hard), 3.5–8 s per note; 12.7 MB, about 0.8 s to load, about 140 MB in memory while used.
  A4 plays at 439.5 Hz; soft to hard spans about 17 dB; +6 dB in `map.json` to sit level with the synth piano it replaces. `piano_test.js`. Suite: 34 scripts, replay 3.88.
- **E-piano (shipped):** Greg Sullivan's Wurlitzer EP200 (CC BY 3.0): all 4 velocity layers, 48 key ranges, each recording's tuning and level from its SFZ file; 2.5 MB. Level within about 1 dB of the synth e-piano on single notes; A4 at 439 Hz.
  `build_samples.py` now reads SFZ files (`parse_sfz`: global/group/region inheritance, #define, note names; regions with key range, root+tune, volume, velocity range), and the app's sampler plays key-ranged regions with their own level.
- **Strings (shipped):** VS Chamber Orchestra Community Edition (CC0) section sustains with vibrato: cellos below C3, violas C3–A3, violins from A♯3 (three SFZ files stitched by range), the fuller dynamics layer only (memory), 6 s per note with a crossfaded loop from 2.5 s so pad notes hold as long as needed; 2.6 MB. −7 dB in `map.json` to sit level with the synth strings.
  A 12 s note holds steadily (no level drop or click at the joins). The build records each note's start in the source so the app can place loop points exactly despite MP3's lead-in (`encode_loop`).
- **Rock bass and Guitar (shipped):** Karoryfer Growlybass (Jazz bass, fingers, direct) and Emilyguitar (Epiphone electric, direct), both CC0: 4 velocity layers, first round robin, scrapes/noises/release samples left out, mono, 4 s per note; 5.5 MB and 7.0 MB. Guitar plays through a light amp in the app (`meta.amp`: drive, high-pass, speaker-like low-pass; the level is set after it, so it doesn't change the tone).
  Two mapping fixes found by measuring the rendered pitch: Growlybass's SFZ names each recording an octave above its true pitch (its "A2" is 55 Hz), so the build shifts it down (`shift=-12`); and SFZ regions without a keycenter default to 60 (the spec), not their low key (the guitar was a semitone sharp around middle C).
  Low strings plucked hard ring sharp (up to +40 cents on the open E): with `retune` the build measures each recording past the pluck and folds any 8–60 cent error into its root (16 of 128 recordings). All notes within 9 cents; both within about 1 dB of the synth bass and pluck in a line (gain 2.4 and 0.24). The build now empties an instrument's folder first, so renamed files don't pile up (the e-piano had doubled). `piano_test.js` covers both.
- **Synths, round 1 (shipped):** every synth was mono. Stacked sounds are now stereo unison, each voice at its own place left to right and starting at its own point in the wave (fixed per note, so renders repeat exactly; no 'flam' at the start): Saw 3 voices, Supersaw 7, Square 3, Warm pad 4 (with a slow filter breath), Choir 3, Sweep 3, Stab 3, Pluck 2 (its sine body in the middle); Bell is two slightly detuned carriers left and right plus a fast-fading strike partial (×2.756); Organ has a key click.
  Filter envelopes on Saw, Square and Supersaw (open at the start, settle); harder notes a little brighter on every filtered sound (cutoff × 0.7–1.0 by velocity). Bass sounds (Sub, 808 glide, Synth bass, Reese) stay mono.
  Levels re-matched to before with `synthlevels.js` (a fixed phrase per sound: RMS, side/mid width, brightness, render time): all within 0.7 dB; width went from mono to about −7 dB side/mid on stacks. Render time is up about 1.5–2× on pads and stacks (more voices, plus panners); kept for the sound.
- **Drums (shipped):** the Rock kit plays Big Rusty Drums (Karoryfer, CC0; a 24" rock kit): kick, snare, sidestick, closed/open hat, 3 toms, crash, ride; 4 velocity layers each (of 4–14 recorded), mics mixed at the kit SFZ's own defaults (amplitude × default CC/127); 40 files, 2.1 MB (`build_kit`). Clap and the percussion slots stay synthesized.
  Velocity picks the layer (snare spans 15 dB soft to hard), Tone tunes ±3 semitones, a closed hat cuts a ringing open hat (−15 dB). Each drum set to the synth Rock kit's loudness over its first 0.25 s (peak at most 3 dB over), so songs keep their balance: a groove is within 0.4 dB. `kit_test.js`.
  Also checked, not used: SM Drums (no license file in its repository). Swirly, Unruly and Virtuosity Drums are CC0 too, for later kits.
  Synth kits: snares get a second tuned body tone (×1.65), 808 and Punchy hats the six-square metallic tone under the noise; levels unchanged (`synthkit.js`: per kit and drum, loudness and the part above 150 Hz at 18 dB/octave, roughly a phone speaker).
  Tried and dropped: saturating kicks (and an 808 click) to carry on phone speakers. Measured, it compresses the low body more than it adds audible harmonics: the gap below the speaker grew (11.4 → 12.8 dB on the 808), so no.
- **Reverb (shipped):** the impulse was white noise with a polynomial fade (equally bright all the way down, no early sound, a new random tail each render). Now `roomIR`: predelay 8–25 ms, 10 early reflections in the first 40–110 ms (different left and right), a dense exponential tail whose highs fade faster than its lows (a one-pole low-pass falling from ~10.8 to 1.8 kHz), a low cut at 120 Hz, seeded noise (every render identical).
  Kept from before, measured (`reverb_test.js`): decay time per Reverb setting (T30 1.03/1.83/2.78 s vs 1.02/1.83/2.78 at 15/45/80, after scaling RT60 by 1.32 for the darkening) and the wet level (within 0.3 dB, with the return trimmed 0.9 → 0.8). Changed on purpose: the late tail is 3–4 dB darker than its start (was flat or brighter), and 30–90 Hz in the tail is 8–10 dB under the mids (was about level).
  A recorded room impulse was considered; an algorithmic one keeps the Reverb setting's range, costs nothing to download, and needs no license.
- **Recorded sounds ready on open (shipped):** the iPhone app already carries every recording inside it (offline works); what loads later is reading one into memory. Now a song's recorded instruments and kits are read as soon as it opens or a part changes sound (`warmSounds`, from the studio's redraw hook and the sound picker), so even the first previewed note plays the recording. Only what the song uses, to keep memory low (the piano alone is about 140 MB in memory). `warm_test.js` (with renders off: opening loads exactly the song's piano; switching to Guitar and the Rock kit loads them).
- **Your voice (shipped, experimental):** a Lead and Pad sound made from the user's own singing in the song. `yvMoments` finds the steadiest 0.6 s stretches in the song's takes (voiced throughout by YIN, within 14 dB of the take's loudest, pitch SD ≤ 0.35 semitone; whistles above G5 left out: the tracker can't follow them and they'd give a plain tone). `yvCapture` cuts one out at 24 kHz, evens its level (so a swell doesn't jump at each repeat), measures the pitch of the part that loops, loops it on whole cycles at the best-matching end, blends the join, and stores it in the song (`S.yv`, about 40 KB). Lead: near-dry plus a quiet double; Pad: three copies, ±9 cents, left/middle/right, starting at different points of the loop, slow attack. With no take yet it plays Choir (and says so once). The track sheet offers "Try another moment" (the next steadiest).
  On 41 real phone takes (`yv_test.js`, which also writes listening demos): a moment found in 34 (all 4 whistles and the 2 "da da" takes, all short notes, have none); notes play within 18 cents of target (typical under 5) with a natural wander of 16 cents median; the loop's largest level step between 20 ms frames 7.3 dB at worst (2–4 typical, like a held voice). Levels: Lead with Saw, Pad with Choir (12 takes, within 0.5 dB). `yv_ui_test.js` covers picking it, Choir before a take, the next moment, and that it's saved in the song.
  Tried on the way: the pitch of the whole moment (off by up to 50 cents: only part of it loops), and a looser selection (SD ≤ 0.6: drifted up to 40 cents inside the loop).
- **Wavetable sounds (shipped):** single-cycle waves from AKWF (CC0; only its own `AKWF/` folders, not those named after other products), embedded as 48 harmonics each (`WT`, a Web Audio PeriodicWave; no files). Chosen by measured spectrum (`akwf_scan`: harmonic centroid, sparsity, odd share): Glass (FM wave, strong 7th/11th harmonics; 3-voice stereo, filter envelope, late vibrato), Chip (square-like game wave, a semitone blip at the start), Theremin (nearly pure, wide slow vibrato), Vowel pad ("oo" wave opening to "ah" over 1.6 s), Digital pad (two granular waves blending at ~0.2 Hz), Growl (distorted wave, filter envelope, mono). Levels with Saw, Warm pad and Synth bass in `synthlevels.js` (within 0.4 dB).
- **Coded sounds (shipped):** Acid (Bass: saw into a resonant low-pass, Q 13, that snaps shut, slightly driven; harder notes open it more), Wobble (Bass: the filter moves twice a beat, on the song's beat grid), String pluck (Keys, Arp: Karplus-Strong, made once per note/brightness and cached; in tune within 0.5 cent from E2 to C6; Tone is a low-pass; low strings slightly left, high slightly right), Chorus pad (Pad: saw and sub through two moving delays left and right), Pump pad (Pad: ducks to 0.12 on every beat and recovers, as if pushed by the kick; 4.7–11 dB dips measured against the moment before each beat). `newsounds_test.js`.
  String pluck was 4× brighter than the Piano at first (spectral 'mean frequency' 2.8 kHz vs 0.56): a softer pluck and a Tone low-pass brought it to 1.5 kHz, about the Saw's. Its level sits between the Piano (Keys) and the Saw (Arp), which disagree by 6 dB for a plucked sound.
- **More recorded instruments (shipped):** from VS Chamber Orchestra CE (CC0): Marimba (Keys, Arp), Glockenspiel (Lead, Arp), Flute (Lead), Horns (Pad, Keys); 6.3 MB together. `build_named` maps libraries by file name (key ranges halfway to the neighbours). Measured on every file: VSCO names notes an octave low (its C4 sounds at C5), so `shift=12`. Horns' file names had '#', which ends a web address: names are now made web-safe (it had silently played the stand-in synth). Horn layers borrow missing notes from the nearest layer (its loudest had nothing above middle C). Glockenspiel and Flute fold notes below their range up an octave or two (`fold`), as a player would.
  Levels: the orchestral recordings are 15–28 dB under the app's sounds (recorded with headroom): Marimba +16 dB (between Piano and Saw), Glockenspiel +24 (a little under the Bell, being far brighter), Flute +15 (Saw), Horns +8 (Warm pad). In tune within 12 cents across each range (Marimba read 0.25 s in: its strike isn't settled before). Library has no harp or celesta. `vsco_test.js`.
- **Launch groundwork (shipped):** memory: instruments the open song doesn't use are let go (all recorded ones together are 313 MB decoded; piano 128), String pluck's cache capped at 48 (`mem_test.js`). Song files: save a song or back up all as `.noodle` (song, kept recordings, Your voice), open to add them back with new part ids, no duplicates on reopening (`songfile_test.js`). Crash reports: uncaught errors and failed parts, anonymous (message, stack lines, build, app/web, screen), once each, ≤10 a session, switch in More, never from localhost (`crash_test.js`); service `/v1/errors`, once per distinct error a day, 90 days, ≤150 a day. Privacy manifest, policy and `noodle-ios/APP_STORE_PRIVACY.md` updated to match. Free/Pro list: `noodle/PRO.md`.
- **Mix FX (shipped):** the 11 effects of the Tuttii FX prototype (`troyskinner3/tuttii-fx-prototype`) on the whole mix: a Mix FX track (Add track → Ear candy), one effect per part, tracks stacked top first, in the master chain before drive/compression (so reverb is shaped too). Curves as in the prototype (points, quadratic bows with the control at the segment's middle, ends fixed at Off, default rise with a 20 ms release; straight segments one ramp, bowed ones 12). Playback: units rebuilt on every start/seek/tempo change, curves scheduled up to 2 s ahead each loop pass, rebuilt when the parts change while playing; exports schedule every pass. Echo's delay follows the tempo (note values). `mfx_test.js`: every effect neutral before/after its part (±0.1 dB), Low pass darkens to 129 Hz 'mean frequency' at its peak and returns exactly, High pass thins, live sweep repeats each pass and follows an edit. `mfx_ui_test.js` drives the studio as a free and a Pro user.
- **Noodle Pro (shipped, needs App Store Connect setup):** `PRO_SOUNDS`, free effects High pass/Low pass with the default shape, the DAW pack, the video tag (`noodle/PRO.md`). Locks open the Pro screen; a song that already has Pro sounds still plays. iPhone: `ProStore` (StoreKit 2, non-consumable `io.tuttii.Noodle.pro`), entitlement from `Transaction.currentEntitlements` at launch and on every transaction update, Restore = `AppStore.sync`; the page is told `noodlePro(owned, price)` and remembers it for offline use, the App Store's answer always wins. `pro_test.js` (with a stand-in bridge): locks, Ask to Buy, buy, restore with nothing, reload, revoked, web.
- **Review round (Nov 19):** fixed: the DAW pack failed whenever a song had Song FX (MIDI read notes from it); Song FX regions couldn't be resized (the trim check wanted notes inside); a beatbox take could be merged into a Song FX track; Song FX now play along while recording. Song FX regions scale with their region (the curve is in shares of it): dragging the right edge from 2 to 4 bars moves a mid-region peak from 6.15 s to 8.15 s at 120 BPM. The curve editor shows bar numbers (song bars, as many as fit) and Mix 0/50/100%. `flows_test.js`, `mfx_resize_test.js`.
  Note reader: the 31-take benchmark loses most to wrong pitches (111 of 194 edits) and merged repeats (59 adds); both were studied at length before (drift, melody models, splitters, timbre cues) without a gain that held, so no change this round.
- **Quality of life (shipped):** a new key moves the whole song there (notes by the nearest interval, at most 6 semitones; vocals through the PSOLA shifter, `tr.vt`, with any tuning on top; drums stay; one undo step); Loop on a part loops its bars (the restart booked on the audio clock at the section's end; the ruler shows it, tap to clear); Tap the beat in the Tempo sheet (median of the last 8 gaps, a 2 s pause starts over); Copy a part, then Paste part in another song's Add track (Pro; vocals keep their recording); lock-screen Now Playing and play/pause, and haptic taps (`NativeBridge`, iPhone app). Clip bar: Duplicate, Copy and Loop are icon buttons so it fits a 320 px screen. Tests: transpose, section, taptempo, copypart, native.
- **Song FX matched to the prototype (shipped):** the editor as in the prototype's screenshots: Curve row with + (a point in the widest gap), − (the highlighted point) and Reset; y axis Frequency (Hz, log, 20–20k) for High pass / Low pass with the curve drawn as the cutoff (Low pass sweeps down from 20k), Mix 25/50/75% for the rest; x axis bars of the region; the prototype's setting names and units. A point is highlighted when added, dragged or tapped (tap again to let go); grab the line anywhere to bow it under your finger; each change is one undo step.
  Sound: Washout now uses the prototype's own wash (2.5 s of noise fading as (1−t)³), Reverse swell crossfades the mix into the rising noise as the prototype does, and the effects sit last, just before the limiter, as in the prototype. `fx_ab_test.js` runs the prototype's own code (`extract_proto.js` → `proto_fx.js`) against Noodle's on the same signal: 9 of 11 effects identical (correlation 1.0000, 0.00 dB); Washout and Reverse swell, built on random noise, match in loudness (worst 50 ms window 3.6 and 1.0 dB; the prototype differs from itself by up to 6.4 dB run to run).
- **Review round 2 (Nov 19):** randomized UI test (`monkey.js`: ~2,900 random taps, drags, sliders, selects and undos over the studio, sheets and editors, Pro and free): no errors. Fixed: a looped section now ends when its part is deleted or the song ends before it.
  Speed: a long part rendered every note's sound from the start of the song (an unstarted oscillator's filters, panners and gains are still worked through), so render time was notes x length: a 72 s song's Warm pad took 45 s, a Pluck arp 40 s, Supersaw 20 s. `renderStem` now makes each note just before it plays (the offline render pauses every 2 s) and lets go of notes half a second after they end. Same sound: piano, String pluck and arp bit-identical, the rest within float rounding (≤ −127 dB of the peak); pads now scale linearly (8 bars 0.6 s, 64 bars 4.1 s), arp 10x faster. `render_speed_test.js`.
  `fx_ab_test.js`: the prototype's noise made repeatable; Washout and Reverse swell judged against the prototype's own spread across seeded runs (half-second windows: Washout 6.6 dB vs its own 11.1, Reverse swell 0.7 vs 0.8).
