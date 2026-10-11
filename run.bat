@echo off
setlocal
title QuizMaster Pro - Java Full-Stack Suite
cd /d "%~dp0"

set "JAVA_BIN=C:\Users\GOUTAM KUMAR MAJHI\.antigravity-ide\extensions\redhat.java-1.56.0-win32-x64\jre\21.0.12.1-win32-x86_64\bin"

echo ==========================================================
echo    QUIZMASTER PRO - JAVA FULL-STACK EXAMINATION SUITE     
echo ==========================================================
echo [1/2] Compiling Java backend and components...
"%JAVA_BIN%\javac.exe" WebQuizServer.java QuizSystem.java
if errorlevel 1 (
    echo.
    echo [ERROR] Compilation failed. Please check error messages above.
    pause
    exit /b %errorlevel%
)

echo [2/2] Launching Java Web Server ^& Interactive Web App...
echo.
echo Application will automatically open at: http://localhost:8080/
echo Press Ctrl+C in this console to stop the server when done.
echo ----------------------------------------------------------
echo.

"%JAVA_BIN%\java.exe" WebQuizServer
pause
