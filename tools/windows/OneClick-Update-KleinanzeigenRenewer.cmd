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
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -File "%SCRIPT%" -Command check
if errorlevel 1 (
  echo STOP: Freigabepruefung fehlgeschlagen. Kein Update gestartet.
  pause
  exit /b 1
)
echo.
echo Update wird vorbereitet. Bei bereits aktueller Version wird abgebrochen.
echo Vor Datei-Aenderungen fordert der Windows-Updater erneut JA als Zustimmung an.
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -File "%SCRIPT%" -Command update
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" echo STOP oder kein neuerer freigegebener Stand. Keine Browser-Daten geaendert.
if "%RC%"=="0" echo Update abgeschlossen. Chrome starten und dieselbe Erweiterung unter chrome://extensions/ neu laden.
pause
exit /b %RC%
