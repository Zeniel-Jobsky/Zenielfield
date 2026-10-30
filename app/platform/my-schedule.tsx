'use client';
// 일정 잡기 전 빈 날 확인: 오늘부터 7일을 칩 한 줄로(날짜 + 내 방문 n건 / 비어 있음). 누르면 그 날짜를 AI 입력에 먼저 넣는다.
// 필요 회차 기간 안의 날은 딥그린 테두리. 방문 목록 전체는 방문 일정 화면의 달력에서 본다(여기서 반복하지 않는다).
import {useMemo,useState} from 'react';
import type {Context} from './context';
import {dayShift,mmdd,between,daysBetween,kstToday,kstTime} from '../lib/date';
import type {Target} from './model';
import {scheduleFacts,scheduleCandidates} from './schedule';
import {targetFacts,attentionOf,staleStores,LEVEL_ORDER,STALE_DAYS} from './status';
import {levelLabel} from './judgment';
import {MapPin,Route} from 'lucide-react';
import {AiMark} from './ai-mark';
import {ruleName} from './model';

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

// 대상을 고르기 전: 제니에리 방문 추천(리마인더). 사실과 저장된 판정만(DC-JUDGMENT), 점수·순위 없음.
// 대상 = 방문자 담당 운영 중 현장·매장 중 attentionOf(판정 바로 확인·조치 필요 → 기한 지남·일정 없음·기한 넘긴 조치) + 60일+ 미방문, 다가온 일정 있는 곳 제외.
// 줄마다: 왜(사실) · 방문 주기와 마지막 방문 경과 · 확인할 것(저장 판정 판단 + 안 끝난 조치 내용) · 같은 날 함께 가기 좋은 곳(같은 현장·같은 지역, 동선).
// 누르면 대상을 고르고 확인할 것을 사전 확인사항에 채운다(사람이 쓴 값이 있으면 덮지 않음).
// 정렬 선택(사실 기준, 점수 없음): 급한 순 = 저장 판정 → 이른 기한(attentionOf) · 오래 못 간 순 = 마지막 방문 오래된 순(기록 없음 먼저) · 지역별 = 같은 지역끼리 묶어 동선 · 밀린 조치 = 기한 넘긴 조치 많은 순
const SUGGEST_ORDER=[['urgent','급한 순'],['stale','오래 못 간 순'],['region','지역별'],['late','밀린 조치']] as const;
type SuggestOrder=typeof SUGGEST_ORDER[number][0];
export function VisitSuggest({c,visitor,onPick}:{c:Context;visitor:string;onPick:(t:Target,precheck:string)=>void}){
 const [order,setOrder]=useState<SuggestOrder>('urgent');
 const rows=useMemo(()=>{const own=c.targets.filter(t=>t.status==='운영 중'&&t.managerIds.includes(visitor)),pool=own.length?own:c.scope;
  const facts=targetFacts(pool,c.visits,c.actions,c.allMetrics.slots,c.now),att=attentionOf(facts.values()),seen=new Set(att.map(f=>f.target.id));
  const stale=staleStores(pool,c.visits,c.now).filter(x=>!seen.has(x.target.id)&&!facts.get(x.target.id)?.upcoming).map(x=>facts.get(x.target.id)!).filter(Boolean);
  const base=[...att,...stale],last=(f:typeof base[number])=>f.lastVisit||'';
  const list=order==='urgent'?base:[...base].sort(order==='stale'?(a,b)=>last(a).localeCompare(last(b)):order==='region'?(a,b)=>(a.target.region||'').localeCompare(b.target.region||'')||a.target.siteName.localeCompare(b.target.siteName):(a,b)=>b.lateActions-a.lateActions);
  const open=new Map<string,typeof c.actions>();for(const x of c.actions){if(x.state==='완료')continue;const id=x.storeId||x.siteId,arr=open.get(id)||[];arr.push(x);open.set(id,arr)}
  return list.slice(0,5).map(f=>{const t=f.target,j=f.judgment&&LEVEL_ORDER[f.judgment.level]?f.judgment:null,days=daysBetween(f.lastVisit,c.now);
   const why=[j&&levelLabel(j.level),f.delayed.length&&`필요 방문 기한 지남 ${f.delayed.length}회`,f.unplanned.length&&`필요 방문 일정 없음 ${f.unplanned.length}회`,f.lateActions&&`기한 넘긴 조치 ${f.lateActions}건`].filter(Boolean) as string[];
   const interval=`주기 ${ruleName(t.rule)} · ${days===null?'방문 기록 없음':`마지막 방문 ${days}일 전`}`;
   const acts=(open.get(t.id)||[]).sort((x,y)=>x.dueDate.localeCompare(y.dueDate)).slice(0,2);
   const check=[j?.assessment||'',...acts.map(x=>`${x.type}: ${x.content.length>40?x.content.slice(0,40)+'…':x.content}(기한 ${mmdd(x.dueDate)}${x.dueDate<c.now?' 지남':''})`)].filter(Boolean);
   const near=list.filter(o=>o.target.id!==t.id&&(o.target.siteId===t.siteId||(!!t.region&&o.target.region===t.region))).slice(0,2).map(o=>o.target.name);
   return {t,why,interval,check,near}})},[c.targets,c.scope,c.visits,c.actions,c.allMetrics.slots,c.now,visitor,order]);
 if(!rows.length)return <p className="form-hint wide">지금 먼저 챙길 담당 현장·매장은 없어요. 빈 날을 골라 일정을 잡아 보세요.</p>;
 return <section className="visit-suggest wide" aria-label="제니에리 방문 추천"><h3><AiMark size={20}/>제니에리가 먼저 가 보면 좋은 곳을 골랐어요</h3><div className="vs-order" role="radiogroup" aria-label="추천 장소 정렬">{SUGGEST_ORDER.map(([k,l])=><button key={k} type="button" role="radio" aria-checked={order===k} className={order===k?'on':''} onClick={()=>setOrder(k)}>{l}</button>)}</div>{order==='region'&&<p className="form-hint">같은 지역끼리 묶었어요. 한 번에 이어서 가 보세요.</p>}<ol>{rows.map(r=><li key={r.t.id}><button type="button" onClick={()=>onPick(r.t,r.check.map(x=>'- '+x).join('\n'))}>
  <b className={'zf-ent zf-ent-'+r.t.type}>{r.t.type==='store'?r.t.siteName+' › ':''}{r.t.name}</b>
  {r.why.length>0&&<span className="vs-why">{r.why.join(' · ')}</span>}
  <small>{r.interval}</small>
  {r.check.length>0&&<small className="vs-check">확인할 것 · {r.check.join(' / ')}</small>}
  {r.near.length>0&&<small className="vs-near"><Route size={14} aria-hidden/>같은 날 함께: {r.near.join(', ')}</small>}
  <span className="vs-pick"><MapPin size={14} aria-hidden/>이곳 선택</span></button></li>)}</ol></section>;
}
