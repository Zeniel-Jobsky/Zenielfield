'use client';
// 방문 일정·방문 기록 맨 위 제니에리 정리(후속 조치 정리와 같은 틀): 무슨 일(현황 문단·진척 문단) → 이렇게 챙겨 보세요(할 일 한 문장 + 3건 + 바로 하기·보낼 말 복사).
// AI 없이 보는 범위의 사실만(DC-JUDGMENT). 비교는 자기 지난주와만(DC-FEEDBACK).
import {useMemo,type ReactNode} from 'react';
import {Newspaper,ListChecks,CalendarPlus,PenLine,ClipboardPen,UserRoundPen} from 'lucide-react';
import {AiMark} from './ai-mark';
import {CopyButton} from './copy-button';
import {dayShift,daysBetween,between,weekOf,mmdd} from '../lib/date';
import {targetFacts,attentionOf,staleStores} from './status';
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
    <ul className="action-late">{rows.map(r=><li key={r.key}><button type="button" onClick={r.go}><b>{r.head}</b><span>{r.what}</span><small>{r.meta}</small></button><button type="button" className="btn small" onClick={r.doIt}>{r.doLabel==='일정 잡기'?<CalendarPlus size={14} aria-hidden/>:r.doLabel==='결과 쓰기'?<PenLine size={14} aria-hidden/>:r.doLabel==='담당 정하기'?<UserRoundPen size={14} aria-hidden/>:<ClipboardPen size={14} aria-hidden/>}{r.doLabel}</button>{r.to&&<CopyButton label={r.to+'에게 보낼 말 복사'} text={r.msg} visible="보낼 말"/>}</li>)}</ul>{more}</section>}
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

// 방문·조치 한 화면 정리: 방문 문단 + 조치 문단 → 결과 안 쓴 방문과 기한 넘긴 조치를 오래된 순으로 섞어 4건(바로 하기·보낼 말)
export function VisitActionGuide({c}:{c:Context}){
 const self=c.me.role==='manager',where=self?'':'맡은 범위에서 ';
 const f=useMemo(()=>{const wk=weekOf(c.now),pw=dayShift(wk,-7),gone=daysBetween(wk,c.now);
  const done=c.visits.filter(v=>v.status==='completed'&&between(v.actualDate,c.start,c.end)).length;
  const thisWeek=c.visits.filter(v=>v.status==='completed'&&between(v.actualDate,wk,c.now)).length,lastWeek=c.visits.filter(v=>v.status==='completed'&&between(v.actualDate,pw,dayShift(pw,gone))).length;
  const missing=c.visits.filter(v=>v.status==='planned'&&!!v.plannedDate&&v.plannedDate<=c.now);
  const open=c.actions.filter(a=>a.state!=='완료'),late=open.filter(a=>a.dueDate<c.now);
  const done14=c.actions.filter(a=>a.state==='완료'&&between(a.completedDate,dayShift(c.now,-13),c.now)).length;
  return {done,thisWeek,lastWeek,missing,open:open.length,late,done14}},[c.visits,c.actions,c.start,c.end,c.now]);
 const paras=[`${where}이 기간에 마친 방문은 ${f.done}건이고, 이번 주는 ${f.thisWeek}건이에요(지난주 이맘때 ${f.lastWeek}건).`+(f.missing.length?` 예정일이 지났는데 결과가 없는 방문이 ${f.missing.length}건 있어요.`:''),
  f.open?`안 끝난 조치가 ${f.open}건이고, 그중 ${f.late.length}건은 기한이 지났어요. 최근 2주에 ${f.done14}건을 끝냈어요.`:`안 끝난 조치는 없어요. 최근 2주에 ${f.done14}건을 끝냈어요.`];
 type Item={days:number;row:Row};
 const items:Item[]=[...f.missing.map(v=>({days:daysBetween(v.plannedDate!,c.now),row:{key:'v'+v.id,head:c.label(v),what:`방문 결과 없음 · ${v.purpose||'방문'} · 예정 ${mmdd(v.plannedDate!)}`,meta:`${daysBetween(v.plannedDate!,c.now)}일 지남${self?'':' · '+honor(c,v.visitorId)}`,go:()=>c.showTarget(targetOf(v)),doLabel:'결과 쓰기',doIt:()=>c.open('visit',v,{result:true}),to:self?'':honor(c,v.visitorId),msg:`${honor(c,v.visitorId)}, ${c.label(v)} ${mmdd(v.plannedDate!)} 방문 결과가 아직 없어요. 다녀오셨으면 결과를 남겨 주시고, 못 가셨으면 일정을 다시 잡아 주세요.`}})),
  ...f.late.map(a=>({days:daysBetween(a.dueDate,c.now),row:{key:'a'+a.id,head:c.label(a),what:`기한 넘긴 조치 · ${a.type} · ${a.content.length>30?a.content.slice(0,30)+'…':a.content}`,meta:`기한 ${daysBetween(a.dueDate,c.now)}일 지남${self?'':' · '+honor(c,a.ownerId)}`,go:()=>c.showTarget(targetOf(a),'actions'),doLabel:'완료일 정하기',doIt:()=>c.open('action',a),to:self?'':honor(c,a.ownerId),msg:`${honor(c,a.ownerId)}, ${c.label(a)} '${a.content.slice(0,30)}' 조치 기한이 ${daysBetween(a.dueDate,c.now)}일 지났어요. 새 완료일을 정해 주시거나, 끝났으면 완료로 기록해 주세요.`}}))].sort((x,y)=>y.days-x.days);
 return <GuidePanel title="제니에리가 방문·조치를 정리했어요" paras={paras} advice={self?'오래된 것부터 결과를 남기고, 밀린 조치는 새 완료일을 정해 보세요.':'오래된 것부터 담당 매니저에게 결과 작성과 새 완료일을 부탁해 보세요.'} rows={items.slice(0,4).map(x=>x.row)}/>;
}

