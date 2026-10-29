import {shift} from '../lib/model';
import {weekRanges} from '../briefing/model';
export type DxTarget={id:string;type:'site'|'store';siteId:string;name:string;siteName:string};
export type DxIssue={id:string;targetId:string;siteId:string;visitId:string|null;ownerId:string;type:string;content:string;state:string;dueDate:string;createdDate:string|null;completedDate:string|null;urgent?:boolean;repeat?:boolean};
export type DxVisit={id:string;targetId:string;siteId:string;visitorId:string;plannedDate:string|null;actualDate:string|null;status:string;purpose:string};
export type DxInput={targets:DxTarget[];issues:DxIssue[];visits:DxVisit[];owners:Set<string>};
export type DxIssueRow=DxIssue&{open:boolean;late:number;repeat:boolean;unassigned:boolean;urgentFlag:boolean};
export type DxSite={siteId:string;siteName:string;own:number;stores:number;issues:DxIssueRow[];top:DxIssueRow;reasons:string[]};
export type DxFlag='urgent'|'overdue'|'repeat'|'unassigned';
export type DxSummary={totalOpen:number;urgent:number|null;overdue:number;repeat:number;unassigned:number};
export type Diagnosis={state:'no-target'|'no-data'|'clear'|'issues';issues:DxIssueRow[];open:DxIssueRow[];summary:DxSummary;sites:DxSite[]};
const days=(a:string,b:string)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/86400000);
const within=(d:string|null,a:string,b:string)=>!!d&&d>=a&&d<=b;
const unique=<T extends {id:string}>(rows:T[])=>[...new Map(rows.map(r=>[r.id,r])).values()];
// 같은 입력은 한 번만 정규화한다(진단·주차 진단·상세가 같은 입력으로 여러 번 부른다).
const normalized=new WeakMap<DxInput,{targets:DxInput['targets'];issues:DxInput['issues'];visits:DxInput['visits']}>();
export function normalize(input:DxInput){const hit=normalized.get(input);if(hit)return hit;const ids=new Set(input.targets.map(t=>t.id));const out={targets:unique(input.targets),issues:unique(input.issues).filter(a=>ids.has(a.targetId)),visits:unique(input.visits).filter(v=>ids.has(v.targetId))};normalized.set(input,out);return out}
// 긴급·반복은 저장된 종합 판정에서 온 값(urgent·repeat)만 쓴다. 기간·유형 일치로 추정하지 않는다(DC-JUDGMENT).
export function flagIssues(issues:DxIssue[],owners:Set<string>,now:string):DxIssueRow[]{
 return issues.map(a=>{const open=a.state!=='완료';
  return{...a,open,late:open&&!!a.dueDate&&a.dueDate<now?days(a.dueDate,now):0,repeat:a.repeat===true,unassigned:open&&(!a.ownerId||!owners.has(a.ownerId)),urgentFlag:open&&a.urgent===true}});
}
const rank=(a:DxIssueRow,b:DxIssueRow)=>+b.urgentFlag-+a.urgentFlag||+(b.late>0)-+(a.late>0)||b.late-a.late||+b.repeat-+a.repeat||+b.unassigned-+a.unassigned||(a.dueDate||'9').localeCompare(b.dueDate||'9')||a.id.localeCompare(b.id);
export const hasFlag=(a:DxIssueRow,f:DxFlag)=>f==='urgent'?a.urgentFlag:f==='overdue'?a.late>0:f==='repeat'?a.open&&a.repeat:a.unassigned;
export const reasonsOf=(a:DxIssueRow)=>[a.urgentFlag&&'긴급',a.late>0&&`기한 초과 ${a.late}일`,a.open&&a.repeat&&'반복',a.unassigned&&'담당 미지정'].filter(Boolean) as string[];
export function diagnose(input:DxInput,now:string):Diagnosis{
 const {targets,issues:raw,visits}=normalize(input),issues=flagIssues(raw,input.owners,now),open=issues.filter(a=>a.open);
 const known=raw.some(a=>a.urgent!==undefined);
 const summary:DxSummary={totalOpen:open.length,urgent:known?open.filter(a=>a.urgentFlag).length:null,overdue:open.filter(a=>a.late>0).length,repeat:open.filter(a=>a.repeat).length,unassigned:open.filter(a=>a.unassigned).length};
 const sites:DxSite[]=[...new Set(open.map(a=>a.siteId))].map(siteId=>{const list=open.filter(a=>a.siteId===siteId).sort(rank),top=list[0],t=targets.find(t=>t.siteId===siteId);
  return{siteId,siteName:t?.siteName||'현장',own:list.filter(a=>targets.find(t=>t.id===a.targetId)?.type==='site').length,stores:list.filter(a=>targets.find(t=>t.id===a.targetId)?.type==='store').length,issues:list,top,reasons:reasonsOf(top)}})
  .sort((a,b)=>rank(a.top,b.top)||b.issues.length-a.issues.length||a.siteName.localeCompare(b.siteName));
 const state=!targets.length?'no-target':!issues.length&&!visits.some(v=>v.status==='completed'&&v.actualDate)?'no-data':open.length?'issues':'clear';
 return{state,issues,open,summary,sites};
}
export function sitesWith(d:Diagnosis,flag:DxFlag|''):DxSite[]{if(!flag)return d.sites;return d.sites.map(s=>{const list=s.issues.filter(a=>hasFlag(a,flag));return list.length?{...s,issues:list,top:list[0],reasons:reasonsOf(list[0]),own:list.filter(a=>a.targetId===a.siteId).length,stores:list.filter(a=>a.targetId!==a.siteId).length}:null}).filter(Boolean) as DxSite[]}
export type WeekChange={kind:'신규'|'해결'|'반복';issue:DxIssueRow};
export type WeekPlan={key:string;kind:'조치'|'방문';siteId:string;targetId:string;date:string;text:string;ownerId:string;issueId:string|null};
export type WeekDiagnosis={phase:'current'|'past'|'future';from:string;to:string;newIssues:DxIssueRow[];resolved:DxIssueRow[];repeats:DxIssueRow[];unknownCreated:number;openNow:number;delta:{value:number;label:string}|null;changes:WeekChange[];upcoming:WeekPlan[]};
export function weekDiagnosis(input:DxInput,start:string,end:string,now:string,range?:{from:string;to:string}):WeekDiagnosis{
 const {issues:raw,visits}=normalize(input),issues=flagIssues(raw,input.owners,now),from=range?.from||start,to=range?.to||end;
 const phase=start>now?'future':end>=now?'current':'past',cut=phase==='current'?now:to;
 const created=(a:DxIssueRow,x:string,y:string)=>within(a.createdDate,x,y);
 const newIssues=phase==='future'?[]:issues.filter(a=>created(a,from,cut)),resolved=phase==='future'?[]:issues.filter(a=>!a.open&&within(a.completedDate,from,cut)),repeats=newIssues.filter(a=>a.repeat);
 const unknownCreated=issues.filter(a=>!a.createdDate).length,earliest=issues.map(a=>a.createdDate).filter(Boolean).sort()[0]||null;
 const pf=shift(from,-7),pt=phase==='current'?shift(cut,-7):shift(to,-7);
 const comparable=phase!=='future'&&unknownCreated===0&&!!earliest&&earliest<=pt;
 const prev=issues.filter(a=>created(a,pf,pt)).length,diff=newIssues.length-prev;
 const next=[shift(end,1),shift(end,7)];
 const dueNext=issues.filter(a=>a.open&&within(a.dueDate,next[0],next[1])).map(a=>({key:'a:'+a.id,kind:'조치' as const,siteId:a.siteId,targetId:a.targetId,date:a.dueDate,text:a.content,ownerId:a.ownerId,issueId:a.id}));
 const planNext=visits.filter(v=>v.status==='planned'&&within(v.plannedDate,next[0],next[1])).map(v=>({key:'v:'+v.id,kind:'방문' as const,siteId:v.siteId,targetId:v.targetId,date:v.plannedDate!,text:v.purpose,ownerId:v.visitorId,issueId:null as string|null}));
 const order={신규:0,해결:1,반복:2};const changes=[...newIssues.map(issue=>({kind:'신규' as const,issue})),...resolved.map(issue=>({kind:'해결' as const,issue})),...repeats.map(issue=>({kind:'반복' as const,issue}))].sort((a,b)=>order[a.kind]-order[b.kind]||rank(a.issue,b.issue));
 return{phase,from,to,newIssues,resolved,repeats,unknownCreated,openNow:issues.filter(a=>a.open).length,delta:comparable?{value:diff,label:phase==='current'?'지난주 같은 요일까지':'직전 주 전체'}:null,changes,upcoming:[...dueNext,...planNext].sort((a,b)=>+(a.kind==='방문')-+(b.kind==='방문')||a.date.localeCompare(b.date)||a.key.localeCompare(b.key))};
}
export function defaultWeek(start:string,end:string,now:string){const weeks=weekRanges(start,end);return weeks.find(w=>w.start<=now)?.start||weeks[0]?.start||''}
export const kstStamp=(d=new Date())=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).map(x=>[x.type,x.value]));return `${p.month}.${p.day} ${p.hour}:${p.minute}`};
