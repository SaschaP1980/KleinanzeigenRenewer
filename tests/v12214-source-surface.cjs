const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.existsSync(path.join(root,name))?fs.readFileSync(path.join(root,name),'utf8'):'';
module.exports=[read('single-inventory-controller.js'),read('bulk-inventory-controller.js'),require('./v12212-source-surface.cjs')].join('\n');
