@echo off
call "%~dp0_cloud-runner.cmd" --enable-uwf
exit /b %ERRORLEVEL%
