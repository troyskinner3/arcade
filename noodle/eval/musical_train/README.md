# Musical mode's learned tables (`noodle/musical.json`)

Offline tools; nothing here runs in the app. Python 3 with `mido` (`pip install mido`). Treat downloads as untrusted data: own directory, `python3 -I`.

Data (all public domain or CC0; nothing copyrighted):
- **PDMX** (Long, Novack, Berg-Kirkpatrick & McAuley, Zenodo record 15571083, dataset CC BY 4.0): `PDMX.csv` + `mid.tar.gz`.
  Kept: `subset:no_license_conflict` and `subset:deduplicated` and `subset:all_valid`, every genre (owner: CC0/public domain, cleared):
  77,321 files, 41,321 with a usable lead line.
- The public-domain folk tunes (abc-collection) the reader was trained on (`corpus.json`, from `../corpus_parse.py`): 4,595.
- Tunes that share three or more 8-note interval runs with a guided-take tune are left out (759), so the owner's takes stay a fair test.

Steps:
1. `extract_pdmx.py <mid root> <list.txt> <pdmx_mel.jsonl>`: per song the key, meter, lead melody (skyline of the highest part, 16th steps,
   bar position through meter changes) and, per melody note, the accompaniment's pitch classes.
2. `train.py <pdmx_mel.jsonl> <corpus.json> <guides.json> <model.json> [holdout]`: chord-fit, phrase/last-note degree and onset tables.
3. `MINC=3 ngram.py <pdmx_mel.jsonl> <corpus.json> <guides.json> <ng.pkl> 2 [held.json]`: next-interval model (beat strength, degree,
   previous interval). Held-out bits/note: 3.62 no context, 3.04 one note, 2.79 two notes, worse beyond (near-duplicate hymns).
4. `export.py <ng.pkl> <model.json> <musical.json> 100 20`: counts quantized to one character each (~230 KB, ~100 KB gzipped).
5. `dec2.py` is the Python reference of `js/musical.js`'s decoder; `ev2.py` scores it on the owner's takes (edits, bits/note, grid,
   chord notes); `syn.py` is the synthetic check (held-out songs with the reader's error pattern).

## Finish song's chords and bass (`noodle/harmony.json`, round 24)
From the same PDMX subset (no license conflict, deduplicated, all valid; 77,321 MIDI files), songs in 4/4 on the 16th grid (15,247):
1. `extract_harm.py <mid root> <list.txt> <harm.jsonl>`: per song the key, chords per half bar (best triad for the sounding pitch classes,
   the bass note counting extra) merged while unchanged, the bass line (lowest accompaniment note under middle C) with each note's
   interval above the chord root, and per bar where the accompaniment strikes.
2. `train_harm.py <harm.jsonl> <genres.tsv> <harmony.json>`: 4-bar progressions with their harmonic rhythm (per mode, counted once per
   song, modern genres x3, classical x0.5; only progressions Noodle plays as written), 1-bar bass patterns, 1-bar comping rhythms.
   genres.tsv: file name and PDMX's `genres` column for each song in the list. ~18 KB.
