@echo off
call "%~dp0_cloud-runner.cmd" --exam
exit /b %ERRORLEVEL%
