@echo off
call "%~dp0_cloud-runner.cmd" --uwf-repair
exit /b %ERRORLEVEL%
