@echo off
call "%~dp0_cloud-runner.cmd" --uwf-status
exit /b %ERRORLEVEL%
