#!/bin/bash
# Stamp app.css and js/*.js in index.html with a hash of their contents (?v=...), so a browser or the offline copy never mixes
# a new page with old scripts. Run after changing any of them (noodle-ios/sync-web.sh runs it). Works on macOS and Linux.
set -e; cd "$(dirname "$0")"
hash(){ if command -v sha1sum >/dev/null; then sha1sum "$1" | cut -c1-10; else shasum -a 1 "$1" | cut -c1-10; fi; }
for f in app.css js/*.js; do h=$(hash "$f"); F="$f" H="$h" perl -pi -e 's#("\Q$ENV{F}\E)(\?v=[0-9a-f]*)?"#$1?v=$ENV{H}"#g' index.html; done
