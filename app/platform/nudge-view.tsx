'use client';
// 독려 안내 화면(지침 10-A): 도형 캐릭터 + 큰 숫자 칸(누르면 해당 목록) + 칩(누르면 그 범위) + 다음 대상 일정 잡기.
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
// 도형 캐릭터: 딥그린 선·흰 채움. 표정과 몸짓이 먼저 말한다(한 번 재생).
// joy=웃는 눈·두 팔 올림·두 번 통통 + 반짝이 터짐, cheer=점 눈·한 손 흔들기, concern=걱정 눈썹·기울기 + 느낌표.
export function Mascot({mood,size}:{mood:'joy'|'cheer'|'concern';size:number}){
 const g='#003c33';
 return <span className={'zf-mascot zf-mascot-'+mood} style={{width:size,height:size}} aria-hidden="true">
  <svg viewBox="0 0 64 64" width={size} height={size} focusable="false">
   {mood==='joy'?<><path className="zf-arm-l" d="M14 38 L5 22" stroke={g} strokeWidth="3.5" strokeLinecap="round"/><path className="zf-arm-r" d="M50 38 L59 22" stroke={g} strokeWidth="3.5" strokeLinecap="round"/></>
    :mood==='cheer'?<><path d="M14 40 L7 48" stroke={g} strokeWidth="3.5" strokeLinecap="round"/><path className="zf-arm-wave" d="M50 38 L58 24" stroke={g} strokeWidth="3.5" strokeLinecap="round"/></>
    :<><path d="M14 40 L8 48" stroke={g} strokeWidth="3.5" strokeLinecap="round"/><path d="M50 40 L56 48" stroke={g} strokeWidth="3.5" strokeLinecap="round"/></>}
   <circle cx="32" cy="36" r="20" fill="#fff" stroke={g} strokeWidth="3.5"/>
   {mood==='joy'?<><path d="M22 33q3-4 6 0M36 33q3-4 6 0" fill="none" stroke={g} strokeWidth="3" strokeLinecap="round"/><path d="M23 40q9 10 18 0z" fill={g}/></>
    :mood==='cheer'?<><circle cx="25" cy="33" r="2.6" fill={g}/><circle cx="39" cy="33" r="2.6" fill={g}/><path d="M25 42q7 5 14 0" fill="none" stroke={g} strokeWidth="3" strokeLinecap="round"/></>
    :<><path d="M21 27l7 2M43 27l-7 2" stroke={g} strokeWidth="2.6" strokeLinecap="round"/><circle cx="25" cy="34" r="2.4" fill={g}/><circle cx="39" cy="34" r="2.4" fill={g}/><path d="M26 45q6-4 12 0" fill="none" stroke={g} strokeWidth="3" strokeLinecap="round"/></>}
  </svg>
  {mood==='joy'&&<span className="zf-burst">{[0,1,2,3,4,5,6,7].map(i=><i key={i} style={{'--a':i*45+'deg'} as React.CSSProperties}/>)}</span>}
  {mood==='concern'&&<span className="zf-mark">!</span>}
 </span>;
}
const ICONS={done:CheckCircle2,plan:CalendarClock,risk:AlertTriangle,caution:AlertCircle};
function Stat({s,onGo}:{s:NudgeStat;onGo:(s:NudgeStat)=>void}){
 const v=useTween(s.value,s.from??0),pct=s.max?Math.min(100,v/s.max*100):0;
 return <button type="button" className={'zf-nudge-stat'+(s.tone?' '+s.tone:'')} onClick={()=>onGo(s)} aria-label={`${s.label} ${s.value}${s.unit} — 목록 보기`}>
  <span className="zf-nudge-stat-label">{(()=>{const I=ICONS[s.icon];return <I size={16}/>})()}{s.label}<ChevronRight size={12}/></span>
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
