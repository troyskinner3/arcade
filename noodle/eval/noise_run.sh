#!/bin/bash
# mix each noise at each SNR, replay through a page version, score. Usage: noise_run.sh page tag
cd "$(dirname "$0")/.."; PAGE=$1; TAG=$2
for e in STRAFFIC PCAFETER TBUS SPSQUARE NPARK; do for snr in 20 10 5; do
  d=data/noisy/${e}_$snr; [ -d $d ] || python3 tools/mix_noise.py $e $snr $d >/dev/null
  DATA=noisy/${e}_$snr node mm/replay_fast.js $PAGE results/noise_${TAG}_${e}_$snr >/dev/null 2>&1
  echo "$e $snr $(python3 tools/score_user.py results/noise_${TAG}_${e}_$snr | tail -1 | grep -o '= [0-9.]* per')"
done; done
