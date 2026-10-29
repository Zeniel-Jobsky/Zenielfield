'use client';
import {daysBetween as days,mmdd} from '../lib/date';
import {useMemo} from 'react';
import {CalendarPlus,ChevronRight} from 'lucide-react';
import type {Context} from './context';
import {aggregate,type Occurrence,type Target} from './model';
import {targetFacts,attentionOf,LEVEL_ORDER} from './status';
import {NudgeCard} from './nudge-view';
import {buildNudge} from './nudge';
import {rich,num,bad,good,RichText,type Rich} from './rich';
// 잡매니저 코치: 본인 담당 현장·매장의 방문 기록과 필요 회차를 보고 "어디를 먼저 갈지"를 추천하고, 독려·격려 한마디를 보여 준다.
// 판정은 하지 않는다(DC-JUDGMENT): 기록된 사실(기한 지난·일정 없는 필요 회차, 기한 넘긴 조치)과 저장된 종합 판정(주의·위험)만 보여 준다.
// 순서는 저장된 판정 수준 → 가장 이른 기한 날짜. 꾸짖지 않고 다음 행동 하나를 권한다.
export type CoachPick={target:Target;why:Rich;slot:Occurrence|null};
export function coachPlan(c:Context){
 const mine=c.scope,now=c.now,m=aggregate(mine,c.visits,c.start,c.end,now);
 // 대상·순서는 공통 현황(status.ts)과 같다: 대시보드·현황표와 같은 곳을 같은 이유로 보여 준다.
 const picks:CoachPick[]=attentionOf(targetFacts(mine,c.visits,c.actions,m.slots,now).values()).map(f=>{const delayed=f.delayed[0],unplanned=f.unplanned[0],j=f.judgment,gap=days(f.lastVisit,now);
  const why=[delayed&&rich`필요 방문 ${bad((days(delayed.dueDate,now)||0)>0?`기한 ${days(delayed.dueDate,now)}일 지남`:"오늘이 기한")}`,!delayed&&unplanned&&rich`${num(mmdd(unplanned.dueDate))}까지 방문 필요, 일정 없음`,f.lateActions>0&&rich`기한 넘긴 조치 ${bad(f.lateActions+'건')}`,j&&LEVEL_ORDER[j.level]&&rich`지난 방문 판정 ${bad(j.level)}${j.assessment?' — '+j.assessment:''}`,gap===null?rich`방문 기록 없음`:rich`마지막 방문 ${num(gap+'일')} 전`].filter(Boolean) as Rich[];
  return {target:f.target,why:why.flatMap((w,i)=>i?[{v:' · '},...w]:w),slot:delayed||unplanned||null}});
 return {picks:picks.slice(0,4)};
}
export function ManagerCoach({c}:{c:Context}){
 const p=useMemo(()=>coachPlan(c),[c.scope,c.visits,c.actions,c.start,c.end,c.now,c.me.id]);
 // 인정 기간이 이미 지난 회차는 그 회차로 채울 수 없으므로 대상만 채워 연다
 const plan=(x:CoachPick)=>{const t=x.target,s=x.slot&&x.slot.windowEnd>=c.now?x.slot:null;c.open('visit',undefined,s?{targetType:t.type,siteId:t.siteId,storeId:t.storeId,date:s.dueDate<c.now?c.now:s.windowStart>c.now?s.windowStart:c.now,requirementId:s.id,dueDate:s.dueDate}:{targetType:t.type,siteId:t.siteId,storeId:t.storeId})};
 return <section className="panel coach" aria-label="오늘의 방문 코치">
   {/* 숫자·제목은 독려 안내와 같은 내용(nudge.ts) 하나만 쓴다: 다음 방문은 아래 목록이 맡으므로 뺀다 */}
  <NudgeCard n={{...buildNudge(c),next:null}} c={c}/>
  {p.picks.length>0&&<><h3>먼저 가 보면 좋은 곳</h3><ol className="coach-picks">{p.picks.map(x=><li key={x.target.id}><button type="button" className="link" onClick={()=>c.showTarget(x.target.id)}>{x.target.name}<ChevronRight size={14}/></button><span><RichText r={x.why}/></span>{c.editable&&<button type="button" className="btn small" onClick={()=>plan(x)}><CalendarPlus size={14}/>일정 잡기</button>}</li>)}</ol></>}
 </section>;
}
