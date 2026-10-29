'use client';
// 일정 잡기 전 내 일정 확인: 이번 주·다음 주 2주에 방문자 본인의 잡힌 방문(시간·대상)을 날짜별로 보여 준다.
// 날짜를 누르면 그 날짜를 AI 입력에 먼저 넣어, 비어 있는 날에 맞춰 일정을 말하게 한다. 필요 회차의 인정 기간은 테두리로 표시.
import {useMemo} from 'react';
import type {Context} from './context';
import {dayShift,weekOf,mmdd,between} from '../lib/date';
import {targetOf} from './model';

const DOW=['월','화','수','목','금','토','일'];
export function MySchedule({c,visitor,window,picked,onPick}:{c:Context;visitor:string;window?:{start:string;end:string}|null;picked:string;onPick:(day:string)=>void}){
 const start=weekOf(c.now),days=Array.from({length:14},(_,i)=>dayShift(start,i));
 const byDay=useMemo(()=>{const m=new Map<string,{time:string;name:string}[]>();for(const v of c.visits){if(v.visitorId!==visitor||v.status!=='planned'||!v.plannedDate||v.plannedDate<start||v.plannedDate>days[13])continue;const a=m.get(v.plannedDate)||[];a.push({time:v.time||'',name:c.target(targetOf(v))?.name||''});m.set(v.plannedDate,a)}for(const a of m.values())a.sort((x,y)=>(x.time||'99').localeCompare(y.time||'99'));return m},[c.visits,visitor,start]);
 return <div className="my-schedule wide" role="group" aria-label="내 방문 일정 2주">
  {[0,1].map(w=><div key={w} className="my-week"><span className="my-week-label">{w?'다음 주':'이번 주'}</span><div className="my-days">{days.slice(w*7,w*7+7).map((d,i)=>{const items=byDay.get(d)||[],past=d<c.now,inWin=!!window&&between(d,window.start,window.end);
   return <button type="button" key={d} disabled={past} className={'my-day'+(d===c.now?' today':'')+(d===picked?' on':'')+(inWin?' window':'')+(items.length?' busy':'')} aria-pressed={d===picked} title={items.map(x=>`${x.time||'시간 미정'} ${x.name}`).join(', ')||undefined} aria-label={`${mmdd(d)}(${DOW[i]}) ${items.length?'방문 '+items.length+'건: '+items.map(x=>`${x.time||'시간 미정'} ${x.name}`).join(', '):'비어 있음'}${inWin?' · 필요 회차 기간':''}`} onClick={()=>onPick(d)}>
    <b><span className="md-full">{DOW[i]} {mmdd(d)}</span><span className="md-short">{DOW[i]} {Number(d.slice(8))}</span></b>{items.length?<><small className="times">{items.slice(0,3).map(x=>x.time||'미정').join(' · ')}{items.length>3?' …':''}</small><small className="count">{items.length}건</small></>:<small className="free">{past?'':'비어 있음'}</small>}
   </button>})}</div></div>)}
  <p className="form-hint">날짜를 누르면 AI 입력에 먼저 들어갑니다.{window?' 테두리는 이번 필요 회차 기간입니다.':''}</p>
 </div>;
}
