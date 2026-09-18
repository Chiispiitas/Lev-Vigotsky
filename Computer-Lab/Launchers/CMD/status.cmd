@echo off
call "%~dp0_cloud-runner.cmd" --status
exit /b %ERRORLEVEL%
