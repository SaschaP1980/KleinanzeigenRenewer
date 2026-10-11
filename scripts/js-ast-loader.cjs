'use strict';
const path = require('node:path');
const cp = require('node:child_process');

function tryRequire(candidate) {
  try { return require(candidate); } catch { return null; }
}

function loadAcorn() {
  let acorn = tryRequire('acorn');
  if (acorn) return acorn;
  const roots = [];
  if (process.env.KR_ACORN_PATH) roots.push(process.env.KR_ACORN_PATH);
  try { roots.push(cp.execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim()); } catch {}
  for (const root of roots.filter(Boolean)) {
    for (const candidate of [
      path.join(root, 'acorn'),
      path.join(root, 'ts-node', 'node_modules', 'acorn')
    ]) {
      acorn = tryRequire(candidate);
      if (acorn) return acorn;
    }
  }
  throw new Error('Acorn parser not found. Install acorn or expose it via KR_ACORN_PATH/npm global modules.');
}

module.exports = { loadAcorn };
