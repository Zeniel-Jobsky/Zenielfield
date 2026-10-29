'use client';
import {AiMark} from './ai-mark';
import {daysBetween as days,mmdd as wk} from '../lib/date';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Sparkles,Loader2,ChevronRight,RefreshCw,ChevronDown,ChevronUp} from 'lucide-react';
import type {Context} from './context';
import {PanelTitle} from '../ui';
import {type FieldVisit,aggregate,dayShift,lastTargetVisit,targetOf,targetStatus,typeName,weeklyTrend} from './model';
import {scopeUnits} from './decision';
import {weekRanges,weekTitle} from '../briefing/model';
import {rich,join,num,bad,good,toRich,RichText,type Rich} from './rich';
import {collapseRepeats} from '../lib/dedupe-text';
import {isCurrentJudgment,maskText,levelLabel} from './judgment';
import {callAssist,aiDownReason} from './ai-assist';
import {LEVEL_ORDER,latestJudgments,staleStores,overdueAt,targetFacts,attentionOf} from './status';
import {nudgeRole,type NudgeRole} from './nudge';
import {shapeBrief} from './brief-shape';
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
 judged:{reports:number;unjudged:number;levels:Record<string,number>;latest:Record<string,number>;attention:{target:string;level:string;assessment:string;date:string}[];byType:{type:string;n:number;urgent:number;worse:number;ongoing:number;resolved:number;customer:number;targets:number}[]};
 // audience: 보는 사람. manager면 본인에게 하는 코칭(어디를 더 갈지·격려), leader면 결정권자 보고 + 실무자에게 전할 독려 문구.
 audience:'manager'|'leader';
 // role: 보는 사람의 직급(지침 4-4-A). 브리핑 초점과 이름 노출이 다르다(팀장·사업부장은 개인 이름 없음).
 role:NudgeRole;
 // tellTo: 전할 말을 받는 사람(입력으로 정한다, 모델이 쓰지 않는다)
 tellTo:string;
 // problems: 확인 대상(공통 현황 attentionOf)마다 조직 경로(부서›파트›매니저›현장·매장)와 방문 상태·저장된 판정·기한 넘긴 조치 내용
 problems:{부서:string;파트:string;매니저:string;대상:string;구분:string;방문상태:string[];마지막방문:string|null;판정:string;판단:string;이슈:string[];기한넘긴조치:string[]}[]};
// 보고 묶음: 대상 하나의 이번 기간 보고 수(now)·직전 기간 보고 수(prev)·진행 중 조치 수(open)와 날짜순 보고. prev:true는 직전 기간 보고.
export type ReportItem={date:string;kind:'방문'|'조치';text:string;prev?:boolean};
export type ReportGroup={target:string;now:number;prev:number;open:number;items:ReportItem[]};
// 문장은 모두 강조 조각 배열(Rich). AI도 같은 모양으로 돌려준다.
// status: 직전 기간 대비 새로 생김·계속됨·해결됨·커짐. evidence: 근거 보고의 "날짜 대상: 짧은 요지".
export type BriefTheme={title:string;status:string;summary:Rich;evidence:string[];targets:string[]};
// cheer: 보는 사람이 잡매니저면 본인에게 하는 격려·독려 한마디, 관리자면 실무자에게 전할 독려 문구 제안.
export type AiBriefResult={headline:Rich;cheer:Rich;themes:BriefTheme[];flow:Rich;strengths:Rich[];focus:{name:string;reason:Rich}[];story:Rich;judgment:Rich[];watch:Rich[];confidence:string;
 // 지시 가이드(누구에게 무엇을)·이행 가이드(순서대로 할 일)
 directive?:{to:string;say:Rich}[];steps?:Rich[]};
