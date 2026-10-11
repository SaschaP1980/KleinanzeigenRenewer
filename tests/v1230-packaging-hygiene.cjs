const assert = require('assert');
const fs = require('fs');
const src = fs.readFileSync('scripts/package.py','utf8');
let p=0; const ok=(n,f)=>{try{f();p++;console.log('PASS '+n)}catch(e){console.error('FAIL '+n);throw e}};
ok('source packaging explicitly excludes transient .run directory',()=>{
  assert.match(src, /['"]\.run['"]/);
  assert.match(src, /p\.relative_to\(root\)\.parts/);
});
ok('source packaging continues to exclude node_modules build git and pycache',()=>{
  for (const name of ['node_modules','build','.git','__pycache__']) assert.ok(src.includes(`'${name}'`), name);
});
ok('packaging keeps deterministic ZIP metadata',()=>{
  assert.match(src, /ZipInfo\(name,\(2026,9,12,0,0,0\)\)/);
});
console.log(`${p}/3 PASS v1.23.0 packaging hygiene`);
