#!/bin/bash
# Stamp app.css and js/*.js in index.html with a hash of their contents (?v=...), so a browser or the offline copy never mixes
# a new page with old scripts. Run after changing any of them (noodle-ios/sync-web.sh runs it).
set -e; cd "$(dirname "$0")"
for f in app.css js/*.js; do h=$(sha1sum "$f" | cut -c1-10); sed -i -E "s#(\"$f)(\\?v=[0-9a-f]*)?\"#\\1?v=$h\"#" index.html; done
