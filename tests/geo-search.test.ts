import assert from 'node:assert/strict';
import {geoSearch} from '../app/api/geo/server';
let n=0;const ok=(a:any,b:any)=>{assert.deepEqual(a,b);n++};
const req=(q:string,auth=true)=>new Request('https://x.test/api/geo?q='+encodeURIComponent(q),{headers:auth?{'oai-authenticated-user-id':'u'}:{}});
let calls=0;const spy=(async()=>{calls++;return new Response('')})as any;
ok((await geoSearch(req('성수',false),{KAKAO_REST_API_KEY:'k'},spy)).status,401);ok((await geoSearch(req('성수'),{KAKAO_REST_API_KEY:'k'},spy)).status,410);ok(calls,0);
console.log(`${n} geo search assertions passed: location search disabled, no external call even with a key.`);
