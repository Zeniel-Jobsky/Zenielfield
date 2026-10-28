import type {User} from '../lib/model';
import type {PlatformData,Target,FieldAction,FieldVisit} from '../platform/model';
import {targetOf} from '../platform/model';
import type {BriefData} from '../briefing/model';
import type {DxInput} from './model';
const owners=(users:User[])=>new Set(users.filter(u=>u.active).map(u=>u.id));
// Severity is not stored yet, so `urgent` stays undefined and the 긴급 indicator reports 기준 미확정.
const issue=(a:FieldAction)=>({id:a.id,targetId:targetOf(a),siteId:a.siteId,visitId:a.visitId,ownerId:a.ownerId,type:a.type,content:a.content,state:a.state,dueDate:a.dueDate,createdDate:a.createdDate||null,completedDate:a.completedDate});
const visit=(v:FieldVisit)=>({id:v.id,targetId:targetOf(v),siteId:v.siteId,visitorId:v.visitorId,plannedDate:v.plannedDate,actualDate:v.actualDate,status:v.status,purpose:v.purpose});
const target=(t:Target)=>({id:t.id,type:t.type,siteId:t.siteId,name:t.name,siteName:t.siteName});
export function scopeInput(data:PlatformData,scope:Target[]):DxInput{const ids=new Set(scope.map(t=>t.id));return{targets:scope.map(target),issues:data.actions.filter(a=>ids.has(targetOf(a))).map(issue),visits:data.visits.filter(v=>ids.has(targetOf(v))).map(visit),owners:owners(data.users)}}
export function briefInput(brief:BriefData,users:User[]):DxInput{return{targets:brief.targets.map(t=>({id:t.id,type:t.type,siteId:t.siteId,name:t.name,siteName:t.siteName})),issues:brief.issues.map(a=>({id:a.id,targetId:a.targetId,siteId:a.siteId,visitId:a.visitId,ownerId:a.ownerId,type:a.type,content:a.content,state:a.state,dueDate:a.dueDate,createdDate:a.createdDate,completedDate:a.completedDate})),visits:brief.visits.map(v=>({id:v.id,targetId:v.targetId,siteId:v.siteId,visitorId:v.visitorId,plannedDate:v.plannedDate,actualDate:v.actualDate,status:v.status,purpose:v.purpose})),owners:owners(users)}}
