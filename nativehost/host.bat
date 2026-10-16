@echo off
rem Wrapper Chrome launches for native messaging. Must print NOTHING to stdout
rem except what host.js writes (echo is off; node inherits stdin/stdout).
node "%~dp0host.js"
