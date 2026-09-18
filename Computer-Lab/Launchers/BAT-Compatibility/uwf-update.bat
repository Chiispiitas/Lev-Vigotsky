@echo off
call "%~dp0_cloud-runner.bat" --uwf-update
exit /b %ERRORLEVEL%
