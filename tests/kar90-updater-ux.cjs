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
test(m&&!m[0].includes('Windows-Installationsversion')&&
 !m[0].includes('SHA-256')&&!m[0].includes('Commit'),
 'no technical receipt or evidence in primary UI');
test(m&&m[0].includes('Hilfe zur Windows-Verknüpfung'), 'help link visible only within guide');
test(j.includes('Du verwendest die aktuell freigegebene Version.') &&
 j.includes('Die Verfügbarkeit konnte gerade nicht geprüft werden.') &&
 j.includes('Suche nach Updates'), 'clear end-user German status states');
test(j.includes('approvedChannelVerified') && j.includes('GET_NATIVE_UPDATE_STATUS'),
 'existing fail-closed read-only approved channel and native bridge preserved');
console.log('PASS KAR90 total '+passes);
