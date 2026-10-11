#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const baselinePath=path.join(ROOT,'coverage/coverage-baseline-v1.23.19.json');
const currentPath=path.join(ROOT,'coverage/coverage-summary.json');
const b=JSON.parse(fs.readFileSync(baselinePath,'utf8'));const c=JSON.parse(fs.readFileSync(currentPath,'utf8'));
const failures=[];
function check(label,cur,base,hard100=false){
  if(hard100 && Number(cur.percent)!==100) failures.push(`${label}: ${cur.percent}% != 100%`);
  if(Number(cur.percent)+1e-9 < Number(base.percent)) failures.push(`${label}: ${cur.percent}% < baseline ${base.percent}%`);
}
check('publicFunctions',c.publicFunctions,b.publicFunctions,true);check('lines',c.lines,b.lines);check('branches',c.branches,b.branches);
for(const area of ['app','background','content','shared']){
  if(!b.areas?.[area]||!c.areas?.[area]){failures.push(`${area}: missing coverage area`);continue;}
  check(`${area}.public`,c.areas[area].public,b.areas[area].public,true);
  check(`${area}.lines`,c.areas[area].lines,b.areas[area].lines);
  check(`${area}.branches`,c.areas[area].branches,b.areas[area].branches);
}
if(failures.length){console.error('COVERAGE_NO_REGRESSION_FAILED');for(const f of failures)console.error(`- ${f}`);process.exit(2);}
console.log(`PASS coverage no-regression: public ${c.publicFunctions.percent}% · lines ${c.lines.percent}% · branches ${c.branches.percent}%`);
