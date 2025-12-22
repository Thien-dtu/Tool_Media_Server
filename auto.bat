@echo off
cd /d D:\test_bak
start /B "" cmd /c "cd /d D:\test_bak\react-client && npm run dev"
node src\main.js
pause