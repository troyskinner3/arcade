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

def encode_loop(src, dst, seconds, loop, gain_db=0.0, mono=False, kbps=192):
    """A sustained note made to hold: keep `seconds`, and blend the end of the loop into its start so it repeats without a click.
    loop = (start_s, xfade_s): the loop runs from start_s to the end of the kept part. Returns [loop_start_s, loop_end_s, note_start_s]."""
    import numpy as np
    ch = 1 if mono else 2; sr = 48000
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', str(ch), '-ar', str(sr), '-f', 'f32le', '-'], check=True, capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, ch).copy(); n = min(len(x), int(seconds * sr))
    a = int(loop[0] * sr); xf = int(loop[1] * sr); b = n
    if b - a < 2 * xf: raise ValueError(f'{src}: loop too short')
    w = np.linspace(0, 1, xf)[:, None]; x[b - xf:b] = x[b - xf:b] * (1 - w) + x[a - xf:a] * w   # the loop's end turns into what comes just before its start
    y = x[:b] * (10 ** (gain_db / 20)); os.makedirs(os.path.dirname(dst), exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', str(ch), '-i', '-', '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', dst], input=y.astype(np.float32).tobytes(), check=True)
    pk = np.abs(x[:int(0.3 * sr), 0]).max(); on = int(np.argmax(np.abs(x[:, 0]) >= pk * 0.01))   # where the note starts (found the same way by the app), to place the loop exactly
    return [round(a / sr, 4), round(b / sr, 4), round(on / sr, 4)]

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
        root = num(o.get('pitch_keycenter', key if key is not None else 60)) - float(o.get('tune', 0)) / 100 - num(o.get('transpose', 0))   # SFZ: no keycenter means 60
        out.append(dict(sample=os.path.join(base, o['sample']).replace('\\', '/'), lo=lo, hi=hi, root=round(root, 3), vol=float(o.get('volume', 0)),
                        lovel=num(o.get('lovel', 1)), hivel=num(o.get('hivel', 127)), seq=num(o.get('seq_position', 1)) if float(o.get('lorand', 0)) == 0 else 2))   # round robins (seq or rand): keep the first
    return out

def cents_off(path, root):
    """How far a recorded note is from its nominal pitch, in cents (median over 0.3-1.2 s, past the pluck): normalized autocorrelation
    searched within ±15% of the expected period, refined between samples."""
    import numpy as np
    sr = 48000; d = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], check=True, capture_output=True).stdout, dtype=np.float32)
    f = 440 * 2 ** ((root - 69) / 12); exp = sr / f; got = []
    for t in (0.3, 0.6, 0.9, 1.2):
        s = d[int(t * sr):int(t * sr) + 12000]
        if len(s) < 12000: break
        nc = lambda k: float((s[:-k] * s[k:]).sum() / np.sqrt((s[:-k] ** 2).sum() * (s[k:] ** 2).sum() + 1e-12))
        ks = range(int(exp * 0.85), int(exp * 1.15) + 2); k = max(ks, key=nc); y0, y1, y2 = nc(k - 1), nc(k), nc(k + 1)
        got.append(1200 * np.log2(sr / (k + 0.5 * (y0 - y2) / ((y0 - 2 * y1 + y2) or 1)) / f))
    return float(np.median(got)) if got else 0.0

def clean(out):   # start each build from an empty folder, so no file from an older build is left behind
    if os.path.isdir(out):
        for f in os.listdir(out):
            if f.endswith('.mp3') or f == 'map.json': os.remove(os.path.join(out, f))

