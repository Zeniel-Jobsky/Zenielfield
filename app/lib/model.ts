import {kstToday,dayShift,weekRange} from './date.ts';
export type User={id:string;subject?:string|null;email:string;name:string;role:string;team:string;part:string;active:number;domains?:string[]};
export type Site={id:string;code:string;name:string;client:string;domain?:string;team:string;part:string;address:string;cycle:string;priority:string;status:string;startDate:string;version:number};
export type Visit={id:string;siteId:string;visitorId:string;plannedDate:string|null;time:string;purpose:string;precheck:string;actualDate:string|null;result:string;detail:string;status:string;cancelReason:string;version:number};
export type Action={id:string;siteId:string;visitId:string|null;type:string;content:string;ownerId:string;dueDate:string;state:string;completedDate:string|null;version:number};
export type Audit={id:string;actorId:string;entity:string;entityId:string;before:string|null;after:string;createdAt:string};
export const roles:Record<string,string>={admin:'시스템 관리자',director:'사업부장',lead:'팀장',partlead:'파트장',manager:'잡매니저'};
export const purposes=['현장 정기점검','고객사 담당자 미팅','근로자 관리 및 면담','신규 인력 투입 및 채용','현장 민원·문제 대응','기타'];
// 날짜 함수는 lib/date.ts가 기준. 기존 이름은 별칭으로 둔다.
export const today=kstToday,shift=dayShift,week=weekRange;
export function visitState(v:Visit,now=today()){return v.status==='cancelled'?'취소':v.status==='completed'?'완료':v.plannedDate&&v.plannedDate<now?'지연':'예정'}

