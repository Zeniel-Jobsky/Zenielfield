// 날짜 공통 함수: 화면·서버·스크립트가 같은 규칙으로 날짜를 다룬다. 날짜는 'YYYY-MM-DD' 문자열, 계산은 한낮(UTC 12시) 기준으로 해
// 시간대·서머타임 경계에서 하루가 밀리지 않게 한다. 다른 파일에 같은 계산을 다시 만들지 않는다.
const noon=(day:string)=>Date.parse(day+'T12:00:00Z');

// 한국 시간 기준 오늘
export const kstToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
// 날짜 더하기(n일 뒤, 음수면 앞)
export const dayShift=(day:string,n:number)=>{const d=new Date(noon(day));d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
// 한국 시간 기준 오늘에서 n일
export const kstDay=(n=0)=>dayShift(kstToday(),n);
// from → to 날짜 차이(일). from이 없으면 null
export function daysBetween(from:string,to:string):number;
export function daysBetween(from:string|null|undefined,to:string):number|null;
export function daysBetween(from:string|null|undefined,to:string){return from?Math.round((noon(to)-noon(from))/86400000):null}
// a ≤ d ≤ b (d가 없으면 false)
export const between=(d:string|null|undefined,a:string,b:string)=>!!d&&d>=a&&d<=b;
// 그 주 월요일, [월요일, 일요일]
export const weekOf=(day:string)=>dayShift(day,-((new Date(noon(day)).getUTCDay()+6)%7));
export const weekRange=(day:string):[string,string]=>{const s=weekOf(day);return [s,dayShift(s,6)]};
// 화면용 MM.DD
export const mmdd=(day:string)=>day.slice(5).replace('-','.');
// 형식·실제 날짜 검사
export const validDay=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(noon(s))&&new Date(noon(s)).toISOString().slice(0,10)===s;
// 그 달 [1일, 말일]
export const monthRange=(day:string):[string,string]=>{const a=day.slice(0,8)+'01',x=new Date(noon(a));x.setUTCMonth(x.getUTCMonth()+1);x.setUTCDate(0);return [a,x.toISOString().slice(0,10)]};
// 한국 시간 기준 지금 'HH:MM'
export const kstTime=()=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
