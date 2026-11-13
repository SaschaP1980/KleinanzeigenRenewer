const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('app.css', 'utf8');
const filler = fs.readFileSync('src/content/template-filler.js', 'utf8');
const readme = fs.readFileSync('README.md', 'utf8');
const packager = fs.readFileSync('scripts/package.py', 'utf8');

let pass = 0;
function ok(value, message) { assert.ok(value, message); pass += 1; }

ok(/\.primary-actions\s+button:focus:not\(:focus-visible\)\s*\{[^}]*outline\s*:\s*none\s*;/s.test(css), 'Pointer-Fokus im Actions-Bereich entfernt den UA-Outline nicht explizit.');
ok(/\.primary-actions\s+button:focus-visible\s*\{[^}]*outline\s*:\s*2px\s+solid\s+#4de0b7\s*;[^}]*outline-offset\s*:\s*2px\s*;/s.test(css), 'Tastaturfokus im Actions-Bereich hat keinen expliziten Mint-Fokusindikator.');
ok(!/This module never submits or publishes the final ad\./.test(filler), 'template-filler.js enthält weiterhin den sachlich falschen Never-Publish-Kommentar.');
ok(/automatic(?:ally)? publish|auto-publish|final publish/i.test(filler.slice(0, 700)), 'template-filler.js dokumentiert den verifizierten Auto-Publish-Pfad nicht am Modulanfang.');
ok(!/Kleinanzeigen-Anzeigen werden nie gelöscht\./.test(readme), 'README enthält weiterhin die global falsche Aussage, Kleinanzeigen-Anzeigen würden nie gelöscht.');
ok(!/Der Button wird weiterhin niemals automatisch geklickt\./.test(readme), 'README enthält weiterhin die global falsche Aussage, der Publish-Button werde niemals automatisch geklickt.');
ok(/removing a local inventory or trash record[^\n]*does not delete an online ad/i.test(readme), 'README must distinguish local deletion from remote removal.');
ok(/renewal workflow[^\n]*automatically[^\n]*hard-gate check/i.test(readme), 'README must document guarded automatic publish behind hard gates.');
ok(/__pycache__/.test(packager) && /\.pyc/.test(packager), 'Source-Packaging schließt Python-Cacheartefakte nicht explizit aus.');

console.log(`v1.22.2 focus/safety docs/package: ${pass}/9 PASS`);
