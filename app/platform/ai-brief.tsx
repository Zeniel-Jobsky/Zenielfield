'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Sparkles,Loader2,ChevronRight,RefreshCw,ChevronDown,ChevronUp} from 'lucide-react';
import type {Context} from './context';
import {PanelTitle} from '../ui';
import {aggregate,dayShift,lastTargetVisit,targetOf,targetStatus,typeName,weeklyTrend} from './model';
import {scopeUnits} from './decision';
import {weekRanges,weekTitle} from '../briefing/model';
import {rich,join,num,bad,good,toRich,RichText,type Rich} from './rich';
// AI 현황 브리핑: 비서가 결정권자에게 보고하듯 균형 있게 쓴다. "지금 상태 → 흐름 → 잘 되고 있는 것 → 챙길 곳 → 무슨 일이 벌어지나 → 선택지와 판단 → 다음에 볼 것".
// 버튼 없이 자동이다. 화면 집계(다이제스트)의 지문이 같으면 저장본을 쓰고, 바뀌면 다시 만들고, 없으면 만든다.
// 기간은 대시보드(조회 기간) 또는 주차별 화면(선택 주차·조회 기간 전체)처럼 비정형이라 DB에 저장하지 않고, 브라우저에 지문별로만 보관한다. 원문 메모·개인정보는 보내지 않는다.
export type BriefFactors={units:boolean;issues:boolean;stale:boolean;trend:boolean;types:boolean};
export const defaultFactors:BriefFactors={units:true,issues:true,stale:true,trend:true,types:true};
const FACTORS_KEY='zf-ai-brief-factors',CACHE_KEY='zf-ai-brief-cache';
export function loadFactors():BriefFactors{try{return {...defaultFactors,...JSON.parse(localStorage.getItem(FACTORS_KEY)||'{}')}}catch{return defaultFactors}}
export type BriefRange={start:string;end:string;label:string};
export type BriefDigest={asOf:string;period:{start:string;end:string;label:string};scope:{unit:string;type:string;targets:number;filters:string[]};
 kpi:{rate:number|null;required:number;completed:number;planned:number;gap:number;gapShare:number;overdue:number;overduePrev:number;resolved:number;stale:number;staleShare:number;rateWeek:number|null;rateWeekPrev:number|null};
 units:{label:string;rate:number|null;required:number;completed:number;gap:number;overdue:number;stale:number}[];status:{label:string;n:number}[];issueTypes:{type:string;overdue:number;open:number;done:number}[];
 trend:{week:string;rate:number|null;completed:number;delayed:number;unplanned:number}[];topOverdue:{target:string;type:string;content:string;late:number;owner:string}[];staleTargets:{name:string;days:number|null}[]};
// 문장은 모두 강조 조각 배열(Rich). AI도 같은 모양으로 돌려준다.
export type AiBriefResult={headline:Rich;flow:Rich;strengths:Rich[];focus:{name:string;reason:Rich}[];story:Rich;judgment:Rich[];watch:Rich[];confidence:string};
export function normalizeBrief(x:any):AiBriefResult{const list=(v:unknown)=>Array.isArray(v)?v.map(toRich).filter(r=>r.length):[];return {headline:toRich(x?.headline),flow:toRich(x?.flow),strengths:list(x?.strengths),focus:Array.isArray(x?.focus)?x.focus.filter((f:any)=>f&&typeof f.name==='string').map((f:any)=>({name:f.name,reason:toRich(f.reason)})):[],story:toRich(x?.story),judgment:list(x?.judgment),watch:list(x?.watch),confidence:typeof x?.confidence==='string'?x.confidence:''}}
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
 const trend=f.trend?weeklyTrend(targets,c.visits,end<c.now?end:c.now,c.now,8).rows:[],cur=trend.at(-1),prev=trend.at(-2);
 return {asOf,period:{start,end,label:range?.label||'조회 기간'},scope:{unit:s.title,type:typeName(c.type),targets:targets.length,filters},
  kpi:{rate:m.rate,required:m.required,completed:m.completed,planned:m.planned,gap:m.delayed+m.unplanned,gapShare:m.required?Math.round((m.delayed+m.unplanned)/m.required*100):0,overdue:f.issues?overdueAt(asOf):0,overduePrev:f.issues?overdueAt(dayShift(asOf,-7)):0,resolved:f.issues?resolved:0,stale:stale.length,staleShare:stores.length?Math.round(stale.length/stores.length*100):0,rateWeek:cur?.rate??null,rateWeekPrev:prev?.rate??null},
  units,status:[...status].map(([label,n])=>({label,n})),issueTypes:[...types].map(([type,r])=>({type,...r})).sort((a,b)=>b.overdue-a.overdue||b.open-a.open).slice(0,6),
  trend:trend.map(r=>({week:r.start,rate:r.rate,completed:r.completed,delayed:r.delayed,unplanned:r.unplanned})),
  topOverdue:f.issues?c.actions.filter(a=>a.dueDate<asOf&&(a.state!=='완료'||(a.completedDate||'')>asOf)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,5).map(a=>({target:c.label(a),type:a.type,content:a.content.slice(0,60),late:days(a.dueDate,asOf)||0,owner:c.uname(a.ownerId)})):[],
  staleTargets:stale.map(t=>({name:t.name,days:days(lastTargetVisit(t.id,c.visits),asOf)})).sort((a,b)=>(b.days??9999)-(a.days??9999)).slice(0,5)};
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
 return {headline,flow,strengths,focus,story,judgment,watch,confidence:'rule'};
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
  <div className="panel-heading"><div><h2><Sparkles size={16}/>{weekly?'주차별 AI 현황 브리핑':'AI 현황 브리핑'}</h2><p>{weekly?'선택한 주차 또는 조회 기간 전체 기준':'현재 조회 조건 기준'} · 성과와 과제를 함께 정리 · 화면 집계만 전달, 원문·개인정보 미전송 · 조건이 바뀌면 자동 갱신 · 참고용</p></div>
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
 const items:[keyof BriefFactors,string,string][]=[['units','조직 비교','팀·파트·잡매니저 단위의 이행률·지연 비교, 가장 안정적인 곳과 챙길 곳'],['trend','주별 흐름','최근 8주 이행률 흐름과 전주 대비'],['issues','후속 조치','기한 넘긴 조치·완료된 조치와 전주 대비'],['types','이슈 유형','어떤 유형의 요청이 많고 반복되는지'],['stale','장기 미방문','60일 넘게 찾지 않은 매장']];
 const set=(k:keyof BriefFactors,v:boolean)=>{const n={...f,[k]:v};setF(n);try{localStorage.setItem(FACTORS_KEY,JSON.stringify(n))}catch{}};
 return <section className="panel"><PanelTitle title="AI 현황 브리핑 요소" sub="대시보드·주차별 브리핑에 넣을 분석 요소입니다. 브리핑은 자동이며 여기서 끄고 켜기만 합니다. 이 설정은 이 PC·브라우저에 저장됩니다."/><div className="settings-blocks">{items.map(([k,t,p])=><label key={k} className="checkbox ai-brief-factor"><input type="checkbox" checked={f[k]} onChange={e=>set(k,e.target.checked)}/><div><h3>{t}</h3><p>{p}</p></div></label>)}</div></section>;
}
