#!/bin/bash
# Run every Noodle eval script against the repo's current noodle/index.html. Prints one line per script; ALL PASS at the end only if every script ended with no page errors
# and the 31-take replay still scores 3.88. Usage: tools/suite.sh   (from the scratchpad; needs data/user for the replay)
S="$(cd "$(dirname "$0")/.." && pwd)"; R=/home/user/arcade/noodle
for f in s2 nx proj; do cp "$R/index.html" "$S/srv/noodle-$f.html"; done; cp "$R/sw.js" "$S/srv/sw.js" 2>/dev/null; cp "$R/reader.json" "$S/srv/reader.json"; cp -r "$R/vendor" "$S/srv/" 2>/dev/null; ln -sfn "$R/samples" "$S/srv/samples"
(cd /home/user/arcade/noodle-api && (pgrep -f local-server.mjs >/dev/null || (setsid nohup node dev/local-server.mjs 8787 >/dev/null 2>&1 &)))
cd "$S" && bash tools/srv.sh; fail=0
for t in fx_test fx_record modes_test offline_test sheets_test review1_test humalong_test kitoffer_test round2_test snap_test blank_test fxgrid_test trimkeep_test drumed_test velocity_test round3b_test round3c_test duptrack_test renderfail_test piano_test kit_test reverb_test warm_test yv_ui_test newsounds_test vsco_test mem_test songfile_test crash_test mfx_test mfx_ui_test pro_test devas_test flows_test train_test voice_test onboard_test s2_extras s2_regions s2_test s2_linear s2_replace s2_editor s2_share_move s2_rest shell_test proj_test recsheet_cal; do
  out=$(timeout 170 node mm/$t.js 2>&1); r=$(echo "$out" | tail -3 | tr -d '\n' | tail -c 30)
  if echo "$out" | grep -q "Error\|Timeout\|at /tmp"; then echo "FAIL $t :: $r"; fail=1; elif echo "$r" | grep -q '\[\]$\|"errs": \[\] *}}$'; then echo "ok   $t"; else echo "FAIL $t :: $r"; fail=1; fi
done
rm -rf results/replay_suite   # a replay that crashes must not be scored from the last run's files
node mm/replay_fast.js noodle-s2.html results/replay_suite >/dev/null 2>&1; sc=$(python3 tools/score_user.py results/replay_suite | tail -1 | grep -o '= [0-9.]* per'); echo "replay $sc"
[ "$sc" = "= 3.88 per" ] || fail=1
[ $fail = 0 ] && echo "ALL PASS" || echo "SUITE FAILED"
