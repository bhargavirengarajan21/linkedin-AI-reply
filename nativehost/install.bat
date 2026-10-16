@echo off
setlocal
rem Registers the LinkedIn AI Reply native messaging host so Chrome can launch it
rem on demand. Run this ONCE. No window stays open afterwards; the extension just works.
rem
rem Usage:  install.bat               (uses the built-in extension ID)
rem         install.bat <EXTENSION_ID>  (if you publish and get a different ID)

cd /d "%~dp0"

set "LIAI_HOSTNAME=com.linkedin_ai_reply.host"
set "LIAI_EXTID=%~1"
if "%LIAI_EXTID%"=="" set "LIAI_EXTID=monpnkfiieimnnkemchdaheancmjneja"

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

rem Write the native host manifest with the absolute path to host.bat and the allowed extension ID.
node -e "const fs=require('fs'),p=require('path'),d=__dirname;fs.writeFileSync(p.join(d,'manifest.json'),JSON.stringify({name:process.env.LIAI_HOSTNAME,description:'LinkedIn AI Reply native host',path:p.join(d,'host.bat'),type:'stdio',allowed_origins:['chrome-extension://'+process.env.LIAI_EXTID+'/']},null,2));"
if errorlevel 1 (
  echo Failed to write the native host manifest.
  pause
  exit /b 1
)

rem Point Chrome (and Edge) at the manifest via the registry (current user, no admin needed).
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\%LIAI_HOSTNAME%" /ve /t REG_SZ /d "%~dp0manifest.json" /f >nul
reg add "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\%LIAI_HOSTNAME%" /ve /t REG_SZ /d "%~dp0manifest.json" /f >nul

echo.
echo Done. Native host "%LIAI_HOSTNAME%" registered for extension ID %LIAI_EXTID%.
echo Chrome will now launch Claude on demand - no bridge window to keep open.
echo Reload the extension or restart Chrome, then use LinkedIn as normal.
echo.
pause
