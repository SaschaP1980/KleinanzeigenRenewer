const assert=require('assert');
let p=0;async function ok(n,f){try{await f();p++;console.log('PASS '+n)}catch(e){console.error('FAIL '+n);throw e}}
(async()=>{
 await ok('managed navigation still accepts canonical and id-direct expected public URLs',async()=>{const nav=require('../managed-navigation.js');const id='3519062051';assert.strictEqual(nav.assessPublicAd({url:`https://www.kleinanzeigen.de/s-anzeige/x/${id}-1-1`,status:'complete'},id).state,nav.STATES.READY);assert.strictEqual(nav.assessPublicAd({url:`https://www.kleinanzeigen.de/s-anzeige/${id}`,status:'complete'},id).state,nav.STATES.READY);});
 await ok('managed navigation rejects an off-target city redirect during renewal verification',async()=>{const nav=require('../managed-navigation.js');const r=nav.assessPublicAd({url:'https://www.kleinanzeigen.de/stadt/dorsten/',status:'complete'},'3519062051');assert.strictEqual(r.state,nav.STATES.OFF_TARGET);});
 console.log(`${p}/2 PASS v1.22.15 pre-refactor runtime`);
})().catch(e=>{console.error(e);process.exit(1)});
