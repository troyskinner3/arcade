# download every take from the owner's "Noodle takes" folder through the drop script (skips files already here)
import json, sys, os, base64, time, urllib.request, urllib.parse
U=os.environ['NOODLE_DROP_URL']; K=os.environ['NOODLE_DROP_KEY']; OUT=sys.argv[1]   # the drop script's URL and key stay out of the repo
def get(q):
    for i in range(4):
        try:
            r=urllib.request.urlopen(U+'?'+urllib.parse.urlencode({'k':K,**q}),timeout=120).read()
            return json.loads(r)
        except Exception as e: time.sleep(2*(i+1)); err=e
    raise err
files=get({'list':1})['files']; n=0
for f in files:
    p=os.path.join(OUT,f['name'])
    if os.path.exists(p) and os.path.getsize(p)==f['size'] and not f['name'].endswith('.json'): continue
    d=get({'get':f['name']}); open(p,'wb').write(base64.b64decode(d['b64'])); n+=1
print('listed',len(files),'downloaded',n)
