import {dayShift,between,weekOf} from '../lib/date';
import type {Site,User,Visit,Action,Audit} from '../lib/model';
import type {VisitJudgment} from './judgment';
export type TargetType='site'|'store';
export type Rule={period:'week'|'month'|'manual';count:number};
export type Geo={lat:number;lng:number};
// 필요 시(rule.period='manual') 근거: 사유 코드와 지정자·지정일·재검토일(서버가 붙임). 근거가 없으면 정기 의무를 면제하지 않는다.
export const MANUAL_REASONS=['고객사 요청 시에만 방문','상주 인력이 별도 관리','계약상 방문 의무 없음','운영 축소·종료 예정','기타'] as const;
export type ManualBasis={reason:typeof MANUAL_REASONS[number];note:string;by:string;at:string;review:string};
// 배정 이력: 회차를 그 시점 담당자에게 귀속한다. end=null이면 현재 담당.
export type Assignment={targetType:TargetType;siteId:string;storeId:string|null;targetId:string;userId:string;start:string;end:string|null};
export type FieldSite=Site&{division:string;region:string;managerIds:string[];rule:Rule;manual?:ManualBasis|null;lat?:number|null;lng?:number|null};
export type Store={id:string;siteId:string;code:string;name:string;address:string;region:string;managerIds:string[];status:string;startDate:string;rule:Rule;manual?:ManualBasis|null;version:number;lat?:number|null;lng?:number|null};
export const aiFields=['purpose','detail','notes','result'] as const;export type AiField=typeof aiFields[number];
export const aiConfidences=['low','medium','high'];
// AI 간편 등록 기록: 원문(input)·AI 초안(draft)·사람이 고친 칸(edited)을 함께 보존. 직접 입력(entry='manual')에는 ai가 없음.
export type AiEntry={input:{text:string;imageCount:number};draft:Record<AiField,string>;summary:string;confidence:string;model:string;generatedAt:string;edited:AiField[]};
// AI 정리 기록: 이미 입력된 결과를 AI가 다듬은 제안(proposed)과 사람이 실제로 반영한 칸(applied). 직접 입력·AI 등록 기록 모두 가질 수 있으며 entry는 바뀌지 않는다.
export type AiEdit={model:string;generatedAt:string;appliedAt:string;byId:string;before:Record<AiField,string>;proposed:Record<AiField,string>;applied:AiField[]};
export type FieldVisit=Visit&{targetType:TargetType;storeId:string|null;requirementId:string|null;actualTime:string;notes:string;entry?:'manual'|'ai';ai?:AiEntry;aiEdits?:AiEdit[];geo?:VisitGeo;judgment?:VisitJudgment|null};
// 방문 시점 GPS 기록: 측정 좌표·정확도와 대상 지점까지 거리(서버 재계산).
export type VisitGeo=Geo&{accuracy:number;at:string;distance:number|null};
export const entryOf=(v:{entry?:string})=>v.entry==='ai'?'ai':'manual';
export type FieldAction=Action&{targetType:TargetType;storeId:string|null;createdDate:string};
// 관리 도메인: 멤버가 관리하는 업무 영역. 현장은 도메인 필수, 매장은 상위 현장 상속.
export type Domain={id:string;code:string;name:string;active:number;version:number};
export type PlatformData={users:User[];sites:FieldSite[];stores:Store[];visits:FieldVisit[];actions:FieldAction[];audit:Audit[];domains:Domain[];assignments?:Assignment[]};
export const managesDomain=(me:User,domain:string)=>['admin','director'].includes(me.role)||!!domain&&(me.domains||[]).includes(domain);
export const domainName=(data:{domains:Domain[]},id:string|undefined)=>data.domains.find(d=>d.id===id)?.name||'';
export type Target={id:string;type:TargetType;siteId:string;storeId:string|null;name:string;siteName:string;team:string;part:string;division:string;domain:string;region:string;address:string;managerIds:string[];rule:Rule;manual?:ManualBasis|null;status:string;startDate:string;lat:number|null;lng:number|null};
export type Requirement={id:string;targetId:string;targetType:TargetType;siteId:string;storeId:string|null;windowStart:string;windowEnd:string;dueDate:string;ordinal:number};
export type Occurrence=Requirement&{state:'completed'|'planned'|'delayed'|'unplanned';visitId:string|null;overdue:boolean};
export type Metrics={slots:Occurrence[];required:number;completed:number;planned:number;delayed:number;unplanned:number;targets:number;rate:number|null;completedTargets:number;extraCompleted:number;manualTargets:number};
export const typeName=(type:TargetType)=>type==='site'?'현장 방문':'매장 방문';
export const ruleName=(rule:Rule)=>rule.period==='manual'?'수동 관리':`${rule.period==='week'?'주':'월'} ${rule.count}회`;
export {dayShift,between,weekOf};
export const targetOf=(v:{siteId:string;targetType:TargetType;storeId:string|null})=>v.targetType==='store'?v.storeId||'missing-store':v.siteId;
export function targetsOf(data:PlatformData):Target[]{return [...data.sites.map(s=>({id:s.id,type:'site' as const,siteId:s.id,storeId:null,name:s.name,siteName:s.name,team:s.team,part:s.part,division:s.division,domain:s.domain||'',region:s.region,address:s.address,managerIds:s.managerIds,rule:s.rule,manual:s.manual??null,status:s.status,startDate:s.startDate,lat:s.lat??null,lng:s.lng??null})),...data.stores.map(s=>{const p=data.sites.find(p=>p.id===s.siteId)!;return{id:s.id,type:'store' as const,siteId:s.siteId,storeId:s.id,name:s.name,siteName:p?.name||'미연결 현장',team:p?.team||'',part:p?.part||'',division:p?.division||'',domain:p?.domain||'',region:s.region,address:s.address,managerIds:s.managerIds,rule:s.rule,manual:s.manual??null,status:s.status,startDate:s.startDate,lat:s.lat??null,lng:s.lng??null}})]}
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
// 대상별 최근 완료 방문일: 방문 배열마다 한 번만 색인을 만든다(대상 수 × 방문 수 반복 제거). 배열이 바뀌면 새로 만든다.
const lastVisitIndex=new WeakMap<FieldVisit[],Map<string,string>>();
export function lastTargetVisit(targetId:string,visits:FieldVisit[]){let idx=lastVisitIndex.get(visits);if(!idx){idx=new Map();for(const v of visits){if(v.status!=='completed'||!v.actualDate)continue;const k=targetOf(v),cur=idx.get(k);if(!cur||v.actualDate>cur)idx.set(k,v.actualDate)}lastVisitIndex.set(visits,idx)}return idx.get(targetId)||null}
const slotIndex=new WeakMap<Metrics,Map<string,Occurrence[]>>();
const slotsOf=(m:Metrics,id:string)=>{let idx=slotIndex.get(m);if(!idx){idx=new Map();for(const s of m.slots){const a=idx.get(s.targetId);if(a)a.push(s);else idx.set(s.targetId,[s])}slotIndex.set(m,idx)}return idx.get(id)||[]};
// 회차·대상 상태 이름표: 화면마다 따로 쓰지 않고 여기서 가져간다. 판정 단어(정상 등)는 쓰지 않는다(DC-JUDGMENT).
export const SLOT_LABEL={completed:'방문 완료',planned:'방문 예정',delayed:'방문 지연',unplanned:'계획 미등록'} as const;
export const SLOT_SHORT={completed:'완료',planned:'예정',delayed:'지연',unplanned:'계획 미등록'} as const;
export const NO_HISTORY='이력 미확인',NO_REQUIRED='필요 방문 없음';
export function targetStatus(t:Target,visits:FieldVisit[],metrics:Metrics){if(t.status!=='운영 중')return t.status;const slots=slotsOf(metrics,t.id);if(slots.some(s=>s.state==='delayed'))return SLOT_LABEL.delayed;if(slots.some(s=>s.state==='unplanned'))return SLOT_LABEL.unplanned;if(slots.some(s=>s.state==='planned'))return SLOT_LABEL.planned;if(slots.length&&slots.every(s=>s.state==='completed'))return SLOT_LABEL.completed;if(!lastTargetVisit(t.id,visits))return NO_HISTORY;return NO_REQUIRED}
export function visibleTargets(targets:Target[],me:User){if(['admin','director'].includes(me.role))return targets;const inDomain=(t:Target)=>!(me.domains||[]).length||(me.domains||[]).includes(t.domain);if(me.role==='lead')return targets.filter(t=>t.team===me.team&&inDomain(t));if(me.role==='partlead')return targets.filter(t=>t.team===me.team&&t.part===me.part&&inDomain(t));return targets.filter(t=>t.managerIds.includes(me.id)&&inDomain(t))}
export type WeekRow={start:string;required:number;completed:number;planned:number;delayed:number;unplanned:number;rate:number|null};
export function weeklyTrend(targets:Target[],visits:FieldVisit[],end:string,now:string,weeks=8):{rows:WeekRow[];slots:Occurrence[]}{const first=dayShift(weekOf(end),-7*(weeks-1)),m=aggregate(targets,visits,first,dayShift(weekOf(end),6),now);return{slots:m.slots,rows:Array.from({length:weeks},(_,i)=>{const a=dayShift(first,i*7),b=dayShift(a,6),s=m.slots.filter(x=>between(x.dueDate,a,b)),n=(k:Occurrence['state'])=>s.filter(x=>x.state===k).length;return{start:a,required:s.length,completed:n('completed'),planned:n('planned'),delayed:n('delayed'),unplanned:n('unplanned'),rate:s.length?Math.round(n('completed')/s.length*100):null}})}}
export function agingBuckets(actions:FieldAction[],now:string){const late=actions.filter(a=>a.state!=='완료'&&!!a.dueDate&&a.dueDate<now).map(a=>Math.round((+new Date(now)-+new Date(a.dueDate))/86400000));return [{label:'0–7일',value:late.filter(d=>d<=7).length},{label:'8–30일',value:late.filter(d=>d>7&&d<=30).length},{label:'30일 초과',value:late.filter(d=>d>30).length}]}
export const validGeo=(g:any):g is Geo=>!!g&&typeof g.lat==='number'&&typeof g.lng==='number'&&Number.isFinite(g.lat)&&Number.isFinite(g.lng)&&Math.abs(g.lat)<=90&&Math.abs(g.lng)<=180;
export function distanceM(a:Geo,b:Geo){const r=Math.PI/180,x=Math.sin((b.lat-a.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lng-a.lng)*r/2)**2;return Math.round(12742000*Math.asin(Math.sqrt(x)))}
export const autoPickMeters=300;
export function nearestTargets(targets:Target[],at:Geo,limit=3){return targets.flatMap(t=>t.status==='운영 중'&&t.lat!==null&&t.lng!==null?[{target:t,distance:distanceM(at,{lat:t.lat,lng:t.lng})}]:[]).sort((a,b)=>a.distance-b.distance).slice(0,limit)}
