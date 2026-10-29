import type {User} from '../lib/model';
import type {PlatformData,Target,FieldAction,FieldVisit} from '../platform/model';
import {targetOf} from '../platform/model';
import {isCurrentJudgment} from '../platform/judgment';
import type {BriefData} from '../briefing/model';
import type {DxInput} from './model';
const owners=(users:User[])=>new Set(users.filter(u=>u.active).map(u=>u.id));
// 긴급·반복은 저장된 종합 판정에서 가져온다: 조치에 연결된 방문(없으면 등록일 이전 그 대상의 가장 최근 판정)의 같은 유형 이슈.
// severity='긴급' → urgent, flow='지속'|'악화' → repeat. 판정이 없거나 같은 유형 이슈가 없으면 undefined(미판정).
function judgedIssue(a:FieldAction,visits:FieldVisit[]){const byId=a.visitId?visits.find(v=>v.id===a.visitId):undefined;
 const v=byId&&isCurrentJudgment(byId.judgment)?byId:visits.filter(v=>targetOf(v)===targetOf(a)&&v.status==='completed'&&isCurrentJudgment(v.judgment)&&(!a.createdDate||(v.actualDate||'')<=a.createdDate)).sort((x,y)=>(y.actualDate||'').localeCompare(x.actualDate||''))[0];
 return v?.judgment?v.judgment.issues.find(i=>i.type===a.type)||null:undefined}
const issue=(a:FieldAction,visits:FieldVisit[])=>{const j=judgedIssue(a,visits);return {id:a.id,targetId:targetOf(a),siteId:a.siteId,visitId:a.visitId,ownerId:a.ownerId,type:a.type,content:a.content,state:a.state,dueDate:a.dueDate,createdDate:a.createdDate||null,completedDate:a.completedDate,...(j===undefined?{}:{urgent:j?.severity==='긴급',repeat:!!j&&(j.flow==='지속'||j.flow==='악화')})}};
const visit=(v:FieldVisit)=>({id:v.id,targetId:targetOf(v),siteId:v.siteId,visitorId:v.visitorId,plannedDate:v.plannedDate,actualDate:v.actualDate,status:v.status,purpose:v.purpose});
const target=(t:Target)=>({id:t.id,type:t.type,siteId:t.siteId,name:t.name,siteName:t.siteName});
export function scopeInput(data:PlatformData,scope:Target[]):DxInput{const ids=new Set(scope.map(t=>t.id));return{targets:scope.map(target),issues:data.actions.filter(a=>ids.has(targetOf(a))).map(a=>issue(a,data.visits)),visits:data.visits.filter(v=>ids.has(targetOf(v))).map(visit),owners:owners(data.users)}}
export function briefInput(brief:BriefData,users:User[]):DxInput{return{targets:brief.targets.map(t=>({id:t.id,type:t.type,siteId:t.siteId,name:t.name,siteName:t.siteName})),issues:brief.issues.map(a=>({id:a.id,targetId:a.targetId,siteId:a.siteId,visitId:a.visitId,ownerId:a.ownerId,type:a.type,content:a.content,state:a.state,dueDate:a.dueDate,createdDate:a.createdDate,completedDate:a.completedDate})),visits:brief.visits.map(v=>({id:v.id,targetId:v.targetId,siteId:v.siteId,visitorId:v.visitorId,plannedDate:v.plannedDate,actualDate:v.actualDate,status:v.status,purpose:v.purpose})),owners:owners(users)}}
