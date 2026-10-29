'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Sparkles,Loader2,ChevronRight,RefreshCw,ChevronDown,ChevronUp} from 'lucide-react';
import type {Context} from './context';
import {PanelTitle} from '../ui';
import {type FieldVisit,aggregate,dayShift,lastTargetVisit,targetOf,targetStatus,typeName,weeklyTrend} from './model';
import {scopeUnits} from './decision';
import {weekRanges,weekTitle} from '../briefing/model';
import {rich,join,num,bad,good,toRich,RichText,type Rich} from './rich';
import {collapseRepeats} from '../lib/dedupe-text';
import {isCurrentJudgment} from './judgment';
// AI 현황 브리핑: 비서가 결정권자에게 보고하듯 균형 있게 쓴다. "지금 상태 → 흐름 → 잘 되고 있는 것 → 챙길 곳 → 무슨 일이 벌어지나 → 선택지와 판단 → 다음에 볼 것".
// 버튼 없이 자동이다. 화면 집계(다이제스트)의 지문이 같으면 저장본을 쓰고, 바뀌면 다시 만들고, 없으면 만든다.
// 기간은 대시보드(조회 기간) 또는 주차별 화면(선택 주차·조회 기간 전체)처럼 비정형이라 DB에 저장하지 않고, 브라우저에 지문별로만 보관한다.
// 중심은 방문 횟수가 아니라 보고 내용의 맥락이다. 기간 안의 방문 보고(목적·결과·상세·특이사항)와 후속 조치 본문을 보내 반복 주제·현장 분위기를 읽게 한다.
// 보고 본문에 담당자 이름은 넣지 않고 전화번호·이메일은 지운다(개인정보 미전송).
export type BriefFactors={reports:boolean;units:boolean;issues:boolean;stale:boolean;trend:boolean;types:boolean};
export const defaultFactors:BriefFactors={reports:true,units:true,issues:true,stale:true,trend:true,types:true};
const FACTORS_KEY='zf-ai-brief-factors',CACHE_KEY='zf-ai-brief-cache';
export function loadFactors():BriefFactors{try{return {...defaultFactors,...JSON.parse(localStorage.getItem(FACTORS_KEY)||'{}')}}catch{return defaultFactors}}
export type BriefRange={start:string;end:string;label:string};
export type BriefDigest={asOf:string;period:{start:string;end:string;label:string};scope:{unit:string;type:string;targets:number;filters:string[]};
 kpi:{rate:number|null;required:number;completed:number;planned:number;gap:number;gapShare:number;overdue:number;overduePrev:number;resolved:number;stale:number;staleShare:number;rateWeek:number|null;rateWeekPrev:number|null};
 units:{label:string;rate:number|null;required:number;completed:number;gap:number;overdue:number;stale:number}[];status:{label:string;n:number}[];issueTypes:{type:string;overdue:number;open:number;done:number}[];
 trend:{week:string;rate:number|null;completed:number;delayed:number;unplanned:number}[];topOverdue:{target:string;type:string;content:string;late:number;owner:string}[];staleTargets:{name:string;days:number|null}[];
 reports:ReportGroup[];reportTotal:number;reportSent:number;
 // 문제 판정 집계(방문 기록에 저장된 judgment만, 본문을 다시 추측하지 않음). 미판정은 따로 센다.
 judged:{reports:number;unjudged:number;levels:Record<string,number>;latest:Record<string,number>;byType:{type:string;n:number;urgent:number;worse:number;ongoing:number;resolved:number;customer:number;targets:number}[]};
 // audience: 보는 사람. manager면 본인에게 하는 코칭(어디를 더 갈지·격려), leader면 결정권자 보고 + 실무자에게 전할 독려 문구.
 audience:'manager'|'leader'};
