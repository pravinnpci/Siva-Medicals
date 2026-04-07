@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
echo ========================================
echo   🏥 Siva Medicals Admin Setup
echo ========================================
echo.

echo 📦 Installing dependencies...
cd ..\backend && call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    echo Please check your Node.js installation
    pause
    exit /b 1
)
echo ✅ Backend dependencies installed
echo.

echo 🚀 Starting server...
echo.
echo 🐳 Starting with Docker...
echo [1] Build and Start (First time or after changes)
echo [2] Start existing containers
echo [3] Run locally (No Docker - Requires local Node ^& Postgres)
echo.
set /p mode="Enter choice (1, 2, or 3): "

if "%mode%"=="3" (
    echo 🗄️ Setting up local database...
    cd ..\backend && call npm run setup-db
    if %errorlevel% neq 0 (
        echo ⚠️ Local database setup failed. Ensure Postgres is running locally.
        set /p cont="Try to start anyway? (y/n): "
        if /i not "!cont!"=="y" exit /b 1
    )
    echo 🚀 Starting local server...
    echo 🌐 Admin panel: http://localhost:3001/admin/login
    echo 📄 Note: Open frontend/index.html in your browser to view the site.
    cd ..\backend && npm start
    exit /b 0
)

if "%mode%"=="1" (
    call :check_docker
    if %errorlevel% neq 0 exit /b 1
    echo 🏗️ Building and starting services...
    cd .. && docker compose --env-file .env.local --env-file .env up --build -d && set DOCKER_SUCCESS=1
    goto :finish
)

if "%mode%"=="2" (
    call :check_docker
    if %errorlevel% neq 0 exit /b 1
    echo 🚀 Starting services...
    cd .. && docker compose --env-file .env.local --env-file .env up -d && set DOCKER_SUCCESS=1
    goto :finish
)

echo ❌ Invalid choice.
pause
exit /b 1

:check_docker
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Download at: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)
docker info >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker Desktop is not running. Please start it.
    pause
    exit /b 1
)
goto :eof

:finish
if defined DOCKER_SUCCESS (
    echo.
    echo ✅ Services are being managed by Docker.
    echo 🌐 Frontend: http://localhost
    echo 📊 Admin: http://localhost:3001/admin/login
) else (
    echo ❌ Failed to start Docker services.
)