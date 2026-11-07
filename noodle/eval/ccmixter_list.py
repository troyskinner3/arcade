# List ccMixter a cappella uploads licensed CC BY (isolated real vocals), small pages (the API's big pages fail here)
import json, subprocess, collections, sys
out=[]; off=0; bad=0
def get(u):
    r=subprocess.run(['curl','-sS','-m','90',u],capture_output=True)
    return json.loads(r.stdout.decode('utf-8',errors='replace'))
while off<1600:
    try: d=get(f"https://ccmixter.org/api/query?tags=acappella&lic=by&limit=10&offset={off}&f=json")
    except Exception:
        d=[]
        for k in range(10):
            try: d+=get(f"https://ccmixter.org/api/query?tags=acappella&lic=by&limit=1&offset={off+k}&f=json")
            except Exception: bad+=1
    if not d: break
    for x in d:
        fs=[f for f in x.get('files',[]) if (f.get('download_url') or '').lower().endswith(('.mp3','.wav','.flac'))]
        if fs: out.append(dict(id=x.get('upload_id'),name=x.get('upload_name'),artist=x.get('user_name'),license=x.get('license_name'),license_url=x.get('license_url'),
                        tags=x.get('upload_tags'),page=x.get('file_page_url'),url=fs[0]['download_url'],size=fs[0].get('file_rawsize')))
    off+=10
json.dump(out,open(sys.argv[1],'w'),indent=0)
print('tracks',len(out),'skipped',bad); print(collections.Counter(x['license'] for x in out).most_common(5))
tg=collections.Counter(t for x in out for t in (x['tags'] or '').split(',') if t); print([t for t,_ in tg.most_common(50)])
print('GB', round(sum(int(x['size'] or 0) for x in out)/1e9,1))
