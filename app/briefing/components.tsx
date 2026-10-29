'use client';
// 주간 업무 기록: 한 가지 질문에만 답한다 — "그 주에 어느 현장에서 무슨 일이 있었나". 해석·지시는 AI 브리핑, 숫자는 지표 카드가 맡는다.
// 주차별 페이지 = 주차마다 날짜순 타임라인: 왼쪽 날짜(요일·월일) → 세로 축 점 → 그날 방문(시각·현장›매장·방문자·목적·활동 한 줄). 줄을 누르면 방문 결과.
import {useState,useMemo,useId} from 'react';
import {ChevronRight,CalendarDays} from 'lucide-react';
import {short} from '../ui';
import {weekRanges,weekTitle,type BriefData,type BriefVisit,type BriefTarget} from './model';
import './styles.css';
import './detail.css';
import {BriefDisclosure} from './disclosure';
export type BriefProps={data:BriefData;now:string;demo:boolean;onVisit:(id:string)=>void;onIssue:(id:string)=>void};
const clip=(text:string,n=100)=>text.length>n?text.slice(0,n)+'…':text;
// 보고 한 줄: 목적 · 결과(있으면) · 활동 첫 문장
const line=(v:BriefVisit)=>clip([v.purpose,(v.detail||'').split(/(?<=[.!?。])\s/)[0]].filter(Boolean).join(' · '),96);


function Visit({visit:v,target:t,onVisit}:{visit:BriefVisit;target?:BriefTarget;onVisit:(id:string)=>void}){
 return <li className="tl-visit"><button type="button" onClick={()=>onVisit(v.id)} aria-label={`${short(v.actualDate)} ${v.actualTime||''} ${t?.name||''} 방문 결과 열기`}>
  <span className="tl-time">{v.actualTime||'—'}</span>
  <span className="tl-body"><span className="tl-head"><b className="zf-ent zf-ent-site">{t?.siteName||'대상 미확인'}</b>{t?.type==='store'&&<><span aria-hidden="true">›</span><b className="zf-ent zf-ent-store">{t.name}</b></>}<span className="tl-meta">{v.visitorName} · {v.purpose}</span></span>
   <span className="tl-line">{v.detail?clip(v.detail,140):'활동 내용 미입력'}</span></span>
  <ChevronRight size={16} aria-hidden="true"/>
 </button></li>;
}

export function BriefingPage({data,now,start,end,onVisit,initialSite=''}:BriefProps&{start:string;end:string;setPeriod:(a:string,b:string)=>void;initialSite?:string}){
 const [site,setSite]=useState(initialSite),[open,setOpen]=useState<Record<string,boolean>>({}),[more,setMore]=useState<Record<string,boolean>>({}),id=useId();
 const targetById=useMemo(()=>new Map(data.targets.map(t=>[t.id,t])),[data.targets]);
 const sites=useMemo(()=>[...new Map(data.targets.map(t=>[t.siteId,t.siteName])).entries()],[data.targets]);
 const weeks=weekRanges(start,end),latest=weeks.find(w=>w.start<=now)?.start||weeks[0]?.start;
 const visits=useMemo(()=>data.visits.filter(v=>v.status==='completed'&&!!v.actualDate&&v.actualDate<=now&&(!site||v.siteId===site)),[data.visits,now,site]);
 return <section className="briefing-page" aria-label="날짜별 방문">
  <div className="brief-section-heading"><h2 id={id+'-t'}>날짜별 방문</h2><label className="brief-site-filter"><span className="sr-only">현장 선택</span><select aria-label="현장 선택" value={site} onChange={e=>setSite(e.target.value)}><option value="">전체 현장</option>{sites.map(([k,n])=><option value={k} key={k}>{n}</option>)}</select></label></div>
  <div className="brief-weeks">{weeks.slice(0,more.weeks?undefined:4).map(w=>{
   const inWeek=visits.filter(v=>v.actualDate!>=w.from&&v.actualDate!<=w.to).sort((a,b)=>b.actualDate!.localeCompare(a.actualDate!)||(a.actualTime||'').localeCompare(b.actualTime||''));
   const byDay=new Map<string,BriefVisit[]>();for(const v of inWeek){const l=byDay.get(v.actualDate!)||[];l.push(v);byDay.set(v.actualDate!,l)}const siteCount=new Set(inWeek.map(v=>v.siteId)).size;
   const isOpen=open[w.start]??w.start===latest,base=id+'-'+w.start;
   return <article className={'panel brief-week '+(isOpen?'is-open':'')} key={w.start}>
    <div className="brief-week-heading"><div><h3>{weekTitle(w.start)}</h3><p className="brief-week-dates"><CalendarDays size={14} aria-hidden="true"/>{short(w.from)} – {short(w.to)} · 방문 {inWeek.length}건 · 현장 {siteCount}곳</p></div><BriefDisclosure open={isOpen} controls={base} onClick={()=>setOpen(c=>({...c,[w.start]:!isOpen}))}>{isOpen?'접기':'보기'}</BriefDisclosure></div>
    <div id={base} hidden={!isOpen}><ol className="tl-days">{[...byDay].map(([day,list])=>{const key=w.start+day,shown=more[key]?list:list.slice(0,5);return <li key={day} className="tl-day"><time dateTime={day} className="tl-date"><b>{'일월화수목금토'[new Date(day+'T12:00:00Z').getUTCDay()]}</b>{short(day)}</time><span className="tl-track" aria-hidden="true"/><div className="tl-list"><ol>{shown.map(v=><Visit key={v.id} visit={v} target={targetById.get(v.targetId)} onVisit={onVisit}/>)}</ol>{list.length>5&&<BriefDisclosure open={!!more[key]} controls={base} onClick={()=>setMore(c=>({...c,[key]:!c[key]}))}>{more[key]?'접기':`${list.length-5}건 더`}</BriefDisclosure>}</div></li>})}</ol>{!inWeek.length&&<p className="brief-no-activity">이 주에 기록된 방문이 없어요.</p>}</div>
   </article>})}</div>
  {weeks.length>4&&<BriefDisclosure open={!!more.weeks} controls={id+'-t'} onClick={()=>setMore(c=>({...c,weeks:!c.weeks}))}>{more.weeks?'이전 주차 접기':`이전 주차 ${weeks.length-4}개 더`}</BriefDisclosure>}
 </section>;
}
