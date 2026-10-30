'use client';
import {downloadCsv} from '../lib/csv';
import {staleStores,overdueAt} from './status';
import {mmdd} from '../lib/date';
import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {TrendingUp,TrendingDown,Minus,AlertTriangle,Clock3,Store as StoreIcon,BarChart3,Download} from 'lucide-react';
import {type Context} from './context';
import {ChartPanel} from './charts';
import {aggregate,dayShift,typeName,weeklyTrend,type Target} from './model';
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
  {label:'방문 이행률',value:k.rate===null?'—':k.rate+'%',note:typeName(c.type),tone:'primary',icon:BarChart3,delta:<Delta now={k.rateWeek} prev={k.rateWeekPrev} unit="%p"/>,go:()=>c.go('requirements','required')},
  {label:'지연 · 계획 미등록',value:k.gap,note:'회차',tone:'',icon:Clock3,delta:<Delta now={k.gapWeek} prev={k.gapWeekPrev} invert/>,go:()=>c.go('requirements','delayed')},
  {label:'기한 넘긴 조치',value:k.overdue,note:'건',tone:'',icon:AlertTriangle,delta:<Delta now={k.overdue} prev={k.overduePrev} invert/>,go:()=>c.go('actions','기한 초과')},
  {label:'60일+ 미방문 매장',value:k.stale,note:`개 / 운영 중 ${c.storeScope.filter(t=>t.status==='운영 중').length}개`,tone:'',icon:StoreIcon,delta:null,go:()=>c.go('sites','stale')},
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
 const gapAll=rows.reduce((n,r)=>n+r.m.delayed+r.m.unplanned,0),lateAll=rows.reduce((n,r)=>n+r.overdue,0);
 return <ChartPanel title={`${s.title}별로 남은 방문 ${gapAll}회 · 기한 넘긴 조치 ${lateAll}건`} legend={<div className="panel-tools"><button type="button" className="btn small" onClick={csv}><Download size={14}/>CSV</button></div>}><div className="risk-table"><div className="risk-head"><span>{s.title}</span><span>이행률 (완료/필요)</span><span title="지연·계획 미등록 회차">지연·미등록</span><span title="기한 넘긴 후속 조치">기한 넘긴 조치</span><span title="60일 넘게 방문하지 않은 매장">60일+</span></div>
  {rows.slice(0,8).map(r=>{const rate=r.m.rate??0;return <button key={r.key} className="risk-row" onClick={()=>s.drill(r.key)}><span className="risk-name">{r.label}</span>{bar(rate,tone.ok,<>{r.m.rate??'—'}% <small>({r.m.completed}/{r.m.required})</small></>)}{bar(pct(r.m.delayed+r.m.unplanned,maxGap),tone.gray,r.m.delayed+r.m.unplanned)}{bar(pct(r.overdue,maxIssue),tone.late,<span className={r.overdue?'red-text':''}>{r.overdue}</span>)}<span className="risk-num">{r.stale}</span></button>})}
  {rows.length>8&&<p className="chart-empty">처음 8개만 표시 · 나머지 {rows.length-8}개는 통계·보고서 표에서 확인</p>}{!rows.length&&<p className="chart-empty">비교할 단위가 없습니다.</p>}</div></ChartPanel>

}
// 주별 방문 이행률: 꺾은선 하나(축 하나·%), 점마다 값. 회차 건수·누적 막대·이중 축은 지표 줄·조직 공백표와 겹쳐 뺀다(2026-10-30).
export function TrendCombo({c}:{c:Context}){
 const {rows}=weeklyTrend(c.scope.filter(t=>t.type===c.type),c.visits,c.end,c.now),w=400,h=170,padL=34,padR=12,top=24,bottom=24,plot=h-top-bottom,slot=(w-padL-padR)/Math.max(rows.length,1),x=(i:number)=>padL+slot*(i+.5),base=h-bottom,y=(v:number)=>base-v*plot/100;
 const [svg,setSvg]=useState<SVGSVGElement|null>(null),[svgScale,setSvgScale]=useState(1);
 useEffect(()=>{if(!svg)return;const update=()=>setSvgScale(Math.abs(svg.getScreenCTM()?.a||1));update();const o=new ResizeObserver(update);o.observe(svg);return()=>o.disconnect()},[svg]);
 const pts=rows.flatMap((r,i)=>r.rate===null?[]:[`${x(i)},${y(r.rate)}`]).join(' '),rated=rows.filter(r=>r.rate!==null),f0=rated[0],f1=rated.at(-1);
 return <ChartPanel title={f0&&f1&&f0!==f1?`방문 이행률 ${rated.length}주 전 ${f0.rate}% → 최근 ${f1.rate}%`:'주별 방문 이행률'}><svg ref={setSvg} style={{fontSize:12/svgScale}} viewBox={`0 0 ${w} ${h}`} className="trend" role="img" aria-label={'주별 방문 이행률 '+rated.map(r=>mmdd(r.start)+' '+r.rate+'%').join(', ')}>
  {[0,50,100].map(k=><g key={k}><line x1={padL} x2={w-padR} y1={y(k)} y2={y(k)} className="grid-line"/><text x={padL-6} y={y(k)+4} textAnchor="end" className="axis-text">{k}%</text></g>)}
  <polyline points={pts} fill="none" stroke={tone.ok} strokeWidth={2.5/svgScale+1} strokeLinejoin="round"/>
  {rows.map((r,i)=><g key={r.start}>{r.rate!==null&&<><circle cx={x(i)} cy={y(r.rate)} r={4} fill={tone.ok}/><text x={x(i)} y={y(r.rate)-8} textAnchor="middle" className="value-text">{r.rate}%</text></>}<text x={x(i)} y={h-6} textAnchor="middle" className="axis-text">{mmdd(r.start)}</text></g>)}
 </svg></ChartPanel>
}
