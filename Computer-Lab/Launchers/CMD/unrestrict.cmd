@echo off
call "%~dp0_cloud-runner.cmd" --unrestrict
exit /b %ERRORLEVEL%
