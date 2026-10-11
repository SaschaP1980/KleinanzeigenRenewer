const fs=require('fs'),vm=require('vm'),assert=require('assert');
function load(file,name){const regs={};const c={console,URL,setTimeout,clearTimeout,globalThis:null};c.globalThis=c;c.KRDeps={register(n,a){regs[n]=a;}};vm.createContext(c);vm.runInContext(fs.readFileSync(file,'utf8'),c,{filename:file});return c[name]||regs[name];}
let p=0;async function ok(n,f){try{await f();p++;console.log('PASS '+n)}catch(e){console.error('FAIL '+n);throw e}}
(async()=>{
 await ok('inventory scope new-only skips only active existing ad ids',async()=>{const api=load('inventory-scope.js','KRInventoryScope');const ids=api.activeInventoryAdIds([{adId:'1',profileId:'p'},{adId:'2',profileId:'q'},{adId:'3',profileId:'p',recordKind:'trash'}],'p');assert.deepStrictEqual(Array.from(ids),['1']);assert.strictEqual(api.shouldSkipExisting('new-only',ids,'1'),true);assert.strictEqual(api.shouldSkipExisting('all',ids,'1'),false);});
 await ok('inventory reconciliation requires stable equal id sets',async()=>{const api=load('inventory-reconciliation.js','KRInventoryReconciliation');assert.strictEqual(api.sameIdSet(['1','2'],['2','1']),true);assert.strictEqual(api.sameIdSet(['1'],['1','2']),false);});
 console.log(`${p}/2 PASS v1.22.14 pre-refactor runtime`);
})().catch(e=>{console.error(e);process.exit(1)});
