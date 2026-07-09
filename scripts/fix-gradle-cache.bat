@echo off
:: Fixes Gradle cache when download finished but build still fails.
setlocal EnableExtensions

set "GRADLE_USER_HOME=%USERPROFILE%\.gradle"
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
if exist "%JAVA_HOME%\bin\java.exe" set "PATH=%JAVA_HOME%\bin;%PATH%"

set "ZIP=%USERPROFILE%\Downloads\gradle-8.11.1-bin.zip"
set "DST=%GRADLE_USER_HOME%\wrapper\dists\gradle-8.11.1-bin\bpt9gzteqjrbo1mjrsomdt32c"
set "SRC=%GRADLE_USER_HOME%\wrapper\dists\gradle-8.11.1-bin\g1a5eieddp7ycykywb3bu929"

if not exist "%ZIP%" (
    echo Gradle zip not found: %ZIP%
    exit /b 1
)

if not exist "%DST%\gradle-8.11.1-bin.zip.ok" (
    echo Fixing Gradle cache...
    if not exist "%DST%" mkdir "%DST%"
    del /q "%DST%\*.lck" 2>nul
    del /q "%DST%\*.part" 2>nul
    if exist "%SRC%\gradle-8.11.1" (
        xcopy /E /I /Y "%SRC%\gradle-8.11.1" "%DST%\gradle-8.11.1" >nul
        copy /Y "%SRC%\gradle-8.11.1-bin.zip.ok" "%DST%\gradle-8.11.1-bin.zip.ok" >nul
    )
    copy /Y "%ZIP%" "%DST%\gradle-8.11.1-bin.zip" >nul
    echo Gradle cache fixed.
)
exit /b 0
