import type {Site,User,Visit,Action,Audit} from '../lib/model';
export type TargetType='site'|'store';
export type Rule={period:'week'|'month'|'manual';count:number};
export type FieldSite=Site&{division:string;region:string;managerIds:string[];rule:Rule};
export type Store={id:string;siteId:string;code:string;name:string;address:string;region:string;managerIds:string[];status:string;startDate:string;rule:Rule;version:number};
export type FieldVisit=Visit&{targetType:TargetType;storeId:string|null;requirementId:string|null;actualTime:string;notes:string};
export type FieldAction=Action&{targetType:TargetType;storeId:string|null;createdDate:string};
export type PlatformData={users:User[];sites:FieldSite[];stores:Store[];visits:FieldVisit[];actions:FieldAction[];audit:Audit[]};
export type Target={id:string;type:TargetType;siteId:string;storeId:string|null;name:string;siteName:string;team:string;part:string;division:string;region:string;address:string;managerIds:string[];rule:Rule;status:string;startDate:string};
export type Requirement={id:string;targetId:string;targetType:TargetType;siteId:string;storeId:string|null;windowStart:string;windowEnd:string;dueDate:string;ordinal:number};
export type Occurrence=Requirement&{state:'completed'|'planned'|'delayed'|'unplanned';visitId:string|null;overdue:boolean};
export type Metrics={slots:Occurrence[];required:number;completed:number;planned:number;delayed:number;unplanned:number;targets:number;rate:number|null;completedTargets:number;extraCompleted:number;manualTargets:number};
export const typeName=(type:TargetType)=>type==='site'?'현장 방문':'매장 방문';
export const ruleName=(rule:Rule)=>rule.period==='manual'?'수동 관리':`${rule.period==='week'?'주':'월'} ${rule.count}회`;
export const dayShift=(day:string,n:number)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
export const between=(d:string|null,a:string,b:string)=>!!d&&d>=a&&d<=b;
export const targetOf=(v:{siteId:string;targetType:TargetType;storeId:string|null})=>v.targetType==='store'?v.storeId||'missing-store':v.siteId;
export function targetsOf(data:PlatformData):Target[]{return [...data.sites.map(s=>({id:s.id,type:'site' as const,siteId:s.id,storeId:null,name:s.name,siteName:s.name,team:s.team,part:s.part,division:s.division,region:s.region,address:s.address,managerIds:s.managerIds,rule:s.rule,status:s.status,startDate:s.startDate})),...data.stores.map(s=>{const p=data.sites.find(p=>p.id===s.siteId)!;return{id:s.id,type:'store' as const,siteId:s.siteId,storeId:s.id,name:s.name,siteName:p?.name||'미연결 현장',team:p?.team||'',part:p?.part||'',division:p?.division||'',region:s.region,address:s.address,managerIds:s.managerIds,rule:s.rule,status:s.status,startDate:s.startDate}})]}
export function requirements(targets:Target[],start:string,end:string):Requirement[]{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end)return [];
 const out:Requirement[]=[];
 for(const t of targets){if(t.status!=='운영 중'||t.rule.period==='manual'||!Number.isInteger(t.rule.count)||t.rule.count<1||t.rule.count>8||(t.rule.period==='week'&&t.rule.count>7))continue;
  const d=new Date(start+'T12:00:00Z');if(t.rule.period==='month')d.setUTCDate(1);else d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));
  for(let safety=0;safety<400&&d.toISOString().slice(0,10)<=end;safety++){
   const unitStart=d.toISOString().slice(0,10);const next=new Date(d);if(t.rule.period==='month')next.setUTCMonth(next.getUTCMonth()+1);else next.setUTCDate(next.getUTCDate()+7);
   const nextDay=next.toISOString().slice(0,10),length=Math.round((+next-+d)/86400000);
   for(let i=0;i<t.rule.count;i++){const a=dayShift(unitStart,Math.floor(length*i/t.rule.count)),b=dayShift(unitStart,Math.floor(length*(i+1)/t.rule.count)-1);if(b>=start&&b<=end&&b>=t.startDate)out.push({id:`req:${t.id}:${unitStart}:${i+1}`,targetId:t.id,targetType:t.type,siteId:t.siteId,storeId:t.storeId,windowStart:a<t.startDate?t.startDate:a,windowEnd:b,dueDate:b,ordinal:i+1})}
   d.setTime(+next);
  }
 }
 return out.sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.id.localeCompare(b.id));
}
export function aggregate(targets:Target[],visits:FieldVisit[],start:string,end:string,now:string):Metrics{
 const targetIds=new Set(targets.map(t=>t.id));visits=visits.filter(v=>targetIds.has(targetOf(v)));
 const req=requirements(targets,start,end),used=new Set<string>(),byTarget=new Map<string,FieldVisit[]>();for(const v of visits){const key=targetOf(v);const arr=byTarget.get(key)||[];arr.push(v);byTarget.set(key,arr)}
 const slots:Occurrence[]=req.map(r=>{const options=(byTarget.get(r.targetId)||[]).filter(v=>v.status!=='cancelled');
  const match=(v:FieldVisit)=>v.requirementId?v.requirementId===r.id:between(v.status==='completed'?v.actualDate:v.plannedDate,r.windowStart,r.windowEnd);
  const done=options.find(v=>!used.has(v.id)&&v.status==='completed'&&!!v.actualDate&&v.actualDate<=now&&match(v));
  if(done){used.add(done.id);return{...r,state:'completed',visitId:done.id,overdue:false}}
  const plan=options.find(v=>!used.has(v.id)&&v.status==='planned'&&match(v));if(plan){used.add(plan.id);const late=!!plan.plannedDate&&plan.plannedDate<now;return{...r,state:late?'delayed':'planned',visitId:plan.id,overdue:late}}
  return{...r,state:'unplanned',visitId:null,overdue:r.dueDate<now};
 });
 const completed=slots.filter(s=>s.state==='completed');return{slots,required:slots.length,completed:completed.length,planned:slots.filter(s=>s.state==='planned').length,delayed:slots.filter(s=>s.state==='delayed').length,unplanned:slots.filter(s=>s.state==='unplanned').length,targets:new Set(slots.map(s=>s.targetId)).size,rate:slots.length?Math.round(completed.length/slots.length*100):null,completedTargets:new Set(completed.map(s=>s.targetId)).size,extraCompleted:visits.filter(v=>v.status==='completed'&&!used.has(v.id)&&between(v.actualDate,start,end)).length,manualTargets:targets.filter(t=>t.status==='운영 중'&&t.rule.period==='manual').length};
}
export function lastTargetVisit(targetId:string,visits:FieldVisit[]){return visits.filter(v=>targetOf(v)===targetId&&v.status==='completed'&&v.actualDate).map(v=>v.actualDate!).sort().at(-1)||null}
export function targetStatus(t:Target,visits:FieldVisit[],metrics:Metrics){if(t.status!=='운영 중')return t.status;const slots=metrics.slots.filter(s=>s.targetId===t.id);if(slots.some(s=>s.state==='delayed'))return '방문 지연';if(slots.some(s=>s.state==='unplanned'))return '계획 미등록';if(slots.some(s=>s.state==='planned'))return '방문 예정';if(slots.length&&slots.every(s=>s.state==='completed'))return '방문 완료';if(!lastTargetVisit(t.id,visits))return '이력 미확인';return '정상 관리'}
export function visibleTargets(targets:Target[],me:User){if(['admin','director'].includes(me.role))return targets;if(me.role==='lead')return targets.filter(t=>t.team===me.team);if(me.role==='partlead')return targets.filter(t=>t.team===me.team&&t.part===me.part);return targets.filter(t=>t.managerIds.includes(me.id))}
