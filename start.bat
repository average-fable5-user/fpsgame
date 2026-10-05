@echo off
rem Browsers block loading .glb files from file:// — serve the folder locally instead.
cd /d "%~dp0"
start "" http://localhost:8123/
python -m http.server 8123
