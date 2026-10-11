const assert = require('assert');
const Backup = require('../profile-backup-controller.js');
const Formatting = require('../inventory-formatting.js');

let pass = 0;
const check = async (name, fn) => { await fn(); pass += 1; console.log(`PASS ${name}`); };

function fakeClassList() { return { toggle() {} }; }
function fakeElement(extra = {}) { return { classList: fakeClassList(), disabled: false, title: '', inert: false, ...extra }; }

(async () => {
  await check('profile transfer lock is exclusive through public backup operations', async () => {
    let seq = 0;
    let unblockArchive;
    let archiveStarted;
    const started = new Promise(resolve => { archiveStarted = resolve; });
    const archiveGate = new Promise(resolve => { unblockArchive = resolve; });
    const controller = Backup.create({
      document: { querySelector: () => fakeElement() },
      crypto: { randomUUID: () => `op-${++seq}` },
      elements: {},
      runtimeMessage: async message => {
        if (message.type === 'LIST_INVENTORIES' || message.type === 'LIST_TRASH') return [];
        throw new Error('unexpected message');
      },
      ProfileBackup: { createProfileArchive: async () => { archiveStarted(); await archiveGate; return { blob: { size: 1 }, filename: 'backup.zip', manifest: { counts: { images: 0 } } }; } },
      DiagnosticZip: { createZip: async () => ({}) },
      downloadGeneratedBlob: () => {},
      extensionVersion: () => '1.22.10'
    });
    const first = controller.exportProfileBackup({ profileId: 'profile-a', displayName: 'A' });
    await started;
    assert.equal(controller.locked(), true);
    await assert.rejects(() => controller.exportProfileBackup({ profileId: 'profile-b', displayName: 'B' }), /Profilsicherung läuft/);
    assert.equal(controller.locked(), true);
    unblockArchive();
    await first;
    assert.equal(controller.locked(), false);
  });

  await check('profile backup picker state keeps native cancel separate from dialog cancel', async () => {
    let clicked = 0;
    const file = { name: 'profile.zip' };
    const input = fakeElement({ value: 'old', files: [file], click() { clicked += 1; } });
    const controller = Backup.create({
      document: { querySelector: () => fakeElement() },
      crypto: { randomUUID: () => 'op' },
      elements: { profileBackupFileInput: input }
    });
    assert.equal(controller.openPicker(), true);
    assert.equal(clicked, 1);
    assert.equal(input.value, '');
    assert.equal(controller.pickerCancelRecent(), true);
    assert.equal(controller.takePickerFile(), file);
    assert.equal(controller.pickerCancelRecent(), false);
  });

  await check('profile export reads active and trash inventories and always releases lock', async () => {
    const messages = [];
    const statuses = [];
    const downloads = [];
    const controller = Backup.create({
      document: { querySelector: () => fakeElement() },
      crypto: { randomUUID: () => 'export-op' },
      unassignedProfileId: '__unassigned__',
      elements: {},
      runtimeMessage: async message => {
        messages.push(message);
        if (message.type === 'LIST_INVENTORIES') return [{ inventoryId: 'i1' }];
        if (message.type === 'LIST_TRASH') return [{ inventoryId: 't1' }];
        throw new Error('unexpected message');
      },
      ProfileBackup: { createProfileArchive: async payload => ({ blob: { size: 1 }, filename: 'backup.zip', manifest: { counts: { images: 0 } }, payload }) },
      DiagnosticZip: { createZip: async () => ({}) },
      setProfileManagerStatus: value => statuses.push(value),
      downloadGeneratedBlob: (blob, filename) => downloads.push({ blob, filename }),
      extensionVersion: () => '1.22.10'
    });
    const result = await controller.exportProfileBackup({ profileId: 'p1', displayName: 'P1' });
    assert.deepEqual(messages.map(item => item.type), ['LIST_INVENTORIES', 'LIST_TRASH']);
    assert.equal(result.filename, 'backup.zip');
    assert.equal(downloads[0].filename, 'backup.zip');
    assert.equal(controller.locked(), false);
    assert.ok(statuses.some(value => /Profil „P1“ wird gesichert/.test(value)));
  });

  await check('inventory formatting preserves price category and renewal/trash semantics', async () => {
    const helpers = {
      formatDate: value => `date:${value}`,
      displayPriceWithType: record => `typed:${record.price?.value || ''}`,
      artLabel: () => 'Art', endDateLabel: () => 'Ende', formatCalendarDate: value => String(value).slice(0, 10),
      listingDatePresentation: () => ({ label: 'Anzeige vom', derived: false }), listingDateLabel: () => 'Heute',
      endDateWithRelativeLabel: () => '01.01.2027 (in 100 Tagen)', comparisonStatusLabel: () => 'Match'
    };
    const f = Formatting.create({ sharedUiHelpers: helpers });
    assert.equal(f.displayPrice({ price: { displayed: '12 €' } }), '12 €');
    assert.equal(f.displayPrice({ price: { value: '12' } }), '12 €');
    assert.equal(f.categoryLabel({ category: { path: ['Mode', 'Damen', 'Kleider'] } }), 'Mode › Damen › Kleider');
    assert.equal(f.compactCategoryLabel({ category: { path: ['Mode', 'Damen', 'Kleider'] } }), 'Kleider');
    assert.equal(f.renewalStatusLabel({ adId: '123', renewal: { renewalId: 'r1', status: 'verified', stage: 'replacement-ready' } }), 'AUSTAUSCH BEREIT');
    assert.equal(f.publicAvailabilityPending({ listingMeta: { publicAvailability: { status: 'pending' } } }), true);
    const trash = f.trashRetentionPresentation({ trash: { expiresAt: '2026-10-01T00:00:00.000Z' } }, Date.parse('2026-09-23T00:00:00.000Z'));
    assert.match(trash, /^Im Papierkorb bis 2026-10-01 \(noch 8 Tage\)$/);
  });

  console.log(`${pass}/4 PASS v1.22.10 modularization runtime`);
})().catch(error => { console.error(error); process.exit(1); });
