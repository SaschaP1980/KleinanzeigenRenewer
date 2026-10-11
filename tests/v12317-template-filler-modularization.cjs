'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const modules=[
 ['src/content/template-category-flow.js','KRTemplateCategoryFlow'],
 ['src/content/template-form-fields.js','KRTemplateFormFields'],
 ['src/content/template-image-upload.js','KRTemplateImageUpload'],
 ['src/content/template-verification.js','KRTemplateVerification'],
 ['src/content/template-publish-flow.js','KRTemplatePublishFlow']
];
let n=0; const pass=s=>{n++;console.log('PASS',s)};
for(const [file] of modules) assert.ok(fs.existsSync(file),`${file} missing`);
pass('five template-filler responsibility modules exist');
const filler=fs.readFileSync('src/content/template-filler.js','utf8');
for(const [,dep] of modules) assert.match(filler,new RegExp(`KRDeps\\.require\\(['\"]${dep}['\"]\\)`),`${dep} not consumed by orchestrator`);
pass('template filler composes all five modules through KRDeps');
for(const fn of ['setCategory','runLegacyCategorySelection','fillDynamicAttributes','uploadImages','verifyTemplate','autoPublishVerifiedRenewal']) {
 assert.doesNotMatch(filler,new RegExp(`(?:async\\s+)?function\\s+${fn}\\s*\\(`),`${fn} must move out of orchestrator`);
}
pass('major implementation bodies no longer live in template-filler orchestrator');
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
const js=manifest.content_scripts[0].js;
const fillerIndex=js.indexOf('src/content/template-filler.js');
for(const [file] of modules){const i=js.indexOf(file);assert.ok(i>=0&&i<fillerIndex,`${file} must load before template-filler.js`);}
pass('manifest loads extracted modules before template-filler');
const bg=fs.readFileSync('src/background/background.js','utf8');
for(const [file] of modules) assert.ok(bg.includes(file),`${file} missing from dynamic content bootstrap`);
pass('dynamic bootstrap includes all extracted modules');
const combined=[filler,...modules.map(([file])=>fs.readFileSync(file,'utf8'))].join('\n');
assert.doesNotMatch(combined,/\.submit\s*\(/);assert.doesNotMatch(combined,/requestSubmit\s*\(/);
pass('publish submit bypass invariant remains absent');
console.log(`${n}/6 PASS v1.23.17 template filler modularization`);
