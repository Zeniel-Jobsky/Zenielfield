'use client';
import {useEffect,useMemo,useState} from 'react';
import {TrendingUp,TrendingDown,Minus,AlertTriangle,Clock3,Store as StoreIcon,BarChart3} from 'lucide-react';
import {nice,short} from '../ui';
import {type Context} from './context';
import {ChartPanel} from './charts';
import {aggregate,dayShift,lastTargetVisit,targetOf,targetStatus,typeName,weeklyTrend,type Target} from './model';
// 의사결정용 차트: 보는 사람의 포지션(사업부 → 팀 → 파트 → 잡매니저 → 담당 대상)에 맞춰 비교 단위가 바뀐다.
const tone={ok:'#003c33',plan:'#516e8a',late:'#b42318',miss:'#8a4b00',gray:'#65726b',dark:'#59645f'};
const pct=(a:number,b:number)=>b?Math.round(a/b*100):0;
const days=(from:string|null,to:string)=>from?Math.round((+new Date(to)-+new Date(from))/86400000):null;
export function scopeUnits(c:Context){
 const level=c.manager?'target':c.part||c.me.role==='partlead'?'manager':c.team||c.me.role==='lead'?'part':c.me.role==='manager'?'target':'team';
 const keyOf=(t:Target)=>level==='team'?[t.team]:level==='part'?[t.part]:level==='manager'?t.managerIds:[t.id];
 const names=[...new Set(c.scope.flatMap(keyOf))].filter(Boolean);
 const units=names.map(key=>({key,label:level==='manager'?c.uname(key):level==='target'?c.target(key)?.name||key:key,targets:c.scope.filter(t=>keyOf(t).includes(key))}));
 const drill=(key:string)=>{if(level==='team')c.setTeam(key);else if(level==='part')c.setPart(key);else if(level==='manager')c.setManager(key);else c.showTarget(key)};
 return {level,title:({team:'팀',part:'파트',manager:'잡매니저',target:'현장·매장'} as const)[level],units,drill};
}
function Delta({now,prev,unit='',invert=false}:{now:number|null;prev:number|null;unit?:string;invert?:boolean}){if(now===null||prev===null)return <small className="kpi-delta flat"><Minus size={11}/>전주 비교 불가</small>;const d=now-prev,good=invert?d<0:d>0;return <small className={'kpi-delta '+(d===0?'flat':good?'good':'bad')}>{d===0?<Minus size={11}/>:d>0?<TrendingUp size={11}/>:<TrendingDown size={11}/>}{d>0?'+':''}{d}{unit} 전주 대비</small>}
export function DecisionStrip({c}:{c:Context}){
 const k=useMemo(()=>{
  const targets=c.scope.filter(t=>t.type===c.type),trend=weeklyTrend(targets,c.visits,c.now,c.now,2).rows,[prev,cur]=trend;
  const m=c.metrics,overdueAt=(day:string)=>c.actions.filter(a=>a.dueDate<day&&(a.state!=='완료'||(a.completedDate||'')>day)).length;
  const stale=c.storeScope.filter(t=>t.status==='운영 중'&&(days(lastTargetVisit(t.id,c.visits),c.now)??999)>60).length;
  return {rate:m.rate,rateWeek:cur?.rate??null,rateWeekPrev:prev?.rate??null,gap:m.delayed+m.unplanned,gapWeek:cur?cur.delayed+cur.unplanned:null,gapWeekPrev:prev?prev.delayed+prev.unplanned:null,overdue:overdueAt(c.now),overduePrev:overdueAt(dayShift(c.now,-7)),stale};
 },[c.scope,c.visits,c.actions,c.now,c.type,c.metrics,c.storeScope]);
 const cards=[
  {label:'방문 이행률',value:k.rate===null?'—':k.rate+'%',note:`${typeName(c.type)} · 완료 ÷ 필요 회차`,tone:'primary',icon:BarChart3,delta:<Delta now={k.rateWeek} prev={k.rateWeekPrev} unit="%p"/>,go:()=>c.go('requirements','required')},
  {label:'지연 · 계획 미등록',value:k.gap,note:'회차 · 기한 지났거나 계획 없음',tone:'',icon:Clock3,delta:<Delta now={k.gapWeek} prev={k.gapWeekPrev} invert/>,go:()=>c.go('requirements','delayed')},
  {label:'기한 초과 이슈',value:k.overdue,note:'건 · 미완료 후속 조치',tone:'',icon:AlertTriangle,delta:<Delta now={k.overdue} prev={k.overduePrev} invert/>,go:()=>c.go('actions','기한 초과')},
  {label:'60일+ 미방문 매장',value:k.stale,note:`개 · 운영 중 매장 ${c.storeScope.filter(t=>t.status==='운영 중').length}개 중`,tone:'',icon:StoreIcon,delta:<small className="kpi-delta flat">마지막 완료 방문 기준</small>,go:()=>c.go('sites','stale')},
 ];
 return <div className="decision-strip">{cards.map(x=><button key={x.label} className={'decision-kpi '+x.tone} onClick={x.go}><span className="decision-kpi-top"><x.icon size={15}/>{x.label}</span><b>{x.value}</b><span className="decision-kpi-note">{x.note}</span>{x.delta}</button>)}</div>
}
export function ScopeRisk({c}:{c:Context}){
 const s=scopeUnits(c);
 const rows=useMemo(()=>s.units.map(u=>{const m=aggregate(u.targets.filter(t=>t.type===c.type),c.visits,c.start,c.end,c.now),ids=new Set(u.targets.map(t=>t.id));return{...u,m,overdue:c.actions.filter(a=>ids.has(targetOf(a))&&a.state!=='완료'&&a.dueDate<c.now).length,stale:u.targets.filter(t=>t.type==='store'&&t.status==='운영 중'&&(days(lastTargetVisit(t.id,c.visits),c.now)??999)>60).length}}).filter(r=>r.m.required>0||r.overdue>0).sort((a,b)=>(a.m.rate??-1)-(b.m.rate??-1)),[s.units,c.visits,c.actions,c.start,c.end,c.now,c.type]);
 const maxGap=Math.max(1,...rows.map(r=>r.m.delayed+r.m.unplanned)),maxIssue=Math.max(1,...rows.map(r=>r.overdue));
 return <ChartPanel title={`${s.title}별 운영 위험`} sub="이행률 낮은 순 · 행을 누르면 하위로 이동 · 전체 표는 통계·보고서"><div className="risk-table"><div className="risk-head"><span>{s.title}</span><span>이행률</span><span>지연·미등록</span><span title="기한 초과 이슈">초과 이슈</span><span title="60일 넘게 방문하지 않은 매장">60일+</span></div>
  {rows.slice(0,8).map(r=>{const rate=r.m.rate??0;return <button key={r.key} className="risk-row" onClick={()=>s.drill(r.key)}><span className="risk-name">{r.label}</span><span className="risk-bar"><i style={{width:rate+'%',background:tone.ok}}/><b>{r.m.rate??'—'}%</b></span><span className="risk-bar"><i style={{width:pct(r.m.delayed+r.m.unplanned,maxGap)+'%',background:tone.ok}}/><b>{r.m.delayed+r.m.unplanned}</b></span><span className="risk-bar"><i style={{width:pct(r.overdue,maxIssue)+'%',background:tone.ok}}/><b>{r.overdue}</b></span><span className={'risk-num'+(r.stale?' red-text':'')}>{r.stale}</span></button>})}
  {rows.length>8&&<p className="chart-empty">상위 8개만 표시 · 나머지 {rows.length-8}개는 표에서 확인</p>}{!rows.length&&<p className="chart-empty">비교할 단위가 없습니다.</p>}</div></ChartPanel>
}
const statusOrder=[['방문 지연',tone.late,'delayed'],['계획 미등록',tone.miss,'unplanned'],['이력 미확인',tone.gray,'stale'],['방문 예정',tone.plan,'planned'],['방문 완료',tone.ok,'completed'],['정상 관리','#166534','']] as const;
export function StoreStatusChart({c}:{c:Context}){
 const targets=c.scope.filter(t=>t.type===c.type&&t.status==='운영 중'),counts=useMemo(()=>{const m=new Map<string,number>();for(const t of targets)m.set(targetStatus(t,c.visits,c.allMetrics),(m.get(targetStatus(t,c.visits,c.allMetrics))||0)+1);return m},[targets,c.visits,c.allMetrics]);
 const total=targets.length,max=Math.max(1,...statusOrder.map(([k])=>counts.get(k)||0));
 return <ChartPanel title={`${typeName(c.type).replace(' 방문','')} 운영 상태`} sub={`운영 중 ${total}개 · 조회 기간 회차 기준`}><div className="hbar-list">{statusOrder.map(([label,color,key])=>{const v=counts.get(label)||0;return <button key={label} className="hbar" onClick={()=>key==='stale'?c.go('sites','stale'):key?c.go('requirements',key):c.go('sites')}><span className="hbar-label">{label}</span><span className="hbar-track"><i style={{width:pct(v,max)+'%',background:color}}/></span><b>{v}<small>{pct(v,total)}%</small></b></button>})}</div></ChartPanel>
}
const issueTypes=['인력 충원','고객사 요청','운영환경 개선','민원 대응','안전·시설','기타'];
export function IssueTypeChart({c}:{c:Context}){
 const rows=useMemo(()=>[...new Set([...issueTypes,...c.actions.map(a=>a.type)])].map(t=>{const all=c.actions.filter(a=>a.type===t);return{t,overdue:all.filter(a=>a.state!=='완료'&&a.dueDate<c.now).length,open:all.filter(a=>a.state!=='완료'&&a.dueDate>=c.now).length,done:all.filter(a=>a.state==='완료').length}}).filter(r=>r.overdue+r.open+r.done>0).sort((a,b)=>b.overdue-a.overdue||b.open-a.open).slice(0,8),[c.actions,c.now]);
 const max=Math.max(1,...rows.map(r=>r.overdue+r.open+r.done));
 return <ChartPanel title="이슈 유형별 처리 현황" sub="기한 초과 많은 순 · 막대를 누르면 이슈 목록" legend={<div className="chart-legend"><span><i style={{background:tone.late}}/>기한 초과</span><span><i style={{background:tone.plan}}/>진행 중</span><span><i style={{background:tone.ok}}/>완료</span></div>}><div className="hbar-list">{rows.map(r=><button key={r.t} className="hbar" onClick={()=>c.go('actions',r.overdue?'기한 초과':'미처리')}><span className="hbar-label">{r.t}</span><span className="hbar-track stacked"><i style={{width:pct(r.overdue,max)+'%',background:tone.late}}/><i style={{width:pct(r.open,max)+'%',background:tone.plan}}/><i style={{width:pct(r.done,max)+'%',background:tone.ok}}/></span><b>{r.overdue+r.open}<small>/{r.overdue+r.open+r.done}</small></b></button>)}{!rows.length&&<p className="chart-empty">등록된 이슈가 없습니다.</p>}</div></ChartPanel>
}
const ageBins=[['0–7일',0,7,tone.ok],['8–14일',8,14,'#166534'],['15–30일',15,30,tone.plan],['31–60일',31,60,tone.miss],['60일+',61,99999,tone.late],['이력 없음',-1,-1,tone.gray]] as const;
export function VisitAgeChart({c}:{c:Context}){
 const targets=c.scope.filter(t=>t.type===c.type&&t.status==='운영 중');
 const bins=useMemo(()=>ageBins.map(([label,a,b,color])=>({label,color,n:targets.filter(t=>{const d=days(lastTargetVisit(t.id,c.visits),c.now);return a<0?d===null:d!==null&&d>=a&&d<=b}).length})),[targets,c.visits,c.now]);
 const max=Math.max(1,...bins.map(b=>b.n));
 return <ChartPanel title="마지막 방문 경과" sub={`운영 중 ${typeName(c.type).replace(' 방문','')} ${targets.length}개 · 완료 방문 기준`}><div className="vbar-list">{bins.map(b=><button key={b.label} className="vbar" onClick={()=>c.go('sites',b.label==='60일+'||b.label==='이력 없음'?'stale':'')}><b>{b.n}</b><span className="vbar-track"><i style={{height:pct(b.n,max)+'%',background:b.color}}/></span><small>{b.label}</small></button>)}</div></ChartPanel>
}
export function TrendCombo({c,goal}:{c:Context;goal?:number}){
 const {rows}=weeklyTrend(c.scope.filter(t=>t.type===c.type),c.visits,c.end,c.now),w=360,h=150,pad=22,x=(i:number)=>pad+i*(w-pad*2)/Math.max(rows.length-1,1),maxReq=Math.max(1,...rows.map(r=>r.required)),bh=(v:number)=>v/maxReq*(h-50),y=(v:number)=>h-26-v*(h-50)/100,bw=Math.max(6,(w-pad*2)/Math.max(rows.length,1)/3);
 // SVG 배율이 바뀌어도 화면에서 축·수치 글자는 12px로 유지한다.
 const [svg,setSvg]=useState<SVGSVGElement|null>(null),[svgScale,setSvgScale]=useState(1);
 useEffect(()=>{if(!svg)return;const update=()=>setSvgScale(Math.abs(svg.getScreenCTM()?.a||1));update();const observer=new ResizeObserver(update);observer.observe(svg);return()=>observer.disconnect()},[svg]);
 const pts=rows.flatMap((r,i)=>r.rate===null?[]:[`${x(i)},${y(r.rate)}`]).join(' ');
 return <ChartPanel title="주별 이행 추이" sub={`최근 ${rows.length}주 · 막대 완료·지연·미등록 회차, 선 이행률`} legend={<div className="chart-legend"><span><i style={{background:tone.ok}}/>완료</span><span><i style={{background:tone.late}}/>지연</span><span><i style={{background:tone.miss}}/>미등록</span><span><i style={{background:tone.plan,borderRadius:6}}/>이행률</span></div>}><svg ref={setSvg} style={{fontSize:12/svgScale}} viewBox={`0 0 ${w} ${h}`} className="trend combo" role="img" aria-label="주별 이행 추이">{goal!==undefined&&<><line x1={pad} x2={w-pad} y1={y(goal)} y2={y(goal)} className="goal-line"/><text x={w-pad} y={y(goal)-4} textAnchor="end" className="axis-text">목표 {goal}%</text></>}{rows.map((r,i)=>{const cx=x(i),done=bh(r.completed),late=bh(r.delayed),miss=bh(r.unplanned);return <g key={r.start}><rect x={cx-bw*1.5} width={bw} y={h-26-done} height={done} fill={tone.ok}><title>{`${nice(r.start)} 주 완료 ${r.completed}`}</title></rect><rect x={cx-bw*.5} width={bw} y={h-26-late} height={late} fill={tone.late}><title>{`지연 ${r.delayed}`}</title></rect><rect x={cx+bw*.5} width={bw} y={h-26-miss} height={miss} fill={tone.miss}><title>{`미등록 ${r.unplanned}`}</title></rect><text x={cx} y={h-8} textAnchor="middle" className="axis-text">{short(r.start)}</text></g>})}<polyline points={pts} fill="none" stroke={tone.plan} strokeWidth="2.5"/>{rows.map((r,i)=>r.rate!==null&&<g key={'p'+r.start}><circle cx={x(i)} cy={y(r.rate)} r="3.5" fill="white" stroke={tone.plan} strokeWidth="2"><title>{`${nice(r.start)} 주 이행률 ${r.rate}%`}</title></circle><text x={x(i)} y={y(r.rate)-7} textAnchor="middle" className="axis-text strong">{r.rate}%</text></g>)}</svg></ChartPanel>
}