def build_sfz(root, key, cfg):
    out = os.path.join(HERE, key); clean(out); parts = cfg['sfz'] if isinstance(cfg['sfz'], list) else [(cfg['sfz'], 0, 127)]
    regs = []
    for path, klo, khi in parts:   # several SFZ files can share the keyboard, each over its own range
        sfz = os.path.join(root, path); folder = os.path.dirname(sfz)
        for r in parse_sfz(sfz, cfg.get('defines')):
            if r['seq'] != 1 or r['hi'] < klo or r['lo'] > khi or (cfg.get('exclude') and re.search(cfg['exclude'], r['sample'])): continue
            r['lo'] = max(r['lo'], klo); r['hi'] = min(r['hi'], khi); r['sample'] = os.path.join(folder, r['sample']); regs.append(r)
    folder = ''
    vels = sorted({r['hivel'] for r in regs}); keep = cfg.get('velocities') or vels
    layers = []; done = {}
    for hv in keep:
        rs = []
        for r in sorted([r for r in regs if r['hivel'] == hv], key=lambda r: r['lo']):
            src = r['sample']; name = re.sub(r'[^A-Za-z0-9_.-]+', '_', os.path.splitext(os.path.basename(r['sample']))[0]) + '.mp3'
            if name not in done:
                secs = secs_for(int(r['root']), cfg['trim'])
                done[name] = encode_loop(src, os.path.join(out, name), secs, cfg['loop'], cfg.get('gain_db', 0), mono=cfg.get('mono', False)) if cfg.get('loop') else encode(src, os.path.join(out, name), secs, cfg.get('gain_db', 0), mono=cfg.get('mono', False))
            sh = cfg.get('shift', 0)   # some libraries are mapped an octave away from the true pitch (measured, see below)
            rr = {'lo': r['lo'] + sh, 'hi': r['hi'] + sh, 'root': round(r['root'] + sh, 3), 'file': name, 'db': r['vol']}
            if cfg.get('retune'):   # a note recorded out of tune (a low string plucked hard rings sharp): tune it by measuring it
                c = cents_off(os.path.join(out, name), rr['root'])
                if 8 <= abs(c) <= 60: rr['root'] = round(rr['root'] + c / 100, 3)
            if cfg.get('loop'): rr['loop'] = done[name]
            rs.append(rr)
        layers.append({'maxV': round(hv / 127, 3), 'regions': rs})
    meta = {'name': cfg['name'], 'credit': cfg['credit'], 'release': cfg['release'], 'gain': cfg.get('gain', 1.0), 'layers': layers}
    if cfg.get('amp'): meta['amp'] = cfg['amp']   # a light amp in the app: drive, then a speaker-like band
    with open(os.path.join(out, 'map.json'), 'w') as fh: json.dump(meta, fh, separators=(',', ':'))
    size = sum(os.path.getsize(os.path.join(out, x)) for x in os.listdir(out))
    print(f'{key}: {len(done)} files, {sum(len(l["regions"]) for l in layers)} regions in {len(layers)} layers, {size/1e6:.1f} MB')

