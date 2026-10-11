const fs=require('fs'); const path=require('path'); const assert=require('assert');
function allJs(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?allJs(path.join(dir,e.name)):e.name.endsWith('.js')?[path.join(dir,e.name)]:[])}
const files=allJs('src/app'); const all=files.map(p=>fs.readFileSync(p,'utf8')).join('\n'); let pass=0;
function ok(name,fn){fn();pass++;console.log('PASS',name)}
ok('inventory detailed and compact behavior remains represented',()=>{assert.match(all,/renderCompactInventoryRow/);assert.match(all,/renderInventories/);assert.match(all,/USER_ARTICLE_DETAILS_OPENED/);});
ok('trash detailed and compact behavior remains represented',()=>{assert.match(all,/renderCompactTrashRow/);assert.match(all,/renderTrash/);assert.match(all,/USER_TRASH_PERMANENT_DELETE_CLICK/);});
ok('shared record primitives remain represented',()=>{assert.match(all,/makeInfoLine/);assert.match(all,/buildFullImageStrip/);assert.match(all,/createCompactListRow/);});
ok('archive and trash-template behaviors remain represented',()=>{assert.match(all,/validateArchiveFile/);assert.match(all,/openTrashTemplateDialog/);assert.match(all,/USER_ARCHIVE_INSERT_CONFIRMED/);assert.match(all,/USER_TRASH_TEMPLATE_FILL_STARTED/);});
ok('profile backup snapshot and transactional replacement remain represented',()=>{assert.match(all,/indexedDB\.open\('kleinanzeigen-renewal'\)/);assert.match(all,/snapshotProfileIndexedData/);assert.match(all,/replaceProfileIndexedData/);assert.match(all,/transaction\(\['inventories', 'images'\], 'readwrite'\)/);});
ok('publish bypass safety remains absent',()=>{assert.strictEqual((all.match(/\.submit\s*\(/g)||[]).length,0);assert.strictEqual((all.match(/requestSubmit\s*\(/g)||[]).length,0);});
console.log(`${pass}/6 PASS v1.23.14 characterization`);
