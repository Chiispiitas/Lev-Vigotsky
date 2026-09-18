@echo off
call "%~dp0_cloud-runner.cmd" --disable-uwf
exit /b %ERRORLEVEL%
