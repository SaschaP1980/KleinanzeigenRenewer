const assert=require('assert'),fs=require('fs'),vm=require('vm');let API=null;
const sandbox={console,Date,Promise,Object,String,Number,Array,Map,Set,Error,KRDeps:{register(n,a){if(n==='KRTemplateFillService')API=a;}}};sandbox.globalThis=sandbox;
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('template-fill-service.js','utf8'),sandbox,{filename:'template-fill-service.js'});assert.ok(API?.create);
const storage={async get(){return{}},async set(){}};
const svc=API.create({storageLocal:storage,getInventory:async()=>null,getInventoryImage:async()=>null,terminalStatuses:new Set(['complete','needs-review','error']),sessionsKey:'x',broadcast:()=>{}});
assert.equal(svc.isEmergencyResettableSession({templateOnly:true,status:'complete',stage:'template-only-complete'}),false,'terminal template-only-complete must not be resettable');
assert.equal(svc.isEmergencyResettableSession({templateOnly:true,status:'complete',stage:'template-only-published'}),true,'published template recovery remains resettable until inventory finishes');
assert.equal(svc.isEmergencyResettableSession({templateOnly:true,status:'running',stage:'filling'}),true,'active fill remains resettable');
console.log('3/3 PASS v1.23.5 terminal template emergency reset regression');
