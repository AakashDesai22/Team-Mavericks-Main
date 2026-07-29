@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   Bodhantra Event OS - Local Startup Script
echo ===================================================
echo.

:: 1. Try to find PHP in the system PATH
where php >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PHP_PATH=php
    goto :FoundPHP
)

:: 2. Try common XAMPP installation
if exist "C:\xampp\php\php.exe" (
    set PHP_PATH="C:\xampp\php\php.exe"
    goto :FoundPHP
)

:: 2b. Try Xmapp installation on E drive
if exist "E:\Projects\Xmapp\php\php.exe" (
    set PHP_PATH="E:\Projects\Xmapp\php\php.exe"
    goto :FoundPHP
)

:: 3. Try common Laragon installation
if exist "C:\laragon\bin\php" (
    for /d %%D in ("C:\laragon\bin\php\php-*") do (
        if exist "%%D\php.exe" (
            set PHP_PATH="%%D\php.exe"
            goto :FoundPHP
        )
    )
)

:: 4. Try common WampServer installation
if exist "C:\wamp64\bin\php" (
    for /d %%D in ("C:\wamp64\bin\php\php*") do (
        if exist "%%D\php.exe" (
            set PHP_PATH="%%D\php.exe"
            goto :FoundPHP
        )
    )
)

:: If not found
echo ===================================================
echo [WARNING] PHP executable (php.exe) was NOT found!
echo ===================================================
echo The PHP local backend (http://localhost:8000) will be offline.
echo Starting the Vite Frontend Server anyway...
echo ===================================================
echo.
goto :StartFrontend

:FoundPHP
echo [SUCCESS] Found PHP at: %PHP_PATH%
echo.

:: Start PHP Backend Server in a new window
echo Starting PHP Backend Server on http://localhost:8000 ...
start "Bodhantra Event OS - PHP Backend" cmd /k %PHP_PATH% -S localhost:8000 -t public_html public_html/router.php

:: Give the backend a second to initialize
timeout /t 2 >nul

:StartFrontend
:: Open the browser automatically
echo Opening the web app in your default browser...
start http://localhost:5173

:: Start Vite Frontend in the current window
echo Starting Vite Frontend Server...
echo.
cmd /c npm run dev

endlocal
