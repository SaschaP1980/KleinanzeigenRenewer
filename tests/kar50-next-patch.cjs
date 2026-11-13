'use strict';
// KAR-50 test-only strict current PATCH successor, no runtime extension imports.
function nextPatch(version) {
  if (typeof version !== 'string' || !/^1\.(?:23|24)\.(?:0|[1-9]\d*)$/.test(version)) {
    throw new Error('Only regular 1.23.x or 1.24.x PATCH versions are supported');
  }
  const [major, minor, number] = version.split('.');
  const patch = Number(number);
  if (!Number.isSafeInteger(patch) || (minor === '23' && patch < 22) ||
      patch >= 2147483647) {
    throw new Error('PATCH must be a safe 1.23.22+ or 1.24.0+ number');
  }
  return major + '.' + minor + '.' + (patch + 1);
}
module.exports = { nextPatch };
