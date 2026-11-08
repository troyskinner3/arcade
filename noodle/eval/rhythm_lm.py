# Rhythm model from ~7,000 folk tunes (4/4 only): P(note length in 16ths | where it starts in the bar), with add-one smoothing.
# Used to decide whether a long hummed note is one held note or repeated notes split on beats, together with the note
# reader's evidence at each possible split (so rhythm alone cannot split a note the sound gives no hint for).
import json, sys, os, glob, collections, numpy as np, torch; sys.path.insert(0,os.path.dirname(__file__))
def build_lm(corpus='results/corpus.json'):
    C=np.ones((16,33))
    for t in json.load(open(corpus)):
        if abs(t['bar']-4.0)>1e-6: continue
        for p,ql,beat in t['notes']:
            if p is None: continue
            if not (np.isfinite(beat) and np.isfinite(ql)): continue
            pos=int(round((beat-1)*4))%16; d=int(round(ql*4))
            if 1<=d<=32: C[pos,d]+=1
    return np.log(C/C.sum(1,keepdims=True))
def best_split(n, LM, ev, lam):
    """n: recorded note (s,l in 16ths). ev(step)->log-odds that a new note starts there (audio). Try splits on beats."""
    s,l=n['s'],n['l']; cands=[c for c in range(s+4,s+l,4) if c%4==0]
    if l<8 or not cands: return [n]
    best=(LM[s%16,min(l,32)],[])
    from itertools import combinations
    for k in range(1,min(3,len(cands))+1):
        for cut in combinations(cands,k):
            b=[s,*cut,s+l]; sc=sum(LM[b[i]%16,min(b[i+1]-b[i],32)] for i in range(len(b)-1))+lam*sum(ev(c) for c in cut)
            if sc>best[0]: best=(sc,list(cut))
    b=[s,*best[1],s+l]; return [{**n,'s':b[i],'l':b[i+1]-b[i]} for i in range(len(b)-1)]
if __name__=='__main__':
    import score_user_lib as SU; from intent_net2 import featurize, Net
    LM=build_lm(); print('P(length | starts on beat 1), in 16ths:',{d:round(float(np.exp(LM[0,d])),3) for d in (2,4,6,8,12,16)})
    FR=json.load(open('results/user_frames.json')); REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob('results/replay_all/2-*.json')}; G=SU.guides(REP)
    src={}
    for f in sorted(glob.glob('data/user/2*.json')):
        m=json.load(open(f))
        if m.get('prompt') in REP and os.path.basename(f.replace('.json','.wav')) in FR: src[m['prompt']]=f.replace('.json','.wav')
    net=None; cache={}
    for pr,m in REP.items():
        if pr not in src: continue
        fr=FR[os.path.basename(src[pr])]; X=featurize(src[pr],fr,float(m['bpm']),m['al'],4.0)
        if net is None: net=Net(X.shape[1]); net.load_state_dict(torch.load('results/intent2.pt')); net.eval()
        with torch.no_grad(): cache[pr]=(np.array(fr)[:,0],torch.sigmoid(net(torch.tensor(X[None])))[0].numpy()[:,0])
    for lam in (0.0,0.3,0.6,1.0,2.0):
        tot=[0,0]; N=0; ch=[]
        for pr,m in sorted(REP.items()):
            g=G.get(pr.split('-')[0]); est=m['heard']['notes']
            if not g or not est or pr not in cache: continue
            t,P=cache[pr]; sd=60/float(m['bpm'])/4
            def ev(step):
                tt=m['al']+step*sd; w=(t>tt-0.06)&(t<tt+0.06); p=float(P[w].max()) if w.any() else 0.05; p=min(max(p,1e-3),1-1e-3); return np.log(p/(1-p))
            new=[y for x in est for y in (best_split(x,LM,ev,lam) if not x['x'] else [x])]
            N+=len(g); e0=SU.best_edits(est,g)[0]; e1=SU.best_edits(new,g)[0]; tot[0]+=e0; tot[1]+=e1
            if e0!=e1: ch.append(f'{pr} {e0}->{e1}')
        print(f'audio weight {lam}: {10*tot[0]/N:.2f} -> {10*tot[1]/N:.2f} |',', '.join(ch))
