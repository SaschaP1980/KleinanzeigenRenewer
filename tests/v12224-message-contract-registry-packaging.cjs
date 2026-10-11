const fs = require('fs');
const assert = require('assert');

const packageSource = fs.readFileSync('scripts/package.py', 'utf8');
assert.match(
  packageSource,
  /['"]src\/shared\/message-contract-registry\.js['"]/,
  'Chrome runtime packaging must include message-contract-registry.js'
);
console.log('PASS Chrome runtime packaging includes message-contract-registry.js');
console.log('1/1 PASS v1.22.24 message-contract registry packaging');
