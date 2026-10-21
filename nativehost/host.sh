#!/bin/sh
# Wrapper Chrome launches for native messaging (macOS / Linux). Must print NOTHING
# to stdout except what host.js writes, so node inherits stdin/stdout directly.
exec node "$(dirname "$0")/host.js"
