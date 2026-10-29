// 일정 미리 찾기·후보 예측: 기록된 사실(필요 회차 기간, 내 잡힌 일정, 이 대상 지난 방문 시간, 같은 지역 일정)만으로 만든다.
// 점수·임계값으로 순위를 매기지 않는다(DC-JUDGMENT). 후보는 날짜순이고, 각 후보에 사실 꼬리표를 붙인다.
import {dayShift,daysBetween,between} from '../lib/date';
import {aggregate,targetOf,type FieldVisit,type Target} from './model';

export type ScheduleFacts={window:{id:string;start:string;end:string}|null;lastVisit:string|null;planned:string[];usualTime:{time:string;n:number}|null};
export type ScheduleCandidate={date:string;time:string;tags:string[]};

const mine=(visits:FieldVisit[],visitor:string,from:string,to:string)=>visits.filter(v=>v.visitorId===visitor&&v.status==='planned'&&!!v.plannedDate&&between(v.plannedDate,from,to));

// 이 대상의 사실: 오늘 이후 아직 채워지지 않은 가장 이른 필요 회차 기간, 마지막 방문일, 이미 잡힌 일정, 지난 방문에서 가장 많이 쓴 시간
export function scheduleFacts(t:Target,visits:FieldVisit[],now:string):ScheduleFacts{
 const own=visits.filter(v=>targetOf(v)===t.id);
 // 아직 일정도 방문도 없는 필요 회차(회차 계산은 aggregate와 같다: 날짜로 맞춘 방문도 채운 것으로 본다)
 const req=t.rule.period==='manual'?undefined:aggregate([t],visits,now,dayShift(now,60),now).slots.filter(r=>r.state==='unplanned'&&r.windowEnd>=now).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0];
 const last=own.filter(v=>v.status==='completed'&&v.actualDate).map(v=>v.actualDate!).sort().pop()||null;
 const planned=own.filter(v=>v.status==='planned'&&v.plannedDate&&v.plannedDate>=now).map(v=>v.plannedDate!).sort();
 const times=new Map<string,number>();for(const v of own){const tm=(v.status==='completed'?v.actualTime:v.time)||'';if(/^\d{2}:\d{2}$/.test(tm))times.set(tm,(times.get(tm)||0)+1)}
 const usual=[...times].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];
 return {window:req?{id:req.id,start:req.windowStart<now?now:req.windowStart,end:req.windowEnd}:null,lastVisit:last,planned,usualTime:usual?{time:usual[0],n:usual[1]}:null};
}

// 후보 날짜: 필요 회차 기간 안(없으면 오늘부터 2주)의 날 중 사실 꼬리표가 붙는 날만, 날짜순 최대 limit개.
// 꼬리표: 비어 있음(내 일정 없음) · 같은 지역 n건(그날 같은 지역 대상 일정) · 마감 전 마지막 빈 날. 시간은 주로 간 시간, 그날 겹치면 마지막 일정 1시간 뒤.
export function scheduleCandidates(t:Target,targets:Map<string,Target>,visits:FieldVisit[],visitor:string,now:string,facts:ScheduleFacts,limit=5):ScheduleCandidate[]{
 const from=facts.window?.start||now,to=facts.window?.end||dayShift(now,13);
 const len=Math.max(0,daysBetween(from,to)),days=Array.from({length:len+1},(_,i)=>dayShift(from,i)).filter(d=>!facts.planned.includes(d));
 const plans=mine(visits,visitor,from,to),byDay=new Map<string,FieldVisit[]>();for(const v of plans){const a=byDay.get(v.plannedDate!)||[];a.push(v);byDay.set(v.plannedDate!,a)}
 const free=days.filter(d=>!byDay.has(d)),lastFree=facts.window?free[free.length-1]:undefined;
 const out:ScheduleCandidate[]=[];
 for(const d of days){const vs=byDay.get(d)||[],same=vs.filter(v=>targets.get(targetOf(v))?.region===t.region&&!!t.region).length,tags:string[]=[];
  if(!vs.length)tags.push('비어 있음');if(same)tags.push(`같은 지역 ${same}건`);if(d===lastFree)tags.push('마감 전 마지막 빈 날');
  if(!tags.length)continue;
  const taken=vs.map(v=>v.time).filter(Boolean).sort();let time=facts.usualTime?.time||'';
  if(time&&taken.includes(time)){const h=Number(taken[taken.length-1].slice(0,2))+1;time=h<=18?String(h).padStart(2,'0')+':00':''}
  out.push({date:d,time,tags});}
 // 마감 전 마지막 빈 날은 앞쪽 후보에 밀려 잘리지 않게 남긴다
 const head=out.slice(0,limit);if(lastFree&&!head.some(x=>x.date===lastFree)){const l=out.find(x=>x.date===lastFree);if(l)head[head.length-1]=l}
 return head;
}
