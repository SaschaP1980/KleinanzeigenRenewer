@echo off
setlocal DisableDelayedExpansion
if not "%~1"=="" (
  echo ERROR: Setup does not accept arguments.
  exit /b 2
)
set "KAR94_SETUP_SOURCE=%~dp0"
set "KAR94_SETUP_MANAGER=%~dp0Manage-KleinanzeigenRenewer-OneClick.ps1"
set "KAR94_TEST_MODE=0"
if /I "%CI%"=="true" if "%KAR_ONECLICK_TEST_MODE%"=="1" set "KAR94_TEST_MODE=1"
set "KAR94_PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
echo.
echo Kleinanzeigen Manager - Desktop OneClick shortcut setup
echo This installs only the separate Desktop update shortcut for your Windows user.
echo Your Chrome extension, account, saved listings and photos will not be changed.
echo The setup files must have been extracted together from the official ZIP.
echo.
if not exist "%KAR94_PS%" (
  echo STOP: Windows PowerShell 5.1 is not available. Contact your support team.
  goto :Failure
)
"%KAR94_PS%" -NoProfile -NonInteractive -Command "$pairs=@(@('Manage-KleinanzeigenRenewer-OneClick.ps1','e55b8680a05364bc3ee8e74ccb5f0a2dac8f4ff4aab9ea7ba55f06d9bc311540'),@('OneClick-Update-KleinanzeigenRenewer.cmd','9b66627bc7d769e705c551b2bf06b8c60fb264473f8579dd54716262873c7c29'),@('KleinanzeigenRenewer-Updater.ps1','68df5ce673aee62d58e1f751750e209bc9033bb6d6bd11511f378a0ac26897f5')); foreach($pair in $pairs) { $file=Join-Path $env:KAR94_SETUP_SOURCE $pair[0]; if(-not(Test-Path -LiteralPath $file -PathType Leaf)) { Write-Host ('STOP: Missing setup file '+$pair[0]); exit 10 }; $sha=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant(); if($sha -cne $pair[1]) { Write-Host ('STOP: Setup file integrity check failed: '+$pair[0]); exit 11 } }; Write-Host 'PASS: Official setup file integrity checked.'; exit 0"
if errorlevel 1 (
  echo STOP: Incomplete or modified setup package. Use only the official ZIP.
  goto :Failure
)
if "%KAR94_TEST_MODE%"=="1" (
  if not defined KAR94_TEST_ROOT goto :Failure
  if not defined KAR94_TEST_DESKTOP goto :Failure
)
echo.
echo This setup requires no administrator rights. Type YES when asked.
echo An existing installed shortcut is checked and NEVER silently replaced.
echo.
call :RunManager install
if errorlevel 1 goto :Failure
call :RunManager check
if errorlevel 1 goto :Failure
set "KAR94_INSTALLED=%LOCALAPPDATA%\KleinanzeigenRenewer\Updater"
if "%KAR94_TEST_MODE%"=="1" set "KAR94_INSTALLED=%KAR94_TEST_ROOT%"
"%KAR94_PS%" -NoProfile -NonInteractive -Command "$pairs=@(@('Manage-KleinanzeigenRenewer-OneClick.ps1','e55b8680a05364bc3ee8e74ccb5f0a2dac8f4ff4aab9ea7ba55f06d9bc311540'),@('OneClick-Update-KleinanzeigenRenewer.cmd','9b66627bc7d769e705c551b2bf06b8c60fb264473f8579dd54716262873c7c29'),@('KleinanzeigenRenewer-Updater.ps1','68df5ce673aee62d58e1f751750e209bc9033bb6d6bd11511f378a0ac26897f5')); foreach($pair in $pairs) { if($pair[0] -ceq 'Manage-KleinanzeigenRenewer-OneClick.ps1') { continue }; $file=Join-Path $env:KAR94_INSTALLED $pair[0]; if(-not(Test-Path -LiteralPath $file -PathType Leaf)) { exit 13 }; if((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -cne $pair[1]) { exit 14 } }; exit 0"
if errorlevel 1 (
  echo STOP: A different installed shortcut kit was detected and preserved.
  echo No existing shortcut was overwritten. Ask for an approved upgrade procedure.
  goto :Failure
)
echo.
echo SUCCESS: Desktop shortcut 'Kleinanzeigen Manager aktualisieren' is verified.
echo The update shortcut can be used later, after Chrome is fully closed.
goto :Success

:RunManager
if "%KAR94_TEST_MODE%"=="1" goto :RunManagerTest
"%KAR94_PS%" -NoProfile -File "%KAR94_SETUP_MANAGER%" -Action %1
exit /b %ERRORLEVEL%
:RunManagerTest
"%KAR94_PS%" -NoProfile -File "%KAR94_SETUP_MANAGER%" -Action %1 -TestRoot "%KAR94_TEST_ROOT%" -TestDesktop "%KAR94_TEST_DESKTOP%" -TestSource "%KAR94_SETUP_SOURCE%"
exit /b %ERRORLEVEL%

:Failure
echo No Chrome extension files were changed.
echo If Windows or your company policy blocked setup, stop and contact IT.
if "%KAR94_TEST_MODE%"=="1" exit /b 1
pause
exit /b 1

:Success
if "%KAR94_TEST_MODE%"=="1" exit /b 0
pause
exit /b 0
