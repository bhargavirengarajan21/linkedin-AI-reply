@echo off
rem Stops the bridge from starting automatically at login.
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\linkedin-ai-bridge.vbs" 2>nul
echo Auto-start removed. The bridge stops after your next restart.
pause
