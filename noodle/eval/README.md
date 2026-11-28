# Noodle melody-detection evaluation

Scripts used to measure and tune how well recorded humming / singing turns into notes. They run the app's own
detector (`analyzeTake` in `../js/reader.js`) in headless Chromium and score it with
[mir_eval](https://github.com/craffel/mir_eval): a note counts as correct when it starts within 50 ms of the true
note and is within 50 cents of its pitch ("note F1"; "key-free" also allows the whole melody to be hummed in
another key).

## Running the tests

`bash noodle/eval/run.sh` runs every app test (about 15 minutes) and ends with `ALL PASS (n scripts)`; `bash noodle/eval/run.sh mfx_test pro_test`
runs only those. It serves the app with `serve.js` on port 8800 (the scripts' `noodle-*.html` names are the app's `index.html`) and the takes
service from `noodle-api/` on 8787. The owner's guided takes replay (must stay at 3.88 edits per take) runs when they are in `data/user/`:
`NOODLE_DROP_URL=… NOODLE_DROP_KEY=… python3 pull_takes.py data/user` (both values stay out of the repo). `data/` is never committed.

## Data (not in this repo)

- **Vocadito** — 40 solo-singing clips, 15 singers, with note annotations. CC BY 4.0.
  https://zenodo.org/records/5578807 — unzip to `data/vocadito/`.
- **HumTrans** — humming with MIDI ground truth (10 hummers). **CC BY-NC 4.0: used only to measure, never shipped
  or trained on.** https://huggingface.co/datasets/dadinghh2/HumTrans — `remote_zip.py` pulls a subset of the
  test split straight out of the 14.7 GB zip; `all_midi.zip` → `data/humtrans/midi_data/`.

`node serve.js` serves the app and `data/` on port 8800.

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
How to work on it: one small step at a time; after each, `bash noodle/eval/run.sh` must print ALL PASS (replay 3.82 since round 7); only then commit and push. (`eval/tools/prune.js` predates the split into `js/` files and works on a single-file copy only.)
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
- **Review round 3, UI (Nov 19):** `uisweep.js` opens every screen, sheet and editor on iPhone SE, 13 and 15 Pro Max (light and dark), flags clipped text, sideways scrolling and off-screen controls, and screenshots each. Fixed: "Sound FX" was shortened in its track header; on the SE the clip bar's label was squeezed to nothing (hidden there now) and the editor toolbar scrolled sideways (compact under 360 px); the track sheet's title is now its name field (the name was shown twice); the section loop has its own bracketed icon (it matched the whole-song loop); drum rows grow to the room; Share copy shortened; long sound lists grouped (Synths / Recorded / Your voice). Left as is: a very long song title ends in "…".
  Measured: startup 0.36 s at 4x CPU slowdown; reading an 11 s take takes 2.3 s on the main thread (the screen freezes): the next speed item (a worker, same code, same notes).

## Round 4 (19 Nov 2026): modules, background reading

- **Tests run from the repo:** `bash noodle/eval/run.sh` (57 scripts + the replay). Nothing depends on scratch folders any more; the owner's takes stay out of git (`data/`).
- **Noodle is split into files:** `index.html` (markup), `app.css`, and `js/` (classic scripts loaded in order, sharing one global scope):
  `reader.js` (the take reader, nothing touching the page), `core.js`, `studio.js`, `dsp.js`, `key.js`, `engine.js`, `instruments.js`,
  `record.js`, `takes.js`, `ui.js`, `export.js`. `stamp.sh` (run by `noodle-ios/sync-web.sh`) stamps each file's URL with a hash of its
  contents, so a browser or the offline copy never mixes a new page with old scripts.
- **Takes are read in the background** (`js/reader-worker.js` loads the same `reader.js`): the page no longer freezes after a take.
  At 4x CPU slowdown an 11 s take had frozen the screen for 1.9 s (notes) + 2.0 s (learned reader). `worker_test.js`: the worker's result is
  identical to reading on the page, field for field, on 14 of the owner's takes × 2 instruments × 2 detail settings (56 checks), and timers keep
  running while it reads. If a worker can't start, takes are read on the page as before. A new recording waits until the last take is read.
- **Faster fixes (shipped, `corr_test.js`):** under the grid, ▼ ▲ move the selected note to the next note of the key; Split asks
  "Into 2 / 3 / 4" for notes long enough (double-tap still splits in two); hold an empty spot, then drag, to box-select several notes or
  hits, which then move together (arrows, or drag one of them; pitch moves step along the key so a phrase keeps its shape) or delete together.
- **Learning from fixes (shipped, `learnfix_test.js`):** closing the editor on a part where you fixed a recorded note's pitch adds that
  part's sung-vs-shown intervals to the same interval profile the voice check fills (once per part; editing it again replaces its share;
  needs 10+ upward jumps, ratio < 0.9, as before). On the owner's guided takes, "fixing" every wrong note to the Guide gives an upward
  ratio of 0.70 (134 jumps) against 0.745 (152) from the guided takes themselves: both well under 0.9.
- **Tap along (shipped, `taprec_test.js`, `replay_taps.js`):** while a melody records into a part, a pad under the timeline takes one tap
  per note (optional; More > Timing & mic turns it off). Taps split held notes (a repeat keeps the held note's pitch); when nearly every
  note got a tap, a note start with no tap is joined back to the note before. The tap delay is worked out from the take. Replay of the
  owner's 31 guided takes with simulated taps at the Guide's notes, edits per 10 notes (today 3.88): ±30 ms 3.52, ±60 ms 3.68,
  all taps 100 ms late 3.52, only every other note tapped 3.94.
- **Chords from your melody (shipped, `chords_test.js`):** "Add chords to this melody" in a melodic or vocal track's sheet makes a chord
  track under it. One chord per bar or half bar from the key's seven chords (pentatonic and blues use their parent scale), chosen by
  Viterbi: chord tones of the melody score (notes starting on beats 1 and 3 count 1.5x), other key notes cost 0.6, out-of-key notes 1,
  plus a small preference for I / IV / V / vi and for common moves (V-I, IV-V, ii-V...), a cost for repeating a chord, and starting and
  ending at home. Twinkle in C: C G F C by bar, C G F C F C G C by half bar; Ode to Joy: I V I V. Styles: Pad, Piano (free), Pulse, Arp (Pro).
- **Drum fills (shipped, `fills_test.js`):** a kit part's sheet: every 4 or 8 bars the last beat becomes a fill (snare roll or toms,
  alternating; every 8th bar a two-beat fill) and the next bar starts with a crash. Made at render time from the part's own beat, also in
  MIDI export. Rendering is identical outside the fill bars.
- **Song sections (shipped, `sections_test.js`):** Sections (the corner of the ruler) names stretches of bars; the names show in the ruler.
  Duplicate copies every part that starts in the section right after it and moves the rest of the song later (looping parts keep looping;
  up to 64 bars); Loop loops it; ✕ removes the name. Undo covers all of it.
- **Effects on one track (Pro, `tfx_test.js`):** Echo (dotted eighth, ping-pong), Chorus, Drive in a melodic or drum track's sheet, built into
  the part when it renders (so playback and exports carry them; a Lo-fi kit keeps its own colour too). Drive is level-matched (+0.7 dB at 80).
- **Backing vocals (Pro, `harm_test.js`):** two voices from your own take, a third above (left) and below (right) in the key, made with the
  same pitch shifting that tunes vocals; a sung A3 in A minor gives C4 and F3 exactly. About 6 dB under the lead at 80.
- **Vocoder and Talkbox (Pro vocal sounds, `vocoder_test.js`):** 18-band channel vocoder (130 Hz-8 kHz) built from Web Audio nodes: the tuned
  vocal's band levels drive the same bands of a synth (Talkbox: the note you sang; Vocoder: a chord in the key on it, an octave down) plus noise
  for consonants. Silent between phrases (the rectifier curve has an odd length, so silence maps to exactly 0; an even length leaked -23 dB).
- **New recorded instruments (Pro):** VSCO 2 CE (CC0) trumpet (sustain, 2 dynamics), clarinet (sustain, 3) and xylophone; same +12 octave
  naming as the other VSCO instruments (measured). Levels set against the Saw / Marimba (clarinet +10 dB, xylophone +2 dB). A second recorded
  kit (Karoryfer Swirly or Unruly Drums, CC0) is next: each needs its mics mixed and every drum levelled against the synth kits.
