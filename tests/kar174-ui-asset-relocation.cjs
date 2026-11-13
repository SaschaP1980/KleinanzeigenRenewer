'use strict';
// KAR-174: executable ZIP/UI-URL closure for relocated extension pages (offline only).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const moves=new Map([['app.html','src/app/app.html'],['app.css','src/app/app.css'],['popup.html','src/popup/popup.html'],['popup.css','src/popup/popup.css']]);
const packager=read('scripts/package.py');
const list=packager.split(/\r?\n/).find(x=>x.startsWith('runtime='));
assert.ok(list,'explicit runtime allowlist missing');
const zipped=new Set([...list.matchAll(/'([^']+)'/g)].map(m=>m[1]));
for(const [oldPath,newPath] of moves){
  assert.ok(!fs.existsSync(path.join(root,oldPath)),'old root UI entrypoint still present: '+oldPath);
  assert.ok(fs.statSync(path.join(root,newPath)).isFile(),'new UI entrypoint missing: '+newPath);
  assert.ok(!zipped.has(oldPath),'old UI entrypoint still packaged: '+oldPath);
  assert.ok(zipped.has(newPath),'moved UI entrypoint not packaged: '+newPath);
}
const manifest=JSON.parse(read('manifest.json'));
assert.equal(manifest.action.default_popup,undefined,'KAR-174 must not introduce a Chrome action popup');
const background=read('src/background/background.js');
assert.match(background,/const APP_PAGE = "src\/app\/app\.html";/);
assert.match(background,/url: chrome\.runtime\.getURL\(APP_PAGE\)/);
assert.match(background,/getAppUrl: \(\) => chrome\.runtime\.getURL\(APP_PAGE\)/);
const asset=(owner,ref)=>{
  assert.ok(!/^(?:https?:|data:|chrome-extension:)/.test(ref),'unexpected remote resource: '+owner+' -> '+ref);
  const rel=path.posix.normalize(path.posix.join(path.posix.dirname(owner),ref));
  assert.ok(!rel.startsWith('../')&&!path.posix.isAbsolute(rel),'resource escapes archive: '+owner+' -> '+ref);
  assert.ok(fs.existsSync(path.join(root,rel)),'missing local resource: '+owner+' -> '+rel);
  assert.ok(zipped.has(rel),'resource absent from installable Chrome ZIP: '+owner+' -> '+rel);
  return rel;
};
let checked=0;
for(const html of ['src/app/app.html','src/popup/popup.html']){
  const body=read(html);
  const scripts=[...body.matchAll(/<script\s+src=["']([^"']+)["']/g)].map(m=>asset(html,m[1]));
  const links=[...body.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/g)].map(m=>asset(html,m[1]));
  assert.ok(scripts.length>=3&&links.length>=4,'page must load JS, icon and stylesheet: '+html);
  assert.equal(scripts[0],'src/shared/runtime-deps.js','dependency bootstrap must be first: '+html);
  checked+=scripts.length+links.length;
}
const css=read('src/app/app.css');
const cssAssets=[...css.matchAll(/url\(\s*["']?([^"')]+)/g)].map(m=>m[1]).filter(ref=>!ref.startsWith('data:'));
assert.ok(cssAssets.length>=7,'manager icon mask dependencies disappeared');
for(const ref of cssAssets){asset('src/app/app.css',ref);checked++;}
assert.match(read('src/popup/popup.html'),/id="openAppButton"/);
assert.match(read('src/app/app.html'),/class="app-shell"/);
assert.match(read('tests/e2e/run_browser_e2e.py'),/APP_URL = f"chrome-extension:\/\/\{EXTENSION_ID\}\/src\/app\/app\.html"/);
console.log('PASS KAR-174 UI relocation: four proven moves, app launcher, icon CSS, ZIP and '+checked+' canonical relative resources');
