// KAR-69: real code contracts for the read-only app->background->native check.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const bridge = require('../src/background/services/native-status-bridge.js');
const root = path.join(__dirname,'..');
const runtimeVersion = JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8')).version;
const extensionId = 'hafahjhhgiipdegfkgacchmnacgblnah';
const appUrl = 'chrome-extension://' + extensionId + '/app.html';
// Regression from the real owner's Chrome type:popup app: Chrome supplies sender.tab.
const sender = { id: extensionId, url: appUrl, origin: 'chrome-extension://' + extensionId, tab: { id: 111, windowId: 222 } };
const sha = 'a'.repeat(64), commit = 'b'.repeat(40);
let assertions=0;
function check(ok,label) { assert.ok(ok,label); assertions++; console.log('PASS KAR-69 '+label); }
async function deny(adapter,message,from,label) {
 let denied=false;
 try { await adapter.status(message,from); } catch(error) { denied=error.code==='KAR_NATIVE_UNTRUSTED_SENDER'; }
 check(denied,label);
}
function boot(send) {
 const ids=['nativeUpdateCheckButton','nativeUpdateCheckStatus','nativeUpdateCheckEvidence'];
 const nodes=Object.fromEntries(ids.map(id=>[id,{textContent:'',disabled:false,handlers:{},addEventListener(name,fn){this.handlers[name]=fn;}}]));
 const windowHandlers={};
 const extension={runtime:{getManifest:()=>({version:runtimeVersion}),lastError:null,sendMessage:send}};
 const source=fs.readFileSync(path.join(root,'src/app/native-update-check-ui.js'),'utf8');
 vm.runInNewContext(source,{document:{getElementById:id=>nodes[id]||null},chrome:extension,
  window:{addEventListener:(name,fn)=>{windowHandlers[name]=fn;}},setTimeout,clearTimeout});
 return {nodes,button:nodes.nativeUpdateCheckButton,status:nodes.nativeUpdateCheckStatus,
  evidence:nodes.nativeUpdateCheckEvidence,windowHandlers};
}
async function tick() { await new Promise(resolve=>setTimeout(resolve,20)); }
async function run() {
 const message={type:'GET_NATIVE_UPDATE_STATUS'};
 let calls=0;
 let registeredWindowId=222;
 let liveWindowType='popup';
 let liveWindowId=222;
 let liveTabWindowId=222;
 const adapter=bridge.create({
  gateway:{request:async op=>{calls++;check(op==='check','only read-only native check');return {ok:true,operation:'check'};}},
  getExtensionId:()=>extensionId,
  getAppUrl:()=>appUrl,
  getAppWindowId:async()=>registeredWindowId,
  getWindow:async()=>({id:liveWindowId,type:liveWindowType}),
  getTab:async id=>({id,windowId:id===111?liveTabWindowId:999})
 });
 const good=await adapter.status(message,sender);
 check(good.ok===true&&calls===1,'trusted app message accepted');
 await deny(adapter,{...message,operation:'apply_update'},sender,'reject injected action field');
 await deny(adapter,message,{...sender,id:'other-extension'},'reject other extension');
 await deny(adapter,message,{...sender,url:'https://www.kleinanzeigen.de/'},'reject page origin');
 await deny(adapter,message,{...sender,url:appUrl+'?spoof'},'reject forged extension document URL');
 await deny(adapter,message,{...sender,tab:{id:8,windowId:222}},'reject a different tab despite app URL');
 await deny(adapter,message,{...sender,tab:{id:111,windowId:999}},'reject tab outside registered window');
 await deny(adapter,message,{...sender,tab:undefined},'reject extension page lacking registered popup tab');
 registeredWindowId=333;
 await deny(adapter,message,sender,'reject stale or unregistered popup window');
 registeredWindowId=222;
 liveWindowType='normal';
 await deny(adapter,message,sender,'reject ordinary Chrome window');
 liveWindowType='popup';
 liveWindowId=333;
 await deny(adapter,message,sender,'reject window ID mismatch from Chrome');
 liveWindowId=222;
 liveTabWindowId=333;
 await deny(adapter,message,sender,'reject live tab moved into different window');
 liveTabWindowId=222;
 await deny(adapter,message,{...sender,origin:'https://attacker.invalid'},'reject mismatched sender origin');
 await deny(adapter,message,null,'reject missing sender');
 await deny(adapter,{type:'NATIVE_APPLY_UPDATE'},sender,'reject mutation operation');
 check(calls===1,'untrusted messages never trigger native transport');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
 const v=/^1\.23\.(0|[1-9]\d*)$/.exec(manifest.version);
 check(Boolean(v)&&Number(v[1])>=30,'reviewed Chrome ZIP version 1.23.30+ required');
 check(manifest.permissions.includes('nativeMessaging') && manifest.permissions.length===5,'reviewed nativeMessaging permission only');
 check(manifest.host_permissions.length===3,'existing host permissions unchanged');
 const router=fs.readFileSync(path.join(root,'src/background/background-message-router.js'),'utf8');
 const worker=fs.readFileSync(path.join(root,'src/background/background.js'),'utf8');
 check(router.includes('"GET_NATIVE_UPDATE_STATUS"') && worker.includes('requireNativeStatusBridge().status(message, sender)'),'background owns native status');
 check(worker.includes("crypto.getRandomValues(new Uint8Array(16))"),'fresh cryptographically random nonce');
 check(worker.includes('chrome.runtime.sendNativeMessage(host, payload'),'fixed native transport owned by background');
 check(worker.includes("getAppWindowId: async () =>") && worker.includes('chrome.storage.session.get(APP_WINDOW_SESSION_KEY)')
  && worker.includes('chrome.windows.get(windowId)') && worker.includes('chrome.tabs.get(tabId)'),
  'bridge consults authoritative registered Chrome popup window and tab');
 let requests=0;
 const payload={ok:true,operation:'check',installed:'1.23.29',approved:'1.23.30',sha256:sha,sourceCommit:commit};
 let screen=boot((msg,cb)=>{requests++;check(msg.type==='GET_NATIVE_UPDATE_STATUS','app only requests native status');cb({ok:true,result:payload});});
 check(requests===0,'no automatic update check at page load');
 screen.button.handlers.click();
 screen.button.handlers.click();
 await tick();
 check(requests===1,'busy UI suppresses duplicate requests');
 check(screen.status.textContent.includes('neuere Version'),'show read-only update availability');
 check(screen.evidence.textContent.includes('v'+runtimeVersion) && screen.evidence.textContent.includes(sha),'show active and pinned evidence');
 check(!screen.button.disabled,'UI unlocks after check');
 screen=boot((msg,cb)=>cb({ok:true,result:{ok:false,error:'HOST_UNAVAILABLE'}}));
 screen.button.handlers.click();await tick();
 check(screen.status.textContent.includes('nicht erreichbar'),'missing native helper shown safely');
 check(screen.evidence.textContent==='','failed status cannot show false verified evidence');
 screen=boot((msg,cb)=>cb({ok:false,error:'unavailable'}));
 screen.button.handlers.click();await tick();
 check(screen.status.textContent.includes('nicht erreichbar'),'worker error cannot imply successful update');
 screen=boot((msg,cb)=>cb({ok:true,result:{...payload,installed:'1.23.30',approved:'1.23.30'}}));
 screen.button.handlers.click();await tick();
 check(screen.status.textContent.includes('entsprechen'),'matched approved and installed version');
 const appHtml=fs.readFileSync(path.join(root,'app.html'),'utf8');
 check(appHtml.includes('src/app/native-update-check-ui.js')&&appHtml.includes('nativeUpdateCheckButton'),'packaged UI script and button');
 check(!appHtml.includes('nativeApplyUpdateButton'),'in-app apply deliberately absent');
 check(assertions>=27,'minimum Phase 2B safety assertions');
 console.log('PASS KAR-69 in-app Native Messaging status tests: '+assertions+' assertions');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
