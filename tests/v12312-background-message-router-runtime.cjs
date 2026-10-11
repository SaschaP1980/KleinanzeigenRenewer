const assert=require('assert'); const R=require('../src/background/background-message-router.js'); let n=0; const ok=(c,m)=>{assert.ok(c,m);n++;console.log('PASS',m)};
(async()=>{
 const calls=[]; const registry={route(type,target){calls.push(`contract:${type}:${target}`);return {action:'accept'}},errorFor(){return new Error('contract')}};
 const handlers={OPEN_APP_WINDOW:async()=>{calls.push('handler:OPEN_APP_WINDOW');return 'OPEN_APP_WINDOW'},GET_PLATFORM_ACCESS_RESTRICTION:async()=>{calls.push('handler:GET_PLATFORM_ACCESS_RESTRICTION');return 'GET_PLATFORM_ACCESS_RESTRICTION'}};
 const router=R.create({MessageContractRegistry:registry,assertPlatformAccessAllowedForRequest:async m=>calls.push(`guard:${m.type}`),handlers});
 const normal=await router.dispatch({type:'OPEN_APP_WINDOW'},{}); ok(normal==='OPEN_APP_WINDOW'&&calls.indexOf('guard:OPEN_APP_WINDOW')<calls.indexOf('handler:OPEN_APP_WINDOW'),'normal public dispatch passes platform guard before handler');
 calls.length=0; const control=await router.dispatch({type:'GET_PLATFORM_ACCESS_RESTRICTION'},{}); ok(control==='GET_PLATFORM_ACCESS_RESTRICTION'&&!calls.some(x=>x.startsWith('guard:'))&&calls.includes('handler:GET_PLATFORM_ACCESS_RESTRICTION'),'pre-safety control route bypasses platform guard');
 const rejectRegistry={route(){return {action:'reject'}},errorFor(){const e=new Error('rejected');e.code='X';return e}}; const rejected=R.create({MessageContractRegistry:rejectRegistry,assertPlatformAccessAllowedForRequest:async()=>{},handlers}); let code='';try{await rejected.dispatch({type:'OPEN_APP_WINDOW'},{});}catch(e){code=e.code} ok(code==='X','contract rejection happens before public dispatch routing');
 let unknown=''; try{await router.dispatch({type:'NO_SUCH_ROUTE'},{});}catch(e){unknown=e.message} ok(/Unbekannte Erweiterungsanfrage/.test(unknown),'unknown route fails closed through public dispatch');
 ok(/backgroundMessageRouter\.dispatch\(message, sender, \{ messageContract \}\)/.test(require('fs').readFileSync('src/background/background.js','utf8')),'background listener delegates dispatch to router');
 console.log(`${n}/5 PASS v1.23.12 background message router public contract`);
})().catch(e=>{console.error(e);process.exit(1)});
