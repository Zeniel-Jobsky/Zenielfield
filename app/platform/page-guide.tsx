'use client';
// 방문 일정·방문 기록 맨 위 제니에리 정리(후속 조치 정리와 같은 틀): 무슨 일(현황 문단·진척 문단) → 이렇게 챙겨 보세요(할 일 한 문장 + 3건 + 바로 하기·보낼 말 복사).
// AI 없이 보는 범위의 사실만(DC-JUDGMENT). 비교는 자기 지난주와만(DC-FEEDBACK).
import {useMemo,type ReactNode} from 'react';
import {Newspaper,ListChecks,ChevronRight} from 'lucide-react';
import {AiMark} from './ai-mark';
import {CopyButton} from './copy-button';
import {dayShift,daysBetween,between,weekOf,mmdd} from '../lib/date';
import {targetFacts,attentionOf} from './status';
import {targetOf} from './model';
import type {Context} from './context';

type Row={key:string;head:string;what:string;meta:string;go:()=>void;doLabel:string;doIt:()=>void;to:string;msg:string};
function GuidePanel({title,paras,advice,rows,more}:{title:string;paras:string[];advice:string;rows:Row[];more?:ReactNode}){
 return <section className="panel ai-brief action-brief" aria-label={title}>
  <div className="panel-heading"><div><h2><AiMark/>{title}</h2></div></div>
  <div className="chart-body"><div className="ai-brief-out">
   <section className="ai-brief-story"><h3><Newspaper size={16} aria-hidden/>무슨 일이 벌어지고 있나</h3>{paras.map((x,i)=><p key={i}>{x}</p>)}</section>
   {rows.length>0&&<section className="ai-brief-focus"><h3><ListChecks size={16} aria-hidden/>이렇게 챙겨 보세요<CopyButton label="이렇게 챙겨 보세요 복사" text={[advice,...rows.map(r=>`- ${r.head}: ${r.what} (${r.meta})`)].join('\n')}/></h3>
    <p className="action-advice">{advice}</p>
    <ul className="action-late">{rows.map(r=><li key={r.key}><button type="button" onClick={r.go}><b>{r.head}</b><span>{r.what}</span><small>{r.meta}</small><ChevronRight size={16} aria-hidden/></button><button type="button" className="btn small" onClick={r.doIt}>{r.doLabel}</button>{r.to&&<CopyButton label={r.to+'에게 보낼 말 복사'} text={r.msg}/>}</li>)}</ul>{more}</section>}
  </div></div>
 </section>;
}
const honor=(c:Context,id:string)=>c.uname(id)+' 매니저님';

// 방문 일정: 이번 주 잡힌 일정·일정 잡을 회차 → 먼저 일정을 잡을 곳 3곳
export function ScheduleGuide({c}:{c:Context}){
 const self=c.me.role==='manager',where=self?'':'맡은 범위에서 ';
 const f=useMemo(()=>{const wk=weekOf(c.now),we=dayShift(wk,6),pw=dayShift(wk,-7);
  const planned=c.visits.filter(v=>v.status==='planned'&&between(v.plannedDate,wk,we)).length,plannedPrev=c.visits.filter(v=>between(v.plannedDate,pw,dayShift(pw,6))).length;
  const today=c.visits.filter(v=>v.status==='planned'&&v.plannedDate===c.now).length,gap=c.allMetrics.delayed+c.allMetrics.unplanned;
  const att=attentionOf(targetFacts(c.scope,c.visits,c.actions,c.allMetrics.slots,c.now).values()).filter(x=>!x.upcoming&&(x.delayed.length||x.unplanned.length)).slice(0,3);
  return {planned,plannedPrev,today,gap,att}},[c.visits,c.actions,c.scope,c.allMetrics,c.now]);
 const paras=[`${where}이번 주에 잡힌 방문은 ${f.planned}건이고, 오늘은 ${f.today}건이에요.`+(f.gap?` 일정을 아직 잡지 않았거나 기한이 지난 필요 방문이 ${f.gap}회 있어요.`:' 일정을 잡아야 할 필요 방문은 없어요.'),
  `지난주에는 ${f.plannedPrev}건이 잡혀 있었어요.`];
 const rows:Row[]=f.att.map(x=>{const t=x.target,owner=t.managerIds[0]||'',why=[x.delayed.length&&`필요 방문 기한 지남 ${x.delayed.length}회`,x.unplanned.length&&`일정 없음 ${x.unplanned.length}회`].filter(Boolean).join(' · ');
  return {key:t.id,head:(t.type==='store'?t.siteName+' › ':'')+t.name,what:why,meta:x.lastVisit?`마지막 방문 ${mmdd(x.lastVisit)}`:'방문 기록 없음',go:()=>c.showTarget(t.id),doLabel:'일정 잡기',doIt:()=>c.open('visit',undefined,{targetType:t.type,siteId:t.siteId,storeId:t.storeId||undefined}),
   to:self||!owner?'':honor(c,owner),msg:owner?`${honor(c,owner)}, ${t.name} 필요 방문 일정이 아직 없어요. 이번 주 안에 방문 날짜를 잡아 주세요.`:''}});
 return <GuidePanel title="제니에리가 방문 일정을 정리했어요" paras={paras} advice={self?'아래 곳부터 방문 날짜를 잡아 보세요.':'아래 곳의 담당 매니저와 이번 주 방문 날짜를 정해 보세요.'} rows={rows}/>;
}

