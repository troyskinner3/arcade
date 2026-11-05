# Score every variant file from a sweep (prefix_*.json) and print a compact table: key-free note F1 per dataset and the mean.
import sys, glob, json, os, io, contextlib, numpy as np
sys.path.insert(0, os.path.dirname(__file__)); import score as S
rows=[]
for path in sorted(glob.glob(sys.argv[1]+'_*.json')):
    name=path[len(sys.argv[1])+1:-5]; buf=io.StringIO()
    with contextlib.redirect_stdout(buf): S.main(path,name)
    vals={}
    for line in buf.getvalue().splitlines()[1:]:
        ds=line.split()[0]; vals[ds]=dict(fi=float(line.split('key-free F1 ')[1].split()[0]), on=float(line.split('onset-only F1 ')[1].split()[0]), cnt=float(line.split('notes found/true ')[1].split()[0]))
    rows.append((np.mean([v['fi'] for v in vals.values()]), name, vals))
for m,name,v in sorted(rows,reverse=True):
    print(f'{m:.3f}  {name:28s} ' + '  '.join(f"{ds[:4]} F1 {x['fi']:.3f} on {x['on']:.3f} n/true {x['cnt']:.2f}" for ds,x in v.items()))
