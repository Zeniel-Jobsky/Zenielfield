import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { getDb } from '../../../db';
import * as t from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { canSite, today, type Data, type User, type Site } from '../../lib/model';
const fail=(message:string,status=400)=>Response.json({error:message},{status});
const uid=()=>crypto.randomUUID();
async function identity(req:Request){
 const sub=req.headers.get('oai-authenticated-user-id');
 const email=req.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
 if(!sub||!email)throw new Error('AUTH');
 const db=getDb();let list=await db.select().from(t.users);
 if(!list.length){await db.insert(t.users).values({id:uid(),subject:sub,email,name:'운영 관리자',role:'admin',team:'유통운영팀',part:'리테일파트',active:1}).onConflictDoNothing();list=await db.select().from(t.users)}
 let me=list.find(u=>u.subject===sub);
 if(!me){me=list.find(u=>u.email===email&&!u.subject&&u.active===1);if(me){await db.update(t.users).set({subject:sub}).where(eq(t.users.id,me.id));me={...me,subject:sub}}}
 if(!me||!me.active)throw new Error('DENIED');return me;
}
async function all(me:User):Promise<Data>{const db=getDb();const [users,sites,assignments,visits,actions,audit]=await Promise.all([db.select().from(t.users),db.select().from(t.sites),db.select().from(t.assignments),db.select().from(t.visits),db.select().from(t.actions),db.select().from(t.audit)]);return {me,users,sites,assignments,visits,actions,audit}}
function scoped(d:Data){const sites=d.sites.filter(s=>canSite(d.me,s,d.assignments));const ids=new Set(sites.map(s=>s.id));const entityIds=new Set([d.me.id,...sites.map(s=>s.id),...d.visits.filter(v=>ids.has(v.siteId)).map(v=>v.id),...d.actions.filter(a=>ids.has(a.siteId)).map(a=>a.id)]);return {...d,me:{...d.me,subject:undefined},users:d.users.map(u=>({...u,subject:undefined,email:d.me.role==='admin'?u.email:''})),sites,assignments:d.assignments.filter(a=>ids.has(a.siteId)),visits:d.visits.filter(v=>ids.has(v.siteId)),actions:d.actions.filter(a=>ids.has(a.siteId)),audit:d.audit.filter(a=>d.me.role==='admin'||entityIds.has(a.entityId)).slice(-300)}}
export async function GET(req:Request){try{const me=await identity(req);return Response.json(scoped(await all(me)),{headers:{'Cache-Control':'no-store'}})}catch(e){return err(e)}}
function err(e:unknown){if(e instanceof z.ZodError)return fail(e.issues[0]?.message||'입력값을 확인해주세요.');if(e instanceof Error){if(e.message==='AUTH')return fail('로그인 후 이용할 수 있습니다.',401);if(e.message==='DENIED')return fail('등록된 사용자만 접근할 수 있습니다.',403);if(e.message==='CONFLICT')return fail('다른 사용자가 수정한 기록입니다. 새로고침 후 다시 시도해주세요.',409);if(e.message==='SCOPE')return fail('이 항목을 수정할 권한이 없습니다.',403);if(e.message.includes('UNIQUE'))return fail('이미 등록된 현장 코드 또는 이메일입니다.',409)}console.error('ZeniField API operation failed');return fail('저장하지 못했습니다. 잠시 후 다시 시도해주세요.',500)}
const str=z.string().trim().min(1,'필수 항목을 입력해주세요.').max(1500);
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'날짜를 확인해주세요.').refine(v=>!isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v,'유효한 날짜를 입력해주세요.');
const siteSchema=z.object({code:str.max(40),name:str.max(100),client:str.max(100),team:str.max(80),part:str.max(80),address:str.max(250),cycle:z.enum(['weekly','biweekly','monthly','quarterly','manual']),priority:z.enum(['높음','보통','낮음']),status:z.enum(['운영 중','일시 중단','종료']),managerId:str});
const visitSchema=z.object({siteId:str,visitorId:str,plannedDate:day.nullable(),time:z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d)?$/),purpose:z.enum(['현장 정기점검','고객사 담당자 미팅','근로자 관리 및 면담','신규 인력 투입 및 채용','현장 민원·문제 대응','기타']),precheck:z.string().max(1500),actualDate:day.nullable(),result:z.string().max(100),detail:z.string().max(4000),status:z.enum(['planned','completed','cancelled']),cancelReason:z.string().max(1000)});
const actionSchema=z.object({siteId:str,visitId:z.string().nullable(),type:str.max(60),content:str.max(2500),ownerId:str,dueDate:day,state:z.enum(['조치 예정','처리 중','완료','보류']),completedDate:day.nullable()});
const userSchema=z.object({name:str.max(80),email:z.string().trim().toLowerCase().email(),role:z.enum(['admin','director','lead','partlead','manager']),team:str.max(80),part:str.max(80),active:z.number().int().min(0).max(1)});
const dbColumn=(s:string)=>s.replace(/[A-Z]/g,m=>'_'+m.toLowerCase());
function write(table:string,id:string,values:Record<string,any>,old:Record<string,any>|null,me:User){
 const database=env.DB!;const merged={...values,id};const entries=Object.entries(merged);let stmt;
 if(old){const fields=Object.entries(values);stmt=database.prepare(`UPDATE ${table} SET ${fields.map(([k])=>dbColumn(k)+' = ?').join(', ')} WHERE id = ? AND version = ?`).bind(...fields.map(([,v])=>v),id,old.version)}
 else stmt=database.prepare(`INSERT INTO ${table} (${entries.map(([k])=>dbColumn(k)).join(',')}) VALUES (${entries.map(()=>'?').join(',')})`).bind(...entries.map(([,v])=>v));
 const auditId=uid();const log=database.prepare(`INSERT INTO audit_log (id,actor_id,entity,entity_id,before_json,after_json,created_at) SELECT ?,?,?,?,?,?,? WHERE changes()=1`).bind(auditId,me.id,table,id,old?JSON.stringify(old):null,JSON.stringify(merged),new Date().toISOString());
 return Object.assign([stmt,log],{auditId});
}
export async function POST(req:Request){try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return fail('요청 출처를 확인해주세요.',403);
 const me=await identity(req);const data=await all(me);const body=z.object({entity:z.enum(['user','site','visit','action']),id:z.string().max(100).optional(),version:z.number().int().positive().optional(),values:z.unknown().optional()}).parse(await req.json());const id=body.id||uid();const isAdmin=me.role==='admin';const management=me.role!=='manager';
 if(body.entity==='user'){
  if(!isAdmin)throw new Error('SCOPE');const values=userSchema.parse(body.values);const old=data.users.find(u=>u.id===id);if(old?.id===me.id&&(values.role!=='admin'||!values.active))return fail('본인의 관리자 권한을 해제할 수 없습니다.');
  // No version column in users: preserve subject and audit updates in one batch.
  const db=getDb();if(old){await env.DB!.batch([env.DB!.prepare('UPDATE users SET name=?,email=?,role=?,team=?,part=?,active=? WHERE id=?').bind(values.name,values.email,values.role,values.team,values.part,values.active,id),env.DB!.prepare('INSERT INTO audit_log (id,actor_id,entity,entity_id,before_json,after_json,created_at) VALUES (?,?,?,?,?,?,?)').bind(uid(),me.id,'users',id,JSON.stringify(old),JSON.stringify(values),new Date().toISOString())])}else await env.DB!.batch(write('users',id,{...values,subject:null},null,me));return Response.json(scoped(await all(me)));
 }
 if(body.entity==='site'){
  if(!management||me.role==='director')throw new Error('SCOPE');const {managerId,...values}=siteSchema.parse(body.values);const old=data.sites.find(s=>s.id===id)||null;
  if(old&&!canSite(me,old,data.assignments)||!canSite(me,{...values,id} as Site,data.assignments))throw new Error('SCOPE');
  if(old&&old.version!==body.version)throw new Error('CONFLICT');const assignee=data.users.find(u=>u.id===managerId&&u.active);if(!assignee||assignee.team!==values.team||assignee.part!==values.part)return fail('담당자의 팀·파트와 현장 조직이 일치해야 합니다.');
  const stmts=write('sites',id,{...values,startDate:old?.startDate||today(),version:(old?.version||0)+1},old,me);const previous=data.assignments.find(a=>a.siteId===id&&!a.endDate);
  if(previous?.userId!==managerId){
   const nextId=uid();const stamp=new Date().toISOString();const newAssignment={id:nextId,siteId:id,userId:managerId,startDate:today(),endDate:null};
   if(previous)stmts.push(env.DB!.prepare('INSERT INTO audit_log (id,actor_id,entity,entity_id,before_json,after_json,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM audit_log WHERE id=?)').bind(uid(),me.id,'site_assignments',previous.id,JSON.stringify(previous),JSON.stringify({...previous,endDate:today()}),stamp,stmts.auditId));
   stmts.push(env.DB!.prepare('UPDATE site_assignments SET end_date=? WHERE site_id=? AND end_date IS NULL AND EXISTS(SELECT 1 FROM audit_log WHERE id=?)').bind(today(),id,stmts.auditId));
   stmts.push(env.DB!.prepare('INSERT INTO site_assignments (id,site_id,user_id,start_date,end_date) SELECT ?,?,?,?,NULL WHERE EXISTS(SELECT 1 FROM audit_log WHERE id=?)').bind(nextId,id,managerId,today(),stmts.auditId));
   stmts.push(env.DB!.prepare('INSERT INTO audit_log (id,actor_id,entity,entity_id,before_json,after_json,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM audit_log WHERE id=?)').bind(uid(),me.id,'site_assignments',nextId,null,JSON.stringify(newAssignment),stamp,stmts.auditId));
  }
  const res=await env.DB!.batch(stmts);if(old&&res[0].meta.changes!==1)throw new Error('CONFLICT');
  // Existing plans retain their named visitor. Reassignment is an explicit, audited edit.
 }else if(body.entity==='visit'||body.entity==='action'){
  const values=body.entity==='visit'?visitSchema.parse(body.values):actionSchema.parse(body.values);const old=(body.entity==='visit'?data.visits:data.actions).find(x=>x.id===id)||null;
  const site=data.sites.find(s=>s.id===values.siteId);if(!site||!canSite(me,site,data.assignments)||me.role==='director')throw new Error('SCOPE');
  if(old){const oldSite=data.sites.find(s=>s.id===old.siteId)!;if(!canSite(me,oldSite,data.assignments))throw new Error('SCOPE');if(old.version!==body.version)throw new Error('CONFLICT')}
  if(site.status!=='운영 중'&&!old)return fail('운영 중인 현장에만 새 방문·조치를 등록할 수 있습니다.');
  const assigneeId=body.entity==='visit'?(values as any).visitorId:(values as any).ownerId;
  if(!data.users.some(u=>u.id===assigneeId&&u.active&&canSite(u,site,data.assignments)))return fail('활성 담당자를 선택해주세요.');
  if(!management&&(assigneeId!==me.id||(old&&('visitorId' in old?old.visitorId:old.ownerId)!==me.id)))throw new Error('SCOPE');
  if(body.entity==='visit'){
   const v=values as z.infer<typeof visitSchema>;
   if(v.status==='completed'&&(!v.actualDate||!v.detail.trim()||!['특이사항 없음','후속 조치 필요'].includes(v.result)))return fail('실제 방문일, 활동 내용, 결과 구분을 입력해주세요.');
   if(v.actualDate&&v.actualDate>today())return fail('실제 방문일은 오늘 이후일 수 없습니다.');
   if(v.status==='planned'&&!v.plannedDate)return fail('방문 예정일을 입력해주세요.');
   if(v.status==='cancelled'&&!v.cancelReason.trim())return fail('취소 사유를 입력해주세요.');
   if(old&&'status' in old&&old.status==='completed'&&v.status!=='completed')return fail('완료한 방문은 결과 수정만 가능합니다.');
   if(old&&'status' in old&&old.status==='cancelled'&&v.status!=='cancelled')return fail('취소한 방문은 새 계획으로 등록해주세요.');
   if(v.status!=='completed'){v.actualDate=null;v.result='';v.detail=''}
  }else{
   const a=values as z.infer<typeof actionSchema>;if(a.visitId&&!data.visits.some(v=>v.id===a.visitId&&v.siteId===a.siteId))return fail('관련 방문과 현장이 일치하지 않습니다.');a.completedDate=a.state==='완료'?(old&&'completedDate' in old&&old.completedDate||today()):null;
  }
  const res=await env.DB!.batch(write(body.entity==='visit'?'visits':'action_items',id,{...values,version:(old?.version||0)+1},old,me));if(old&&res[0].meta.changes!==1)throw new Error('CONFLICT');
 }else return fail('지원하지 않는 요청입니다.');
 return Response.json(scoped(await all(me)));
 }catch(e){return err(e)}}
