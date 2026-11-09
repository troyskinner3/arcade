import json,numpy as np,sys,glob; sys.path.insert(0,'tools'); import score_user_lib as SU
R=json.load(open('results/nbest.json')); N=sum(r[1] for r in R)
REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob('results/replay_dbase/2-*.json')}; G=SU.guides(REP)
def learn(prs):   # the user's interval width from guided takes (sung vs guide), as learnSqueeze does
    xu=yu=xd=yd=0
    for pr in prs:
        m=REP[pr]; g=G[pr.split('-')[0]]; est=m['heard']['notes']
        pairs=[(e,min(g,key=lambda x:abs(x['s']-e['s']))) for e in est]; pairs=[(e,x) for e,x in pairs if abs(e['s']-x['s'])<=1]
        for (a,ga),(b,gb) in zip(pairs,pairs[1:]):
            if ga is gb: continue
            d=gb['p']-ga['p']; y=b['raw']-a['raw']
            if d>0: xu+=d*d; yu+=d*y
            elif d<0: xd+=d*d; yd+=d*y
    return yu/xu, yd/xd
def pa(al,c,sd): return 0 if al is None else -(((al[0]-c[0])**2)+((al[1]-c[1])**2))/(2*sd**2)
def run(sel,c,sd,mb):
    t=0
    for pr,n,app,s,meta,qs in sel:
        sc=[m[0]-pa(m[3],(1,1),0.15)+pa(m[3],c,sd)+(mb if m[2]=='major' else 0) for m in meta]
        t+=s[int(np.argmax(sc))]
    return t
print('learned width up/down on all takes:',[round(x,2) for x in learn([r[0] for r in R])])
print('today (center 1, sd .15):',round(10*run(R,(1,1),0.15,0)/N,2))
for mb in (0,1,2,4):
    for sd in (0.05,0.1,0.15):
        print('major bonus',mb,'sd',sd,'center learned:',round(10*run(R,learn([r[0] for r in R]),sd,mb)/N,2),' center 1:',round(10*run(R,(1,1),sd,mb)/N,2))
# honest: learn width from the OTHER tunes' takes, choose (sd, mb) on other tunes
groups=sorted({r[0].split('-')[0] for r in R}); tot=0; tot2=0
for g in groups:
    tr=[r for r in R if r[0].split('-')[0]!=g]; te=[r for r in R if r[0].split('-')[0]==g]; c=learn([r[0] for r in tr])
    best=min((run(tr,c,sd,mb),sd,mb) for sd in (0.05,0.1,0.15) for mb in (0,1,2,4)); tot+=run(te,c,best[1],best[2])
    best2=min((run(tr,c,sd,0),sd) for sd in (0.05,0.1,0.15)); tot2+=run(te,c,best2[1],0)
print('cross-validated by tune: learned width + major bonus',round(10*tot/N,2),'| learned width only',round(10*tot2/N,2))
