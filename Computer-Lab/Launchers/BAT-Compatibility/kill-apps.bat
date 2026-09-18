@echo off
call "%~dp0_cloud-runner.bat" --kill-apps
exit /b %ERRORLEVEL%
