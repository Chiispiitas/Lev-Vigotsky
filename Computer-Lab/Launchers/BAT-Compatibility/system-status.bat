@echo off
call "%~dp0_cloud-runner.bat" --system-status
exit /b %ERRORLEVEL%
