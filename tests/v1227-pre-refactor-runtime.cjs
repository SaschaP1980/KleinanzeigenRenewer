const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'); const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
function slice(name,next){const s=app.indexOf(`function ${name}`); if(s<0) throw new Error('missing '+name); const e=next?app.indexOf(`\nfunction ${next}`,s):app.length; return app.slice(s,e<0?app.length:e);}
let n=0;const ok=(m,f)=>{f();n++;console.log('PASS '+m)};
const lifecycle=app.slice(app.indexOf('function transientTabMessageError'),app.indexOf('\nfunction imagePreviewKey'));
const ctx={};vm.createContext(ctx);vm.runInContext(`${lifecycle};this.transientTabMessageError=transientTabMessageError;this.isExpectedTabClosedError=isExpectedTabClosedError;this.isTabGoneError=isTabGoneError;this.isTabDiscardedError=isTabDiscardedError;this.lifecycleTabError=lifecycleTabError;`,ctx);
ok('transient message failures are recognized',()=>{assert.equal(ctx.transientTabMessageError(new Error('Receiving end does not exist')),true);assert.equal(ctx.transientTabMessageError(new Error('permission denied')),false)});
ok('tab lifecycle classifiers remain distinct',()=>{assert.equal(ctx.isExpectedTabClosedError({code:'KR_TAB_EXPECTED_CLOSED'}),true);assert.equal(ctx.isTabGoneError({code:'KR_TAB_GONE'}),true);assert.equal(ctx.isTabDiscardedError({code:'KR_TAB_DISCARDED'}),true);const e=ctx.lifecycleTabError('KR_TAB_GONE','gone',42);assert.equal(e.code,'KR_TAB_GONE');assert.equal(e.tabId,42)});
const fmt=app.slice(app.indexOf('function formatDate'),app.indexOf('\nfunction normalizeListViewMode'));
const fctx={Intl,Date};vm.createContext(fctx);vm.runInContext(`${fmt};this.displayPrice=displayPrice;this.categoryLabel=categoryLabel;this.compactCategoryLabel=compactCategoryLabel;`,fctx);
ok('price helper does not duplicate currency',()=>{assert.equal(fctx.displayPrice({price:{displayed:'12 €'}}),'12 €');assert.equal(fctx.displayPrice({price:{value:'12'}}),'12 €')});
ok('category helpers preserve full and terminal labels',()=>{const r={category:{path:['Mode','Damen','Kleider']}};assert.equal(fctx.categoryLabel(r),'Mode › Damen › Kleider');assert.equal(fctx.compactCategoryLabel(r),'Kleider')});
console.log(`${n}/4 PASS`);
