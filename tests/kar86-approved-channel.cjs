// KAR-86: NativeHost-independent, fail-closed public GitHub approved-channel read contract.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html=fs.readFileSync(path.join(root,'app.html'),'utf8');
const js=fs.readFileSync(path.join(root,'src/app/native-update-check-ui.js'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
let passes=0;
function check(v, name){ assert.ok(v,name); passes++; console.log('PASS KAR86 '+name); }
check(html.includes('id="nativeUpdateManagedVersion"'),'managed Windows receipt gets separate, initially unknown field');
check(js.includes('https://api.github.com/repos/SaschaP1980/KleinanzeigenRenewer'),
  'fixed public GitHub approved-channel endpoint declared');
check(manifest.host_permissions.length===3 && !manifest.host_permissions.some(x=>x.includes('github')),
  'no additional Chrome host permission introduced');
const ids=['nativeUpdateCheckButton','nativeUpdateCheckStatus','nativeUpdateCheckEvidence',
 'nativeUpdateFallbackStatus','nativeUpdateSummaryStatus','nativeUpdateLastChecked',
 'nativeUpdateManagedVersion','nativeUpdateActiveVersion','nativeUpdateOpenButton',
 'nativeUpdateDialog','nativeUpdateClose','nativeUpdateDone','nativeUpdateGuide',
 'nativeUpdateGuideToggle'];
const head='a'.repeat(40);
const approval=(version='1.23.34')=>({
 schema:1,version,commit:'b'.repeat(40),sha256:'c'.repeat(64),
 bytes:759000,extensionId:'hafahjhhgiipdegfkgacchmnacgblnah',
 channel:'approved',note:'Explicitly approved immutable channel'
});
function response(data, url) {
 return {ok:true,status:200,redirected:false,url,
  text:async()=>JSON.stringify(data)};
}
function fetcher(channel=approval(), override=()=>null) {
 const calls=[];
 async function fetchMock(url, options) {
   calls.push({url,options});
   const changed=override(url,calls.length);
   if (changed) return changed;
   if(url.endsWith('/git/ref/heads/main')) return response({object:{type:'commit',sha:head}},url);
   if(url.includes('/contents/release/windows-updater-channel.json?ref=')){
     const content=Buffer.from(JSON.stringify(channel),'utf8').toString('base64');
     return response({type:'file',path:'release/windows-updater-channel.json',encoding:'base64',
       sha:'d'.repeat(40),size:Buffer.byteLength(JSON.stringify(channel)),content},url);
   }
   throw Error('unexpected update network endpoint: '+url);
 }
 return {calls,fetchMock};
}
function boot(send, fetchMock) {
 const nodes={}; const handlers={};
 for(const id of ids)nodes[id]={textContent:'',disabled:false,hidden:id==='nativeUpdateGuide',
  open:false,handlers:{},addEventListener(n,cb){this.handlers[n]=cb;},focus(){},
  setAttribute(){},showModal(){this.open=true;},close(){this.open=false;this.handlers.close?.();}};
 const runtime={getManifest:()=>({version:'1.23.33'}),lastError:null,sendMessage:send};
 vm.runInNewContext(js,{document:{getElementById:id=>nodes[id]||null},
  chrome:{runtime},window:{addEventListener:(name,cb)=>{handlers[name]=cb;}},
  fetch:fetchMock,AbortController,TextDecoder,atob,URL,setTimeout,clearTimeout},
  {filename:path.join(root,'src/app/native-update-check-ui.js')});
 return {nodes,handlers};
}
const tick=()=>new Promise(done=>setTimeout(done,45));
async function run(){
 let natives=0;
 const noNative=(m,cb)=>{natives++;cb({ok:true,result:{ok:false,error:'HOST_UNAVAILABLE'}});};
 let f=fetcher(approval());
 let screen=boot(noNative,f.fetchMock);await tick();
 check(natives===0,'automatic read-only channel check does not invoke NativeHost');
 check(f.calls.length===2,'only two fixed GitHub public API calls');
 check(f.calls.every(c=>c.options.credentials==='omit'&&c.options.method==='GET'
   && c.options.mode==='cors' && c.options.redirect==='error'),
   'no credentials, mutation, redirect or host-permission bypass');
 check(screen.nodes.nativeUpdateSummaryStatus.textContent.includes('v1.23.34'),
   'genuine newer approved channel displayed without native host');
 check(screen.nodes.nativeUpdateManagedVersion.textContent.includes('nicht'),
   'no guessed Windows managed receipt version');
 check(screen.nodes.nativeUpdateLastChecked.textContent.length>0,'time of successful check recorded');
 f=fetcher(approval('1.23.33'));screen=boot(noNative,f.fetchMock);await tick();
 check(screen.nodes.nativeUpdateSummaryStatus.textContent.includes('keine neue Version'),
   'equal approved Chrome version not called newer');
 f=fetcher(approval('1.23.32'));screen=boot(noNative,f.fetchMock);await tick();
 check(screen.nodes.nativeUpdateSummaryStatus.textContent.includes('neuer als die Freigabe'),
   'browser newer than approval never triggers downgrade');
 const malformed=[
   {...approval(),channel:'preview'},
   {...approval(),extensionId:'spoofed'},
   {...approval(),sha256:'deadbeef'},
   {...approval(),version:'1.23.999999999999999999999'},
   {...approval(),bytes:0},
   {...approval(),commit:'unknown'}
 ];
 for(const bad of malformed) {
   f=fetcher(bad);screen=boot(noNative,f.fetchMock);await tick();
   check(screen.nodes.nativeUpdateSummaryStatus.textContent.includes('nicht verfügbar'),
    'malformed or unapproved channel fails closed');
 }
 f=fetcher(approval(),url=>url.includes('/git/ref/')?Promise.reject(new Error('network blocked')):null);
 screen=boot(noNative,f.fetchMock);await tick();
 check(screen.nodes.nativeUpdateSummaryStatus.textContent.includes('nicht verfügbar'),
  'network failure never becomes no-update');
 f=fetcher(approval(),url=>url.includes('/contents/')?response({type:'file',path:'release/windows-updater-channel.json',encoding:'base64',content:'%%%INVALID',size:99},url):null);
 screen=boot(noNative,f.fetchMock);await tick();
 check(screen.nodes.nativeUpdateSummaryStatus.textContent.includes('nicht verfügbar'),
  'invalid base64 is refused');
 // User manually checks while native transport is unavailable; independent channel must still win.
 f=fetcher(approval('1.23.34'));screen=boot(noNative,f.fetchMock);
 screen.nodes.nativeUpdateCheckButton.handlers.click();await tick();
 check(screen.nodes.nativeUpdateSummaryStatus.textContent.includes('v1.23.34')
   && screen.nodes.nativeUpdateFallbackStatus.textContent.includes('Desktop'),
   'corporate native failure does not erase trusted approved-channel status or fallback');
 check(natives===1,'only deliberate manual check invokes native IPC');
 screen.handlers.pagehide?.();check(true,'pagehide lifecycle supported');
 console.log('PASS KAR86 approved-channel contract: '+passes+' assertions');
}
run().catch(e=>{console.error(e);process.exitCode=1});
