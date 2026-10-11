const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path='src/background/services/';
const files=['renewal-verification-flow.js','renewal-reinventory-flow.js','paid-checkout-recovery-service.js'];
const loaded=new Map(); const ctx=vm.createContext({console,Date,Promise,Set,Map,Object,Array,String,Number,RegExp,Error,URL,structuredClone,clearTimeout,setTimeout,globalThis:null});
ctx.globalThis=ctx;ctx.KRDeps={register(name,api){if(loaded.has(name))throw new Error('duplicate '+name);loaded.set(name,api)},require(name){if(!loaded.has(name))throw new Error('missing runtime module '+name);return loaded.get(name)}};
let count=0;const ok=(msg,fn)=>{fn();count++;console.log('PASS '+msg)};
for(const file of files){vm.runInContext(fs.readFileSync(path+file,'utf8'),ctx,{filename:file})}
vm.runInContext(fs.readFileSync('src/background/controllers/renewal-workflow-controller.js','utf8'),ctx,{filename:'renewal-workflow-controller.js'});
ok('all four real KRDeps owners register and compose in one in-process VM',()=>{
 for(const name of ['KRRenewalVerificationFlow','KRRenewalReinventoryFlow','KRPaidCheckoutRecoveryService','KRRenewalWorkflowController'])assert.equal(typeof loaded.get(name)?.create,'function',name)
});
function fakePorts(file){
 const src=fs.readFileSync(path+file,'utf8');const pattern=/const \{ ([^}\n]+) \} = (\w+Port);/g;const result={};let match;
 while((match=pattern.exec(src))){result[match[2]]={};for(const k of match[1].split(',').map(x=>x.trim())) result[match[2]][k]=match[2]==='configPort'?(k.startsWith('RENEWAL_MODE_')?k.endsWith('FAST')?'fast':'safe':1):()=>null}
 return result;
}
(async()=>{
 for(const [name,file,method] of [
  ['KRRenewalVerificationFlow',files[0],'runFastRenewalVerification'],
  ['KRRenewalReinventoryFlow',files[1],'runRenewalReinventory']
 ]){
  let tabCalls=0;const ports=fakePorts(file);ports.sessionPort.readRenewalSessions=async()=>({});for(const k of Object.keys(ports.tabPort))ports.tabPort[k]=()=>{tabCalls++;throw new Error('unsafe tab call')};
  const svc=loaded.get(name).create(ports);await assert.rejects(async()=>svc[method]('nonexistent-id'),/Renewal-Sitzung wurde nicht gefunden/);assert.equal(tabCalls,0);count++;console.log('PASS '+name+' missing session refuses remote operations');
 }
 const paidPorts=fakePorts(files[2]);paidPorts.policyPort.isCheckoutAbortedRecoveryCandidate=()=>false;paidPorts.diagnosticsPort.flushDiagnosticBuffer=async()=>{};paidPorts.sessionPort.readDiagnostics=async()=>[];paidPorts.sessionPort.readProfiles=async()=>({profiles:[]});
 let tabCalls=0;for(const k of Object.keys(paidPorts.tabPort))paidPorts.tabPort[k]=()=>{tabCalls++;throw new Error('unsafe tab call')};
 const paid=loaded.get('KRPaidCheckoutRecoveryService').create(paidPorts);
 const result=await paid.tryRecoverAbortedPaidCheckout({renewalId:'x',status:'submitted'},'test');assert.equal(result.recovered,false);assert.equal(result.attempted,false);assert.equal(tabCalls,0);count++;console.log('PASS non-candidate paid checkout does not touch remote state');
 assert.throws(()=>loaded.get('KRRenewalVerificationFlow').create({}),/dependency .* is required/);count++;console.log('PASS missing flow port fails early during composition');
 const bg=fs.readFileSync('src/background/background.js','utf8');assert.match(bg,/renewalMaxPhaseAttempts, renewalAttemptDetails/);count++;console.log('PASS real background passes the previously implicit renewalAttemptDetails policy dependency');
 console.log(`${count}/6 PASS v1.23.15 runtime`);
})().catch(e=>{console.error(e);process.exitCode=1});
