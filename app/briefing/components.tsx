'use client';
import {useState,useEffect,useMemo,useId} from 'react';
import type {ReactNode} from 'react';
import {ArrowRight,ChevronDown,ChevronRight,Building2,Store,CalendarDays,FileText,Info,Search,CheckCircle2,AlertCircle} from 'lucide-react';
import {week,shift} from '../lib/model';
import {Badge,short,nice,Empty,PanelTitle} from '../ui';
import {filterBriefData,weeklyCards,weekRanges,weekTitle,weekStats,type BriefData,type BriefCard,type BriefIssue} from './model';
import './styles.css';
import './detail.css';
import {BriefDisclosure} from './disclosure';
export type BriefProps={data:BriefData;now:string;demo:boolean;onVisit:(id:string)=>void;onIssue:(id:string)=>void};
const clip=(text:string,n=100)=>text.length>n?text.slice(0,n)+'…':text;
function SourceNote({demo}:{demo:boolean}){return <div className="brief-source"><Info size={14}/><span>방문 결과 원문 발췌 · AI 미사용</span></div>}
// 사업장 상태 칩: 저장된 판정(위험·주의)이 있으면 그것, 없으면 사실(기한 초과·진행 중 조치·방문 지연·열린 조치 없음). '정상' 같은 판정 단어를 코드가 붙이지 않는다.
function Status({card}:{card:BriefCard}){const j=card.priority===2?'판정 위험':card.priority===1?'판정 주의':'';return <span className={'brief-status '+(j==='판정 위험'||card.late?'danger':j||card.issues.length||card.delayed?'warning':'plain')}>{j||(card.late?`기한 초과 ${card.late}건`:card.issues.length?`진행 중 조치 ${card.issues.length}건`:card.delayed?'방문 지연':'열린 조치 없음')}</span>}
export function BriefingPreview({data,now,demo,onAll}:{data:BriefData;now:string;demo:boolean;onAll:(site?:string,from?:string)=>void}){const [offset,setOffset]=useState(0),[needs,setNeeds]=useState(false);const [a,b]=week(shift(now,offset*7)),all=weeklyCards(data,a,b,now),rows=all.filter(r=>!needs||r.priority<3).slice(0,3);
 return <section className="panel briefing-preview" aria-label="주간 업무 요약"><PanelTitle title="주간 업무 요약"><button className="textbtn" onClick={()=>onAll('',a)}>전체 보기<ArrowRight size={14}/></button></PanelTitle><div className="brief-preview-controls"><div className="brief-week-switch" aria-label="주간 브리핑 주차"><button aria-pressed={offset===0} className={!offset?'active':''} onClick={()=>setOffset(0)}>이번 주</button><button aria-pressed={offset===-1} className={offset===-1?'active':''} onClick={()=>setOffset(-1)}>지난주</button></div><label><span className="sr-only">브리핑 활동 필터</span><select aria-label="브리핑 활동 필터" value={needs?'needs':'all'} onChange={e=>setNeeds(e.target.value==='needs')}><option value="all">전체 활동</option><option value="needs">조치 필요</option></select></label></div><div className="brief-period"><CalendarDays size={14}/><b>{weekTitle(a)}</b><span>{short(a)} – {short(b)}</span><small>한국시간</small></div><SourceNote demo={demo}/><div className="brief-preview-cards">{rows.map(card=><button className="brief-site-card" key={card.siteId} onClick={()=>onAll(card.siteId,a)}><div className="brief-card-head"><span className="brief-site-icon"><Building2 size={16}/></span><b>{card.siteName}</b><Status card={card}/></div><p>{clip(card.excerpts.slice(0,2).join(' · '),112)}</p><div className="brief-card-counts"><span>방문 <b>{card.visits.length}</b>건</span><span>미해결 <b className={card.issues.length?'red-text':''}>{card.issues.length}</b>건</span><span>최근 {short(card.lastDate)}</span></div><div className="brief-card-bottom"><small>현장 {card.visits.filter(v=>data.targets.find(t=>t.id===v.targetId)?.type==='site').length} · 매장 {card.visits.filter(v=>data.targets.find(t=>t.id===v.targetId)?.type==='store').length}건</small><span>상세 보기<ChevronRight size={14}/></span></div></button>)}{!rows.length&&<Empty text={needs?'조치가 필요한 활동이 없습니다.':'등록된 활동 내역이 없습니다'} description={needs?'전체 활동으로 전환해 확인하세요.':'선택한 주차에 실제 방문 결과가 등록되면 표시됩니다.'}/>}</div><div className="brief-preview-footer"><span>미해결 이슈는 현재 상태 기준</span><button onClick={()=>onAll('',a)}>전체 브리핑 보기<ArrowRight size={14}/></button></div></section>
}
export function BriefingSplit({children,preview}:{children:ReactNode;preview:ReactNode}){return <div className="brief-dashboard-split"><div className="brief-dashboard-left">{children}</div>{preview}</div>}
function IssueButton({issue,onIssue,label}:{issue:BriefIssue;onIssue:(id:string)=>void;label?:string}){return <button className="brief-issue" onClick={()=>onIssue(issue.id)}><span className={'brief-issue-dot '+(issue.state==='완료'?'done':'')}>{issue.state==='완료'?<CheckCircle2 size={14}/>:<AlertCircle size={14}/>}</span><span><b>{issue.content}</b><small>{label||issue.type} · {issue.ownerName} · {nice(issue.dueDate)} 기한{issue.completedDate?' · 완료 '+short(issue.completedDate):''}</small></span><Badge>{issue.state}</Badge><ChevronRight size={14}/></button>}
export function BriefingPage({data,now,demo,start,end,setPeriod,onVisit,onIssue,initialSite=''}:BriefProps&{start:string;end:string;setPeriod:(a:string,b:string)=>void;initialSite?:string}){
 const [query,setQuery]=useState(''),[searchKind,setSearchKind]=useState('all'),[site,setSite]=useState(initialSite),[needs,setNeeds]=useState(false);
 const [expanded,setExpanded]=useState<Record<string,boolean>>({}),[more,setMore]=useState<Record<string,boolean>>({});
 const id=useId(),scopeKey=[start,end,query,searchKind,site,needs].join('|');
 const targetById=useMemo(()=>new Map(data.targets.map(t=>[t.id,t])),[data.targets]);
 const filtered=useMemo(()=>filterBriefData({
  targets:data.targets.filter(t=>!site||t.siteId===site),
  visits:data.visits.filter(v=>!site||v.siteId===site),
  issues:data.issues.filter(a=>!site||a.siteId===site),
 },searchKind,query),[data,site,searchKind,query]);
 const weeks=weekRanges(start,end),latest=weeks.find(w=>w.start<=now)?.start||weeks[0]?.start;
 const sites=useMemo(()=>[...new Map(data.targets.map(t=>[t.siteId,t.siteName])).entries()],[data.targets]);
 const [month,setMonth]=useState(start.slice(5,7)),[year,setYear]=useState(start.slice(0,4));
 useEffect(()=>{setMonth(start.slice(5,7));setYear(start.slice(0,4))},[start]);
 useEffect(()=>{setExpanded({});setMore({})},[scopeKey]);
 function selectMonth(y:string,m:string){setYear(y);setMonth(m);const d=new Date(Date.UTC(Number(y),Number(m),0));setPeriod(`${y}-${m}-01`,`${y}-${m}-${String(d.getUTCDate()).padStart(2,'0')}`)}
 const stats=useMemo(()=>weekStats(filtered,start,end,now),[filtered,start,end,now]);
 const openIssueIds=new Set(stats.openIssues.map(a=>a.id));
 const relevantWeeks=weeks.filter(w=>!needs||weeklyCards(filtered,w.from,w.to,now).some(c=>c.priority>0)||weekStats(filtered,w.from,w.to,now).newIssues.some(a=>openIssueIds.has(a.id)));
 const toggleMore=(key:string)=>setMore(current=>({...current,[key]:!current[key]}));
 return <section className="briefing-page" aria-label="주차별 활동 기록">
  <section className="brief-trend-section" aria-labelledby={id+'-trend-title'}>
   <div className="brief-section-heading"><h2 id={id+'-trend-title'}>이번 주 활동 흐름</h2><p>실제 방문과 이슈의 전주 대비 변화를 확인합니다.</p></div>
   <BriefTrend data={filtered} now={now}/>
  </section>
  <section className="panel brief-search-panel" aria-label="활동 조회">
   <PanelTitle title="활동 조회" sub="현장·매장·방문자를 찾아 주차별 기록을 좁혀 보세요."/>
   <div className="brief-search-tools">
    <label><span>검색 대상</span><select aria-label="브리핑 검색 대상" value={searchKind} onChange={e=>setSearchKind(e.target.value)}><option value="all">전체</option><option value="site">현장명</option><option value="store">매장명</option><option value="manager">방문 잡매니저</option></select></label>
    <label className="brief-query"><span>활동 검색</span><div><Search size={16} aria-hidden="true"/><input aria-label="브리핑 활동 검색" placeholder="현장·매장·방문자 이름 검색" value={query} onChange={e=>setQuery(e.target.value)}/></div></label>
    <label className="brief-site-filter"><span>현장별 모아보기</span><select aria-label="브리핑 현장 선택" value={site} onChange={e=>setSite(e.target.value)}><option value="">전체 현장</option>{sites.map(([key,name])=><option value={key} key={key}>{name}</option>)}</select></label>
    <label><span>연도</span><input aria-label="브리핑 연도" type="number" min={2000} max={2100} value={year} onChange={e=>setYear(e.target.value)} onBlur={()=>{if(Number(year)>=2000&&Number(year)<=2100)selectMonth(year,month)}}/></label>
    <label><span>월</span><select aria-label="브리핑 월" value={month} onChange={e=>selectMonth(/^\d{4}$/.test(year)?year:now.slice(0,4),e.target.value)}>{Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')).map(m=><option value={m} key={m}>{Number(m)}월</option>)}</select></label>
   </div>
   <div className="brief-page-toolbar"><SourceNote demo={demo}/><button type="button" className={'brief-filter-toggle '+(needs?'active':'')} aria-pressed={needs} onClick={()=>setNeeds(!needs)}>조치 필요만 보기</button></div>
   <div className="brief-selection-summary"><span>{nice(start)} – {nice(end)}</span><b>방문 {stats.visits.length}건</b><span>현장 {stats.visits.filter(v=>targetById.get(v.targetId)?.type==='site').length} · 매장 {stats.visits.filter(v=>targetById.get(v.targetId)?.type==='store').length}건</span><span>신규 이슈 {stats.newIssues.length}건</span></div>
   <details className="brief-policy"><summary>주간 활동 집계 기준</summary><div><Info size={14} aria-hidden="true"/><p>주차는 한국시간 월요일–일요일 기준입니다. 실제 방문 결과만 집계하며 경계 주차는 조회기간에 해당하는 날짜만 표시합니다. 상단 잡매니저 필터와 방문자 검색은 <b>실제 방문자</b> 기준입니다. 미해결 이슈는 조회 대상의 <b>현재 상태</b>이며 주차별 숫자를 합산하지 않습니다. 이 목록은 방문 결과 원문 발췌이며 상단 AI 핵심요약과 별개입니다.</p></div></details>
  </section>
  <section className="brief-week-section" aria-labelledby={id+'-weeks-title'}>
   <div className="brief-section-heading"><h2 id={id+'-weeks-title'}>주차별 활동 기록</h2><p>최근 주차부터 표시합니다. 현장 요약과 원본 기록은 필요한 만큼 펼쳐 보세요.</p></div>
   <div className="brief-weeks" id={id+'-weeks'} key={scopeKey}>{relevantWeeks.slice(0,more.weeks?undefined:3).map(w=>{
    const weekData=weekStats(filtered,w.from,w.to,now),cards=weeklyCards(filtered,w.from,w.to,now),isOpen=expanded[w.start]??w.start===latest;
    const needsSites=new Set(cards.filter(c=>c.priority>0).map(c=>c.siteId));
    const visibleVisits=needs?weekData.visits.filter(v=>needsSites.has(v.siteId)):weekData.visits;
    const timeline=[...visibleVisits].sort((a,b)=>(a.actualDate!+a.actualTime).localeCompare(b.actualDate!+b.actualTime)||a.id.localeCompare(b.id));
    const excerpt=visibleVisits[0],base=id+'-'+w.start,followups=[...weekData.openIssues,...weekData.doneIssues];
    return <article className={'panel brief-week '+(isOpen?'is-open':'')} key={w.start}>
     <div className="brief-week-heading">
      <div><h3>{weekTitle(w.start)}</h3><p className="brief-week-dates"><CalendarDays size={16} aria-hidden="true"/>{short(w.start)} – {short(w.end)}{w.start<=now&&w.end>=now&&<span>집계 중</span>}</p></div>
      <BriefDisclosure open={isOpen} controls={base} onClick={()=>setExpanded(current=>({...current,[w.start]:!isOpen}))}>{isOpen?'접기':'상세 보기'}</BriefDisclosure>
     </div>
     <div className="brief-week-counts"><span>방문 <b>{visibleVisits.length}건</b></span><span>신규 이슈 <b>{weekData.newIssues.length}건</b></span></div>
     <div className="brief-week-summary">{excerpt?<p><span>대표 활동</span>{clip(excerpt.purpose+' · '+(excerpt.detail.trim()||'활동 내용 미입력'),110)}</p>:<p>등록된 활동 내역이 없습니다.</p>}{(w.from!==w.start||w.to!==w.end)&&<small>부분 주차 · 집계 {short(w.from)} – {short(w.to)}</small>}</div>
     <div className="brief-week-details" id={base} hidden={!isOpen}>
      {cards.length>0&&<section className="brief-detail-group" aria-labelledby={base+'-sites-title'}>
       <div className="brief-timeline-title"><h4 id={base+'-sites-title'}>현장별 요약</h4><span>확인 필요 순 · {cards.length}곳</span></div>
       <div className="brief-site-grid" id={base+'-sites'}>{cards.slice(0,more['c'+w.start]?undefined:3).map(card=><button type="button" key={card.siteId} className="brief-site-mini" onClick={()=>setSite(card.siteId)}><span><b>{card.siteName}</b><small>방문 {card.visits.length}건 · 미해결 <em className={card.issues.length?'red-text':''}>{card.issues.length}건</em></small></span><ChevronRight size={16} aria-hidden="true"/></button>)}</div>
       {cards.length>3&&<BriefDisclosure open={!!more['c'+w.start]} controls={base+'-sites'} onClick={()=>toggleMore('c'+w.start)}>{more['c'+w.start]?'현장 요약 접기':`현장 ${cards.length-3}곳 더 보기`}</BriefDisclosure>}
      </section>}
      <section className="brief-detail-group" aria-labelledby={base+'-timeline-title'}>
       <div className="brief-timeline-title"><h4 id={base+'-timeline-title'}>활동 타임라인</h4><span>실제 방문일 오름차순 · {timeline.length}건</span></div>
       {timeline.length?<><ol className="brief-timeline" id={base+'-timeline'}>{timeline.slice(0,more[w.start]?undefined:3).map(v=>{
        const t=targetById.get(v.targetId);return <li key={v.id}>
         <div className="brief-timeline-meta"><time dateTime={v.actualDate!}>{short(v.actualDate)}{v.actualTime?' '+v.actualTime:''}</time><span className="brief-target-type">{t?.type==='store'?<Store size={14} aria-hidden="true"/>:<Building2 size={14} aria-hidden="true"/>}{t?.type==='store'?'매장':'현장'}</span><span>{v.visitorName}</span></div>
         <h5>{t?(t.type==='store'?t.siteName+' · '+t.name:t.siteName+' · 본사/현장'):'대상 미확인'}</h5>
         <p className="brief-visit-purpose">{v.purpose}</p>
         <details className="brief-record-detail"><summary><span className="when-closed">활동 내용 펼쳐보기</span><span className="when-open">활동 내용 접기</span><ChevronDown size={14} aria-hidden="true"/></summary><div><p>{v.detail||'활동 내용 미입력'}</p>{v.notes&&<p className="brief-visit-notes"><b>특이사항</b> {v.notes}</p>}<button type="button" className="brief-original-link" onClick={()=>onVisit(v.id)}>원본 방문 결과 보기<ChevronRight size={14} aria-hidden="true"/></button></div></details>
        </li>;
       })}</ol>{timeline.length>3&&<BriefDisclosure open={!!more[w.start]} controls={base+'-timeline'} onClick={()=>toggleMore(w.start)}>{more[w.start]?'타임라인 접기':`활동 ${timeline.length-3}건 더 보기`}</BriefDisclosure>}</>:<div className="brief-no-activity"><FileText size={20} aria-hidden="true"/><p>등록된 활동 내역이 없습니다.</p><small>다른 주차의 기록을 이 주차 활동으로 표시하지 않습니다.</small></div>}
      </section>
      <section className="brief-detail-group brief-followups" aria-labelledby={base+'-issues-title'}>
       <div className="brief-timeline-title"><h4 id={base+'-issues-title'}>후속 조치</h4><span>현재 미해결 {weekData.openIssues.length}건 · 이 주차 완료 {weekData.doneIssues.length}건</span></div>
       <div id={base+'-issues'} className="brief-issue-list">{followups.slice(0,more['i'+w.start]?undefined:3).map(a=><IssueButton issue={a} onIssue={onIssue} key={a.id} label={a.state==='완료'?'이 주차 완료':undefined}/>)}</div>
       {followups.length>3&&<BriefDisclosure open={!!more['i'+w.start]} controls={base+'-issues'} onClick={()=>toggleMore('i'+w.start)}>{more['i'+w.start]?'후속 조치 접기':`후속 조치 ${followups.length-3}건 더 보기`}</BriefDisclosure>}
       {!weekData.openIssues.length&&!weekData.doneIssues.length&&<p className="brief-no-issues">미해결 이슈와 이 주차에 완료한 조치가 없습니다.</p>}
       <p className="brief-issue-policy">미해결은 현재 상태 기준입니다. 등록일 미확인 이슈는 신규 건수에서 제외합니다.</p>
      </section>
     </div>
    </article>;
   })}{!relevantWeeks.length&&<Empty text="조건에 맞는 주차가 없습니다." description="조회기간 또는 조치 필요 필터를 확인하세요."/>}</div>
   {relevantWeeks.length>3&&<BriefDisclosure open={!!more.weeks} controls={id+'-weeks'} onClick={()=>toggleMore('weeks')}>{more.weeks?'이전 주차 접기':`이전 주차 ${relevantWeeks.length-3}개 더 보기`}</BriefDisclosure>}
  </section>
 </section>;
}
export function BriefTrend({data,now,weeks=6}:{data:BriefData;now:string;weeks?:number}){const first=shift(week(now)[0],-7*(weeks-1)),rows=Array.from({length:weeks},(_,i)=>{const a=shift(first,i*7),s=weekStats(data,a,shift(a,6),now);return{start:a,visits:s.visits.length,issues:s.newIssues.length,done:s.doneIssues.length}}),cur=rows.at(-1)!,prev=rows.at(-2)!;const spark=(k:'visits'|'issues'|'done')=>{const max=Math.max(1,...rows.map(r=>r[k]));return <svg viewBox="0 0 100 28" className="brief-spark" aria-hidden="true"><polyline points={rows.map((r,i)=>`${i*100/(rows.length-1)},${26-r[k]/max*24}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2"/></svg>};const delta=(k:'visits'|'issues'|'done')=>{const d=cur[k]-prev[k];return <small className={d>0?'up':d<0?'down':''}>{d>0?'▲':d<0?'▼':'–'} {Math.abs(d)} 전주 대비</small>};return <div className="brief-trend">{([['visits','실제 방문'],['issues','신규 이슈'],['done','완료 이슈']] as const).map(([k,l])=><div key={k} className={'brief-trend-card '+k}><span>{l} · 이번 주</span><b>{cur[k]}<small>건</small></b>{delta(k)}{spark(k)}</div>)}<p>최근 {weeks}주 · 한국시간 월–일 · 조회 기간과 무관</p></div>}
