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

echo [ParkingSpace] 正在啟動穩定版服務...
echo.
echo 注意：
echo 1. 此版本已取消「自動重新整理」，存檔時不會再干擾您。
echo 2. 啟動後會自動開啟瀏覽器。
echo 3. 請保持此視窗開啟。
echo.

:: 啟動 http-server (穩定、不跳重新整理)
call npx http-server -p 5500 -o --cors

pause

pause
