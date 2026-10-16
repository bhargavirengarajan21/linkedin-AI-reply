@echo off
setlocal
rem Removes the LinkedIn AI Reply native messaging host registration.
set "LIAI_HOSTNAME=com.linkedin_ai_reply.host"

reg delete "HKCU\Software\Google\Chrome\NativeMessagingHosts\%LIAI_HOSTNAME%" /f >nul 2>nul
reg delete "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\%LIAI_HOSTNAME%" /f >nul 2>nul

echo Done. Native host "%LIAI_HOSTNAME%" unregistered.
pause
