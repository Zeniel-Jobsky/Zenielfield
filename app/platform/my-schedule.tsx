'use client';
// 일정 잡기 전 빈 날 확인: 오늘부터 7일을 칩 한 줄로(날짜 + 내 방문 n건 / 비어 있음). 누르면 그 날짜를 AI 입력에 먼저 넣는다.
// 필요 회차 기간 안의 날은 딥그린 테두리. 방문 목록 전체는 방문 일정 화면의 달력에서 본다(여기서 반복하지 않는다).
import {useMemo} from 'react';
import type {Context} from './context';
import {dayShift,mmdd,between,daysBetween,kstToday,kstTime} from '../lib/date';
import type {Target} from './model';
import {scheduleFacts,scheduleCandidates} from './schedule';

const DOW=['일','월','화','수','목','금','토'];
const dowOf=(d:string)=>DOW[new Date(d+'T12:00:00Z').getUTCDay()];
export function MySchedule({c,visitor,window,picked,onPick}:{c:Context;visitor:string;window?:{start:string;end:string}|null;picked:string;onPick:(day:string)=>void}){
 const days=Array.from({length:7},(_,i)=>dayShift(c.now,i));
 const count=useMemo(()=>{const m=new Map<string,number>();for(const v of c.visits)if(v.visitorId===visitor&&v.status==='planned'&&v.plannedDate&&v.plannedDate>=days[0]&&v.plannedDate<=days[6])m.set(v.plannedDate,(m.get(v.plannedDate)||0)+1);return m},[c.visits,visitor,days[0]]);
 return <div className="my-days wide" role="group" aria-label="앞으로 7일 내 방문 일정">{days.map(d=>{const n=count.get(d)||0,inWin=!!window&&between(d,window.start,window.end);
  return <button type="button" key={d} className={'my-day'+(d===picked?' on':'')+(inWin?' window':'')+(n?' busy':'')} aria-pressed={d===picked} aria-label={`${mmdd(d)}(${dowOf(d)}) ${n?'방문 '+n+'건':'비어 있음'}${inWin?' · 필요 회차 기간':''}`} onClick={()=>onPick(d)}>
   <b>{d===c.now?'오늘':dowOf(d)} {mmdd(d)}</b><small>{n?n+'건':'비어 있음'}</small></button>})}</div>;
}

// 대상이 정해진 뒤: 미리 찾은 사실 한 줄 + 후보 날짜 칩(날짜순, 사실 꼬리표). 누르면 날짜·시간을 바로 채운다.
export function ScheduleHints({c,target,visitor,picked,onPick}:{c:Context;target:Target;visitor:string;picked:string;onPick:(date:string,time:string,requirementId:string|null)=>void}){
 const facts=useMemo(()=>scheduleFacts(target,c.visits,c.now),[target,c.visits,c.now]);
 const index=useMemo(()=>new Map(c.targets.map(t=>[t.id,t])),[c.targets]);
 const list=useMemo(()=>scheduleCandidates(target,index,c.visits,visitor,c.now,facts,5,c.now===kstToday()?kstTime():'00:00'),[target,index,c.visits,visitor,c.now,facts]);
 const w=facts.window,left=w?daysBetween(c.now,w.end):null;
 return <div className="schedule-hints wide">
  <p className="schedule-facts">{w?<span>필요 방문 <b>{mmdd(w.end)}까지</b>{left!==null&&left>=0?` (${left}일 남음)`:''}</span>:<span>정해진 필요 회차 없음 · 앞으로 2주에서 찾았어요</span>}
   <span>마지막 방문 <b>{facts.lastVisit?mmdd(facts.lastVisit):'기록 없음'}</b></span>
   {facts.usualTime&&<span>주로 <b>{facts.usualTime.time}</b> ({facts.usualTime.n}회)</span>}
   {facts.planned.length>0&&<span className="warn">이미 잡힌 일정 <b>{facts.planned.map(mmdd).join(', ')}</b></span>}</p>
  {list.length?<div className="my-days" role="group" aria-label="추천 날짜">{list.map(x=><button type="button" key={x.date} className={'my-day cand'+(x.date===picked?' on':'')+(w&&between(x.date,w.start,w.end)?' window':'')} aria-pressed={x.date===picked} aria-label={`${mmdd(x.date)}(${dowOf(x.date)}) ${x.time||'시간 미정'} · ${x.tags.join(', ')} — 이 날짜로 채우기`} onClick={()=>onPick(x.date,x.time,w&&between(x.date,w.start,w.end)?w.id:null)}>
   <b>{x.date===c.now?'오늘':dowOf(x.date)} {mmdd(x.date)}{x.time&&<span> {x.time}</span>}</b><small>{x.tags.join(' · ')}</small></button>)}</div>
   :<p className="form-hint">기간 안에 빈 날이 없어요. 아래에서 날짜를 말하거나 직접 입력해 주세요.</p>}
 </div>;
}
