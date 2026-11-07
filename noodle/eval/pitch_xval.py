# Jump-correction model trained on the owner's re-sung takes of one tune group (+ synthetic singers), tested on the owner's
# REAL takes of the other group. Prints the test command results for both directions.
import os, sys, numpy as np, torch, subprocess; os.environ['REL']='1'; sys.path.insert(0,os.path.dirname(__file__)); import pitch_net as P
syn=P.build('results/syn2_app.json',[f'data/synthv2_{i}' for i in (1,2,3,4)])
for name,train_dir,test_re in (('A','data/synthuser_a','^(row|london|yankee|saints|farm|buns|joy)'),('B','data/synthuser_b','^(twinkle|scale|mary|jingle|ode|frere|birthday)')):
    X,Y,_=P.build(f'results/tp_app.json',[train_dir])
    w=int(os.environ.get('SYNW','1'))
    XX=X*4+(syn[0][:len(X)*w] if w else []); YY=Y*4+(syn[1][:len(Y)*w] if w else [])
    print('fold',name,'re-sung takes',len(X),'synthetic',len(XX)-4*len(X),flush=True)
    net=P.train(XX,YY,steps=int(os.environ.get('STEPS','1500')),lr=1e-3); path=f'results/pitchnet_tp{name}.pt'; torch.save(net.state_dict(),path)
    out=subprocess.run(['python3','tools/eval_pitchnet_user.py','results/replay_all',path],env={**os.environ,'ONLY':test_re},capture_output=True,text=True).stdout
    print('\n'.join(l for l in out.splitlines() if 'per 10' in l),flush=True)
