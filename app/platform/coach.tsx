'use client';
import {useMemo} from 'react';
import {CalendarPlus,ChevronRight,PartyPopper,Footprints} from 'lucide-react';
import type {Context} from './context';
import {aggregate,dayShift,lastTargetVisit,targetOf,type Occurrence,type Target,type FieldVisit} from './model';
import {isCurrentJudgment} from './judgment';
import {rich,num,bad,good,RichText,type Rich} from './rich';
// 잡매니저 코치: 본인 담당 현장·매장의 방문 기록과 필요 회차를 보고 "어디를 먼저 갈지"를 추천하고, 독려·격려 한마디를 보여 준다.
// 판정은 하지 않는다(DC-JUDGMENT): 기록된 사실(기한 지난·일정 없는 필요 회차, 기한 넘긴 조치)과 저장된 종합 판정(주의·위험)만 보여 준다.
// 순서는 저장된 판정 수준 → 가장 이른 기한 날짜. 꾸짖지 않고 다음 행동 하나를 권한다.
export type CoachPick={target:Target;level:number;due:string;why:Rich;slot:Occurrence|null};
const LEVEL_ORDER:Record<string,number>={위험:2,주의:1};
export type CoachMessage={tone:'cheer'|'nudge';text:Rich};
const days=(from:string|null,to:string)=>from?Math.round((+new Date(to)-+new Date(from))/86400000):null;
const weekStart=(d:string)=>{const w=new Date(d+'T12:00:00Z').getUTCDay();return dayShift(d,-((w+6)%7))};
export function coachPlan(c:Context){
 const mine=c.scope,now=c.now,m=aggregate(mine,c.visits,c.start,c.end,now),ids=new Set(mine.map(t=>t.id));
 const slotsBy=new Map<string,Occurrence[]>();for(const s of m.slots){const a=slotsBy.get(s.targetId)||[];a.push(s);slotsBy.set(s.targetId,a)}
 const openBy=new Map<string,number>(),lateBy=new Map<string,number>();
 for(const a of c.actions){const id=targetOf(a);if(!ids.has(id)||a.state==='완료')continue;openBy.set(id,(openBy.get(id)||0)+1);if(a.dueDate<now)lateBy.set(id,(lateBy.get(id)||0)+1)}
 const lastJudged=new Map<string,FieldVisit>();for(const v of c.visits){const id=targetOf(v);if(v.status!=='completed'||!ids.has(id)||!isCurrentJudgment(v.judgment))continue;const p=lastJudged.get(id);if(!p||(p.actualDate||'')<=(v.actualDate||''))lastJudged.set(id,v)}
 const firstLate=new Map<string,string>();for(const a of c.actions){const id=targetOf(a);if(!ids.has(id)||a.state==='완료'||a.dueDate>=now)continue;const d=firstLate.get(id);if(!d||a.dueDate<d)firstLate.set(id,a.dueDate)}
 const picks:CoachPick[]=[];
 for(const t of mine){if(t.status!=='운영 중')continue;const ss=slotsBy.get(t.id)||[],delayed=ss.find(s=>s.state==='delayed'),unplanned=ss.find(s=>s.state==='unplanned'&&s.windowStart<=dayShift(now,14)),gap=days(lastTargetVisit(t.id,c.visits),now);
  const late=lateBy.get(t.id)||0,j=lastJudged.get(t.id)?.judgment,level=j?LEVEL_ORDER[j.level]||0:0;
  if(!delayed&&!unplanned&&!late&&!level)continue;
  const due=[delayed?.dueDate,unplanned?.dueDate,firstLate.get(t.id)].filter(Boolean).sort()[0]||'9999-12-31';
  const why=[delayed&&rich`필요 방문 ${bad((days(delayed.dueDate,now)||0)>0?`기한 ${days(delayed.dueDate,now)}일 지남`:"오늘이 기한")}`,!delayed&&unplanned&&rich`${num(unplanned.dueDate.slice(5).replace('-','.'))}까지 방문 필요, 일정 없음`,late>0&&rich`기한 넘긴 조치 ${bad(late+'건')}`,level>0&&rich`지난 방문 판정 ${bad(j!.level)}${j!.assessment?' — '+j!.assessment:''}`,gap===null?rich`방문 기록 없음`:rich`마지막 방문 ${num(gap+'일')} 전`].filter(Boolean) as Rich[];
  picks.push({target:t,level,due,why:why.flatMap((w,i)=>i?[{v:' · '},...w]:w),slot:delayed||unplanned||null})}
 picks.sort((a,b)=>b.level-a.level||a.due.localeCompare(b.due));
 // 독려·격려 문장: 잘한 점을 먼저, 그다음 지금 할 한 가지
 const wk=weekStart(now),prevWk=dayShift(wk,-7),done=(a:string,b:string)=>c.visits.filter(v=>v.visitorId===c.me.id&&v.status==='completed'&&v.actualDate&&v.actualDate>=a&&v.actualDate<=b).length;
 const thisWeek=done(wk,now),lastWeek=done(prevWk,dayShift(wk,-1)),unplanned=m.slots.filter(s=>s.state==='unplanned').length,delayed=m.delayed;
 const noResult=c.visits.filter(v=>v.visitorId===c.me.id&&v.status==='planned'&&v.plannedDate&&v.plannedDate<now).length;
 const ifPlanned=m.required?Math.round((m.completed+m.planned+unplanned)/m.required*100):null;
 const msgs:CoachMessage[]=[];
 if(thisWeek>lastWeek&&thisWeek>0)msgs.push({tone:'cheer',text:rich`이번 주 벌써 ${good(thisWeek+'곳')} 다녀오셨어요. 지난주(${num(lastWeek+'곳')})보다 ${good('많습니다')}. 좋은 흐름이에요!`});
 else if(thisWeek>0)msgs.push({tone:'cheer',text:rich`이번 주 ${good(thisWeek+'곳')} 방문을 마쳤어요. 꾸준히 잘하고 계세요.`});
 if(m.required>0&&!delayed&&!unplanned)msgs.push({tone:'cheer',text:rich`이번 기간 필요 방문 ${num(m.required+'회')}이 모두 ${good('완료 또는 일정 확정')}이에요.`});
 if(unplanned>0)msgs.push({tone:'nudge',text:rich`아직 일정이 없는 필요 방문이 ${bad(unplanned+'건')} 있어요. 지금 일정만 잡아 두어도 이행 예정이 ${num((ifPlanned??0)+'%')}까지 올라갑니다.`});
 if(delayed>0)msgs.push({tone:'nudge',text:rich`날짜가 지난 방문 ${bad(delayed+'건')}은 이번 주 안에 다시 잡아 주세요. 아래 추천 순서대로 가면 가장 빨리 따라잡을 수 있어요.`});
 if(noResult>0)msgs.push({tone:'nudge',text:rich`다녀오고 결과를 못 남긴 방문이 ${bad(noResult+'건')} 있어요. 기억이 생생할 때 한 줄이라도 남겨 주세요.`});
 if(!msgs.length)msgs.push({tone:'cheer',text:rich`지금은 밀린 일이 없어요. 오랜만에 들를 만한 곳을 아래에서 골라 보세요.`});
 return {picks:picks.slice(0,4),msgs,thisWeek,lastWeek};
}
export function ManagerCoach({c}:{c:Context}){
 const p=useMemo(()=>coachPlan(c),[c.scope,c.visits,c.actions,c.start,c.end,c.now,c.me.id]);
 const plan=(x:CoachPick)=>{const t=x.target,s=x.slot;c.open('visit',undefined,s?{targetType:t.type,siteId:t.siteId,storeId:t.storeId,date:s.dueDate<c.now?c.now:s.windowStart>c.now?s.windowStart:c.now,requirementId:s.id,dueDate:s.dueDate}:{targetType:t.type,siteId:t.siteId,storeId:t.storeId})};
 return <section className="panel coach" aria-label="오늘의 방문 코치">
  <ul className="coach-msgs">{p.msgs.slice(0,4).map((m,i)=><li key={i} className={m.tone}>{m.tone==='cheer'?<PartyPopper size={16}/>:<Footprints size={16}/>}<span><RichText r={m.text}/></span></li>)}</ul>
  {p.picks.length>0&&<><h3>먼저 가 보면 좋은 곳</h3><ol className="coach-picks">{p.picks.map(x=><li key={x.target.id}><button type="button" className="link" onClick={()=>c.showTarget(x.target.id)}>{x.target.name}<ChevronRight size={12}/></button><span><RichText r={x.why}/></span>{c.editable&&<button type="button" className="btn small" onClick={()=>plan(x)}><CalendarPlus size={14}/>일정 잡기</button>}</li>)}</ol></>}
 </section>;
}
