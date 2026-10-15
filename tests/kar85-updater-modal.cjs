// KAR-85: characterize the new compact read-only updater modal without native mutations.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'src/app/native-update-check-ui.js'), 'utf8');
let passes = 0;
function check(value, label) { assert.ok(value, label); passes++; console.log('PASS KAR85 ' + label); }
const modalPos = html.indexOf('id="nativeUpdateDialog"');
const compactPos = html.indexOf('class="configuration-subsection native-update-check"');
check(compactPos >= 0 && html.includes('id="nativeUpdateSummaryStatus"')
  && html.includes('id="nativeUpdateOpenButton"'), 'compact status and permanent opener');
check(modalPos > compactPos && html.includes('aria-labelledby="nativeUpdateDialogTitle"'),
  'separately labeled semantic dialog exists');
const compact = html.slice(compactPos, html.indexOf('</details>', compactPos));
check(!compact.includes('nativeUpdateFallback') && !compact.includes('nativeUpdateCheckEvidence'),
  'full fallback instructions and diagnostic evidence moved out of configuration');
check(html.includes('id="nativeUpdateGuide"') && html.includes('id="nativeUpdateGuideToggle"')
  && html.includes('id="nativeUpdateLastChecked"'), 'guide and timestamp fields exist');
check(!html.includes('nativeApplyUpdateButton'), 'in-browser native apply remains unavailable');
const ids = ['nativeUpdateOpenButton','nativeUpdateSummaryStatus','nativeUpdateDialog',
  'nativeUpdateDialogTitle','nativeUpdateClose','nativeUpdateDone','nativeUpdateGuide',
  'nativeUpdateGuideToggle','nativeUpdateCheckButton','nativeUpdateCheckStatus',
  'nativeUpdateCheckEvidence','nativeUpdateFallbackStatus','nativeUpdateLastChecked',
  'nativeUpdateActiveVersion'];
function boot(send) {
  const nodes = {};
  let focused = '';
  for (const id of ids) {
    nodes[id] = {
      textContent:'', disabled:false, hidden:id==='nativeUpdateGuide', open:false, handlers:{},
      addEventListener(name, fn) { this.handlers[name] = fn; },
      focus() { focused = id; },
      showModal() { this.open = true; },
      close() { this.open = false; if (this.handlers.close) this.handlers.close(); }
    };
  }
  const handlers={};
  const doc={getElementById:id=>nodes[id]||null};
  const runtime={lastError:null,getManifest:()=>({version:'1.23.32'}),sendMessage:send};
  vm.runInNewContext(js,{document:doc,chrome:{runtime},
    window:{addEventListener:(name,fn)=>{handlers[name]=fn;}},setTimeout,clearTimeout});
  return {nodes,handlers,getFocused:()=>focused};
}
const delay=()=>new Promise(done=>setTimeout(done,25));
async function run() {
  let requests=0;
  const a=boot((msg, cb)=>{requests++;check(msg.type==='GET_NATIVE_UPDATE_STATUS'
    && Object.keys(msg).length===1, 'native request is strictly read-only');
    cb({ok:true,result:{ok:false,error:'HOST_UNAVAILABLE'}});});
  check(requests===0 && a.nodes.nativeUpdateSummaryStatus.textContent.includes('nicht verfügbar'),
    'no automatic native check and truthful unknown default');
  a.nodes.nativeUpdateOpenButton.handlers.click();
  check(a.nodes.nativeUpdateDialog.open && a.getFocused()==='nativeUpdateCheckButton',
    'opener opens dialog and places keyboard focus inside');
  a.nodes.nativeUpdateGuideToggle.handlers.click();
  check(!a.nodes.nativeUpdateGuide.hidden, 'guide expands on demand');
  a.nodes.nativeUpdateCheckButton.handlers.click();
  await delay();
  check(a.nodes.nativeUpdateSummaryStatus.textContent.includes('nicht verfügbar')
    && a.nodes.nativeUpdateCheckStatus.textContent.includes('nicht erreichbar'),
    'native failure never masquerades as no update');
  check(a.nodes.nativeUpdateFallbackStatus.textContent.includes('Desktop'),
    'failure preserves standalone fallback');
  a.nodes.nativeUpdateClose.handlers.click();
  check(!a.nodes.nativeUpdateDialog.open && a.getFocused()==='nativeUpdateOpenButton',
    'close returns focus to opener');
  a.nodes.nativeUpdateOpenButton.handlers.click();
  check(a.nodes.nativeUpdateDialog.open, 'dialog reopens after close');
  a.nodes.nativeUpdateDialog.close();
  check(a.getFocused()==='nativeUpdateOpenButton', 'Escape/native close returns focus');
  check(requests===1,'no background polling');
  const b=boot((_msg,cb)=>cb({ok:true,result:{ok:true,operation:'check',
    installed:'1.23.31',approved:'1.23.33',sha256:'a'.repeat(64),
    sourceCommit:'b'.repeat(40)}}));
  b.nodes.nativeUpdateCheckButton.handlers.click();
  await delay();
  check(b.nodes.nativeUpdateSummaryStatus.textContent.includes('v1.23.33')
    && b.nodes.nativeUpdateLastChecked.textContent.length>0,
    'verified newer approval in compact summary with last checked timestamp');
  const c=boot((_msg,cb)=>cb({ok:true,result:{ok:true,operation:'check',
    installed:'1.23.32',approved:'1.23.32',sha256:'a'.repeat(64),
    sourceCommit:'b'.repeat(40)}}));
  c.nodes.nativeUpdateCheckButton.handlers.click();
  await delay();
  check(c.nodes.nativeUpdateSummaryStatus.textContent.includes('keine neue Version'),
    'equal versions show no newer update');
  console.log('PASS KAR85 updater modal contract: '+passes+' assertions');
}
run().catch(error=>{ console.error(error); process.exitCode=1; });
