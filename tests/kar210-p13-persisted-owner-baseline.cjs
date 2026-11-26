'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {fixture}=require('./kar210-p13-owner-fixture.cjs');
const Tab=require('../src/background/services/tab-registry.js');
test('persisted product owners remain locked after independent facade recreation',async()=>{
 const f=fixture();for(const [kind,expected,id] of [['renewal','renewal','r'],['archive','archive-insertion','a'],['fill','trash-template','f'],['mass','mass-renewal','m']]){
  f.seed(kind);const before=structuredClone(f.rows);const first=f.make(),restarted=f.make();
  for(const owner of [first,restarted]){const s=await owner.getInsertionLockState();assert.equal(s.locked,true);assert.equal(s.kind,expected);assert.equal(s.ownerId,id);for(const requested of ['renewal','archive-insertion','trash-template'])await assert.rejects(owner.assertInsertionStartAvailable({kind:requested}),/läuft bereits/);}
  assert.deepEqual(f.rows,before);
 }
 f.seed('none');assert.equal((await f.make().getInsertionLockState()).locked,false);
 assert.equal(f.writes.length,0);assert.equal(f.logs.length,24);
});
test('historical registry restarts with exact worker ownership; unknown browser failure is not closure',async()=>{
 const rows={},calls=[];const storageSession={async get(keys){return Object.fromEntries(keys.filter(k=>Object.hasOwn(rows,k)).map(k=>[k,structuredClone(rows[k])]));},async set(p){Object.assign(rows,structuredClone(p));}};
 const now=()=>Date.parse('2026-11-25T00:00:00Z'),r=Tab.create({storageSession,now});
 await r.registerManagedWorker(11,'account-probe',{ownerId:'p1'});await r.observeTab({id:7,url:'https://www.kleinanzeigen.de/m-meine-anzeigen.html',windowId:2});
 const restarted=Tab.create({storageSession,now});assert.equal((await restarted.get(11)).owner.ownerId,'p1');assert.deepEqual(await restarted.managedTabIds(),[11]);
 const rejected=await restarted.releaseOwnership(11,{ownerId:'wrong'});assert.equal(rejected.released,false);assert.equal(rejected.reason,'owner-mismatch');
 await assert.rejects(restarted.getTabOrThrow(11,{get:async()=>{throw Error('fixture browser service unavailable');}}),/browser service unavailable/);
 assert.equal((await restarted.get(11)).lifecycleState,Tab.STATES.ACTIVE);
 await assert.rejects(restarted.closeTab(11,{remove:async()=>{throw Error('fixture permission denied');}}),/permission denied/);
 assert.equal((await restarted.get(11)).lifecycleState,Tab.STATES.ACTIVE);
 const closed=await restarted.closeTab(11,{remove:async id=>calls.push(id)});assert.equal(closed.closed,true);
 const after=Tab.create({storageSession,now});assert.equal((await after.get(11)).lifecycleState,Tab.STATES.GONE);
 assert.equal((await after.closeTab(11,{remove:async id=>calls.push(id)})).alreadyGone,true);assert.deepEqual(calls,[11]);assert.equal((await after.get(7)).managed,false);
});
test('later updater census, fence and admission are absent; no positive native closure asserted',()=>{
 const t=JSON.parse(fs.readFileSync('docs/maintenance/KAR210_BASELINE_TARGET.json','utf8'));
 for(const file of ['additional-owner-observer','persisted-owner-observer','update-workflow-fence','cross-worker-atomic-admission','trusted-owner-authority'].map(n=>'src/background/services/'+n+'.js')){
  assert.ok(t.absent.includes(file),file);assert.ok(!fs.existsSync(file),file);assert.ok(!t.packaged.includes(file),file);
 }
});
