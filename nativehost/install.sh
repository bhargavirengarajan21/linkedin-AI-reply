#!/usr/bin/env bash
# Registers the LinkedIn AI Reply native messaging host so Chrome can launch it
# on demand (macOS and Linux). Run this ONCE. The macOS equivalent of install.bat.
#
# Usage:  ./install.sh               (uses the built-in extension ID)
#         ./install.sh <EXTENSION_ID>  (if you publish and get a different ID)
set -euo pipefail
cd "$(dirname "$0")"

HOST_NAME="com.linkedin_ai_reply.host"
EXT_ID="${1:-monpnkfiieimnnkemchdaheancmjneja}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install the LTS version from https://nodejs.org and run this again."
  exit 1
fi
if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code is not installed or not on PATH."
  echo "Install it from https://code.claude.com/docs/en/setup , run 'claude' once to sign in, then run this again."
  exit 1
fi

chmod +x host.sh host.js 2>/dev/null || true
DIR="$(pwd)"

# Write the native host manifest with the absolute path to host.sh and the allowed extension ID.
cat > manifest.json <<EOF
{
  "name": "$HOST_NAME",
  "description": "LinkedIn AI Reply native host",
  "path": "$DIR/host.sh",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXT_ID/"
  ]
}
EOF

# Copy the manifest into every Chromium-family NativeMessagingHosts dir for the current user.
# macOS paths live under ~/Library/Application Support; Linux paths under ~/.config.
targets=(
  "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
  "$HOME/Library/Application Support/Google/Chrome Canary/NativeMessagingHosts"
  "$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
  "$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"
  "$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
  "$HOME/.config/google-chrome/NativeMessagingHosts"
  "$HOME/.config/chromium/NativeMessagingHosts"
  "$HOME/.config/microsoft-edge/NativeMessagingHosts"
)
installed=0
for t in "${targets[@]}"; do
  parent="$(dirname "$t")"
  # Only install where the browser's profile root already exists, to avoid creating stray dirs.
  if [ -d "$parent" ]; then
    mkdir -p "$t"
    cp manifest.json "$t/$HOST_NAME.json"
    echo "Registered for: $t"
    installed=1
  fi
done

if [ "$installed" -eq 0 ]; then
  echo "No Chromium-family browser profile was found. Open Chrome once, then run this again."
  exit 1
fi

echo
echo "Done. Native host $HOST_NAME registered for extension ID $EXT_ID."
echo "Chrome will now launch Claude on demand - no bridge window to keep open."
echo "Reload the extension or restart Chrome, then use LinkedIn as normal."
