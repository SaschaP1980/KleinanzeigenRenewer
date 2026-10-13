@echo off
setlocal
echo Kleinanzeigen Renewer - lokaler Windows-Updater
echo Bitte alle Chrome-Fenster und Hintergrundprozesse zuerst schliessen.
echo Die Erweiterung wird NICHT deinstalliert. Chrome-Daten werden NICHT bearbeitet.
echo.
set "SCRIPT=%~dp0KleinanzeigenRenewer-Updater.ps1"
if not exist "%SCRIPT%" (
  echo FEHLER: PowerShell-Updater fehlt neben dieser CMD-Datei.
  pause
  exit /b 2
)
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -File "%SCRIPT%" -Command check
if errorlevel 1 (
  echo Metadatenpruefung fehlgeschlagen. Keine Installation.
  pause
  exit /b 1
)
echo.
echo Fuer Neuinstallationen: Taste I. Fuer Updates: Taste U. Sonst Abbruch.
choice /C IUA /N /M "Installieren (I), Updaten (U), Abbrechen (A): "
if errorlevel 3 exit /b 0
if errorlevel 2 (
  "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -File "%SCRIPT%" -Command update
) else (
  "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -File "%SCRIPT%" -Command install
)
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" echo Update fehlgeschlagen. Bitte Protokoll unter %%LOCALAPPDATA%%\KleinanzeigenRenewer\State lesen.
if "%RC%"=="0" echo Fertig. Jetzt dieselbe Erweiterung unter chrome://extensions/ manuell neu laden.
pause
exit /b %RC%
