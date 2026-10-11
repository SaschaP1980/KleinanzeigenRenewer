const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.existsSync(path.join(root,name))?fs.readFileSync(path.join(root,name),'utf8'):'';
module.exports=[
  read('renewal-state-repository.js'),
  read('renewal-workflow-controller.js'),
  read('template-fill-service.js'),
  read('template-fill-controller.js'),
  read('insertion-lock-service.js'),
  read('archive-insertion-service.js'),
  read('archive-insertion-controller.js'),
  read('src/background/services/archive-insertion-recovery-service.js'),
  read('src/background/services/archive-insertion-verification-service.js'),
  require('./v12221-legacy-background-surface.cjs')
].filter(Boolean).join('\n');
