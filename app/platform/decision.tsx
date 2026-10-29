'use client';
import {downloadCsv} from '../lib/csv';
import {staleStores,overdueAt} from './status';
import {daysBetween as days} from '../lib/date';
import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {TrendingUp,TrendingDown,Minus,AlertTriangle,Clock3,Store as StoreIcon,BarChart3,Download} from 'lucide-react';
import {nice,short} from '../ui';
import {type Context} from './context';
import {ChartPanel} from './charts';
import {aggregate,dayShift,lastTargetVisit,targetOf,targetStatus,typeName,weeklyTrend,type Target,SLOT_LABEL,NO_HISTORY,NO_REQUIRED} from './model';
import {ISSUE_TYPES} from './judgment';
// 의사결정용 차트: 보는 사람의 포지션(사업부 → 팀 → 파트 → 잡매니저 → 담당 대상)에 맞춰 비교 단위가 바뀐다.
const tone={ok:'#003c33',plan:'#516e8a',late:'#b42318',miss:'#8a4b00',gray:'#65726b',dark:'#59645f',
 sand:'#d1a574',sandEdge:'#b98a58',
 // 완료·예정·지연·미등록 밖의 색(2026-10-29): 신선→경과는 초록 계열(완료 딥그린→중간 초록), 기록·요구가 없는 상태는 보라 계열(이력 없음/미확인 진한 보라, 필요 방문 없음 옅은 라일락).
 mid:'#2f8466',none:'#6d5a8a'};
