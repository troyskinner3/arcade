#!/usr/bin/env python3
"""Download CC0 / CC BY recordings of people humming, singing and whistling from Freesound, for Noodle research.
Run on your Mac:   FREESOUND_KEY=your_api_key python3 fetch_freesound.py
Needs only Python 3 (no extra installs). Saves ~/NoodleFreesound/<id>.mp3 (128 kbps previews) plus credits.csv.
Stays well inside Freesound's limits (under 60 requests a minute, under 2,000 a day) and skips sounds whose
uploader opted out of AI training. Safe to stop and re-run: it skips what it already has."""
import json, os, sys, time, csv, urllib.request, urllib.parse
KEY=os.environ.get('FREESOUND_KEY') or sys.exit('Set FREESOUND_KEY first (your Freesound API key).')
OUT=os.path.expanduser('~/NoodleFreesound'); os.makedirs(OUT,exist_ok=True)
QUERIES=['humming','humming melody','hum tune','whistling melody','whistling tune','whistle song','a cappella singing',
         'female voice singing melody','male voice singing melody','singing solo voice','vocal melody','sung melody',
         'la la la singing','child singing','lullaby sung','folk song sung','beatbox']
LIMIT=int(os.environ.get('LIMIT','800')); last=[0.0]
def get(url, raw=False):
    wait=1.1-(time.time()-last[0]);   time.sleep(max(0,wait)); last[0]=time.time()
    req=urllib.request.Request(url,headers={'Authorization':'Token '+KEY,'User-Agent':'NoodleResearch/1.0'})
    with urllib.request.urlopen(req,timeout=60) as r: return r.read() if raw else json.loads(r.read())
seen={}; creds=os.path.join(OUT,'credits.csv')
if os.path.exists(creds):
    for row in csv.DictReader(open(creds)): seen[row['id']]=row
fields='id,name,username,license,url,duration,tags,previews,gen_ai_preference'
for q in QUERIES:
    page=1
    while len(seen)<LIMIT and page<=5:
        params={'query':q,'page':page,'page_size':150,'fields':fields,
                'filter':'license:("Creative Commons 0" OR "Attribution") duration:[3 TO 90]'}
        try: d=get('https://freesound.org/apiv2/search/text/?'+urllib.parse.urlencode(params))
        except Exception as e: print('search failed',q,e); break
        for s in d.get('results',[]):
            sid=str(s['id'])
            if sid in seen or s.get('gen_ai_preference')=='no-gen-ai': continue
            p=os.path.join(OUT,sid+'.mp3')
            try:
                if not os.path.exists(p): open(p,'wb').write(get(s['previews']['preview-hq-mp3'],raw=True))
            except Exception as e: print('skip',sid,e); continue
            seen[sid]=dict(id=sid,name=s['name'],username=s['username'],license=s['license'],url=s['url'],duration=s['duration'],
                           tags=' '.join(s.get('tags',[])[:12]),query=q)
            if len(seen)%25==0:
                print(len(seen),'sounds…'); 
                with open(creds,'w',newline='') as f: w=csv.DictWriter(f,fieldnames=list(next(iter(seen.values())).keys())); w.writeheader(); w.writerows(seen.values())
            if len(seen)>=LIMIT: break
        if not d.get('next'): break
        page+=1
with open(creds,'w',newline='') as f: w=csv.DictWriter(f,fieldnames=['id','name','username','license','url','duration','tags','query']); w.writeheader(); w.writerows(seen.values())
print('done:',len(seen),'sounds in',OUT)
