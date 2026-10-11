const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
const optionalTests = ['storage.cjs', 'images.cjs', 'popup.cjs', 'description.cjs', 'edit.cjs'];

try {
  require.resolve('linkedom', { paths: [root] });
  require.resolve('fake-indexeddb', { paths: [root] });
} catch {
  console.log('SKIP optional DOM/IndexedDB suite: linkedom/fake-indexeddb are not installed.');
  process.exit(0);
}

for (const name of optionalTests) {
  const result = spawnSync(process.execPath, [path.join(__dirname, name)], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
