@echo off
cd /d "%~dp0"
set HOST=0.0.0.0
echo Private racing on your local network.
echo Both players open http://YOUR-LAPTOP-IP:4173 using this laptop's Wi-Fi IPv4 address.
echo Find it with ipconfig. Keep this window open. Stop any existing game server first.
echo If Windows asks, allow Node on your private network only.
where node >nul 2>nul
if %errorlevel% equ 0 (
 node server.mjs
) else (
 "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.mjs
)
pause
