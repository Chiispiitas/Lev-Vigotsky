@echo off
call "%~dp0_cloud-runner.bat" --purge-swap
exit /b %ERRORLEVEL%
