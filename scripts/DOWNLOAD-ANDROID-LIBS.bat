@echo off
setlocal EnableExtensions
title SoloFlow - Download Android build libraries
color 0B

set "BASE=%USERPROFILE%\.gradle\local-android-maven"
set "GOOGLE=https://dl.google.com/dl/android/maven2"
set "ALI=https://maven.aliyun.com/repository/google"

echo.
echo  ==========================================
echo    Download Android libs (slow internet)
echo  ==========================================
echo.
echo  VPN OFF. Can take 20-60 min. Resumes if interrupted.
echo.

where curl.exe >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  curl.exe not found. Use Windows 10+ or download files in browser.
    pause
    exit /b 1
)

:: Critical jars that often timeout (AGP 8.7.2)
call :dl "com/android/tools/build/builder/8.7.2/builder-8.7.2"
call :dl "com/android/tools/build/gradle/8.7.2/gradle-8.7.2"
call :dl "com/android/tools/build/builder-model/8.7.2/builder-model-8.7.2"
call :dl "com/android/tools/build/gradle-api/8.7.2/gradle-api-8.7.2"
call :dl "com/android/tools/sdk-common/31.7.2/sdk-common-31.7.2"
call :dl "com/android/tools/sdklib/31.7.2/sdklib-31.7.2"
call :dl "com/android/tools/repository/31.7.2/repository-31.7.2"
call :dl "com/android/tools/build/aaptcompiler/8.7.2/aaptcompiler-8.7.2"
call :dl "com/android/tools/build/bundletool/1.17.1/bundletool-1.17.1"

echo.
echo  ==========================================
echo    Done - now run BUILD-PLAYSTORE-AAB.bat
echo  ==========================================
echo.
pause
exit /b 0

:dl
set "REL=%~1"
for %%F in ("%REL%") do set "NAME=%%~nxF"
set "DIR=%BASE%\%REL%"
set "JAR=%DIR%\%NAME%.jar"
set "POM=%DIR%\%NAME%.pom"
if not exist "%DIR%" mkdir "%DIR%"

if exist "%JAR%" (
    echo  OK  %NAME%.jar
    goto :eof
)

echo  GET %NAME%.jar ...
curl.exe -L --retry 30 --retry-delay 15 --connect-timeout 60 --max-time 7200 -C - -o "%JAR%.part" "%ALI%/%REL%.jar"
if not exist "%JAR%.part" curl.exe -L --retry 30 --retry-delay 15 --connect-timeout 60 --max-time 7200 -C - -o "%JAR%.part" "%GOOGLE%/%REL%.jar"
if not exist "%JAR%.part" (
    echo  FAIL %NAME%.jar - try phone hotspot and run again
    goto :eof
)
move /Y "%JAR%.part" "%JAR%" >nul

curl.exe -L --retry 10 -o "%POM%" "%ALI%/%REL%.pom" 2>nul
if not exist "%POM%" curl.exe -L --retry 10 -o "%POM%" "%GOOGLE%/%REL%.pom" 2>nul
echo  OK  %NAME%.jar
goto :eof
