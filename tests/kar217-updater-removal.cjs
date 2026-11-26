'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const removed=['src/app/native-update-check-ui.js','src/background/services/native-update-status-gateway.js','src/background/services/native-status-bridge.js'];
test('S04 retains exact extension identity and host scopes',()=>{
 const m=JSON.parse(read('manifest.json'));
 assert.deepEqual([...m.host_permissions].sort(),['https://img.kleinanzeigen.de/*','https://kleinanzeigen.de/*','https://www.kleinanzeigen.de/*']);
 assert.equal(require('node:crypto').createHash('sha256').update(Buffer.from(m.key,'base64')).digest('hex'),'70507977688f3465a60227cd0261bd07d92fad620625cd7ebff8f0856d9c5ed3');
});
test('S04 manifest removes only native messaging permission',()=>{
 const m=JSON.parse(read('manifest.json'));
 assert.deepEqual([...m.permissions].sort(),['activeTab','scripting','storage','unlimitedStorage']);
});
test('S04 no updater controls or script in Manager HTML or CSS',()=>{
 assert.equal(/nativeUpdate|native-update|Windows-Updater|NativeHost|windows-updater-einrichten/i.test(read('src/app/app.html')),false,'updater HTML surface');
 assert.equal(/native-update/i.test(read('src/app/app.css')),false,'updater stylesheet surface');
 assert.match(read('src/app/app.css'),/compact-action-icon\.action-update/);
 assert.ok(fs.existsSync(path.join(root,'icons/action-update.svg')));
});
test('S04 former updater request is rejected by the actual message contract',()=>{
 require('../src/shared/runtime-deps.js');
 const registry=require('../src/shared/message-contract-registry.js');
 assert.equal(registry.route('GET_NATIVE_UPDATE_STATUS','background').action,'reject');
 assert.equal(registry.route('GET_NATIVE_UPDATE_STATUS','background').errorCode,'KR_MESSAGE_CONTRACT_UNKNOWN');
 for(const type of ['GET_PROFILE_STATE','START_TEMPLATE_FILL','FINISH_RENEWAL_REPLACEMENT','RESET_ACTIVE_WORKFLOWS','GET_DIAGNOSTIC_EXPORT'])assert.equal(registry.route(type,'background').action,'accept',type);
 assert.equal(registry.route('VERIFY_OWN_AD_ABSENT_BY_ID','my-ads-content').action,'accept');
});
test('S04 background has no native updater imports, calls or routes',()=>{
 assert.equal(/NativeUpdateStatusGateway|NativeStatusBridge|nativeStatusBridge|GET_NATIVE_UPDATE_STATUS|sendNativeMessage|connectNative|native-update-status-gateway|native-status-bridge/.test(read('src/background/background.js')),false,'native background surface');
 assert.equal(/GET_NATIVE_UPDATE_STATUS/.test(read('src/background/background-message-router.js')),false,'former router handler');
});
test('S04 no updater modules in active source or Chrome packaging list',()=>{
 const pack=read('scripts/package.py');
 for(const p of removed){assert.ok(!pack.includes(p),p+' still packaged');assert.ok(!fs.existsSync(path.join(root,p)),p+' still active source');}
 assert.ok(pack.includes('icons/action-update.svg'));
});
test('S04 no updater-specific activation references in runtime',()=>{
 const matches=[];
 function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(js|html|css)$/.test(p)&&/GET_NATIVE_UPDATE_STATUS|sendNativeMessage|connectNative|de\.kleinanzeigenrenewer\.updater|windows-updater-channel\.json|native-update-check-ui\.js|KRNativeStatusBridge|KRNativeUpdateStatusGateway/.test(fs.readFileSync(p,'utf8')))matches.push(path.relative(root,p));}}
 walk(path.join(root,'src'));assert.deepEqual(matches,[]);
});
