# "Sounds musical" measures of a replay (no reference tune needed): share of note starts on the 8th grid, of strong-beat notes that are chord
# notes of the bar's best-fitting chord, tiny notes, leaps of more than a fifth, phrases ending on the home chord.
import json,glob,sys,collections
def stats(D):
    tot=collections.Counter()
    for f in glob.glob(D+'/2-*.json'):
        ns=sorted(json.load(open(f))['heard']['notes'],key=lambda n:n['s'])
        if len(ns)<3: continue
        pcs=collections.Counter(n['p']%12 for n in ns); tonic=max(range(12),key=lambda t:sum(pcs[(t+d)%12] for d in (0,2,4,5,7,9,11))+2*pcs[t])
        bars=collections.defaultdict(list)
        for n in ns: bars[n['s']//16].append(n)
        for b,bn in bars.items():
            w=collections.Counter(); [w.update({n['p']%12:n['l']}) for n in bn]
            best=max(range(12),key=lambda r:sum(w[(r+d)%12] for d in (0,4,7))+sum(w[(r+d)%12] for d in (0,3,7)))
            ch={best,(best+4)%12,(best+7)%12,(best+3)%12}
            for n in bn:
                if n['s']%8==0: tot['strong']+=1; tot['strong_chord']+=n['p']%12 in ch
        for i,n in enumerate(ns):
            tot['notes']+=1; tot['grid8']+=n['s']%2==0; tot['tiny']+=n['l']<=1
            if i: tot['bigleap']+=abs(n['p']-ns[i-1]['p'])>7
        tot['ends']+=1; tot['ends_home']+=(ns[-1]['p']-tonic)%12 in (0,4,7,3)
    return {'starts on 8th grid':f"{tot['grid8']/tot['notes']:.0%}", 'strong beats on chord notes':f"{tot['strong_chord']/max(1,tot['strong']):.0%}",
            'tiny notes':tot['tiny'], 'leaps over a fifth':tot['bigleap'], 'endings on home chord':f"{tot['ends_home']}/{tot['ends']}", 'notes':tot['notes']}
for d in sys.argv[1:]: print(d, stats(d))
