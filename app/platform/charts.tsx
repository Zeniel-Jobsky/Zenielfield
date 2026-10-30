'use client';
import {scopeUnits} from './decision';
import {SLOT_SHORT} from './model';
import type {ReactNode} from 'react';
import {PanelTitle,nice,short} from '../ui';
import {type Context} from './context';
import {aggregate,between,dayShift,typeName,weekOf,weeklyTrend,type Metrics,type Target,type WeekRow} from './model';
const tone={completed:'#003c33',planned:'#516e8a',delayed:'#b42318',unplanned:'#8a4b00'};
const parts=(['completed','planned','delayed','unplanned'] as const).map(key=>({key,label:SLOT_SHORT[key]}));
const pct=(a:number,b:number)=>b?a/b*100:0;
export function ChartPanel({title,sub,legend,children}:{title:string;sub?:string;legend?:ReactNode;children:ReactNode}){return <section className="panel chart-panel"><PanelTitle title={title} sub={sub}/>{legend&&<div className="chart-panel-legend">{legend}</div>}<div className="chart-body">{children}</div></section>}
function Legend(){return <div className="chart-legend">{parts.map(p=><span key={p.key}><i style={{background:tone[p.key]}}/>{p.label}</span>)}</div>}
function Stack({m,onPick}:{m:Pick<Metrics,'required'|'completed'|'planned'|'delayed'|'unplanned'>;onPick:(k:string)=>void}){return <div className="stack-bar">{parts.map(p=>m[p.key]>0&&<button key={p.key} title={`${p.label} ${m[p.key]}회차`} aria-label={`${p.label} ${m[p.key]}회차`} style={{width:pct(m[p.key],m.required)+'%',background:tone[p.key]}} onClick={()=>onPick(p.key)}/>)}</div>}
export function TrendChart({c,goal}:{c:Context;goal?:number}){const {rows}=weeklyTrend(c.scope.filter(t=>t.type===c.type),c.visits,c.end,c.now),w=320,h=130,x=(i:number)=>20+i*(w-40)/Math.max(rows.length-1,1),y=(v:number)=>h-20-v*(h-40)/100,pts=rows.flatMap((r,i)=>r.rate===null?[]:[`${x(i)},${y(r.rate)}`]).join(' ');return <ChartPanel title="주별 이행률 추이" sub={`최근 ${rows.length}주 · 완료 ÷ 필요 회차`}><svg viewBox={`0 0 ${w} ${h}`} className="trend" role="img" aria-label="주별 이행률 추이">{goal!==undefined&&<><line x1="20" x2={w-20} y1={y(goal)} y2={y(goal)} className="goal-line"/><text x={w-20} y={y(goal)-4} textAnchor="end" className="axis-text">목표 {goal}%</text></>}<polyline points={pts} fill="none" stroke={tone.planned} strokeWidth="2.5"/>{rows.map((r,i)=><g key={r.start}>{r.rate!==null&&<circle cx={x(i)} cy={y(r.rate)} r="3.5" fill={tone.completed}><title>{`${nice(r.start)} 주 · ${r.rate}% (${r.completed}/${r.required})`}</title></circle>}<text x={x(i)} y={h-4} textAnchor="middle" className="axis-text">{short(r.start)}</text></g>)}</svg></ChartPanel>}
// 조직 단위 묶기는 scopeUnits(decision.tsx) 하나로: 역할·필터에 맞는 하위 단위(팀→파트→잡매니저→현장·매장)와 이동 방식이 다른 화면과 같다.
function groupRows(c:Context){const s=scopeUnits(c);return s.units.map(u=>({name:u.key,label:u.label,m:aggregate(u.targets.filter(t=>t.type===c.type),c.visits,c.start,c.end,c.now)})).filter(r=>r.m.required>0)}
// 담당자별 지연 분포: 투명도 대신 5단계 고정 색(옅은 살구 → 지연 빨강). 건수가 5 이하이면 건수가 곧 단계, 많으면 최대값 기준 5등분.
const HEAT=['#f4ddd8','#e8b5ab','#d98777','#c8533f','#b42318'];
const heatLevel=(v:number,max:number)=>Math.min(5,Math.max(1,max<=5?v:Math.ceil(v/max*5)));
const states=[{key:'미처리',color:tone.delayed},{key:'조치 예정',color:tone.planned},{key:'처리 중',color:'#516e8a'},{key:'보류',color:'#65726b'},{key:'완료',color:tone.completed}];
