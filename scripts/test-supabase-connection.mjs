// Only for a dedicated disposable fixture run; prepare and clean up the exact run ID in SQL. Never run against existing operational records.
import assert from 'node:assert/strict';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log('Ready for connection test JSON on stdin (hidden).');
const config=await new Promise(resolve=>{let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{input+=chunk;if(input.includes('\n')){process.stdin.pause();resolve(JSON.parse(input.trim()))}})}),run=config.runId;
const identity={subject:'qa-admin-'+run,email:'qa-'+run+'@example.test'};
async function call(body,who=identity,expected=200){const r=await fetch(config.url+'/functions/v1/zenifield-gateway',{method:'POST',headers:{'Content-Type':'application/json','x-zenifield-gateway':config.token},body:JSON.stringify({...who,...body})});const d=await r.json();assert.equal(r.status,expected,JSON.stringify(d));return d}
const save=(entity,values,record,expected=200,who=identity)=>call({operation:'save',entity,values,id:record?.id,version:record?.version},who,expected);
const now=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let state=await call({operation:'read'});assert.equal(state.me.role,'admin');
const manager=(await save('user',{name:'가상 검수 매니저',email:'manager-'+run+'@example.test',team:'검수팀',part:'검수파트',role:'manager',active:1})).item;
const base={name:'가상 검수 현장',code:'QA-'+run,client:'가상 고객사',address:'가상 주소',team:'검수팀',part:'검수파트',division:'가상사업부',region:'서울',priority:'보통',status:'운영 중',managerIds:[manager.id],rule:{period:'month',count:1}};
const site=(await save('site',base)).item;const store=(await save('store',{...base,name:'가상 검수 매장',siteId:site.id,code:'QA-STORE-'+run})).item;
const plan={targetType:'site',siteId:site.id,storeId:null,visitorId:manager.id,plannedDate:now,time:'10:00',purpose:'현장 정기점검',precheck:'',actualDate:null,actualTime:'',result:'',detail:'',notes:'',status:'planned',cancelReason:'',requirementId:null};
const visit=(await save('visit',plan)).item;const done=(await save('visit',{...visit,status:'completed',actualDate:now,actualTime:'10:30',detail:'가상 검수용 현장 직접 방문',result:'후속 조치 필요'},visit)).item;
const actions=(await save('action',{targetType:'site',siteId:site.id,storeId:null,visitId:done.id,ownerId:manager.id,type:'기타',content:'가상 검수용 후속 조치',dueDate:now,state:'처리 중'})).item;
const closed=(await save('action',{...actions,state:'완료'},actions)).item;assert.equal(closed.completedDate,now);
state=await call({operation:'read'});assert.equal(state.visits.filter(v=>v.id===done.id&&v.status==='completed').length,1);assert.equal(state.visits.some(v=>v.storeId===store.id),false);assert.equal(state.actions.find(a=>a.id===closed.id).state,'완료');
await save('visit',{...done,detail:'동시 수정 검수'},visit,409);
const who={subject:'qa-manager-'+run,email:'manager-'+run+'@example.test'};const own=await call({operation:'read'},who);assert.equal(own.me.role,'manager');assert.equal(own.sites.some(s=>s.id===site.id),true);
await save('user',{name:'불가'},null,403,who);
const denied=await fetch(config.url+'/functions/v1/zenifield-gateway',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'read',...identity})});assert.equal(denied.status,401);
console.log(JSON.stringify({success:true,runId:run,checks:['read','user registration','site','store','plan','result','linked action','action completed','read after save','no cascade','version conflict','manager scope','non-admin restriction','gateway authentication']}));

process.exit(0);
