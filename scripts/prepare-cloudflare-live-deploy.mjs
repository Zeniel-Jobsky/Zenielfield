// Dedicated live Worker config. Never changes the existing zenifield worker or its database.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const source=JSON.parse(readFileSync(resolve('dist/server/wrangler.ci.json'),'utf8'));
const expected='d50191f54ac6859d1ecedddf26094351';
if(source.name!=='zenifield'||source.account_id!==expected)throw Error('Unexpected source Worker/account; stop');
if((source.d1_databases||[]).length||(source.r2_buckets||[]).length)throw Error('D1/R2 bindings are forbidden in live');
if(source.legacy_env!==undefined)throw Error('Legacy worker config is not supported');
source.name='zenifield-live';
source.workers_dev=true;
source.preview_urls=false;
source.vars={...source.vars,ZENIFIELD_AUTH_PROVIDER:'supabase-email'};
delete source.vars.ZENIFIELD_SUPABASE_URL;
delete source.vars.ZENIFIELD_GATEWAY_TOKEN;
writeFileSync(resolve('dist/server/wrangler.live.json'),JSON.stringify(source,null,2)+'\n');
console.log('Isolated Worker config prepared:',source.name,'for Cloudflare account',source.account_id);
