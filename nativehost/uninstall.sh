#!/usr/bin/env bash
# Removes the LinkedIn AI Reply native messaging host (macOS and Linux).
set -euo pipefail
HOST_NAME="com.linkedin_ai_reply.host"

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
for t in "${targets[@]}"; do
  if [ -f "$t/$HOST_NAME.json" ]; then
    rm -f "$t/$HOST_NAME.json"
    echo "Removed: $t/$HOST_NAME.json"
  fi
done
echo "Done. Native host $HOST_NAME unregistered."