// 방문 기록: 이번 기간 마친 방문·결과 안 쓴 방문 → 오래된 미작성 3건
export function RecordGuide({c}:{c:Context}){
 const self=c.me.role==='manager',where=self?'':'맡은 범위에서 ';
 const f=useMemo(()=>{const wk=weekOf(c.now),pw=dayShift(wk,-7),gone=daysBetween(wk,c.now);
  const done=c.visits.filter(v=>v.status==='completed'&&between(v.actualDate,c.start,c.end)).length;
  const thisWeek=c.visits.filter(v=>v.status==='completed'&&between(v.actualDate,wk,c.now)).length,lastWeek=c.visits.filter(v=>v.status==='completed'&&between(v.actualDate,pw,dayShift(pw,gone))).length;
  const missing=c.visits.filter(v=>v.status==='planned'&&!!v.plannedDate&&v.plannedDate<=c.now).sort((a,b)=>(a.plannedDate||'').localeCompare(b.plannedDate||''));
  return {done,thisWeek,lastWeek,missing}},[c.visits,c.start,c.end,c.now]);
 const paras=[`${where}이 기간에 마친 방문은 ${f.done}건이에요.`+(f.missing.length?` 예정일이 지났는데 결과가 없는 방문이 ${f.missing.length}건 있어요.`:' 결과를 안 쓴 방문은 없어요.'),
  `이번 주에 ${f.thisWeek}건을 마쳤어요. 지난주 이맘때는 ${f.lastWeek}건이었어요.`];
 const rows:Row[]=f.missing.slice(0,3).map(v=>{const d=daysBetween(v.plannedDate!,c.now);
  return {key:v.id,head:c.label(v),what:`${v.purpose||'방문'} · 예정 ${mmdd(v.plannedDate!)}`,meta:`결과 없이 ${d}일 지남${self?'':' · '+honor(c,v.visitorId)}`,go:()=>c.showTarget(targetOf(v)),doLabel:'결과 쓰기',doIt:()=>c.open('visit',v,{result:true}),
   to:self?'':honor(c,v.visitorId),msg:`${honor(c,v.visitorId)}, ${c.label(v)} ${mmdd(v.plannedDate!)} 방문 결과가 아직 없어요. 다녀오셨으면 결과를 남겨 주시고, 못 가셨으면 일정을 다시 잡아 주세요.`}});
 return <GuidePanel title="제니에리가 방문 기록을 정리했어요" paras={paras} advice={self?'오래된 것부터 결과를 남기거나, 못 갔으면 일정을 다시 잡아 보세요.':'오래된 것부터 담당 매니저에게 결과 작성을 부탁해 보세요.'} rows={rows}/>;
}
