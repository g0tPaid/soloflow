@echo off
title SoloFlow - Fix keystore passwords
color 0E
echo.
echo  Your keystore passwords are missing or wrong in keystore.properties.
echo  Enter the SAME passwords you used when creating the keystore.
echo.
set /p STORE_PASS="Keystore password: "
set /p KEY_PASS="Key password (press Enter if same): "
if "%KEY_PASS%"=="" set "KEY_PASS=%STORE_PASS%"
(
    echo storeFile=../../android-keys/soloflow-upload.jks
    echo storePassword=%STORE_PASS%
    echo keyAlias=soloflow
    echo keyPassword=%KEY_PASS%
) > "C:\Users\user\Projects\flowbooks\apps\web\android\keystore.properties"
echo.
echo  Saved. Now run BUILD-PLAYSTORE-AAB.bat again.
echo.
pause