// 보고 묶음: 대상 하나의 이번 기간 보고 수(now)·직전 기간 보고 수(prev)·진행 중 조치 수(open)와 날짜순 보고. prev:true는 직전 기간 보고.
export type ReportItem={date:string;kind:'방문'|'조치';text:string;prev?:boolean};
export type ReportGroup={target:string;now:number;prev:number;open:number;items:ReportItem[]};
// 문장은 모두 강조 조각 배열(Rich). AI도 같은 모양으로 돌려준다.
// status: 직전 기간 대비 새로 생김·계속됨·해결됨·커짐. evidence: 근거 보고의 "날짜 대상: 짧은 요지".
export type BriefTheme={title:string;status:string;summary:Rich;evidence:string[];targets:string[]};
// cheer: 보는 사람이 잡매니저면 본인에게 하는 격려·독려 한마디, 관리자면 실무자에게 전할 독려 문구 제안.
export type AiBriefResult={headline:Rich;cheer:Rich;themes:BriefTheme[];flow:Rich;strengths:Rich[];focus:{name:string;reason:Rich}[];story:Rich;judgment:Rich[];watch:Rich[];confidence:string};
export function normalizeBrief(x:any):AiBriefResult{const list=(v:unknown)=>Array.isArray(v)?v.map(toRich).filter(r=>r.length):[];return {headline:toRich(x?.headline),cheer:toRich(x?.cheer),themes:Array.isArray(x?.themes)?x.themes.filter((t:any)=>t&&typeof t.title==='string').map((t:any)=>({title:t.title,status:typeof t.status==='string'?t.status:'',summary:toRich(t.summary),evidence:Array.isArray(t.evidence)?t.evidence.filter((e:unknown)=>typeof e==='string').slice(0,3):[],targets:Array.isArray(t.targets)?t.targets.filter((n:unknown)=>typeof n==='string'):[]})):[],flow:toRich(x?.flow),strengths:list(x?.strengths),focus:Array.isArray(x?.focus)?x.focus.filter((f:any)=>f&&typeof f.name==='string').map((f:any)=>({name:f.name,reason:toRich(f.reason)})):[],story:toRich(x?.story),judgment:list(x?.judgment),watch:list(x?.watch),confidence:typeof x?.confidence==='string'?x.confidence:''}}
// 보고 본문 정리: 연락처를 지우고 반복 말을 줄여 한 건당 길이를 제한한다.
const PHONE=/\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}/g,MAIL=/[\w.+-]+@[\w-]+\.[\w.]+/g;
const clean=(s:string)=>collapseRepeats(s.replace(PHONE,'(연락처)').replace(MAIL,'(메일)').replace(/\s+/g,' ').trim());
const REPORT_CHARS=220,REPORT_BUDGET=36000,REPORT_GROUPS=80;
// 보고 본문은 거르지 않고 그대로 보낸다. 문제 여부는 방문 기록에 저장된 판정(judgment)을 붙여 보내고, 미판정이면 AI가 내용을 읽고 판단한다(빈도·키워드로 추측하지 않음).
const judgedText=(j:FieldVisit['judgment'])=>!j||!isCurrentJudgment(j)?'판정: 미판정':`판정: ${j.level} — ${j.assessment}`+(j.issues.length?' / 이슈: '+j.issues.map(i=>`[${i.type}·${i.severity}·${i.flow}${i.customerRequest?'·고객사 요청':''}] ${i.summary}`).join(' / '):'');
// 판정 집계: levels=보고 시점 수준 분포, latest=대상별 가장 최근 판정의 수준 분포(지금 상태), byType=이슈 유형별 건수·긴급·악화·지속·해결.
export function judgedSummary(visits:FieldVisit[]):BriefDigest['judged']{
 const levels:Record<string,number>={},last=new Map<string,FieldVisit>(),by=new Map<string,{n:number;urgent:number;worse:number;ongoing:number;resolved:number;customer:number;t:Set<string>}>();let unjudged=0;
 for(const v of visits){const j=v.judgment;if(!isCurrentJudgment(j)){unjudged++;continue}levels[j.level]=(levels[j.level]||0)+1;const id=targetOf(v),p=last.get(id);if(!p||(p.actualDate||'')<=(v.actualDate||''))last.set(id,v);
  for(const i of j.issues){const b=by.get(i.type)||{n:0,urgent:0,worse:0,ongoing:0,resolved:0,customer:0,t:new Set<string>()};b.n++;if(i.severity==='긴급')b.urgent++;if(i.flow==='악화')b.worse++;if(i.flow==='지속')b.ongoing++;if(i.flow==='해결')b.resolved++;if(i.customerRequest)b.customer++;b.t.add(id);by.set(i.type,b)}}
 const latest:Record<string,number>={};for(const v of last.values())latest[v.judgment!.level]=(latest[v.judgment!.level]||0)+1;
 return {reports:visits.length,unjudged,levels,latest,byType:[...by].map(([type,b])=>({type,n:b.n,urgent:b.urgent,worse:b.worse,ongoing:b.ongoing,resolved:b.resolved,customer:b.customer,targets:b.t.size})).sort((a,b)=>b.n-a.n)};
}
export function reportGroups(c:Context,targets:Context['scope'],start:string,end:string){
 const len=Math.max(1,days(start,end)??0)+1,prevStart=dayShift(start,-len),ids=new Set(targets.map(t=>t.id));
 const map=new Map<string,{now:ReportItem[];prev:ReportItem[];open:number}>();const at=(id:string)=>{let g=map.get(id);if(!g){g={now:[],prev:[],open:0};map.set(id,g)}return g};
 const rows=c.visits.filter(v=>v.actualDate&&v.actualDate>=prevStart&&v.actualDate<=end&&ids.has(targetOf(v)));
 for(const v of rows){const d=v.actualDate!,id=targetOf(v),detail=clean(v.detail||''),notes=clean(v.notes||'');
  const text=[v.purpose&&`목적: ${v.purpose}`,v.result&&`결과: ${v.result}`,detail&&`상세: ${detail}`,notes&&`특이사항: ${notes}`,!detail&&!notes&&'(본문 없음)',judgedText(v.judgment)].filter(Boolean).join(' / ').slice(0,REPORT_CHARS);
  if(d>=start)at(id).now.push({date:d,kind:'방문',text});else at(id).prev.push({date:d,kind:'방문',text,prev:true})}
 for(const a of c.actions){const id=targetOf(a);if(!ids.has(id)||(a.createdDate&&a.createdDate>end)||(a.state==='완료'&&(a.completedDate||'')<start))continue;const g=at(id);if(a.state!=='완료')g.open++;
  g.now.push({date:a.createdDate||a.dueDate,kind:'조치',text:clean(`[${a.type}·${a.state==='완료'?`완료 ${a.completedDate}`:a.dueDate<end?`기한 ${a.dueDate} 초과`:a.state}] ${a.content}`).slice(0,REPORT_CHARS)})}
 const all=[...map].filter(([,g])=>g.now.length>0).sort((a,b)=>b[1].now.length-a[1].now.length||b[1].open-a[1].open).slice(0,REPORT_GROUPS);
 const total=all.reduce((n,[,g])=>n+g.now.length,0);
 // 대상당 최근 k건(직전 기간은 최대 2건). 예산 안에 들어오는 가장 큰 k를 고른다.
 const build=(k:number)=>all.map(([id,g])=>{const now=[...g.now].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,k),prev=[...g.prev].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,Math.min(2,k));
  return {target:c.target(id)?.name||'',now:g.now.length,prev:g.prev.length,open:g.open,items:[...prev,...now].sort((a,b)=>a.date.localeCompare(b.date))}});
 let groups=build(1);for(const k of [8,6,4,3,2]){const g=build(k);if(JSON.stringify(g).length<=REPORT_BUDGET){groups=g;break}}
 return {groups,total,sent:groups.reduce((n,g)=>n+g.items.filter(i=>!i.prev).length,0),judged:judgedSummary(rows.filter(v=>v.status==='completed'&&v.actualDate!>=start))};
}
const days=(from:string|null,to:string)=>from?Math.round((+new Date(to)-+new Date(from))/86400000):null;
export function buildDigest(c:Context,f:BriefFactors=defaultFactors,range?:BriefRange):BriefDigest{
 const start=range?.start||c.start,end=range?.end||c.end,asOf=end<c.now?end:c.now;
 const s=scopeUnits(c),targets=c.scope.filter(t=>t.type===c.type),m=range?aggregate(targets,c.visits,start,end,c.now):c.metrics,stores=c.storeScope.filter(t=>t.status==='운영 중');
 const overdueAt=(day:string)=>c.actions.filter(a=>a.dueDate<day&&(a.state!=='완료'||(a.completedDate||'')>day)).length;
 const resolved=c.actions.filter(a=>a.state==='완료'&&a.completedDate&&a.completedDate>=start&&a.completedDate<=end).length;
 const units=f.units?s.units.map(u=>{const mm=aggregate(u.targets.filter(t=>t.type===c.type),c.visits,start,end,c.now),ids=new Set(u.targets.map(t=>t.id));return{label:u.label,rate:mm.rate,required:mm.required,completed:mm.completed,gap:mm.delayed+mm.unplanned,overdue:c.actions.filter(a=>ids.has(targetOf(a))&&a.dueDate<asOf&&(a.state!=='완료'||(a.completedDate||'')>asOf)).length,stale:u.targets.filter(t=>t.type==='store'&&t.status==='운영 중'&&(days(lastTargetVisit(t.id,c.visits),asOf)??999)>60).length}}).filter(r=>r.required>0||r.overdue>0).sort((a,b)=>(a.rate??-1)-(b.rate??-1)).slice(0,8):[];
 const status=new Map<string,number>();for(const t of targets.filter(t=>t.status==='운영 중')){const k=targetStatus(t,c.visits,c.allMetrics);status.set(k,(status.get(k)||0)+1)}
 const types=new Map<string,{overdue:number;open:number;done:number}>();if(f.types)for(const a of c.actions){if(a.createdDate&&a.createdDate>end)continue;const r=types.get(a.type)||{overdue:0,open:0,done:0};if(a.state==='완료'&&(a.completedDate||'')<=end)r.done++;else if(a.dueDate<asOf)r.overdue++;else r.open++;types.set(a.type,r)}
 const filters=[c.team&&`팀 ${c.team}`,c.part&&`파트 ${c.part}`,c.manager&&`담당 ${c.uname(c.manager)}`,c.siteId&&`현장 ${c.target(c.siteId)?.name||''}`,c.storeId&&`매장 ${c.target(c.storeId)?.name||''}`].filter(Boolean) as string[];
 const stale=f.stale?stores.filter(t=>(days(lastTargetVisit(t.id,c.visits),asOf)??999)>60):[];
 // 보고 내용: 현장·매장별로 묶은 보고 타임라인. 이번 기간 방문 보고 + 기간에 걸친 후속 조치 + 직전 같은 길이 기간의 보고(새로 생김/계속됨/해결됨 판단용).
 // 최근 것만 자르면 보고가 많은 현장 몇 곳에 쏠리므로, 대상마다 최근 몇 건씩 고르게 담고 전체가 예산을 넘으면 대상당 건수를 줄인다.
 const reports=f.reports?reportGroups(c,targets,start,end):{groups:[],total:0,sent:0,judged:judgedSummary([])};
 const trend=f.trend?weeklyTrend(targets,c.visits,end<c.now?end:c.now,c.now,8).rows:[],cur=trend.at(-1),prev=trend.at(-2);
 return {asOf,period:{start,end,label:range?.label||'조회 기간'},scope:{unit:s.title,type:typeName(c.type),targets:targets.length,filters},
  kpi:{rate:m.rate,required:m.required,completed:m.completed,planned:m.planned,gap:m.delayed+m.unplanned,gapShare:m.required?Math.round((m.delayed+m.unplanned)/m.required*100):0,overdue:f.issues?overdueAt(asOf):0,overduePrev:f.issues?overdueAt(dayShift(asOf,-7)):0,resolved:f.issues?resolved:0,stale:stale.length,staleShare:stores.length?Math.round(stale.length/stores.length*100):0,rateWeek:cur?.rate??null,rateWeekPrev:prev?.rate??null},
  units,status:[...status].map(([label,n])=>({label,n})),issueTypes:[...types].map(([type,r])=>({type,...r})).sort((a,b)=>b.overdue-a.overdue||b.open-a.open).slice(0,6),
  trend:trend.map(r=>({week:r.start,rate:r.rate,completed:r.completed,delayed:r.delayed,unplanned:r.unplanned})),
  topOverdue:f.issues?c.actions.filter(a=>a.dueDate<asOf&&(a.state!=='완료'||(a.completedDate||'')>asOf)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,5).map(a=>({target:c.label(a),type:a.type,content:a.content.slice(0,60),late:days(a.dueDate,asOf)||0,owner:c.uname(a.ownerId)})):[],
  staleTargets:stale.map(t=>({name:t.name,days:days(lastTargetVisit(t.id,c.visits),asOf)})).sort((a,b)=>(b.days??9999)-(a.days??9999)).slice(0,5),
  reports:reports.groups,reportTotal:reports.total,reportSent:reports.sent,judged:reports.judged,audience:c.me.role==='manager'?'manager':'leader'};
}
// 다이제스트 지문: 이 값이 같으면 "변경 없음"으로 보고 저장된 요약을 재사용한다.
export const digestKey=(d:BriefDigest)=>{const s=JSON.stringify(d);let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return (h>>>0).toString(36)+':'+s.length};
const eun=(w:string)=>{const c=w.charCodeAt(w.length-1);return c>=0xac00&&c<=0xd7a3?((c-0xac00)%28?'은':'는'):'은(는)'};
const pctWord=(n:number)=>n>=50?'절반 넘게':n>=30?'3분의 1 가까이':n>=15?'적지 않은 비중으로':'일부';
const wk=(d:string)=>d.slice(5).replace('-','.');
// 데모·AI 미연결용 규칙 브리핑: 성과와 위험을 함께 쓰고, 판단은 선택지와 근거로 제시한다. 원인은 단정하지 않는다.
export function ruleBrief(d:BriefDigest):AiBriefResult{
 const k=d.kpi,unit=d.scope.unit,kind=d.scope.type.replace(' 방문',''),worst=d.units[0],best=d.units.length>1?d.units.at(-1):undefined,biggest=[...d.status].sort((a,b)=>b.n-a.n)[0],topType=d.issueTypes[0];
 const rated=d.trend.filter(t=>t.rate!==null),first=rated[0],last=rated.at(-1),hi=rated.length?rated.reduce((a,b)=>(b.rate!>a.rate!?b:a)):null,lo=rated.length?rated.reduce((a,b)=>(b.rate!<a.rate!?b:a)):null;
 const dir=k.rateWeek!==null&&k.rateWeekPrev!==null?k.rateWeek-k.rateWeekPrev:null,odir=k.overdue-k.overduePrev,rising=!!(first&&last&&last.rate!>first.rate!+3),falling=!!(first&&last&&last.rate!<first.rate!-3);
 const level=k.rate===null?rich`산정 대상이 없는`:k.rate>=80?rich`${good('계획대로 관리되고 있는')}`:k.rate>=50?rich`절반 이상 따라가고 있는`:rich`${bad('목표에 못 미치는')}`;
 const scopeTxt=`${d.period.label}${d.scope.filters.length?' · '+d.scope.filters.join(' · '):''}`;
 const tasks=join([k.overdue>0&&rich`기한을 넘긴 후속 조치 ${num(k.overdue+'건')}`,k.stale>0&&rich`장기 미방문 매장(${num(k.staleShare+'%')})`],'과 ');
 const headline=rich`${scopeTxt} 기준 ${kind} ${num(d.scope.targets+'곳')}의 방문은 ${level} 상태입니다${k.rate!==null&&rich` (이행률 ${num(k.rate+'%')}, 완료 ${num(k.completed+'회차')})`}. ${rising&&rich`최근 흐름은 ${good('나아지고 있지만')}, `}${tasks.length?rich`${tasks}이 남은 과제입니다.`:rich`큰 과제는 보이지 않습니다.`}`;
 const flow=join([rated.length>=2&&first&&last&&rich`최근 ${rated.length}주 이행률은 ${num(first.rate+'%')}에서 ${num(last.rate+'%')}로 ${rising?good('올라오는'):falling?bad('내려가는'):'비슷한'} 흐름입니다${hi&&lo&&hi.week!==lo.week&&rich` (최고 ${wk(hi.week)} 주 ${num(hi.rate+'%')}, 최저 ${wk(lo.week)} 주 ${num(lo.rate+'%')})`}.`,
  dir!==null&&rich`지난주와 비교하면 이행률은 ${dir>0?good(`${dir}%p 나아졌고`):dir<0?bad(`${-dir}%p 빠졌고`):'같고'}, 기한 초과 조치는 ${odir>0?bad(`${odir}건 늘었습니다`):odir<0?good(`${-odir}건 줄었습니다`):'변화가 없습니다'}.`,
  k.required>0&&rich`필요 방문 중 ${pctWord(k.gapShare)}(${num(k.gapShare+'%')})가 계획이 없거나 날짜를 넘겼습니다. ${k.gapShare>=30?rich`일정 등록 없이 지금 속도라면 기간 안에 ${bad('따라잡기 어렵습니다')}.`:rich`남은 기간 일정으로 ${good('충분히 메울 수 있는 수준')}입니다.`}`]);
 const strengths=([best&&best.rate!==null&&rich`${best.label}${eun(best.label)} 이행률 ${num(best.rate+'%')}로 ${unit} 중 ${good('가장 안정적입니다')}. 운영 방식을 다른 ${unit}에 참고할 만합니다.`,
  rising&&last&&rich`최근 ${rated.length}주 흐름이 ${num(last.rate+'%')}까지 ${good('올라왔습니다')}. 개선 노력이 숫자로 나타나고 있습니다.`,
  k.completed>0&&rich`이번 ${d.period.label}에 완료된 방문은 ${num(k.completed+'회차')}${k.planned>0&&rich`, 일정이 잡힌 방문 ${num(k.planned+'회차')}`}입니다.`,
  k.resolved>0&&rich`같은 기간 후속 조치 ${num(k.resolved+'건')}이 ${good('완료 처리되었습니다')}.`,
  odir<0&&rich`기한 초과 조치가 지난주보다 ${good(`${-odir}건 줄었습니다`)}.`,
  k.stale===0&&rich`60일 넘게 찾지 않은 매장은 ${good('없습니다')}.`].filter(Boolean) as Rich[]).slice(0,4);
 const focus=[...d.units.slice(0,best?2:1).filter(u=>u!==best).map(u=>({name:u.label,reason:rich`${unit} 중 ${u.rate===null?'산정 대상 없음':rich`이행률 ${num(u.rate+'%')}`}${best&&u===worst&&rich`, 가장 높은 ${best.label}(${num(best.rate+'%')})과 ${bad(`${(best.rate??0)-(u.rate??0)}%p 차이`)}`}${u.overdue>0&&rich` · 기한 넘긴 조치 ${num(u.overdue+'건')}`}${u.stale>0&&rich` · 60일+ 매장 ${num(u.stale+'곳')}`}`})),
  ...d.topOverdue.slice(0,2).map(o=>({name:o.target,reason:rich`"${o.content}" 요청이 ${bad(`기한을 ${o.late}일 넘겼습니다`)} (${o.type}, ${o.owner})`}))].slice(0,4);
 const story=join([biggest&&rich`운영 중인 ${kind}은 "${biggest.label}" 상태가 가장 많습니다.`,
  worst&&best&&rich`${unit} 간 ${bad('차이가 큽니다')}. ${worst.label}${eun(worst.label)} 지연·미등록이 ${num(worst.gap+'회차')}로 많고, ${best.label}${eun(best.label)} ${num(best.gap+'회차')}입니다. 인력·동선·관리 주기 중 어느 쪽 차이인지는 현장 확인이 필요합니다.`,
  topType&&rich`후속 조치는 "${topType.type}" 요청이 가장 많습니다(진행 ${num(topType.open+'건')}, 기한 초과 ${num(topType.overdue+'건')}, 완료 ${num(topType.done+'건')})${topType.overdue>=3&&'. 같은 요청이 반복되는지 함께 볼 필요가 있습니다'}.`,
  k.stale>0&&d.staleTargets[0]&&rich`${d.staleTargets[0].name}${eun(d.staleTargets[0].name)} ${d.staleTargets[0].days===null?'방문 기록이 아직 없어':rich`${num(d.staleTargets[0].days+'일')}째 방문이 없어`} 현황 확인이 필요합니다.`]);
 const judgment=[k.overdue>0&&rich`기한 넘긴 조치 ${num(k.overdue+'건')}: ① 담당자와 새 기한을 다시 정한다 ② 이미 끝났는데 완료 처리만 안 된 건을 먼저 정리한다. 두 경우가 섞여 있을 수 있어 ②부터 확인하면 실제 미결 규모가 드러납니다.`,
  k.gapShare>=30?rich`계획 미등록·지연 ${num(k.gap+'회차')}: 이번 주 일정 등록을 지시하면 이행률을 가장 빨리 올릴 수 있습니다. 다만 인력이 부족한 ${unit}이라면 주기 조정도 함께 검토할 수 있습니다.`:k.required>0&&rich`남은 지연 회차는 현재 일정 안에서 처리 가능한 수준이라 별도 조치 없이 지켜봐도 됩니다.`,
  worst&&best&&rich`${worst.label}: 질책보다 원인 확인이 먼저입니다. ${best.label}의 방식(일정 등록 습관, 담당 범위)을 비교해 보면 판단 근거가 생깁니다.`,
  k.stale>0&&rich`60일+ 매장 ${num(k.stale+'곳')}: 전부 방문하기 어렵다면 매출·민원이 있는 곳부터 순서를 정하는 방법이 있습니다.`].filter(Boolean) as Rich[];
 const watch=[dir!==null&&rich`다음 주 이행률이 ${num(k.rateWeek+'%')}보다 오르는지`,k.overdue>0&&rich`기한 초과 조치가 ${num(k.overdue+'건')}보다 줄어드는지`,worst&&rich`${worst.label}의 지연·미등록 변화`].filter(Boolean) as Rich[];
 // 규칙 브리핑은 문장 맥락을 읽지 못하므로 보고가 몰린 곳만 묶어 보여 준다.
 const busy=d.reports.filter(g=>g.target).slice(0,3).map(g=>[g.target,g.now] as const);
 const themes:BriefTheme[]=busy.length?[{title:'보고가 몰린 곳',status:'',evidence:[],summary:rich`이번 기간 보고 ${num(d.reportTotal+'건')} 중 ${busy.map(([n,k])=>`${n} ${k}건`).join(', ')}에 보고가 많습니다. 보고 내용의 맥락 분석은 AI 연결 시 표시됩니다.`,targets:busy.map(([n])=>n)}]:[];
 // 독려 문구(규칙): 관리자에게는 실무자에게 전할 말, 잡매니저에게는 본인 격려(상세 코칭은 홈의 방문 코치).
 const cheer=d.audience==='leader'?(k.gap>0?rich`실무자에게: "일정 없는 필요 방문 ${num(k.gap+'회차')}을 이번 주에 먼저 잡아 주세요. ${rising?'최근 흐름이 좋아지고 있어요, 조금만 더 힘내 주세요.':'하나씩 잡으면 금방 따라잡을 수 있어요.'}"`:rich`실무자에게: "계획대로 잘 관리해 주고 있어요. 지금처럼만 이어 가 주세요."`):(k.rate!==null&&k.rate>=80?rich`${good('잘하고 계세요!')} 이행률 ${num(k.rate+'%')}로 담당 현장을 계획대로 챙기고 있어요.`:rich`조금만 더 힘내요. 일정 없는 방문 ${num(k.gap+'회차')}부터 잡아 두면 이행률이 바로 올라가요.`);
 return {headline,cheer,themes,flow,strengths,focus,story,judgment,watch,confidence:'rule'};
}
export async function requestBrief(d:BriefDigest,demo:boolean):Promise<{result:AiBriefResult;model:string;generatedAt:string}>{
 if(demo)return {result:ruleBrief(d),model:'데모 규칙 브리핑',generatedAt:new Date().toISOString()};
 // AI 연결이 안 되면(키 없음·지연·권한) 규칙 브리핑으로 대신하고 이유를 표기한다.
 try{const r=await fetch('/api/assist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:JSON.stringify(d),images:[],mode:'brief'})});const j=await r.json() as {draft:AiBriefResult;model?:string;generatedAt?:string;error?:string};
  if(!r.ok)throw Error(j.error||'AI 브리핑에 실패했습니다.');return {result:normalizeBrief(j.draft),model:j.model||'',generatedAt:j.generatedAt||new Date().toISOString()}}
 catch(e){return {result:ruleBrief(d),model:`규칙 브리핑 · AI 연결 안 됨(${(e as Error).message.replace(/[.\s]+$/,'')})`,generatedAt:new Date().toISOString()}}
}
type Cached={key:string;result:AiBriefResult;model:string;generatedAt:string};
function toneOf(d:BriefDigest){const k=d.kpi;if(k.rate===null)return {cls:'plain',label:'산정 전'};if(k.rate<50||k.gapShare>=50)return {cls:'bad',label:'위험'};if(k.rate<80||k.overdue>0)return {cls:'warn',label:'주의'};return {cls:'good',label:'양호'}}
// 옛 저장본(문자열 문장)도 조각 배열로 바꿔 읽는다
const readCache=(id:string):Cached|null=>{try{const v=JSON.parse(localStorage.getItem(CACHE_KEY+':'+id)||'null');return v?{...v,result:normalizeBrief(v.result)}:null}catch{return null}};
const writeCache=(id:string,v:Cached)=>{try{localStorage.setItem(CACHE_KEY+':'+id,JSON.stringify(v))}catch{}};
// weekly: 주차별 화면용. 조회 기간 안의 주차 또는 조회 기간 전체를 골라 그 기간으로 브리핑한다.
export function AiBrief({c,weekly=false}:{c:Context;weekly?:boolean}){
 const weeks=useMemo(()=>weekly?weekRanges(c.start,c.end):[],[weekly,c.start,c.end]);
 const [pick,setPick]=useState('');
 const range:BriefRange|undefined=useMemo(()=>{if(!weekly)return undefined;const w=weeks.find(x=>x.start===pick)||weeks.find(x=>x.start<=c.now&&x.end>=c.now)||weeks.at(-1);if(pick==='all'||!w)return {start:c.start,end:c.end,label:'조회 기간 전체'};return {start:w.from,end:w.to,label:`${w.start.slice(0,4)}년 ${weekTitle(w.start)}`}},[weekly,weeks,pick,c.start,c.end,c.now]);
 const cacheId=c.me.id+(weekly?':w:'+(range?.start||'')+':'+(range?.end||''):'');
 const [factors,setFactors]=useState<BriefFactors>(defaultFactors),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[out,setOut]=useState<Cached|null>(null),[ready,setReady]=useState(false);
 useEffect(()=>{setFactors(loadFactors());setOut(readCache(cacheId));setReady(true)},[cacheId]);
 const digest=useMemo(()=>buildDigest(c,factors,range),[c.scope,c.visits,c.actions,c.start,c.end,c.now,c.type,c.team,c.part,c.manager,c.siteId,c.storeId,c.metrics,factors,range]);
 const key=useMemo(()=>digestKey(digest),[digest]);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),inflight=useRef('');
 async function run(force=false){if(inflight.current===key&&!force)return;inflight.current=key;setBusy(true);setError('');
  try{const r=await requestBrief(digest,c.demo!==false);const v={...r,key};setOut(v);writeCache(cacheId,v)}catch(e){setError((e as Error).message)}finally{setBusy(false);inflight.current=''}}
 useEffect(()=>{if(!ready||out?.key===key)return;if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>run(),700);return()=>{if(timer.current)clearTimeout(timer.current)}},[ready,key,out?.key]);
 const jump=(name:string)=>{const s=scopeUnits(c),u=s.units.find(x=>x.label===name);if(u){s.drill(u.key);return}const t=c.scope.find(t=>t.name===name||name.endsWith(t.name));if(t)c.showTarget(t.id)};
 const r=out?.result,stale=!!out&&out.key!==key,k=digest.kpi,tone=toneOf(digest);
 return <section className="panel ai-brief" aria-label={weekly?'주차별 AI 현황 브리핑':'AI 현황 브리핑'}>
  <div className="panel-heading"><div><h2><Sparkles size={16}/>{weekly?'주차별 AI 현황 브리핑':'AI 현황 브리핑'}</h2><p>{weekly?'선택한 주차 또는 조회 기간 전체 기준':'현재 조회 조건 기준'} · 보고 내용 맥락 중심, 성과와 과제를 함께 정리 · 담당자 이름·연락처 미전송 · 조건이 바뀌면 자동 갱신 · 참고용</p></div>
   <div className="ai-brief-tools">{weekly&&weeks.length>0&&<select aria-label="브리핑 기간" value={pick||range?.start&&weeks.find(w=>w.from===range.start)?.start||'all'} onChange={e=>setPick(e.target.value)}>{weeks.map(w=><option key={w.start} value={w.start}>{weekTitle(w.start)} ({wk(w.from)}–{wk(w.to)})</option>)}<option value="all">조회 기간 전체</option></select>}
    {busy?<span className="ai-brief-busy"><Loader2 size={14} className="spin"/>{out?'새 조건으로 다시 쓰는 중':'브리핑 작성 중'}</span>:out&&<button type="button" className="textbtn" onClick={()=>run(true)} title="같은 조건으로 다시 생성"><RefreshCw size={13}/>다시 쓰기</button>}</div></div>
  <div className="chart-body">
   {error&&<p className="form-error" role="alert">{error} <button type="button" className="textbtn" onClick={()=>run(true)}>다시 시도</button></p>}
   {!r&&!error&&<div className="ai-brief-skeleton" aria-hidden="true"><i/><i/><i/></div>}
   {r&&<div className={'ai-brief-out'+(stale?' stale':'')} aria-live="polite">
    <div className="ai-brief-lead"><span className={'ai-brief-tone '+tone.cls}>{tone.label}</span>
     {k.rateWeek!==null&&k.rateWeekPrev!==null&&<span className={'ai-brief-delta '+(k.rateWeek>k.rateWeekPrev?'up':k.rateWeek<k.rateWeekPrev?'down':'')}>{k.rateWeek>k.rateWeekPrev?'▲':k.rateWeek<k.rateWeekPrev?'▼':'–'} 주간 이행률 {k.rateWeek}% <small>전주 {k.rateWeekPrev}%</small></span>}
     {k.resolved>0&&<span className="ai-brief-delta up">✓ 조치 완료 {k.resolved}건</span>}
     {k.overdue>0&&<span className={'ai-brief-delta '+(k.overdue>k.overduePrev?'down':'up')}>{k.overdue>k.overduePrev?'▲':k.overdue<k.overduePrev?'▼':'–'} 기한 초과 {k.overdue}건 <small>전주 {k.overduePrev}건</small></span>}</div>
    <p className="ai-brief-head"><RichText r={r.headline}/></p>
    {r.cheer.length>0&&<p className="ai-brief-cheer"><RichText r={r.cheer}/></p>}
    {r.themes.length>0&&<section className="ai-brief-themes"><h3>보고 내용에서 보이는 것 <small>{digest.reports.length}곳 보고 {digest.reportTotal}건{digest.reportTotal>digest.reportSent&&` 중 대상별 최근 ${digest.reportSent}건`} 기준</small></h3><ul>{r.themes.map((t,i)=><li key={i}><b>{t.title}</b>{t.status&&<span className={'ai-brief-theme-status '+(t.status==='해결됨'?'good':t.status==='새로 생김'||t.status==='커짐'?'bad':'')}>{t.status}</span>} <RichText r={t.summary}/>{t.evidence.length>0&&<ul className="ai-brief-evidence">{t.evidence.map((e,j)=><li key={j}>{e}</li>)}</ul>}{t.targets.length>0&&<span className="ai-brief-targets">{t.targets.slice(0,4).map(n=><button key={n} type="button" className="link" onClick={()=>jump(n)}>{n}<ChevronRight size={12}/></button>)}</span>}</li>)}</ul></section>}
    {r.flow.length>0&&<section className="ai-brief-flow"><h3>흐름</h3><p><RichText r={r.flow}/></p></section>}
    <button type="button" className="textbtn ai-brief-more" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<><ChevronUp size={14}/>접기</>:<><ChevronDown size={14}/>자세히 보기 · 잘 되는 점 {r.strengths.length} · 챙길 곳 {r.focus.length} · 판단 {r.judgment.length}</>}</button>
    {open&&<div className="ai-brief-grid">
     <section className="ai-brief-good"><h3>잘 되고 있는 것</h3><ul>{r.strengths.map((p,i)=><li key={i}><RichText r={p}/></li>)}{!r.strengths.length&&<li>이번 기간 두드러진 개선은 없습니다.</li>}</ul></section>
     <section className="ai-brief-focus"><h3>먼저 챙길 곳</h3><ol>{r.focus.map((a,i)=><li key={i}><button type="button" className="link" onClick={()=>jump(a.name)}>{a.name}<ChevronRight size={12}/></button><span><RichText r={a.reason}/></span></li>)}{!r.focus.length&&<li><span>특별히 두드러진 곳이 없습니다.</span></li>}</ol></section>
     <section><h3>무슨 일이 벌어지고 있나</h3><p>{r.story.length?<RichText r={r.story}/>:'두드러진 현상이 없습니다.'}</p></section>
     <section><h3>선택지와 판단</h3><ul className="ai-brief-decide">{r.judgment.map((p,i)=><li key={i}><RichText r={p}/></li>)}{!r.judgment.length&&<li>지금 방식을 유지하면 됩니다.</li>}</ul>{r.watch.length>0&&<><h3>다음에 볼 것</h3><ul>{r.watch.map((p,i)=><li key={i}><RichText r={p}/></li>)}</ul></>}</section>
    </div>}
    <p className="ai-brief-meta">{out!.model} · {new Date(out!.generatedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} 작성 · {digest.period.label} {wk(digest.period.start)}–{wk(digest.period.end)}{stale&&' · 조건이 바뀌어 다시 쓰는 중'}{r.confidence==='low'&&' · 확신 낮음'}</p>
   </div>}
  </div>
 </section>;
}
// 관리자 도구: 브리핑에 넣을 요소. 이 브라우저에 저장되며 바꾸면 다음 브리핑부터 반영된다.
export function AiBriefSettings({c}:{c:Context}){
 const [f,setF]=useState<BriefFactors>(defaultFactors);useEffect(()=>setF(loadFactors()),[]);
 if(!['admin','director'].includes(c.me.role))return null;
 const items:[keyof BriefFactors,string,string][]=[['reports','보고 내용 맥락','방문 보고·후속 조치 본문에서 반복되는 주제, 현장 분위기, 새로 생긴 문제를 읽습니다(담당자 이름·연락처 제외)'],['units','조직 비교','팀·파트·잡매니저 단위의 이행률·지연 비교, 가장 안정적인 곳과 챙길 곳'],['trend','주별 흐름','최근 8주 이행률 흐름과 전주 대비'],['issues','후속 조치','기한 넘긴 조치·완료된 조치와 전주 대비'],['types','이슈 유형','어떤 유형의 요청이 많고 반복되는지'],['stale','장기 미방문','60일 넘게 찾지 않은 매장']];
 const set=(k:keyof BriefFactors,v:boolean)=>{const n={...f,[k]:v};setF(n);try{localStorage.setItem(FACTORS_KEY,JSON.stringify(n))}catch{}};
 return <section className="panel"><PanelTitle title="AI 현황 브리핑 요소" sub="대시보드·주차별 브리핑에 넣을 분석 요소입니다. 브리핑은 자동이며 여기서 끄고 켜기만 합니다. 이 설정은 이 PC·브라우저에 저장됩니다."/><div className="settings-blocks">{items.map(([k,t,p])=><label key={k} className="checkbox ai-brief-factor"><input type="checkbox" checked={f[k]} onChange={e=>set(k,e.target.checked)}/><div><h3>{t}</h3><p>{p}</p></div></label>)}</div></section>;
}
