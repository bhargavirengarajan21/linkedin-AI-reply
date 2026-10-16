@echo off
title LinkedIn AI Reply bridge
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org and run this again.
  pause
  exit /b 1
)

where claude >nul 2>nul
if errorlevel 1 (
  echo Claude Code is not installed or not on PATH.
  echo Install it from https://code.claude.com/docs/en/setup , run "claude" once to sign in with your Claude account, then run this again.
  pause
  exit /b 1
)

node server.js
pause
