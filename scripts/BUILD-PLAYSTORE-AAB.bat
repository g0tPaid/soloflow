@echo off
setlocal EnableExtensions
title SoloFlow - Build Play Store AAB
color 0E
cd /d "C:\Users\user\Projects\flowbooks"
set "FLOWBOOKS_ROOT=%CD%"

:: Find Java from Android Studio (java is often not on PATH)
set "JAVA_HOME="
if exist "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" (
  set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
)
if not defined JAVA_HOME if exist "%LOCALAPPDATA%\Programs\Android\Android Studio\jbr\bin\java.exe" (
  set "JAVA_HOME=%LOCALAPPDATA%\Programs\Android\Android Studio\jbr"
)
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"

if not defined ANDROID_HOME if exist "%LOCALAPPDATA%\Android\Sdk" (
  set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
  set "PATH=%ANDROID_HOME%\platform-tools;%PATH%"
)

set "VERSION=0.4.0"
if exist "VERSION" set /p VERSION=<"VERSION"

echo.
echo  ==========================================
echo    SoloFlow v%VERSION% - Play Store AAB
echo  ==========================================
echo.
echo  This builds a RELEASE package for Google Play.
echo  Your app MUST already be hosted on HTTPS.
echo  See: docs\PLAY-STORE.md
echo.

if defined JAVA_HOME if exist "%JAVA_HOME%\bin\java.exe" goto :java_ok
where java >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :java_ok
    echo  Java not found. Install Android Studio first:
    echo  https://developer.android.com/studio
    echo.
    echo  If Android Studio is installed, open it once and let setup finish.
    echo.
    pause
    exit /b 1
:java_ok
if defined JAVA_HOME echo  Using Java: %JAVA_HOME%

echo  Enter your LIVE public URL ^(must start with https://^)
echo  Example: https://web-production-8e8c3.up.railway.app
echo.
set /p SERVER_URL="Production HTTPS URL [https://web-production-8e8c3.up.railway.app]: "
if "%SERVER_URL%"=="" set "SERVER_URL=https://web-production-8e8c3.up.railway.app"

echo %SERVER_URL% | findstr /i /b "https://" >nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERROR: URL must start with https://
    echo  Play Store apps cannot use http://PC-IP anymore.
    echo.
    pause
    exit /b 1
)

set "CAPACITOR_SERVER_URL=%SERVER_URL%"
echo.
echo  App will open: %CAPACITOR_SERVER_URL%
echo.

cd apps\web

if not exist "..\..\node_modules" (
    echo [1/6] Installing packages...
    cd ..\..
    call pnpm install
    if %ERRORLEVEL% NEQ 0 (
        echo  pnpm install failed.
        pause
        exit /b 1
    )
    cd apps\web
) else (
    echo [1/6] Packages OK.
)

if not exist "android" (
    echo [2/6] Creating Android project...
    call npx cap add android
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo  Failed. Install Android Studio, open it once, then retry.
        pause
        exit /b 1
    )
) else (
    echo [2/6] Android project OK.
)

if not exist "android-keys\soloflow-upload.jks" (
    echo.
    echo [3/6] Creating upload keystore ^(ONE TIME^)...
    echo  You will be asked for name/org and passwords.
    echo  WRITE THE PASSWORDS DOWN AND BACK UP THE .jks FILE.
    echo.
    if not exist "android-keys" mkdir android-keys
    keytool -genkey -v -keystore android-keys\soloflow-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias soloflow
    if %ERRORLEVEL% NEQ 0 (
        echo  keytool failed.
        pause
        exit /b 1
    )
) else (
    echo [3/6] Keystore found: android-keys\soloflow-upload.jks
)

if not exist "android\keystore.properties" (
    echo.
    echo  Creating android\keystore.properties ...
    echo  Enter the SAME passwords you used for the keystore.
    echo.
    set /p STORE_PASS="Keystore password: "
    set /p KEY_PASS="Key password (often same): "
    (
        echo storeFile=../android-keys/soloflow-upload.jks
        echo storePassword=%STORE_PASS%
        echo keyAlias=soloflow
        echo keyPassword=%KEY_PASS%
    ) > android\keystore.properties
    echo  Saved android\keystore.properties ^(do not commit this file^)
) else (
    echo [3b] keystore.properties OK.
)

