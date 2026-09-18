@echo off
call "%~dp0_cloud-runner.cmd" --kill-apps
exit /b %ERRORLEVEL%
