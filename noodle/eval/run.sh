#!/bin/bash
# Runs every Noodle test against this checkout: bash noodle/eval/run.sh [name ...]
# Prints one line per script and ALL PASS at the end only if every script ended with no page errors and, when the owner's
# guided takes are in noodle/eval/data/user (pull_takes.py fetches them; they stay out of git), the 31-take replay still scores 3.88.
E="$(cd "$(dirname "$0")" && pwd)"; cd "$E"
curl -s -o /dev/null localhost:8800/ || setsid -f node serve.js 8800 </dev/null >/dev/null 2>&1
curl -s -o /dev/null localhost:8787/ || (cd ../../noodle-api && setsid -f node dev/local-server.mjs 8787 </dev/null >/dev/null 2>&1)
sleep 1
ALL="fx_test fx_record modes_test offline_test sheets_test review1_test humalong_test kitoffer_test round2_test snap_test blank_test fxgrid_test trimkeep_test drumed_test velocity_test round3b_test round3c_test duptrack_test renderfail_test piano_test kit_test reverb_test warm_test yv_ui_test newsounds_test vsco_test mem_test songfile_test crash_test mfx_test mfx_ui_test pro_test devas_test flows_test mfx_resize_test transpose_test section_test taptempo_test copypart_test native_test fx_ab_test render_speed_test train_test voice_test onboard_test s2_extras s2_regions s2_test s2_linear s2_replace s2_editor s2_share_move s2_rest shell_test proj_test recsheet_cal"
LIST="${*:-$ALL}"; fail=0; n=0
for t in $LIST; do n=$((n+1))
  out=$(timeout 170 node "$t.js" 2>&1); r=$(echo "$out" | tail -3 | tr -d '\n' | tail -c 30)
  if echo "$out" | grep -q "Error\|Timeout\|at /"; then echo "FAIL $t :: $r"; fail=1; elif echo "$r" | grep -q '\[\]$\|"errs": \[\] *}}$'; then echo "ok   $t"; else echo "FAIL $t :: $r"; fail=1; fi
done
if [ -z "$*" ]; then
  if ls data/user/2*.wav >/dev/null 2>&1; then
    rm -rf /tmp/noodle_replay; node replay_fast.js noodle-s2.html /tmp/noodle_replay >/dev/null 2>&1
    sc=$(python3 score_user.py /tmp/noodle_replay | tail -1 | grep -o '= [0-9.]* per'); echo "replay $sc"; [ "$sc" = "= 3.88 per" ] || fail=1
  else echo "replay skipped: no takes in noodle/eval/data/user (see pull_takes.py)"; fi
fi
[ $fail = 0 ] && echo "ALL PASS ($n scripts)" || echo "SUITE FAILED"
[ $fail = 0 ]
