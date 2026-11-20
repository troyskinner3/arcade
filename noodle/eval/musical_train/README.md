# Musical mode's learned tables (`noodle/musical.json`)

Offline tools; nothing here runs in the app. Python 3 with `mido` (`pip install mido`). Treat downloads as untrusted data: own directory, `python3 -I`.

Data (all public domain or CC0; nothing copyrighted):
- **PDMX** (Long, Novack, Berg-Kirkpatrick & McAuley, Zenodo record 15571083, dataset CC BY 4.0): `PDMX.csv` + `mid.tar.gz`.
  Kept: `subset:no_license_conflict` and `subset:deduplicated` and `subset:all_valid`, minus genres whose public-domain status is doubtful
  (rock, pop, soundtrack, jazz, electronic, R&B, hip hop, country, reggae, metal, blues): 71,016 files, 38,211 with a usable lead line.
- The public-domain folk tunes (abc-collection) the reader was trained on (`corpus.json`, from `../corpus_parse.py`): 4,595.
- Tunes that share three or more 8-note interval runs with a guided-take tune are left out (610), so the owner's takes stay a fair test.

Steps:
1. `extract_pdmx.py <mid root> <list.txt> <pdmx_mel.jsonl>`: per song the key, meter, lead melody (skyline of the highest part, 16th steps,
   bar position through meter changes) and, per melody note, the accompaniment's pitch classes.
2. `train.py <pdmx_mel.jsonl> <corpus.json> <guides.json> <model.json> [holdout]`: chord-fit, phrase/last-note degree and onset tables.
3. `MINC=3 ngram.py <pdmx_mel.jsonl> <corpus.json> <guides.json> <ng.pkl> 2 [held.json]`: next-interval model (beat strength, degree,
   previous interval). Held-out bits/note: 3.62 no context, 3.04 one note, 2.79 two notes, worse beyond (near-duplicate hymns).
4. `export.py <ng.pkl> <model.json> <musical.json> 100 20`: counts quantized to one character each (~230 KB, ~100 KB gzipped).
5. `dec2.py` is the Python reference of `js/musical.js`'s decoder; `ev2.py` scores it on the owner's takes (edits, bits/note, grid,
   chord notes); `syn.py` is the synthetic check (held-out songs with the reader's error pattern).
