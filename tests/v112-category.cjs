const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const code = fs.readFileSync(path.join(__dirname, '../template-filler.js'), 'utf8');
const ctx = {};
vm.runInNewContext(code, ctx);
const api = ctx.KRTemplateFill;
let n = 0;
const pass = name => { n += 1; console.log('PASS ' + name); };

assert.equal(api.normalizeWizardLabel('  Art *  '), 'art');
assert.equal(api.normalizeWizardLabel('UNTERKATEGORIE*'), 'unterkategorie');
pass('legacy wizard headings are normalized independently of the required-star marker');

const clothing = [
  {key:'kleidung_damen.art', label:'Art', displayValue:'Weitere Damenbekleidung', technicalValue:'sonstige', required:true},
  {key:'kleidung_damen.brand', label:'Marke', displayValue:'Up Fashion', technicalValue:'up_fashion', required:true},
  {key:'kleidung_damen.condition', label:'Zustand', displayValue:'Sehr Gut', technicalValue:'like_new', required:true}
];
let match = api.matchWizardAttributeColumn('Art *', ['Anzüge','Bademode','Weitere Damenbekleidung'], clothing, []);
assert.deepEqual(JSON.parse(JSON.stringify(match)), {
  key:'kleidung_damen.art', displayValue:'Weitere Damenbekleidung', label:'Art', technicalValue:'sonstige'
});
pass('Damenbekleidung wizard resolves the required Art column to Weitere Damenbekleidung');

match = api.matchWizardAttributeColumn(' Art * ', ['weitere damenbekleidung'], clothing, []);
assert.equal(match.key, 'kleidung_damen.art');
pass('wizard value matching is whitespace-normalized and case-insensitive');

assert.equal(api.matchWizardAttributeColumn('Art *', ['Weitere Damenbekleidung'], clothing, ['kleidung_damen.art']), null);
pass('already consumed wizard attributes are not replayed');

const shoes = [{key:'schuhe_damen.art',label:'Art',displayValue:'Sandalen',technicalValue:'sandalen',required:true}];
assert.equal(api.matchWizardAttributeColumn('Art *', ['Sneaker','Sandalen','Stiefel'], shoes, []).technicalValue, 'sandalen');
pass('same generic helper resolves a different category-specific Art value');

const sport = [{key:'sport_camping.art',label:'Art',displayValue:'Fitness',technicalValue:'fitness',required:true}];
assert.equal(api.matchWizardAttributeColumn('Art *', ['Camping','Fitness'], sport, []).technicalValue, 'fitness');
pass('same generic helper resolves Sport & Camping without hard-coded category logic');

assert.equal(api.matchWizardAttributeColumn('Art *', ['Anzüge','Bademode'], clothing, []), null);
assert.equal(api.matchWizardAttributeColumn('Unterkategorie *', ['Damenbekleidung'], clothing, []), null);
pass('no wizard selection is guessed when label or exact stored display value is absent');

const optional = [{key:'x',label:'Material',displayValue:'Baumwolle',technicalValue:'cotton',required:false}];
assert.equal(api.matchWizardAttributeColumn('Material', ['Baumwolle'], optional, []), null);
assert.equal(api.matchWizardAttributeColumn('Material *', ['Baumwolle'], optional, []).technicalValue, 'cotton');
pass('wizard-only required marker can authorize a stored optional metadata field, but optional columns are not guessed');

console.log(`${n} v1.1.2 category-wizard attribute tests passed`);
