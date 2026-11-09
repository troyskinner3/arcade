import json,glob,sys; sys.path.insert(0,'tools'); import score_user_lib as SU
REP={json.load(open(f))['prompt']:json.load(open(f)) for f in glob.glob('results/replay_hint/2-*.json')}; G=SU.guides(REP)
good=bad=0; t0=t1=N=0; per=[]
for pr,m in sorted(REP.items()):
    g=G.get(pr.split('-')[0]); est=m['heard']['notes']
    if not g or not est: continue
    e0,_=SU.best_edits(est,g); new=[]; tg=tb=0
    for n in est:
        cuts=[]
        for o in n.get('hs',[]):
            sp=[*new,*([{**n,'l':o}]),{**n,'s':n['s']+o,'l':n['l']-o}]
            # a hint is good if splitting there alone lowers the edits
            trial=[x for x in est if x is not n]+[{**n,'l':o},{**n,'s':n['s']+o,'l':n['l']-o}]
            if SU.best_edits(sorted(trial,key=lambda x:x['s']),g)[0]<e0: cuts.append(o); tg+=1
            else: tb+=1
        b=[0,*cuts,n['l']]; new+=[{**n,'s':n['s']+b[i],'l':b[i+1]-b[i]} for i in range(len(b)-1)]
    e1,_=SU.best_edits(sorted(new,key=lambda x:x['s']),g); t0+=e0; t1+=e1; N+=len(g); good+=tg; bad+=tb
    if tg or tb: per.append(f'{pr} {tg}+{tb}')
print('hints that help',good,'| stray',bad); print('taking the helpful ones:',round(10*t0/N,2),'->',round(10*t1/N,2)); print(per)
