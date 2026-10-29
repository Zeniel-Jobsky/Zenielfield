'use client';
// 독려 안내 화면(지침 10-A): 메시지별 업무 아이콘 + 큰 숫자 칸(누르면 해당 목록) + 칩(누르면 그 범위) + 다음 대상 일정 잡기.
// 한 번 재생 트윈(막대 600ms·정수 카운트업 600ms·등장 240ms). 반복 없음, 같은 값이면 재생 안 함, reduced-motion이면 최종 상태.
import {useEffect,useMemo,useRef,useState} from 'react';
import {CalendarPlus,ChevronRight,CheckCircle2,CalendarClock,AlertTriangle,AlertCircle} from 'lucide-react';
import type {Context} from './context';
import {buildNudge,type Nudge,type NudgeStat} from './nudge';
import {scopeUnits} from './decision';
import {RichText} from './rich';

const reduced=()=>typeof window!=='undefined'&&!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function useTween(target:number,from=0,ms=600){
 const [v,setV]=useState(reduced()?target:from),last=useRef<number|null>(null);
 useEffect(()=>{if(last.current===target)return;const start=last.current??from;last.current=target;
  if(reduced()||start===target){setV(target);return}
  let raf=0;const t0=performance.now(),step=(t:number)=>{const k=Math.min(1,(t-t0)/ms),e=1-Math.pow(1-k,3);setV(start+(target-start)*e);if(k<1)raf=requestAnimationFrame(step)};
  raf=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf)},[target,from,ms]);
 return v;
}
// Reference SVG language: 64px canvas, rounded 2.5-unit strokes and a quiet tile.
// Keep the public class/mood API; the adjacent message carries the accessible meaning.
export function Mascot({mood,size}:{mood:'joy'|'cheer'|'concern';size:number}){
 return <span className={'zf-mascot zf-mascot-'+mood} style={{width:size,height:size}} aria-hidden="true">
  <svg viewBox="0 0 64 64" width={size} height={size} fill="none" focusable="false" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
   <rect width="64" height="64" rx="14" fill="var(--zf-surface-muted)"/>
   {mood==='joy'?<>
    <path d="M20 14h17l10 10v24a3 3 0 0 1-3 3H20a3 3 0 0 1-3-3V17a3 3 0 0 1 3-3Z" fill="var(--zf-selected)" stroke="currentColor"/>
    <path d="M37 14v10h10M24 31h12M24 37h8M24 43h6" stroke="currentColor"/>
    <circle cx="46" cy="45" r="11" fill="currentColor"/>
    <path d="m40.5 45 3.5 3.5 7-7.5" stroke="var(--zf-on-action)"/>
   </>:mood==='cheer'?<>
    <rect x="14" y="17" width="35" height="33" rx="4" fill="var(--zf-selected)" stroke="currentColor"/>
    <path d="M14 27h35M23 13v9M40 13v9" stroke="currentColor"/>
    <path d="M22 34h4M32 34h4M22 41h4" stroke="currentColor"/>
    <circle cx="46" cy="46" r="11" fill="currentColor"/>
    <path d="M40 46h12m-5-5 5 5-5 5" stroke="var(--zf-on-action)"/>
   </>:<>
    <rect x="18" y="15" width="27" height="36" rx="3" fill="var(--zf-selected)" stroke="currentColor"/>
    <path d="M13 51h38M26 23h3M35 23h3M26 31h3M35 31h3M27 51V40h8v11" stroke="currentColor"/>
    <circle cx="46" cy="44" r="11" fill="var(--zf-surface)" stroke="var(--zf-danger)"/>
    <path d="M46 38v7" stroke="var(--zf-danger)"/>
    <circle cx="46" cy="49" r="1.5" fill="var(--zf-danger)"/>
   </>}
  </svg>
 </span>;
}
const ICONS={done:CheckCircle2,plan:CalendarClock,risk:AlertTriangle,caution:AlertCircle};
function Stat({s,onGo}:{s:NudgeStat;onGo:(s:NudgeStat)=>void}){
 const v=useTween(s.value,s.from??0),pct=s.max?Math.min(100,v/s.max*100):0;
 return <button type="button" className={'zf-nudge-stat'+(s.tone?' '+s.tone:'')} onClick={()=>onGo(s)} aria-label={`${s.label} ${s.value}${s.unit} — 목록 보기`}>
  <span className="zf-nudge-stat-label">{(()=>{const I=ICONS[s.icon];return <I size={16}/>})()}{s.label}<ChevronRight size={14}/></span>
  <span className="zf-nudge-stat-value"><b>{Math.round(v)}</b><small>{s.unit}</small>{s.from!==undefined&&s.value>s.from&&<em className="zf-plus">+{s.value-s.from}</em>}</span>
  {s.max?<span className="zf-nudge-bar" aria-hidden="true"><i style={{width:pct+'%'}}/>{s.from!==undefined&&<u style={{left:pct+'%'}}/>}</span>:null}
 </button>;
}
export function NudgeCard({n,c,variant='band',onLeave}:{n:Nudge;c:Context;variant?:'band'|'sheet';onLeave?:()=>void}){
 const leave=(f:()=>void)=>{onLeave?.();f()};
 const drill=(key:string)=>leave(()=>scopeUnits(c).drill(key));
 const schedule=()=>{// 인정 기간이 이미 지난 회차는 그 회차로 채울 수 없으므로 대상만 채워 연다
 const t=c.target(n.next!.id),s0=n.next!.slot,sl=s0&&s0.windowEnd>=c.now?s0:null;if(!t)return;leave(()=>c.open('visit',undefined,sl?{targetType:t.type,siteId:t.siteId,storeId:t.storeId,date:sl.dueDate<c.now?c.now:sl.windowStart>c.now?sl.windowStart:c.now,requirementId:sl.id,dueDate:sl.dueDate}:{targetType:t.type,siteId:t.siteId,storeId:t.storeId}))};
 return <section className={'zf-nudge zf-nudge-'+variant} aria-label="독려 안내">
  <div className="zf-nudge-head"><Mascot mood={n.mood} size={variant==='sheet'?56:44}/><p className={'zf-bubble zf-bubble-'+n.mood}><RichText r={n.title}/></p></div>
  <div className="zf-nudge-body">
   {n.stats.length>0&&<div className="zf-nudge-stats">{n.stats.map(s=><Stat key={s.label} s={s} onGo={x=>leave(()=>c.go(x.go.page,x.go.kind))}/>)}</div>}
   {n.chips&&<div className="zf-nudge-chips"><span>{n.chips.title}</span>{n.chips.items.map(x=><button type="button" key={x.key} onClick={()=>drill(x.key)}>{x.label}<b>{x.value}</b></button>)}</div>}
   {n.help&&<p className="zf-nudge-help"><RichText r={n.help}/></p>}
   {n.next&&<div className="zf-nudge-next"><span>다음 방문</span><button type="button" className="link" onClick={()=>leave(()=>c.showTarget(n.next!.id))}>{n.next.name}</button><small><RichText r={n.next.why}/></small>{c.editable&&<button type="button" className="btn small primary" onClick={schedule}><CalendarPlus size={14}/>일정 잡기</button>}</div>}
   <p className="sr-only" aria-live="polite">{n.stats.map(s=>`${s.label} ${s.value}${s.unit}`).join(', ')}</p>
  </div>
 </section>;
}
// 방문 결과·일정 저장 직후 시트 안 안내
export function SavedNudge({c,before,onClose}:{c:Context;before:number;onClose:()=>void}){
 const n=useMemo(()=>buildNudge(c,before),[c.visits,c.actions,c.metrics,c.me.id]);
 return <div className="zf-saved-nudge"><NudgeCard n={n} c={c} variant="sheet" onLeave={onClose}/><div className="form-footer"><button type="button" className="btn primary" onClick={onClose}>확인</button></div></div>;
}
