const { spawnSync } = require('node:child_process');
const path = require('node:path');

const script = path.join(__dirname, 'run_browser_e2e_supervisor.py');
const requested = process.env.KR_PYTHON ? [[process.env.KR_PYTHON]] : process.platform === 'win32'
  ? [['py', '-3'], ['python'], ['python3']]
  : [['python3'], ['python']];
let last = null;
for (const spec of requested) {
  const [cmd, ...prefix] = spec;
  const probe = spawnSync(cmd, [...prefix, '-c', 'import sys; print(sys.version_info[0])'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0 || !String(probe.stdout).trim().startsWith('3')) {
    last = probe.error || new Error(String(probe.stderr || `exit ${probe.status}`));
    continue;
  }
  const result = spawnSync(cmd, [...prefix, script, ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
  process.exit(result.status ?? 1);
}
console.error('Kein Python 3 für Browser-E2E gefunden.', last ? String(last.message || last) : '');
process.exit(2);
