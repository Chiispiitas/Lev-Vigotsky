@echo off
call "%~dp0_cloud-runner.bat" --cleanup
exit /b %ERRORLEVEL%
