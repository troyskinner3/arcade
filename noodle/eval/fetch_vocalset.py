import io, sys, os, zipfile, urllib.request, random, collections
exec(open(os.path.join(os.path.dirname(__file__),'zip_list.py')).read().split("z=zipfile")[0])
A=zipfile.ZipFile(io.BufferedReader(HF('https://zenodo.org/api/records/7061507/files/Annotated%20VocalSet.zip/content'),buffer_size=1<<20))
W=zipfile.ZipFile(io.BufferedReader(HF('https://zenodo.org/api/records/1193957/files/VocalSet.zip/content'),buffer_size=1<<20))
wav={os.path.basename(n)[:-4]:n for n in W.namelist() if n.endswith('.wav')}
csv=[n for n in A.namelist() if n.endswith('.csv') and 'with file header' in n]
keep_tech={'straight','vibrato','breathy','belt','fast_forte','slow_piano','lip_trill','slow_forte','fast_piano','forte'}
cand=[n for n in csv if n.split('/')[3] in keep_tech and os.path.basename(n)[:-4].strip() in wav]
random.seed(11); random.shuffle(cand)
# stratify: songs first (row/caro/dona), then spread over singer x technique x exercise
pick=[]; seen=collections.Counter()
for n in sorted(cand,key=lambda n: 0 if any(s in n for s in ('_row','_caro','_dona')) else 1):
    b=os.path.basename(n)[:-4]; singer=b.split('_')[0]; ex=b.split('_')[1]; tech=n.split('/')[3]
    k=(singer,ex if ex in ('row','caro','dona') else ex+tech)
    if seen[k]>=1 or seen[singer]>=8: continue
    seen[k]+=1; seen[singer]+=1; pick.append(n)
    if len(pick)>=int(sys.argv[1]): break
for n in pick:
    b=os.path.basename(n)[:-4].strip()
    open(f'data/vocalset/ann/{b}.csv','wb').write(A.read(n))
    if not os.path.exists(f'data/vocalset/wav/{b}.wav'): open(f'data/vocalset/wav/{b}.wav','wb').write(W.read(wav[b]))
print('picked',len(pick),collections.Counter(os.path.basename(n).split('_')[1] for n in pick))
