@echo off
echo ========================================
echo   🏥 Siva Medicals Admin Setup
echo ========================================
echo.

echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    echo Please check your Node.js installation
    pause
    exit /b 1
)
echo ✅ Dependencies installed
echo.

echo 🗄️  Setting up database...
call npm run setup-db
if %errorlevel% neq 0 (
    echo ❌ Database setup failed
    echo.
    echo 🔧 To fix this:
    echo 1. Install PostgreSQL from https://postgresql.org
    echo 2. Create database: createdb siva_medicals
    echo 3. Update .env file with your database credentials
    echo 4. Or use a cloud database like ElephantSQL
    echo.
    echo 🚀 You can still run the server without database for testing
    echo.
    set /p choice="Continue without database? (y/n): "
    if not "!choice!"=="y" (
        pause
        exit /b 1
    )
)
echo ✅ Database setup complete
echo.

echo 🚀 Starting server...
echo.
echo Choose mode:
echo [1] Full mode (requires PostgreSQL)
echo [2] Test mode (no database needed - data won't persist)
echo.
set /p mode="Enter choice (1 or 2) [default: 2]: "

if "%mode%"=="1" (
    echo Starting full server...
    echo Admin panel: http://localhost:3001/admin/login
    echo Credentials: admin / admin123
    npm start
) else (
    echo Starting test server...
    echo Admin panel: http://localhost:3001/admin/login
    echo Credentials: admin / admin123
    echo Note: Data will not persist between restarts
    npm run test
)