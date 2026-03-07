@echo off
title ParkingSpace-LocalServer
echo [ParkingSpace] 本地伺服器啟動中...
echo.
npx -y http-server -p 5500 --cors
pause
