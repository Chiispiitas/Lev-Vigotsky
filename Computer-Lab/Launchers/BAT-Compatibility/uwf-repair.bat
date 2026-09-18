@echo off
call "%~dp0_cloud-runner.bat" --uwf-repair
exit /b %ERRORLEVEL%
