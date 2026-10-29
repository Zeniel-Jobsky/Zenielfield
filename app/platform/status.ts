// 화면 공통 현황: 방문 코치·대시보드 브리핑·현황표·주차별 브리핑·독려 안내가 같은 사실과 같은 판정을 읽는다.
// 코드는 사실만 계산하고(필요 회차·조치 기한·마지막 방문일), 상태 이름과 순서는 저장된 종합 판정에서만 온다(DC-JUDGMENT).
import {dayShift,lastTargetVisit,targetOf,type FieldAction,type FieldVisit,type Occurrence,type Target} from './model';
import {isCurrentJudgment,type VisitJudgment} from './judgment';

export const LEVEL_ORDER:Record<string,number>={위험:2,주의:1};
export type TargetFacts={target:Target;judgment:VisitJudgment|null;judgedAt:string|null;delayed:Occurrence[];unplanned:Occurrence[];openActions:number;lateActions:number;firstDue:string|null;lastVisit:string|null;upcoming:string|null};

// 대상별 가장 최근 판정이 붙은 완료 방문
export function latestJudgments(visits:FieldVisit[],ids?:Set<string>){
 const last=new Map<string,FieldVisit>();
 for(const v of visits){const id=targetOf(v);if(v.status!=='completed'||(ids&&!ids.has(id))||!isCurrentJudgment(v.judgment))continue;const p=last.get(id);if(!p||(p.actualDate||'')<=(v.actualDate||''))last.set(id,v)}
 return last;
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

// 본인 방문 흐름(주 단위 완료 수): 독려 문장은 다른 사람과 비교하지 않고 본인 지난주와만 비교한다.
export const weekStart=(d:string)=>{const w=new Date(d+'T12:00:00Z').getUTCDay();return dayShift(d,-((w+6)%7))};
export function selfWeeks(visits:FieldVisit[],userId:string,now:string){
 const wk=weekStart(now),prev=dayShift(wk,-7),done=(a:string,b:string)=>visits.filter(v=>v.visitorId===userId&&v.status==='completed'&&!!v.actualDate&&v.actualDate>=a&&v.actualDate<=b).length;
 return {thisWeek:done(wk,now),lastWeek:done(prev,dayShift(wk,-1))};
}
