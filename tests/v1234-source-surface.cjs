const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const files=['background.js','template-fill-controller.js','insertion-lock-service.js','archive-insertion-controller.js'];
module.exports=files.filter(f=>fs.existsSync(path.join(root,f))).map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
