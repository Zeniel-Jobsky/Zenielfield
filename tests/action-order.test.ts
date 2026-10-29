import assert from 'node:assert/strict';
import {orderActions} from '../app/platform/action-order';
import type {FieldAction} from '../app/platform/model';

const row=(id:string,ownerId:string,dueDate:string,state='처리 중',completedDate:string|null=null)=>({id,ownerId,dueDate,state,completedDate,createdDate:'2026-10-01'} as FieldAction);
const rows=[row('a','one','2026-10-01'),row('b','two','2026-10-27'),row('c','two','2026-11-01'),row('d','three','2026-09-01','완료','2026-09-02')];
const names=new Map([['one','가'],['two','나'],['three','다']]);
const ids=(value:FieldAction[])=>value.map(x=>x.id);
assert.deepEqual(ids(orderActions(rows,'manager',names,'2026-10-29')),['b','c','a','d']);
assert.deepEqual(ids(orderActions(rows,'overdue-desc',names,'2026-10-29')),['a','b','d','c']);
assert.deepEqual(ids(orderActions(rows,'overdue-asc',names,'2026-10-29')),['c','d','b','a']);
assert.deepEqual(ids(rows),['a','b','c','d']);
assert.deepEqual(orderActions([],'manager',names,'2026-10-29'),[]);
// Identical display names must still keep each owner's records together.
const sameNames=new Map([['one','같은 이름'],['two','같은 이름']]);
const same=[row('x','two','2026-10-01'),row('y','one','2026-10-03'),row('z','two','2026-10-04'),row('w','one','2026-10-02')];
assert.deepEqual(ids(orderActions(same,'manager',sameNames,'2026-10-29')),['w','y','x','z']);
// Finishing on time or without a recorded completion date never implies overdue days.
const completed=[row('early','one','2026-10-20','완료','2026-10-18'),row('unknown','two','2026-10-01','완료'),row('late','three','2026-10-01','완료','2026-10-02')];
assert.equal(orderActions(completed,'overdue-desc',names,'2026-10-29')[0].id,'late');
console.log('Action sorting: counts, date directions, completion dates, ties, empty lists and source preservation passed.');
