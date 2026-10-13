#!/usr/bin/env node
'use strict';
// KAR-52: authoritative, single-comment, exact-Work-head preflight and guarded
// post-generator synchronization. No PR is ever created using GITHUB_TOKEN.
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {validateContract} = require('./kar-work-pr-contract.cjs');
const MARKER = '<!-- KAR-ROLLING-COMMENT -->';

function fail(message) { throw new Error('KAR52_PR_PREFLIGHT_FAILED: ' + message); }
function gitRef(repo, issue) {
  const r = execFileSync('git', ['ls-remote', 'origin', 'refs/heads/work/KAR-' + issue],
    {encoding:'utf8', timeout:20000}).trim();
  if (!r) fail('issue-bound remote Work ref missing');
  return r.split(/\s+/)[0];
}
function assertReady(issue, comments, issueNumber, head, repo) {
  return validateContract({issue, comments, headRef:'work/KAR-'+issueNumber,
    headSha:head, prBody:'Closes #'+issueNumber,
    repositoryFullName:repo});
}
function nextBody(body, issueNumber, previous, next) {
  const prefix = '**Work branch / exact head:**';
  const lines = body.split(/\r?\n/);
  const indices = lines.map((line,index)=>line.startsWith(prefix)?index:-1)
    .filter(index=>index!==-1);
  if(indices.length!==1) fail('one exact Work HEAD field required');
  const oldLine = prefix+' '+String.fromCharCode(96)+'work/KAR-'+issueNumber+
    String.fromCharCode(96)+' / '+String.fromCharCode(96)+previous+String.fromCharCode(96);
  if(lines[indices[0]]!==oldLine) fail('source Rolling Work HEAD no longer matches pre-push SHA');
  const tick=String.fromCharCode(96);
  lines[indices[0]]=prefix+' '+tick+'work/KAR-'+issueNumber+tick+' / '+tick+next+tick;
  return lines.join('\n');
}
function parse(args) {
  const flags={};
  for(let i=0;i<args.length;i++){
    const key=args[i];
    if(key==='--sync-head'){flags.sync=true;continue;}
    if(!['--issue','--head-sha','--prior-sha'].includes(key)||!args[i+1])
      fail('invalid option '+key);
    flags[key.slice(2)]=args[++i];
  }
  if(!/^[1-9]\d*$/.test(flags.issue||'')||
     !/^[a-f0-9]{40}$/.test(flags['head-sha']||''))
    fail('positive issue and exact target SHA mandatory');
  if(flags.sync && !/^[a-f0-9]{40}$/.test(flags['prior-sha']||''))
    fail('prior exact SHA required for synchronization');
  return flags;
}
function gh(api,extra=[]) {
  return JSON.parse(execFileSync('gh',['api',...extra,api],
    {encoding:'utf8',timeout:25000,maxBuffer:8*1024*1024}));
}
function getData(repo,n) {
  const issue=gh('repos/'+repo+'/issues/'+n);
  const pages=gh('repos/'+repo+'/issues/'+n+'/comments?per_page=100',
    ['--paginate','--slurp']);
  const comments=Array.isArray(pages)?pages.flat(1):[];
  return {issue,comments};
}
function main() {
  const f=parse(process.argv.slice(2)), repo=process.env.GITHUB_REPOSITORY;
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo||'')) fail('repository not provided');
  if(!process.env.GH_TOKEN) fail('GH_TOKEN required for exact GitHub readback');
  const n=Number(f.issue), target=f['head-sha'];
  if(gitRef(repo,n)!==target) fail('remote Work ref not at target SHA');
  const {issue,comments}=getData(repo,n);
  if(!f.sync){
    const checked=assertReady(issue,comments,n,target,repo);
    console.log('PASS KAR-52 PR-before-trigger preflight '+JSON.stringify(checked));
    return;
  }
  const previous=f['prior-sha'];
  const oldReady=assertReady(issue,comments,n,previous,repo);
  const matches=comments.filter(c=>typeof c.body==='string'&&c.body.includes(MARKER));
  if(matches.length!==1) fail('unique canonical comment not found');
  const c=matches[0];
  const changed=nextBody(c.body,n,previous,target);
  // One narrowly scoped field update. No PR creation, no merge or tag.
  execFileSync('gh',['api','--method','PATCH','-f','body='+changed,
    'repos/'+repo+'/issues/comments/'+c.id],{encoding:'utf8',timeout:30000});
  const {issue:again,comments:after}=getData(repo,n);
  const checked=assertReady(again,after,n,target,repo);
  if(checked.commentId!==oldReady.commentId) fail('comment owner changed during readback');
  console.log('PASS KAR-52 synchronized canonical Rolling Comment before PR: '+
    JSON.stringify(checked));
}
if(require.main===module){
  try{main();}catch(error){console.error('KAR52_PR_PREFLIGHT_FAILED: '+error.message);
    process.exitCode=1;}
}
module.exports={assertReady,nextBody,parse};
