const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const read=n=>fs.existsSync(path.join(root,n))?fs.readFileSync(path.join(root,n),'utf8'):'';
module.exports=[read('background.js'),read('renewal-workflow-controller.js'),read('renewal-verification-flow.js'),read('renewal-reinventory-flow.js'),read('paid-checkout-recovery-service.js')].filter(Boolean).join('\n');
