# Parse the folk ABC collection into (key tonic, mode, [(midi, quarterLength, offsetInBar, barLength)]) per tune.
import sys, os, glob, json, re, warnings
from concurrent.futures import ProcessPoolExecutor
warnings.filterwarnings('ignore')
def split_tunes(text):
    parts=re.split(r'(?m)^(?=X:)', text); return [p for p in parts if p.startswith('X:')]
def parse(tune):
    import music21
    try:
        s=music21.converter.parse(tune, format='abc')
        k=s.analyze('key') if not s.flatten().getElementsByClass('KeySignature') else None
        ks=s.flatten().getElementsByClass('Key') or s.flatten().getElementsByClass('KeySignature')
        key=s.analyze('key')
        notes=[]
        for n in s.flatten().notesAndRests:
            if n.isRest: notes.append([None, float(n.quarterLength), float(n.beat)]); continue
            if n.isChord: n=n.notes[-1]
            notes.append([n.pitch.midi, float(n.quarterLength), float(n.beat)])
        ts=s.flatten().getElementsByClass('TimeSignature'); bar=ts[0].barDuration.quarterLength if ts else 4.0
        return {'tonic':key.tonic.pitchClass,'mode':key.mode,'bar':float(bar),'notes':notes}
    except Exception as e: return None
if __name__=='__main__':
    root,out=sys.argv[1:3]; tunes=[]
    for f in glob.glob(root+'/**/*.abc',recursive=True):
        try: tunes+=split_tunes(open(f,encoding='utf-8',errors='ignore').read())
        except Exception: pass
    with ProcessPoolExecutor(4) as ex: res=[r for r in ex.map(parse,tunes,chunksize=20) if r and len(r['notes'])>=8]
    json.dump(res,open(out,'w')); print('tunes',len(tunes),'parsed',len(res))
