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

:: 嘗試獲取本機 IP 位址
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" /c:"IPv4 位址"') do (
    set LOCAL_IP=%%a
)
set LOCAL_IP=%LOCAL_IP: =%

echo [ParkingSpace] 正在啟動穩定版服務...
echo.
echo ==============================================
echo  電腦存取: http://localhost:5500
echo  手機存取: http://%LOCAL_IP%:5500
echo.
echo  抽選模式示例 (自動讀取 B2):
echo  http://%LOCAL_IP%:5500?onlyUse=B2
echo ==============================================
echo.
echo 注意事項：
echo 1. 此版本已取消「自動重新整理」，存檔時不會再干擾您。
echo 2. 啟動後會「自動開啟」您的預設瀏覽器。
echo 3. 請保持此視窗開啟以維持地帆工具運作。
echo.

:: 啟動 http-server (穩定、不跳重新整理，關閉快取)
call npx http-server -p 5500 -o -c-1 --cors

pause

pause
