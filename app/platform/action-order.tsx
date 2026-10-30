import type {FieldAction} from './model';
import {daysBetween} from '../lib/date';

export type ActionOrder='manager'|'overdue-desc'|'overdue-asc';

export function orderActions(rows:FieldAction[],order:ActionOrder,names:Map<string,string>,now:string){
 const counts=new Map<string,number>();
 const overdueDays=new Map(rows.map(row=>[row.id,Math.max(0,daysBetween(row.dueDate,row.state==='완료'?(row.completedDate||row.dueDate):now))]));
 if(order==='manager')for(const row of rows)counts.set(row.ownerId,(counts.get(row.ownerId)||0)+1);
 return [...rows].sort((a,b)=>{
  const manager=order==='manager'?(counts.get(b.ownerId)||0)-(counts.get(a.ownerId)||0)||(names.get(a.ownerId)||'').localeCompare(names.get(b.ownerId)||'','ko')||a.ownerId.localeCompare(b.ownerId):0;
  const difference=(overdueDays.get(b.id)||0)-(overdueDays.get(a.id)||0);
  const due=(order==='overdue-asc'?-difference:difference)||a.dueDate.localeCompare(b.dueDate);
  return manager||due||a.createdDate.localeCompare(b.createdDate)||a.id.localeCompare(b.id);
 });
}

export function ActionOrderPicker({value,onChange}:{value:ActionOrder;onChange:(value:ActionOrder)=>void}){
 return <div className="action-order-tools"><label htmlFor="overdue-action-order">목록 정렬</label><select id="overdue-action-order" value={value} onChange={e=>onChange(e.target.value as ActionOrder)}><option value="manager">잡매니저별</option><option value="overdue-desc">기한 초과-내림차순</option><option value="overdue-asc">기한 초과-오름차순</option></select></div>;
}
