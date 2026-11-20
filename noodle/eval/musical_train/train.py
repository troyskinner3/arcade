# Train the melody tables Musical mode uses, from public-domain / CC0 scores (PDMX) + public-domain folk tunes (abc-collection).
# usage: python3 -I train.py <pdmx_mel.jsonl> <corpus.json> <guides.json> <out.json> [holdout_frac]
# Tables (all relative to the key's tonic, so any key works; separate for major and minor):
#   iv[mode][prevdeg][metric][prevmove] -> counts of the next interval (-12..12)
#   ch[metric][dur]    -> [notes not in the accompaniment's pitch classes, notes in them]   (scores with accompaniment)
#   end[mode]          -> counts of scale degree of a phrase's last note;  fin[mode] -> of the song's last note
#   on[prevpos][pos]   -> onset position bigram in a 16-step bar (4/4, 2/2), 16 = "first note"
import sys, json, random, collections
def metric(pos, bar):
    if pos < 0: return None
    if pos == 0: return 0
    if bar in (16,):  return 1 if pos == 8 else 2 if pos % 4 == 0 else 3 if pos % 2 == 0 else 4
    if bar == 8:      return 2 if pos == 4 else 3 if pos % 2 == 0 else 4
    if bar == 12 or bar == 24 or bar == 18:   # 3/4 (beats every 4) or compound (beats every 6)
        return None
    return None
def metric_any(pos, bar, meter):
    if pos < 0: return None
    if pos == 0: return 0
    num, den = meter
    if den == 8:   # compound: beats each 6 steps
        return 1 if pos % 6 == 0 else 3 if pos % 2 == 0 else 4
    if bar == 12:  return 2 if pos % 4 == 0 else 3 if pos % 2 == 0 else 4
    return metric(pos, bar)
def move(iv):
    return 0 if iv is None else 1 if iv == 0 else 2 if 0 < iv <= 2 else 3 if iv > 2 else 4 if iv >= -2 else 5
def dur(l): return 0 if l <= 1 else 1 if l <= 2 else 2 if l <= 4 else 3
def ivs_key(notes):
    return tuple(notes[i+1][2]-notes[i][2] for i in range(len(notes)-1))
def songs(pdmx, folk):
    for line in open(pdmx):
        d = json.loads(line); yield 'p', d
    for d in json.load(open(folk)):
        bar = int(round(d['bar']*4)); t = 0; t0 = None; out = []; ok = True
        if bar not in (8, 12, 16, 24): continue
        for p, l, beat in d['notes']:
            if t0 is None and beat == beat and abs(beat-1.0) < 1e-6: t0 = t
            st = t*4; ln = l*4
            if abs(st-round(st)) > 1e-6 or abs(ln-round(ln)) > 1e-6: ok = False; break
            if p is not None and ln >= 1: out.append([round(st), round(ln), p, None, 0])
            t += l
        if not ok or t0 is None or len(out) < 16: continue
        for n in out: n[3] = (n[0]-round(t0*4)) % bar if n[0] >= round(t0*4) else -1
        compound = bar in (12, 24) and any(b == b and abs((b % 1) - 1/3) < 0.01 for _,_,b in d['notes'] if b)
        meter = [4,4] if bar == 16 else [2,4] if bar == 8 else ([6,8] if bar == 12 else [12,8]) if compound else [3,4] if bar == 12 else [6,4]
        if meter == [6,4]: continue
        mode = d['mode'] if d['mode'] in ('major','minor') else 'major'
        yield 'f', {'tonic': d['tonic'], 'mode': mode, 'meter': meter, 'bar': bar, 'notes': out, 'nacc': 0}
def leak(notes, grams):
    iv = ivs_key(notes); hits = 0
    for i in range(len(iv)-7):
        if iv[i:i+8] in grams: hits += 1
        if hits >= 3: return True
    return False
if __name__ == '__main__':
    pdmx, folk, guides, out = sys.argv[1:5]; hold = float(sys.argv[5]) if len(sys.argv) > 5 else 0.0
    G = json.load(open(guides)); grams = set()
    for name, ns in G.items():
        if name.startswith('scale'): continue
        ns = sorted(ns, key=lambda n: n['s']); iv = tuple(ns[i+1]['p']-ns[i]['p'] for i in range(len(ns)-1))
        for i in range(len(iv)-7): grams.add(iv[i:i+8])
    iv_t = {m: collections.defaultdict(lambda: [0]*25) for m in ('major','minor')}
    ch = collections.defaultdict(lambda: [0,0]); end = {m: [0]*12 for m in ('major','minor')}; fin = {m: [0]*12 for m in ('major','minor')}
    on = [[0]*16 for _ in range(17)]; rng = random.Random(7); held = []; nsong = collections.Counter(); leaked = 0; nnotes = 0
    for src, d in songs(pdmx, folk):
        ns = d['notes']
        if leak(ns, grams): leaked += 1; continue
        if hold and rng.random() < hold: held.append(d); continue
        nsong[src] += 1; mode = d['mode']; T = d['tonic']; bar = d['bar']; meter = tuple(d['meter'])
        prev_iv = None; nnotes += len(ns)
        for i, n in enumerate(ns):
            s, l, p, pos = n[0], n[1], n[2], n[3]
            m = metric_any(pos, bar, meter)
            if i:
                a = ns[i-1]; iv = p - a[2]
                gap = s - (a[0] + a[1])
                if gap >= 4: prev_iv = None   # a rest of a beat+ starts a new phrase: no interval
                elif m is not None and -12 <= iv <= 12:
                    iv_t[mode][((a[2]-T) % 12, m, move(prev_iv))][iv+12] += 1
                prev_iv = iv if gap < 4 else None
            if src == 'p' and d['nacc'] and m is not None and len(n) > 4 and bin(n[4]).count('1') >= 3:
                ch[(m, dur(l))][(n[4] >> (p % 12)) & 1] += 1
            last = i == len(ns)-1 or ns[i+1][0] - (s+l) >= 4
            if last: end[mode][(p-T) % 12] += 1
            if meter in ((4,4),(2,2)) and pos >= 0:
                pp = ns[i-1][3] if i and ns[i-1][3] >= 0 and s - ns[i-1][0] < 16 else 16
                on[pp][pos] += 1
        fin[mode][(ns[-1][2]-T) % 12] += 1
    M = {'songs': dict(nsong), 'leaked': leaked, 'notes': nnotes,
         'iv': {m: {f'{k[0]},{k[1]},{k[2]}': v for k, v in t.items()} for m, t in iv_t.items()},
         'ch': {f'{k[0]},{k[1]}': v for k, v in ch.items()}, 'end': end, 'fin': fin, 'on': on}
    json.dump(M, open(out, 'w'))
    if hold: json.dump(held, open(out.replace('.json', '_held.json'), 'w'))
    print(M['songs'], 'leaked', leaked, 'notes', nnotes, 'held', len(held))
