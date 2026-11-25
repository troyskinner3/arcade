#!/bin/bash
# Copy the web app into the iPhone app's bundled `web` folder. Run before building a release (or add as an Xcode Run Script phase).
set -e; cd "$(dirname "$0")"; W=NoodleWeb/web
rm -rf "$W"; mkdir -p "$W"
../noodle/stamp.sh; cp ../noodle/index.html ../noodle/app.css ../noodle/reader.json ../noodle/musical.json ../noodle/harmony.json "$W"/; cp -R ../noodle/js "$W"/js; cp -R ../noodle/vendor "$W"/vendor; mkdir -p "$W"/samples; for d in ../noodle/samples/*/; do d="${d%/}"; [ -f "$d/map.json" ] && cp -R "$d" "$W"/samples/; done
echo "web app copied to $W ($(du -sh "$W" | cut -f1))"
# check the copy: every instrument folder whole (with its map.json), same files as the source, scripts stamped. Stops with an error if not.
bad=0
for d in ../noodle/samples/*/; do d="${d%/}"; n=$(basename "$d"); [ -f "$d/map.json" ] || continue
  [ -f "$W/samples/$n/map.json" ] || { echo "MISSING samples/$n/map.json"; bad=1; }
  a=$(ls "$d" | wc -l | tr -d ' '); b=$(ls "$W/samples/$n" 2>/dev/null | wc -l | tr -d ' '); [ "$a" = "$b" ] || { echo "samples/$n: $b files, expected $a"; bad=1; }; done
for f in index.html app.css reader.json musical.json harmony.json; do cmp -s "../noodle/$f" "$W/$f" || { echo "$f differs"; bad=1; }; done
[ "$(ls ../noodle/js | wc -l)" = "$(ls "$W"/js | wc -l)" ] || { echo "js: file count differs"; bad=1; }
[ -z "$(find "$W/samples" -maxdepth 1 -type f)" ] || { echo "loose files in samples/ (copied flat?)"; bad=1; }
for f in app.css ../noodle/js/*.js; do b=${f#../noodle/}; grep -q "\"$b?v=" "$W/index.html" || { echo "$b not stamped in index.html"; bad=1; }; done
[ $bad = 0 ] || { echo "SYNC CHECK FAILED: the app copy is not right; don't build. Tell Claude what's above."; exit 1; }
echo "check ok: $(find "$W/samples" -name map.json | wc -l | tr -d ' ') instruments, $(ls "$W"/js | wc -l | tr -d ' ') scripts"
