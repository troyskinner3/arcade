#!/bin/bash
# Runs every Noodle test against this checkout: bash noodle/eval/run.sh [--serial] [name ...]
# Prints one line per script (with how long it took) and ALL PASS at the end only if every script ended with no page errors and, when the
# owner's guided takes are in noodle/eval/data/user (pull_takes.py fetches them; they stay out of git), the 31-take replay still scores 3.82.
# Speed (owner, 26 Nov): scripts run JOBS at a time (default 3; --serial or JOBS=1 for one at a time). Scripts that use the local takes service
# or check timing against the clock (taps, the mic, the metronome, render speed) run afterwards, one at a time, with nothing else running, so
# a busy machine can't make them fail. A script that fails in parallel is never retried: move it to SOLO instead.
E="$(cd "$(dirname "$0")" && pwd)"; cd "$E"
curl -s -o /dev/null localhost:8800/ || setsid -f node serve.js 8800 </dev/null >/dev/null 2>&1
curl -s -o /dev/null localhost:8787/ || (cd ../../noodle-api && setsid -f node dev/local-server.mjs 8787 </dev/null >/dev/null 2>&1)
sleep 1
ALL="fx_test fx_record modes_test offline_test sheets_test review1_test humalong_test kitoffer_test round2_test snap_test blank_test fxgrid_test trimkeep_test drumed_test velocity_test round3b_test round3c_test duptrack_test renderfail_test piano_test kit_test reverb_test warm_test yv_ui_test newsounds_test vsco_test mem_test songfile_test crash_test stats_test mfx_test mfx_ui_test pro_test devas_test flows_test mfx_resize_test transpose_test section_test taptempo_test copypart_test native_test fx_ab_test render_speed_test train_test voice_test onboard_test s2_extras s2_regions s2_test s2_linear s2_replace s2_editor s2_share_move s2_rest shell_test proj_test recsheet_cal worker_test corr_test learnfix_test taprec_test chords_test fills_test sections_test tfx_test harm_test vocoder_test endcard_test ba_test songlink_test invite_test propreview_test presets_test keyroll_test beats_test tidy_test musical_test haptic_test tapnotes_test pronote_test mfx_brake_test round16_test errors_test songlink_hostile_test round21_test finish_test draw_test tapin_test continue_test editor28_test b1_test teachcrash_test b2_test songsize_test instruments30_test tailcut_test"
SOLO=" crash_test errors_test invite_test offline_test onboard_test songlink_hostile_test songlink_test stats_test fx_record review1_test humalong_test kitoffer_test piano_test render_speed_test train_test voice_test s2_test s2_linear s2_replace s2_rest recsheet_cal worker_test taprec_test haptic_test tapin_test b1_test teachcrash_test "
JOBS=${JOBS:-3}; if [ "$1" = "--serial" ]; then JOBS=1; shift; fi
LIST="${*:-$ALL}"; R=$(mktemp -d)
one(){ local t=$1 s=$(date +%s) out r; out=$(timeout 170 node "$t.js" 2>&1); r=$(echo "$out" | tail -3 | tr -d '\n' | tail -c 30); local d=$(($(date +%s)-s))
  if echo "$out" | grep -q "Error\|Timeout\|at /"; then echo "FAIL $t (${d}s) :: $r"; elif echo "$r" | grep -q '\[\]$\|"errs": \[\] *}}$\|"errs":\[\]}$'; then echo "ok   $t (${d}s)"; else echo "FAIL $t (${d}s) :: $r"; fi; }
export -f one
par=(); solo=(); for t in $LIST; do if [ "$JOBS" -gt 1 ] && [[ "$SOLO" == *" $t "* ]]; then solo+=("$t"); else par+=("$t"); fi; done
start=$(date +%s)
if [ ${#par[@]} -gt 0 ]; then printf '%s\n' "${par[@]}" | xargs -P "$JOBS" -I{} bash -c 'one {}' | tee -a "$R/out"; fi
for t in "${solo[@]}"; do one "$t" | tee -a "$R/out"; done
n=$(grep -c . "$R/out"); fail=0; grep -q '^FAIL' "$R/out" && fail=1
if [ -z "$*" ]; then
  if ls data/user/2*.wav >/dev/null 2>&1; then
    rm -rf /tmp/noodle_replay; node replay_fast.js noodle-s2.html /tmp/noodle_replay >/dev/null 2>&1
    sc=$(python3 score_user.py /tmp/noodle_replay | tail -1 | grep -o '= [0-9.]* per'); echo "replay $sc"; [ "$sc" = "= 3.82 per" ] || fail=1
  else echo "replay skipped: no takes in noodle/eval/data/user (see pull_takes.py)"; fi
fi
echo "took $(($(date +%s)-start))s ($JOBS at a time; ${#solo[@]} alone)"; rm -rf "$R"
[ $fail = 0 ] && echo "ALL PASS ($n scripts)" || echo "SUITE FAILED"
[ $fail = 0 ]
