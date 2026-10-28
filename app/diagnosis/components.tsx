'use client';
import {useEffect,useMemo,useState} from 'react';
import {AlertTriangle,RefreshCw,ChevronRight,ShieldOff,CalendarClock,Info,Inbox} from 'lucide-react';
import {PanelTitle,Badge,short,nice} from '../ui';
import {weekRanges,weekTitle} from '../briefing/model';
import type {PlatformData,FieldAction,Target} from '../platform/model';
import {diagnose,sitesWith,weekDiagnosis,defaultWeek,kstStamp,reasonsOf,type DxInput,type DxFlag,type DxIssueRow,type Diagnosis} from './model';
import {scopeInput} from './adapters';
import './styles.css';
export type DxStatus='ready'|'loading'|'error'|'denied';
type StateProps={status?:DxStatus;onRetry?:()=>void};
const flags:{key:DxFlag;label:string}[]=[{key:'urgent',label:'긴급'},{key:'overdue',label:'기한 초과'},{key:'repeat',label:'반복'},{key:'unassigned',label:'담당 미지정'}];
function Placeholder({status,onRetry,title}:{status:DxStatus;onRetry?:()=>void;title:string}){
 if(status==='loading')return <div className="dx-state" role="status" aria-label={title+' 불러오는 중'}><div className="dx-skeleton"><i/><i/><i/></div></div>;
 if(status==='denied')return <div className="dx-state"><ShieldOff size={22}/><b>접근할 수 없습니다</b><p>이 조회 범위의 문제 진단을 볼 권한이 없습니다. 관리자에게 권한을 문의하세요.</p></div>;
 return <div className="dx-state" role="alert"><AlertTriangle size={22}/><b>문제 진단을 불러오지 못했습니다</b><p>연결 상태를 확인한 뒤 다시 시도해 주세요.</p>{onRetry&&<button className="dx-retry" onClick={onRetry}><RefreshCw size={14}/>다시 시도</button>}</div>;
}
function Empty({kind}:{kind:Diagnosis['state']}){const text={'no-target':['조회할 사업장이 없습니다','조회 조건을 바꾸거나 사업장을 등록해 주세요.'],'no-data':['점검 자료 없음','이 범위에는 완료된 방문 결과와 등록된 이슈가 아직 없습니다. 문제가 없다는 뜻이 아닙니다.'],clear:['미해결 이슈 없음','점검 자료가 있고 현재 등록된 미해결 이슈가 없습니다.'],issues:['','']}[kind];return <div className="dx-state"><Inbox size={22}/><b>{text[0]}</b><p>{text[1]}</p></div>}
const label=(a:DxIssueRow)=>a.urgentFlag?'긴급':a.late>0?`기한+${a.late}일`:a.open&&a.repeat?'반복':a.unassigned?'담당 미지정':a.state;
// compact: 대시보드용. 상단 핵심 지표와 겹치는 지표 칩·안내를 빼고 '먼저 확인할 사업장' 목록만 보여 준다.
export function SiteDiagnosis({input,now,status='ready',onRetry,onOpen,uname,compact=false}:StateProps&{input:DxInput;now:string;onOpen:(siteId:string,issueId?:string)=>void;uname:(id:string)=>string;compact?:boolean}){
 const [flag,setFlag]=useState<DxFlag|''>(''),[all,setAll]=useState(false),[stamp,setStamp]=useState('');
 useEffect(()=>{setStamp(kstStamp());const h=setInterval(()=>setStamp(kstStamp()),60000);return()=>clearInterval(h)},[]);
 const d=useMemo(()=>diagnose(input,now),[input,now]);const sites=sitesWith(d,flag),rows=flag||all?sites:sites.slice(0,3);
 const count=(k:DxFlag)=>d.summary[k];
 return <section className="panel dx-panel" aria-label="사업장 문제 진단"><PanelTitle title={compact?'먼저 확인할 사업장':'사업장 문제 진단'} sub={compact?`미해결 이슈가 몰린 사업장 순 · 전체 미해결 ${d.summary.totalOpen}건`:'현재 미해결 기준 · 조직·사업장 필터만 적용, 방문 기간과 무관'}><span className="dx-stamp">현재 기준 {stamp||short(now)}</span></PanelTitle>
 {status!=='ready'?<Placeholder status={status} onRetry={onRetry} title="사업장 문제 진단"/>:<>
 {!compact&&<><div className="dx-chips" role="group" aria-label="문제 지표">{flags.map(f=>{const n=count(f.key);const na=n===null;return <button key={f.key} className={'dx-chip '+f.key+(flag===f.key?' active':'')} aria-pressed={flag===f.key} disabled={na} title={na?'승인된 심각도 기준이 확정되면 표시됩니다':undefined} onClick={()=>setFlag(flag===f.key?'':f.key)}><span>{f.label}</span><b>{na?'—':n}<small>{na?'':'건'}</small></b>{na&&<em>기준 미확정</em>}</button>})}</div>
 <p className="dx-note"><Info size={12}/>※ 지표 간 중복 포함 · 전체 미해결 <b>{d.summary.totalOpen}</b>건{d.summary.urgent===null&&' · 긴급은 심각도 기준 확정 후 표시'}</p></>}
 {d.state!=='issues'?<Empty kind={d.state}/>:<>
 <div className="dx-list-head">{compact?<h3><small>{sites.length}곳 중 상위 {Math.min(3,sites.length)}곳</small></h3>:<h3>{flag?flags.find(f=>f.key===flag)!.label+' 사업장':'우선 확인 사업장'} <small>{sites.length}곳</small></h3>}{!flag&&sites.length>3&&<button className="textbtn" aria-expanded={all} onClick={()=>setAll(!all)}>{all?'상위 3곳만 보기':'전체 보기'}<ChevronRight size={14}/></button>}{flag&&<button className="textbtn" onClick={()=>setFlag('')}>필터 해제</button>}</div>
 {rows.length?<ol className="dx-rows"><li className="dx-row dx-row-head" aria-hidden="true"><span>사업장</span><span>주요 문제</span><span>상태·담당</span><span/></li>{rows.map(s=>{const t=s.top;return <li className="dx-row" key={s.siteId}>
  <div className="dx-site"><b>{s.siteName}</b><small>자체 {s.own} · 매장 {s.stores}건</small></div>
  <div className="dx-problem"><span>{t.content}</span><div className="dx-reasons">{s.reasons.slice(1).map(r=><i key={r}>{r}</i>)}{s.issues.length>1&&<em>외 {s.issues.length-1}건</em>}</div></div>
  <div className="dx-status"><span className={'dx-badge '+(t.urgentFlag?'urgent':t.late>0?'late':t.repeat?'repeat':'plain')} title={s.reasons.length?'선정 이유: '+s.reasons.join(' · '):undefined}>{label(t)}</span><small className={t.unassigned?'unassigned':''}>{t.unassigned?'담당 미지정':uname(t.ownerId)}</small></div>
  <button className="dx-open" onClick={()=>onOpen(s.siteId,t.id)} aria-label={s.siteName+' 근거·조치 확인'}>근거·조치 확인<ChevronRight size={14}/></button></li>})}</ol>:<Empty kind="clear"/>}
 </>}</>}</section>
}
export function WeeklyDiagnosis({input,now,start,end,status='ready',onRetry,onOpen,onActions,uname}:StateProps&{input:DxInput;now:string;start:string;end:string;onOpen:(siteId:string,issueId?:string)=>void;onActions:()=>void;uname:(id:string)=>string}){
 const weeks=weekRanges(start,end),[picked,setPicked]=useState(''),[more,setMore]=useState(false);
 const current=weeks.some(w=>w.start===picked)?picked:defaultWeek(start,end,now),w=weeks.find(x=>x.start===current);
 const d=useMemo(()=>w?weekDiagnosis(input,w.start,w.end,now,{from:w.from,to:w.to}):null,[input,now,w?.start,w?.end,w?.from,w?.to]);
 const names=useMemo(()=>new Map(input.targets.map(t=>[t.id,t])),[input]),place=(id:string)=>{const t=names.get(id);return t?(t.type==='store'?t.siteName+' · '+t.name:t.siteName):'대상 미확인'};
 const title=w?`${w.start.slice(0,4)}년 ${weekTitle(w.start)}`:'';const isNow=d?.phase==='current';
 return <section className="panel dx-panel dx-weekly" aria-label="주차별 사업장 문제 진단"><PanelTitle title={isNow?'이번 주 사업장 문제 진단':(w?weekTitle(w.start)+' 사업장 문제 진단':'사업장 문제 진단')} sub={w?`${short(w.start)}~${short(w.end)} · ${d?.phase==='current'?'현재까지 잠정 집계':d?.phase==='past'?'집계 완료':'아직 시작하지 않은 주차'}`:'조회기간에 해당하는 주차가 없습니다'}>{weeks.length>0&&<label className="dx-week-select"><span className="sr-only">진단 주차</span><select aria-label="진단 주차 선택" value={current} onChange={e=>{setPicked(e.target.value);setMore(false)}}>{weeks.map(x=><option key={x.start} value={x.start}>{x.start.slice(0,4)}년 {weekTitle(x.start)}</option>)}</select></label>}</PanelTitle>
 {status!=='ready'?<Placeholder status={status} onRetry={onRetry} title="주차별 사업장 문제 진단"/>:!w||!d?<div className="dx-state"><Inbox size={22}/><b>선택할 주차가 없습니다</b><p>상단 조회기간을 확인해 주세요.</p></div>:<>
 <div className="dx-chips three" role="group" aria-label={title+' 지표'}><div className="dx-chip new"><span>신규</span><b>{d.newIssues.length}<small>건</small></b></div><div className="dx-chip done"><span>해결</span><b>{d.resolved.length}<small>건</small></b></div><div className="dx-chip open"><span>{isNow?'현재 미해결':'주말 기준 미해결'}</span><b>{isNow?d.openNow:'—'}{isNow&&<small>건</small>}</b>{!isNow&&<em>{d.phase==='future'?'시작 전':'상태 이력 없음'}</em>}</div></div>
 <p className="dx-note">{d.delta?<><b className={d.delta.value>0?'up':d.delta.value<0?'down':''}>{d.delta.label} 대비 신규 {d.delta.value>0?'+':''}{d.delta.value}건</b></>:d.phase==='future'?'아직 시작하지 않은 주차입니다.':'비교 가능한 지난주 기록이 없어 증감을 표시하지 않습니다.'}{d.unknownCreated>0&&<> · 등록일 미확인 {d.unknownCreated}건은 신규에서 제외</>}</p>
 <div className="dx-block"><h3>{isNow?'이번 주':'이 주차'} 주목할 변화</h3>{d.changes.length?<><ul className="dx-changes">{(more?d.changes:d.changes.slice(0,5)).map(c=><li key={c.kind+c.issue.id}><span className={'dx-kind '+c.kind}>{c.kind}</span><div><b>{place(c.issue.targetId)}</b><span>{c.issue.content}</span></div><button className="dx-link" onClick={()=>onOpen(c.issue.siteId,c.issue.id)}>관련 방문·원문 보기<ChevronRight size={13}/></button></li>)}</ul>{d.changes.length>5&&<button className="dx-more" aria-expanded={more} onClick={()=>setMore(!more)}>{more?'접기':`변화 ${d.changes.length-5}건 더 보기`}</button>}</>:<p className="dx-empty-line">{d.phase==='future'?'아직 집계할 변화가 없습니다.':'이 주차에 등록되거나 해결된 이슈가 없습니다.'}</p>}</div>
 <div className="dx-block"><h3><CalendarClock size={14}/>다음 주 조치 예정 <small>{short(addDays(w.end,1))}~{short(addDays(w.end,7))}</small></h3>{d.upcoming.length?<ul className="dx-plans">{d.upcoming.slice(0,5).map(p=><li key={p.key}><b>{p.kind==='조치'?'조치 · ':'방문 · '}{place(p.targetId)}</b><span>{p.text}</span><time dateTime={p.date}>{short(p.date)}</time><small>{p.ownerId?uname(p.ownerId):'담당 미지정'}</small></li>)}</ul>:<p className="dx-empty-line">등록된 기한·방문 일정이 없습니다.</p>}{d.upcoming.length>5&&<p className="dx-empty-line">외 {d.upcoming.length-5}건 · 기한 조치를 먼저, 이어서 예정 방문을 날짜순으로 표시합니다. 전체는 후속 조치 관리·방문 일정에서 확인하세요.</p>}<div className="dx-actions"><button className="dx-link strong" onClick={onActions}>연결된 조치 보기<ChevronRight size={13}/></button></div></div></>}</section>
}
function addDays(day:string,n:number){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
const stateText=(a:DxIssueRow)=>a.open?a.state:'완료'+(a.completedDate?' · '+short(a.completedDate):'');
export function DiagnosisDetail({data,targetsScope,siteId,issueId,now,uname,onAction,onVisit,onRevisit}:{data:PlatformData;targetsScope:Target[];siteId:string;issueId?:string;now:string;uname:(id:string)=>string;onAction:(a:FieldAction)=>void;onVisit:(id:string)=>void;onRevisit:(a:DxIssueRow)=>void}){
 const d=useMemo(()=>diagnose(scopeInput(data,targetsScope),now),[data,targetsScope,now]);const focus=d.issues.find(a=>a.id===issueId&&a.siteId===siteId);
 const list=[...(focus&&!focus.open?[focus]:[]),...d.open.filter(a=>a.siteId===siteId).sort((a,b)=>+(b.id===issueId)-+(a.id===issueId))];
 const names=new Map(targetsScope.map(t=>[t.id,t]));const own=list.filter(a=>a.open&&a.targetId===a.siteId).length,stores=list.filter(a=>a.open&&a.targetId!==a.siteId).length;
 if(!list.length)return <div className="dx-detail"><div className="dx-state"><Inbox size={22}/><b>미해결 이슈 없음</b><p>이 사업장의 해당 이슈는 이미 해결되었거나 조회 범위 밖입니다.</p></div></div>;
 return <div className="dx-detail"><p className="dx-detail-sum"><b>미해결 {own+stores}건</b><span>자체 {own} · 매장 {stores}</span><small>현재 기준 · 이슈 ID로 중복 제거</small></p>
 {list.map(a=>{const t=names.get(a.targetId),record=data.actions.find(x=>x.id===a.id),visit=a.visitId?data.visits.find(v=>v.id===a.visitId):undefined,history=data.audit.filter(x=>x.entityId===a.id).sort((p,q)=>p.createdAt.localeCompare(q.createdAt));const reasons=reasonsOf(a);
  return <details className="dx-issue" key={a.id} open={a.id===issueId||list.length===1}><summary><span className="dx-issue-title"><b>{a.content}</b><small>{t?(t.type==='store'?t.siteName+' · '+t.name:'현장 본사'):'대상 미확인'}</small></span><span className="dx-reasons">{reasons.map(r=><i key={r}>{r}</i>)}{!a.open&&<i className="done">해결</i>}</span></summary>
  <section><h4>1. 문제 내용</h4><p>{a.content}</p><dl><dt>유형</dt><dd>{a.type}</dd><dt>상태</dt><dd><Badge>{stateText(a)}</Badge></dd></dl>{a.open&&a.repeat&&<p className="dx-hint">같은 대상에서 {a.type} 유형이 직전 90일 안에 다시 등록되었습니다.</p>}</section>
  <section><h4>2. 방문 원문·사진</h4>{visit?<div className="dx-visit"><div><b>{visit.purpose}</b><small>{nice(visit.actualDate||visit.plannedDate)} · {uname(visit.visitorId)}</small></div><p>{visit.detail||'활동 내용 미입력'}</p>{visit.notes&&<p className="dx-hint">특이사항: {visit.notes}</p>}<button className="dx-link" onClick={()=>onVisit(visit.id)}>원본 방문 결과 열기<ChevronRight size={13}/></button></div>:<p className="dx-hint">연결된 방문 기록이 없습니다. 이슈가 방문과 무관하게 등록되었습니다.</p>}<p className="dx-hint">사진 첨부는 아직 지원하지 않습니다.</p></section>
  <section><h4>3. 담당자·기한</h4><dl><dt>담당자</dt><dd className={a.unassigned?'red-text':''}>{a.unassigned?'담당 미지정':uname(a.ownerId)}</dd><dt>기한</dt><dd>{nice(a.dueDate)}{a.late>0&&<span className="red-text"> · {a.late}일 초과</span>}</dd><dt>등록일</dt><dd>{a.createdDate?nice(a.createdDate):'등록일 미확인'}</dd></dl></section>
  <section><h4>4. 조치 이력</h4>{history.length?<ol className="dx-history">{history.map(h=>{let after:any={};try{after=JSON.parse(h.after)}catch{}return <li key={h.id}><time>{h.createdAt.slice(0,10).replaceAll('-','.')}</time><span>{h.before?'수정':'등록'}{after?.state?' · '+after.state:''}{after?.ownerId?' · '+uname(after.ownerId):''}</span></li>})}</ol>:<p className="dx-hint">기록된 변경 이력이 없습니다.</p>}</section>
  {record&&<div className="dx-detail-actions">{a.open&&<><button className="dx-primary" onClick={()=>onAction(record)}>{a.unassigned?'담당 지정·조치 등록':'조치 등록·담당 변경'}</button><button className="dx-secondary" onClick={()=>onRevisit(a)}>재방문 예약</button></>}{!a.open&&<button className="dx-secondary" onClick={()=>onAction(record)}>조치 내용 보기</button>}</div>}</details>})}</div>
}