def build_kit(root, key, cfg):
    """A drum kit: for each Noodle drum slot, a few velocity layers of one hit (first round robin), its microphones mixed at the levels
    the kit's own SFZ uses by default (close mics are mono, in the middle; overheads stereo), trimmed with a fade, stereo MP3."""
    import numpy as np
    out = os.path.join(HERE, key); clean(out); sr = 48000; base = os.path.join(root, cfg['src']); os.makedirs(out, exist_ok=True)
    rd = lambda f: np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '2', '-ar', str(sr), '-f', 'f32le', '-'], check=True, capture_output=True).stdout, dtype=np.float32).reshape(-1, 2)
    slots = {}
    for slot, (d, pre, mics, secs) in cfg['slots'].items():
        names = os.listdir(os.path.join(base, d, list(mics)[0])); vls = sorted({int(re.search(r'_vl(\d+)_rr1', n).group(1)) for n in names if '_rr1' in n})
        top = cfg['layers_of'][slot]; lay = []
        for v in vls:
            xs = [g * rd(os.path.join(base, d, m, f'{pre}_vl{v}_rr1.flac')) for m, g in mics.items()]
            n = min(len(x) for x in xs); x = sum(x[:n] for x in xs)[:int(secs * sr)]
            fd = min(int(0.3 * sr), len(x) // 3); x[-fd:] *= np.linspace(1, 0, fd)[:, None]
            name = f'{slot}_{v}.mp3'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', '2', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '192k', os.path.join(out, name)], input=(x * 10 ** (cfg.get('gain_db', 0) / 20)).astype(np.float32).tobytes(), check=True)
            lay.append({'maxV': round(v / top, 3), 'file': name})
        lay[-1]['maxV'] = 1.0; slots[slot] = lay
    meta = {'name': cfg['name'], 'credit': cfg['credit'], 'kit': True, 'gain': cfg.get('gain', 1.0), 'slots': slots}
    if cfg.get('slot_gain'): meta['slotGain'] = cfg['slot_gain']
    with open(os.path.join(out, 'map.json'), 'w') as fh: json.dump(meta, fh, separators=(',', ':'))
    size = sum(os.path.getsize(os.path.join(out, x)) for x in os.listdir(out))
    print(f'{key}: {sum(len(v) for v in slots.values())} files in {len(slots)} drums, {size/1e6:.1f} MB')

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
    'strings': dict(   # string section: cellos below C3, violas C3 to A3, violins from A#3; the fuller (louder) layer only; looped to hold
        sfz=[('VSCO-SFZ/CelloEnsSusVib.sfz', 0, 47), ('VSCO-SFZ/ViolaEnsSusVib.sfz', 48, 57), ('VSCO-SFZ/ViolinEnsSusVib.sfz', 58, 127)],
        velocities=[127], trim=[(127, 6.0)], loop=(2.5, 0.35), release=0.6, gain=0.45, name='String section',   # gain: -7 dB, level with the synth strings
        credit='VS Chamber Orchestra: Community Edition by Versilian Studios (CC0)'),
    'bass': dict(   # Squier Jazz bass, played with fingers, recorded direct: 4 velocity layers, first round robin
        sfz='karoryfer.growlybass/growlybass_clean.sfz', exclude=r'scrape|release|noises', mono=True, shift=-12,   # mapped an octave up in its SFZ: its 'A2' recording is 55 Hz (A1)
        trim=[(127, 4.0)], retune=True, release=0.12, gain=2.4, name='Electric bass', credit='Growlybass by Karoryfer Samples (CC0)'),
    'guitar': dict(   # Epiphone electric guitar, recorded direct (the app adds a light amp): 4 velocity layers, first round robin
        sfz='karoryfer.emilyguitar/emily_clean.sfz', exclude=r'noises|release', mono=True,
        trim=[(127, 4.0)], retune=True, release=0.15, gain=0.24, amp={'drive': 0.45, 'pre': 2.0, 'hp': 90, 'lp': 4800}, name='Electric guitar', credit='Emilyguitar by Karoryfer Samples (CC0)'),
    'rockkit': dict(   # Big Rusty Drums: a 24" rock kit. 4 velocity layers per drum (of the 4-14 recorded); mic levels from its SFZ defaults (amplitude x default CC / 127)
        src='karoryfer.big-rusty-drums/Samples', kit=True, gain=1.0, name='Rock kit', credit='Big Rusty Drums by Karoryfer Samples (CC0)',
        slots={'kick': ('kick_24/kick', 'k', {'kick': .787}, 1.2),
               'snare': ('snare_14/center', 'sn_center', {'btm': .787, 'top': .315, 'oh': .472}, 1.5),
               'rim': ('snare_14/sidestick', 'sn_ss', {'btm': .787, 'top': .315, 'oh': .472}, 0.8),
               'hat': ('hihat_14/cl', 'ht_cl', {'cl': .55, 'oh': .55}, 0.6),
               'openhat': ('hihat_14/open', 'ht_open', {'cl': .55, 'oh': .55}, 2.0),
               'tomhi': ('tom_14/center', 't14', {'cl': .787, 'oh': .55}, 2.5), 'tommid': ('tom_15/center', 't15', {'cl': .787, 'oh': .55}, 2.5), 'tomlo': ('tom_18/center', 't18', {'cl': .787, 'oh': .55}, 2.5),
               'crash': ('crash_17/cr', 'cr', {'cl': .22, 'oh': .55}, 4.5), 'ride': ('ride_22/rd', 'rd', {'cl': .19, 'oh': .47}, 3.5)},
        # each drum at the level the synth Rock kit had it (loudness over its first 0.25 s, peak at most 3 dB over the synth's), so songs keep their balance: mm/kit_test.js
        slot_gain={'kick': 2.43, 'snare': 1.02, 'rim': 1.78, 'hat': 1.3, 'openhat': 1.68, 'tomhi': 3.24, 'tommid': 3.13, 'tomlo': 2.54, 'crash': 2.75, 'ride': 1.32},
        layers_of={'kick': 14, 'snare': 10, 'rim': 4, 'hat': 6, 'openhat': 6, 'tomhi': 6, 'tommid': 7, 'tomlo': 8, 'crash': 5, 'ride': 10}),   # recorded layers per drum: a layer covers velocities up to its number / this
}

def build(root, key):
    cfg = SOURCES[key]; folder = os.path.join(root, cfg['src']); out = os.path.join(HERE, key)
    clean(out)
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
    for k in keys: (build_kit(root, k, SOURCES[k]) if SOURCES[k].get('kit') else build_sfz(root, k, SOURCES[k]) if 'sfz' in SOURCES[k] else build(root, k))