const pct=(a:number,b:number)=>b?Math.round(a/b*100):0;
export function scopeUnits(c:Context){
 const level=c.manager?'target':c.part||c.me.role==='partlead'?'manager':c.team||c.me.role==='lead'?'part':c.me.role==='manager'?'target':'team';
 const keyOf=(t:Target)=>level==='team'?[t.team]:level==='part'?[t.part]:level==='manager'?t.managerIds:[t.id];
 const names=[...new Set(c.scope.flatMap(keyOf))].filter(Boolean);
 const units=names.map(key=>({key,label:level==='manager'?c.uname(key):level==='target'?c.target(key)?.name||key:key,targets:c.scope.filter(t=>keyOf(t).includes(key))}));
 const drill=(key:string)=>{if(level==='team')c.setTeam(key);else if(level==='part')c.setPart(key);else if(level==='manager')c.setManager(key);else c.showTarget(key)};
 return {level,title:({team:'팀',part:'파트',manager:'잡매니저',target:'현장·매장'} as const)[level],units,drill};
}
function Delta({now,prev,unit='',invert=false}:{now:number|null;prev:number|null;unit?:string;invert?:boolean}){if(now===null||prev===null)return <small className="kpi-delta flat"><Minus size={14}/>전주 비교 불가</small>;const d=now-prev,good=invert?d<0:d>0;return <small className={'kpi-delta '+(d===0?'flat':good?'good':'bad')}>{d===0?<Minus size={14}/>:d>0?<TrendingUp size={14}/>:<TrendingDown size={14}/>}{d>0?'+':''}{d}{unit} 전주 대비</small>}
export function DecisionStrip({c}:{c:Context}){
 const k=useMemo(()=>{
  const targets=c.scope.filter(t=>t.type===c.type),trend=weeklyTrend(targets,c.visits,c.now,c.now,2).rows,[prev,cur]=trend;
  const m=c.metrics;
  const stale=staleStores(c.storeScope,c.visits,c.now).length;
  return {rate:m.rate,rateWeek:cur?.rate??null,rateWeekPrev:prev?.rate??null,gap:m.delayed+m.unplanned,gapWeek:cur?cur.delayed+cur.unplanned:null,gapWeekPrev:prev?prev.delayed+prev.unplanned:null,overdue:overdueAt(c.actions,c.now),overduePrev:overdueAt(c.actions,dayShift(c.now,-7)),stale};
 },[c.scope,c.visits,c.actions,c.now,c.type,c.metrics,c.storeScope]);
 const cards=[
  {label:'방문 이행률',value:k.rate===null?'—':k.rate+'%',note:`${typeName(c.type)} · 완료 ÷ 필요 회차`,tone:'primary',icon:BarChart3,delta:<Delta now={k.rateWeek} prev={k.rateWeekPrev} unit="%p"/>,go:()=>c.go('requirements','required')},
  {label:'지연 · 계획 미등록',value:k.gap,note:'회차 · 기한 지났거나 계획 없음',tone:'',icon:Clock3,delta:<Delta now={k.gapWeek} prev={k.gapWeekPrev} invert/>,go:()=>c.go('requirements','delayed')},
  {label:'기한 초과 이슈',value:k.overdue,note:'건 · 미완료 후속 조치',tone:'',icon:AlertTriangle,delta:<Delta now={k.overdue} prev={k.overduePrev} invert/>,go:()=>c.go('actions','기한 초과')},
  {label:'60일+ 미방문 매장',value:k.stale,note:`개 · 운영 중 매장 ${c.storeScope.filter(t=>t.status==='운영 중').length}개 중`,tone:'',icon:StoreIcon,delta:<small className="kpi-delta flat">마지막 완료 방문 기준</small>,go:()=>c.go('sites','stale')},
 ];
 return <div className="decision-strip">{cards.map(x=><button key={x.label} className={'decision-kpi '+x.tone} onClick={x.go}><span className="decision-kpi-top"><x.icon size={14}/>{x.label}</span><b>{x.value}</b><span className="decision-kpi-note">{x.note}</span>{x.delta}</button>)}</div>
}
export function ScopeRisk({c}:{c:Context}){
 const s=scopeUnits(c);
 const rows=useMemo(()=>s.units.map(u=>{const m=aggregate(u.targets.filter(t=>t.type===c.type),c.visits,c.start,c.end,c.now),ids=new Set(u.targets.map(t=>t.id));return{...u,m,overdue:overdueAt(c.actions,c.now,ids),stale:staleStores(u.targets,c.visits,c.now).length}}).filter(r=>r.m.required>0||r.overdue>0).sort((a,b)=>a.label.localeCompare(b.label,'ko')),[s.units,c.visits,c.actions,c.start,c.end,c.now,c.type]);
 const maxGap=Math.max(1,...rows.map(r=>r.m.delayed+r.m.unplanned)),maxIssue=Math.max(1,...rows.map(r=>r.overdue));
 // 열마다 의미색: 이행률 딥그린 · 지연·미등록 중립 · 기한 초과 이슈 지연색. 막대는 옅은 트랙 위에 그리고 값은 막대 오른쪽에 둔다.
 const bar=(w:number,color:string,label:ReactNode)=><span className="risk-bar"><span className="risk-track"><i style={{width:w+'%',background:color}}/></span><b>{label}</b></span>;
 // 보고용 내려받기(통계·보고서 메뉴를 이 표로 합침): 화면과 같은 행·같은 계산
 const csv=()=>downloadCsv([[s.title,'필요 회차','완료','이행률(%)','지연','계획 미등록','기한 넘긴 조치','60일+ 미방문 매장'],...rows.map(r=>[r.label,r.m.required,r.m.completed,r.m.rate??'',r.m.delayed,r.m.unplanned,r.overdue,r.stale])],`${s.title}별_방문_공백_${c.start}_${c.end}.csv`);
 return <ChartPanel title={`${s.title}별 방문 공백`} sub="조직 순서 · 행을 누르면 하위로 이동" legend={<div className="panel-tools"><button type="button" className="btn small" onClick={csv}><Download size={14}/>CSV</button></div>}><div className="risk-table"><div className="risk-head"><span>{s.title}</span><span>이행률 (완료/필요)</span><span title="지연·계획 미등록 회차">지연·미등록</span><span title="기한 넘긴 후속 조치">기한 넘긴 조치</span><span title="60일 넘게 방문하지 않은 매장">60일+</span></div>
  {rows.slice(0,8).map(r=>{const rate=r.m.rate??0;return <button key={r.key} className="risk-row" onClick={()=>s.drill(r.key)}><span className="risk-name">{r.label}</span>{bar(rate,tone.ok,<>{r.m.rate??'—'}% <small>({r.m.completed}/{r.m.required})</small></>)}{bar(pct(r.m.delayed+r.m.unplanned,maxGap),tone.gray,r.m.delayed+r.m.unplanned)}{bar(pct(r.overdue,maxIssue),tone.late,<span className={r.overdue?'red-text':''}>{r.overdue}</span>)}<span className="risk-num">{r.stale}</span></button>})}
  {rows.length>8&&<p className="chart-empty">처음 8개만 표시 · 나머지 {rows.length-8}개는 통계·보고서 표에서 확인</p>}{!rows.length&&<p className="chart-empty">비교할 단위가 없습니다.</p>}</div></ChartPanel>

}
const issueTypes=ISSUE_TYPES;
export function IssueTypeChart({c}:{c:Context}){
 const rows=useMemo(()=>[...new Set([...issueTypes,...c.actions.map(a=>a.type)])].map(t=>{const all=c.actions.filter(a=>a.type===t);return{t,overdue:all.filter(a=>a.state!=='완료'&&a.dueDate<c.now).length,open:all.filter(a=>a.state!=='완료'&&a.dueDate>=c.now).length,done:all.filter(a=>a.state==='완료').length}}).filter(r=>r.overdue+r.open+r.done>0).sort((a,b)=>b.overdue-a.overdue||b.open-a.open).slice(0,8),[c.actions,c.now]);
 return <ChartPanel title="이슈 유형별 처리 현황" sub="기한 초과 많은 순 · 막대 안 숫자는 건수, 오른쪽은 미완료(기한 초과+진행 중) / 전체 · 막대를 누르면 이슈 목록" legend={<div className="chart-legend"><span><i style={{background:tone.late}}/>기한 초과</span><span><i style={{background:tone.plan}}/>진행 중</span><span><i style={{background:tone.ok}}/>완료</span></div>}><div className="hbar-list wide-value">{rows.map(r=><button key={r.t} className="hbar" onClick={()=>c.go('actions',r.overdue?'기한 초과':'미처리')}><span className="hbar-label">{r.t}</span><span className="hbar-track stacked">{r.overdue>0&&<i style={{width:pct(r.overdue,r.overdue+r.open+r.done)+'%',background:tone.late}}><span>{r.overdue}</span></i>}{r.open>0&&<i style={{width:pct(r.open,r.overdue+r.open+r.done)+'%',background:tone.plan}}><span>{r.open}</span></i>}{r.done>0&&<i style={{width:pct(r.done,r.overdue+r.open+r.done)+'%',background:tone.ok}}><span>{r.done}</span></i>}</span><b><span className="hbar-open">미완료 {r.overdue+r.open}</span><small>/ 전체 {r.overdue+r.open+r.done}건 ({pct(r.overdue+r.open,r.overdue+r.open+r.done)}%)</small></b></button>)}{!rows.length&&<p className="chart-empty">등록된 이슈가 없습니다.</p>}</div></ChartPanel>
}
const ageBins=[['0–7일',0,7,tone.ok],['8–14일',8,14,tone.mid],['15–30일',15,30,tone.plan],['31–60일',31,60,tone.miss],['60일+',61,99999,tone.miss],['이력 없음',-1,-1,tone.none]] as const;
export function VisitAgeChart({c}:{c:Context}){
 const targets=c.scope.filter(t=>t.type===c.type&&t.status==='운영 중');
 const bins=useMemo(()=>ageBins.map(([label,a,b,color])=>({label,color,n:targets.filter(t=>{const d=days(lastTargetVisit(t.id,c.visits),c.now);return a<0?d===null:d!==null&&d>=a&&d<=b}).length})),[targets,c.visits,c.now]);
 const max=Math.max(1,...bins.map(b=>b.n));
 return <ChartPanel title="마지막 방문 경과" sub={`운영 중 ${typeName(c.type).replace(' 방문','')} ${targets.length}개 · 완료 방문 기준`}><div className="vbar-list">{bins.map(b=><button key={b.label} className="vbar" aria-label={`${b.label} ${b.n}개`} onClick={()=>c.go('sites',b.label==='60일+'||b.label==='이력 없음'?'stale':'')}><span className="vbar-track"><b>{b.n}</b><i style={{height:pct(b.n,max)+'%',background:b.color}}/></span><small>{b.label}</small></button>)}</div></ChartPanel>
}
export function TrendCombo({c,goal}:{c:Context;goal?:number}){
 // 막대: 완료·지연·미등록 회차를 한 막대에 쌓는다(같은 단위). 왼쪽 축 회차, 오른쪽 축 이행률(사용자 요청 2026-10-29 예외).
 const {rows}=weeklyTrend(c.scope.filter(t=>t.type===c.type),c.visits,c.end,c.now),w=400,h=200,padL=34,padR=44,top=40,bottom=24,plot=h-top-bottom,slot=(w-padL-padR)/Math.max(rows.length,1),x=(i:number)=>padL+slot*(i+.5),total=(r:typeof rows[number])=>r.completed+r.delayed+r.unplanned,step=Math.max(1,Math.ceil(Math.max(1,...rows.map(total))/4)),maxCnt=step*4,bh=(v:number)=>v/maxCnt*plot,base=h-bottom,y=(v:number)=>base-v*plot/100,bw=Math.min(28,slot*.55);
 // SVG 배율이 바뀌어도 화면에서 축·수치 글자는 12px로 유지한다.
 const [svg,setSvg]=useState<SVGSVGElement|null>(null),[svgScale,setSvgScale]=useState(1);
 useEffect(()=>{if(!svg)return;const update=()=>setSvgScale(Math.abs(svg.getScreenCTM()?.a||1));update();const observer=new ResizeObserver(update);observer.observe(svg);return()=>observer.disconnect()},[svg]);
 // 막대 안 조각마다 건수를 쓴다. 조각이 글자보다 낮으면 막대 오른쪽에 같은 색 글자로 빼고, 이웃 라벨과 겹치면 위로 밀어낸다.
 const lineH=12/svgScale+2,segLabels=(cx:number,segs:[number,number,number,string][])=>{const out:{key:string;v:number;x:number;y:number;inside:boolean;color:string}[]=[];let lastSide=Infinity;for(const [v,hh,off,color] of segs){if(!v)continue;const mid=base-off-hh/2;if(hh>=lineH)out.push({key:color,v,x:cx,y:mid+4,inside:true,color});else{const yy=Math.min(mid+4,lastSide-lineH);lastSide=yy;out.push({key:color,v,x:cx+bw/2+3,y:yy,inside:false,color})}}return out};
 const labsOf=(r:typeof rows[number],cx:number)=>segLabels(cx,[[r.completed,bh(r.completed),0,tone.ok],[r.delayed,bh(r.delayed),bh(r.completed),tone.late],[r.unplanned,bh(r.unplanned),bh(r.completed)+bh(r.delayed),tone.miss]]);
 // 이행률 상자가 막대 안 건수를 가리면 막대 꼭대기 위로 올린다.
 const pillY=(r:typeof rows[number],i:number)=>{const py=y(r.rate||0)-22;return labsOf(r,x(i)).some(l=>l.inside&&l.y-12<py+15&&l.y+3>py)?Math.min(py,base-bh(total(r))-4-14-16):py};
 const pts=rows.flatMap((r,i)=>r.rate===null?[]:[`${x(i)},${y(r.rate)}`]).join(' ');
 return <ChartPanel title="주별 이행 추이" sub={`최근 ${rows.length}주 · 막대 완료·지연·미등록 회차, 선 이행률`} legend={<div className="chart-legend"><span><i style={{background:tone.ok}}/>완료</span><span><i style={{background:tone.late}}/>지연</span><span><i style={{background:tone.miss}}/>미등록</span><span><i style={{background:tone.dark,borderRadius:6}}/>이행률</span></div>}><svg ref={setSvg} style={{fontSize:12/svgScale}} viewBox={`0 0 ${w} ${h}`} className="trend combo" role="img" aria-label="주별 이행 추이">{[0,1,2,3,4].map(k=><g key={'g'+k}><line x1={padL} x2={w-padR} y1={base-plot*k/4} y2={base-plot*k/4} className="grid-line"/><text x={padL-6} y={base-plot*k/4+4} textAnchor="end" className="axis-text">{step*k}</text><text x={w-padR+6} y={base-plot*k/4+4} className="axis-text">{25*k}%</text></g>)}{goal!==undefined&&<><line x1={padL} x2={w-padR} y1={y(goal)} y2={y(goal)} className="goal-line"/><text x={w-padR} y={y(goal)-4} textAnchor="end" className="axis-text">목표 {goal}%</text></>}{rows.map((r,i)=>{const cx=x(i),done=bh(r.completed),late=bh(r.delayed),miss=bh(r.unplanned),n=total(r);return <g key={r.start}><rect x={cx-bw/2} width={bw} y={base-done} height={done} fill={tone.ok}><title>{`${nice(r.start)} 주 완료 ${r.completed}`}</title></rect><rect x={cx-bw/2} width={bw} y={base-done-late} height={late} fill={tone.late}><title>{`${nice(r.start)} 주 지연 ${r.delayed}`}</title></rect><rect x={cx-bw/2} width={bw} y={base-done-late-miss} height={miss} fill={tone.miss}><title>{`${nice(r.start)} 주 미등록 ${r.unplanned}`}</title></rect>{n>0&&(r.rate===null||Math.abs(base-done-late-miss-4-(pillY(r,i)+11))>18)&&<text x={cx} y={base-done-late-miss-4} textAnchor="middle" className="axis-text strong bar-total">{n}</text>}{labsOf(r,cx).map(l=><text key={l.key} x={l.x} y={l.y} textAnchor={l.inside?"middle":"start"} className={"axis-text strong seg-label"+(l.inside?" in":" side")} style={l.inside?undefined:{fill:l.color}}>{l.v}</text>)}<text x={cx} y={h-6} textAnchor="middle" className="axis-text">{short(r.start)}</text></g>})}<polyline points={pts} fill="none" stroke={tone.dark} strokeWidth="2"/>{rows.map((r,i)=>r.rate!==null&&<g key={'p'+r.start}><circle cx={x(i)} cy={y(r.rate)} r="3.5" fill="white" stroke={tone.dark} strokeWidth="2"><title>{`${nice(r.start)} 주 이행률 ${r.rate}%`}</title></circle><rect x={x(i)-17} y={pillY(r,i)} width="34" height="15" rx="3" className="rate-pill"/><text x={x(i)} y={pillY(r,i)+11} textAnchor="middle" className="axis-text strong">{r.rate}%</text></g>)}</svg></ChartPanel>
}
