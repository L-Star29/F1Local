@echo off
cd /d "%~dp0"
echo Formula / Local
echo Open http://127.0.0.1:4173 in your browser after the server starts.
echo Keep this window open while playing. Close it to stop the server.
where node >nul 2>nul
if %errorlevel% equ 0 (
  node server.mjs
) else (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.mjs
)
pause
