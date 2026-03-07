@echo off
title ParkingSpace Tool Starter
echo [ParkingSpace] 正在啟動服務...
echo.

:: 檢查是否安裝了 Node.js (npx)
where npx >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [錯誤] 找不到 Node.js 環境。請確保您已安裝 Node.js。
    echo 啟動失敗。
    pause
    exit /b 1
)

:: 在背景啟動 live-server 並自動開啟瀏覽器
echo 服務啟動後請勿關閉此視窗。
echo 您可以縮小此視窗以保持服務運行。
echo.
echo 正在開啟網頁: http://localhost:5500
echo.

npx live-server --port=5500 --no-browser & start http://localhost:5500

:: 保持視窗開啟以維持 server 運行
pause
