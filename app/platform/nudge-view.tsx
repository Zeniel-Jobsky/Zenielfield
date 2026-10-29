'use client';
// 독려 안내 화면(지침 10-A): 도형 캐릭터 + 큰 숫자 칸(누르면 해당 목록) + 칩(누르면 그 범위) + 다음 대상 일정 잡기.
// 한 번 재생 트윈(막대 600ms·정수 카운트업 600ms·등장 240ms). 반복 없음, 같은 값이면 재생 안 함, reduced-motion이면 최종 상태.
import {useEffect,useMemo,useRef,useState} from 'react';
import {CalendarPlus,ChevronRight} from 'lucide-react';
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
// 단순 도형 캐릭터: 딥그린 선·흰 채움. joy=웃는 눈, cheer=점 눈 + 응원 표시. 장식이므로 낭독하지 않는다.
export function Mascot({mood}:{mood:'joy'|'cheer'}){
 return <svg className="zf-nudge-mascot" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
  <circle cx="16" cy="17" r="12" fill="#fff" stroke="#003c33" strokeWidth="2"/>
  {mood==='joy'?<><path d="M10.5 15.5q1.5-2 3 0M18.5 15.5q1.5-2 3 0" fill="none" stroke="#003c33" strokeWidth="1.8" strokeLinecap="round"/><path d="M11 19.5q5 5 10 0" fill="#003c33" stroke="#003c33" strokeWidth="1.6" strokeLinejoin="round"/></>
   :<><circle cx="12" cy="15.5" r="1.4" fill="#003c33"/><circle cx="20" cy="15.5" r="1.4" fill="#003c33"/><path d="M12.5 20.5q3.5 2.5 7 0" fill="none" stroke="#003c33" strokeWidth="1.8" strokeLinecap="round"/><path d="M27 6v5M24.5 8.5h5" stroke="#003c33" strokeWidth="1.8" strokeLinecap="round"/></>}
 </svg>;
}
function Stat({s,onGo}:{s:NudgeStat;onGo:(s:NudgeStat)=>void}){
 const v=useTween(s.value,s.from??0),pct=s.max?Math.min(100,v/s.max*100):0;
 return <button type="button" className={'zf-nudge-stat'+(s.tone?' '+s.tone:'')} onClick={()=>onGo(s)} aria-label={`${s.label} ${s.value}${s.unit} — 목록 보기`}>
  <span className="zf-nudge-stat-label">{s.label}<ChevronRight size={12}/></span>
  <span className="zf-nudge-stat-value"><b>{Math.round(v)}</b><small>{s.unit}</small></span>
  {s.max?<span className="zf-nudge-bar" aria-hidden="true"><i style={{width:pct+'%'}}/></span>:null}
 </button>;
}
export function NudgeCard({n,c,variant='band',onLeave}:{n:Nudge;c:Context;variant?:'band'|'sheet';onLeave?:()=>void}){
 const leave=(f:()=>void)=>{onLeave?.();f()};
 const drill=(key:string)=>leave(()=>scopeUnits(c).drill(key));
 const schedule=()=>{const t=c.target(n.next!.id),sl=n.next!.slot;if(!t)return;leave(()=>c.open('visit',undefined,sl?{targetType:t.type,siteId:t.siteId,storeId:t.storeId,date:sl.dueDate<c.now?c.now:sl.windowStart>c.now?sl.windowStart:c.now,requirementId:sl.id,dueDate:sl.dueDate}:{targetType:t.type,siteId:t.siteId,storeId:t.storeId}))};
 return <section className={'zf-nudge zf-nudge-'+variant} aria-label="독려 안내">
  <Mascot mood={n.mood}/>
  <div className="zf-nudge-body">
   <p className="zf-nudge-title"><RichText r={n.title}/></p>
   {n.stats.length>0&&<div className="zf-nudge-stats">{n.stats.map(s=><Stat key={s.label} s={s} onGo={x=>leave(()=>c.go(x.go.page,x.go.kind))}/>)}</div>}
   {n.chips&&<div className="zf-nudge-chips"><span>{n.chips.title}</span>{n.chips.items.map(x=><button type="button" key={x.key} onClick={()=>drill(x.key)}>{x.label}<b>{x.value}</b></button>)}</div>}
   {n.help&&<p className="zf-nudge-help"><RichText r={n.help}/></p>}
   {n.next&&<div className="zf-nudge-next"><span>다음 방문</span><button type="button" className="link" onClick={()=>leave(()=>c.showTarget(n.next!.id))}>{n.next.name}</button><small><RichText r={n.next.why}/></small>{c.editable&&<button type="button" className="btn small primary" onClick={schedule}><CalendarPlus size={14}/>일정 잡기</button>}</div>}
   <p className="sr-only" aria-live="polite">{n.stats.map(s=>`${s.label} ${s.value}${s.unit}`).join(', ')}</p>
  </div>
 </section>;
}
// 대시보드·잡매니저 홈: 핵심 지표 바로 아래 한 줄 띠
export function NudgeBand({c}:{c:Context}){
 const n=useMemo(()=>buildNudge(c),[c.scope,c.visits,c.actions,c.metrics,c.type,c.now,c.me.id,c.start,c.end]);
 if(!n.stats.length&&!n.next&&!n.chips)return null;
 return <NudgeCard n={n} c={c}/>;
}
// 방문 결과·일정 저장 직후 시트 안 안내
export function SavedNudge({c,before,onClose}:{c:Context;before:number;onClose:()=>void}){
 const n=useMemo(()=>buildNudge(c,before),[c.visits,c.actions,c.metrics,c.me.id]);
 return <div className="zf-saved-nudge"><NudgeCard n={n} c={c} variant="sheet" onLeave={onClose}/><div className="form-footer"><button type="button" className="btn primary" onClick={onClose}>확인</button></div></div>;
}
