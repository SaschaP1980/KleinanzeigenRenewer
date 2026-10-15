// KAR-90 – UX parity and human-friendly updater modal contracts, test first.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root=path.resolve(__dirname,'..');
const h=fs.readFileSync(path.join(root,'app.html'),'utf8');
const c=fs.readFileSync(path.join(root,'app.css'),'utf8');
const j=fs.readFileSync(path.join(root,'src/app/native-update-check-ui.js'),'utf8');
let passes=0;
const test=(condition,message)=>{assert.ok(condition,message);passes++;console.log('PASS KAR90 '+message);};
const m=h.match(/<dialog id="nativeUpdateDialog"[\s\S]*?<\/dialog>/);
test(m&&m[0].includes('class="profile-manager-modal native-update-modal"')&&m[0].includes('class="profile-manager-header"'), 'canonical Profile Management modal shell and header reused');
test(m&&m[0].includes('class="profile-manager-kicker"')&&m[0].includes('>UPDATES<'), 'same uppercase kicker and heading hierarchy');
test(m&&/id="nativeUpdateClose"[^>]*class="modal-close"/.test(m[0])&&
 m[0].includes('class="modal-close-icon"'), 'matching circular SVG close control');
test(m&&m[0].includes('class="profile-manager-actions native-update-modal-footer"')&&
 m[0].includes('id="nativeUpdateDone"'), 'same Profile Management footer layout');
test(/\.native-update-check\s*\{[^}]*padding-bottom:(?:12|14|16)px;/.test(c),
 'bottom inset below Updater öffnen before following separator');
test(m&&!m[0].includes('id="nativeUpdateFallback"')&&
 m[0].includes('id="nativeUpdateGuide"')&&m[0].includes('id="nativeUpdateGuideToggle"'),
 'one progressive guide, not duplicate permanent help card');
test(m&&m[0].includes('Version in Chrome')&&m[0].includes('id="nativeUpdateApprovedVersion"'),
 'clear Chrome vs approved version descriptions');
test(m&&m[0].includes('class="native-update-technical-details"')&&
 m[0].indexOf('Windows-Installationsversion')>m[0].indexOf('id="nativeUpdateGuide"')&&
 m[0].indexOf('id="nativeUpdateCheckEvidence"')>m[0].indexOf('<summary>Technische Details</summary>'),
 'technical receipt and evidence only within secondary collapsed details');
test(m&&m[0].includes('Hilfe zur Windows-Verknüpfung'), 'help link visible only within guide');
test(j.includes('Du verwendest die aktuell freigegebene Version.') &&
 j.includes('Die Verfügbarkeit konnte gerade nicht geprüft werden.') &&
 j.includes('Suche nach Updates'), 'clear end-user German status states');
test(j.includes('approvedChannelVerified') && j.includes('GET_NATIVE_UPDATE_STATUS'),
 'existing fail-closed read-only approved channel and native bridge preserved');

// KAR-90 follow-up: intent-based setup and fixed independent footer (test-first).
const modal=m?.[0]||'';
const footer=modal.match(/<footer class="profile-manager-actions native-update-modal-footer">([\s\S]*?)<\/footer>/)?.[1]||'';
test(footer.includes('id="nativeUpdateCheckButton"') &&
 footer.includes('id="nativeUpdateDone"') &&
 footer.indexOf('id="nativeUpdateCheckButton"')<footer.indexOf('id="nativeUpdateDone"') &&
 (modal.match(/id="nativeUpdateCheckButton"/g)||[]).length===1,
 'retry on left and close on right in one fixed footer; exactly one functional retry button');
test(modal.includes('Zum ersten Mal hier?') &&
 modal.includes('Einrichtungsanleitung öffnen') &&
 modal.includes('Verknüpfung bereits vorhanden?') &&
 modal.includes('Update-Schritte anzeigen') &&
 modal.indexOf('Einrichtungsanleitung öffnen')<modal.indexOf('id="nativeUpdateGuide"'),
 'two self-selected user paths; beginner guide is discoverable without expanding update instructions');
test(modal.includes('docs/user-manuals/windows-updater-einrichten.md') &&
 !modal.includes('docs/WINDOWS_ONECLICK_UPDATER.md') &&
 modal.includes('rel="noopener noreferrer"'),
 'beginner action links only to real German end-user manual and is an external instruction, not install');
test(/id="nativeUpdateGuide"[^>]*hidden/.test(modal) &&
 /id="nativeUpdateGuideToggle"[^>]*aria-expanded="false"/.test(modal) &&
 j.includes('Update-Schritte anzeigen') &&
 j.includes('Update-Schritte ausblenden'),
 'existing-user instructions are progressive, accessible and initially collapsed');
test(/\.native-update-modal-footer\s*\{[^}]*justify-content:space-between;/.test(c) &&
 /\.native-update-modal-footer\s+button/.test(c),
 'fixed footer left/right alignment without changing shared Profile Manager styling');
test(modal.includes('id="nativeUpdateActiveVersion"') &&
 modal.includes('id="nativeUpdateApprovedVersion"') &&
 modal.includes('id="nativeUpdateManagedVersion"') &&
 j.includes('approvedChannelVerified') && !modal.includes('nativeApplyUpdateButton'),
 'approved channel, Chrome version, unknown Windows kit and no in-browser installer remain distinct');

console.log('PASS KAR90 total '+passes);
