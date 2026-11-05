import io, sys, zipfile, urllib.request, collections
class HF(io.RawIOBase):
    def __init__(s,url):
        r=urllib.request.urlopen(urllib.request.Request(url,method='HEAD')); s.url=r.geturl(); s.size=int(r.headers['Content-Length']); s.pos=0
    def seekable(s): return True
    def readable(s): return True
    def tell(s): return s.pos
    def seek(s,o,w=0): s.pos=o if w==0 else s.pos+o if w==1 else s.size+o; return s.pos
    def read(s,n=-1):
        if n<0: n=s.size-s.pos
        if n==0: return b''
        d=urllib.request.urlopen(urllib.request.Request(s.url,headers={'Range':f'bytes={s.pos}-{s.pos+n-1}'})).read(); s.pos+=len(d); return d
    def readinto(s,b): d=s.read(len(b)); b[:len(d)]=d; return len(d)
z=zipfile.ZipFile(io.BufferedReader(HF(sys.argv[1]),buffer_size=1<<20)); names=z.namelist()
print(len(names),'entries'); c=collections.Counter(n.rsplit('.',1)[-1] for n in names); print(c.most_common(8))
for n in names[:int(sys.argv[2]) if len(sys.argv)>2 else 15]: print('  ',n)
