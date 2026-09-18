@echo off
call "%~dp0_cloud-runner.bat" --uwf-status
exit /b %ERRORLEVEL%
