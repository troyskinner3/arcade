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

def parse_sfz(path, defines=None):
    """The regions of an SFZ file: sample, key range, root (with tune), volume (dB), velocity range. Handles <global>/<group>/<region>
    inheritance, #define, note names; ignores what Noodle doesn't use (ARIA controls, release triggers, keyswitches)."""
    txt = open(path, encoding='utf-8', errors='ignore').read(); txt = re.sub(r'//[^\n]*', '', txt)
    defs = dict(defines or {})
    for k, v in re.findall(r'#define\s+(\$\w+)\s+(\S+)', txt): defs.setdefault(k, v)
    for k, v in sorted(defs.items(), key=lambda kv: -len(kv[0])): txt = txt.replace(k, v)
    def num(v):
        try: return int(v)
        except ValueError: return midi(v[0].upper() + v[1:]) if re.match(r'^[a-gA-G][#b]?-?\d$', v) else float(v)
    regions = []; glob = {}; group = {}; cur = None; base = ''
    for tok in re.split(r'(<\w+>)', txt):
        t = tok.strip()
        if not t: continue
        if t in ('<global>', '<master>'): glob = {}; cur = glob; continue
        if t == '<group>': group = {}; cur = group; continue
        if t == '<control>': cur = {'_control': 1}; continue
        if t == '<region>': cur = {}; regions.append((glob, group, cur)); continue
        if t.startswith('<'): cur = {}; continue
        for k, v in re.findall(r'(\w+)=(.+?)(?=\s+\w+=|$)', t.replace('\n', ' ')):
            v = v.strip()
            if cur is not None and cur.get('_control') and k == 'default_path': base = v
            elif cur is not None: cur[k] = v
    out = []
    for g0, g1, r in regions:
        o = {**g0, **g1, **r}
        if 'sample' not in o or o.get('trigger', 'attack') != 'attack': continue
        if 'sw_last' in o and 'sw_default' not in o and o.get('sw_last') != g0.get('sw_default'): pass
        key = num(o['key']) if 'key' in o else None
        lo = num(o.get('lokey', key if key is not None else 0)); hi = num(o.get('hikey', key if key is not None else 127))
        root = num(o.get('pitch_keycenter', key if key is not None else lo)) - float(o.get('tune', 0)) / 100 - num(o.get('transpose', 0))
        out.append(dict(sample=os.path.join(base, o['sample']).replace('\\', '/'), lo=lo, hi=hi, root=round(root, 3), vol=float(o.get('volume', 0)),
                        lovel=num(o.get('lovel', 1)), hivel=num(o.get('hivel', 127)), seq=num(o.get('seq_position', 1))))
    return out

def build_sfz(root, key, cfg):
    sfz = os.path.join(root, cfg['sfz']); folder = os.path.dirname(sfz); out = os.path.join(HERE, key)
    regs = [r for r in parse_sfz(sfz, cfg.get('defines')) if r['seq'] == 1]
    vels = sorted({r['hivel'] for r in regs}); keep = cfg.get('velocities') or vels
    layers = []; done = {}
    for hv in keep:
        rs = []
        for r in sorted([r for r in regs if r['hivel'] == hv], key=lambda r: r['lo']):
            src = os.path.join(folder, r['sample']); name = re.sub(r'[^A-Za-z0-9_.-]+', '_', os.path.splitext(r['sample'])[0]) + '.mp3'
            if name not in done: encode(src, os.path.join(out, name), secs_for(int(r['root']), cfg['trim']), cfg.get('gain_db', 0), mono=cfg.get('mono', False)); done[name] = 1
            rs.append({'lo': r['lo'], 'hi': r['hi'], 'root': r['root'], 'file': name, 'db': r['vol']})
        layers.append({'maxV': round(hv / 127, 3), 'regions': rs})
    meta = {'name': cfg['name'], 'credit': cfg['credit'], 'release': cfg['release'], 'gain': cfg.get('gain', 1.0), 'layers': layers}
    with open(os.path.join(out, 'map.json'), 'w') as fh: json.dump(meta, fh, separators=(',', ':'))
    size = sum(os.path.getsize(os.path.join(out, x)) for x in os.listdir(out))
    print(f'{key}: {len(done)} files, {sum(len(l["regions"]) for l in layers)} regions in {len(layers)} layers, {size/1e6:.1f} MB')

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
    'epiano': dict(   # Wurlitzer EP200: four velocity layers, mapped and tuned by its SFZ
        sfz='GregSullivan.E-Pianos/Wurlitzer EP200/Wurlitzer EP200.sfz', defines={'$EXT': 'flac'}, mono=True,
        trim=[(127, 6.0)], release=0.2, gain=1.0, name='Wurlitzer electric piano',
        credit="Wurlitzer EP200 from Greg Sullivan's E-Pianos (CC BY 3.0)"),
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
    for k in keys: (build_sfz(root, k, SOURCES[k]) if 'sfz' in SOURCES[k] else build(root, k))
