'use client';
// 후속 조치 화면 맨 위 제니에리 정리: 무슨 일(주제마다 문단) → 이렇게 챙겨 보세요(할 일 한 문장 + 오래 밀린 조치 3건). 막대 차트 없음(숫자는 문장과 탭에).
// AI 없이 화면이 가진 사실로만 쓴다(DC-JUDGMENT). 비교는 자기 지난 2주와만(DC-FEEDBACK), 빨강은 기한 넘긴 조각에만.
import {useMemo} from 'react';
import {Newspaper,ListChecks,ChevronRight} from 'lucide-react';
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
 // 문단 = 주제마다 하나: 현황(안 끝난·기한 지남·이번 주) / 진척(지난 2주 비교·많은 유형)
 const story=f.open===0?[`안 끝난 조치가 없어요. 최근 2주에 ${f.done14}건을 끝냈어요.`]
  :[[`안 끝난 조치가 ${f.open}건이에요.`,f.late.length?`그중 ${f.late.length}건은 기한이 지났어요.`:'모두 기한 안에 있어요.',f.week?`이번 주가 기한인 조치는 ${f.week}건이에요.`:''].filter(Boolean).join(' '),
   [`최근 2주에 ${f.done14}건을 끝냈어요${f.donePrev===f.done14?'. 그 전 2주와 같아요':`. 그 전 2주에는 ${f.donePrev}건이었어요`}.`,f.late.length>=3&&f.topType?`기한 넘긴 조치는 ${f.topType} 유형이 가장 많아요.`:''].filter(Boolean).join(' ')];
 const self=c.me.role==='manager';
 // 가이드: 할 일은 한 문장으로 한 번만, 아래는 오래 밀린 조치 3건(대상 · 유형·내용 · 기한 지난 날수)
 const advice=self?'오래 밀린 것부터 새 완료일을 정하거나, 끝난 건 완료로 기록해 보세요.':'오래 밀린 것부터 담당 매니저와 새 완료일을 함께 정해 보세요.';
 const guide=f.late.slice(0,3).map(a=>({a,head:c.label(a),what:`${a.type} · ${cut(a.content)}`,meta:`기한 ${daysBetween(a.dueDate,c.now)}일 지남${self?'':' · '+c.uname(a.ownerId)+' '+HONOR.manager}`}));
 return <section className="panel ai-brief action-brief" aria-label="제니에리 후속 조치 정리">
  <div className="panel-heading"><div><h2><AiMark/>제니에리가 후속 조치를 정리했어요</h2></div></div>
  <div className="chart-body"><div className="ai-brief-out">
   <section className="ai-brief-story"><h3><Newspaper size={16} aria-hidden/>무슨 일이 벌어지고 있나</h3>{story.map((x,i)=><p key={i}>{x}</p>)}</section>
   {guide.length>0&&<section className="ai-brief-focus"><h3><ListChecks size={16} aria-hidden/>이렇게 챙겨 보세요<CopyButton label="이렇게 챙겨 보세요 복사" text={[advice,...guide.map(g=>`- ${g.head}: ${g.what} (${g.meta})`)].join('\n')}/></h3>
    <p className="action-advice">{advice}</p>
    <ul className="action-late">{guide.map(g=><li key={g.a.id}><button type="button" onClick={()=>c.open('action',g.a)}><b>{g.head}</b><span>{g.what}</span><small>{g.meta}</small><ChevronRight size={16} aria-hidden/></button></li>)}</ul>
    {f.late.length>3&&<button type="button" className="textbtn" onClick={()=>c.setKind('기한 초과')}>기한 넘긴 조치 {f.late.length}건 모두 보기<ChevronRight size={14}/></button>}</section>}
  </div></div>
 </section>;
}
