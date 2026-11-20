# Write the tables musical.js loads: compact counts (interval model orders 0-2, chord fit, phrase/last-note degrees, onsets).
import sys,json,pickle
c=pickle.load(open(sys.argv[1],'rb')); M=json.load(open(sys.argv[2])); MIN2=int(sys.argv[4]); MIN1=int(sys.argv[5])
import math
A='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'; QS=0.22
def q(n): return 0 if n<=0 else min(63,1+round(math.log(n)/QS))
def dq(k): return 0 if k==0 else math.exp((k-1)*QS)
def enc(C): return ''.join(A[q(C.get(iv,0))] for iv in range(-12,13))
def deq(C): return {iv:dq(q(C.get(iv,0))) for iv in range(-12,13) if C.get(iv,0)>0}
out={'v':1,'qs':QS,'o0':{},'o1':{},'o2':{}}
for k,C in c[0].items(): out['o0'][f'{k[0][:3]},{k[1]}']=enc(C)
for k,C in c[1].items():
    if sum(C.values())>=MIN1: out['o1'][f'{k[0][:3]},'+','.join(map(str,k[1:]))]=enc(C)
for k,C in c[2].items():
    if sum(C.values())>=MIN2: out['o2'][f'{k[0][:3]},'+','.join(map(str,k[1:]))]=enc(C)
out['ch']=M['ch']; out['end']={k[:3]:v for k,v in M['end'].items()}; out['fin']={k[:3]:v for k,v in M['fin'].items()}; out['on']=M['on']
out['songs']=sum(M['songs'].values()); out['notes']=M['notes']
s=json.dumps(out,separators=(',',':')); open(sys.argv[3],'w').write(s); print(len(s),'bytes', len(out['o1']), len(out['o2']))
# pruned pickle for evaluating the same model in Python
P=[{k:deq(v) for k,v in c[0].items()},{k:deq(v) for k,v in c[1].items() if sum(v.values())>=MIN1},{k:deq(v) for k,v in c[2].items() if sum(v.values())>=MIN2}]
pickle.dump(P,open(sys.argv[3]+'.pkl','wb'))