- **Growth (shipped):** a rating prompt (Apple's own, after a song is shared; at most once per 120 days from Noodle); a 2.5 s end card on
  free videos (`endcard_test.js`); **song links** (Share → Link to remix: the song file and a 30 s preview go to the takes service; `/s/<id>`
  is a listen page; opening the link in Noodle, or `?s=<id>` on the web, adds "Remix of …"; Stop sharing deletes it; `songlink_test.js`);
  **invites** (More → Invite friends: a 6-letter code per phone; a friend's phone counts once, after its first song; 3 friends earn a Noodle
  Pro offer code from a pool the owner uploads; `invite_test.js`). Both need the takes service deployed; links opening the app need
  Associated Domains and a URL type in Xcode (`noodle-ios/README.md`).
- **Pro badges and tries (shipped, `propreview_test.js`):** an amber sparkle marks every Pro option for free users. Free users try Pro sounds,
  song effects, track effects, backing vocals and chord styles: heard on the part (which starts looping), never saved, undone or exported
  (the song is written through `pvKeep`, which uses each track's `_pvOrig` values and drops `_pvTemp` tracks), put back when the menu or
  editor closes, with a "Get Pro" note. Low pass and High pass are now fully editable for free.
- **Brushes kit (Pro, proposed):** Karoryfer Swirly Drums (CC0), a kit played with brushes: 4 of each drum's 10-22 velocity layers, snare top+bottom
  and kick beater+reso mixed, 1.8 MB. Each drum levelled to the Rock kit's (first 0.25 s, peak at most +3 dB, at most +18 dB: brushed toms stay
  about 6 dB softer). `build_samples.py` gained `flat` (mics as file-name suffixes) and `keep` (layers kept).
- **Backing vocals with no key (Chromatic):** the voices follow the chords playing at that moment (nearest chord note 3-7 semitones away),
  else a major third. `harm_test.js`: sung A over an F chord gives C above and F below.
- **Invites + DeviceCheck:** with the service's DeviceCheck secrets set, a join needs a token from a real iPhone running Noodle, and each
  iPhone joins once ever (Apple keeps one bit per device). Tested with a mocked Apple endpoint (`noodle-api/test`).

## Round 6 (19 Nov 2026): presets, simpler menus, beats
- **Presets (`presets_test.js`):** vocal presets (style, every knob, backing vocals), track-effect presets and your own drum kits (each drum
  from any kit: `slot.kit`, plus taught noises), saved in `noodle.presets` on the phone, carried by "Back up all songs" / song files (not by
  song links), offered under "Mine" in every song; Edit renames and deletes. Free; a preset with Pro parts is tried by free users.
- **Track menus:** basics first (sound, pitch correction and backing vocals on vocals, fills on drums, volume, chords / duplicate / delete),
  everything else under **More settings** (remembered). **Key-only piano roll** (`keyroll_test.js`): with a key, the note editor shows only
  the key's notes (plus notes already outside it); "+ All notes" shows all 12. **Drums** is the one percussion track to add; old single-drum
  tracks still work and can become a kit.
- **Beats (`beats_test.js`):** 12 beats in 6 styles (one free per style), drums with fills, bass on the chord roots, chords (plus a pad or
  arp), swing, master drive / punch / reverb, and Song FX sweeps; Pro beats add track effects and Pro song effects. Tapping one plays it in the
  song as a try (`_pvTemp` tracks; a fresh song also tries the beat's tempo, key and feel through `S._pvOrig`); "Use this beat" keeps it.
  In a song with a key, the beat follows that key and tempo. Mix levels: -7 to -15 dB RMS, peaks under 0 dBFS.

## Round 7 (19 Nov 2026): pre-processing, note rules, a melody model, Tidy
Owner's 31 guided takes, edits per 10 notes (today 3.88):
- **De-plosive (shipped):** high-pass 150 Hz on the signal used to find note starts only (melody parts, not bass): 3.82 (90 Hz: 3.84).
  On 350 other recordings (HumTrans, Vocadito, VocalSet; `sweep.js` + `sweep_score.py`) key-free note F1 is unchanged (0.493 both).
- **De-esser (not shipped):** low-pass 4 kHz or 2.5 kHz on the same signal: 3.88, no change. Both together: 3.86.
- **Dropping / joining short notes in the reader (not shipped):** 80 ms 3.88, 120 ms 3.90.
- **Rules on the output MIDI (`tidy_exp.py`):** join recorded one-step blips into the note before 3.82 (fewer extra notes, more missed
  fast ones); starts onto the 8th grid 3.86; both 3.82; drop one-step notes 3.84; anything two steps or longer 5.2+; phrase ends moved to
  the home chord 4.14. Shipped as the editor's **Tidy** button (join + grid + fill gaps, recorded notes only, undoable), not automatic.
- **Melody model choosing among readings (not shipped, `mus_rerank.py`):** trigram over scale degree, interval and beat strength from
  public-domain folk tunes (abc-collection, guide tunes removed). Chooses among the decoder's top readings: cross-validated by tune 4.44
  (no beat strength) and 4.78 (with), against 4.12 for the decoder alone: worse, like the earlier folk judge. A general "what melodies do"
  model doesn't pick the melody this person meant. Large pop melody sets (Lakh MIDI, POP909) are transcriptions of copyrighted songs:
  not used. The way forward is learning from people's own fixes (already logged with shared takes) once there are enough.
- **Musical mode (testing; a switch in More, only in builds run from Xcode; `musical.js`, `musical_test.js`):** the owner's direction: since
  Noodle can't know exactly what was meant, make the first version sound better rather than closer to the audio. After a melody take is
  read: blips go, starts move to the 8th grid, phrases run legato, strong-beat and long notes move (at most 2 semitones) to the chord there,
  lone octave slips are fixed, phrases end on chord notes and the last note on the home chord, velocity follows the beat. The take as heard is
  kept; the note editor's "As heard / Musical" button swaps them. Owner's 31 takes (`MUSICAL=1 node replay_fast.js`, `mus_metrics.py`):
  starts on the 8th grid 79% -> 89%, strong-beat notes on chord notes 74% -> 88%, one-step blips 40 -> 2; edits to the meant tune 3.82 -> 4.04.

## Round 8: Musical mode learned from data (`musical_train/`, `musical.json`)
Owner's direction: "primarily data driven", combined with music-theory rules. ~42,000 public-domain/CC0 songs (PDMX no-license-conflict
subset + folk tunes, 6.4M melody notes; tunes matching the guides removed). Copyrighted pop sets (Lakh, POP909, Hooktheory) not used.
- **What the data can and can't do:** a melody model has ~6.9 choices' worth of surprise per note (2.79 bits; more context than 2 notes
  doesn't help). On held-out songs with the reader's error pattern added (31% of notes off by a step), no setting restores more notes
  than doing nothing (0.689 noisy, best 0.687). So the data can't recover what was meant; it can make the result sound like real music.
- **Decoder (shipped in Musical mode):** blips go and starts may move a step to where real melodies start notes; legato phrases (rule);
  each pitch stays or moves to a key note within 2 semitones or an octave, weighing the reader's error pattern, the interval model, chord
  fit by beat strength and length, and phrase/last-note degrees (data), keeping the melody's ups and downs (rule). Push weight 2.5.
- Owner's 31 takes (Python reference / app):
  | | edits per 10 | surprise bits/note (lower = more like real melodies) | 8th grid | strong beats on chord notes* |
  |---|---|---|---|---|
  | as heard | 3.82 | 2.76 | 79% | 74% |
  | hand rules (round 7) | 4.04 | 2.69 | 89% | 88% |
  | data, weight 2 | 3.68 | 2.43 | 100% | - |
  | data, weight 2.5 (app) | 3.92 | 2.45 | 100% | 79% |
  *`mus_metrics.py`. Real melodies put ~80% of downbeat notes on chord notes (accompanied PDMX scores); the hand rules forced more.
- Without `musical.json` (offline before it first loaded) the round-7 hand rules run. `musical_test.js` checks both.
- **Update (owner):** every PDMX genre included (pop, rock, soundtrack etc. are in the CC0/public-domain no-conflict subset): 45,186
  songs, 7.2M notes. Weight 2.5 on the 31 takes (Python reference): edits 3.92 (same), surprise 2.33 (was 2.36), strong beats on chord
  notes 92% (was 90%). **Musical mode is now standard for everyone** (no switch); the editor's As heard / Musical button shows on parts
  that have a heard version. `replay_fast.js` measures the reader alone unless `MUSICAL=1`, so the suite's 3.82 is unchanged.

## Round 9: calmer menus (owner: too busy for a beginner)
- Track menu: Instrument › and Sound › (Style for vocals, Kit for drums) are rows that open a list; the list stays open and the part loops
  so each tap is heard (Pro sounds tried as before); Done goes back. "Mine" presets live at the top of that list.
- Sentences under sliders became ⓘ buttons (pitch correction, backing vocals, expression, effects, your kit, key).
- Add chords, Save as preset (vocal / effects / kit), Duplicate and Delete moved under ••• next to the name.
- Choices with 2-4 options stay as buttons (fills, chords every bar / half bar). Shorter text on Song FX, chords and beats sheets.
- Lead menu went from about three screens to one (instrument, sound, volume, More settings).
- **Round 9b (owner feedback):** the timeline no longer rubber-bands (overscroll none; the iPhone shell turns off bounce), so the
  track headers, top and bottom bars stay put as a frame. Dropdowns look like DAW combo boxes (outlined, inset, value + chevron in its own
  segment), for the Instrument / Sound rows and every select. Type: Barlow for the app, Barlow Semi Condensed for titles, labels and
  numbers (tabular figures; no monospace, no tracked uppercase labels); Unbounded stays for the Noodle logo only. More page: grouped
  cards, one line per row, ⓘ for sharing and crash-report details.

## Round 10 (owner review)
- Songs, not projects, everywhere in the app. "Save song file" is "Back up this song". Deleting asks with two buttons (Keep it, Delete song).
- Track ••• menu: "Save vocals / effects / kit as a preset"; no "Add chords to this melody" on chord tracks (Keys, Pad, Arp).
- Key sheet: Key and Scale open lists (common scales first, then More scales; "Chromatic (no snapping)"). Snap strength removed
  (takes keep snapping fully to the scale; Chromatic covers no snapping).
- Note and drum editors: a bar ruler above the grid; tap or drag it to set where play starts (marker plus a line through the grid). The
  bar under the grid is gone, and the bar numbers inside the grid moved to the ruler. Drum row names in plain case.
- Track headers: R (outlined; red when armed) instead of a second record button. The big record button shows the armed track's name.
- Sections are marked on the timeline: Mark a section (Sections menu) shows a band with a handle at each end (whole bars), the name chips
  and Done / Exit in place of BPM / KEY / SNAP; the rest of the song dims; an overlap turns red and Done reads Replace; Done stays in the
  mode for the next one. Tapping a section's name on the ruler: rename, loop, duplicate, move or resize, remove.
- Shorter help text in the editors and the Another version sheet.

## Felt metronome (`haptic_test.js`)
Named **Silent metronome** (Mic and timing, with ⓘ). In the iPhone app, a take's count-in clicks and the phone buzzes every beat (stronger on each bar's first beat); when recording starts
the click goes silent and only the buzz continues, so no click is recorded. The beats are scheduled ahead on the Taptic Engine (Core
Haptics) from one message, so timing doesn't depend on the page's timers; the audio session allows haptics while recording. A switch in
Mic and timing (on by default, shown only in the app). The web keeps the audible click.
- **Fix (owner: buzz about a beat late):** starting the phone's vibration engine took time that wasn't counted, so every buzz landed
  late by the start-up time. Now the engine starts when record is pressed (metroWarm), and the iPhone app measures the time since the
  message arrived and takes it off (beats already past are skipped). Audio output delay added to the buzz is capped at 0.15 s.

## Tap notes (A/B test, `tapnotes_test.js`)
The owner's rules (mock-up: claude.ai artifact "Noodle Tap Notes"): a tap starts a new note with a new attack, even on a held pitch (a tap
within 0.12 s of a note's start is its start; taps in silence are ignored; your usual lateness is learned once there are 3+ taps); your
voice stopping, or a loudness dip of 8 dB+ inside a sung stretch ("da-da-da"), starts a new note; pitch moving while you keep singing
with no tap and no dip joins notes (legato: one sound changing pitch, no new attack) on Lead and Bass, while Keys, Pad and Arp keep an
attack per note; a note ends when the voice stops or at the next start. Musical mode never drops or merges a tapped note (it may move it
to the grid). Exported MIDI overlaps joined notes slightly so a DAW's legato mode ties them. Taps don't buzz. The tap pad is huge
(about half the screen) and says "Tap for a new note".
A/B: every melody take keeps both readings while the song is open; More > Tap notes (test) (Xcode builds) picks which new takes use, and
the note editor's Today / Tap notes button flips one take between them. The finger's tap sound: the reader only makes notes from voiced
(pitched) sound, and a tap's thud isn't pitched, so it doesn't make notes or change pitch; no extra filtering added.
- **Joined notes in the note editor (testing):** a thin dashed line runs from where a note ends to the start of the note joined to it.
  Selecting a note that touches the one before shows Join / Joined (link icon) in the note bar to join it or break it; moving a joined
  note so a gap opens breaks the join. Lead and Bass, Xcode builds.

## Round 11 (owner review of More)
- Invites: Invite friends is for sharing your own invite (one Share button, native share sheet); someone else's code has its own row,
  Enter an invite code. Opening a friend's invite link fills the code in on its own; typing it is the fallback.
- Noodle Pro sheet: five cards (Sounds, Your voice, Effects, Beats and chords, Export and share) with example chips, then Unlock Pro,
  "One-time purchase" and an outlined Restore purchase button. "Pay once, keep it" removed.
- ⓘ: a bubble pointing at the button instead of a message at the top of the screen.
- Text-only buttons fixed: Restore purchase, menu actions (Rename, Duplicate, Back up this song, the section menu) are outlined rows,
  the Sections button in the ruler and the presets' Edit have edges.
- Help and contact (and other email, phone and App Store links) open their own app; before, the iPhone app tried to load the email
  link itself, failed, and reopened on a blank song. Privacy and other new-window links to our own site now open in Safari
  (the app used to ignore them).

## Round 12 (owner review in TestFlight)
- Noodle Pro sheet: Unlock Pro and "One-time purchase" are pinned to the bottom of the sheet, so the buy button shows straight away
  and stays put while the cards scroll under it. Restore purchase (outlined) moved to the end of the scrolling part.
- More: Email news joined the top group (Pro, invites). The "Help Noodle get better" heading now sits above Teach Noodle your voice.
- Mic sensitivity has an ⓘ: how quiet a sound can be and still count as a note or hit.
- Example song uses the owner's settings: Bass Pluck (volume 72, octave -2, reverb 15), Lead Bell (37, +1, 43), Keys Piano (54,
  triad chords, octave 0, reverb 32).
