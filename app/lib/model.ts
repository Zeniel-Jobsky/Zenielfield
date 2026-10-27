export type User={id:string;subject?:string|null;email:string;name:string;role:string;team:string;part:string;active:number};
export type Site={id:string;code:string;name:string;client:string;team:string;part:string;address:string;cycle:string;priority:string;status:string;startDate:string;version:number};
export type Assignment={id:string;siteId:string;userId:string;startDate:string;endDate:string|null};
export type Visit={id:string;siteId:string;visitorId:string;plannedDate:string|null;time:string;purpose:string;precheck:string;actualDate:string|null;result:string;detail:string;status:string;cancelReason:string;version:number};
export type Action={id:string;siteId:string;visitId:string|null;type:string;content:string;ownerId:string;dueDate:string;state:string;completedDate:string|null;version:number};
export type Audit={id:string;actorId:string;entity:string;entityId:string;before:string|null;after:string;createdAt:string};
export type Data={me:User;users:User[];sites:Site[];assignments:Assignment[];visits:Visit[];actions:Action[];audit:Audit[]};
export const roles:Record<string,string>={admin:'시스템 관리자',director:'사업부장',lead:'팀장',partlead:'파트장',manager:'잡매니저'};
export const cycles:Record<string,string>={weekly:'매주',biweekly:'격주',monthly:'매월',quarterly:'분기',manual:'수동 관리'};
export const purposes=['현장 정기점검','고객사 담당자 미팅','근로자 관리 및 면담','신규 인력 투입 및 채용','현장 민원·문제 대응','기타'];
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function shift(date:string,days:number){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
export function week(date:string){const day=new Date(date+'T12:00:00Z').getUTCDay();const start=shift(date,-((day+6)%7));return [start,shift(start,6)]}
export function visitState(v:Visit,now=today()){return v.status==='cancelled'?'취소':v.status==='completed'?'완료':v.plannedDate&&v.plannedDate<now?'지연':'예정'}
export function nextDue(last:string|null,cycle:string){if(!last||cycle==='manual')return null;if(cycle==='weekly'||cycle==='biweekly')return shift(last,cycle==='weekly'?7:14);const d=new Date(last+'T12:00:00Z');const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+(cycle==='quarterly'?3:1));const end=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,end));return d.toISOString().slice(0,10)}
export function lastVisit(id:string,visits:Visit[]){return visits.filter(v=>v.siteId===id&&v.status==='completed'&&v.actualDate).map(v=>v.actualDate!).sort().at(-1)||null}
export function siteState(s:Site,visits:Visit[],now=today()){if(s.status!=='운영 중')return s.status;const last=lastVisit(s.id,visits);if(!last)return '이력 미확인';const due=nextDue(last,s.cycle);if(due&&due<=now)return '방문 도래';if(!visits.some(v=>v.siteId===s.id&&v.status==='planned'&&v.plannedDate&&v.plannedDate>=now))return '계획 없음';return '정상 관리'}
export function canSite(u:User,s:Site,a:Assignment[]){if(['admin','director'].includes(u.role))return true;if(u.team!==s.team)return false;if(u.role==='lead')return true;if(u.part!==s.part)return false;if(u.role==='partlead')return true;return a.some(x=>x.siteId===s.id&&x.userId===u.id&&!x.endDate)}
