# Score detected notes against ground truth with mir_eval (onset ±50 ms, pitch ±50 cents; offsets ignored and also with offsets).
import json, sys, os, csv, glob, numpy as np, mido, mir_eval, collections
S=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def gt_vocadito(f):
    k=os.path.basename(f)[:-4]; rows=list(csv.reader(open(f'{S}/data/vocadito/Annotations/Notes/{k}_notesA1.csv')))
    on=np.array([float(r[0]) for r in rows]); hz=np.array([float(r[1]) for r in rows]); du=np.array([float(r[2]) for r in rows])
    return np.c_[on,on+du], hz
def gt_humtrans(f):
    k=os.path.basename(f)[:-4]; m=mido.MidiFile(f'{S}/data/humtrans/midi_data/{k}.mid'); t=0; act={}; iv=[]; ps=[]
    for msg in m:
        t+=msg.time
        if msg.type=='note_on' and msg.velocity>0: act[msg.note]=t
        elif msg.type in('note_off','note_on') and msg.note in act: iv.append([act.pop(msg.note),t]); ps.append(msg.note)
    o=np.argsort([a for a,_ in iv]); return np.array(iv)[o], 440*2**((np.array(ps)[o]-69)/12)
def gt_vocalset(f):
    k=os.path.basename(f)[:-4]; lines=open(f'{S}/data/vocalset/ann/{k}.csv',encoding='utf-8',errors='ignore').read().splitlines()
    i=[j for j,l in enumerate(lines) if l.startswith('Sequence')][0]; iv=[]; ps=[]
    for r in csv.reader(lines[i+1:]):
        if len(r)>14 and r[4].strip()=='Sound' and r[14].strip():
            try: iv.append([float(r[1]),float(r[2])]); ps.append(float(r[14]))
            except ValueError: pass
    return np.array(iv), 440*2**((np.array(ps)-69)/12)
def gt(f): return gt_vocadito(f) if 'vocadito' in f else gt_vocalset(f) if 'vocalset' in f else gt_humtrans(f)
def score(ref_iv,ref_hz,est,shift=0.0, offs=False):
    if not len(est): return 0,0,0
    e=np.array(est); est_iv=e[:,:2]; est_hz=440*2**((np.round(e[:,2])+shift-69)/12)
    p,r,f,_=mir_eval.transcription.precision_recall_f1_overlap(ref_iv,ref_hz,est_iv,est_hz,onset_tolerance=0.05,pitch_tolerance=50,offset_ratio=0.2 if offs else None)
    return p,r,f
def best_shift(ref_iv,ref_hz,est):   # the same melody hummed in another key or octave still counts (transposition-invariant score)
    return max(((score(ref_iv,ref_hz,est,s)[2],s) for s in range(-12,13)), default=(0,0))[1]
def main(path, label=''):
    R=json.load(open(path)); agg=collections.defaultdict(list)
    for f,v in R.items():
        ri,rh=gt(f); est=v['notes']; ds='vocadito' if 'vocadito' in f else 'vocalset' if 'vocalset' in f else 'humtrans'
        if ds=='humtrans' and est:   # labels start at 0 s, recordings have a lead-in: align by the best single time shift (same for every method)
            eo=np.array([n[0] for n in est]); best=max(((mir_eval.onset.f_measure(ri[:,0]+d,eo,window=0.05)[0],d) for d in np.arange(-0.2,1.5,0.01)))[1]; ri=ri+best
        p,r,fm=score(ri,rh,est); s=best_shift(ri,rh,est); pi,ri2,fi=score(ri,rh,est,s); _,_,fo=score(ri,rh,est,s,True)
        # onset-only (ignore pitch): did we find the notes at the right times?
        on_f=mir_eval.onset.f_measure(ri[:,0],np.array([n[0] for n in est]) if est else np.array([]),window=0.05)[0] if len(est) else 0
        agg[ds].append(dict(f=fm,fi=fi,pi=pi,ri=ri2,fo=fo,on=on_f,cnt=len(est)/max(1,len(ri)),ms=v['ms']/max(0.1,v['dur'])))
    print(f'== {label or path}')
    for ds,L in agg.items():
        m=lambda k: np.mean([x[k] for x in L])
        print(f'  {ds:9s} n={len(L):3d} | note F1 {m("f"):.3f} | key-free F1 {m("fi"):.3f} (P {m("pi"):.3f} R {m("ri"):.3f}) | +offsets {m("fo"):.3f} | onset-only F1 {m("on"):.3f} | notes found/true {m("cnt"):.2f} | {m("ms"):.0f} ms per s of audio')
if __name__=='__main__': main(sys.argv[1], sys.argv[2] if len(sys.argv)>2 else '')
