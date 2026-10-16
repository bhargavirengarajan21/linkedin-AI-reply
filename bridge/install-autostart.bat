@echo off
rem Starts the LinkedIn AI Reply bridge silently now and every time you log in to Windows.
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
  echo Install it from https://code.claude.com/docs/en/setup , run "claude" once to sign in, then run this again.
  pause
  exit /b 1
)

set "VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\linkedin-ai-bridge.vbs"
> "%VBS%" echo Set sh = CreateObject("WScript.Shell")
>> "%VBS%" echo sh.CurrentDirectory = "%~dp0"
>> "%VBS%" echo sh.Run "cmd /c node server.js > bridge.log 2>&1", 0, False

start "" wscript "%VBS%"
echo.
echo Done. The bridge is now running in the background (no window),
echo and it will start by itself every time you log in.
echo You can close this window.
echo.
pause
