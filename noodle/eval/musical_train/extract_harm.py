# Harmony + bass + comping extraction from PDMX MIDI (public domain / CC0 scores), for Finish song's chords and bass (round 24).
# Per song in 4/4 (or 2/2) on the 16th grid: key (tonic, mode), and on 16th steps:
#   ch:   chords, one per half bar at most, merged while unchanged: [start, length, root (semitones above the tonic), quality M/m/d]
#         (best triad for the half bar's sounding pitch classes, weighted by time, the bass note counting extra)
#   bass: the lowest line under the melody: [start, length, root-relative interval (semitones above the chord root), midi]
#   comp: per bar, a 16-bit mask of where the accompaniment (not the melody, not the bass) starts notes
# usage: python3 -I extract_harm.py <mid_root> <list.txt> <out.jsonl>   (list: one .mid path per line, relative to mid_root)
import sys, json, io
from multiprocessing import Pool
import mido

KEYS = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11,'Cb':11}
MAJ = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88]
MIN = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17]
TRI = {'M':(0,4,7), 'm':(0,3,7), 'd':(0,3,6)}

def corr(h, prof, t):
    xs = [h[(t+i)%12] for i in range(12)]
    mx = sum(xs)/12; my = sum(prof)/12
    num = sum((a-mx)*(b-my) for a,b in zip(xs,prof))
    den = (sum((a-mx)**2 for a in xs)*sum((b-my)**2 for b in prof))**0.5
    return num/den if den else 0

def parse(data):
    mf = mido.MidiFile(file=io.BytesIO(data)); tpb = mf.ticks_per_beat
    tracks = []; ts = {}; ks = None
    for tr in mf.tracks:
        t = 0; on = {}; notes = []
        for m in tr:
            t += m.time
            if m.type == 'time_signature': ts[t] = (m.numerator, m.denominator)
            elif m.type == 'key_signature' and ks is None: ks = m.key
            elif m.type == 'note_on' and m.velocity > 0 and m.channel != 9: on.setdefault((m.channel,m.note), []).append(t)
            elif m.type in ('note_off','note_on') and m.channel != 9:
                st = on.get((m.channel,m.note))
                if st:
                    s = st.pop(0)
                    if t > s: notes.append((s, t-s, m.note))
        if notes: tracks.append(sorted(notes))
    return tpb, ts, ks, tracks

def one(path):
    try:
        tpb, ts, ks, tracks = parse(open(path,'rb').read())
    except Exception:
        return None
    if not tracks or not ts or tpb < 4: return None
    if set(ts.values()) - {(4,4),(2,2)}: return None          # 4/4 throughout (Noodle's bars)
    q = tpb // 4
    allnotes = [n for t in tracks for n in t]
    if len(allnotes) < 64: return None
    if sum(1 for s,_,_ in allnotes if s % q) > 0.05*len(allnotes): return None
    end = max(s+l for s,l,_ in allnotes); nbars = end // (16*q)
    if nbars < 8: return None
    # melody: the part with the highest mean pitch (>= 24 notes); its notes are left out of the bass and the comping
    cand = [t for t in tracks if len(t) >= 24]
    if not cand: return None
    mel = max(cand, key=lambda t: sum(n[2] for n in t)/len(t)); acc = [n for t in tracks if t is not mel for n in t]
    if len(acc) < 32: return None
    # key: the key signature's tonic (major) or its relative minor by the profile; else the profile alone
    h = [0.0]*12
    for s,l,p in allnotes: h[p%12] += l
    best = None
    for t in range(12):
        for mode,prof in (('maj',MAJ),('min',MIN)):
            c = corr(h, prof, t)
            if best is None or c > best[0]: best = (c, t, mode)
    tonic, mode = best[1], best[2]
    if ks:
        k = ks.rstrip('m'); kt = KEYS.get(k)
        if kt is not None:
            if ks.endswith('m'): tonic, mode = kt, 'min'
            else:   # the signature says major or its relative minor: pick by the profile
                cM, cm = corr(h, MAJ, kt), corr(h, MIN, (kt+9)%12)
                tonic, mode = (kt,'maj') if cM >= cm else ((kt+9)%12,'min')
    S = lambda tick: tick // q
    # bass: the lowest accompaniment note sounding at each onset, below middle C
    by = {}
    for s,l,p in acc:
        st = S(s)
        if p < 60 and (st not in by or p < by[st][1]): by[st] = (max(1, round(l/q)), p)
    bons = sorted(by)
    if len(bons) < nbars: return None
    # chords per half bar (8 steps)
    half = 8; nh = nbars*2; w = [[0.0]*12 for _ in range(nh)]
    for s,l,p in allnotes:
        a, b = s/q, (s+l)/q
        for hh in range(int(a//half), min(nh, int((b-1e-9)//half)+1)):
            ov = min(b, (hh+1)*half) - max(a, hh*half)
            if ov > 0: w[hh][p%12] += ov
    for st,(l,p) in by.items():
        hh = st // half
        if hh < nh: w[hh][p%12] += 4.0 if st % half == 0 else 1.5     # the bass note says the root
    chs = []
    for hh in range(nh):
        tot = sum(w[hh])
        if tot < 2: chs.append(None); continue
        bestc = None
        for r in range(12):
            for qn,iv in TRI.items():
                inn = sum(w[hh][(r+i)%12] for i in iv); sc = inn - 0.7*(tot-inn) + 0.3*w[hh][r] - (0.6 if qn=='d' else 0)
                if bestc is None or sc > bestc[0]: bestc = (sc, r, qn)
        chs.append(((bestc[1]-tonic)%12, bestc[2]) if bestc[0] > 0.15*tot else None)
    ch = []
    for hh,c in enumerate(chs):
        if c is None: continue
        if ch and ch[-1][2:] == list(c) and ch[-1][0]+ch[-1][1] == hh*half: ch[-1][1] += half
        else: ch.append([hh*half, half, c[0], c[1]])
    if len(ch) < nbars//2: return None
    rootAt = {}
    for s,l,r,qq in ch:
        for k in range(s, s+l): rootAt[k] = (r + tonic) % 12
    bass = []
    for i,st in enumerate(bons):
        l,p = by[st]
        if i+1 < len(bons): l = min(l, bons[i+1]-st)
        r = rootAt.get(st)
        if r is None: continue
        bass.append([st, l, (p - r) % 12, p])
    # comping: onsets of the accompaniment above the bass line
    comp = [0]*nbars
    for s,l,p in acc:
        st = S(s); b = st // 16
        if b < nbars and not (st in by and by[st][1] == p): comp[b] |= 1 << (st % 16)
    return {'f': path.rsplit('/',1)[-1], 'mode': mode, 'tonic': tonic, 'bars': nbars, 'ch': ch, 'bass': bass, 'comp': comp}

def run(args):
    root, rel = args
    r = one(root.rstrip('/')+'/'+rel.lstrip('./'))
    return json.dumps(r) if r else None

if __name__ == '__main__':
    root, lst, out = sys.argv[1:4]
    paths = [l.strip() for l in open(lst) if l.strip()]
    n = 0
    with Pool() as pool, open(out,'w') as f:
        for i,r in enumerate(pool.imap_unordered(run, [(root,p) for p in paths], chunksize=64)):
            if r: f.write(r+'\n'); n += 1
            if i % 5000 == 0: print(i, n, file=sys.stderr, flush=True)
    print('songs', n, 'of', len(paths), file=sys.stderr)
