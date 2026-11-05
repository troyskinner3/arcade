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

## Scripts

- `run_detector.js <list> <out.json>` — notes for each audio file in a list.
- `sweep.js <list> <variants.json> <prefix>` — same, once per set of detector settings (`NT` overrides).
- `score.py <out.json>`, `sweep_score.py <prefix>` — scores. HumTrans labels start at 0 s while recordings have a
  lead-in, so each file's labels are shifted by the single best time offset (the same for every method).
- `diagnose.py` — where errors come from (missed notes, ±1 semitone, octave, timing).
- `conf_snap.py`, `decode_proto.py` — key-snapping experiments.

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
