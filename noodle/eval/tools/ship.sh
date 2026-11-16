#!/bin/bash
# ship.sh "<README log line>" "<commit subject>" : log the step, sync the iOS bundle, commit, merge main, push both branches. Run only after ALL PASS.
cd /home/user/arcade || exit 1
python3 - "$1" <<'P'
import sys
p='noodle/eval/README.md'; s=open(p).read(); a="- **Next batches, in a safe order:**"; assert a in s
open(p,'w').write(s.replace(a,sys.argv[1]+"\n"+a,1))
P
bash noodle-ios/sync-web.sh >/dev/null 2>&1
git add -A && git commit -qm "$2

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Q4GkF9CdTSNixupE2PggSU" && git fetch -q origin main && git merge -q origin/main; git push -q -u origin mm-cards; git push -q origin mm-cards:main; git log --oneline | head -1; git status --short | head -5