echo [4/6] Ensuring release signing is configured...
findstr /C:"signingConfig signingConfigs.release" android\app\build.gradle >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   Release signing already configured
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%FLOWBOOKS_ROOT%\scripts\ensure-android-signing.ps1"
    if %ERRORLEVEL% NEQ 0 (
        echo  Signing setup failed. See messages above.
        pause
        exit /b 1
    )
)

echo [5/6] Syncing Capacitor with production URL...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo  Sync failed.
    pause
    exit /b 1
)

echo [6/6] Building signed release AAB...
set "GRADLE_USER_HOME=%USERPROFILE%\.gradle"
if not exist "%USERPROFILE%\.gradle\local-android-maven\com\android\tools\build\builder\8.7.2\builder-8.7.2.jar" (
    echo.
    echo  Android libraries not cached yet.
    echo  Run DOWNLOAD-ANDROID-LIBS.bat on your Desktop first ^(20-60 min, VPN off^).
    echo.
    pause
    exit /b 1
)
call "%FLOWBOOKS_ROOT%\scripts\fix-gradle-cache.bat"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$v = (Get-Content '..\..\VERSION' -ErrorAction SilentlyContinue | Select-Object -First 1).Trim(); if (-not $v) { $v = '0.4.0' }; $g = 'android\app\build.gradle'; if (Test-Path $g) { (Get-Content $g -Raw) -replace 'versionName \".*?\"', ('versionName \"' + $v + '\"') | Set-Content $g -NoNewline; Write-Host ('  versionName -> ' + $v) }; $gw = 'android\gradle\wrapper\gradle-wrapper.properties'; if (Test-Path $gw) { (Get-Content $gw -Raw) -replace 'networkTimeout=\d+', 'networkTimeout=600000' | Set-Content $gw -NoNewline }"
cd android
set "GRADLE_USER_HOME=%USERPROFILE%\.gradle"
echo.
echo  Stopping old Gradle processes ^(safe after power cuts^)...
call gradlew.bat --stop >nul 2>&1
echo  Building AAB - can take 20-40 min on slow internet. DO NOT CLOSE.
echo.
call gradlew.bat --version
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  Gradle not ready. Run DOWNLOAD-GRADLE.bat first.
    cd ..\..
    pause
    exit /b 1
)
call gradlew.bat bundleRelease --no-daemon
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  AAB build failed.
    echo  If Gradle timed out downloading, open Android Studio once and wait for setup to finish.
    echo  Then retry this script.
    cd ..\..
    pause
    exit /b 1
)

set "AAB_SRC=app\build\outputs\bundle\release\app-release.aab"
set "AAB_DEST=%USERPROFILE%\Desktop\SoloFlow-play.aab"
if not exist "%AAB_SRC%" (
    echo  AAB not found at %AAB_SRC%
    cd ..\..
    pause
    exit /b 1
)
copy /Y "%AAB_SRC%" "%AAB_DEST%" >nul

:: Optional release APK for sideload testing
call gradlew.bat assembleRelease >nul 2>&1
set "APK_SRC=app\build\outputs\apk\release\app-release.apk"
set "APK_DEST=%USERPROFILE%\Desktop\SoloFlow-release.apk"
if exist "%APK_SRC%" copy /Y "%APK_SRC%" "%APK_DEST%" >nul

cd ..\..

echo.
echo  ==========================================
echo    SUCCESS
echo  ==========================================
echo.
echo  Upload this to Play Console:
echo    %AAB_DEST%
echo.
if exist "%USERPROFILE%\Desktop\SoloFlow-release.apk" (
    echo  Optional phone install test:
    echo    %USERPROFILE%\Desktop\SoloFlow-release.apk
    echo.
)
echo  NEXT STEPS:
echo    1. Open https://play.google.com/console
echo    2. Create app / Internal testing
echo    3. Upload SoloFlow-play.aab
echo    4. Follow docs\PLAY-STORE.md checklist
echo.
pause
