// 독려 안내 내용(지침 10-A): 역할마다 "그 사람이 지금 할 수 있는 것"을 사실과 저장된 판정만으로 쓴다(DC-JUDGMENT).
// 행동으로 바로 이어지는 숫자만 크게 보이고(0이면 숨김), 숫자 칸·칩·다음 대상은 누르면 해당 목록·범위·일정 등록으로 간다.
// 임계값으로 칭찬·경고를 고르지 않는다. 평가어(누락·편중·미이행·소홀)를 쓰지 않는다.
import {levelLabel} from './judgment';
import {mmdd} from '../lib/date';
import type {Context} from './context';
import {aggregate,type Occurrence} from './model';
import {targetFacts,attentionOf,LEVEL_ORDER} from './status';
import {scopeUnits} from './decision';
import {rich,num,bad,type Rich} from './rich';

export type NudgeRole='manager'|'partlead'|'lead'|'director';
// tone: good=딥그린, bad=판정 위험(빨강), warn=판정 주의(앰버). max가 있으면 숫자 아래 진행 막대. go: 누르면 가는 목록.
export type NudgeStat={icon:'done'|'plan'|'risk'|'caution';label:string;value:number;unit:string;from?:number;max?:number;tone?:'good'|'bad'|'warn';go:{page:string;kind?:string}};
export type NudgeChip={key:string;label:string;value:number};
export type Nudge={role:NudgeRole;mood:'joy'|'cheer'|'concern';title:Rich;stats:NudgeStat[];chips:{title:string;items:NudgeChip[]}|null;help:Rich|null;next:{name:string;id:string;why:Rich;slot:Occurrence|null}|null};
export const nudgeRole=(role:string):NudgeRole=>role==='manager'?'manager':role==='partlead'?'partlead':role==='lead'?'lead':'director';

// before: 저장 직전 필요 방문 완료 회차(저장 직후 안내에서 카운트업 시작값)
export function buildNudge(c:Context,before?:number):Nudge{
 const role=nudgeRole(c.me.role),m=c.metrics,facts=targetFacts(c.scope.filter(t=>t.type===c.type),c.visits,c.actions,m.slots,c.now);
 const gap=m.delayed+m.unplanned;let risk=0,warn=0;for(const f of facts.values()){if(f.judgment?.level==='위험')risk++;else if(f.judgment?.level==='주의')warn++}
 const stats=([m.required?{icon:'done',label:'필요 방문 완료',value:m.completed,unit:`/ ${m.required}회차`,max:m.required,from:before,tone:'good',go:{page:'requirements',kind:'completed'}}:null,
  gap?{icon:'plan',label:'일정 잡을 회차',value:gap,unit:'회차',go:{page:'requirements',kind:m.unplanned?'unplanned':'delayed'}}:null,
  risk?{icon:'risk',label:'바로 확인',value:risk,unit:'곳',tone:'warn',go:{page:'results',kind:'level:위험'}}:null,
  warn?{icon:'caution',label:'조치 필요',value:warn,unit:'곳',go:{page:'results',kind:'level:주의'}}:null].filter(Boolean)) as NudgeStat[];
// 표정: 저장 직후·남은 일 없음 = 기쁨, 판정 위험이 있으면 걱정, 일정 잡을 회차가 남으면 응원(사실·저장된 판정만으로 고른다)
 const mood=before!==undefined||!gap&&!risk?'joy':risk?'concern':'cheer';
 const title=before!==undefined?rich`저장 완료! 한 걸음 더 왔어요.`:risk?rich`지난 방문에서 바로 확인할 곳이 남아 있어요.`:gap?rich`날짜만 잡으면 되는 방문이 있어요.`:rich`필요 방문이 모두 완료 또는 일정 확정이에요!`;
 if(role==='manager'){
  const first=attentionOf(facts.values())[0],j=first?.judgment;
  const why=!first?rich``:j&&LEVEL_ORDER[j.level]?rich`${levelLabel(j.level)}${j.assessment?' — '+j.assessment:''}`:first.delayed[0]?rich`기한 ${num(mmdd(first.delayed[0].dueDate))} 지남`:first.unplanned[0]?rich`${num(mmdd(first.unplanned[0].dueDate))}까지 · 일정 없음`:rich`기한 넘긴 조치 ${num(first.lateActions+'건')}`;
  return {role,mood,title,stats,chips:null,help:null,next:first?{name:first.target.name,id:first.target.id,why,slot:first.delayed[0]||first.unplanned[0]||null}:null};
 }
 // 관리자 역할: 하위 단위(파트장=잡매니저, 팀장=파트, 사업부장=팀) 중 일정 잡을 회차가 있는 곳만 칩으로. 팀장부터는 개인 이름 없음(단위가 파트·팀).
 const s=scopeUnits(c),withGap=s.units.map(u=>{const mm=aggregate(u.targets.filter(t=>t.type===c.type),c.visits,c.start,c.end,c.now);return {key:u.key,label:u.label,value:mm.delayed+mm.unplanned}}).filter(r=>r.value>0).sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label));
 const help=!withGap.length?null:role==='partlead'?rich`① 이번 주 일정 함께 잡기 ② 동행 방문`:role==='lead'?rich`파트장과 이번 주 일정 확인`:null;
 return {role,mood,title,stats,chips:withGap.length?{title:`일정 잡을 ${s.title}`,items:withGap.slice(0,6)}:null,help,next:null};
}
