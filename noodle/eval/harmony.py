# A simple chord part for a melody, the way a person might add one: one triad from the key per window, chosen to cover the
# melody's notes in that window (duration-weighted, strong beats count double); ties go to I, then V, then IV.
MAJ=[0,2,4,5,7,9,11]; MIN=[0,2,3,5,7,8,10]
def triads(tonic, mode):
    sc=MAJ if mode=='major' else MIN; out=[]
    for d in range(6):  # I ii iii IV V vi (or minor equivalents)
        out.append((d,{(tonic+sc[d])%12,(tonic+sc[(d+2)%7])%12,(tonic+sc[(d+4)%7])%12}))
    return out
PREF={0:0.3,4:0.2,3:0.15,5:0.05,1:0.02,2:0.0}
def harmonize(notes, tonic, mode, win):
    """notes: [(start, length, midi)] in any time unit; win: window length in that unit. returns [(t0,t1,set_of_pcs)]"""
    if not notes: return []
    end=max(s+l for s,l,_ in notes); out=[]; T=triads(tonic,mode); t=0
    while t<end:
        sc={}
        for d,ch in T:
            v=PREF[d]
            for s,l,p in notes:
                ov=min(s+l,t+win)-max(s,t)
                if ov>0: v+=ov*(2 if abs(s-t)<1e-6 or abs(s-(t+win/2))<1e-6 else 1)*(1 if p%12 in ch else -0.5)
            sc[d]=v
        best=max(sc,key=sc.get); out.append((t,t+win,dict(T)[best])); t+=win
    return out
def chord_at(H, t):
    for a,b,ch in H:
        if a<=t<b: return ch
    return None