// 담당·주기 관리: 담당자 없는 대상·필요 시(수동) 주기·60일 넘게 못 간 곳 → 먼저 손볼 곳 3곳(일정 잡기·담당 정하기)
export function SitesGuide({c}:{c:Context}){
 const self=c.me.role==='manager',where=self?'':'맡은 범위에서 ';
 const f=useMemo(()=>{const live=c.scope.filter(t=>t.status==='운영 중');
  const noOwner=live.filter(t=>!t.managerIds.length),manual=live.filter(t=>t.rule.period==='manual');
  const stale=staleStores(live,c.visits,c.now);
  return {live:live.length,noOwner,manual:manual.length,stale}},[c.scope,c.visits,c.now]);
 const paras=[`${where}운영 중인 현장·매장은 ${f.live}곳이에요.`+(f.noOwner.length?` 담당자가 정해지지 않은 곳이 ${f.noOwner.length}곳 있어요.`:' 모두 담당자가 정해져 있어요.'),
  `60일 넘게 방문하지 않은 매장은 ${f.stale.length}곳이고, 필요할 때만 가는(주기 없음) 대상은 ${f.manual}곳이에요.`];
 const rows:Row[]=[...f.noOwner.slice(0,2).map(t=>({key:'o'+t.id,head:(t.type==='store'?t.siteName+' › ':'')+t.name,what:'담당자 없음',meta:`주기 ${t.rule.period==='manual'?'필요 시':t.rule.period==='week'?'주 '+t.rule.count+'회':'월 '+t.rule.count+'회'}`,go:()=>c.showTarget(t.id),doLabel:'담당 정하기',doIt:()=>c.open(t.type==='store'?'store':'site',c.data[t.type==='store'?'stores':'sites'].find((x:any)=>x.id===t.id)),to:'',msg:''})),
  ...f.stale.slice(0,3).map(x=>{const t=x.target,owner=t.managerIds[0]||'';return {key:'s'+t.id,head:(t.type==='store'?t.siteName+' › ':'')+t.name,what:x.days===null?'방문 기록 없음':`마지막 방문 ${x.days}일 전`,meta:owner?honor(c,owner):'담당 없음',go:()=>c.showTarget(t.id),doLabel:'일정 잡기',doIt:()=>c.open('visit',undefined,{targetType:t.type,siteId:t.siteId,storeId:t.storeId||undefined}),to:self||!owner?'':honor(c,owner),msg:owner?`${honor(c,owner)}, ${t.name}에 ${x.days===null?'아직 방문 기록이 없어요':x.days+'일째 방문하지 않았어요'}. 이번 달 안에 한 번 들러 주세요.`:''}})].slice(0,4);
 return <GuidePanel title="제니에리가 담당·주기를 정리했어요" paras={paras} advice={self?'오래 못 간 곳부터 방문 날짜를 잡아 보세요.':'담당이 없는 곳은 담당을 정하고, 오래 못 간 곳은 담당 매니저와 방문 날짜를 잡아 보세요.'} rows={rows}/>;
}

// 현장 주소록: 주소 없는 대상 수 + 담당별 연락 가이드(연락처 칸이 생기기 전까지는 주소·담당 사실만)
export function ContactsGuide({c}:{c:Context}){
 const live=c.scope.filter(t=>t.status==='운영 중'),noAddr=live.filter(t=>!t.address).length;
 const paras=[`운영 중인 현장·매장 ${live.length}곳의 주소와 담당을 모았어요.`+(noAddr?` 주소가 비어 있는 곳이 ${noAddr}곳 있어요. 담당·주기 관리에서 채워 주세요.`:' 주소는 모두 채워져 있어요.'),'이름이나 담당자로 검색하면 바로 찾을 수 있어요.'];
 return <GuidePanel title="제니에리가 주소록을 정리했어요" paras={paras} advice="" rows={[]}/>;
}