export function normalizeBrief(x:any):AiBriefResult{return shapeBrief(x) as AiBriefResult}
// 보고 본문 정리: 연락처를 지우고 반복 말을 줄여 한 건당 길이를 제한한다.
// 보고 본문 가림은 판정과 같은 규칙(maskText) + 반복 말 정리
const clean=(s:string)=>collapseRepeats(maskText(s));
// 보고 원문 예산(직급별): 위로 갈수록 원문보다 판정 집계로 패턴을 본다. 입력이 크면 응답이 느려져 시간 제한을 넘는다.
const REPORT_CHARS=220,REPORT_LIMIT:Record<string,{budget:number;groups:number}>={manager:{budget:12000,groups:30},partlead:{budget:12000,groups:30},lead:{budget:8000,groups:20},director:{budget:6000,groups:15}};
// 보고 본문은 거르지 않고 그대로 보낸다. 문제 여부는 방문 기록에 저장된 판정(judgment)을 붙여 보내고, 미판정이면 AI가 내용을 읽고 판단한다(빈도·키워드로 추측하지 않음).
const judgedText=(j:FieldVisit['judgment'])=>!j||!isCurrentJudgment(j)?'판정: 미판정':`판정: ${j.level} — ${j.assessment}`+(j.issues.length?' / 이슈: '+j.issues.map(i=>`[${i.type}·${i.severity}·${i.flow}${i.customerRequest?'·고객사 요청':''}] ${i.summary}`).join(' / '):'');
// 판정 집계: levels=보고 시점 수준 분포, latest=대상별 가장 최근 판정의 수준 분포(지금 상태), byType=이슈 유형별 건수·긴급·악화·지속·해결.
export function judgedSummary(visits:FieldVisit[],nameOf:(id:string)=>string=id=>id):BriefDigest['judged']{
 const levels:Record<string,number>={},last=latestJudgments(visits),by=new Map<string,{n:number;urgent:number;worse:number;ongoing:number;resolved:number;customer:number;t:Set<string>}>();let unjudged=0;
 for(const v of visits){const j=v.judgment;if(!isCurrentJudgment(j)){unjudged++;continue}levels[j.level]=(levels[j.level]||0)+1;const id=targetOf(v);
  for(const i of j.issues){const b=by.get(i.type)||{n:0,urgent:0,worse:0,ongoing:0,resolved:0,customer:0,t:new Set<string>()};b.n++;if(i.severity==='긴급')b.urgent++;if(i.flow==='악화')b.worse++;if(i.flow==='지속')b.ongoing++;if(i.flow==='해결')b.resolved++;if(i.customerRequest)b.customer++;b.t.add(id);by.set(i.type,b)}}
 const latest:Record<string,number>={};for(const v of last.values())latest[v.judgment!.level]=(latest[v.judgment!.level]||0)+1;
 // 지금 상태가 위험·주의인 대상(가장 최근 판정 기준). 순서는 공통 현황(status.ts)과 같은 판정 수준 → 최근 보고일.
 const attention=[...last].filter(([,v])=>LEVEL_ORDER[v.judgment!.level]).sort((a,b)=>LEVEL_ORDER[b[1].judgment!.level]-LEVEL_ORDER[a[1].judgment!.level]||(b[1].actualDate||'').localeCompare(a[1].actualDate||'')).map(([id,v])=>({target:nameOf(id),level:v.judgment!.level,assessment:v.judgment!.assessment,date:v.actualDate||''}));
 return {reports:visits.length,unjudged,levels,latest,attention,byType:[...by].map(([type,b])=>({type,n:b.n,urgent:b.urgent,worse:b.worse,ongoing:b.ongoing,resolved:b.resolved,customer:b.customer,targets:b.t.size})).sort((a,b)=>b.n-a.n)};
}
export function reportGroups(c:Context,targets:Context['scope'],start:string,end:string){
 const len=Math.max(1,days(start,end)??0)+1,prevStart=dayShift(start,-len),ids=new Set(targets.map(t=>t.id));
 const map=new Map<string,{now:ReportItem[];prev:ReportItem[];open:number}>();const at=(id:string)=>{let g=map.get(id);if(!g){g={now:[],prev:[],open:0};map.set(id,g)}return g};
 const rows=c.visits.filter(v=>v.actualDate&&v.actualDate>=prevStart&&v.actualDate<=end&&ids.has(targetOf(v)));
 for(const v of rows){const d=v.actualDate!,id=targetOf(v),detail=clean(v.detail||''),notes=clean(v.notes||'');
  const text=[v.purpose&&`목적: ${v.purpose}`,detail&&`상세: ${detail}`,notes&&`특이사항: ${notes}`,!detail&&!notes&&'(본문 없음)',judgedText(v.judgment)].filter(Boolean).join(' / ').slice(0,REPORT_CHARS);
  if(d>=start)at(id).now.push({date:d,kind:'방문',text});else at(id).prev.push({date:d,kind:'방문',text,prev:true})}
 for(const a of c.actions){const id=targetOf(a);if(!ids.has(id)||(a.createdDate&&a.createdDate>end)||(a.state==='완료'&&(a.completedDate||'')<start))continue;const g=at(id);if(a.state!=='완료')g.open++;
  g.now.push({date:a.createdDate||a.dueDate,kind:'조치',text:clean(`[${a.type}·${a.state==='완료'?`완료 ${a.completedDate}`:a.dueDate<end?`기한 ${a.dueDate} 초과`:a.state}] ${a.content}`).slice(0,REPORT_CHARS)})}
 // 담는 순서: 저장된 최근 판정 위험·주의 대상 먼저 → 보고 많은 순 → 열린 조치 많은 순
 const lim=REPORT_LIMIT[nudgeRole(c.me.role)],judgedNow=latestJudgments(rows),lv=(id:string)=>LEVEL_ORDER[judgedNow.get(id)?.judgment?.level||'']||0;
 const all=[...map].filter(([,g])=>g.now.length>0).sort((a,b)=>lv(b[0])-lv(a[0])||b[1].now.length-a[1].now.length||b[1].open-a[1].open).slice(0,lim.groups);
 const total=all.reduce((n,[,g])=>n+g.now.length,0);
 // 대상당 최근 k건(직전 기간은 최대 2건). 예산 안에 들어오는 가장 큰 k를 고른다.
 const build=(k:number)=>all.map(([id,g])=>{const now=[...g.now].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,k),prev=[...g.prev].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,Math.min(2,k));
  return {target:c.target(id)?.name||'',now:g.now.length,prev:g.prev.length,open:g.open,items:[...prev,...now].sort((a,b)=>a.date.localeCompare(b.date))}});
 let groups=build(1);for(const k of [8,6,4,3,2]){const g=build(k);if(JSON.stringify(g).length<=lim.budget){groups=g;break}}
 return {groups,total,sent:groups.reduce((n,g)=>n+g.items.filter(i=>!i.prev).length,0),judged:judgedSummary(rows.filter(v=>v.status==='completed'&&v.actualDate!>=start),id=>c.target(id)?.name||'')};
}
export function buildDigest(c:Context,f:BriefFactors=defaultFactors,range?:BriefRange):BriefDigest{
 const start=range?.start||c.start,end=range?.end||c.end,asOf=end<c.now?end:c.now;
 const s=scopeUnits(c),targets=c.scope.filter(t=>t.type===c.type),m=range?aggregate(targets,c.visits,start,end,c.now):c.metrics,stores=c.storeScope.filter(t=>t.status==='운영 중');
 const resolved=c.actions.filter(a=>a.state==='완료'&&a.completedDate&&a.completedDate>=start&&a.completedDate<=end).length;
 const units=f.units?s.units.map(u=>{const mm=aggregate(u.targets.filter(t=>t.type===c.type),c.visits,start,end,c.now),ids=new Set(u.targets.map(t=>t.id));return{label:u.label,rate:mm.rate,required:mm.required,completed:mm.completed,gap:mm.delayed+mm.unplanned,overdue:overdueAt(c.actions,asOf,ids),stale:staleStores(u.targets,c.visits,asOf).length}}).filter(r=>r.required>0||r.overdue>0).sort((a,b)=>(a.rate??-1)-(b.rate??-1)).slice(0,8):[];
 const status=new Map<string,number>();for(const t of targets.filter(t=>t.status==='운영 중')){const k=targetStatus(t,c.visits,c.allMetrics);status.set(k,(status.get(k)||0)+1)}
 const types=new Map<string,{overdue:number;open:number;done:number}>();if(f.types)for(const a of c.actions){if(a.createdDate&&a.createdDate>end)continue;const r=types.get(a.type)||{overdue:0,open:0,done:0};if(a.state==='완료'&&(a.completedDate||'')<=end)r.done++;else if(a.dueDate<asOf)r.overdue++;else r.open++;types.set(a.type,r)}
 const filters=[c.team&&`팀 ${c.team}`,c.part&&`파트 ${c.part}`,c.manager&&`담당 ${c.uname(c.manager)}`,c.siteId&&`현장 ${c.target(c.siteId)?.name||''}`,c.storeId&&`매장 ${c.target(c.storeId)?.name||''}`].filter(Boolean) as string[];
 const stale=f.stale?staleStores(stores,c.visits,asOf):[];
 // 보고 내용: 현장·매장별로 묶은 보고 타임라인. 이번 기간 방문 보고 + 기간에 걸친 후속 조치 + 직전 같은 길이 기간의 보고(새로 생김/계속됨/해결됨 판단용).
 // 최근 것만 자르면 보고가 많은 현장 몇 곳에 쏠리므로, 대상마다 최근 몇 건씩 고르게 담고 전체가 예산을 넘으면 대상당 건수를 줄인다.
 const reports=f.reports?reportGroups(c,targets,start,end):{groups:[],total:0,sent:0,judged:judgedSummary([])};
 const trend=f.trend?weeklyTrend(targets,c.visits,end<c.now?end:c.now,c.now,8).rows:[],cur=trend.at(-1),prev=trend.at(-2);
 return {asOf,period:{start,end,label:range?.label||'조회 기간'},scope:{unit:s.title,type:typeName(c.type),targets:targets.length,filters},
  kpi:{rate:m.rate,required:m.required,completed:m.completed,planned:m.planned,gap:m.delayed+m.unplanned,gapShare:m.required?Math.round((m.delayed+m.unplanned)/m.required*100):0,overdue:f.issues?overdueAt(c.actions,asOf):0,overduePrev:f.issues?overdueAt(c.actions,dayShift(asOf,-7)):0,resolved:f.issues?resolved:0,stale:stale.length,staleShare:stores.length?Math.round(stale.length/stores.length*100):0,rateWeek:cur?.rate??null,rateWeekPrev:prev?.rate??null},
  units,status:[...status].map(([label,n])=>({label,n})),issueTypes:[...types].map(([type,r])=>({type,...r})).sort((a,b)=>b.overdue-a.overdue||b.open-a.open).slice(0,6),
  trend:trend.map(r=>({week:r.start,rate:r.rate,completed:r.completed,delayed:r.delayed,unplanned:r.unplanned})),
  topOverdue:f.issues?c.actions.filter(a=>a.dueDate<asOf&&(a.state!=='완료'||(a.completedDate||'')>asOf)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,5).map(a=>({target:c.label(a),type:a.type,content:a.content.slice(0,60),late:days(a.dueDate,asOf)||0,owner:c.uname(a.ownerId)})):[],
  staleTargets:stale.map(x=>({name:x.target.name,days:x.days})).sort((a,b)=>(b.days??9999)-(a.days??9999)).slice(0,5),
  reports:reports.groups,reportTotal:reports.total,reportSent:reports.sent,judged:reports.judged,audience:c.me.role==='manager'?'manager':'leader',role:nudgeRole(c.me.role),tellTo:CHEER_TO[nudgeRole(c.me.role)],problems:problemMap(c,targets)};
}
// 다이제스트 지문: 이 값이 같으면 "변경 없음"으로 보고 저장된 요약을 재사용한다.
export const digestKey=(d:BriefDigest)=>{const s=JSON.stringify(d);let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return (h>>>0).toString(36)+':'+s.length};
const eun=(w:string)=>{const c=w.charCodeAt(w.length-1);return c>=0xac00&&c<=0xd7a3?((c-0xac00)%28?'은':'는'):'은(는)'};
// AI 없이 만드는 브리핑(데모·AI 연결 안 됨): 판정하지 않는다(DC-JUDGMENT). 숫자 사실과 저장된 종합 판정만 옮긴다.
// 상태 평가(양호·위험·따라잡기 어려움)·우선순위·선택지 판단은 쓰지 않고, 판단은 AI 연결 시에만 표시한다.
// 전할 말의 대상: 바로 아래 직급
const CHEER_TO:Record<NudgeRole,string>={manager:'함께 챙길 한마디',partlead:'잡매니저에게 전할 말',lead:'파트장에게 전할 말',director:'팀장에게 전할 말'};
export function ruleBrief(d:BriefDigest):AiBriefResult{
 const k=d.kpi,j=d.judged,unit=d.scope.unit,kind=d.scope.type.replace(' 방문',''),top=d.units.length>1?[...d.units].filter(u=>u.rate!==null).sort((a,b)=>b.rate!-a.rate!)[0]:undefined;
 const rated=d.trend.filter(t=>t.rate!==null),first=rated[0],last=rated.at(-1);
 const dir=k.rateWeek!==null&&k.rateWeekPrev!==null?k.rateWeek-k.rateWeekPrev:null,odir=k.overdue-k.overduePrev;
 const scopeTxt=`${d.period.label}${d.scope.filters.length?' · '+d.scope.filters.join(' · '):''}`;
 const judgedTxt=j.reports?rich` 보고 ${num(j.reports+'건')} 중 판정 ${num((j.reports-j.unjudged)+'건')}, 지금 바로 확인 ${num((j.latest['위험']||0)+'곳')}·조치 필요 ${num((j.latest['주의']||0)+'곳')}이에요.`:'';
 const what=(p:BriefDigest['problems'][number])=>[p.판단||'',...p.방문상태,p.기한넘긴조치[0]?'기한 넘긴 조치 '+p.기한넘긴조치[0]:''].filter(Boolean).join(', ');
 // 상황 판단(숫자 없이): 문제 지도 첫 대상과 그 문제, 이번 주 할 일
 const p0=d.problems[0],place=(p:BriefDigest['problems'][number])=>[p.부서,p.매니저&&p.매니저+' 담당',p.대상].filter(Boolean).join(' › ');
 const hasDelay=d.problems.some(p=>p.방문상태.some(x=>x.includes('기한 지남')||x.includes('일정 없음'))),hasLate=d.problems.some(p=>p.기한넘긴조치.length),hasJudged=d.problems.some(p=>p.판정==='위험'||p.판정==='주의');
 const steps:Rich[]=[hasDelay&&rich`기한 지났거나 일정 없는 필요 방문 대상부터 방문 날짜를 확정해요(이번 주 안 등록).`,hasLate&&rich`기한 넘긴 조치마다 담당자와 새 완료일을 정해 기록해요.`,hasJudged&&rich`바로 확인·조치 필요 대상은 다음 방문에서 이전 이슈가 해결됐는지 확인해 보고해요.`].filter(Boolean) as Rich[];
 const headline=p0?rich`${place(p0)}에서 ${what(p0)||'확인할 일'}이 있어요. ${steps[0]||''}`:rich`지금 바로 챙길 문제는 보이지 않아요. 이번 주 일정이 비어 있는 곳만 확인해요.`;
 // 지시 가이드: 관리자 화면은 담당자 개인별(첫 문제 대상), 잡매니저는 본인 할 일
 const byOwner=new Map<string,BriefDigest['problems'][number]>();for(const p of d.problems){const k=p.매니저||'담당 미지정';if(!byOwner.has(k))byOwner.set(k,p)}
 const directive=d.role==='manager'?d.problems.slice(0,3).map(p=>({to:'본인',say:rich`${p.대상}: ${what(p)} — 이번 주 안에 처리해요.`})):[...byOwner].slice(0,3).map(([who,p])=>({to:who,say:rich`${p.대상}: ${what(p)} — 이번 주 완료일을 정해 주세요.`}));
 const flow=join([rated.length>=2&&first&&last&&rich`최근 ${rated.length}주 이행률 ${num(first.rate+'%')} → ${num(last.rate+'%')}.`,
  dir!==null&&rich`지난주 대비 이행률 ${num((dir>0?'+':'')+dir+'%p')}, 기한 초과 조치 ${num((odir>0?'+':'')+odir+'건')}.`,
  k.required>0&&rich`필요 방문 ${num(k.required+'회차')} 중 ${num(k.gapShare+'%')}가 계획 없음·지연이에요.`]);
 const strengths=([k.completed>0&&rich`완료된 방문 ${num(k.completed+'회차')}${k.planned>0&&rich`, 일정이 잡힌 방문 ${num(k.planned+'회차')}`}.`,
  k.resolved>0&&rich`완료 처리된 후속 조치 ${num(k.resolved+'건')}.`,
  top&&rich`${unit} 중 이행률이 가장 높은 곳은 ${top.label}(${num(top.rate+'%')}).`,
  (j.latest['정상']||0)>0&&rich`지금 판정이 정상인 곳 ${num(j.latest['정상']+'곳')}.`].filter(Boolean) as Rich[]).slice(0,4);
 // 먼저 챙길 곳: 저장된 판정이 위험·주의인 대상만(코드가 순위를 매기지 않는다)
 // 직급별 초점: 잡매니저는 판정 위험·주의 대상, 그 위는 하위 단위(파트장=잡매니저, 팀장=파트, 사업부장=팀) 중 일정 잡을 회차가 있는 곳(많은 순)
 const focus=d.role==='manager'?j.attention.slice(0,4).map(a=>({name:a.target,reason:rich`${wk(a.date)} ${levelLabel(a.level)}${a.assessment?' — '+a.assessment:''}`})):
  [...d.units].filter(u=>u.gap>0||u.overdue>0).sort((a,b)=>b.gap-a.gap||b.overdue-a.overdue).slice(0,3).map(u=>{const p=d.problems.find(x=>x.부서===u.label||x.파트===u.label||x.매니저.split('·').includes(u.label));return {name:u.label,reason:p?rich`${p.대상}: ${what(p)}${p.매니저&&!p.매니저.split('·').includes(u.label)?` (${p.매니저} 담당)`:''}`:rich`일정 잡을 필요 방문이나 기한 넘긴 조치가 있어요.`}});
 // 무슨 일이 벌어지고 있나(규칙): 문제 지도에서 앞의 3곳을 '팀 › 담당 › 대상: 무엇' 문장으로(숫자 나열 없이 사실만)
 const story=join(d.problems.slice(0,3).map(p=>rich`${[p.부서,p.매니저&&p.매니저+' 담당',p.대상].filter(Boolean).join(' › ')}: ${what(p)}.`));
 const themes:BriefTheme[]=j.byType.slice(0,3).map(t=>({title:t.type,status:'',evidence:[],summary:rich`판정 이슈 ${num(t.n+'건')}, 대상 ${num(t.targets+'곳')}${t.worse>0&&rich`, 악화 ${num(t.worse+'건')}`}${t.ongoing>0&&rich`, 지속 ${num(t.ongoing+'건')}`}${t.resolved>0&&rich`, 해결 ${num(t.resolved+'건')}`}.`,targets:[]}));
 const watch=[rich`비어 있던 필요 방문이 일정으로 바뀌었는지`,hasLate&&rich`기한 넘긴 조치가 완료나 새 완료일로 정리됐는지`,hasJudged&&rich`바로 확인·조치 필요 대상의 다음 방문 판정`].filter(Boolean) as Rich[];
 // 전할 말(규칙): 받는 사람 머리말·숫자 없이 할 일 하나
 const cheer=p0?rich`${p0.대상}처럼 일정이 비거나 기한이 지난 곳부터 이번 주 안에 정리해 주세요.`:rich`지금처럼 방문 일정을 미리 잡아 두면 돼요.`;
 return {directive,steps,headline,cheer,themes,flow,strengths,focus,story,judgment:[],watch,confidence:'rule'};
}
// 문제 지도: 어느 부서·어느 매니저·어느 매장에 무슨 문제가 있는지. 대상 선택·순서는 공통 현황(저장된 판정 → 이른 기한)과 같다.
function problemMap(c:Context,targets:Context['scope']){
 const facts=targetFacts(targets,c.visits,c.actions,aggregate(targets,c.visits,c.start,c.end,c.now).slots,c.now);
 const late=new Map<string,string[]>();for(const a of c.actions){if(a.state==='완료'||a.dueDate>=c.now)continue;const id=targetOf(a),l=late.get(id)||[];if(l.length<2)l.push(`[${a.type}] ${a.content.slice(0,50)}`);late.set(id,l)}
 return attentionOf(facts.values()).slice(0,25).map(f=>{const t=f.target,j=f.judgment;return {부서:t.team,파트:t.part,매니저:t.managerIds.map(c.uname).filter(Boolean).join('·'),대상:t.name,구분:t.type==='store'?'매장':'현장',
  방문상태:[f.delayed.length?'필요 방문 기한 지남':'',f.unplanned.length?'필요 방문 일정 없음':'',f.upcoming?'일정 잡힘 '+f.upcoming:''].filter(Boolean),마지막방문:f.lastVisit,
  판정:j?.level||'미판정',판단:j?.assessment||'',이슈:(j?.issues||[]).map(i=>`${i.type}·${i.flow}${i.severity==='긴급'?'·긴급':''}`),기한넘긴조치:late.get(t.id)||[]}});
}
// AI에 보내는 입력: 건수·비율은 지표 카드가 이미 보여 주므로 보내지 않는다(받지 않으면 세지 않는다).
// 숫자는 방향(늘었음·줄었음·같음)과 있음/없음으로만 바꾸고, 보고 원문 맥락·저장된 판정·단위 이름은 그대로 보낸다.
const way=(a:number|null|undefined,b:number|null|undefined)=>a==null||b==null?'비교 없음':a>b?'늘었음':a<b?'줄었음':'같음';
export function aiInput(d:BriefDigest){const k=d.kpi,j=d.judged;
 return {asOf:d.asOf,period:d.period,scope:{unit:d.scope.unit,type:d.scope.type,filters:d.scope.filters},role:d.role,tellTo:d.tellTo,
  signals:{방문이행_지난주대비:way(k.rateWeek,k.rateWeekPrev),기한초과조치_지난주대비:way(k.overdue,k.overduePrev),일정잡을회차:k.gap>0?'있음':'없음',기한초과조치:k.overdue>0?'있음':'없음',완료된조치:k.resolved>0?'있음':'없음',장기미방문매장:k.stale>0?'있음':'없음'},
  units:d.units.map(u=>({이름:u.label,일정잡을회차:u.gap>0?'있음':'없음',기한초과조치:u.overdue>0?'있음':'없음',장기미방문매장:u.stale>0?'있음':'없음'})),
  issueTypes:d.issueTypes.map(t=>({유형:t.type,기한초과:t.overdue>0?'있음':'없음',진행중:t.open>0?'있음':'없음'})),
  topOverdue:d.topOverdue.map(o=>({대상:o.target,유형:o.type,내용:o.content,...(o.owner?{담당:o.owner}:{})})),
  staleTargets:d.staleTargets.map(t=>t.name),
  judged:{지금상태:Object.keys(j.latest).filter(l=>j.latest[l]>0).map(levelLabel),주의대상:j.attention.map(a=>({대상:a.target,수준:levelLabel(a.level),판단:a.assessment})),이슈유형:j.byType.map(t=>({유형:t.type,흐름:[t.worse&&'악화',t.ongoing&&'지속',t.resolved&&'해결',t.urgent&&'긴급'].filter(Boolean)}))},
  problems:d.problems.map(p=>({...p,판정:levelLabel(p.판정)})),reports:d.reports}
}
export async function requestBrief(d:BriefDigest,demo:boolean):Promise<{result:AiBriefResult;model:string;generatedAt:string}>{
 if(demo)return {result:ruleBrief(d),model:'데모 규칙 브리핑',generatedAt:new Date().toISOString()};
 // AI 호출은 다른 AI 기능과 같은 경로(callAssist): 크레딧·키 문제로 막힌 탭은 10분간 다시 부르지 않고, 오류 문구도 같은 규칙으로 줄인다.
 // AI가 안 되면 사실만 담은 브리핑으로 대신하고 이유를 표기한다.
 const fallback=(why:string)=>({result:ruleBrief(d),model:`규칙 브리핑 · AI 연결 안 됨(${why})`,generatedAt:new Date().toISOString()});
 const down=aiDownReason();if(down)return fallback(down);
 try{const r=await callAssist({text:JSON.stringify(aiInput(d)),images:[],mode:'brief'});return {result:normalizeBrief(r.draft),model:r.model,generatedAt:r.generatedAt}}
 catch(e){return fallback((e as Error).message)}
}
type Cached={key:string;result:AiBriefResult;model:string;generatedAt:string};
// 머리 칩: 저장된 판정의 지금 상태(대상별 최근 판정)만 쓴다. 이행률로 위험·주의를 정하지 않는다.
function toneOf(d:BriefDigest){const l=d.judged.latest;if(l['위험'])return {cls:'warn',label:`바로 확인 ${l['위험']}곳`};if(l['주의'])return {cls:'plain',label:`조치 필요 ${l['주의']}곳`};if(l['정상']||l['관찰'])return {cls:'good',label:'바로 확인할 곳 없음'};return {cls:'plain',label:'미판정'}}
// 옛 저장본(문자열 문장)도 조각 배열로 바꿔 읽는다
const readCache=(id:string):Cached|null=>{try{const v=JSON.parse(localStorage.getItem(CACHE_KEY+':'+id)||'null');return v?{...v,result:normalizeBrief(v.result)}:null}catch{return null}};
const writeCache=(id:string,v:Cached)=>{try{localStorage.setItem(CACHE_KEY+':'+id,JSON.stringify(v))}catch{}};
// 생성 결과는 유지하고 화면에서만 단계적으로 공개한다. 현장 간 공통 근거는 따로 표시한다.
function ReportSite({name,themes,jump,canJump}:{name:string;themes:BriefTheme[];jump:(name:string)=>void;canJump:boolean}){
 const [open,setOpen]=useState(false),id=useId();
 return <li className="ai-brief-site">
  <div className="ai-brief-site-heading"><div><h4>{canJump?<button type="button" className="link" onClick={()=>jump(name)}>{name}<ChevronRight size={14}/></button>:name}</h4><p>{themes.map(t=>t.title).join(' · ')}</p></div>
   <button type="button" className="brief-disclosure" aria-expanded={open} aria-controls={id} aria-label={`${name} ${open?'간략히 보기':'더 보기'}`} onClick={()=>setOpen(!open)}>{open?'간략히 보기':'더 보기'}{open?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button></div>
  <div id={id} className="ai-brief-site-detail" hidden={!open}>{themes.map((t,i)=><section key={i}>
   <div className="ai-brief-topic-heading"><h5>{t.title}</h5>{t.status&&<span className={'ai-brief-theme-status '+(t.status==='해결됨'?'good':t.status==='새로 생김'||t.status==='커짐'?'bad':'')}>{t.status}</span>}</div>
   {t.targets.length>1&&<p className="ai-brief-shared">여러 현장 공통 주제 · {t.targets.join(' · ')}</p>}
   <p><RichText r={t.summary}/></p>
   {t.evidence.length>0&&<div className="ai-brief-evidence"><h6>{t.targets.length>1?'주제 공통 근거':'보고 근거'}</h6><ul>{t.evidence.map((e,j)=><li key={j}>{e}</li>)}</ul></div>}
  </section>)}</div>
 </li>;
}
// 브리핑 표시: 늘 보이는 것 = 현황 한 줄 → 무슨 일이 벌어지고 있나(가장 눈에 띄게) → 먼저 챙길 곳(누르면 이동).
// 세부(보고 주제·판단 ①②·전할 말·다음 주·지표 변화·근거)는 보고 싶은 사람만 펼친다.
function BriefPresentation({out,digest,stale,jump,targetNames}:{out:Cached;digest:BriefDigest;stale:boolean;jump:(name:string)=>void;targetNames:Set<string>}){
 const [detailsOpen,setDetailsOpen]=useState(false),id=useId();
 const r=out.result,k=digest.kpi,tone=toneOf(digest),ai=!out.model.includes('규칙');
 const sites=useMemo(()=>{const groups=new Map<string,BriefTheme[]>();for(const t of r.themes)for(const name of new Set(t.targets.length?t.targets:['현장 미지정'])){const list=groups.get(name)||[];list.push(t);groups.set(name,list)}return [...groups]},[r.themes]);
 const peek=[sites.length&&'보고 주제',r.judgment.length&&'판단',r.cheer.length&&CHEER_TO[digest.role],r.watch.length&&'다음 주 볼 것'].filter(Boolean).join(' · ');
 return <div className={'ai-brief-out'+(stale?' stale':'')}>
  <p className="ai-brief-head"><span className={'ai-brief-tone '+tone.cls}><AiMark size={12}/>{tone.label}</span><RichText r={r.headline}/></p>
  <section className="ai-brief-story"><h3>{ai&&<Sparkles size={14}/>}무슨 일이 벌어지고 있나</h3><p>{r.story.length?<RichText r={r.story}/>:'보고에서 새로 짚을 일이 없어요.'}</p></section>
  <section className="ai-brief-focus"><h3>{ai&&<Sparkles size={14}/>}먼저 챙길 곳</h3><ol>{r.focus.map((a,i)=><li key={i}><button type="button" className="link" onClick={()=>jump(a.name)}>{a.name}<ChevronRight size={14}/></button><span><RichText r={a.reason}/></span></li>)}{!r.focus.length&&<li><span>{digest.role==='manager'?'바로 확인·조치 필요로 남은 곳이 없어요(저장된 판정 기준).':'일정 잡을 회차나 기한 넘긴 조치가 있는 곳이 없어요.'}</span></li>}</ol></section>
  {(r.directive?.length||0)>0&&<section className="ai-brief-guide"><h3>{ai&&<Sparkles size={14}/>}지시 가이드 <small>누구에게 무엇을</small></h3><ul>{r.directive!.map((x,i)=><li key={i}><button type="button" className="link" onClick={()=>jump(x.to)}>{x.to}<ChevronRight size={14}/></button><span><RichText r={x.say}/></span></li>)}</ul></section>}
  {(r.steps?.length||0)>0&&<section className="ai-brief-guide"><h3>{ai&&<Sparkles size={14}/>}이행 가이드 <small>순서대로</small></h3><ol className="ai-brief-steps">{r.steps!.map((x,i)=><li key={i}><b>{i+1}</b><span><RichText r={x}/></span></li>)}</ol></section>}
  <button type="button" className="brief-disclosure" aria-expanded={detailsOpen} aria-controls={id+'-details'} onClick={()=>setDetailsOpen(!detailsOpen)}>{detailsOpen?'세부 내용 접기':'세부 내용 보기'}{!detailsOpen&&peek&&<small className="brief-disclosure-peek"> · {peek}</small>}{detailsOpen?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>
  <div id={id+'-details'} className="ai-brief-details" hidden={!detailsOpen}>
   <dl className="ai-brief-dl">
    {sites.length>0&&<div><dt>보고 주제</dt><dd><ul className="ai-brief-sites">{detailsOpen&&sites.map(([name,themes])=><ReportSite key={name} name={name} themes={themes} jump={jump} canJump={targetNames.has(name)}/>)}</ul></dd></div>}
    {r.cheer.length>0&&<div><dt>{CHEER_TO[digest.role]}</dt><dd><RichText r={r.cheer}/></dd></div>}
    {r.watch.length>0&&<div><dt>다음 주 볼 것</dt><dd><ul>{r.watch.map((p,i)=><li key={i}><RichText r={p}/></li>)}</ul></dd></div>}
    {(k.rateWeek!==null&&k.rateWeekPrev!==null||k.resolved>0||k.overdue>0)&&<div><dt>지표 변화</dt><dd className="ai-brief-lead">
     {k.rateWeek!==null&&k.rateWeekPrev!==null&&<span className={'ai-brief-delta '+(k.rateWeek>k.rateWeekPrev?'up':k.rateWeek<k.rateWeekPrev?'down':'')}>{k.rateWeek>k.rateWeekPrev?'▲':k.rateWeek<k.rateWeekPrev?'▼':'–'} 주간 이행률 {k.rateWeek}% <small>전주 {k.rateWeekPrev}%</small></span>}
     {k.resolved>0&&<span className="ai-brief-delta up">✓ 조치 완료 {k.resolved}건</span>}
     {k.overdue>0&&<span className={'ai-brief-delta '+(k.overdue>k.overduePrev?'down':'up')}>{k.overdue>k.overduePrev?'▲':k.overdue<k.overduePrev?'▼':'–'} 기한 초과 {k.overdue}건 <small>전주 {k.overduePrev}건</small></span>}
    </dd></div>}
    <div><dt>근거</dt><dd className="ai-brief-meta">{digest.period.label} {wk(digest.period.start)}–{wk(digest.period.end)} · 보고 {digest.reportTotal}건(판정 {digest.judged.reports-digest.judged.unjudged}건) · {out.model} · {new Date(out.generatedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} · 연락처 미전송</dd></div>
   </dl>
  </div>
  {(out.model.includes('규칙')||r.confidence==='low'||stale)&&<p className="ai-brief-source">{[out.model.includes('규칙')&&out.model,r.confidence==='low'&&'확신 낮음',stale&&'조건이 바뀌어 다시 쓰는 중'].filter(Boolean).join(' · ')}</p>}
 </div>;
}

// weekly: 주차별 화면용. 조회 기간 안의 주차 또는 조회 기간 전체를 골라 그 기간으로 브리핑한다.
// 만드는 동안 단계 표시: 데이터 모으기 → 보고 읽고 분석하기(AI) → 정리하기, 경과 초와 진행 막대(보통 10초, 최대 20초)
function BriefProgress({startedAt,demo}:{startedAt:number;demo:boolean}){
 const [now,setNow]=useState(Date.now());useEffect(()=>{const h=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(h)},[]);
 const sec=Math.max(0,(now-startedAt)/1000),steps=['조회 범위 데이터 모으기','보고 읽고 분석하기','브리핑 정리하기'],at=demo?2:sec<1?0:sec<9?1:2;
 return <div className="ai-brief-progress" role="status" aria-live="polite"><ol>{steps.map((s,i)=><li key={s} className={i<at?'done':i===at?'on':''}>{s}</li>)}</ol><div className="ai-brief-progress-bar" aria-hidden="true"><i style={{width:Math.min(95,sec/10*100)+'%'}}/></div><small>{sec.toFixed(0)}초 · 보통 10초 안팎</small></div>;
}
export function AiBrief({c,weekly=false}:{c:Context;weekly?:boolean}){
 const weeks=useMemo(()=>weekly?weekRanges(c.start,c.end):[],[weekly,c.start,c.end]);
 const [pick,setPick]=useState('');
 const range:BriefRange|undefined=useMemo(()=>{if(!weekly)return undefined;const w=weeks.find(x=>x.start===pick)||weeks.find(x=>x.start<=c.now&&x.end>=c.now)||weeks.at(-1);if(pick==='all'||!w)return {start:c.start,end:c.end,label:'조회 기간 전체'};return {start:w.from,end:w.to,label:`${w.start.slice(0,4)}년 ${weekTitle(w.start)}`}},[weekly,weeks,pick,c.start,c.end,c.now]);
 const cacheId=c.me.id+(weekly?':w:'+(range?.start||'')+':'+(range?.end||''):'');
 const [factors,setFactors]=useState<BriefFactors>(defaultFactors),[busy,setBusy]=useState(false),[startedAt,setStartedAt]=useState(0),[error,setError]=useState(''),[out,setOut]=useState<Cached|null>(null),[ready,setReady]=useState(false);
 useEffect(()=>{setFactors(loadFactors());setOut(readCache(cacheId));setReady(true)},[cacheId]);
 const digest=useMemo(()=>buildDigest(c,factors,range),[c.scope,c.visits,c.actions,c.start,c.end,c.now,c.type,c.team,c.part,c.manager,c.siteId,c.storeId,c.metrics,factors,range]);
 const key=useMemo(()=>digestKey(digest),[digest]);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),inflight=useRef('');
 async function run(force=false){if(inflight.current===key&&!force)return;inflight.current=key;setBusy(true);setStartedAt(Date.now());setError('');
  try{const r=await requestBrief(digest,c.demo!==false);const v={...r,key};setOut(v);writeCache(cacheId,v)}catch(e){setError((e as Error).message)}finally{setBusy(false);inflight.current=''}}
 useEffect(()=>{if(!ready||out?.key===key)return;if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>run(),700);return()=>{if(timer.current)clearTimeout(timer.current)}},[ready,key,out?.key]);
 const jump=(name:string)=>{const s=scopeUnits(c),u=s.units.find(x=>x.label===name);if(u){s.drill(u.key);return}const who=c.data.users.find(x=>x.name===name);if(who&&c.me.role!=='manager'){c.setManager(who.id);return}const t=c.scope.find(t=>t.name===name||name.endsWith(t.name));if(t)c.showTarget(t.id)};
 const targetNames=useMemo(()=>new Set(c.scope.map(t=>t.name)),[c.scope]);
 const r=out?.result,stale=!!out&&out.key!==key;
 return <section className={'panel ai-brief'+(weekly?' ai-brief-weekly':'')} aria-busy={busy||(!r&&!error)} aria-label={weekly?'주차별 AI 핵심요약':'AI 핵심 요약'}>
  <div className="panel-heading"><div><h2><Sparkles size={16}/>{weekly?'주차별 AI 핵심요약':'AI 핵심 요약'}</h2><p>{weekly?'선택한 주차 또는 조회 기간 전체 기준':'현재 조회 조건 기준'} · 요약과 제안 · 참고용</p></div>
   <div className="ai-brief-tools">{weekly&&weeks.length>0&&<select aria-label="브리핑 기간" value={pick||range?.start&&weeks.find(w=>w.from===range.start)?.start||'all'} onChange={e=>setPick(e.target.value)}>{weeks.map(w=><option key={w.start} value={w.start}>{weekTitle(w.start)} ({wk(w.from)}–{wk(w.to)})</option>)}<option value="all">조회 기간 전체</option></select>}
    {busy?<span className="ai-brief-busy" role="status"><Loader2 size={14} className="spin"/>{out?'새 조건으로 다시 쓰는 중':'브리핑 작성 중'}</span>:out&&<button type="button" className="textbtn" onClick={()=>run(true)} title="같은 조건으로 다시 생성"><RefreshCw size={14}/>다시 쓰기</button>}</div></div>
  <div className="chart-body">
   {error&&<p className="form-error" role="alert">{error} <button type="button" className="textbtn" onClick={()=>run(true)}>다시 시도</button></p>}
   {busy&&<BriefProgress startedAt={startedAt} demo={c.demo!==false}/>}
   {!r&&!error&&!busy&&<div role="status"><span className="sr-only">브리핑을 준비하고 있어요.</span><div className="ai-brief-skeleton" aria-hidden="true"><i/><i/><i/></div></div>}
   {out&&r&&<BriefPresentation key={cacheId+':'+key+':'+out.generatedAt} out={out} digest={digest} stale={stale} jump={jump} targetNames={targetNames}/>}
  </div>
 </section>;
}
// 관리자 도구: 브리핑에 넣을 요소. 이 브라우저에 저장되며 바꾸면 다음 브리핑부터 반영된다.
export function AiBriefSettings({c}:{c:Context}){
 const [f,setF]=useState<BriefFactors>(defaultFactors);useEffect(()=>setF(loadFactors()),[]);
 if(!['admin','director'].includes(c.me.role))return null;
 const items:[keyof BriefFactors,string,string][]=[['reports','보고 내용 맥락','방문 보고·후속 조치 본문에서 반복되는 주제, 현장 분위기, 새로 생긴 문제를 읽어요(담당자 이름·연락처 제외)'],['units','조직 비교','팀·파트·잡매니저 단위의 이행률·지연 비교, 가장 안정적인 곳과 챙길 곳'],['trend','주별 흐름','최근 8주 이행률 흐름과 전주 대비'],['issues','후속 조치','기한 넘긴 조치·완료된 조치와 전주 대비'],['types','이슈 유형','어떤 유형의 요청이 많고 반복되는지'],['stale','장기 미방문','60일 넘게 찾지 않은 매장']];
 const set=(k:keyof BriefFactors,v:boolean)=>{const n={...f,[k]:v};setF(n);try{localStorage.setItem(FACTORS_KEY,JSON.stringify(n))}catch{}};
 return <section className="panel"><PanelTitle title="AI 현황 브리핑 요소" sub="대시보드·주차별 브리핑에 넣을 분석 요소예요. 브리핑은 자동이며 여기서 끄고 켜기만 해요. 이 설정은 이 PC·브라우저에 저장돼요."/><div className="settings-blocks">{items.map(([k,t,p])=><label key={k} className="checkbox ai-brief-factor"><input type="checkbox" checked={f[k]} onChange={e=>set(k,e.target.checked)}/><div><h3>{t}</h3><p>{p}</p></div></label>)}</div></section>;
}
