@echo off
call "%~dp0_cloud-runner.bat" --enable-uwf
exit /b %ERRORLEVEL%
