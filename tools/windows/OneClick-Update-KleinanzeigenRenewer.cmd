@echo off
setlocal
if not "%~1"=="" (
  echo FEHLER: Dieser feste One-Click-Starter akzeptiert keine Parameter.
  pause
  exit /b 2
)
set "SCRIPT=%~dp0KleinanzeigenRenewer-Updater.ps1"
echo Kleinanzeigen Manager - One-Click-Update
echo Dies startet nur den geprueften Windows-Updater, keine automatischen Browseraktionen.
echo Alle Chrome-Prozesse muessen vor dem Dateiaustausch geschlossen sein.
echo Die Erweiterung wird NICHT entfernt; die Profildaten bleiben unangetastet.
echo.
if not exist "%SCRIPT%" (
  echo FEHLER: Windows-Updater fehlt am festen Installationsort.
  pause
  exit /b 2
)
echo Freigegebene Version wird einmalig geprueft.
echo Ist sie bereits installiert, endet dieser Vorgang ohne Dateiaustausch.
echo Nur bei einer neueren Version fordert der Updater JA vor dem Dateiaustausch.
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -File "%SCRIPT%" -Command oneclick
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo STOP: Windows-Updater fehlgeschlagen. Kein erfolgreicher Updateabschluss bestaetigt.
) else (
  echo.
  echo Pruefung beendet. Bei BEREITS_AKTUELL ist kein Update erforderlich.
  echo Nur nach FILES_INSTALLED_RELOAD_REQUIRED: Chrome starten und die bestehende Erweiterung unter chrome://extensions/ neu laden.
)
pause
exit /b %RC%
