const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('app.css', 'utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const e2e = fs.readFileSync('tests/e2e/run_browser_e2e.py', 'utf8');

let pass = 0;
function ok(value, message) { assert.ok(value, message); pass += 1; }

ok(/data-focus-modality|focusModality/.test(app), 'Actions-Eingabemodalität wird im Runtime-Code nicht explizit geführt.');
ok(/document\.addEventListener\(['"]pointerdown['"][\s\S]{0,300}setPrimaryActionsFocusModality\(['"]pointer['"]\)/.test(app), 'Pointerdown setzt keine Pointer-Modality für den Actions-Bereich.');
ok(/document\.addEventListener\(['"]keydown['"][\s\S]{0,500}event\.key\s*===\s*['"]Tab['"][\s\S]{0,500}setPrimaryActionsFocusModality\(['"]keyboard['"]\)/.test(app), 'Tab-Tastatur setzt keine Keyboard-Modality.');
ok(/\.primary-actions\[data-focus-modality=["']pointer["']\]\s+button:focus\s*\{[^}]*outline\s*:\s*none\s*;/s.test(css), 'Pointer-Modality unterdrückt sichtbaren Action-Fokus nicht deterministisch.');
ok(/\.primary-actions\s+button:focus-visible\s*\{[^}]*outline\s*:\s*2px\s+solid\s+#4de0b7/s.test(css), 'Sichtbarer Tastaturfokus wurde entfernt.');
ok(/focusReturn|returnedFocus|pointerModalityAfterReturn|modalFocusReturn/.test(e2e), 'Browser-E2E prüft den Pointer-Fokus nach simulierter Fokus-Rückgabe nicht.');
ok(/keyboardModality|data-focus-modality/.test(e2e), 'Browser-E2E prüft die explizite Keyboard-Modality nicht.');
ok(['1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(manifest.version) && ['1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(pkg.version), 'Version liegt nicht im retained v1.22.3+ Bereich.');

console.log(`v1.22.3 action focus modality: ${pass}/8 PASS`);
