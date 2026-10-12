'use strict';
// KAR-50 test-only strict current PATCH successor, no runtime extension imports.
function nextPatch(version) {
  if (typeof version !== 'string' || !/^1\.23\.(?:0|[1-9]\d*)$/.test(version)) {
    throw new Error('Only regular 1.23.x PATCH versions are supported');
  }
  const patch = Number(version.slice('1.23.'.length));
  if (!Number.isSafeInteger(patch) || patch < 22 || patch >= Number.MAX_SAFE_INTEGER) {
    throw new Error('PATCH must be a safe 1.23.22+ number');
  }
  return '1.23.' + (patch + 1);
}
module.exports = { nextPatch };
