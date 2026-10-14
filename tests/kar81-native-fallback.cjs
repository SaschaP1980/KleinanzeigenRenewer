// KAR-81: Desktop One-Click fallback guidance must be available without a live NativeHost.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'app.html'),'utf8');
const src=fs.readFileSync(path.join(root,'src/app/native-update-check-ui.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
let passes=0;
function check(value,label){assert.ok(value,label);passes++;console.log('PASS KAR81 '+label);}
const ids=['nativeUpdateCheckButton','nativeUpdateCheckStatus','nativeUpdateCheckEvidence','nativeUpdateFallbackStatus'];
function boot(send){
 const nodes=Object.fromEntries(ids.map(id=>[id,{textContent:'',disabled:false,handlers:{},
  addEventListener(name,cb){this.handlers[name]=cb;}}]));
 const extension={runtime:{lastError:null,getManifest:()=>({version:manifest.version}),sendMessage:send}};
 vm.runInNewContext(src,{
  chrome:extension,document:{getElementById:id=>nodes[id]||null},
  window:{addEventListener(){}},setTimeout,clearTimeout
 });
 return nodes;
}
async function tick(){return new Promise(resolve=>setTimeout(resolve,30));}
async function run(){
 check(html.includes('id="nativeUpdateFallback"') &&
       html.includes('id="nativeUpdateFallbackStatus"'),'HTML includes always-visible manual fallback section');
 check(!/<[^>]*id="nativeUpdateFallback"[^>]*\shidden(?:\s|>)/.test(html),
  'fallback guidance visible before native check');
 check(html.includes('WINDOWS_ONECLICK_UPDATER.md') &&
       html.includes('rel="noopener noreferrer"'),'fixed human-click GitHub setup docs link');
 check(html.includes('Windows-Verknüpfung') &&
       html.includes('Chrome') && html.includes('neu laden'),
  'manual instructions include Desktop shortcut and browser reload');
 check(!html.includes('nativeApplyUpdateButton'),'no falsely actionable native apply');
 check(manifest.permissions.length===5 && manifest.permissions.includes('nativeMessaging') &&
       manifest.host_permissions.length===3,'unchanged Chrome permissions/host scopes');
 let requests=0;
 let nodes=boot((m,cb)=>{requests++;check(m.type==='GET_NATIVE_UPDATE_STATUS' &&
 Object.keys(m).length===1,'only existing read-only native message');cb({ok:true,result:{ok:false,error:'HOST_UNAVAILABLE'}});});
 check(requests===0,'no automatic host request on page load');
 nodes.nativeUpdateCheckButton.handlers.click();await tick();
 check(nodes.nativeUpdateCheckStatus.textContent.includes('nicht erreichbar'),'missing host clearly reported');
 check(nodes.nativeUpdateFallbackStatus.textContent.includes('Desktop') &&
       nodes.nativeUpdateFallbackStatus.textContent.includes('ohne NativeHost'),
       'missing host suggests independent Desktop shortcut, no policy attribution');
 check(nodes.nativeUpdateCheckEvidence.textContent==='','no invented verified evidence on host failure');
 check(requests===1,'no repeated automatic native request');
 nodes=boot((m,cb)=>cb({ok:true,result:{ok:true,operation:'check',installed:'1.23.30',approved:'1.23.31',
  sha256:'a'.repeat(64),sourceCommit:'b'.repeat(40)}}));
 nodes.nativeUpdateCheckButton.handlers.click();await tick();
 check(nodes.nativeUpdateCheckStatus.textContent.includes('neuere Version'),'good native status preserved');
 check(nodes.nativeUpdateFallbackStatus.textContent.includes('Installation aus dem Manager') &&
       nodes.nativeUpdateFallbackStatus.textContent.includes('Desktop'),
       'healthy check retains truthful manual alternative until native apply exists');
 nodes=boot((m,cb)=>cb({ok:true,result:{ok:false,error:'TIMEOUT'}}));
 nodes.nativeUpdateCheckButton.handlers.click();await tick();
 check(nodes.nativeUpdateFallbackStatus.textContent.includes('Desktop'),'timeout preserves usable fallback');
 nodes=boot((m,cb)=>cb({ok:true,result:{ok:false,error:'UNSUPPORTED_PLATFORM'}}));
 nodes.nativeUpdateCheckButton.handlers.click();await tick();
 check(nodes.nativeUpdateFallbackStatus.textContent.includes('nur unter Windows'),'not Windows OS appropriately framed');
 check(!/(?:Start-Process|schtasks|Start-ScheduledTask|sendNativeMessage|nativeApplyUpdateButton|ExecutionPolicy\s+Bypass)/i.test(src),
  'UI never executes a native update or task');
 console.log('PASS KAR81 manual fallback UI: '+passes+' assertions');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
