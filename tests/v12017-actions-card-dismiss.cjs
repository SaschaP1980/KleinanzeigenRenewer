const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('app.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8') + '\n' + fs.readFileSync('app-elements.js', 'utf8');
const css = fs.readFileSync('app.css', 'utf8');

let pass = 0;
function check(name, fn) {
  try { fn(); pass += 1; console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}: ${error.message}`); process.exitCode = 1; }
}

check('generic status card exposes dismiss control', () => {
  assert.match(html, /id="controlStatus"[\s\S]*id="statusDismiss"[\s\S]*aria-label="Meldung ausblenden"/);
});
check('app binds generic status dismiss control', () => {
  assert.match(js, /(?:const statusDismiss = document\.querySelector\('#statusDismiss'\)|statusDismiss:\s*['"]#statusDismiss['"])/);
});
check('generic status dismissal archives current activity before clearing it', () => {
  assert.match(js, /statusDismiss\?\.addEventListener\('click',[\s\S]*const currentActivity = currentUiActivity\(\)[\s\S]*currentActivity\?\.slot !== 'status'[\s\S]*const activity = \{ \.\.\.currentActivity \}[\s\S]*archiveUiActivity\(activity\)[\s\S]*clearUiActivity\(activity\.id\)/);
});
check('generic status card reserves dismiss-button space', () => {
  assert.match(css, /\.status-card\s*\{[^}]*position\s*:\s*relative/);
  assert.match(css, /\.status-card-copy\s*\{[^}]*padding-right\s*:/);
});

if (!process.exitCode) console.log(`${pass}/4 PASS`);
