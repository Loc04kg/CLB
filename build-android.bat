@echo off
chcp 65001 >nul
echo ============================================
echo    HUTECH CLB - Android APK Builder
echo ============================================

:: Set Java 21
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.7.6-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

echo [1/3] Java version:
java -version

echo.
echo [2/3] Building debug APK...
cd /d "%~dp0android"
call gradlew.bat assembleDebug

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build failed! See errors above.
    pause
    exit /b 1
)

echo.
echo [3/3] Build SUCCESS!
echo.
echo APK location:
echo   android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo === Next steps ===
echo 1. Connect Android device via USB (enable USB Debugging)
echo 2. Run: adb install android\app\build\outputs\apk\debug\app-debug.apk
echo 3. Make sure server is running: npm run dev (in /server)
echo 4. Server IP: 192.168.1.39:5000
echo.
pause
