@echo off
call "%~dp0_cloud-runner.cmd" --windows-update
exit /b %ERRORLEVEL%
