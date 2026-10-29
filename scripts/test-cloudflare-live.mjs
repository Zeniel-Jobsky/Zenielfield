// Creates only uniquely named disposable fixtures, then removes those exact fixtures.
// Run from the checkout that owns the ignored .env with Supabase management access.
import {supabaseSql} from './lib/supabase-sql.mjs';
import {kstToday} from '../app/lib/date.ts';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {loadEnv} from 'vite';
const env=loadEnv('production',process.cwd(),'');
const url=env.ZENIFIELD_SUPABASE_URL,ref=new URL(url).hostname.split('.')[0];
const app='https://zenifield.jobsky.workers.dev';
const run=randomUUID(),qaId='qa-cf-'+run,qaEmail='qa-cf-'+run+'@example.invalid',managerEmail='qa-cf-manager-'+run+'@example.invalid';
const managementHeaders={Authorization:'Bearer '+env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'};
const sql=supabaseSql({ref,token:env.SUPABASE_ACCESS_TOKEN});
const keys=await (await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`,{headers:managementHeaders})).json();
const key=keys.find(k=>k.name==='service_role').api_key;
const authHeaders={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
const authIds=[];let checks=0;
async function authUser(email){const password=randomBytes(32).toString('hex');const r=await fetch(url+'/auth/v1/admin/users',{method:'POST',headers:authHeaders,body:JSON.stringify({email,password,email_confirm:true})});assert.equal(r.status,200);const u=await r.json();authIds.push(u.id);const signed=await fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:authHeaders,body:JSON.stringify({email,password})});assert.equal(signed.status,200);return signed.json();}
const jar=session=>new Map([['__Host-zf-access',session.access_token],['__Host-zf-refresh',session.refresh_token]]);
async function call(path,body,cookies,expected=200,headers={}){
 const h={...headers,...(body!==undefined?{origin:app,'Content-Type':'application/json'}:{}),...(cookies?{cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')}:{})};
 const r=await fetch(app+path,{method:body!==undefined?'POST':'GET',headers:h,...(body!==undefined?{body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,expected,'Unexpected API status '+r.status+' '+JSON.stringify(data));
 if(cookies)for(const cookie of r.headers.getSetCookie()){const [first]=cookie.split(';');const index=first.indexOf('=');cookies.set(first.slice(0,index),first.slice(index+1));}
 checks++;return data;
}
try{
 await sql(`insert into public.zf_users(id,email,name,role,team,part,active,version) values('${qaId}','${qaEmail}','폐기용 Cloudflare 검수 관리자','admin','검수팀','검수파트',1,1);`);
 const session=await authUser(qaEmail),cookies=jar(session);
 await call('/api/platform',undefined,null,401,{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':qaEmail});
 let state=await call('/api/platform',undefined,cookies);assert.equal(state.me.id,qaId);
 const save=(entity,values,record,expected=200,who=cookies)=>call('/api/platform',{entity,values,id:record?.id,version:record?.version},who,expected);
 const manager=(await save('user',{name:'폐기용 검수 매니저',email:managerEmail,team:'검수팀',part:'검수파트',role:'manager',active:1})).item;
 const base={name:'폐기용 Cloudflare 검수 현장',code:'QA-CF-'+run,client:'폐기용 검수',address:'검수용 가상 주소',team:'검수팀',part:'검수파트',division:'검수사업부',region:'서울',priority:'보통',status:'운영 중',managerIds:[manager.id],rule:{period:'month',count:1}};
 const site=(await save('site',base)).item;
 const store=(await save('store',{...base,name:'폐기용 Cloudflare 검수 매장',siteId:site.id,code:'QA-CF-STORE-'+run})).item;
 const now=kstToday();
 const visit=(await save('visit',{targetType:'store',siteId:site.id,storeId:store.id,visitorId:manager.id,plannedDate:now,time:'10:00',purpose:'현장 정기점검',precheck:'',actualDate:null,actualTime:'',result:'',detail:'',notes:'',status:'planned',cancelReason:'',requirementId:null})).item;
 const done=(await save('visit',{...visit,status:'completed',actualDate:now,actualTime:'10:30',detail:'Cloudflare 실제 저장 검수',result:'후속 조치 필요'},visit)).item;
 const action=(await save('action',{targetType:'store',siteId:site.id,storeId:store.id,visitId:done.id,ownerId:manager.id,type:'기타',content:'폐기용 검수 조치',dueDate:now,state:'처리 중'})).item;
 const closed=(await save('action',{...action,state:'완료'},action)).item;assert.equal(closed.completedDate,now);
 state=await call('/api/platform',undefined,cookies);assert.equal(state.visits.find(v=>v.id===done.id).status,'completed');assert.equal(state.actions.find(a=>a.id===closed.id).state,'완료');assert.equal(state.visits.some(v=>v.siteId===site.id&&v.targetType==='site'),false);
 await save('visit',{...done,detail:'stale'},visit,409);
 const managerCookies=jar(await authUser(managerEmail));const scoped=await call('/api/platform',undefined,managerCookies);assert.equal(scoped.me.role,'manager');assert.equal(scoped.sites.some(s=>s.id===site.id),true);
 await save('user',{name:'not allowed'},null,403,managerCookies);
 cookies.set('__Host-zf-access','expired-token');state=await call('/api/platform',undefined,cookies);assert.equal(state.me.id,qaId);assert.notEqual(cookies.get('__Host-zf-access'),'expired-token');
 await call('/api/auth/logout',{},cookies);await call('/api/platform',undefined,cookies,401);
 const anonymousKey=keys.find(k=>k.name==='anon').api_key;
 const direct=await fetch(url+'/rest/v1/zf_users?select=id',{headers:{apikey:anonymousKey,Authorization:'Bearer '+anonymousKey}});assert.equal(direct.ok,false);checks++;
 console.log(JSON.stringify({success:true,checks,verified:['authenticated Cloudflare proxy','forged identity rejected','user/site/store registration','plan/result/action persistence','read after save','no site/store cascade','version conflict','manager scope','non-admin write rejected','session refresh','logout','RLS direct access denied']}));
}finally{
 const siteFilter=`select id from public.zf_sites where code='QA-CF-${run}'`;
 const userFilter=`select id from public.zf_users where id='${qaId}' or email='${managerEmail}'`;
 await sql(`begin; delete from public.zf_audit where actor_id in (${userFilter}); delete from public.zf_actions where site_id in (${siteFilter}); delete from public.zf_visits where site_id in (${siteFilter}); delete from public.zf_assignments where site_id in (${siteFilter}); delete from public.zf_policy_versions where target_id in (${siteFilter}) or target_id in(select id from public.zf_stores where site_id in (${siteFilter})); delete from public.zf_stores where site_id in (${siteFilter}); delete from public.zf_sites where code='QA-CF-${run}'; delete from public.zf_users where id='${qaId}' or email='${managerEmail}'; commit;`);
 for(const id of authIds){const r=await fetch(url+'/auth/v1/admin/users/'+id,{method:'DELETE',headers:authHeaders});assert.equal(r.ok,true);}
 console.log('Exact disposable database and Auth fixtures cleaned up.');
}
