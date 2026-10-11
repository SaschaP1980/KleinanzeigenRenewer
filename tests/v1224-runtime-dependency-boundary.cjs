const fs = require('fs');
const assert = require('assert');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const manifest = JSON.parse(read('manifest.json'));
const appHtml = read('app.html');
const background = read('background.js');
const content = read('content.js');
const runtimePath = path.join(root, 'src/shared/runtime-deps.js');

let passed = 0;
function check(label, fn) {
  fn(); passed += 1; console.log(`PASS ${label}`);
}

check('runtime dependency registry exists', () => {
  assert.ok(fs.existsSync(runtimePath), 'runtime-deps.js missing');
});

check('content scripts and dynamic bootstrap load registry first', () => {
  const scripts = manifest.content_scripts?.[0]?.js || [];
  assert.strictEqual(scripts[0], 'src/shared/runtime-deps.js');
  assert.match(background, /const CONTENT_SCRIPT_FILES = \["src\/shared\/runtime-deps\.js",/);
  assert.match(read('scripts/package.py'), /src\/shared\/runtime-deps\.js/);
});

check('app loads registry before feature modules', () => {
  const runtimePos = appHtml.indexOf('src="src/shared/runtime-deps.js"');
  const appPos = appHtml.indexOf('src="src/app/app.js"');
  const firstFeature = appHtml.indexOf('src="src/app/diagnostic-zip.js"');
  assert.ok(runtimePos >= 0 && runtimePos < firstFeature && runtimePos < appPos);
});

check('service worker imports registry first', () => {
  assert.match(background, /^importScripts\("\.\.\/shared\/runtime-deps\.js",/);
});

check('primary consumers resolve through registry', () => {
  assert.match(background, /KRDeps\.require\(['"]KRTabRegistry['"]\)/);
  assert.match(content, /KRDeps\.require\(['"]KRForm['"]\)/);
  assert.match(read('app.js'), /KRDeps\.require\(['"]KRInventoryView['"]\)/);
  assert.match(read('inventory-runner.js'), /KRDeps\?\.optional\(['"]KRMyAdsReadiness['"]\)/);
  assert.match(read('template-filler.js'), /KRDeps\?\.optional\(['"]KRForm['"]\)/);
});

check('primary consumers no longer depend directly on named KR globals', () => {
  const files = ['background.js', 'content.js', 'app.js', 'inventory-runner.js', 'template-filler.js', 'platform-guard-content.js'];
  for (const file of files) {
    const text = read(file);
    const matches = [...text.matchAll(/globalThis\.KR(?!Deps\b)[A-Za-z0-9_]+/g)]
      .filter(match => !/^\s*=/.test(text.slice(match.index + match[0].length)))
      .map(match => match[0]);
    assert.deepStrictEqual(matches, [], `${file} still directly consumes ${matches.join(', ')}`);
  }
});

check('registry is the only production dependency lookup and producers register explicitly', () => {
  const registry = read('runtime-deps.js');
  assert.doesNotMatch(registry, /const legacy = globalThis\[key\]/);
  const cases = [
    ['tab-registry.js', 'KRTabRegistry'],
    ['managed-navigation.js', 'KRManagedNavigation'],
    ['form-extractor.js', 'KRForm'],
    ['image-extractor.js', 'KRImages'],
    ['template-filler.js', 'KRTemplateFill'],
    ['inventory-runner.js', 'KRInventoryRun'],
    ['inventory-view.js', 'KRInventoryView'],
    ['account-gate.js', 'KRAccountGate']
  ];
  for (const [file, name] of cases) {
    const text = read(file);
    assert.ok(text.includes(`KRDeps?.register?.('${name}'`) || text.includes(`KRDeps.register('${name}'`), `${file} must register ${name}`);
    assert.doesNotMatch(text, new RegExp(`(?:globalThis|root)\.${name}\s*=`), `${file} must not publish ${name} globally`);
  }
});

check('registry exposes strict and optional resolution helpers', () => {
  const text = read('runtime-deps.js');
  assert.match(text, /function register\(/);
  assert.match(text, /function requireDependency\(/);
  assert.match(text, /function optional\(/);
  assert.match(text, /Duplicate dependency/);
  assert.match(text, /Missing dependency/);
});

console.log(`${passed}/8 v1.22.4 runtime dependency boundary checks passed.`);
