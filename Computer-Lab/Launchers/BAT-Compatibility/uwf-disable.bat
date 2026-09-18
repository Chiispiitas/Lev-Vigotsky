@echo off
call "%~dp0_cloud-runner.bat" --disable-uwf
exit /b %ERRORLEVEL%
