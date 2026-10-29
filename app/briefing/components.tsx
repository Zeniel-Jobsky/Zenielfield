'use client';
// 주간 업무 기록: 한 가지 질문에만 답한다 — "그 주에 어느 현장에서 무슨 일이 있었나". 해석·지시는 AI 브리핑, 숫자는 지표 카드가 맡는다.
// 대시보드 미리보기 = 현장별 그 주 방문 건수 + 가장 최근 보고 한 줄 / 주차별 페이지 = 주차마다 현장별로 묶은 타임라인 하나(펼치면 원문).
import {useState,useMemo,useId} from 'react';
import {ArrowRight,ChevronRight,Building2,Store,CalendarDays} from 'lucide-react';
import {week,shift} from '../lib/model';
import {short,Empty,PanelTitle} from '../ui';
import {weeklyCards,weekRanges,weekTitle,type BriefData,type BriefVisit,type BriefTarget} from './model';
import './styles.css';
import './detail.css';
import {BriefDisclosure} from './disclosure';
export type BriefProps={data:BriefData;now:string;demo:boolean;onVisit:(id:string)=>void;onIssue:(id:string)=>void};
const clip=(text:string,n=100)=>text.length>n?text.slice(0,n)+'…':text;
// 보고 한 줄: 목적 · 결과(있으면) · 활동 첫 문장
const line=(v:BriefVisit)=>clip([v.purpose,(v.detail||'').split(/(?<=[.!?。])\s/)[0]].filter(Boolean).join(' · '),96);

export function BriefingPreview({data,now,onAll}:{data:BriefData;now:string;demo:boolean;onAll:(site?:string,from?:string)=>void}){
 const [offset,setOffset]=useState(0);const [a,b]=week(shift(now,offset*7)),rows=weeklyCards(data,a,b,now).slice(0,3);
 return <section className="panel briefing-preview" aria-label="주간 업무 기록"><PanelTitle title="주간 업무 기록" sub={`${weekTitle(a)} · ${short(a)} – ${short(b)}`}><button className="textbtn" onClick={()=>onAll('',a)}>전체 보기<ArrowRight size={14}/></button></PanelTitle>
  <div className="brief-week-switch" aria-label="주차"><button aria-pressed={offset===0} className={!offset?'active':''} onClick={()=>setOffset(0)}>이번 주</button><button aria-pressed={offset===-1} className={offset===-1?'active':''} onClick={()=>setOffset(-1)}>지난주</button></div>
  <ul className="brief-preview-list">{rows.map(card=>{const last=card.visits[0];return <li key={card.siteId}><button type="button" className="brief-preview-row" onClick={()=>onAll(card.siteId,a)}><span className="brief-preview-site"><b>{card.siteName}</b><small>방문 {card.visits.length}건{last?.actualDate&&` · 최근 ${short(last.actualDate)}`}</small></span><span className="brief-preview-line">{last?line(last):'이 주 방문 기록 없음'}</span><ChevronRight size={14} aria-hidden="true"/></button></li>})}</ul>
  {!rows.length&&<Empty text="이 주에 기록된 방문이 없어요."/>}
 </section>;
}

function Visit({visit:v,target:t,onVisit}:{visit:BriefVisit;target?:BriefTarget;onVisit:(id:string)=>void}){
 const [open,setOpen]=useState(false),id=useId();
 return <li className="brief-visit">
  <time dateTime={v.actualDate!}>{short(v.actualDate)}{v.actualTime&&<small> {v.actualTime}</small>}</time>
  <div className="brief-visit-body">
   <p className="brief-visit-head">{t?.type==='store'?<Store size={14} aria-hidden="true"/>:<Building2 size={14} aria-hidden="true"/>}<b>{t?(t.type==='store'?t.name:'현장 자체'):'대상 미확인'}</b><span>{v.visitorName}</span><span>{v.purpose}</span></p>
   <p className="brief-visit-line">{v.detail?clip(v.detail,140):'활동 내용 미입력'}</p>
   {(v.detail.length>140||v.notes)&&<><BriefDisclosure open={open} controls={id} onClick={()=>setOpen(!open)}>{open?'접기':'원문'}</BriefDisclosure>
   <div id={id} hidden={!open} className="brief-visit-full"><p>{v.detail}</p>{v.notes&&<p><b>특이사항</b> {v.notes}</p>}<button type="button" className="textbtn" onClick={()=>onVisit(v.id)}>방문 결과 열기<ChevronRight size={14} aria-hidden="true"/></button></div></>}
  </div>
 </li>;
}

