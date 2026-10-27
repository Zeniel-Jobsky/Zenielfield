import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Miniflare } from '../node_modules/.pnpm/miniflare@4.20260515.0_@types+node@22.19.19/node_modules/miniflare/dist/src/index.js';
import esbuild from '../node_modules/.pnpm/esbuild@0.28.0/node_modules/esbuild/lib/main.js';
// Test the real route and SQL against an isolated, in-memory Workers/D1 runtime.
const bundled=await esbuild.build({stdin:{contents:"import { GET, POST } from './app/api/data/route.ts'; export default {fetch(request){return request.method==='POST'?POST(request):GET(request)}};",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'neutral',external:['cloudflare:workers']});
const mf=new Miniflare({cf:false,modules:true,script:bundled.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'qa-memory'}});
try{
const db=await mf.getD1Database('DB');const sql=await fs.readFile('drizzle/0000_wooden_magneto.sql','utf8');for(const stmt of sql.split('--> statement-breakpoint').filter(s=>s.trim()))await db.prepare(stmt.trim()).run();
const admin={'oai-authenticated-user-id':'qa-owner','oai-authenticated-user-email':'qa-owner@example.test'};
const managerAuth={'oai-authenticated-user-id':'qa-manager','oai-authenticated-user-email':'qa-manager@example.test'};let checks=0;
async function call(body=null,auth=admin,status=200){const r=await mf.dispatchFetch('https://qa.test/api/data',{method:body?'POST':'GET',headers:{...auth,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));checks++;return d}
async function post(entity,values,record=null,status=200,auth=admin){return call({entity,values,...(record?{id:record.id,version:record.version}: {})},auth,status)}
await call(null,{},401);let d=await call();const me=d.me;
const uv={name:'QA 잡매니저',email:'qa-manager@example.test',role:'manager',team:'QA팀',part:'QA파트',active:1};d=await post('user',uv);const manager=d.users.find(u=>u.email===uv.email);
const sv={code:'QA-001',name:'가상 QA 현장',client:'가상 고객사',team:'QA팀',part:'QA파트',address:'가상 주소',cycle:'monthly',priority:'보통',status:'운영 중',managerId:manager.id};d=await post('site',sv);const s=d.sites[0];assert.equal(d.visits.length,0);
let dm=await call(null,managerAuth);assert.equal(dm.sites[0].id,s.id);
const now=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const vv={siteId:s.id,visitorId:manager.id,plannedDate:now,time:'10:00',purpose:'현장 정기점검',precheck:'가상 검증',actualDate:null,result:'',detail:'',status:'planned',cancelReason:''};dm=await post('visit',vv,null,200,managerAuth);const v=dm.visits[0];
Object.assign(vv,{status:'completed',actualDate:now,result:'후속 조치 필요',detail:'가상 현장 점검 결과 · 검증용'});dm=await post('visit',vv,v,200,managerAuth);assert.equal(dm.visits[0].status,'completed');await post('visit',vv,v,409,managerAuth);
const av={siteId:s.id,visitId:v.id,type:'고객사 요청',content:'가상 후속 조치',ownerId:manager.id,dueDate:now,state:'조치 예정',completedDate:null};dm=await post('action',av,null,200,managerAuth);const a=dm.actions[0];av.state='완료';dm=await post('action',av,a,200,managerAuth);assert.equal(dm.actions[0].completedDate,now);
const persisted=await call();assert.equal(persisted.visits[0].detail,vv.detail);assert.ok(persisted.audit.length>=5);await post('site',sv,s,403,managerAuth);
d=await post('user',{...uv,name:'QA 다른 담당자',email:'qa-second@example.test'});const second=d.users.find(u=>u.email==='qa-second@example.test');sv.managerId=second.id;d=await post('site',sv,s);assert.equal(d.visits[0].visitorId,manager.id);assert.equal(d.assignments.length,2);assert.equal((await call(null,managerAuth)).sites.length,0);
sv.managerId=manager.id;await post('site',sv,s,409);d=await call();assert.equal(d.assignments.find(a=>!a.endDate).userId,second.id);
// Audit preserves ended assignment and reassignment records.
assert.ok(d.audit.some(a=>a.entity==='site_assignments'&&a.before));
// Unknown identity cannot bootstrap additional administration.
await call(null,{'oai-authenticated-user-id':'unknown','oai-authenticated-user-email':'unknown@example.test'},403);
// Reject impossible dates, future actual visits, and CSRF origins.
await post('visit',{...vv,plannedDate:'2026-02-30'},null,400);
await call({entity:'user',values:uv},{...admin,origin:'https://untrusted.test'},403);
console.log(`${checks} API requests passed: identity, permission, persisted plans/results/actions, audit, reassignment, conflict and validation.`);
}finally{await mf.dispose()}
