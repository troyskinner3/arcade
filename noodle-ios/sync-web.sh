#!/bin/bash
# Copy the web app into the iPhone app's bundled `web` folder. Run before building a release (or add as an Xcode Run Script phase).
set -e; cd "$(dirname "$0")"; W=NoodleWeb/web
rm -rf "$W"; mkdir -p "$W"
cp ../noodle/index.html ../noodle/reader.json "$W"/; cp -R ../noodle/vendor "$W"/vendor
echo "web app copied to $W ($(du -sh "$W" | cut -f1))"
