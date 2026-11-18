#!/usr/bin/env python3
"""Build Noodle's sampled instruments from their open source recordings.

Not loaded by the app: it is run by hand when an instrument is added or changed. For each instrument it takes the chosen
recordings, trims each note to a length that suits its register (with a short fade so nothing clicks), encodes MP3
(Safari and Chromium both decode it) and writes <instrument>/map.json, which the app's sampler reads.

Usage:  python3 build_samples.py <sources-folder> [instrument ...]
The sources folder holds the libraries as cloned from their repositories (see SOURCES below and CREDITS.md).
Licenses are checked in each library's own LICENSE file; only CC0, public domain and CC-BY material is used, and every
CC-BY library is credited in the app (More > About) and in CREDITS.md.
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def midi(name):   # "A0" -> 21, "D#4" -> 63
    m = re.match(r'([A-G][#b]?)(-?\d)$', name); return 12 * (int(m.group(2)) + 1) + NOTE[m.group(1)]

def secs_for(m, plan):   # trim length by register: plan = [(upToMidi, seconds), ...]
    for top, s in plan:
        if m <= top: return s
    return plan[-1][1]

def encode(src, dst, seconds, gain_db=0.0, fade=0.6, mono=False, kbps=192):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    af = f"atrim=0:{seconds},afade=t=out:st={max(0, seconds - fade)}:d={fade},volume={gain_db}dB"
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', af, '-ar', '48000'] + (['-ac', '1'] if mono else ['-ac', '2']) + ['-c:a', 'libmp3lame', '-b:a', f'{kbps}k', dst]
    subprocess.run(cmd, check=True)

# ---------------------------------------------------------------------------------------------------------------
# Instruments
# Each: source folder, how to find (note, layer) files, which layers to keep and the highest velocity (0-1) each covers.
SOURCES = {
    'piano': dict(
        src='SalamanderGrandPiano/Samples', pattern=r'^([A-G]#?\d)v(\d+)\.flac$',
        layers=[(4, 0.45), (8, 0.9), (15, 1.0)],     # soft, medium (also drawn notes at 0.85), hard
        trim=[(47, 8.0), (83, 6.0), (127, 3.5)],     # bass up to B2 8 s, to B5 6 s, above 3.5 s
        release=0.25, gain=2.0, name='Grand piano',   # gain: +6 dB, level with the synth piano it replaces (mid notes and chords)
        credit='Salamander Grand Piano by Alexander Holm (CC BY 3.0)'),
}

def build(root, key):
    cfg = SOURCES[key]; folder = os.path.join(root, cfg['src']); out = os.path.join(HERE, key)
    files = {}
    for f in sorted(os.listdir(folder)):
        m = re.match(cfg['pattern'], f)
        if m: files.setdefault(int(m.group(2)), {})[midi(m.group(1))] = f
    layers = []
    for lay, top in cfg['layers']:
        notes = {}
        for mm, f in sorted(files[lay].items()):
            name = f'{mm}v{lay}.mp3'; encode(os.path.join(folder, f), os.path.join(out, name), secs_for(mm, cfg['trim'])); notes[str(mm)] = name
        layers.append({'maxV': top, 'notes': notes})
    meta = {'name': cfg['name'], 'credit': cfg['credit'], 'release': cfg['release'], 'gain': cfg.get('gain', 1.0), 'layers': layers}
    with open(os.path.join(out, 'map.json'), 'w') as fh: json.dump(meta, fh, separators=(',', ':'))
    size = sum(os.path.getsize(os.path.join(out, x)) for x in os.listdir(out))
    print(f'{key}: {sum(len(l["notes"]) for l in layers)} files, {size/1e6:.1f} MB')

if __name__ == '__main__':
    root = sys.argv[1]; keys = sys.argv[2:] or list(SOURCES)
    for k in keys: build(root, k)
