const assert = require('node:assert/strict');
const surface = require('./v12211-background-source-surface.cjs');
let count = 0;
const pass = label => { count += 1; console.log(`PASS ${label}`); };

assert.match(surface, /profilesV1/);
assert.match(surface, /activeDetectedProfileV1/);
assert.match(surface, /selectedInventoryProfileV1/);
pass('profile repository keys and selected-active split are retained');

assert.match(surface, /profile-deleted-unassigned/);
assert.match(surface, /profilePreviousId/);
assert.match(surface, /profilePreviousName/);
pass('current profile deletion semantics preserve records as unassigned');

assert.match(surface, /confirmed-legacy-migration/);
assert.match(surface, /profileAssignedAt/);
pass('legacy unassigned assignment preserves explicit migration provenance');

assert.match(surface, /kleinanzeigen-renewal/);
assert.match(surface, /inventories/);
assert.match(surface, /images/);
assert.match(surface, /trashExpiresAt/);
pass('inventory database schema retains inventories images and trash expiry index');

assert.match(surface, /Keine Bilder eindeutig erkannt\. Vorhandener Bildbestand bleibt erhalten\./);
assert.match(surface, /atomicCommit:\s*true/);
pass('inventory replacement remains image-safe and atomically reported');

assert.match(surface, /30 \* 24 \* 60 \* 60 \* 1000/);
assert.match(surface, /TRASH_RETENTION_RESET/);
assert.match(surface, /TRASH_ENTRY_PERMANENTLY_DELETED/);
pass('trash retention and permanent deletion contracts remain intact');

assert.match(surface, /profileId/);
assert.match(surface, /IDBKeyRange\.only\(requested\)/);
pass('profile-scoped inventory lookup retains indexed path');

assert.doesNotMatch(surface, /\.submit\s*\(/);
assert.doesNotMatch(surface, /requestSubmit\s*\(/);
pass('repository refactor scope cannot introduce direct publish submit bypasses');

console.log(`${count}/8 PASS v1.22.11 pre-refactor characterization`);
