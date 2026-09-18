@echo off
call "%~dp0_cloud-runner.cmd" --uwf-update
exit /b %ERRORLEVEL%
