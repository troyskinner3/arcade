# Compare drum sorting strategies on held-out AVP people (right drum among hits found within 50 ms), plus detection sensitivity.
import json, numpy as np, collections, mir_eval
R=json.load(open('results/avp_hybrid.json')); FAM={'kd':'kick','sd':'snare','hhc':'hat','hho':'hat'}
f=lambda c:{'clap':'snare'}.get(c,c)
S={ 'rules (today)':lambda r,i:f(r['rule'][i]),
    'examples, 3-way':lambda r,i:r['k3'][i],
    'rules for hat, examples for kick vs snare':lambda r,i:'hat' if f(r['rule'][i])=='hat' else r['ks'][i],
    'rules for kick, examples for snare vs hat':lambda r,i:'kick' if f(r['rule'][i])=='kick' else r['sh'][i],
    'examples unless rules say kick or hat':lambda r,i:f(r['rule'][i]) if f(r['rule'][i]) in ('kick',) else r['k3'][i] }
for mode in ['Fixed','Personal']:
    print(f'== {mode} sounds (people the examples were not built from)')
    for name,fn in S.items():
        acc=collections.Counter(); tot=collections.Counter()
        for r in R:
            if r['mode']!=mode: continue
            e=np.array(r['t'])
            for t,c in r['truth']:
                if c not in FAM or not len(e): continue
                j=int(np.argmin(abs(e-t)))
                if abs(e[j]-t)<=0.05: w=FAM[c]; tot[w]+=1; acc[w]+=fn(r,j)==w
        print(f'   {sum(acc.values())/sum(tot.values()):.0%}  {name:42s} kick {acc["kick"]/tot["kick"]:.0%} snare {acc["snare"]/tot["snare"]:.0%} hat {acc["hat"]/tot["hat"]:.0%}')
    print('   hits found (F1) by detection sensitivity:', ', '.join(f'{s}: {np.mean([mir_eval.onset.f_measure(np.sort(np.array([t for t,c in r["truth"] if c in FAM])),np.sort(np.array(r["sens"][s])),window=0.05)[0] for r in R if r["mode"]==mode]):.3f}' for s in ['35','45','55','65','75']))
