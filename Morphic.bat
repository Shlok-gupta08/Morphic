@echo off
title Morphic
cd /d "P:\Morphic"
start "" npm run dev
echo Waiting for server to start...
:wait
timeout /t 1 /nobreak >nul
curl -s -o nul http://localhost:5173 2>nul
if errorlevel 1 goto wait
start "" "http://localhost:5173"
echo Morphic is running. Close this window to stop.
cmd /k
