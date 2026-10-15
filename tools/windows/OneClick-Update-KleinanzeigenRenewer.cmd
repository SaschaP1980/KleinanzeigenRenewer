@echo off
setlocal
if not "%~1"=="" (
  echo ERROR: This One-Click launcher does not accept arguments.
  pause
  exit /b 2
)
set "SCRIPT=%~dp0KleinanzeigenRenewer-Updater.ps1"
echo Kleinanzeigen Manager - One-Click Update
echo This launches only the verified Windows updater; it does not control Chrome.
echo All Chrome processes must be closed before program files are replaced.
echo The Chrome extension will not be removed; your profile data stays untouched.
echo.
if not exist "%SCRIPT%" (
  echo ERROR: The Windows updater is missing from its fixed installation location.
  pause
  exit /b 2
)
echo Checking the approved version once.
echo If that version is already installed, no program files will be replaced.
echo Only a newer approved version requires you to type YES before installation.
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -File "%SCRIPT%" -Command oneclick
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo STOP: Windows updater failed. A successful update has NOT been confirmed.
) else (
  echo.
  echo Check completed. BEREITS_AKTUELL means that no update is needed.
  echo Only after FILES_INSTALLED_RELOAD_REQUIRED: Open the same Chrome profile, then reload the existing extension at chrome://extensions/.
)
pause
exit /b %RC%
