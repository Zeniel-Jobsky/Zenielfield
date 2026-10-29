'use client';
// 조회 기간 선택(지침 7절): [◀ 기간 이름 ▶]. 화살표는 지금 단위(하루·주·달·같은 길이)만큼 앞뒤로 옮기고,
// 가운데를 누르면 자주 쓰는 기간을 한 번에 고르는 창이 열린다. 날짜 두 칸은 '직접 선택'에서만 보인다.
import {useEffect,useId,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,ChevronDown,Check} from 'lucide-react';
import {dayShift,daysBetween,weekRange,monthRange,mmdd} from '../lib/date';

const DOW=['일','월','화','수','목','금','토'];
const dow=(d:string)=>DOW[new Date(d+'T12:00:00Z').getUTCDay()];
const monthShift=(d:string,n:number)=>{const x=new Date(d.slice(0,8)+'01T12:00:00Z');x.setUTCMonth(x.getUTCMonth()+n);return x.toISOString().slice(0,10)};
type Kind='day'|'week'|'month'|'custom';
// 지금 범위가 어떤 단위인지(화살표 이동 폭과 이름에 쓴다)
function kindOf(a:string,b:string):Kind{if(a===b)return 'day';const w=weekRange(a);if(w[0]===a&&w[1]===b)return 'week';const m=monthRange(a);if(m[0]===a&&m[1]===b)return 'month';return 'custom'}
export function periodLabel(a:string,b:string,now:string){
 const k=kindOf(a,b);
 if(k==='day')return (a===now?'오늘 ':a===dayShift(now,-1)?'어제 ':'')+`${mmdd(a)}(${dow(a)})`;
 if(k==='week'){const w=weekRange(now);return (a===w[0]?'이번 주 ':a===dayShift(w[0],-7)?'지난주 ':'')+`${mmdd(a)}–${mmdd(b)}`}
 if(k==='month')return `${a.slice(0,4)}년 ${Number(a.slice(5,7))}월`;
 return `${a.slice(0,4)===b.slice(0,4)?mmdd(a):a.replaceAll('-','.')}–${mmdd(b)}`;
}
function step(a:string,b:string,dir:1|-1):[string,string]{
 const k=kindOf(a,b);
 if(k==='month')return monthRange(monthShift(a,dir));
 const len=(daysBetween(a,b)??0)+1;return [dayShift(a,dir*len),dayShift(b,dir*len)];
}
export function PeriodPicker({start,end,now,onChange}:{start:string;end:string;now:string;onChange:(a:string,b:string)=>void}){
 const [open,setOpen]=useState(false),[custom,setCustom]=useState(false),[a,setA]=useState(start),[b,setB]=useState(end),box=useRef<HTMLDivElement>(null),btn=useRef<HTMLButtonElement>(null),panelId=useId();
 useEffect(()=>{setA(start);setB(end)},[start,end]);
 useEffect(()=>{if(!open)return;const out=(e:PointerEvent)=>{if(!box.current?.contains(e.target as Node))setOpen(false)};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);btn.current?.focus()}};
  document.addEventListener('pointerdown',out);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',out);document.removeEventListener('keydown',key)}},[open]);
 const w=weekRange(now),m=monthRange(now),lm=monthRange(monthShift(now,-1));
 const quick:[string,[string,string]][]=[['오늘',[now,now]],['이번 주',w],['지난주',[dayShift(w[0],-7),dayShift(w[0],-1)]],['이번 달',m],['지난달',lm],['최근 4주',[dayShift(now,-27),now]],['최근 3개월',[monthShift(now,-2).slice(0,8)+'01',now]]];
 const pick=(x:string,y:string)=>{onChange(x,y);setOpen(false);setCustom(false);btn.current?.focus()};
 const go=(dir:1|-1)=>{const [x,y]=step(start,end,dir);onChange(x,y)};
 const label=periodLabel(start,end,now);
 return <div className="period-picker" ref={box}>
  <button type="button" className="period-step" aria-label="이전 기간" onClick={()=>go(-1)}><ChevronLeft size={16}/></button>
  <button type="button" ref={btn} className="period-label" aria-haspopup="dialog" aria-expanded={open} aria-controls={panelId} aria-label={`조회 기간 ${label} — 바꾸기`} onClick={()=>{setOpen(!open);setCustom(false)}}><span>{label}</span><ChevronDown size={14}/></button>
  <button type="button" className="period-step" aria-label="다음 기간" onClick={()=>go(1)}><ChevronRight size={16}/></button>
  {open&&<div className="period-panel" id={panelId} role="dialog" aria-label="조회 기간 고르기">
   <div className="period-quick">{quick.map(([name,[x,y]])=>{const on=x===start&&y===end;return <button type="button" key={name} className={on?'on':''} aria-pressed={on} onClick={()=>pick(x,y)}><span>{on&&<Check size={14}/>}{name}</span><small>{periodLabel(x,y,now).replace(/^(오늘|어제|이번 주|지난주) /,'')}</small></button>})}
    <button type="button" className={custom?'on':''} aria-expanded={custom} onClick={()=>setCustom(!custom)}><span>직접 선택</span><small>시작일·종료일</small></button></div>
   {custom&&<form className="period-custom" onSubmit={e=>{e.preventDefault();if(a&&b&&a<=b)pick(a,b)}}>
    <label>시작일<input type="date" value={a} max={b||undefined} onChange={e=>setA(e.target.value)} required/></label>
    <label>종료일<input type="date" value={b} min={a||undefined} onChange={e=>setB(e.target.value)} required/></label>
    <button type="submit" className="btn primary" disabled={!a||!b||a>b}>적용</button>
    <p>한 번에 최대 1년까지 볼 수 있어요.</p>
   </form>}
  </div>}
 </div>;
}
