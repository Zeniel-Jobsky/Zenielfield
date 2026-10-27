import esbuild from '../node_modules/.pnpm/esbuild@0.28.0/node_modules/esbuild/lib/main.js';
import assert from 'node:assert/strict';
const result = await esbuild.build({entryPoints:['lib/cloudflare-auth.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {prepareCloudflareDemoRequest: prepare} = await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].contents).toString('base64'));
for (const path of ['/api/platform','/api/data','/signin-with-chatgpt','/signout-with-chatgpt','/callback']) {
 const response=prepare(new Request('https://demo.example'+path,{headers:{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'forged@example.com'}}));
 assert.equal(response.status,503);
 assert.equal(response.headers.get('Cache-Control'),'no-store');
}
const request=prepare(new Request('https://demo.example/',{headers:{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'forged@example.com','accept-language':'ko'}}));
assert.equal(request.headers.has('oai-authenticated-user-id'),false);
assert.equal(request.headers.has('oai-authenticated-user-email'),false);
assert.equal(request.headers.get('accept-language'),'ko');
console.log('13 Cloudflare demo boundary assertions passed: operational APIs and auth routes disabled, forged identity stripped, ordinary headers preserved.');