export function BriefingPage({data,now,start,end,onVisit,initialSite=''}:BriefProps&{start:string;end:string;setPeriod:(a:string,b:string)=>void;initialSite?:string}){
 const [site,setSite]=useState(initialSite),[open,setOpen]=useState<Record<string,boolean>>({}),[more,setMore]=useState<Record<string,boolean>>({}),id=useId();
 const targetById=useMemo(()=>new Map(data.targets.map(t=>[t.id,t])),[data.targets]);
 const sites=useMemo(()=>[...new Map(data.targets.map(t=>[t.siteId,t.siteName])).entries()],[data.targets]);
 const weeks=weekRanges(start,end),latest=weeks.find(w=>w.start<=now)?.start||weeks[0]?.start;
 const visits=useMemo(()=>data.visits.filter(v=>v.status==='completed'&&!!v.actualDate&&v.actualDate<=now&&(!site||v.siteId===site)),[data.visits,now,site]);
 return <section className="briefing-page" aria-label="주차별 업무 기록">
  <div className="brief-section-heading"><h2 id={id+'-t'}>주차별 업무 기록</h2><label className="brief-site-filter"><span className="sr-only">현장 선택</span><select aria-label="현장 선택" value={site} onChange={e=>setSite(e.target.value)}><option value="">전체 현장</option>{sites.map(([k,n])=><option value={k} key={k}>{n}</option>)}</select></label></div>
  <div className="brief-weeks">{weeks.slice(0,more.weeks?undefined:4).map(w=>{
   const inWeek=visits.filter(v=>v.actualDate!>=w.from&&v.actualDate!<=w.to).sort((a,b)=>(b.actualDate!+b.actualTime).localeCompare(a.actualDate!+a.actualTime));
   const bySite=new Map<string,BriefVisit[]>();for(const v of inWeek){const l=bySite.get(v.siteId)||[];l.push(v);bySite.set(v.siteId,l)}
   const isOpen=open[w.start]??w.start===latest,base=id+'-'+w.start;
   return <article className={'panel brief-week '+(isOpen?'is-open':'')} key={w.start}>
    <div className="brief-week-heading"><div><h3>{weekTitle(w.start)}</h3><p className="brief-week-dates"><CalendarDays size={14} aria-hidden="true"/>{short(w.from)} – {short(w.to)} · 방문 {inWeek.length}건 · 현장 {bySite.size}곳</p></div><BriefDisclosure open={isOpen} controls={base} onClick={()=>setOpen(c=>({...c,[w.start]:!isOpen}))}>{isOpen?'접기':'보기'}</BriefDisclosure></div>
    <div id={base} hidden={!isOpen}>{[...bySite].map(([siteId,list])=>{const key=w.start+siteId,shown=more[key]?list:list.slice(0,3);return <section key={siteId} className="brief-site-group"><h4>{data.targets.find(t=>t.siteId===siteId)?.siteName||'현장'}<small>{list.length}건</small></h4><ol className="brief-visits">{shown.map(v=><Visit key={v.id} visit={v} target={targetById.get(v.targetId)} onVisit={onVisit}/>)}</ol>{list.length>3&&<BriefDisclosure open={!!more[key]} controls={base} onClick={()=>setMore(c=>({...c,[key]:!c[key]}))}>{more[key]?'접기':`${list.length-3}건 더`}</BriefDisclosure>}</section>})}{!inWeek.length&&<p className="brief-no-activity">이 주에 기록된 방문이 없어요.</p>}</div>
   </article>})}</div>
  {weeks.length>4&&<BriefDisclosure open={!!more.weeks} controls={id+'-t'} onClick={()=>setMore(c=>({...c,weeks:!c.weeks}))}>{more.weeks?'이전 주차 접기':`이전 주차 ${weeks.length-4}개 더`}</BriefDisclosure>}
 </section>;
}
