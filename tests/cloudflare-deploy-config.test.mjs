import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const script=resolve('scripts/prepare-cloudflare-deploy.mjs'),target=JSON.parse(readFileSync('wrangler.cloudflare.json','utf8'));
const temp=mkdtempSync(join(tmpdir(),'zf-deploy-config-'));
try{
 mkdirSync(join(temp,'dist/server'),{recursive:true});
 writeFileSync(join(temp,'wrangler.cloudflare.json'),JSON.stringify(target));
 const run=(patch={},account=target.account_id)=>{writeFileSync(join(temp,'dist/server/wrangler.json'),JSON.stringify({...target,legacy_env:true,...patch}));return spawnSync(process.execPath,[script],{cwd:temp,env:{...process.env,CLOUDFLARE_ACCOUNT_ID:account},encoding:'utf8'})};
 assert.equal(run().status,0);
 assert.equal('legacy_env' in JSON.parse(readFileSync(join(temp,'dist/server/wrangler.ci.json'),'utf8')),false);
 assert.notEqual(run({account_id:'wrong-account'}).status,0);
 assert.notEqual(run({},'wrong-ci-account').status,0);
 assert.notEqual(run({d1_databases:[{binding:'DB',database_id:'old-account-db'}]}).status,0);
 assert.notEqual(run({legacy_env:false}).status,0);
 console.log('6 Cloudflare target config checks passed: account pinning, legacy flag and foreign bindings.');
}finally{rmSync(temp,{recursive:true,force:true})}
