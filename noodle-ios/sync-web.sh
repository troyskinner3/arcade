#!/bin/bash
# Copy the web app into the iPhone app's bundled `web` folder. Run before building a release (or add as an Xcode Run Script phase).
set -e; cd "$(dirname "$0")"; W=NoodleWeb/web
rm -rf "$W"; mkdir -p "$W"
../noodle/stamp.sh; cp ../noodle/index.html ../noodle/app.css ../noodle/reader.json ../noodle/musical.json "$W"/; cp -R ../noodle/js "$W"/js; cp -R ../noodle/vendor "$W"/vendor; mkdir -p "$W"/samples; for d in ../noodle/samples/*/; do d="${d%/}"; [ -f "$d/map.json" ] && cp -R "$d" "$W"/samples/; done
echo "web app copied to $W ($(du -sh "$W" | cut -f1))"
