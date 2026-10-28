'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Sparkles,Loader2,ChevronRight,RefreshCw,ChevronDown,ChevronUp} from 'lucide-react';
import type {Context} from './context';
import {PanelTitle} from '../ui';
import {aggregate,dayShift,lastTargetVisit,targetOf,targetStatus,typeName,weeklyTrend} from './model';
import {scopeUnits} from './decision';
// AI 현황 브리핑: 비서가 부장에게 말하듯 "지금 상황 → 흐름 → 어디가 문제 → 무슨 일이 벌어지는지 → 판단 → 다음 주 볼 것"을 글로 준다.
// 버튼 없이 자동이다. 화면 집계(다이제스트)의 지문이 같으면 저장된 요약을 그대로 쓰고, 바뀌면 다시 만들고, 없으면 만든다. 원문 메모·개인정보는 보내지 않는다.
export type BriefFactors={units:boolean;issues:boolean;stale:boolean;trend:boolean;types:boolean};
export const defaultFactors:BriefFactors={units:true,issues:true,stale:true,trend:true,types:true};
const FACTORS_KEY='zf-ai-brief-factors',CACHE_KEY='zf-ai-brief-cache';
export function loadFactors():BriefFactors{try{return {...defaultFactors,...JSON.parse(localStorage.getItem(FACTORS_KEY)||'{}')}}catch{return defaultFactors}}
export type BriefDigest={asOf:string;period:{start:string;end:string};scope:{unit:string;type:string;targets:number;filters:string[]};
 kpi:{rate:number|null;required:number;completed:number;gap:number;gapShare:number;overdue:number;overduePrev:number;stale:number;staleShare:number;rateWeek:number|null;rateWeekPrev:number|null};
 units:{label:string;rate:number|null;required:number;completed:number;gap:number;overdue:number;stale:number}[];status:{label:string;n:number}[];issueTypes:{type:string;overdue:number;open:number;done:number}[];
 trend:{week:string;rate:number|null;completed:number;delayed:number;unplanned:number}[];topOverdue:{target:string;type:string;content:string;late:number;owner:string}[];staleTargets:{name:string;days:number|null}[]};
