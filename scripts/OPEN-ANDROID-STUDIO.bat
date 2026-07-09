@echo off
title SoloFlow - Download Gradle via Android Studio
color 0B
echo.
echo  This opens the Android project in Android Studio so Gradle downloads once.
echo  Wait until the bottom status bar says sync is FINISHED, then close Studio
echo  and run BUILD-PLAYSTORE-AAB.bat again.
echo.
set "PROJECT=C:\Users\user\Projects\flowbooks\apps\web\android"
if not exist "%PROJECT%" (
    echo  Android project not found. Run BUILD-PLAYSTORE-AAB.bat first.
    pause
    exit /b 1
)
set "STUDIO=C:\Program Files\Android\Android Studio\bin\studio64.exe"
if exist "%STUDIO%" (
    start "" "%STUDIO%" "%PROJECT%"
    echo  Android Studio opened. Wait for Gradle sync to finish.
) else (
    echo  Open Android Studio manually, then:
    echo  File -^> Open -^> %PROJECT%
)
echo.
pause
