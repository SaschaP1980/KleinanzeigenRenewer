'use strict';
// Test the actual PAGE_STATUS content listener, with synthetic DOM/form
// fixtures. No navigation, form modification, network or remote actions.
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const ManagedNavigation=require('../src/shared/managed-navigation.js');
const source=fs.readFileSync('src/content/content.js','utf8');
const editUrl='https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=456';
const publicUrl='https://www.kleinanzeigen.de/s-anzeige/example/456-22-1';
function fixture(opts={}){
  const url=new URL(opts.url||editUrl);let listener=null;
  const form={querySelectorAll:()=>opts.inputs||[],getAttribute:key=>key==='action'?(opts.action||''):null};
  const edit={eligible:true,form,adId:'456',title:'Example',description:'Description',
    diagnostics:{structuredSource:{adId:456}},blockingIssues:[],...opts.edit};
  const document={title:'Example',body:{innerText:'',textContent:''},
    querySelectorAll:()=>[],
    querySelector(sel){
      if(sel==='link[rel="canonical"]'&&opts.canonical)return {href:opts.canonical};
      if(sel.includes('og:url')&&opts.og)return {content:opts.og};
      if(sel==='#viewad-title'&&opts.publicTitle)return {textContent:'Example'};
      if(sel==='#viewad-description-text'&&opts.publicDescription)return {textContent:'Description'};
      return null;
    }};
  const modules={
    KRMessageContractRegistry:{route:()=>({action:'accept'})},
    KRPlatformHardening:{detectAccessRestriction:()=>opts.restriction||null},
    KRManagedNavigation:ManagedNavigation,
    KRForm:{locate:()=>({eligible:!opts.noForm}),extract:()=>{if(opts.throwExtract)throw Error('not ready');return edit;}},
    KRImages:{},KRTemplateFill:{},KRInventoryRun:{isMyAdsUrl:()=>false,detectedProfileName:()=> 'Account'}
  };
  const ctx={URL,document,location:{href:url.href,origin:url.origin,pathname:url.pathname},
    KRDeps:{require:name=>modules[name]},
    chrome:{runtime:{onMessage:{addListener:f=>{listener=f;}},sendMessage:(_m,cb)=>cb?.(),lastError:null}}};
  vm.runInNewContext(source,ctx);
  return (extra={})=>{let response;listener({type:'PAGE_STATUS',...extra},null,x=>{response=x;});return response;};
}
const edit=opts=>fixture(opts)({publicationEditProof:true}).result.publicationEditEvidence;
const pub=opts=>fixture({url:publicUrl,...opts})({publicationPublicProof:true}).result.publicationPublicEvidence;
assert.equal(edit({}).state,'verified');
assert.equal(edit({edit:{diagnostics:{}}}).state,'not-ready','URL plus generic form is insufficient');
assert.equal(edit({edit:{diagnostics:{structuredSource:{adId:999}}}}).state,'identity-conflict');
assert.equal(edit({edit:{conflict:true}}).state,'identity-conflict');
assert.equal(edit({edit:{blockingIssues:['structured-ad-identity']}}).state,'identity-conflict');
assert.equal(edit({edit:{eligible:false}}).state,'not-ready');
assert.equal(edit({edit:{description:''}}).state,'not-ready');
assert.equal(edit({throwExtract:true}).state,'not-ready');
assert.equal(edit({edit:{diagnostics:{}},inputs:[{name:'adId',value:'456'}]}).state,'verified');
assert.equal(edit({edit:{diagnostics:{}},inputs:[{name:'ad_id',value:'999'}]}).state,'identity-conflict');
assert.equal(edit({edit:{diagnostics:{}},action:'/p-anzeige-bearbeiten.html?adId=456'}).state,'verified');
assert.equal(edit({action:'https://example.invalid/'}).state,'identity-conflict');
assert.equal(edit({url:publicUrl}).state,'not-ready');
assert.equal(edit({url:editUrl.replace('456','invalid')}).state,'not-ready');
assert.equal(fixture()().result.publicationEditEvidence,undefined,'existing PAGE_STATUS unchanged unless requested');
assert.equal(pub({canonical:publicUrl,publicTitle:true,publicDescription:true}).state,'verified');
assert.equal(pub({og:publicUrl,publicTitle:true,publicDescription:true}).state,'verified');
assert.equal(pub({publicTitle:true,publicDescription:true}).state,'not-ready','URL and content without independent identity insufficient');
assert.equal(pub({canonical:publicUrl,publicTitle:true}).state,'not-ready','missing listing description insufficient');
assert.equal(pub({canonical:publicUrl.replace('456-','999-'),publicTitle:true,publicDescription:true}).state,'identity-conflict');
assert.equal(pub({canonical:publicUrl,og:publicUrl.replace('456-','999-'),publicTitle:true,publicDescription:true}).state,'identity-conflict');
assert.equal(pub({url:editUrl}).state,'not-ready');
assert.equal(fixture({url:publicUrl})().result.publicationPublicEvidence,undefined);
console.log('PASS KAR-206 content PAGE_STATUS: 23 exact-ID and readiness assertions, no new message route');
