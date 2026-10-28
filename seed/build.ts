// 데모 데이터 주입 파이프라인 (앱 코드와 분리). 가상 데모 + 제니엘 지사 + 운영 매장 후보 → Supabase 적재용 SQL.
// 모든 행은 id 접두사(demo-·zeniel-)와 data.seed 태그로 구분해 purge로 통째로 지울 수 있다.
import {platformDemo} from '../app/platform/demo';
import {distanceM,type PlatformData,type FieldSite,type Store} from '../app/platform/model';
export const SEED_TAG='demo-seed';
export type Csv=Record<string,string>[];
export function parseCsv(text:string):Csv{const rows:string[][]=[];let row:string[]=[],cell='',q=false;const t=text.replace(/^﻿/,'');for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch==='"'&&t[i+1]==='"'){cell+='"';i++}else if(ch==='"')q=false;else cell+=ch}else if(ch==='"')q=true;else if(ch===','){row.push(cell);cell=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}else cell+=ch}if(cell||row.length){row.push(cell);rows.push(row)}const [head,...body]=rows.filter(r=>r.some(c=>c.trim()));return body.map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]??''])))}
const coords=(r:Record<string,string>)=>{const lat=Number(r.lat),lng=Number(r.lng);if(!r.lat||!r.lng||!Number.isFinite(lat)||!Number.isFinite(lng))throw Error(`좌표 없음: ${r.code} ${r.name}`);return{lat,lng}};
// 지사 = 현장(고객사 제니엘), 매장 후보 = 가장 가까운 지사 현장의 산하 매장. 담당은 리테일운영팀 1파트.
export function buildSeed(now:string,branches:Csv,stores:Csv):PlatformData{
 const data=platformDemo(now),team='리테일운영팀',part='1파트',owners=data.users.filter(u=>u.team===team&&u.part===part).map(u=>u.id),begin=data.sites[0].startDate;
 const dom=data.domains[0];const sites:FieldSite[]=branches.map(r=>({id:'zeniel-'+r.code.toLowerCase(),code:r.code,name:r.name,client:'제니엘',division:dom.name,domain:dom.id,team,part,address:r.address,region:r.address.split(' ')[0],managerIds:owners,rule:{period:'manual',count:1},cycle:'manual',priority:'보통',status:'운영 중',startDate:begin,version:1,...coords(r)} as FieldSite));
 const shops:Store[]=stores.map((r,i)=>{const at=coords(r),parent=[...sites].sort((a,b)=>distanceM(at,a as any)-distanceM(at,b as any))[0];return{id:'zeniel-'+r.code.toLowerCase(),siteId:parent.id,code:r.code,name:r.name,address:r.address,region:r.address.split(' ')[0],managerIds:[owners[i%owners.length]],rule:{period:'month',count:1},status:'운영 중',startDate:begin,version:1,...at}});
 return{...data,sites:[...data.sites,...sites],stores:[...data.stores,...shops]};
}
const lit=(v:unknown)=>v===null||v===undefined?'null':typeof v==='number'?String(v):`'${String(v).replace(/'/g,"''")}'`;
const js=(v:unknown)=>`${lit(JSON.stringify(v))}::jsonb`;
const tagged=<T extends object>(r:T)=>({...r,seed:SEED_TAG});
const chunk=(table:string,cols:string,rows:string[])=>rows.length?Array.from({length:Math.ceil(rows.length/500)},(_,i)=>`insert into public.${table}(${cols}) values\n${rows.slice(i*500,i*500+500).join(',\n')};`).join('\n'):'';
export const purgeSql=()=>`-- ${SEED_TAG} 행만 삭제 (FK 역순)
delete from public.zf_actions where data->>'seed'='${SEED_TAG}';
delete from public.zf_visits where data->>'seed'='${SEED_TAG}';
delete from public.zf_assignments where user_id like 'demo-%';
delete from public.zf_policy_versions where target_id like 'demo-%' or target_id like 'zeniel-%';
delete from public.zf_stores where data->>'seed'='${SEED_TAG}';
delete from public.zf_sites where data->>'seed'='${SEED_TAG}';
delete from public.zf_audit where actor_id like 'demo-%';
delete from public.zf_users where id like 'demo-%';
delete from public.zf_domains where data->>'seed'='${SEED_TAG}';`;
export function seedSql(d:PlatformData){return [
 chunk('zf_domains','id,code,name,active,version,data',d.domains.map(x=>`(${[x.id,x.code,x.name,x.active,x.version].map(lit).join(',')},${js(tagged(x))})`)),
 chunk('zf_users','id,email,name,role,team,part,active,version,domains',d.users.map(u=>`(${[u.id,u.email,u.name,u.role,u.team,u.part,u.active,1].map(lit).join(',')},array[${(u.domains||[]).map(lit).join(',')}]::text[])`)),
 chunk('zf_sites','id,code,team,part,version,domain,data',d.sites.map(s=>`(${[s.id,s.code,s.team,s.part,s.version,s.domain||null].map(lit).join(',')},${js(tagged(s))})`)),
 chunk('zf_stores','id,site_id,code,version,data',d.stores.map(s=>`(${[s.id,s.siteId,s.code,s.version].map(lit).join(',')},${js(tagged(s))})`)),
 chunk('zf_assignments','target_type,site_id,store_id,user_id,start_date',[...d.sites.flatMap(s=>s.managerIds.map(u=>`('site',${lit(s.id)},null,${lit(u)},${lit(s.startDate)})`)),...d.stores.flatMap(s=>s.managerIds.map(u=>`('store',${lit(s.siteId)},${lit(s.id)},${lit(u)},${lit(s.startDate)})`))]),
 chunk('zf_policy_versions','target_type,target_id,rule',[...d.sites.map(s=>`('site',${lit(s.id)},${js(s.rule)})`),...d.stores.map(s=>`('store',${lit(s.id)},${js(s.rule)})`)]),
 chunk('zf_visits','id,site_id,store_id,target_type,visitor_id,status,requirement_id,version,data',d.visits.map(v=>{const x={entry:'manual',...v};return `(${[v.id,v.siteId,v.storeId,v.targetType,v.visitorId,v.status,v.requirementId,v.version].map(lit).join(',')},${js(tagged(x))})`})),
 chunk('zf_actions','id,site_id,store_id,target_type,visit_id,owner_id,state,version,data',d.actions.map(a=>`(${[a.id,a.siteId,a.storeId,a.targetType,a.visitId,a.ownerId,a.state,a.version].map(lit).join(',')},${js(tagged(a))})`)),
].filter(Boolean).join('\n')}
