const fs=require('fs'); const assert=require('assert'); const path=require('path'); const root=path.resolve(__dirname,'..');
const read=p=>fs.existsSync(path.join(root,p))?fs.readFileSync(path.join(root,p),'utf8'):'';
let pass=0; function ok(c,m){assert.ok(c,m);pass++;console.log('PASS',m)}
const targets=['src/app/app-elements.js','src/app/profile-account-ui-controller.js','src/background/background-message-router.js','src/shared/renewal-policy.js'];
ok(targets.every(p=>fs.existsSync(path.join(root,p))), 'all four v1.23.12 owner modules exist');
const app=read('src/app/app.js'), bg=read('src/background/background.js'), html=read('app.html'), layout=read('scripts/source-layout.json');
ok(!/^const\s+[A-Za-z_$][\w$]*\s*=\s*document\.querySelector\(/m.test(app) && /KRAppElements/.test(app), 'app.js delegates top-level DOM binding ownership to KRAppElements');
ok(!/message\?\.type\s*===/.test(bg) && /KRBackgroundMessageRouter/.test(bg), 'background.js delegates message type routing to KRBackgroundMessageRouter');
ok(!/let\s+currentProfile\s*=/.test(app) && !/liveAccountState|liveAccountAmbiguousNames/.test(app) && /KRProfileAccountUiController/.test(app), 'account/profile compatibility mirrors are removed behind profile account UI owner');
ok(/app-elements\.js/.test(html) && /profile-account-ui-controller\.js/.test(html) && /background-message-router\.js/.test(bg) && /renewal-policy\.js/.test(bg) && /app-elements\.js/.test(layout) && /renewal-policy\.js/.test(layout), 'script/import and packaging ownership includes all new modules');
console.log(`${pass}/5 PASS v1.23.12 composition/routing ownership`);
