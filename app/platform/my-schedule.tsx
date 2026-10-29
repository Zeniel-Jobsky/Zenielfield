'use client';
// 일정 잡기 전 빈 날 확인: 오늘부터 7일을 칩 한 줄로(날짜 + 내 방문 n건 / 비어 있음). 누르면 그 날짜를 AI 입력에 먼저 넣는다.
// 필요 회차 기간 안의 날은 딥그린 테두리. 방문 목록 전체는 방문 일정 화면의 달력에서 본다(여기서 반복하지 않는다).
import {useMemo} from 'react';
import type {Context} from './context';
import {dayShift,mmdd,between} from '../lib/date';

const DOW=['일','월','화','수','목','금','토'];
const dowOf=(d:string)=>DOW[new Date(d+'T12:00:00Z').getUTCDay()];
export function MySchedule({c,visitor,window,picked,onPick}:{c:Context;visitor:string;window?:{start:string;end:string}|null;picked:string;onPick:(day:string)=>void}){
 const days=Array.from({length:7},(_,i)=>dayShift(c.now,i));
 const count=useMemo(()=>{const m=new Map<string,number>();for(const v of c.visits)if(v.visitorId===visitor&&v.status==='planned'&&v.plannedDate&&v.plannedDate>=days[0]&&v.plannedDate<=days[6])m.set(v.plannedDate,(m.get(v.plannedDate)||0)+1);return m},[c.visits,visitor,days[0]]);
 return <div className="my-days wide" role="group" aria-label="앞으로 7일 내 방문 일정">{days.map(d=>{const n=count.get(d)||0,inWin=!!window&&between(d,window.start,window.end);
  return <button type="button" key={d} className={'my-day'+(d===picked?' on':'')+(inWin?' window':'')+(n?' busy':'')} aria-pressed={d===picked} aria-label={`${mmdd(d)}(${dowOf(d)}) ${n?'방문 '+n+'건':'비어 있음'}${inWin?' · 필요 회차 기간':''}`} onClick={()=>onPick(d)}>
   <b>{d===c.now?'오늘':dowOf(d)} {mmdd(d)}</b><small>{n?n+'건':'비어 있음'}</small></button>})}</div>;
}
