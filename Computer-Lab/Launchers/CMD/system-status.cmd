@echo off
call "%~dp0_cloud-runner.cmd" --system-status
exit /b %ERRORLEVEL%
