'use client';
// 후속 조치 화면 맨 위 제니에리 정리: 무슨 일(사실 문장) → 기한 기준 한 줄 막대 → 이렇게 챙겨 보세요(오래 밀린 조치 3건).
// AI 없이 화면이 가진 사실로만 쓴다(DC-JUDGMENT). 비교는 자기 지난 2주와만(DC-FEEDBACK), 빨강은 기한 넘긴 조각에만.
import {useMemo} from 'react';
import {Newspaper,CalendarClock,ListChecks,ChevronRight} from 'lucide-react';
import {AiMark} from './ai-mark';
import {CopyButton} from './copy-button';
import {dayShift,daysBetween,between} from '../lib/date';
import type {Context} from './context';

const HONOR:Record<string,string>={manager:'매니저님',partlead:'파트장님',lead:'팀장님',director:'사업부장님',admin:'님'};
const cut=(s:string,n=40)=>s.length>n?s.slice(0,n)+'…':s;

export function ActionBrief({c}:{c:Context}){
 const f=useMemo(()=>{const now=c.now,wkEnd=dayShift(now,6),open=c.actions.filter(a=>a.state!=='완료');
  const late=open.filter(a=>a.dueDate<now).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)),week=open.filter(a=>between(a.dueDate,now,wkEnd)),later=open.length-late.length-week.length;
  const done=(a:number,b:number)=>c.actions.filter(x=>x.state==='완료'&&between(x.completedDate,dayShift(now,-b),dayShift(now,-a))).length;
  const types=new Map<string,number>();for(const a of late)types.set(a.type,(types.get(a.type)||0)+1);
  const topType=[...types].sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
  return {open:open.length,late,week:week.length,later,done14:done(0,13),donePrev:done(14,27),topType}},[c.actions,c.now]);
 const story=f.open===0?`안 끝난 조치가 없어요. 최근 2주에 ${f.done14}건을 끝냈어요.`
  :[`안 끝난 조치가 ${f.open}건이에요.`,f.late.length?`그중 ${f.late.length}건은 기한이 지났고${f.week?`, ${f.week}건은 이번 주가 기한이에요`:'요'}.`.replace('지났고요','지났어요'):f.week?`그중 ${f.week}건은 이번 주가 기한이에요.`:'모두 기한 안에 있어요.',
   `최근 2주에 ${f.done14}건을 끝냈어요${f.donePrev===f.done14?'(그 전 2주와 같아요)':`(그 전 2주 ${f.donePrev}건보다 ${f.done14>f.donePrev?'늘었어요':'줄었어요'})`}.`,
   f.topType&&`기한 넘긴 조치는 ${f.topType} 유형이 가장 많아요.`].filter(Boolean).join(' ');
 const self=c.me.role==='manager';
 const guide=f.late.slice(0,3).map(a=>{const d=daysBetween(a.dueDate,c.now),owner=c.uname(a.ownerId);
  return {a,head:c.label(a),say:`${a.type} — "${cut(a.content)}" 기한이 ${d}일 지났어요. ${self?'새 완료일을 정하거나 끝났으면 완료로 기록해 보세요.':`${owner} ${HONOR['manager']}과 새 완료일을 함께 정해 보세요.`}`}});
 const segs=[{k:'late',label:'기한 넘김',n:f.late.length,color:'var(--zf-danger)',tab:'기한 초과'},{k:'week',label:'이번 주 기한',n:f.week,color:'#516e8a',tab:'미처리'},{k:'later',label:'다음 주 이후',n:f.later,color:'var(--zf-control-border-hover)',tab:'미처리'}].filter(s=>s.n>0);
 return <section className="panel ai-brief action-brief" aria-label="제니에리 후속 조치 정리">
  <div className="panel-heading"><div><h2><AiMark/>제니에리가 후속 조치를 정리했어요</h2></div></div>
  <div className="chart-body"><div className="ai-brief-out">
   <section className="ai-brief-story"><h3><Newspaper size={16} aria-hidden/>무슨 일이 벌어지고 있나</h3><p>{story}</p></section>
   {f.open>0&&<section className="action-due"><h3><CalendarClock size={16} aria-hidden/>안 끝난 조치 {f.open}건 — 기한 기준</h3>
    <div className="action-due-bar" role="group" aria-label="안 끝난 조치 기한 기준">{segs.map(s=><button type="button" key={s.k} style={{flexGrow:s.n,background:s.color}} onClick={()=>c.setKind(s.tab)} aria-label={`${s.label} ${s.n}건 목록 보기`}>{s.n}</button>)}</div>
    <p className="action-due-legend">{segs.map(s=><span key={s.k}><i style={{background:s.color}}/>{s.label} <b>{s.n}건</b></span>)}</p></section>}
   {guide.length>0&&<section className="ai-brief-focus"><h3><ListChecks size={16} aria-hidden/>이렇게 챙겨 보세요<CopyButton label="이렇게 챙겨 보세요 복사" text={guide.map(g=>`- ${g.head}: ${g.say}`).join('\n')}/></h3>
    <ol>{guide.map(g=><li key={g.a.id}><button type="button" className="link" onClick={()=>c.open('action',g.a)}>{g.head}<ChevronRight size={14}/></button><span><em className="ai-brief-do">{g.say}</em></span></li>)}</ol>
    {f.late.length>3&&<button type="button" className="textbtn" onClick={()=>c.setKind('기한 초과')}>기한 넘긴 조치 {f.late.length}건 모두 보기<ChevronRight size={14}/></button>}</section>}
  </div></div>
 </section>;
}
