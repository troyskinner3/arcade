# Genre- and section-aware material for Finish song (round 29), from three sources the owner approved (26 Nov):
#   Chordonomicon (Kantarelis et al. 2024, MIT): chord sequences of ~680k songs with section tags and genres -> 4-chord loops per genre,
#     section type and mode (Roman numerals; only loops Noodle plays as written: a root in the key keeps the key's own chord, one outside it
#     is major). The authors' position, which the owner agrees with: chord progressions are not copyrightable.
#   McGill Billboard (Burgoyne, Wild & Fujinaga 2011, CC0): bar-by-bar chords with section labels -> harmonic rhythm per section type
#     (where in 4 bars the chord changes).
#   Groove MIDI Dataset (Gillick et al. 2019, Google, CC BY 4.0): drummers' grooves and fills by style -> 1-bar kick/snare/hat patterns.
# usage: python3 -I train_genre.py <chordonomicon.csv> <billboard_dir> <groove_dir> <out.json>
import sys, csv, json, re, collections, os
import mido

NOTE={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
SC={'maj':[0,2,4,5,7,9,11],'min':[0,2,3,5,7,8,10]}
def diat_q(mode,r):
    sc=SC[mode]
    if r not in sc: return 'M'
    d=sc.index(r); third=(sc[(d+2)%7]-r)%12; fifth=(sc[(d+4)%7]-r)%12
    return 'M' if third==4 else ('d' if fifth==6 else 'm')
GENRE={'pop':'pop','pop rock':'pop','rock':'rock','alternative':'rock','punk':'rock','metal':'rock','country':'country','rap':'hiphop','soul':'rnb','reggae':'latin','electronic':'electronic'}
SECT={'intro':'intro','verse':'verse','chorus':'chorus','bridge':'bridge','outro':'outro','solo':'solo','instrumental':'solo','interlude':'bridge','prechorus':'pre','pre':'pre'}

def parse_chord(t):
    m=re.match(r'^([A-G])(s|b)?(.*)$',t)
    if not m: return None
    r=(NOTE[m.group(1)]+(1 if m.group(2)=='s' else -1 if m.group(2)=='b' else 0))%12; q=m.group(3).split('/')[0]
    if q.startswith('min') or (q.startswith('m') and not q.startswith('maj')): return (r,'m')
    if 'dim' in q: return (r,'d')
    return (r,'M')

def key_of(chs):
    best=None
    for t in range(12):
        for mode in ('maj','min'):
            sc=0
            for r,q in chs:
                rel=(r-t)%12; sc+= 1 if diat_q(mode,rel)==q and rel in SC[mode] else -1
            if chs and (chs[0][0]-t)%12==0: sc+=2
            if chs and (chs[-1][0]-t)%12==0: sc+=1
            if mode=='min': sc-=0.5   # a tie is major (relative keys share chords)
            if best is None or sc>best[0]: best=(sc,t,mode)
    return best[1],best[2]

def chordonomicon(path):
    csv.field_size_limit(10**9)
    prog=collections.defaultdict(collections.Counter); songs=0
    with open(path,newline='') as f:
        for row in csv.DictReader(f):
            g=GENRE.get(row['main_genre'])
            if not g: continue
            secs=[]; cur=None
            for tok in row['chords'].split():
                m=re.match(r'^<([a-z]+)_\d+>$',tok)
                if m: cur=[SECT.get(m.group(1)),[]]; secs.append(cur); continue
                c=parse_chord(tok)
                if c and cur is not None: cur[1].append(c)
            allc=[c for s in secs for c in s[1]]
            if len(allc)<8: continue
            t,mode=key_of(allc); songs+=1; seen=set()
            for s,chs in secs:
                if not s: continue
                seq=[]
                for r,q in chs:
                    x=((r-t)%12,q)
                    if not seq or seq[-1]!=x: seq.append(x)
                if len(seq)<2: continue
                loop=(seq*4)[:4]   # the section's first four chords (a 2- or 3-chord section repeats)
                if any(q!=diat_q(mode,r) for r,q in loop): continue
                key=(g,s,mode,','.join(str(r) for r,_ in loop))
                if key in seen: continue
                seen.add(key); prog[(g,s,mode)][key[3]]+=1
    out={}
    for (g,s,mode),c in prog.items():
        top=[[k,v] for k,v in c.most_common(40) if v>=5]
        if top: out.setdefault(g,{}).setdefault(s,{})[mode]=top
    return out,songs

def billboard(root):
    rhy=collections.defaultdict(collections.Counter); songs=0
    for d in sorted(os.listdir(root)):
        p=os.path.join(root,d,'salami_chords.txt')
        if not os.path.exists(p): continue
        lines=open(p,errors='ignore').read().splitlines()
        if not any(l.startswith('# metre: 4/4') for l in lines): continue
        songs+=1; sect=None; bars=[]
        for l in lines:
            if l.startswith('#') or '|' not in l: continue
            parts=l.split('\t',1)[1]
            m=re.match(r'^\s*[A-Z]\'*,\s*([a-z\-]+),',parts)
            if m:
                s=SECT.get(m.group(1).replace('-',''))
                if bars and sect: rhy_add(rhy,sect,bars)
                sect=s; bars=[]
            for bar in re.findall(r'\|([^|]+)(?=\|)',parts):
                toks=[x for x in bar.split() if x]
                if not toks or len(toks) not in (1,2,4): bars.append(None); continue
                bars.append(toks)
        if bars and sect: rhy_add(rhy,sect,bars)
    out={s:[[k,v] for k,v in c.most_common(12) if v>=3] for s,c in rhy.items()}
    return out,songs
def rhy_add(rhy,sect,bars):
    for w in range(0,len(bars)-3,4):
        win=bars[w:w+4]
        if any(b is None for b in win): continue
        prev=None; starts=[]
        for i,b in enumerate(win):
            step=16//len(b)
            for j,tk in enumerate(b):
                c=prev if tk=='.' else tk
                if c!=prev or (i==0 and j==0): starts.append(i*16+j*step)
                prev=c
        if 2<=len(starts)<=8: rhy[sect][','.join(map(str,starts))]+=1

KICK={35,36}; SNARE={37,38,40}; HAT={42,44,46,22,26,51,53,59}
def groove(root):
    info=list(csv.DictReader(open(os.path.join(root,'info.csv'))))
    pat=collections.defaultdict(collections.Counter); fills=collections.defaultdict(collections.Counter); n=0
    for r in info:
        if r['time_signature']!='4-4': continue
        style=r['style'].split('/')[0]; st={'afrocuban':'latin','neworleans':'funk','soul':'funk','gospel':'funk','afrobeat':'latin','dance':'pop','highlife':'latin'}.get(style,style)
        mf=mido.MidiFile(os.path.join(root,r['midi_filename'])); tpb=mf.ticks_per_beat; q=tpb/4; hits=[]
        t=0
        for m in mido.merge_tracks(mf.tracks):
            t+=m.time
            if m.type=='note_on' and m.velocity>0: hits.append((t,m.note,m.velocity))
        if not hits: continue
        n+=1; bars=collections.defaultdict(lambda:{'k':set(),'s':set(),'h':set()})
        for t,note,v in hits:
            s=round(t/q); b,step=divmod(s,16)
            d='k' if note in KICK else 's' if note in SNARE else 'h' if note in HAT else None
            if d and v>=40: bars[b][d].add(step)
        for b,p in bars.items():
            if not p['k'] and not p['s']: continue
            key='|'.join(d+':'+','.join(map(str,sorted(p[d]))) for d in 'ksh')
            (fills if r['beat_type']=='fill' else pat)[st][key]+=1
    out={}
    for st,c in pat.items():
        top=[[k,v] for k,v in c.most_common(30) if v>=2]
        if top: out[st]={'beat':top, 'fill':[[k,v] for k,v in fills[st].most_common(10) if v>=1]}
    return out,n

def main(chordo,bbdir,gdir,outp):
    prog,ns=chordonomicon(chordo); rhy,nb=billboard(bbdir); drums,ng=groove(gdir)
    res={'about':'Finish song by genre and section, learned from Chordonomicon (Kantarelis et al. 2024, MIT; chord progressions), '
                 'the McGill Billboard annotations (Burgoyne, Wild & Fujinaga 2011, CC0; harmonic rhythm) and the Groove MIDI Dataset '
                 '(Gillick, Roberts, Engel, Eck & Bamman 2019, Google, CC BY 4.0; drum grooves and fills). Chords in semitones above the key.',
         'v':1,'songs':{'chordonomicon':ns,'billboard':nb,'groove':ng},'prog':prog,'rhythm':rhy,'drums':drums}
    json.dump(res,open(outp,'w'),separators=(',',':'))
    print('songs',res['songs'],'genres',{g:{s:sum(len(v) for v in m.values()) for s,m in d.items()} for g,d in prog.items()},file=sys.stderr)
    print('rhythm',{s:v[:3] for s,v in rhy.items()},file=sys.stderr)
    print('drums',{s:(len(v['beat']),len(v['fill'])) for s,v in drums.items()},file=sys.stderr)
    for g in ('pop','hiphop'):
        for s in ('verse','chorus'):
            print(g,s,prog.get(g,{}).get(s,{}).get('maj',[])[:5],file=sys.stderr)

if __name__=='__main__': main(*sys.argv[1:5])
