import type {PlatformData,Target} from '../platform/model';
import {targetOf} from '../platform/model';
import type {BriefData} from './model';
import {filterBriefData,kstDay} from './model';
export function platformBriefData(data:PlatformData,targets:Target[],manager='',search=''):BriefData{const ids=new Set(targets.map(t=>t.id)),name=(id:string)=>data.users.find(u=>u.id===id)?.name||'미확인';const visits=data.visits.filter(v=>ids.has(targetOf(v))&&(!manager||v.visitorId===manager)).map(v=>({...v,targetId:targetOf(v),visitorName:name(v.visitorId)}));const visitIds=new Set(visits.map(v=>v.id));const issues=data.actions.filter(a=>ids.has(targetOf(a))&&(!manager||a.ownerId===manager||!!a.visitId&&visitIds.has(a.visitId))).map(a=>({...a,targetId:targetOf(a),ownerName:name(a.ownerId),createdDate:a.createdDate||null}));return filterBriefData({targets:targets.map(t=>({id:t.id,siteId:t.siteId,siteName:t.siteName,name:t.name,type:t.type})),visits,issues},'all',search)}
