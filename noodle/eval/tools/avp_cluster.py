# Does grouping the hits of one take before naming them sort drums better than naming each hit alone?
# Data: results/avp_feat.json (AVP freestyles through today's Noodle). Score: right drum among true hits that Noodle found within 50 ms.
import json, numpy as np, collections, sys
R = json.load(open('/tmp/claude-0/-home-user/14a038b5-3f7e-5635-965f-07fad87bf95e/scratchpad/results/avp_feat.json'))
FAM = {'kd': 'kick', 'sd': 'snare', 'hhc': 'hat', 'hho': 'hat'}
f = lambda c: {'clap': 'snare'}.get(c, c)

def kmeans(X, k, seed=0, it=40):
    rng = np.random.RandomState(seed); n = len(X)
    # k-means++ start
    C = [X[rng.randint(n)]]
    for _ in range(1, k):
        d = np.min([((X - c) ** 2).sum(1) for c in C], 0); C.append(X[rng.choice(n, p=d / d.sum())] if d.sum() > 0 else X[rng.randint(n)])
    C = np.array(C)
    for _ in range(it):
        lab = np.argmin(((X[:, None] - C[None]) ** 2).sum(2), 1)
        C2 = np.array([X[lab == j].mean(0) if (lab == j).any() else C[j] for j in range(k)])
        if np.allclose(C, C2): break
        C = C2
    return lab, ((X - C[lab]) ** 2).sum()

def best_kmeans(X, k):
    return min((kmeans(X, k, s) for s in range(6)), key=lambda r: r[1])

def silhouette(X, lab):
    n = len(X); D = np.sqrt(((X[:, None] - X[None]) ** 2).sum(2)); s = []
    for i in range(n):
        own = lab == lab[i]
        if own.sum() < 2: s.append(0); continue
        a = D[i, own].sum() / (own.sum() - 1); b = min(D[i, lab == j].mean() for j in set(lab) if j != lab[i]); s.append((b - a) / max(a, b, 1e-9))
    return float(np.mean(s))

def feats(ons, kind):
    if kind == 'basic': X = np.array([[np.log2(o['cen']), o['low'] * 4, np.log2(max(o['dur'], 1e-3))] for o in ons])
    elif kind == 'fv': X = np.array([o['fv'] for o in ons])
    elif kind == 'fv+basic': X = np.array([o['fv'] + [np.log2(o['cen']) * 3, o['low'] * 12] for o in ons])
    sd = X.std(0); sd[sd < 1e-6] = 1
    return (X - X.mean(0)) / sd if kind != 'basic' else X / np.array([1.0, 1.0, 1.5])

def cluster(ons, kind, kmax=3, minsil=0.0):
    ok = [o for o in ons if o['fv']]
    if len(ok) < 6: return None
    X = feats(ok, kind); best = None
    for k in range(2, kmax + 1):
        if len(ok) < 3 * k: break
        lab, _ = best_kmeans(X, k); s = silhouette(X, lab)
        if best is None or s > best[0]: best = (s, lab)
    if best is None or best[0] < minsil: return None
    return ok, best[1], best[0]

def strategy_vote(kind, kmax, minsil, share=0.0):
    def run(r):
        base = [f(o['cls']) for o in r['ons']]; c = cluster(r['ons'], kind, kmax, minsil)
        if not c: return base
        ok, lab, _ = c; out = dict((id(o), f(o['cls'])) for o in r['ons'])
        for j in set(lab):
            mem = [o for o, l in zip(ok, lab) if l == j]; cnt = collections.Counter(f(o['cls']) for o in mem); top, n = cnt.most_common(1)[0]
            if n / len(mem) >= share:
                for o in mem: out[id(o)] = top
        return [out[id(o)] for o in r['ons']]
    return run

def strategy_order(kind):   # three groups named by brightness: darkest = kick, brightest = hat
    def run(r):
        base = [f(o['cls']) for o in r['ons']]; c = cluster(r['ons'], kind, 3, 0.0)
        if not c: return base
        ok, lab, _ = c; ks = sorted(set(lab), key=lambda j: np.mean([np.log2(o['cen']) - 3 * o['low'] for o, l in zip(ok, lab) if l == j]))
        names = ['kick', 'snare', 'hat'] if len(ks) == 3 else None
        if not names: return base
        out = dict((id(o), f(o['cls'])) for o in r['ons'])
        for nm, j in zip(names, ks):
            for o, l in zip(ok, lab):
                if l == j: out[id(o)] = nm
        return [out[id(o)] for o in r['ons']]
    return run

S = {'today (each hit alone)': lambda r: [f(o['cls']) for o in r['ons']]}
for kind in ['basic', 'fv', 'fv+basic']:
    S[f'groups ({kind}), each group takes its most common name'] = strategy_vote(kind, 3, 0.0)
    S[f'groups ({kind}), up to 4 groups'] = strategy_vote(kind, 4, 0.0)
    S[f'groups ({kind}), only clear groupings (sil>0.25)'] = strategy_vote(kind, 3, 0.25)
    S[f'groups ({kind}), only groups that agree 60%+'] = strategy_vote(kind, 3, 0.0, 0.6)
    S[f'three groups ({kind}) named darkest to brightest'] = strategy_order(kind)
res = {}
for mode in ['Fixed', 'Personal']:
    print(f'== {mode} sounds')
    for name, fn in S.items():
        acc = collections.Counter(); tot = collections.Counter(); per = []
        for r in R:
            if r['mode'] != mode or not r['ons']: continue
            lab = fn(r); e = np.array([o['t'] for o in r['ons']]); a = n = 0
            for t, c in r['truth']:
                if c not in FAM: continue
                j = int(np.argmin(abs(e - t)))
                if abs(e[j] - t) <= 0.05: w = FAM[c]; tot[w] += 1; acc[w] += lab[j] == w; n += 1; a += lab[j] == w
            if n: per.append(a / n)
        print(f'   {sum(acc.values())/sum(tot.values()):.1%}  {name:58s} kick {acc["kick"]/tot["kick"]:.0%} snare {acc["snare"]/tot["snare"]:.0%} hat {acc["hat"]/tot["hat"]:.0%}   worst person {min(per):.0%}, median {np.median(per):.0%}')
        res[(mode, name)] = per
print('people who get better / worse than today, best grouping per mode:')
for mode in ['Fixed', 'Personal']:
    base = np.array(res[(mode, 'today (each hit alone)')])
    for name in S:
        if name.startswith('today'): continue
        d = np.array(res[(mode, name)]) - base
        print(f'   {mode:8s} {name:58s} better {int((d>0.02).sum())}, worse {int((d<-0.02).sum())}, biggest loss {d.min():+.0%}')