- Invite friends said "Couldn't reach Noodle's server": the live takes service is older than the invite code (`/v1/invites/mine` is 404).
  Fixed by deploying `noodle-api/` (see its README); no app change needed.
- `yv_ui_test.js` skips (passes with a "skipped" line) when the owner's guided takes aren't in `data/user`, like the replay does; it used
  to crash, which failed the whole suite in any fresh cloud session.

## Round 13 (usage stats)
- Anonymous usage counts (`track()` in `js/takes.js`) to the takes service's `POST /v1/events` (Workers Analytics Engine): first open, first
  take, first song with 2+ parts, first export and share; a daily open with days since first open (return rates); takes by part type; exports
  by kind; song links; part types and sounds in finished songs; session totals (takes, edits, minutes); Pro sheet, Pro tries, buy, result, restore.
  No install id, no song content. Batched every 30 s or when the app goes to the background, at most 300 a day from one phone.
- More: Send usage stats (ⓘ), on by default like crash reports; turning it off drops anything waiting.
- `stats_test.js`: nothing leaves localhost; first-time events count once; no song name or install id in what is sent; the switch stops sending.

## Round 14 (usage-stats ID)
- Each usage-stats batch carries a random ID made on the phone only for stats (`statsId()` in `js/takes.js`), separate from the takes,
  song-link and invite ID. Turning Send usage stats off deletes it; turning it on again makes a new one. ⓘ text says so.
- Takes service: the ID is blob 6 (only if well formed); `PUT/GET /v1/admin/stats-exclude` keeps the owner's phones out of every number;
  the stats route adds each phone's events (first and last seen) for per-phone paths. Dashboard: a Phones tile and table.
- Privacy policy (effective 22 November 2026), privacy manifest (Device ID: Analytics added) and App Store answers updated together.
- `stats_test.js`: the ID is sent, is one per phone, isn't the takes/links ID, and is deleted when the switch is turned off.

