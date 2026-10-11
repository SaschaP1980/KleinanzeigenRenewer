const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const names=['remote-delete-replacement-service.js','background.js'];
module.exports=names.filter(name=>fs.existsSync(path.join(root,name))).map(name=>fs.readFileSync(path.join(root,name),'utf8')).join('\n\n');