export type AiBriefResult={headline:string;flow:string;focus:{name:string;reason:string}[];story:string;judgment:string[];watch:string[];confidence:string};
const days=(from:string|null,to:string)=>from?Math.round((+new Date(to)-+new Date(from))/86400000):null;
export function buildDigest(c:Context,f:BriefFactors=defaultFactors):BriefDigest{
 const s=scopeUnits(c),targets=c.scope.filter(t=>t.type===c.type),m=c.metrics,stores=c.storeScope.filter(t=>t.status==='운영 중');
 const overdueAt=(day:string)=>c.actions.filter(a=>a.dueDate<day&&(a.state!=='완료'||(a.completedDate||'')>day)).length;
 const units=f.units?s.units.map(u=>{const mm=aggregate(u.targets.filter(t=>t.type===c.type),c.visits,c.start,c.end,c.now),ids=new Set(u.targets.map(t=>t.id));return{label:u.label,rate:mm.rate,required:mm.required,completed:mm.completed,gap:mm.delayed+mm.unplanned,overdue:c.actions.filter(a=>ids.has(targetOf(a))&&a.state!=='완료'&&a.dueDate<c.now).length,stale:u.targets.filter(t=>t.type==='store'&&t.status==='운영 중'&&(days(lastTargetVisit(t.id,c.visits),c.now)??999)>60).length}}).filter(r=>r.required>0||r.overdue>0).sort((a,b)=>(a.rate??-1)-(b.rate??-1)).slice(0,8):[];
 const status=new Map<string,number>();for(const t of targets.filter(t=>t.status==='운영 중')){const k=targetStatus(t,c.visits,c.allMetrics);status.set(k,(status.get(k)||0)+1)}
 const types=new Map<string,{overdue:number;open:number;done:number}>();if(f.types)for(const a of c.actions){const r=types.get(a.type)||{overdue:0,open:0,done:0};if(a.state==='완료')r.done++;else if(a.dueDate<c.now)r.overdue++;else r.open++;types.set(a.type,r)}
 const filters=[c.team&&`팀 ${c.team}`,c.part&&`파트 ${c.part}`,c.manager&&`담당 ${c.uname(c.manager)}`,c.siteId&&`현장 ${c.target(c.siteId)?.name||''}`,c.storeId&&`매장 ${c.target(c.storeId)?.name||''}`].filter(Boolean) as string[];
 const stale=f.stale?stores.filter(t=>(days(lastTargetVisit(t.id,c.visits),c.now)??999)>60):[];
 const trend=f.trend?weeklyTrend(targets,c.visits,c.now,c.now,8).rows:[],cur=trend.at(-1),prev=trend.at(-2);
 return {asOf:c.now,period:{start:c.start,end:c.end},scope:{unit:s.title,type:typeName(c.type),targets:targets.length,filters},
  kpi:{rate:m.rate,required:m.required,completed:m.completed,gap:m.delayed+m.unplanned,gapShare:m.required?Math.round((m.delayed+m.unplanned)/m.required*100):0,overdue:f.issues?overdueAt(c.now):0,overduePrev:f.issues?overdueAt(dayShift(c.now,-7)):0,stale:stale.length,staleShare:stores.length?Math.round(stale.length/stores.length*100):0,rateWeek:cur?.rate??null,rateWeekPrev:prev?.rate??null},
  units,status:[...status].map(([label,n])=>({label,n})),issueTypes:[...types].map(([type,r])=>({type,...r})).sort((a,b)=>b.overdue-a.overdue||b.open-a.open).slice(0,6),
  trend:trend.map(r=>({week:r.start,rate:r.rate,completed:r.completed,delayed:r.delayed,unplanned:r.unplanned})),
  topOverdue:f.issues?c.actions.filter(a=>a.state!=='완료'&&a.dueDate<c.now).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,5).map(a=>({target:c.label(a),type:a.type,content:a.content.slice(0,60),late:days(a.dueDate,c.now)||0,owner:c.uname(a.ownerId)})):[],
  staleTargets:stale.map(t=>({name:t.name,days:days(lastTargetVisit(t.id,c.visits),c.now)})).sort((a,b)=>(b.days??9999)-(a.days??9999)).slice(0,5)};
}
// 다이제스트 지문: 이 값이 같으면 "변경 없음"으로 보고 저장된 요약을 재사용한다.
export const digestKey=(d:BriefDigest)=>{const s=JSON.stringify(d);let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return (h>>>0).toString(36)+':'+s.length};
// 받침에 따라 은/는 선택
const eun=(w:string)=>{const c=w.charCodeAt(w.length-1);return c>=0xac00&&c<=0xd7a3?((c-0xac00)%28?'은':'는'):'은(는)'};
const pctWord=(n:number)=>n>=50?'절반 넘게':n>=30?'3분의 1 가까이':n>=15?'적지 않은 비중으로':'일부';
// 데모·AI 미연결용 규칙 브리핑: 숫자를 나열하지 않고 흐름·집중·의미·판단 문장으로 만든다. 추정은 하지 않는다.
export function ruleBrief(d:BriefDigest):AiBriefResult{
 const k=d.kpi,unit=d.scope.unit,kind=d.scope.type.replace(' 방문',''),worst=d.units[0],best=d.units.at(-1),biggest=[...d.status].sort((a,b)=>b.n-a.n)[0],topType=d.issueTypes[0];
 const rated=d.trend.filter(t=>t.rate!==null),first=rated[0],last=rated.at(-1),hi=rated.length?rated.reduce((a,b)=>(b.rate!>a.rate!?b:a)):null,lo=rated.length?rated.reduce((a,b)=>(b.rate!<a.rate!?b:a)):null;
 const dir=k.rateWeek!==null&&k.rateWeekPrev!==null?k.rateWeek-k.rateWeekPrev:null,odir=k.overdue-k.overduePrev;
 const level=k.rate===null?'산정 대상이 없는':k.rate>=80?'관리가 되고 있는':k.rate>=50?'절반 남짓 따라가는':'많이 밀려 있는';
 const headline=`${d.scope.filters.length?d.scope.filters.join(' · ')+' 기준 ':''}${kind} ${d.scope.targets}곳의 방문은 현재 ${level} 상태입니다${k.rate!==null?` (이행률 ${k.rate}%)`:''}. ${k.overdue>0?`기한을 넘긴 후속 조치가 ${k.overdue}건 남아 있고, `:'기한을 넘긴 후속 조치는 없고, '}${k.stale>0?`60일 넘게 찾지 않은 매장이 ${pctWord(k.staleShare)} 있습니다.`:'장기 미방문 매장은 없습니다.'}`;
 const flow=[rated.length>=2&&first&&last?`최근 ${rated.length}주 이행률은 ${first.rate}%에서 ${last.rate}%로 ${last.rate!>first.rate!+3?'올라오는':last.rate!<first.rate!-3?'내려가는':'제자리걸음'} 흐름입니다${hi&&lo&&hi.week!==lo.week?` (가장 좋았던 주 ${hi.week.slice(5).replace('-','.')} ${hi.rate}%, 가장 낮았던 주 ${lo.week.slice(5).replace('-','.')} ${lo.rate}%)`:''}.`:'',
  dir!==null?`지난주와 견주면 ${dir>0?`${dir}%p 나아졌고`:dir<0?`${-dir}%p 빠졌고`:'변화가 없고'}, 기한 초과 이슈는 ${odir>0?`${odir}건 늘었습니다`:odir<0?`${-odir}건 줄었습니다`:'그대로입니다'}.`:'',
  k.required>0?`필요한 방문 가운데 ${pctWord(k.gapShare)}(${k.gapShare}%)가 아직 계획이 없거나 날짜를 넘겼습니다. ${k.gapShare>=30?'이대로면 이번 기간 이행률은 회복되기 어렵습니다.':'남은 기간 안에 메울 수 있는 수준입니다.'}`:''].filter(Boolean).join(' ');
 const focus=[...d.units.slice(0,3).map(u=>({name:u.label,reason:`${unit} 중 ${u.rate===null?'산정 대상 없음':`이행률 ${u.rate}%`}${worst&&best&&u===worst&&best!==worst?` — 가장 잘 되는 ${best.label}(${best.rate}%)과 ${(best.rate??0)-(u.rate??0)}%p 차이`:''}${u.overdue?` · 기한 넘긴 조치 ${u.overdue}건`:''}${u.stale?` · 60일+ 매장 ${u.stale}곳`:''}`})),
  ...d.topOverdue.slice(0,2).map(o=>({name:o.target,reason:`"${o.content}" 요청이 기한을 ${o.late}일 넘겼습니다 (${o.type}, ${o.owner})`}))].slice(0,5);
 const story=[biggest?`운영 중인 ${kind} 가운데 "${biggest.label}" 상태가 가장 많습니다.`:'',
  worst&&d.units.length>1?`문제는 고르게 퍼진 것이 아니라 ${worst.label}에 몰려 있습니다${d.units.length>=2&&worst.gap>0?` (지연·미등록 ${worst.gap}회차)`:''}.`:'',
  topType?`후속 조치는 "${topType.type}" 유형이 가장 많고 그중 ${topType.overdue}건이 기한을 넘겼습니다${topType.overdue>=3?'. 같은 요청이 반복되는지 확인이 필요합니다':''}.`:'',
  k.stale>0&&d.staleTargets[0]?`${d.staleTargets[0].name}${eun(d.staleTargets[0].name)} ${d.staleTargets[0].days===null?'방문 기록이 아예 없어':`${d.staleTargets[0].days}일째 방문이 없어`} 현황 자체를 모르는 상태입니다.`:''].filter(Boolean).join(' ');
 const judgment=[k.overdue>0?`기한 넘긴 조치 ${k.overdue}건은 이번 주 안에 담당자와 기한을 다시 정하고, 끝난 것은 완료 처리하게 하십시오.`:'',
  k.gapShare>=30?`계획이 없는 대상부터 이번 주 방문 일정을 등록하게 하십시오. 이행률을 올리는 가장 빠른 길입니다.`:k.required>0?'남은 지연 회차는 이번 주 일정에 넣으면 됩니다.':'',
  worst&&d.units.length>1?`${worst.label} 책임자와 원인을 짚어 보십시오. 인력 공백인지, 동선인지, 주기 설정이 과한지는 수치만으로는 알 수 없습니다.`:'',
  k.stale>0?`60일 넘은 매장 ${k.stale}곳은 다음 주 방문을 우선 배정하십시오.`:''].filter(Boolean);
 const watch=[dir!==null?`다음 주 이행률이 ${k.rateWeek}%보다 오르는지`:'', k.overdue>0?`기한 초과 이슈가 ${k.overdue}건 아래로 내려가는지`:'', worst?`${worst.label}의 지연·미등록이 줄어드는지`:''].filter(Boolean);
 return {headline,flow,focus,story,judgment,watch,confidence:'rule'};
}
export async function requestBrief(d:BriefDigest,demo:boolean):Promise<{result:AiBriefResult;model:string;generatedAt:string}>{
 if(demo)return {result:ruleBrief(d),model:'데모 규칙 브리핑',generatedAt:new Date().toISOString()};
 // AI 연결이 안 되면(키 없음·지연·권한) 규칙 브리핑으로 대신하고 이유를 표기한다. 브리핑 칸이 오류만 남지 않게 한다.
 try{const r=await fetch('/api/assist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:JSON.stringify(d),images:[],mode:'brief'})});const j=await r.json() as {draft:AiBriefResult;model?:string;generatedAt?:string;error?:string};
  if(!r.ok)throw Error(j.error||'AI 브리핑에 실패했습니다.');return {result:j.draft,model:j.model||'',generatedAt:j.generatedAt||new Date().toISOString()}}
 catch(e){return {result:ruleBrief(d),model:`규칙 브리핑 · AI 연결 안 됨(${(e as Error).message.replace(/[.s]+$/,'')})`,generatedAt:new Date().toISOString()}}
}
type Cached={key:string;result:AiBriefResult;model:string;generatedAt:string};
const readCache=(id:string):Cached|null=>{try{return JSON.parse(localStorage.getItem(CACHE_KEY+':'+id)||'null')}catch{return null}};
const writeCache=(id:string,v:Cached)=>{try{localStorage.setItem(CACHE_KEY+':'+id,JSON.stringify(v))}catch{}};
export function AiBrief({c}:{c:Context}){
 const [factors,setFactors]=useState<BriefFactors>(defaultFactors),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[out,setOut]=useState<Cached|null>(null),[ready,setReady]=useState(false);
 useEffect(()=>{setFactors(loadFactors());setOut(readCache(c.me.id));setReady(true)},[c.me.id]);
 const digest=useMemo(()=>buildDigest(c,factors),[c.scope,c.visits,c.actions,c.start,c.end,c.now,c.type,c.team,c.part,c.manager,c.siteId,c.storeId,c.metrics,factors]);
 const key=useMemo(()=>digestKey(digest),[digest]);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),inflight=useRef('');
 async function run(force=false){if(inflight.current===key&&!force)return;inflight.current=key;setBusy(true);setError('');
  try{const r=await requestBrief(digest,c.demo!==false);const v={...r,key};setOut(v);writeCache(c.me.id,v)}catch(e){setError((e as Error).message)}finally{setBusy(false);inflight.current=''}}
 // 변경 감지: 지문이 저장본과 같으면 그대로, 다르거나 없으면 잠시 뒤 다시 만든다(필터를 연달아 바꾸는 동안은 기다림).
 useEffect(()=>{if(!ready||out?.key===key)return;if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>run(),700);return()=>{if(timer.current)clearTimeout(timer.current)}},[ready,key,out?.key]);
 const jump=(name:string)=>{const s=scopeUnits(c),u=s.units.find(x=>x.label===name);if(u){s.drill(u.key);return}const t=c.scope.find(t=>t.name===name||name.endsWith(t.name));if(t)c.showTarget(t.id)};
 const r=out?.result,stale=!!out&&out.key!==key;
 return <section className="panel ai-brief" aria-label="AI 현황 브리핑">
  <div className="panel-heading"><div><h2><Sparkles size={16}/>AI 현황 브리핑</h2><p>현재 조회 조건 기준 · 화면 집계만 전달, 원문·개인정보 미전송 · 조건이 바뀌면 자동 갱신 · 참고용</p></div>
   <div className="ai-brief-tools">{busy?<span className="ai-brief-busy"><Loader2 size={14} className="spin"/>{out?'새 조건으로 다시 쓰는 중':'브리핑 작성 중'}</span>:out&&<button type="button" className="textbtn" onClick={()=>run(true)} title="같은 조건으로 다시 생성"><RefreshCw size={13}/>다시 쓰기</button>}</div></div>
  <div className="chart-body">
   {error&&<p className="form-error" role="alert">{error} <button type="button" className="textbtn" onClick={()=>run(true)}>다시 시도</button></p>}
   {!r&&!error&&<div className="ai-brief-skeleton" aria-hidden="true"><i/><i/><i/></div>}
   {r&&<div className={'ai-brief-out'+(stale?' stale':'')} aria-live="polite">
    <p className="ai-brief-head">{r.headline}</p>
    {r.flow&&<section><h3>흐름</h3><p>{r.flow}</p></section>}
    {/* 기본은 현황·흐름까지. 챙길 곳·현상·판단은 자세히 보기로 펼친다. */}
    <button type="button" className="textbtn ai-brief-more" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<><ChevronUp size={14}/>접기</>:<><ChevronDown size={14}/>자세히 보기 · 먼저 챙길 곳 {r.focus.length}곳 · 판단 {r.judgment.length}건</>}</button>
    {open&&<div className="ai-brief-grid">
     <section><h3>먼저 챙길 곳</h3><ol>{r.focus.map((a,i)=><li key={i}><button type="button" className="link" onClick={()=>jump(a.name)}>{a.name}<ChevronRight size={12}/></button><span>{a.reason}</span></li>)}{!r.focus.length&&<li><span>특별히 두드러진 곳이 없습니다.</span></li>}</ol></section>
     <section><h3>무슨 일이 벌어지고 있나</h3><p>{r.story||'두드러진 현상이 없습니다.'}</p></section>
     <section><h3>판단</h3><ul className="ai-brief-decide">{r.judgment.map((p,i)=><li key={i}>{p}</li>)}{!r.judgment.length&&<li>지금은 유지하면 됩니다.</li>}</ul>{r.watch.length>0&&<><h3>다음 주 볼 것</h3><ul>{r.watch.map((p,i)=><li key={i}>{p}</li>)}</ul></>}</section>
    </div>}
    <p className="ai-brief-meta">{out!.model} · {new Date(out!.generatedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} 작성{stale&&' · 조건이 바뀌어 다시 쓰는 중'}{r.confidence==='low'&&' · 확신 낮음'}</p>
   </div>}
  </div>
 </section>;
}
// 관리자 도구: 브리핑에 넣을 요소. 이 브라우저에 저장되며 바꾸면 다음 브리핑부터 반영된다.
export function AiBriefSettings({c}:{c:Context}){
 const [f,setF]=useState<BriefFactors>(defaultFactors);useEffect(()=>setF(loadFactors()),[]);
 if(!['admin','director'].includes(c.me.role))return null;
 const items:[keyof BriefFactors,string,string][]=[['units','조직 비교','팀·파트·잡매니저 단위의 이행률·지연 비교와 "먼저 챙길 곳"'],['trend','주별 흐름','최근 8주 이행률 흐름과 지난주 대비'],['issues','후속 조치','기한 넘긴 조치 건수·증감과 가장 오래된 요청'],['types','이슈 유형','어떤 유형의 요청이 많고 반복되는지'],['stale','장기 미방문','60일 넘게 찾지 않은 매장']];
 const set=(k:keyof BriefFactors,v:boolean)=>{const n={...f,[k]:v};setF(n);try{localStorage.setItem(FACTORS_KEY,JSON.stringify(n))}catch{}};
 return <section className="panel"><PanelTitle title="AI 현황 브리핑 요소" sub="대시보드 브리핑에 넣을 분석 요소입니다. 브리핑은 자동이며 여기서 끄고 켜기만 합니다. 이 설정은 이 PC·브라우저에 저장됩니다."/><div className="settings-blocks">{items.map(([k,t,p])=><label key={k} className="checkbox ai-brief-factor"><input type="checkbox" checked={f[k]} onChange={e=>set(k,e.target.checked)}/><div><h3>{t}</h3><p>{p}</p></div></label>)}</div></section>;
}
