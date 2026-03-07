@echo off
title ParkingSpace - Ngrok Public Tunnel
setlocal enabledelayedexpansion

:: ==============================================
:: 請在此輸入您的 Ngrok Auth Token
:: 您可以在 https://dashboard.ngrok.com/get-started/your-authtoken 取得
set NGROK_TOKEN=2GIj8GQXHyjZDSxufhJOHhIxbnM_3z7hbyNKoLxUiSc1c3Umw
:: ==============================================

echo ================================================
echo  ParkingSpace 公網存取模式
echo ================================================
echo.
echo  [重要] 請確認您已經先執行了 _start_server.bat
echo  如果還沒有，請先去雙擊 _start_server.bat 啟動伺服器
echo  等看到 "Available on: http://127.0.0.1:5500" 後
echo  再回來按任意鍵繼續。
echo.
echo ================================================
pause

:: 設定 Ngrok Token
echo.
echo [ParkingSpace] 正在建立公網通道...
call npx -y ngrok config add-authtoken %NGROK_TOKEN%

echo.
echo ================================================
echo  請在下方 Ngrok 介面中尋找 Forwarding 網址
echo  例如: https://xxxx.ngrok-free.app
echo  把這串網址複製給別人，就能用 4G 連進來了！
echo ================================================
echo.

call npx -y ngrok http 5500

pause
