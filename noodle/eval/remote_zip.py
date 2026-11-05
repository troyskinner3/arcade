import io, json, sys, os, zipfile, urllib.request, random, collections
URL='https://huggingface.co/datasets/dadinghh2/HumTrans/resolve/main/all_wav.zip'
OUT=sys.argv[1]; N=int(sys.argv[2])
class HF(io.RawIOBase):
    def __init__(s,url):
        s.url=url; s.pos=0
        r=urllib.request.urlopen(urllib.request.Request(url,method='HEAD')); s.url=r.geturl(); s.size=int(r.headers['Content-Length'])
    def seekable(s): return True
    def readable(s): return True
    def tell(s): return s.pos
    def seek(s,o,w=0):
        s.pos = o if w==0 else s.pos+o if w==1 else s.size+o; return s.pos
    def read(s,n=-1):
        if n<0: n=s.size-s.pos
        if n==0: return b''
        req=urllib.request.Request(s.url,headers={'Range':f'bytes={s.pos}-{s.pos+n-1}'}); d=urllib.request.urlopen(req).read(); s.pos+=len(d); return d
    def readinto(s,b):
        d=s.read(len(b)); b[:len(d)]=d; return len(d)
f=io.BufferedReader(HF(URL),buffer_size=1<<20); z=zipfile.ZipFile(f)
names=[n for n in z.namelist() if n.endswith('.wav')]
split=json.load(open(os.path.join(OUT,'split.json')))
test=set(split['TEST'])
cand=[n for n in names if os.path.basename(n)[:-4] in test]
print('wav entries',len(names),'test',len(cand))
by=collections.defaultdict(list)
for n in cand: by[os.path.basename(n).split('_')[0]].append(n)
random.seed(7); pick=[]
while len(pick)<N and any(by.values()):
    for p in sorted(by):
        if by[p] and len(pick)<N: pick.append(by[p].pop(random.randrange(len(by[p]))))
os.makedirs(os.path.join(OUT,'wav'),exist_ok=True)
for i,n in enumerate(pick):
    dst=os.path.join(OUT,'wav',os.path.basename(n))
    if not os.path.exists(dst): open(dst,'wb').write(z.read(n))
print('people',len(by),'downloaded',len(pick))
