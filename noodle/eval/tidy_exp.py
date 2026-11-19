# "Tidy" rules on what Noodle heard (MIDI to MIDI), scored on the owner's guided takes (edits to reach the tune they meant).
# Usage: python3 tidy_exp.py <replay dir>   (from replay_fast.js)
import json,glob,sys,os,shutil,subprocess,collections
SRC=sys.argv[1]
def write(name,fn):
    d=f'/tmp/tidy_{name}'; shutil.rmtree(d,ignore_errors=True); os.makedirs(d)
    for f in glob.glob(SRC+'/2-*.json'):
        m=json.load(open(f)); ns=sorted(m['heard']['notes'],key=lambda n:n['s']); m['heard']['notes']=fn(ns,m); json.dump(m,open(d+'/'+os.path.basename(f),'w'))
    out=subprocess.run(['python3','score_user.py',d],capture_output=True,text=True).stdout.strip().split('\n')[-1]; print(f'{name:28s}',out.split('|')[0].split('=')[-1].strip(),'|',out.split('|')[-1].strip())
def short_join(L):
    def f(ns,m):
        out=[]
        for n in ns:
            pv=out[-1] if out else None
            if n['l']<=L and pv and n['s']-(pv['s']+pv['l'])<=1: pv['l']=n['s']+n['l']-pv['s']; continue
            out.append(dict(n))
        return out
    return f
def short_drop(L):
    return lambda ns,m:[n for n in ns if n['l']>L]
def grid8(ns,m):
    out=[]
    for n in ns:
        n=dict(n)
        if n['s']%2: n['s']-=1 if (out and out[-1]['s']<n['s']-1) else -1
        if out and n['s']<=out[-1]['s']: continue
        out.append(n)
    return out
def phrase_end_tonic(ns,m):
    if not ns: return ns
    tonic=collections.Counter([n['p']%12 for n in ns]).most_common(1)[0][0]   # rough: the most used pitch class
    triad={tonic,(tonic+4)%12,(tonic+3)%12,(tonic+7)%12}; out=[dict(n) for n in ns]
    for i,n in enumerate(out):
        last=i==len(out)-1 or out[i+1]['s']-(n['s']+n['l'])>=4
        if last and n['p']%12 not in triad:
            for d in (1,-1,2,-2):
                if (n['p']+d)%12 in triad: n['p']+=d; break
    return out
write('today',lambda ns,m:ns)
for L in (1,2): write(f'join notes <= {L} step',short_join(L)); write(f'drop notes <= {L} step',short_drop(L))
write('starts on the 8th grid',grid8)
write('phrase ends on home chord',phrase_end_tonic)
write('join <= 1, then 8th grid',lambda ns,m:grid8(short_join(1)(ns,m),m))
