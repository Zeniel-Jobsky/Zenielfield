import assert from 'node:assert/strict';
import {dayShift,daysBetween,weekRange,monthRange,mmdd,validDay,between} from '../app/lib/date.ts';
// 날짜 공통 함수(lib/date.ts): 월말·윤년·주 경계·null
assert.equal(dayShift('2024-02-28',1),'2024-02-29');assert.equal(dayShift('2026-03-01',-1),'2026-02-28');
assert.equal(daysBetween('2026-10-01','2026-10-29'),28);assert.equal(daysBetween(null,'2026-10-29'),null);
assert.deepEqual(weekRange('2026-11-01'),['2026-10-26','2026-11-01']);assert.deepEqual(monthRange('2024-02-10'),['2024-02-01','2024-02-29']);
assert.equal(mmdd('2026-10-04'),'10.04');assert.equal(validDay('2026-02-30'),false);assert.equal(between(null,'a','b'),false);
import {visitState,week} from '../app/lib/model.ts';
assert.deepEqual(week('2026-11-01'),['2026-10-26','2026-11-01']);
const v={status:'planned',plannedDate:'2026-10-25'};
assert.equal(visitState(v,'2026-10-26'),'지연');
assert.equal(visitState({...v,status:'cancelled'},'2026-10-26'),'취소');
assert.equal(visitState({...v,status:'completed'},'2026-10-26'),'완료');
assert.equal(visitState({...v,plannedDate:'2026-10-26'},'2026-10-26'),'예정');
console.log('Date and visit state assertions passed.');
