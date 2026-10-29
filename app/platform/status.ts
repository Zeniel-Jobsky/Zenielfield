// 화면 공통 현황: 방문 코치·대시보드 브리핑·현황표·주차별 브리핑·독려 안내가 같은 사실과 같은 판정을 읽는다.
// 코드는 사실만 계산하고(필요 회차·조치 기한·마지막 방문일), 상태 이름과 순서는 저장된 종합 판정에서만 온다(DC-JUDGMENT).
import {daysBetween} from '../lib/date';
import {dayShift,weekOf,lastTargetVisit,targetOf,type FieldAction,type FieldVisit,type Occurrence,type Target} from './model';
import {isCurrentJudgment,type VisitJudgment} from './judgment';

export const LEVEL_ORDER:Record<string,number>={위험:2,주의:1};
export type TargetFacts={target:Target;judgment:VisitJudgment|null;judgedAt:string|null;delayed:Occurrence[];unplanned:Occurrence[];openActions:number;lateActions:number;firstDue:string|null;lastVisit:string|null;upcoming:string|null};

// 판정 색인: 현재 형식 판정이 붙은 완료 방문을 대상별로 실제 방문일 오름차순으로 한 번만 묶는다.
// "최근 판정"·"그날 기준 판정"은 모두 이 색인으로 찾는다(화면마다 다시 거르고 정렬하지 않는다).
export type JudgedIndex={byTarget:Map<string,FieldVisit[]>;byId:Map<string,FieldVisit>};
const judgedCache=new WeakMap<FieldVisit[],JudgedIndex>();
export function judgedIndex(visits:FieldVisit[]):JudgedIndex{
 const hit=judgedCache.get(visits);if(hit)return hit;
 const byTarget=new Map<string,FieldVisit[]>(),byId=new Map<string,FieldVisit>();
 for(const v of visits){if(v.status!=='completed'||!isCurrentJudgment(v.judgment))continue;byId.set(v.id,v);const id=targetOf(v),a=byTarget.get(id);if(a)a.push(v);else byTarget.set(id,[v])}
 for(const a of byTarget.values())a.sort((x,y)=>(x.actualDate||'').localeCompare(y.actualDate||''));
 const ix={byTarget,byId};judgedCache.set(visits,ix);return ix;
}
// 그 대상의 판정: visitId가 판정된 방문이면 그 방문, 아니면 asOf(없으면 전체) 이전 가장 최근 판정
export function judgmentAt(ix:JudgedIndex,targetId:string,asOf?:string|null,visitId?:string|null):FieldVisit|undefined{
 const own=visitId?ix.byId.get(visitId):undefined;if(own)return own;
 const a=ix.byTarget.get(targetId);if(!a)return undefined;if(!asOf)return a[a.length-1];
 for(let i=a.length-1;i>=0;i--)if((a[i].actualDate||'')<=asOf)return a[i];return undefined;
}
// 대상별 가장 최근 판정이 붙은 완료 방문
export function latestJudgments(visits:FieldVisit[],ids?:Set<string>){
 const last=new Map<string,FieldVisit>();for(const [id,a] of judgedIndex(visits).byTarget)if(!ids||ids.has(id))last.set(id,a[a.length-1]);return last;
}

// 대상별 사실 묶음. slots는 aggregate()의 회차(같은 기간 계산을 화면마다 다시 하지 않는다).
export function targetFacts(targets:Target[],visits:FieldVisit[],actions:FieldAction[],slots:Occurrence[],now:string):Map<string,TargetFacts>{
 const ids=new Set(targets.map(t=>t.id)),judged=latestJudgments(visits,ids),out=new Map<string,TargetFacts>();
 for(const t of targets){const j=judged.get(t.id);out.set(t.id,{target:t,judgment:j?.judgment||null,judgedAt:j?.actualDate||null,delayed:[],unplanned:[],openActions:0,lateActions:0,firstDue:null,lastVisit:lastTargetVisit(t.id,visits),upcoming:null})}
 // 오늘 이후로 잡힌 방문 일정(가장 이른 날)
 for(const v of visits){if(v.status!=='planned'||!v.plannedDate||v.plannedDate<now)continue;const f=out.get(targetOf(v));if(f&&(!f.upcoming||v.plannedDate<f.upcoming))f.upcoming=v.plannedDate}
 const due=(f:TargetFacts,d:string)=>{if(!f.firstDue||d<f.firstDue)f.firstDue=d};
 for(const s of slots){const f=out.get(s.targetId);if(!f)continue;if(s.state==='delayed'){f.delayed.push(s);due(f,s.dueDate)}else if(s.state==='unplanned'&&s.windowStart<=dayShift(now,14)){f.unplanned.push(s);due(f,s.dueDate)}}
 for(const a of actions){const f=out.get(targetOf(a));if(!f||a.state==='완료')continue;f.openActions++;if(a.dueDate<now){f.lateActions++;due(f,a.dueDate)}}
 return out;
}

// 먼저 볼 곳: 판정 위험·주의, 또는 기한 지난·일정 없는 필요 회차, 기한 넘긴 조치가 있는 운영 중 대상.
// 이미 다가오는 일정이 잡힌 대상은 판정 위험·주의가 아니면 뺀다(할 일이 이미 정해짐).
// 순서는 저장된 판정 수준 → 가장 이른 기한 날짜(점수·임계값 없음).
export function attentionOf(facts:Iterable<TargetFacts>){
 return [...facts].filter(f=>f.target.status==='운영 중'&&((f.judgment&&LEVEL_ORDER[f.judgment.level])||!f.upcoming&&(f.delayed.length||f.unplanned.length||f.lateActions)))
  .sort((a,b)=>(LEVEL_ORDER[b.judgment?.level||'']||0)-(LEVEL_ORDER[a.judgment?.level||'']||0)||(a.firstDue||'9999').localeCompare(b.firstDue||'9999'));
}


// 장기 미방문 기준(일). 지표·차트·브리핑·목록이 같은 값을 쓴다.
export const STALE_DAYS=60;
// 운영 중 매장 중 기준일까지 STALE_DAYS일 넘게 방문이 없거나 방문 기록이 없는 곳(days=null)
export function staleStores(targets:Target[],visits:FieldVisit[],asOf:string){
 return targets.filter(t=>t.type==='store'&&t.status==='운영 중').map(t=>({target:t,days:daysBetween(lastTargetVisit(t.id,visits),asOf)})).filter(x=>x.days===null||x.days>STALE_DAYS);
}
// 기준일에 기한을 넘긴 조치 수(그날 이후 완료한 조치도 그날엔 초과). ids가 있으면 그 대상만
export function overdueAt(actions:FieldAction[],day:string,ids?:Set<string>){
 let n=0;for(const a of actions)if((!ids||ids.has(targetOf(a)))&&a.dueDate<day&&(a.state!=='완료'||(a.completedDate||'')>day))n++;return n;
}
