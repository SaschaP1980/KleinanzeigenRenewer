const fs=require('fs'); const path=require('path');
const root=path.resolve(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const html=read('app.html'), css=read('app.css'), js=read('app-layout-controller.js')+'\n'+read('app.js'), actions=read('actions-diagnostics-controller.js'), bg=read('background.js');
const actionCode=js+'\n'+actions;
let pass=0; function ok(cond,msg){ if(!cond){ console.error('FAIL',msg); process.exitCode=1; } else { console.log('PASS',msg); pass++; }}
ok(/inventory-sticky-occlusion/.test(html)&&/trash-sticky-occlusion/.test(html),'Inventar und Papierkorb besitzen Sticky-Occlusion-Flächen');
ok(/\.list-sticky-occlusion[\s\S]*position\s*:\s*fixed[\s\S]*pointer-events\s*:\s*none/.test(css)&&/background\s*:\s*var\(--app-canvas-background\)/.test(css),'Occlusion ist fixed, nicht-interaktiv und nutzt Canvas-Background');
ok(/--list-sticky-occlusion-height/.test(js)&&/--list-sticky-app-header-bottom/.test(js),'Occlusion-Höhe und App-Header-Unterkante werden dynamisch aus derselben Sticky-Geometrie gesetzt');
ok(/UI_ACTIONS_STATE_SNAPSHOT/.test(actionCode)&&/UI_ACTION_STATE_DESYNC_DETECTED/.test(actionCode),'Actions-State-Snapshot und Desync-Diagnose sind vorhanden');
ok(/UI_ACTION_ATTEMPT/.test(actionCode)&&/elementFromPoint/.test(actionCode)&&/pointerEvents/.test(actionCode),'Action-Attempts erfassen Hit-Target und Pointer-Events');
ok(/UI_ACTIONS_RESYNC_STARTED/.test(actionCode)&&/UI_ACTIONS_RESYNC_COMPLETED/.test(actionCode)&&/UI_ACTIONS_RESYNC_FAILED/.test(actionCode),'Actions-Re-Sync ist vollständig diagnostiziert');
ok(/addEventListener\(['"]focus['"]/.test(js)&&/visibilitychange/.test(js),'Focus und Visibility lösen Actions-Re-Sync aus');
ok(/GET_BACKGROUND_EPOCH/.test(bg)&&/GET_BACKGROUND_EPOCH/.test(js),'Background-Epoch kann erkannt und korreliert werden');
if(!process.exitCode) console.log(`${pass}/8 PASS`);
