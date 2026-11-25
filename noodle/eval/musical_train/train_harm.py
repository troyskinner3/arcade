# Finish song's chords and bass (round 24): templates learned from PDMX harmony (extract_harm.py output), mapped to any key by the app.
#   prog: 4-bar chord progressions WITH their rhythm (where each chord starts and how long it lasts), per mode; counted once per song,
#         songs tagged with modern genres weighted up (so it isn't all hymns). Only progressions Noodle plays exactly as written: a root in
#         the key keeps the key's own chord there (major or minor), a root outside the key is a major chord (bVII, bVI...).
#   bass: 1-bar bass patterns: each note's start, length, interval above the chord root under it, and octave against the bar's first note.
#   comp: 1-bar rhythms of the accompaniment (where chords are struck).
# usage: python3 -I train_harm.py <harm.jsonl> <genres.tsv> <harmony.json>
import sys, json, collections, math

MODERN = {'pop','rock','electronic','jazz','rbfunksoul','hiphop','soundtrack','metal','country','disco','reggaeska','blues','newage','worldmusic','experimental','darkwave','comedy'}
SC = {'maj':[0,2,4,5,7,9,11], 'min':[0,2,3,5,7,8,10]}

def diatonic_q(mode, r):
    sc = SC[mode]
    if r not in sc: return 'M'
    d = sc.index(r); third = (sc[(d+2)%7]-r)%12; fifth = (sc[(d+4)%7]-r)%12
    return 'M' if third == 4 else ('d' if fifth == 6 else 'm')

def weight(genres):
    g = set(genres.split('-'))
    if g & MODERN: return 3.0
    if 'classical' in g or 'religiousmusic' in g: return 0.5
    return 1.0

def main(src, gen, out):
    G = {}
    for line in open(gen):
        f, g = line.rstrip('\n').split('\t'); G[f] = g
    prog = {'maj': collections.Counter(), 'min': collections.Counter()}; progN = {'maj': collections.Counter(), 'min': collections.Counter()}
    bass = collections.Counter(); comp = collections.Counter(); songs = 0; modern = 0
    LB = [1,2,3,4,6,8,12,16]
    for line in open(src):
        s = json.loads(line); w = weight(G.get(s['f'], 'none')); songs += 1; modern += w == 3.0
        mode = s['mode']; ch = s['ch']; nb = s['bars']
        seenP = set()
        for win in range(nb // 4):
            a, b = win*64, win*64+64; ev = []
            for st, ln, r, q in ch:
                lo, hi = max(st, a), min(st+ln, b)
                if hi > lo: ev.append((lo-a, hi-lo, r, q))
            if sum(e[1] for e in ev) != 64 or ev[0][0] != 0: continue
            if any(q != diatonic_q(mode, r) for _, _, r, q in ev): continue        # Noodle would play another chord there
            if len(ev) < 2 or len(ev) > 8: continue                                # one chord for 4 bars, or too busy
            key = ','.join(f'{x}:{l}:{r}' for x, l, r, _ in ev)
            if key not in seenP: seenP.add(key); prog[mode][key] += w; progN[mode][key] += 1
        seenB = set(); bysbar = collections.defaultdict(list)
        for st, ln, iv, p in s['bass']: bysbar[st//16].append((st, ln, iv, p))
        for bar, ns in bysbar.items():
            if len(ns) > 8: continue
            p0 = ns[0][3]; key = ','.join(f'{st%16}:{min(LB, key=lambda x: abs(x-min(ln, 16-st%16)))}:{iv}:{round((p-p0)/12)}' for st, ln, iv, p in ns)
            if ns[0][0] % 16 == 0 and key not in seenB: seenB.add(key); bass[key] += w
        seenC = set()
        for m in s['comp']:
            if m and bin(m).count('1') <= 8 and m not in seenC: seenC.add(m); comp[m] += w
    res = {'about': 'Chord progressions (with their rhythm), bass patterns and comping rhythms for Finish song, learned from PDMX '
                    '(Long, Novack, Berg-Kirkpatrick & McAuley; CC BY 4.0; no-license-conflict subset of public-domain and CC0 scores), '
                    f'{songs} songs in 4/4; modern genres weighted x3. In semitones above the key (chords) or the chord root (bass).',
           'v': 1, 'songs': songs, 'prog': {}, 'bass': [], 'comp': []}
    for mode in ('maj', 'min'):
        top = [(k, v) for k, v in prog[mode].most_common() if progN[mode][k] >= 4][:160]
        res['prog'][mode] = [[k, round(v, 1)] for k, v in top]
    res['bass'] = [[k, round(v, 1)] for k, v in bass.most_common(140) if v >= 6]
    res['comp'] = [[m, round(v, 1)] for m, v in comp.most_common(80) if v >= 6]
    json.dump(res, open(out, 'w'), separators=(',', ':'))
    print('songs', songs, 'modern', modern, 'prog', {m: len(res['prog'][m]) for m in res['prog']}, 'bass', len(res['bass']), 'comp', len(res['comp']), file=sys.stderr)
    for mode in ('maj', 'min'):
        print(mode, res['prog'][mode][:12], file=sys.stderr)
    print('bass', res['bass'][:15], file=sys.stderr); print('comp', [(bin(m)[2:].zfill(16)[::-1], v) for m, v in res['comp'][:12]], file=sys.stderr)

if __name__ == '__main__':
    main(*sys.argv[1:4])
