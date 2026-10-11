const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const appHtml = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const background = fs.readFileSync(path.join(root, 'background.js'), 'utf8');
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const pass = message => console.log(`PASS: ${message}`);

assert.equal(manifest.name, 'kleinanzeigen Manager');
assert.equal(manifest.action.default_title, 'Kleinanzeigen Renewal');
assert.match(appHtml, /<title>kleinanzeigen Manager<\/title>/);
pass('visible product name and window title stay kleinanzeigen Manager while action.default_title uses the proven legacy identity');

assert.match(background, /chrome\.windows\.create\(\{[\s\S]*?type:\s*["']popup["']/);
pass('app window remains a popup window');

const expectedIconHashes = {
  'icons/taskbar-16.png': 'f42c199f711b29c8d680a0a411dd9debeeac7b1601c5b184f12daee46e4bb768',
  'icons/taskbar-32.png': '1333d46981860f686d9ac15227ad67c7346c07a01807d1e007428360570755d6',
  'icons/taskbar-48.png': '062444006dc3e0ab902bc8bb0eb5c0b0008652149c666e1de8a19045de7d0c64',
  'icons/app-icon-128.png': '8e91b7f9cbd919f22ba1db4ac8c7c5c815a61053670f1b902db406785bf1808f',
  'icons/favicon.ico': 'c9c7652c37add5755a17144c3a8268b2deff1a68bb1c35a507d256bf0abea12f'
};
for (const [file, digest] of Object.entries(expectedIconHashes)) assert.equal(sha256(file), digest, `${file} changed`);
pass('all icon assets remain byte-identical to canonical v1.17.9');
