#!/bin/sh
# Renders scripts/og-image/card.html to public/og.png at 1200×630.
# CHROME overrides the browser path; the default is macOS Google Chrome.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../.." && pwd)
chrome=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
"$chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1200,630 --virtual-time-budget=2000 \
  --screenshot="$root/public/og.png" "file://$here/card.html"
