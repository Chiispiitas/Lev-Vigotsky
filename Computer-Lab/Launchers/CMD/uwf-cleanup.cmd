@echo off
call "%~dp0_cloud-runner.cmd" --cleanup
exit /b %ERRORLEVEL%
