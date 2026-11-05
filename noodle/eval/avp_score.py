# Score AVP beatbox results: onset F1 (50 ms) and drum accuracy on matched hits, untaught vs taught.
import json, numpy as np, collections, mir_eval
R=json.load(open('results/avp.json'))
FAM={'kd':'kick','sd':'snare','hhc':'hat','hho':'hat'}
def fam(c): return {'kick':'kick','snare':'snare','clap':'snare','hat':'hat','hho':'hat'}.get(c,c)
for mode in ['Fixed','Personal']:
    for kind in ['untaught','taught']:
        F=[]; acc=collections.Counter(); tot=collections.Counter(); conf=collections.Counter()
        for r in R:
            if r['mode']!=mode: continue
            ref=np.array([t for t,_ in r['truth']]); est=r[kind]; e=np.array([t for t,_ in est]) if est else np.array([])
            F.append(mir_eval.onset.f_measure(ref,e,window=0.05)[0] if len(e) else 0)
            for t,c in r['truth']:
                if not len(e): continue
                j=int(np.argmin(abs(e-t)))
                if abs(e[j]-t)<=0.05:
                    want=FAM.get(c,c); got=fam(est[j][1]); tot[want]+=1; acc[want]+=want==got; conf[(want,got)]+=1
        a=sum(acc.values())/max(1,sum(tot.values()))
        print(f'{mode:8s} {kind:8s} hits found F1 {np.mean(F):.3f} | right drum {a:.0%} | by drum: '+', '.join(f'{k} {acc[k]/max(1,tot[k]):.0%} (n{tot[k]})' for k in ['kick','snare','hat']))
        worst=sorted(((v,k) for k,v in conf.items() if k[0]!=k[1]),reverse=True)[:3]; print('          most common mix-ups:', ', '.join(f'{w}→{g} {v}' for v,(w,g) in worst))
