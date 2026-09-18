@echo off
call "%~dp0_cloud-runner.bat" --unrestrict
exit /b %ERRORLEVEL%
