#!/bin/bash
# prune dead functions in the repo's noodle/index.html, then run the suite
S=/tmp/claude-0/-home-user/14a038b5-3f7e-5635-965f-07fad87bf95e/scratchpad; cd $S
cp /home/user/arcade/noodle/index.html jsparse/work.html && node jsparse/prune.js jsparse/work.html s2TrimClip toggleMetro && cp jsparse/work.html /home/user/arcade/noodle/index.html && tools/suite.sh 2>&1 | grep -v '^ok'
