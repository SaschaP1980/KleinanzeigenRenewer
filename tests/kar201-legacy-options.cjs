'use strict';
// KAR-201: synthetic category-246 regression; no private listing or live Kleinanzeigen data.
const assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const { webcrypto } = require('node:crypto');
const fs = require('node:fs');
globalThis.crypto ||= webcrypto;
require('../src/shared/runtime-deps.js');
const Schema = require('../src/shared/template-schema-core.js');
const Preflight = require('../src/content/template-schema-preflight.js');

const attr = (key, technicalValue, displayValue, label) =>
  ({ key: 'dekoration.' + key, technicalValue, displayValue, label, status: 'captured' });

function case246({ colorOptions = null, materialOptions = null, duplicateColorLabel = false,
  savedSchema = false, categoryId = '246' } = {}) {
  const dom = '<html><body><form>' +
    '<input name="categoryId" type="hidden" value="' + categoryId + '">' +
    '<input name="title" value="Synthetic fixture">' +
    '<textarea name="description">Synthetic, no real listing</textarea>' +
    ['art','condition','color','material'].map(key =>
      '<input type="hidden" name="attributeMap[dekoration.' + key + ']" value="">' +
      '<button type="button" id="dekoration.' + key + '" role="combobox" aria-expanded="false">' + key + '</button>'
    ).join('') + '</form><astro-island component-url="PostListingForm" props="stub"></astro-island></body></html>';
  const { document } = parseHTML(dom);
  const defs = {
    'dekoration.art': { localizedOptions: [{ value:'weitere', localizedValue:'Weitere Dekoration' }] },
    'dekoration.condition': { localizedOptions: [{ value:'like_new', localizedValue:'Wie neu' }] }
  };
  if (colorOptions !== null) defs['dekoration.color'] = { localizedOptions: colorOptions ||
    [{ value:'other', localizedValue:'Andere Farben' }] };
  if (materialOptions !== null) defs['dekoration.material'] = { localizedOptions: materialOptions ||
    [{ value:'wood', localizedValue:'Holz' }] };
  if (duplicateColorLabel) defs['dekoration.color'] = { localizedOptions: [
    { value:'other', localizedValue:'Andere Farben' },
    { value:'other-2', localizedValue:'Andere Farben' }
  ] };
  const engine = Preflight.create({
    Schema, Form: { decodeAstroProps: () => ({ postListingPage: {
      category: { id: Number(categoryId), attributes: defs }
    } }) },
    documentRoot: () => document,
    waitFor: async fn => { for (let i=0;i<6;i++) { const got=fn(); if (got) return got; } throw Error('not hydrated'); }
  });
  const template = {
    categoryId, title:'Synthetic fixture', description:'Synthetic, no real listing',
    images: Array.from({ length:11 }, (_,i) => ({ imageKey: 'fixture-' + i })),
    dynamicAttributes: [
      attr('art','weitere','Weitere Dekoration','Art'),
      attr('condition','like_new','Wie neu','Zustand'),
      attr('color','other','Andere Farben','Farbe'),
      attr('material','wood','Holz','Material')
    ]
  };
  async function analyze() {
    if (savedSchema) {
      const snapshot = Schema.buildSchema({ categoryId, dynamicAttributes: [
        { key:'dekoration.art', controlType:'combobox', options:[{ value:'weitere' }] },
        { key:'dekoration.condition', controlType:'combobox', options:[{ value:'like_new' }] },
        { key:'dekoration.color', controlType:'combobox', options:[{ value:'other' }] },
        { key:'dekoration.material', controlType:'combobox', options:[{ value:'wood' }] }
      ] });
      template.templateSchema = { snapshot, fingerprint: await Schema.fingerprint(snapshot) };
    }
    const observed = engine.inspectForm(document.querySelector('form'), template.categoryId, document);
    const report = await engine.evaluate(template, observed);
    return { report, observed, template };
  }
  return { analyze, document };
}

(async () => {
  const unknown = await case246().analyze();
  assert.equal(unknown.report.comparison.status, 'legacy-unversioned');
  assert.equal(unknown.template.images.length, 11);
  assert.equal(unknown.report.valueCompatibility, 'unverified',
    'unknown technical option catalog cannot mean value compatible');
  assert.deepEqual(unknown.report.valueEvidence.filter(x => x.status === 'unverified').map(x => x.key).sort(),
    ['dekoration.color','dekoration.material']);
  assert.ok(unknown.report.warnings.some(x => /nicht.*prüf|unbekannt|ungeprüft/i.test(x)));
  console.log('PASS KAR-201: legacy null option evidence distinct from proof');

  const supported = await case246({ colorOptions:[
    { value:'other', localizedValue:'Andere Farben' }
  ], materialOptions:[{ value:'wood', localizedValue:'Holz' }] }).analyze();
  assert.equal(supported.report.valueCompatibility, 'confirmed');
  assert.equal(supported.report.complete, true);
  assert.equal(supported.report.issues.length,0);
  console.log('PASS KAR-201: complete exact catalog permits compatible legacy source');

  const unavailable = await case246({ colorOptions:[
    { value:'white', localizedValue:'Weiß' }
  ], materialOptions:[{ value:'plastic', localizedValue:'Kunststoff' }] }).analyze();
  assert.equal(unavailable.report.complete,false);
  assert.equal(unavailable.report.valueCompatibility,'incompatible');
  assert.ok(unavailable.report.issues.some(x=>x.includes('Farbe')));
  assert.ok(unavailable.report.issues.some(x=>x.includes('Material')));
  console.log('PASS KAR-201: proven absent technical values stop early');

  const duplicate = await case246({ duplicateColorLabel:true, materialOptions:[
    { value:'wood', localizedValue:'Holz' }
  ] }).analyze();
  assert.equal(duplicate.report.complete,false);
  assert.ok(duplicate.report.valueEvidence.some(x=>x.key==='dekoration.color' && x.status==='ambiguous'));
  console.log('PASS KAR-201: duplicate visible label cannot select a guessed technical ID');

  const fresh = await case246({ savedSchema:true, colorOptions:[
    { value:'other', localizedValue:'Andere Farben' }
  ], materialOptions:[{ value:'wood', localizedValue:'Holz' }] }).analyze();
  assert.notEqual(fresh.report.comparison.status,'legacy-unversioned');
  assert.equal(fresh.report.valueCompatibility,'confirmed');
  console.log('PASS KAR-201: current fingerprint and live value proof are independent');

  const filler=fs.readFileSync(require.resolve('../src/content/template-filler.js'),'utf8');
  const controller=fs.readFileSync(require.resolve('../src/background/controllers/template-fill-controller.js'),'utf8');
  const service=fs.readFileSync(require.resolve('../src/background/services/template-fill-service.js'),'utf8');
  assert.match(filler,/valueCompatibility/,'fill must log and persist truthful value evidence');
  assert.match(controller,/valueCompatibility/,'failed fill proof must persist separately from publish authority');
  assert.match(service,/schemaPreflight: session.result.schemaPreflight/,'recovery must carry verified and unverified proof separately');
  console.log('PASS KAR-201: preflight evidence survives failed-fill persistence');
})().catch(error=>{ console.error(error); process.exitCode=1; });
