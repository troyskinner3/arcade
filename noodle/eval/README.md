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
