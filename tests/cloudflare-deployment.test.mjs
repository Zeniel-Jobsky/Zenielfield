import assert from 'node:assert/strict';
import {checkDeployment} from '../scripts/check-cloudflare-deployment.mjs';
const sha='a'.repeat(40);
const fake=(commit='a'.repeat(7),provider='supabase-email',status=401)=>async url=>{
 const path=new URL(url).pathname;
 if(path==='/version.json')return Response.json({commit,version:'0.1.4',dev:false});
 if(path==='/api/auth/config')return Response.json({provider});
 return new Response('',{status:path==='/api/platform'?status:path==='/api/data'?503:200});
};
assert.equal((await checkDeployment('https://zenifield.jobsky.workers.dev',sha,fake())).commit,'aaaaaaa');
await assert.rejects(()=>checkDeployment('https://zenifield.jobsky.workers.dev',sha,fake('bbbbbbb')),/커밋/);
await assert.rejects(()=>checkDeployment('https://zenifield.jobsky.workers.dev',sha,fake('aaaaaaa+수정')),/커밋/);
await assert.rejects(()=>checkDeployment('https://zenifield.jobsky.workers.dev',sha,fake('aaaaaaa','cloudflare-demo')),/로그인/);
await assert.rejects(()=>checkDeployment('https://zenifield.jobsky.workers.dev',sha,fake('aaaaaaa','supabase-email',200)),/비로그인/);
console.log('5 Cloudflare deployment checks passed: revision, dirty build, login provider and anonymous access.');
