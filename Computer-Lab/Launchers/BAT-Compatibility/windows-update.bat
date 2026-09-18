@echo off
call "%~dp0_cloud-runner.bat" --windows-update
exit /b %ERRORLEVEL%
