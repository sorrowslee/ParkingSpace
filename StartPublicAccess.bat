@echo off
title ParkingSpace Public Access (Ngrok)
setlocal enabledelayedexpansion

:: ==============================================
:: 請在此輸入您的 Ngrok Auth Token
:: 您可以在 https://dashboard.ngrok.com/get-started/your-authtoken 取得
set NGROK_TOKEN=YOUR_TOKEN_HERE
:: ==============================================

echo [ParkingSpace] 正在啟動公網存取服務...
echo.

:: 檢查 Token 是否有被修改
if "%NGROK_TOKEN%"=="YOUR_TOKEN_HERE" (
    echo [警告] 您尚未設定 Ngrok Auth Token！
    echo 1. 請至 https://dashboard.ngrok.com/ 註冊免費帳號
    echo 2. 取得您的 Authtoken 並貼回此批次檔的 NGROK_TOKEN 欄位中
    echo.
    pause
    exit /b
)

:: 在背景啟動本地伺服器
echo 1. 正在啟動本地 Web 伺服器 (Port 5500)...
start /b npx http-server -p 5500 --cors

:: 等待伺服器啟動
timeout /t 3 >nul

:: 設定 Ngrok Token
echo 2. 正透過 Ngrok 建立安全通道...
call npx ngrok config add-authtoken %NGROK_TOKEN% >nul 2>&1

:: 啟動通道
echo ----------------------------------------------
echo  服務已準備就緒！請查看下方生成的 Forwarding 網址
echo  (通常是以 https:// 開頭的網址)
echo ----------------------------------------------
echo.

call npx ngrok http 5500

pause
