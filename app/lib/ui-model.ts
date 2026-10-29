import {monthRange} from './date.ts';
import type {Visit} from './model';
export const inRange=(date:string|null,start:string,end:string)=>!!date&&(!start||date>=start)&&(!end||date<=end);
export function performance(visits:Visit[],start:string,end:string,now:string){
 const cohort=visits.filter(v=>v.status!=='cancelled'&&v.plannedDate&&inRange(v.plannedDate,start,end)&&v.plannedDate<=now);
 const done=cohort.filter(v=>v.status==='completed');
 return {total:cohort.length,done:done.length,rate:cohort.length?Math.round(done.length/cohort.length*100):null};
}
export {monthRange};
export function actionCreated(id:string,audit:{entityId:string;before:string|null;createdAt:string}[]){return audit.filter(a=>a.entityId===id&&!a.before).map(a=>a.createdAt.slice(0,10)).sort()[0]||null}
