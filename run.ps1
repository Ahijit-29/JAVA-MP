# QuizMaster Pro - PowerShell Launcher
$Host.UI.RawUI.WindowTitle = "QuizMaster Pro - Java Full-Stack Suite"
Set-Location -Path $PSScriptRoot

$JavaBin = "C:\Users\GOUTAM KUMAR MAJHI\.antigravity-ide\extensions\redhat.java-1.56.0-win32-x64\jre\21.0.12.1-win32-x86_64\bin"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   QUIZMASTER PRO - JAVA FULL-STACK EXAMINATION SUITE    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[1/2] Compiling Java backend and components..." -ForegroundColor Yellow

& "$JavaBin\javac.exe" WebQuizServer.java QuizSystem.java
if ($LASTEXITCODE -eq 0) {
    Write-Host "[2/2] Launching Java Web Server & Interactive Web App...`n" -ForegroundColor Green
    Write-Host "Application will automatically open at: http://localhost:8080/`n" -ForegroundColor White
    & "$JavaBin\java.exe" WebQuizServer
} else {
    Write-Error "[ERROR] Compilation failed."
}
