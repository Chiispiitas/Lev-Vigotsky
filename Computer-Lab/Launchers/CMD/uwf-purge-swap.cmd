@echo off
call "%~dp0_cloud-runner.cmd" --purge-swap
exit /b %ERRORLEVEL%
