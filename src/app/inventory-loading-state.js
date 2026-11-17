// KAR-188: profile-bound, per-view read status; no data storage or remote mutation.
(() => {
  'use strict';
  const KINDS = Object.freeze(['inventory', 'trash']);
  const normalize = value => String(value || '__no_profile_selected__');
  const API = Object.freeze({
    create({ onChange = () => {} } = {}) {
      if (typeof onChange !== 'function') throw new TypeError('onChange must be callable');
      let generation = 0;
      let profileId = normalize(null);
      const views = {
        inventory: { phase: 'loading', lastVerifiedCount: null },
        trash: { phase: 'loading', lastVerifiedCount: null }
      };
      function snapshot(kind) {
        if (!KINDS.includes(kind)) throw new Error('Unknown inventory view');
        return Object.freeze({ ...views[kind], profileId });
      }
      function begin(nextProfileId) {
        const next = normalize(nextProfileId);
        const sameProfile = next === profileId;
        profileId = next;
        generation++;
        for (const kind of KINDS) {
          views[kind] = {
            phase: 'loading',
            lastVerifiedCount: sameProfile ? views[kind].lastVerifiedCount : null
          };
        }
        for (const kind of KINDS) onChange(kind, snapshot(kind));
        return Object.freeze({ generation, profileId });
      }
      function isCurrent(ticket) {
        return Boolean(ticket && ticket.generation === generation && ticket.profileId === profileId);
      }
      function settle(ticket, kind, { records, error } = {}) {
        if (!KINDS.includes(kind)) throw new Error('Unknown inventory view');
        if (!isCurrent(ticket)) return false;
        if (error) {
          views[kind] = { phase: 'error', lastVerifiedCount: views[kind].lastVerifiedCount };
        } else if (Array.isArray(records)) {
          views[kind] = { phase: 'ready', lastVerifiedCount: records.length };
        } else {
          throw new TypeError('Inventory read must return a verified array');
        }
        onChange(kind, snapshot(kind));
        return true;
      }
      return Object.freeze({ begin, isCurrent, settle, snapshot });
    }
  });
  globalThis.KRDeps?.register?.('KRInventoryLoadingState', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
