@echo off
call "%~dp0_cloud-runner.bat" --exam
exit /b %ERRORLEVEL%
