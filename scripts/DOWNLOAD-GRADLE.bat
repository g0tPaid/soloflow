@echo off
setlocal EnableExtensions
title SoloFlow - Download Gradle (slow internet fix)
color 0B

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
if exist "%JAVA_HOME%\bin\java.exe" set "PATH=%JAVA_HOME%\bin;%PATH%"

set "GRADLE_URL=https://services.gradle.org/distributions/gradle-8.11.1-bin.zip"
set "GRADLE_ZIP=gradle-8.11.1-bin.zip"
set "DOWNLOAD=%USERPROFILE%\Downloads\%GRADLE_ZIP%"
set "ANDROID=C:\Users\user\Projects\flowbooks\apps\web\android"
set "PROPS=%ANDROID%\gradle\wrapper\gradle-wrapper.properties"

echo.
echo  ==========================================
echo    Download Gradle for SoloFlow build
echo  ==========================================
echo.
echo  Smaller package (~130 MB). Turn VPN OFF.
echo.

if not exist "%DOWNLOAD%" (
    echo [1/4] Downloading %GRADLE_ZIP% ...
    echo       Saving to: %DOWNLOAD%
    echo       This can take 15-40 minutes. Do not close.
    echo.
    echo  TIP: If this fails, open this link in Chrome and save the file:
    echo       %GRADLE_URL%
    echo       Save as: %DOWNLOAD%
    echo       Then run this script again.
    echo.
    where curl >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        curl -L --retry 10 --retry-delay 15 --connect-timeout 60 --max-time 7200 -C - -o "%DOWNLOAD%" "%GRADLE_URL%"
    ) else (
        powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri '%GRADLE_URL%' -OutFile '%DOWNLOAD%' -TimeoutSec 7200"
    )
)

if not exist "%DOWNLOAD%" (
    echo.
    echo  No Gradle zip found. Download in browser first ^(link above^).
    pause
    exit /b 1
)

for %%A in ("%DOWNLOAD%") do set "SIZE=%%~zA"
if %SIZE% LSS 50000000 (
    echo.
    echo  Download incomplete ^(%SIZE% bytes^). Need ~130 MB.
    echo  Delete %DOWNLOAD% and try browser download, then run again.
    pause
    exit /b 1
)

echo [2/4] Download OK ^(%SIZE% bytes^)
echo [3/4] Installing Gradle from local file ^(no internet needed^)...

cd /d "%ANDROID%"

:: Remove broken partial downloads
for /d %%D in ("%USERPROFILE%\.gradle\wrapper\dists\gradle-8.11.1-*") do (
    for /d %%H in ("%%D\*") do (
        del /q "%%H\*.lck" 2>nul
        del /q "%%H\*.part" 2>nul
    )
)

:: Use file:// URL so Gradle reads from Downloads (works offline)
set "FILE_URL=file\:///%DOWNLOAD:\=/%"
powershell -NoProfile -Command ^
  "$p='%PROPS%'; $c=Get-Content $p -Raw; $c=$c -replace 'distributionUrl=.*','distributionUrl=%FILE_URL%'; $c=$c -replace 'networkTimeout=\d+','networkTimeout=600000'; Set-Content $p $c -NoNewline"

call gradlew.bat --version
set "GRADLE_OK=%ERRORLEVEL%"

:: Restore normal HTTPS URL for future builds
powershell -NoProfile -Command ^
  "$p='%PROPS%'; $c=Get-Content $p -Raw; $c=$c -replace 'distributionUrl=.*','distributionUrl=https\://services.gradle.org/distributions/gradle-8.11.1-bin.zip'; Set-Content $p $c -NoNewline"

if %GRADLE_OK% NEQ 0 (
    echo.
    echo  Gradle install failed.
    pause
    exit /b 1
)

echo.
echo [4/4] Gradle is ready.
echo.
echo  ==========================================
echo    SUCCESS - run BUILD-PLAYSTORE-AAB.bat next
echo  ==========================================
echo.
pause
