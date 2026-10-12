@echo off
cd /d "%~dp0"
start "LEV VOICE" http://localhost:4173
node server.mjs
