@echo off
call "%~dp0_cloud-runner.bat" --status
exit /b %ERRORLEVEL%
