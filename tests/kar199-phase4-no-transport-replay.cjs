// KAR-199: a dispatched destructive tab message is NEVER transparently
// bootstrapped and replayed after a closed Chrome response port.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const background = fs.readFileSync(path.join(__dirname,'../src/background/background.js'),'utf8');
const start = background.indexOf('async function sendTabRequestWithBootstrap(tabId, message) {');
const end = background.indexOf('\n}', start);
assert.ok(start !== -1 && end > start, 'real production message helper must be found');
const functionSource = background.slice(start,end + 2);
async function invoke(type) {
  const sent=[];
  let bootstraps=0;
  const firstError = new Error('The message port closed before a response was received.');
  const mock = {
    sendTabRequest:async (_tabId,message) => {
      sent.push(message.type);
      if(sent.length===1)throw firstError;
      return {ok:true,readback:'fixture'};
    },
    ensureContentConnection:async () => {bootstraps++;return {ready:true};}
  };
  const invokeRealHelper = vm.runInNewContext('('+functionSource+')',mock);
  return {
    promise:invokeRealHelper(73,{type,adId:'fixture-immutable-source'}),
    sent, get bootstraps(){return bootstraps}
  };
}
test('KAR-199 a closed DELETE response port remains unknown, not replayed',async () => {
  const f=await invoke('DELETE_OWN_AD_BY_ID');
  await assert.rejects(f.promise,/message port closed/i);
  assert.deepEqual(f.sent,['DELETE_OWN_AD_BY_ID']);
  assert.equal(f.bootstraps,0);
});
test('KAR-199 read-only MY_ADS_STATUS still recovers a disconnected content receiver',async () => {
  const f=await invoke('MY_ADS_STATUS');
  const result=await f.promise;
  assert.equal(result.readback,'fixture');
  assert.deepEqual(f.sent,['MY_ADS_STATUS','MY_ADS_STATUS']);
  assert.equal(f.bootstraps,1);
});
