'use strict';
// Independent persisted-session migration witness; no later schema engine or live browser.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let provider;
vm.runInNewContext(fs.readFileSync('src/background/services/template-fill-service.js','utf8'),{KRDeps:{register(name,api){assert.equal(name,'KRTemplateFillService');provider=api;}}});
assert.equal(typeof provider?.create,'function');
async function normalFixture(){
const now=new Date().toISOString();
    const records={
      shoe:{inventoryId:'shoe',adId:'15900',category:{id:159,path:['Mode & Beauty','Damenschuhe']},
        title:'PRIVATE TITLE',description:'PRIVATE DESCRIPTION',price:{value:12345},
        dynamicAttributes:[{key:'shoes.art',label:'Art',displayValue:'Sneaker & Sportschuhe',
          technicalValue:'secret-art-code'}],images:[]},
      watch:{inventoryId:'watch',adId:'40500',category:{id:405,path:['Elektronik','Wearables']}}
    };
    const db={templateFillSessions:{
      first:{fillId:'first',inventoryId:'shoe',targetTabId:71,status:'waiting',createdAt:now},
      second:{fillId:'second',inventoryId:'watch',schemaTestScenario:'category-check',
        targetTabId:72,status:'waiting',createdAt:now}
    }};
    const service=provider.create({
      storageLocal:{get:async()=>db,set:async()=>{}},getInventory:async id=>records[id]
    });
    const normal=await service.getTemplateFillSession({tab:{id:71}});
    assert.equal(normal.template.categoryId,159);
    assert.equal(normal.template.title,'PRIVATE TITLE');
    assert.equal(normal.template.description,'PRIVATE DESCRIPTION');
    assert.equal(normal.template.dynamicAttributes[0].technicalValue,'secret-art-code');
    assert.equal(normal.schemaTestScenario,undefined);
    
return {service,db};
}
test('historical normal posting session carries saved category, title, description and technical value',async()=>{await normalFixture();});
test('KAR-134 independent persisted retired schema-test session must be refused before form payload',async()=>{
const {service}=await normalFixture();
await assert.rejects(service.getTemplateFillSession({tab:{id:72}}),
      /Veralteter Schema-Testvorgang/,'old standalone sessions must fail before any form is read');
});