## Round 15 (owner review, 22 November)
- **Pro sheet kept opening (Edit, opening a song, Rename, More not scrolling):** after a Pro preview, the "… is Pro. Get Pro to keep it."
  note faded out but still caught taps (`.toast.act` kept `pointer-events:auto`), so an invisible box over the timeline or song list
  opened the Pro sheet. Any other note (Duplicate's) cleared it. Now a hidden note never takes taps (`toastOff`), and tapping the
  visible one still opens the sheet.
- Pro preview text: "Previewing Horns. Add to your song with Pro." ⓘ texts say "Free to preview while this menu is open."
- Sound FX: a new effect starts at volume 40 (was 80); recorded ones top out at 50; the example song's Sweep down is 40, its Riser 25.
- Tapping the empty space under the tracks deselects the part or the empty spot (the dotted new-part outline).
- One Loop button: with a part selected it loops that part (again: loop off); with nothing selected the whole song. The clip bar's
  own Loop button is gone. Looping the whole song shows the yellow band over all of it; tapping a part's band goes back to the whole
  song, tapping the whole song's band stops looping.
- Delete track: a red trash button next to ••• in the track sheet (Undo brings it back); removed from the ••• menu.
- Drum fills moved from the track sheet to the drum editor, per part (Off / Every 4 bars / Every 8 bars; the options a part is too
  short for are greyed out). Fills were already stored per part; the sheet used to set all of a track's parts at once.
- **Metronome buzz late (again):** the app counted from when the message arrived, but the trip from the page to the app is slow right
  as recording starts (the audio switches to recording then), so every buzz was late by that trip. The page now sends its clock time
  (`sentMs`) and when the click is really heard (`getOutputTimestamp`, output delay included); the app takes off everything since then
  and sends each tap 15 ms early for the Taptic Engine's own delay. Buzz timing (Mic and timing, iPhone app only) moves it by
  -150 to +150 ms if it is still off. Not checked on a phone here: needs a new iPhone build.
- Tests: `section_test` (one Loop button, whole-song band, tap empty space), `fills_test` (fills in the drum editor, per part),
  `haptic_test` (sentMs, Buzz timing).

## Round 16 (owner review, 24 Nov)
- Example song: opens with Loop on (the song carries `loopOn`; other songs open with Loop off) and has a noise sweep up in bar 2 at 30, with the
  riser. An example made before this keeps its old setup; make a new one from the Songs list to see it.
- Risers and downlifters sit an octave higher (every song, old ones too, as the owner chose) and have an Octave stepper (−2 to +2) in the
  Transitions editor when one is selected.
- Bar numbers: the Transitions editor has the note and drum editors' ruler (the song's bars; tap or drag to move the playhead). The Mix
  effects editor's labels count the song's bars too (they counted from the region's start). Vocals have no editor, so nothing to add.
- The dotted outline for a new part has handles (as a selected part has): drag the right one for length, the left one for the start,
  stopping at the parts on either side and snapping like everything else. New part uses that size.
- Names: Sound FX → Transitions, Song FX → Mix effects, Add track's "Ear candy" → "FX".
- Track names follow the pick (`s2Auto`): picking a sound, kit, vocal style or preset, or a Mix effect, marks the track `picked`; it then
  shows "Bell", "Phaser", "Punchy kit", "Pop vocals". A typed name wins and is never changed; a track whose parts differ shows its type
  ("Mix effects"); two with the same name are numbered. Older songs keep type names until something is picked. The example's tracks are
  named after their sounds (owner): Punchy kit, Pluck, Bell, Piano; Transitions keeps its type name (it has no sound to pick).
- **Bitcrusher:** it did reach every track (everything goes through the main mix before Mix effects), but it only rounded loudness: at
  low bit depths quiet parts fell to silence while loud ones fuzzed, and above about 8 bits nothing changed (the right half of the
  slider). Now an AudioWorklet also lowers the sample rate (the lo-fi grit; loaded from a Blob like the recorder, so it works offline,
  and before a mix render); Bit depth runs 2–8 and Sample rate 1,000–12,000 Hz. Without worklets it falls back to the old rounding.
- **Vinyl brake:** the prototype's design only lowered the pitch while its curve was rising (about 7% for a full rise over 2 bars), played
  at normal speed while flat (just muffled, quieter and a third of a second late), sped up while falling, and depended on seconds rather
  than bars. Now the curve is how far the record has slowed (100% = stopped): a delay that grows by the curve's value every second plays
  the song at 1 − that speed, so flat at 50% is half speed throughout and 100% is a stop (silent); darker and quieter as it slows; in step
  with the tempo. At the region's end the built-up lag is dropped behind a 20 ms dip, so the song is always back on the beat.
- Settings with whole-number steps show whole numbers ("4 bit").
- Tests: `round16_test.js` (names, handles, Octave, example song, ruler, renames), `mfx_brake_test.js` (half speed at 50%, silent when
  stopped, back on pitch and in time after the region; the crusher holds samples at the set rate). `fx_ab_test.js` no longer compares
  Bitcrusher and Vinyl brake with the prototype (changed on purpose).

## Round 17 (owner review, 25 Nov; start of the final UI pass)
- Transitions: the selected effect has a dot in its middle; drag it up or down to bend its loudness (e.b, −1..1: the middle up to twice as loud
  or silent, the ends unchanged; snaps back to straight near the middle). The drawn shape bends with it, in the editor and on the timeline.
- First open: the share-takes question moved to right after the first kept take (asked once; Not now is fine). The welcome screen marks the DAW pack Pro.
- Light mode is a real light theme: near-white page, white cards, a light tab bar, the voice card light too; the strip behind the status bar
  follows the theme (it was dark, so the clock was unreadable in light mode); the app's loading background matches.
- Copy: Noodle refers to itself as "Noodle", not "I"; no "Let's", "Nice." or exclamation marks.
- Terms of use (draft for the owner, `noodle/terms/`): agreed to once before a first song link ("Agree and make the link"), a row in More.
  Apple's guideline 1.2 covers songs from other people opened in the app, even though they arrive by text; App Review note written.
- Takes service: reported songs list, take down / restore, optional report email (round 16 follow-up; deploy by hand).
- Tests: `onboard_test` now checks the share question comes after the first kept take, once.
- Reports (owner): the first report hides a song at once (Apple asks reports be acted on within 24 hours); the owner reviews within 2 working
  days and restores or removes it. Terms, privacy policy, support page, the in-app report sheet and the App Review note say so.
- Support emails open with the subject "Noodle support" (people can still edit it; a dedicated address is on the roadmap for the owner).
- Tests that tap Keep mark the share-takes question as answered (`noodle.shareAsk`), as they do the other first-run questions.

## Round 18 (UI pass: recording, editors, sheets, error states)
- Buttons that looked like text: "Start from a beat" (new song) and "Tap the beat" (Tempo) are outlined again (`.s2 button` reset the
  outline in the Studio; `.mfx-btn` used Studio-only colours, so it had no edge in sheets).
- ⓘ works in every sheet (one handler on the sheet). Mix: ⓘ for Reverb, Drive and Punch. Tempo: "Count-in chord" (ⓘ) instead of a
  sentence as the checkbox label.
- The track sheet's name field shows the track's name as it appears on the timeline ("Bell"), not its type ("Lead").
- Microphone refused: a sheet, "Noodle can't hear you": in the iPhone app, Open Settings (the app opens Noodle's page in Settings) and
  Import a recording; on the web, how to allow it in the browser. Recording again explains again (it used to switch quietly to import).
- A song link opened offline says to check the connection; only a deleted one says it isn't available any more.
- Tests: `errors_test.js` (mic refused in the app and on the web, offline vs. deleted link).
- Screen sizes: iPhone SE (375 × 667) and Pro Max (430 × 932): Studio, track sheet, drum and Transitions editors, Pro sheet and More all fit.
  (Playwright's "iPhone SE" preset is the 320 pt first generation, which current iOS doesn't run on.)
- VoiceOver: every visible control on the main screens has a name; ⓘ buttons now read their explanation instead of "About this".
- Larger text (Dynamic Type) isn't followed yet; left for the owner to decide (roadmap).

## Round 19 (security review before launch)
- No paid-service keys anywhere in the app, the site or the git history (searched all commits); secrets live in Cloudflare only.
- Takes service: reads limited to 240 a minute per address (writes stay at 40; the invite-code call counts as a write; admin calls are
  limited too); daily storage budgets for new song links (150 MB, preview room included) and take audio (150 MB); previews 1.5 MB at
  most; invite joins refused (503) until DeviceCheck is set up, so made-up phones can't collect Pro codes. The app keeps a code that got
  503 and says "Invite saved. It counts once invites open."
- Tests: `songlink_hostile_test.js` (a song link with HTML in every text field the app shows: nothing runs, it shows as text); service
  tests for the budgets, read limit and closed invites.

## Round 20 (app-side security fixes, alerts)
- The website no longer trusts a saved Pro flag (`noodle.pro`) or a `window.noodlePro(...)` call from the console: only the iPhone app
  reports purchases. Local test runs (localhost) keep the flag so the Pro tests work.
- iPhone app: the microphone is granted without asking only to the bundled page and the live site under `/arcade/noodle/` (it was any
  page on troyskinner3.github.io). Not compiled here (no Swift on Linux): check in Xcode.
- Importing a song file: parts with an unknown instrument, or notes / hits / effects that aren't lists, are left out; number settings
  that are missing or not numbers get the defaults. A broken or hostile file used to cause a page error on every open (and missing
  volumes broke the audio).
- Alerts: `.github/workflows/noodle-health.yml` (service up every 30 minutes; crash reports and reported songs daily, with the
  NOODLE_ADMIN_KEY secret). Tried against the live service from here.
- Tests: `errors_test.js` now also checks a broken song file and Pro on a non-local host.

## Takes service hardening (25 Nov, security session)
- Service only (`noodle-api/`): audio must be exactly the WAV the app writes (checked against the app's own takes at 48, 44.1 and 16 kHz
  and a 35 s preview, 1.29 MB); `nosniff` on every reply; report emails only on a song's first report (30 a day at most); reports stop
  being stored after 10; a Pro code handed out is marked and never handed out again; `GET /v1/admin/usage` storage meter.
- `invite_test.js` uploads a new offer code each run (the service now refuses a code it already handed out, so reruns against the same
  local service failed).

## Takes kept 1 year (25 Nov, security session)
- The takes service keeps shared takes 1 year instead of 3 (owner's decision); the privacy policy says so. A take stored under the old
  rule and sent again after its year is up is deleted (410), since storage refuses an expiry in the past; the app drops it on any 4xx.
- Health workflow: a daily storage check (`GET /v1/admin/usage`, alert above 700 MB of the free 1 GB), the security session's suggestion.

## Round 21 (owner's TestFlight review, 25 Nov)
- Recording: the song plays about 4 dB quieter during a take (less bleed without headphones); back to normal after.
- Transitions: a short hiss (under 0.28 s) that clearly darkens (brightness falls by 20 %+) is a sweep down; only one that stays bright is an
  impact. Checked on the owner's 5 shared Transitions takes: their 24 Nov downsweep now reads as a sweep down.
- Drum kit: a Crash slot (a bright hit ringing 0.35 s or more: a long “k-shhh”), for new kits and, once, existing ones. A new hit
  measure (`tail`, up to 1 s) leaves the old `dur` alone, so kick / snare / hat sorting is unchanged.
- Takes: when a take ends, the playhead waits at its start (Keep leaves it there); Discard puts it back where it was; Retake counts in from
  the take's start. A song opens with the playhead at the start.
- Leaving the Studio with a message up no longer stretches it from top to bottom on the Songs screen.
- Felt metronome: no extra tap on the first beat (the record-start tap landed with it: two buzzes at once); Buzz timing defaults to −15 ms.
- Mix effects: a new track comes with the new-part outline at the playhead's bar. A free user previewing a Pro effect sees one line,
  "Previewing a Pro effect", with Get Pro.
- Bitcrusher silence: the app made its audio context in a second place at start that skipped the crusher's worklet (so the iPhone used
  the old crusher) and had no recovery. Now one setup path; the worklet can't throw or output a bad number; a watchdog resumes paused
  audio and rebuilds the mix if its output stops being numbers. The cause on the iPhone isn't proven: owner to retest.
- Vinyl brake: back on the beat as soon as the curve returns to 0%, with a quick speed-up (at most 0.6 s); More settings → Catching up →
  Jump cuts instead. The Mix effects editor has a More settings disclosure for settings few people need.
- Transitions bend: the drawn shape keeps its ends; only the middle moves (the shape used to be scaled down as a whole).
- Tests: `round21_test.js` (crash, kit migration, playhead, outline, Pro line, bend ends, message height); `mfx_brake_test` (catch-up both
  ways); `errors_test` (watchdog); `haptic_test` (default nudge, no start tap).

## Round 22 (progressive disclosure pass, owner-approved 25 Nov)
- First run: Get started goes straight to the Studio. Email news is asked once, back on the Songs list after the first finished song
  (exported or shared by link); Teach Noodle your voice is offered once after the third kept take (sharing takes stays on the first).
- Mic and timing: Hear the song while recording and Silent metronome; Fix late notes, Mic sensitivity, Auto mic delay, Buzz timing, Tap
  pad and Echo cancellation under More settings.
- Mix effects: every effect's own settings under More settings, renamed Speed, Tone, Echo length, Repeats (Ring mod: Tone).
- Share: Audio, Video, Link to remix, then the DAW pack.
- Transitions: a selected effect shows Volume; Left / right and Octave under More settings.
- Note editor: Musical / As heard moved from the bottom bar to a ••• in the editor's top bar (shown only when the part has both).
- The More settings state is one shared, remembered switch (`s2.more`), as in the track menus.
- Tests updated: onboard_test (first run, email and voice asks), s2_rest / recsheet_cal (Mic and timing), mfx_ui_test (settings hidden
  first, new names), fxgrid_test / round16_test (left / right and octave), musical_test (the ••• menu).

## Round 23 (Finish song)
- A Finish song button next to + Add track, shown only while a song with something in it is missing a part. One tap adds what's missing:
  drums, bass, chords (keys or pad), a melody (an arp playing the chords), transitions (a downsweep at each 4-bar phrase's start, a riser
  into the next) and a mix effect (a gentle low-pass dip into the loop). Patterns and sounds come from a free beat near the song's tempo,
  in the song's key (a song with no key yet takes the beat's). Chords follow the song's own melody (`harmonize`), the bass follows the
  chords (the beat's bass rhythm on each chord's root). Free sounds only. One save, so one Undo takes it all out; after Undo, tapping again
  picks another combination. The song then plays from the top.
- Not counted in usage stats yet (the takes service only accepts listed events; adding one is the security session's area).
- Tests: `finish_test.js` (drums only; melody only; in key; free sounds; one Undo; button only while something's missing; not silent).
- Lead melodies (owner: "not too basic / computer generated"): `genMelody` samples from Musical mode's tables (onsets by position, next
  interval by degree / beat / previous move, chord-tone odds, phrase and song endings), in scale degrees, as a 2-bar call and an answer with
  the same rhythm that starts like it; phrase ends land on the chord under them. Finish song uses it 70 % of the time when a melody is
  missing (an arp otherwise, or when the tables can't load). With nothing pitched yet, Finish song sets the song's key from the beat (it
  used to stay "auto" and be re-guessed after, so a melody could fall outside it). Over 40 melodies in A minor on Am F C G: all in key
  and range, answers repeat the call's rhythm, 100 % end on a chord tone, 86 % chord tones on strong beats, 87 % small steps, all different.

## Round 24 (chords and bass learned from real songs, with their rhythm)
- `noodle/harmony.json` (~18 KB) from 15,247 public-domain / CC0 songs in 4/4 (PDMX; modern genres weighted x3, classical x0.5):
  160 four-bar progressions per mode with their harmonic rhythm (e.g. i for 2 bars then bVI, or vi IV I V a bar each, or a chord change on
  beat 3), 140 one-bar bass patterns (rhythm plus each note's interval to the chord: root, fifth, third, octave, passing notes), 80 comping
  rhythms. Tools: `eval/musical_train/extract_harm.py`, `train_harm.py`.
- Finish song: with no melody, chords are a learned progression (3+ chords favoured, picks spread across the list); keys strike in a learned
  comping rhythm, pads hold; the bass is a learned pattern on the chords (a second pattern on each phrase's 4th bar; a chord change always
  lands on its root). Chords from a melody still follow the melody.
- Bug fixed: Finish song asked for chords from the melody once per 16th step (64 tiny chords per 4 bars) instead of once a bar.
- Offline: harmony.json is in the offline cache (service worker v5) and the iPhone copy. Credits: PDMX now also named for Finish song.
- Tests: `finish_test` checks at most 2 chord changes a bar, bass in key landing on chord roots, and 30 progressions (27 distinct, 3.3
  chords, 24 with their own rhythm, 3.3 bass notes a bar).

## Round 25 (Draw notes)
- The note editor (melody parts) has Draw next to + All notes. With it on, a finger draws instead of scrolling: the line shows as you
  go, and on lifting it becomes notes (`strokeNotes`): each 16th step takes the row the line mostly sits in (the rows are the key's notes,
  or all 12 with + All notes); a new pitch counts when the line stays on it two steps or jumps two rows or more (no wobble notes); steps
  on one pitch join; one-step scraps join a neighbour. The new notes replace what was under the line; one Undo takes them back. Draw
  turns amber when on and off when you leave the editor.
- Draw sits in the row above the grid, not the bottom bar (on an iPhone 13 the bottom bar had no room left).
- Tests: `draw_test.js` (flat, climbing, wobbly and scrappy lines; drawing in the editor replaces only the stretch drawn, in key; Undo;
  off after leaving; not on drums).

## Round 26 (Chord pads and Tap a rhythm)
- Add track has a new group, Tap it in, with Chord pads and Tap a rhythm (not on the "What are you recording?" sheet). Each opens a
  full-screen pad over the Studio. Record gives four count-in clicks, then the song plays for 4 bars from the playhead's bar (the song
  grows to fit) with the metronome, and the felt metronome in the iPhone app. Taps are timed against what you hear (output delay and how long
  ago the finger landed are taken off).
- Chord pads: the key's six chords (the diminished one left off), e.g. C Dm Em F G Am or Am C Dm Em F G. Each tap plays the chord and starts
  it in the part on the nearest 8th, held until the next tap. Keys sound, chords follow the key like any chord part.
- Tap a rhythm: one big pad. Taps on the nearest 16th are the rhythm; `genMelody` has a new `onsets` option that keeps them exactly and
  picks the notes (the answer phrase copies the call's start only when its rhythm matches). It fits the song's chords under the part, else a
  progression from harmony.json. Other notes keeps the rhythm and picks again.
- After a take: it plays once (the top-right button plays it again), then Keep, Tap again, and for rhythms Other notes. Nothing is added
  until Keep, so one Undo takes the part out; leaving or Stop puts the song's length and key back. A song with nothing pitched gets its key
  set when the pads open, so the chords don't change once notes arrive.
- Style check (iPhone 13, dark and light): the filled Record/Keep lost their fill to the Studio's button reset at first (fixed: amber fill);
  hints cut to one line; the count-in reads "Get ready · 3" in larger type.
- Drum pads (owner asked for the drum version): one pad per sound in the song's kit (up to 8; the last of an odd number spans the row),
  in the kit's sound (the song's drum kit, else the default; free only). Taps land on the nearest 16th, one hit per drum per step. Add more
  plays the take back while you tap another layer (kick and snare first, then hats); Stop during Add more goes back to the take you had.
  The header shows the tempo instead of the key; the song's key is left alone.
- Tests: `tapin_test.js` (sheet; drum pads, a timed take, Add more layering and Stop; pads in C major and A minor; a real timed take into chords on 8ths; Keep is one Undo; Stop and leaving add
  nothing and restore; a tapped rhythm keeps its exact steps, in key; Other notes; the model with 40 random tapped rhythms).

## Round 27 (Note pads, Play pad, Draw chords, Continue this)
- Note pads (Add track → Tap it in): the key's notes over an octave (8 pads in a 7-note key, 6 in pentatonic), low half on the bottom row.
  Taps land on the nearest 16th and last until the next tap (at most 2 beats); two pads at once make a chord. Add more records another line
  over the first. The pads sound the song's lead sound (else Bell; free only).
- Play pad (Tap it in): one big square. Across: the key's notes over two octaves (snapped; the home note's column shaded, names along the
  bottom). Up: brighter (a live low-pass while you play). In a take each note keeps where it started and ended and how bright it was: notes
  have a new optional field `tn` (0..1) that the render uses as that note's tone. Quick taps are a 16th; a slide's passing notes shorter
  than a 16th give their step to the next. Range, snap off and an arpeggio mode are on the roadmap under More settings.
- Draw chords: a drawn line now replaces only the notes it runs close to (within 2 semitones while they overlap), and what sticks out of
  the line stays (it used to remove whole notes). A line above or below adds a second voice; the first time, a message says how to redo.
- Continue this (note editor •••, shown for melody and chord parts up to 4 bars): four times as long: the part, a variation (second half
  new notes, same rhythm), an answer (same rhythm, new notes from the melody model fitted to the chords there) and the part ending on the
  home note. Chord parts repeat and end on the home chord. Less room before the next part: 3 copies (part, answer, ending) or 2. One Undo.
- Style check (iPhone 13, dark and light): the Play pad's canvas read colours from the page root at first (dark colours in light mode); it
  reads the Studio's own now.
- Tests: `tapin_test.js` (Note pads: names, rows, a timed take, Add more; Play pad: range, a timed slide with brightness, quick tap, nothing
  left sounding), `draw_test.js` (redo over a line keeps what sticks out; a line above adds a voice), `continue_test.js` (new);
  `musical_test.js` now checks there is no Version choice before a take (the ••• itself shows for Continue this).

## Round 28 (owner's TestFlight notes, 26 Nov: editor and screens)
- No page zoom: `html{touch-action:manipulation}` stops double-tap zoom everywhere; in the iPhone app the page's viewport adds
  `maximum-scale=1,user-scalable=no` and the web view's pinch gesture is off (the website keeps pinch zoom for accessibility).
- Another version: grey (disabled) when the part has no other likely version (`verAvail`: worked out once per state of the notes,
  refreshed 0.4 s after an edit), instead of a message after tapping; it and its ⓘ moved to the right end of the bar.
- Note editor: rows cover C1–C8 (the key's notes, or all 12) as a window that scrolls: swipe the grid up or down (sideways still scrolls
  time) or drag the key column; it opens centred on the part's notes and leaves room under it for the selected note's bar. Dragging a note
  past the top or bottom edge scrolls. Octave − / + under Velocity moves the selected note(s) an octave.
- Both ends of a note drag (front: the start, the end stays; short notes: left 40% / right 60%). Same pitch, no overlap: the note run into
  is pushed later from its front and removed once covered, the one run back into ends where this starts; live while dragging, dragging
  back restores them (`overlapFix` from a snapshot taken at the start of the drag). Different pitches overlap freely.
- Track sheet: More settings is closed every time a sheet opens (it was remembered); inside: Chord (a dropdown opening the list, keys,
  pad and arp), Octave, Brightness (+ Expression on sung takes), Reverb, Left / right; then sections that open in place with a summary:
  Effects ("Off" or what's on; Pro badge and ⓘ beside it), Your kit (drums), Voice (vocals). No single-control headings.
- Sections: a type from a list of 9 (Intro, Verse, Pre-chorus, Chorus, Drop, Bridge, Solo, Breakdown, Outro), from a dropdown in the
  section's sheet and in the marking bar; repeats are numbered on screen (Verse 1, Verse 2); stored as the type.
- Style check (iPhone 13, dark and light): the first version of the scrolling editor filled the screen and hid the selected note's bar;
  the grid now leaves room for it.
- Tests: `editor28_test.js` (new: octave window and both ways of scrolling, octave stepper, front edge, overlap live and restored,
  Another version grey and last, zoom on web and in the app); `draw_test`, `sections_test`, `presets_test`, `tfx_test`, `s2_extras`
  updated; `round3b_test` and `round3c_test` now check the new More settings order (they only printed it before).
- Later in the round (owner): the note preview felt late. A tapped note now sounds as the finger lands (it waited for the lift); the key
  column too. Then: the whole app's sound lagged the picture by about an eighth note on the phone's speaker. The playhead (and the record
  count-in display) now follows `heardNow()`, the moment being heard (Web Audio's output timestamp; else currentTime minus outputLatency),
  not what's being sent out; the pads' tap timing uses the same delay (it assumed at most 0.15 s). The iPhone app asks iOS for a 5 ms audio
  buffer (`setPreferredIOBufferDuration`). Press and hold the position counter to see the delay the phone reports (to check on the next build).
- The scrolling editor first showed only 7 rows on the smallest phone (iPhone SE); rows shrink there (to 20 px) so about 10 fit.
- `corr_test` and `keyroll_test` updated for the scrolling window (the full row lists are compared).

## Round 29 B1 (owner's TestFlight notes, 26 Nov: fixes)
- Mix effects tracks keep an empty R space, so M and S line up with every other track.
- The selected-spot bar: Copy to another song only on a part (it did nothing on an empty spot), with a clearer icon; on an empty spot,
  Paste here appears once something is copied and pastes at that spot (into that track when it's the same kind, else a new track). Pro.
- Share: compact rows (icon, name, a short tag: WAV, Audio + MIDI; Video, Link to remix and DAW pack explain behind ⓘ; the rows line up).
- Usage stats ⓘ: "They're sent with an anonymous ID that isn't linked to you" (was "a random number made only for this").
- Teaching the crash: the take's sounds were all thrown away as metronome bleed (they land on the click, as asked); teaching now uses the
  count-in's click measurement, and without one keeps sounds louder than −30 dB. The result shows on the teaching screen ("Noodle heard…",
  not "I only heard…"). Closing the teaching or Fix late notes screen stops any playback.
- Beats: once a beat is picked, Use this beat (Get Pro to use this beat for a Pro beat) is pinned to the bottom; closing without using one
  puts the playhead back where it was (any preview that started playback does); a free beat is no longer named in the "is Pro" note.
- Buzz timing goes to ±300 ms.
- Sound delay: while stopped (every 5 s, and 0.8 s after coming back to the app) the delay the phone reports is compared with the audio
  context's own start; grown by more than 80 ms (and over 120 ms), a new context replaces it (the song's sound is rebuilt). The hold-the-
  position-counter readout counts restarts.
- Tests: `b1_test.js`, `teachcrash_test.js` (new; the crash take was kept 1 time in 3 before, 5 in 5 after).

## Faster test runs (26 Nov)
- `run.sh` runs scripts 3 at a time (JOBS=3; `--serial` or JOBS=1 for one at a time) and prints how long each took. Scripts that use the
  local takes service or check timing against the clock (taps, the mic, the metronome, render speed) run afterwards one at a time, with
  nothing else running (SOLO list). A script that fails in parallel is moved to SOLO, never retried. Before switching: three full runs in
  parallel all passed (91 scripts, 720-722 s each), against about 30 minutes one at a time.

## Round 29 B2a (owner, 26 Nov: pads are ways to record into a track)
- Record on an instrument track asks once "How do you want to record?" (rows with ⓘ): drums Mic · Drum pads; keys, pad, arp Mic · Chord
  pads · Note pads; lead, bass Mic · Note pads · Tap a rhythm · Play pad. The answer is kept on the track (`rin`); Record with (in the
  track's sheet, under Sound) changes it. Vocals and transitions only use the mic and never ask. Tap it in left Add track.
- The pad screen records into that track: its sound, octave and chord type; from the playhead's bar until Stop (up to 16 bars; a Stop just
  after a bar line ends at that line; the bars any tap landed in are kept). The take is a new part on the track; Keep, Retake, plus Add
  more (drums, notes; it records over the part as long as it is) or Other notes (rhythm). Back discards. No octave change to the track.
- Pads sit where the instrument sounds best (TAP_CENTER, minus the track's octave): a bass's note pads, Play pad and tapped melodies are low.
- Tests: `tapin_test.js` rewritten for the Record flow (the question once, straight in after, Record with, vocals never ask, chord take
  stopped in bar 3, drum layers, bass range, rhythm, Play pad, nothing saved before Keep).
- Recording tests (review1, kitoffer, s2_test, s2_linear, s2_replace, s2_rest) pick Mic at the new question.

## Round 29 B2b (owner, 26 Nov: Finish song by sections; livelier rhythms; modern-genre data)
- Data (`eval/musical_train/train_genre.py`, 2 min): `genre.json` (60 KB) from Chordonomicon (213,588 songs with a genre we map: pop, rock,
  country, hip hop, R&B, Latin, electronic; 4-chord loops per genre, section type and mode, only ones Noodle plays as written), McGill
  Billboard (831 songs in 4/4: where in 4 bars the chord changes, per section type) and Groove MIDI (1,138 performances: 1-bar kick, snare
  and hat patterns and fills per style). Pop verse: I-IV most; pop chorus: I-V-vi-IV most; harmonic rhythm: a chord a bar or every 2 bars.
  Credited in More → Credits (renamed from Sound credits; Groove MIDI and PDMX ask for credit). In the offline cache (noodle-v6) and the
  iPhone app's copy.
- Finish song: the length is where your own parts end (looping parts: the song's length); under 8 bars it grows to 8 (your parts are copied
  to fill; looping ones keep looping); bars after your parts are never filled. Sections: the Sections row's types (gaps count as verses),
  else worked out from which tracks play where (4-bar blocks; sparse first = Intro, sparse last = Outro, fullest = Chorus; all alike: Verse
  and Chorus in turn) and marked on the row; a grown song is Verse then Chorus. Per section, by energy (Intro .3, Verse .55, Pre-chorus .7,
  Chorus/Drop 1, Bridge .6, Solo .8, Breakdown .25, Outro .35): drums from the free beat's pattern (none in a breakdown, hats in an intro,
  half-time bridge, a crash and kicks on each bar in a chorus, a fill in the last half bar before a chorus: learned, else a snare roll);
  chords from your melody there, else a learned loop for the genre (from the beat's style) and section type with a learned harmonic rhythm,
  the same progression for every section of a type, a bridge starting elsewhere; keys comp (held when calm, syncopated grooves often in a
  chorus); bass (none in an intro, held roots in a bridge or outro, a learned line in a verse, locked to the kick or a groove in a chorus);
  the lead hook only in choruses (the same melody each time; verses if there's no chorus), an arp if the melody tables can't load; risers
  and an impact into each chorus, a down-sweep at other section changes; the mix effect opens an intro, closes an outro, else dips the last
  bar of music. One track per instrument, a part per section. One Undo.
- Livelier rhythms: GROOVES (syncopated 1-bar comping and bass patterns: 3+3+2, pushes, the owner's 0-3-10) used next to the learned ones,
  more in high-energy sections.
- Small items: Count-in chord moved from Tempo to Mic and timing → More settings; the timeline draws lines at the snap size when at least 9 px
  apart (merging to beats, then bars only); room above the Mix effect buttons for the Pro badge.
- Tests: `finish_test.js` rewritten (grown drums-only song, the example song, marked sections with a melody, liveliness, genre data, the
  melody model); `b2_test.js` (new).

## Round 29 B3 (owner: more free beats)
- Three free beats, free sounds only: Garage Lights (rock, 122, E minor: Rock kit, 8th hats, a crash every 2 bars, 8th-note rock bass, organ
  power chords), Open Road (country, 100, G major: a train beat, boom-chick piano on the off-beats, bass on 1 and 3, a plucked arp), Dembow
  Nights (reggaeton, 95, A minor: four-on-the-floor kick, the dembow snare and clap on the 4th and 7th 16th of each half bar, an 808 bass and
  key stabs on the dembow). Finish song maps them to rock, country and Latin material (genre.json).
- Tests: `beats_test` counts 15 beats; `b2_test` plays each new beat (sound, free sounds, in key).
- Hardening (before the security session's check): a track's `rin` that isn't one of its record methods asks again (an older or odd song
  file can't open an unknown pad screen); section names are looked up as own keys only (a section named "constructor" counts as a verse).
  `b2_test` checks both.

## Round 30 (security review, 26 Nov: shared songs hit the 8 MB limit)
- `songFilePack`: each recording goes into a song once; a copy of a recorded part (Duplicate, Split, Finish song's sections) points at the
  first one in `takeRefs` (an older build plays those copies silent instead of breaking). Song links carry recordings at 24 kHz (two
  10.5 kHz low-pass stages, then resampled); backups (.noodle) keep the original rate. Opening looks recordings up as own keys only and
  needs real audio (`pcm`); `loadVox` skips a recording without one.
- Measured: 4 copies of a 10 s take: 5.0 MB before, 0.6 MB now. 8 MB holds about 2 minutes of distinct recordings (was about 65 s).
- Tests: `songsize_test.js` (new: one recording plus three references, 24 kHz in a link, 48 kHz in a backup, every copy gets its audio
  back, a hostile takeRefs opens without errors).

## Round 30, beats (owner, 27 Nov)
- Removed: Garage Lights (rock), Open Road (country), Lagos Sun (Afrobeats); the Guitar sound isn't a convincing rock or acoustic guitar, and
  a weak Afrobeats beat risked disrespecting the music. Finish song no longer picks Guitar for a lead.
- Slow Steam (Pro lo-fi, 84, D minor, swing 55: kick and bass on dotted eighths, swung hats, E-piano 7ths on a dotted figure) replaces Paper
  Plane. Dembow Nights: a Pluck bass on dotted eighths (0, 3, 8, 11) with room between notes. New Pro: Silk (R&B, 88, B-flat minor, E-piano
  9ths over a chorus pad, dotted bass) and Neon Dembow (reggaeton, 98, C-sharp minor, EDM kit, off-beat hats, pump pad and a pluck arp).
- Every genre (Trap, Boom bap, Lo-fi, Drill, Pop, R&B, Reggaeton) has one free and one Pro beat; `b2_test` checks it and plays the new ones.

## Round 30, instruments (owner, 27 Nov)
- Recorded, all CC0 (each LICENSE file read): Acoustic guitar (Meta Steel Guitar, free), Nylon guitar (Meta, picked), Clean guitar (FreePats
  FSBS clean), Finger bass (Karoryfer Fashionbass); `samples/build_samples.py` gained channel (`chan`), key-switch (`sw`) and every-Nth-note
  (`every`) options and a bitrate; 5.6 MB in all. Offered on lead, keys and arp (guitars) and bass. Guitar chords strum (13 ms per string).
- Synths, Noodle's own oscillators (types common in modern pop, hip hop and EDM; no presets copied): Glide lead and Whistle lead (slide into
  touching notes), Sine lead, Juno chords (saw and pulse through a chorus), Future chords (wide saws pumping on the beat), Island pluck
  (short mallet-like pluck), Moog bass (two low-pass filters in a row), FM bass. Free: Acoustic guitar, Glide lead, Sine lead, Juno chords,
  Moog bass; the rest Pro.
- Levels measured on the track before the master (the master's limiter hid differences at first): each within 2.5 dB of Piano (keys),
  Saw (leads) or the basses; sine leads 2 dB hotter (a pure tone sounds quieter).
- Envelope (Pro; owner: "Envelope", with Attack, Decay, Sustain and Release, plain words behind each ⓘ): a section in More settings for
  pitched tracks, starting from the sound's own envelope (read by playing the synth silently once; recordings: as recorded), a drawing of
  the shape, Reset; recordings follow it too now. Free users preview it while the sheet is open.
- Tests: `instruments30_test.js` (new).
- Owner's check on the 27 Nov build: sound delay 3 ms on the speaker (the phone reports 0 ms output, 3 ms buffer), still small after switching apps back and forth; metronome and buzz feel right at +50 ms, now the default (`BUZZ_MS`; `haptic_test` checks it).
- Owner's bugs on the same build: (1) a 2-bar lead with its notes in bar 2 played a sudden short pluck when started at bar 1. The ring after
  the last note is folded into the loop's start so the loop is seamless, and it was heard on the first pass too (and at the start of every
  export). Each part now carries that fold negated (`_cut`), played once with the loop (`startSrc`) and added to exports and stems, so the
  first pass is clean and later passes keep the ring-over; sidechain ducking applies to it too. The same fold was in vocal takes (reverb and echo past the end) and
  sound-effect parts; all three now share `foldTail`. Sounds that skip the gate (metronome, count-in arpeggio) were never affected. (2) After Pause, tapping notes or keys made no
  sound until Play: Pause closes the output gate (to cut the reverb) and only Play opened it. Sounds made on the spot (note and key taps,
  drum hits, pads, beat previews) now open it (`liveIn`). `tailcut_test.js` (new) fails on the old code for both and passes now.

## Share video, step 1 (owner, 28 Nov: before and after)
- New Share row **Before and after** (`js/beforeafter.js`; plan and decisions in `noodle/SHARE_VIDEO.md`): one bar of the first part recorded
  with the mic, as heard (light clean-up, turned up to sit just under the song), then a hard cut to the song from the next bar. Fast songs
  (a bar under 2 s) get 2 bars. With no mic part, the before is the first tune part alone. Captions "So I went like this…" / "To make this.".
- Hum and beatbox recordings are now kept on the phone with their part (`src`+id in the takes store; not in song links or backups), so the
  video works after Noodle reopens. Duplicate and delete carry them along.
- All videos: 1080x1920 when the phone can encode it (else 720x1280); the free tag is a small see-through Noodle mark top left; the free end
  card is 1.5 s (was 2.5). The whole-song video is the **Song video** row.
- `ba_test`: the before is the hum where it was sung (each note's bar position), the cut lands on the bar, the kept recording works after a
  reload, a drawn part gives a "part" before, rows, watermark free only, end card 1.5 / 0 s, the export event. Frames in `results/ba_*.png`.
  `endcard_test` and `b1_test` updated for 1.5 s and the new rows.
- Step 1b (owner, 28 Nov): the before is chosen hummed > sung > beatboxed; with no mic recording Lead > Keys > Bass > drums. Share → More
  settings → Starts with picks another (kept with the song, plays the bar when tapped). `ba_test` adds a beatbox take (hum still first, the
  beatbox can be chosen, the list and the row) and a drawn Lead at bar 3 beating a Bass at bar 1.

## DAW round 1, Send to computer (28 Nov; plan in `DAW.md`)
- In the iPhone app, the pad screen (Note pads, Chord pads, Drum pads, Play pad) has **Send to computer** (ⓘ) and **Set up**. On: each pad
  sends MIDI as you play (note on at the touch, off on release; chords as 3 notes; drums on channel 10 with the MIDI export's General MIDI
  notes; the Play pad's up as CC 74, sliding releases the old note). The pads are quiet on the phone unless **Sound on the phone** is on.
  Closing the pad screen sends every note off. Recording in Noodle still works at the same time.
- Swift (`MidiOut` in `NoodleWebApp.swift`): CoreMIDI client, sends to every destination the phone sees (the Mac over the cable once Enabled
  in Audio MIDI Setup, a Bluetooth connection) plus a virtual source "Noodle"; Apple's Bluetooth MIDI screen; a timing test (4 bars of 16ths
  at 120 BPM from a high-priority queue); touch-to-send delay of recent notes (page clock vs app clock + time since the finger landed).
  Bluetooth permission text added (Info.plist). Not compiled here (no Xcode): the owner's build is the first compile.
- Set up sheet: what the phone is connected to, cable and Bluetooth steps, timing test, delay readout. The sheet no longer leaves room for
  the transport while the pad screen covers it (`sheetAboveTransport`).
- Usage event `daw` (label: on/off, setup, bluetooth, timing test, connected cable/other with the count, notes <pad kind> with the count,
  delay ms and delay ms worst, phone sound on/off). No device names. Added to `EVENTS` in `noodle-api` (needs its hand deploy) and its test;
  privacy page and App Store privacy text updated (Product Interaction, already declared in PrivacyInfo.xcprivacy).
- Tests: `daw_test.js` (new): browser shows no row; notes, chords, drums, Play pad messages; quiet vs Sound on the phone; all off on close;
  setup sheet; events with no names; off sends nothing.

## Round 31, pads silent when first opened (owner, 28 Nov)
- Owner: arming a track with the Play pad the first time, touching it made no sound; after one take it did. Cause: opening the pads while
  the song plays stops it, and stopping shuts the output gate (to cut the reverb); only Play or a take opened it again. Same cause as the
  silent note taps after Pause, already fixed on 27 Nov (`liveIn`, in the merge after the owner's current build), so no code change here.
  Ruled out: a recorded instrument not loaded yet (it falls back to a plain tone, never silence).
- Tests: `padsound_test.js` (new): Play pad (lead and bass), Note pads, Chord pads and Drum pads, each opened while the song plays and
  touched, listening after the gate. Fails on the owner's current build (all five silent), passes now.

## Round 31, the pads sound like the part they make (owner, 28 Nov)
- Owner: what's played live on the pad and what the part plays in the timeline didn't sound the same. The live sound skipped the lane's
  volume, pan, reverb, effects and envelope, had its own loudness (fixed 0.55 / 0.7 / 0.5) and brightness (0.5 or 0.75 plus an extra
  filter on the Play pad), chords were always triads (the lane's chord type ignored), guitars didn't strum, glides didn't slide, and a
  lifted finger cut the sound in 60 ms. Now `padVoice` / `padBus` make it as `renderStem` does; mono sounds (drums, recordings) are made
  stereo before the pan, as a rendered part is (they were 3 dB quieter live). The pad screen loads a recorded instrument first (1.5 s at
  most; it fell back to a plain tone until loaded). A new part (pads or Mic) now keeps the lane's pan and effects too (it kept volume,
  reverb, brightness and envelope but not those). Decisions and the open question (brightness sweep while holding) in `PADS.md`.
- Tests: `padmatch_test.js` (new): Note pads (Saw), Play pad (Glide lead), Chord pads (Acoustic guitar, 7th chords) and Drum pads, each
  with a lane volume, envelope and drive, live vs rendered within 1 dB, loudness in 20 ms steps within 1 dB on average, brightness within
  10%. `tapin_test` waits for the pad screen (it now loads the instrument first).

## Round 31, the Play pad sweep is recorded (owner, 28 Nov)
- Owner: keep the sweep (up and down while holding a note), it's the core of the Play pad, and record every setting a finger moves on any
  pad, now and in future pad styles. Built as a general mechanism: `MODS` (instruments.js) names each setting's node, mapping, speed and
  MIDI controller; the pad plays it live (`padBus`, `padMod`) and records it (`T.mod`, kept as `tr.mods`); `renderStem` plays it back
  through the same node (repeats start the curve again); trims and splits move it (`modsCut`, `modsShift`); MIDI export writes CC 74;
  `modPts` checks curves from song files. Brightness: a low-pass, 400 Hz to 9.4 kHz (the sweep the pad had before 28 Nov).
- Usage: a kept pad take sends `take` with `<instrument> <pad>` and the count of notes, or of sweep points for the Play pad (an event
  that already exists; no takes-service change). Privacy page: "how it was recorded (the mic or a pad), how many notes or pad moves".
- Tests: `sweep_test.js` (new): a held note swept dark to bright is one note with a rising curve; the part gets brighter over the note
  (and doesn't without the curve); a trim keeps the curve from its value at the cut; MIDI export has CC 74; a hostile curve is ignored.

## Round 31, sound late after switching apps (owner, 28 Nov)
- Owner (on the build before 27 Nov): after switching apps, touching the Play pad sounded nearly a second late until the pad was closed
  and opened again. The audio restarts when its delay has grown (26 Nov), but the check ran only while nothing played, and the pad's take
  plays on a loop. Now it runs every 2 s and on coming back, playing or not, on every screen: playback carries on from about the same
  spot (the song, or the pad's take), the pad's own sound is rebuilt on the next touch. Never during a recording (mic take, pad count-in
  or take, a video being made: `audioBusy`).
- Tests: `lagfix_test.js` (new, run alone): a grown delay is faked; the audio restarts while stopped, while playing (playback resumes,
  within 1.5 s of where it was), on the pad screen ready (the next touch sounds) and while its take plays (it plays again); not during a
  pad take or a video.
