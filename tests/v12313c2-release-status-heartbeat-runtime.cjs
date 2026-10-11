const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kr-heartbeat-'));
const state = path.join(dir, 'release-state.json');
const log = path.join(dir, 'release.log');
const out = path.join(dir, 'release-status-snapshot.json');
fs.writeFileSync(state, JSON.stringify({ stage: 'regression', stage_status: 'running', pipeline_rc: null }));
fs.writeFileSync(log, 'line-1\nline-2\n');
const child = cp.spawn('bash', ['-lc', 'sleep 5'], { stdio: 'ignore' });
try {
  cp.execFileSync('python3', ['scripts/release-status-heartbeat.py', '--pid', String(child.pid), '--state', state, '--log', log, '--output', out, '--once'], { stdio: 'pipe' });
  const snap = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(snap.pipelinePid, child.pid);
  assert.equal(snap.pipelineAlive, true);
  assert.equal(snap.stage, 'regression');
  assert.equal(snap.stageStatus, 'running');
  assert.deepEqual(snap.logTail.slice(-2), ['line-1', 'line-2']);
  console.log('PASS heartbeat snapshot records live pipeline/stage/log evidence');

  cp.execFileSync('python3', ['scripts/release-status-heartbeat.py', '--pid', String(child.pid), '--state', state, '--log', log, '--output', out, '--once', '--final-rc', '0'], { stdio: 'pipe' });
  const final = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(final.pipelineRc, 0);
  console.log('PASS heartbeat snapshot can persist terminal RC evidence');
  console.log('2/2 PASS v1.23.13_c2 release status heartbeat runtime');
} finally {
  try { process.kill(child.pid, 'SIGTERM'); } catch {}
  fs.rmSync(dir, { recursive: true, force: true });
}
