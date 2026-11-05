# VocalSet: note F1 (key-free not needed: sung at written pitch) by exercise and by technique
import json, sys, collections, numpy as np; sys.path.insert(0,'tools'); from score import gt, score
import mir_eval
def cat(f):
    b=f.split('/')[-1][:-4]; ex=b.split('_')[1].replace('arepggios','arpeggios')
    tech=[t for t in ['lip_trill','fast_forte','fast_piano','slow_forte','slow_piano','straight','vibrato','breathy','belt','forte'] if t in b]
    return ('song' if ex in ('row','caro','dona') else ex), (tech[0] if tech else 'other')
for path in sys.argv[1:]:
    R=json.load(open(path)); by=collections.defaultdict(list)
    for f,v in R.items():
        if 'vocalset' not in f: continue
        ri,rh=gt(f); f1=score(ri,rh,v['notes'])[2]; on=mir_eval.onset.f_measure(ri[:,0],np.array([n[0] for n in v['notes']]),window=0.05)[0] if v['notes'] else 0
        ex,tech=cat(f); by['ex:'+ex].append((f1,on)); by['tech:'+tech].append((f1,on)); by['ALL'].append((f1,on))
    print('==',path.split('/')[-1]); print('   '+'  '.join(f"{k} {np.mean([a for a,_ in v]):.2f}/{np.mean([b for _,b in v]):.2f}(n{len(v)})" for k,v in sorted(by.items())))
