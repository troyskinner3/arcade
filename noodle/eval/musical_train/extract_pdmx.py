# Melody + harmony extraction from PDMX MIDI (public domain / CC0 scores).
# For each song: key (tonic, mode), meter, the lead melody (skyline of the highest part) quantized to 16th steps,
# and per beat the accompaniment's pitch classes (12-bit mask of notes sounding, weighted >= a quarter of the beat).
# usage: python3 -I extract_pdmx.py <mid_root> <list.txt> <out.jsonl>
import sys, json, os, io, tarfile
from multiprocessing import Pool
import mido

KEYS = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11,'Cb':11}
MAJ = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88]
MIN = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17]

def corr(h, prof, t):
    xs = [h[(t+i)%12] for i in range(12)]
    mx = sum(xs)/12; my = sum(prof)/12
    num = sum((a-mx)*(b-my) for a,b in zip(xs,prof))
    den = (sum((a-mx)**2 for a in xs)*sum((b-my)**2 for b in prof))**0.5
    return num/den if den else 0

def parse(data):
    mf = mido.MidiFile(file=io.BytesIO(data))
    tpb = mf.ticks_per_beat
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
                if st: s = st.pop(0); notes.append((s, t-s, m.note)) if t > s else None
        if notes: tracks.append(sorted(notes))
    return tpb, ts, ks, tracks

def one(path):
    try:
        data = open(path,'rb').read()
        tpb, ts, ks, tracks = parse(data)
    except Exception as e:
        return None
    if not tracks or not ts: return None
    # meter segments; bar position of any tick follows the changes. The dominant meter must cover >= 85% of the song.
    segs = sorted(ts.items()); end = max(s+l for t in tracks for s,l,_ in t)
    cover = {}
    for i,(t0,m) in enumerate(segs):
        t1 = segs[i+1][0] if i+1 < len(segs) else end
        cover[m] = cover.get(m,0) + max(0, t1-t0)
    num, den = max(cover, key=cover.get)
    if cover[(num,den)] < 0.85*max(1,end): return None
    bar_starts = []  # (tick, bar length ticks) of each segment
    for t0,(a,b) in segs: bar_starts.append((t0, tpb*4*a//b))
    def posq(tick, q):
        i = 0
        while i+1 < len(bar_starts) and bar_starts[i+1][0] <= tick: i += 1
        t0, bl = bar_starts[i]
        return ((tick - t0) % bl) // q, (num,den) == segs[i][1]
    if (num, den) not in ((4,4),(3,4),(2,4),(6,8),(2,2),(12,8),(9,8),(3,8)): return None
    q = tpb // 4 if den == 4 or den == 2 else tpb // 2  # 16th step for /4, 16th for /8 is tpb/4 too (beat=quarter in MIDI ticks)
    q = tpb // 4
    if q <= 0: return None
    # melody part: among parts with enough notes, the highest mean pitch (lead line usually on top)
    cand = [t for t in tracks if len(t) >= 24]
    if not cand: return None
    mel_tr = max(cand, key=lambda t: sum(n[2] for n in t)/len(t))
    # skyline: one note per onset (highest), cut at next onset
    by = {}
    for s,l,p in mel_tr:
        if s not in by or p > by[s][1]: by[s] = (l,p)
    ons = sorted(by)
    # quantization check: onsets must sit on the 16th grid
    off = sum(1 for s in ons if s % q)
    if off > 0.03*len(ons): return None
    mel = []
    for i,s in enumerate(ons):
        l,p = by[s]
        if i+1 < len(ons): l = min(l, ons[i+1]-s)
        st = round(s/q); ln = max(1, round(l/q))
        if mel and st <= mel[-1][0]: continue
        if s % q: continue
        pos, inmeter = posq(s, q)
        mel.append([st, ln, p, pos if inmeter else -1])
    if len(mel) < 24: return None
    # accompaniment = all other notes (other tracks + lower notes of the melody track)
    acc = [n for t in tracks if t is not mel_tr for n in t] + [(s,l,p) for s,l,p in mel_tr if by.get(s,(0,-1))[1] != p]
    # per melody note: accompaniment pitch classes overlapping it by at least a third of its length (12-bit mask)
    import bisect
    acc.sort(); starts=[x[0] for x in acc]; maxl=max([x[1] for x in acc] or [0])
    for n in mel:
        s0=n[0]*q; s1=s0+n[1]*q; w=[0]*12
        i=bisect.bisect_left(starts, s0-maxl)
        while i < len(acc) and acc[i][0] < s1:
            a0,al,ap=acc[i]; ov=min(s1,a0+al)-max(s0,a0)
            if ov>0: w[ap%12]+=ov
            i+=1
        n.append(sum(1<<pc for pc in range(12) if w[pc] >= (s1-s0)/3))
    # key: signature's major/relative minor, chosen by profile over all notes (duration weighted)
    h = [0]*12
    for t in tracks:
        for s,l,p in t: h[p%12] += l
    best = None
    if ks:
        name = ks[:-1] if ks.endswith('m') else ks
        k = KEYS.get(name)
        if k is not None:
            maj = k if not ks.endswith('m') else (k+3)%12
            cands = [(corr(h,MAJ,maj),maj,'major'), (corr(h,MIN,(maj+9)%12),(maj+9)%12,'minor')]
            best = max(cands)
    if best is None:
        best = max([(corr(h,MAJ,t),t,'major') for t in range(12)]+[(corr(h,MIN,t),t,'minor') for t in range(12)])
    if best[0] < 0.5: return None
    spb = {(4,4):16,(3,4):12,(2,4):8,(2,2):16,(6,8):12,(12,8):24,(9,8):18,(3,8):6}[(num,den)]
    return {'tonic':best[1],'mode':best[2],'meter':[num,den],'bar':spb,'notes':mel,'nacc':len(acc)}

if __name__ == '__main__':
    root, lst, out = sys.argv[1:4]
    paths = [os.path.join(root, p.strip().lstrip('./')) for p in open(lst) if p.strip()]
    paths = [p for p in paths if os.path.exists(p)]
    print('files', len(paths), flush=True)
    n = 0
    with Pool(os.cpu_count()) as pool, open(out,'w') as f:
        for i,r in enumerate(pool.imap_unordered(one, paths, chunksize=64)):
            if r: f.write(json.dumps(r, separators=(',',':'))+'\n'); n += 1
            if i % 10000 == 0: print(i, n, flush=True)
    print('kept', n)
