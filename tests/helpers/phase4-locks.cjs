// Deterministic two-worker Web Locks fixture; no fallback to storage CAS.
'use strict';
const assert = require('node:assert/strict');
const Atomic = require('../../src/background/services/cross-worker-atomic-admission.js');
module.exports = function phase4Locks() {
  const held = new Set();
  return {
    lockName: Atomic.LOCK_NAME,
    lockManager: {
      async request(name,opts,handler) {
        assert.equal(name,Atomic.LOCK_NAME);
        assert.deepEqual(opts,{mode:'exclusive',ifAvailable:true});
        if (held.has(name)) return handler(null);
        held.add(name);
        try { return await handler({name,mode:'exclusive'}); }
        finally { held.delete(name); }
      }
    }
  };
};
