// KAR-91 – test-first technical Windows OneClick console language and consent policy.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const launch=read('tools/windows/OneClick-Update-KleinanzeigenRenewer.cmd');
const updater=read('tools/windows/KleinanzeigenRenewer-Updater.ps1');
const manager=read('tools/windows/Manage-KleinanzeigenRenewer-OneClick.ps1');
let count=0;
function check(v,label){ assert.ok(v,label); console.log('PASS KAR91 '+label);count++; }
check(launch.includes('This One-Click launcher does not accept arguments'),
 'English launcher argument rejection');
check(launch.includes('All Chrome processes must be closed')&&
 launch.includes('Open the same Chrome profile')&&launch.includes(' -Command oneclick'),
 'English workflow and same-profile reload without changed entrypoint');
check(!/\b(?:FEHLER|Pruefung|geprueft|Dateiaustausch|Verknuepfung|Bestaetigung|schliessen|aktuell|muessen|erforderlich|neuer[e]?)\b/i.test(launch.replace(/BEREITS_AKTUELL|KEIN_NEUERES_UPDATE/g,'')),
 'no German app-owned launcher prose except fixed protocol codes');
check(updater.includes("type YES to proceed")&&updater.includes("-ceq 'YES'")&&
 !updater.includes("type JA to proceed"), 'updater human consent explicitly English and exact');
check(updater.includes("Already up to date - no update required")&&
 updater.includes("No newer version is approved"), 'equal and older approval outputs are English');
check(updater.includes("Event 'BEREITS_AKTUELL'")&&updater.includes("Event 'KEIN_NEUERES_UPDATE'")&&
 updater.includes("Event 'FILES_INSTALLED_RELOAD_REQUIRED'"),
 'machine-readable updater event IDs unchanged');
check(manager.includes("type YES to confirm")&&manager.includes("-cne 'YES'")&&
 !manager.includes("zur Bestaetigung JA eingeben"), 'setup manager uses English fail-closed human consent');
check(manager.includes('Desktop shortcut')&&manager.includes('Updater copy')&&
 !/NICHT_EINGERICHTET: One-Click-Desktopverknuepfung/.test(manager),
 'English setup/check/remove messaging');
check(!/ExecutionPolicy\s+Bypass|Start-ScheduledTask|schtasks|runas/i.test(launch),
 'no policy bypass or arbitrary process execution');
console.log('PASS KAR91 '+count+' English OneClick contracts');
