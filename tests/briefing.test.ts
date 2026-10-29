import assert from 'node:assert/strict';
import {week} from '../app/lib/model';
import {kstDay,weekRanges,weekTitle,filterBriefData,weeklyCards,weekStats,type BriefData,type BriefVisit} from '../app/briefing/model';
import {platformBriefData,legacyBriefData} from '../app/briefing/adapters';
import {platformDemo} from '../app/platform/demo';
import {targetsOf,visibleTargets} from '../app/platform/model';
import {judgedSummary} from '../app/platform/ai-brief';
import {isCurrentJudgment} from '../app/platform/judgment';
let count=0;const eq=(a:unknown,b:unknown)=>{assert.deepEqual(a,b);count++};
const target=(id:string,siteId:string,type:'site'|'store'='site')=>({id,siteId,siteName:'가상 '+siteId,name:type==='store'?'가상 매장 '+id:'가상 '+siteId,type});
const visit=(id:string,targetId:string,siteId:string,date:string,status='completed',visitorId='m1'):BriefVisit=>({id,targetId,siteId,actualDate:date,actualTime:'10:00',plannedDate:date,status,visitorId,visitorName:visitorId==='m1'?'잡매니저 01':'잡매니저 02',purpose:'점검',detail:'원문 '+id,notes:''});
const issue=(id:string,siteId:string,state='처리 중',due='2026-10-30')=>({id,siteId,targetId:siteId,visitId:null,ownerId:'m1',ownerName:'잡매니저 01',content:id,type:'요청',state,dueDate:due,createdDate:'2026-10-23',completedDate:state==='완료'?'2026-10-25':null});
const data:BriefData={targets:[target('a','a'),target('a1','a','store'),target('b','b'),target('c','c'),target('x','x')],visits:[visit('a-hq','a','a','2026-10-19'),visit('a-store','a1','a','2026-10-25'),visit('b','b','b','2026-10-21','completed','m2'),visit('c','c','c','2026-10-23'),visit('old','a','a','2026-10-18'),visit('future','a','a','2026-10-29'),visit('plan','a','a','2026-10-24','planned'),visit('cancel','a','a','2026-10-24','cancelled'),visit('foreign','secret','x','2026-10-24')],issues:[issue('open','a'),issue('late','b','처리 중','2026-10-20'),issue('done','a','완료')]};
data.visits.push(data.visits[0]);data.issues.push(data.issues[0]);
const cards=weeklyCards(data,'2026-10-19','2026-10-25','2026-10-27');
eq(cards.map(c=>c.siteId),['b','a','c']);eq(cards[1].visits.length,2);eq(cards[1].issues.length,1);eq(cards[1].doneIssues.length,1);eq(cards[1].delayed,1);eq(cards[1].excerpts,['점검 · 원문 a-store','점검 · 원문 a-hq']);eq(cards.some(c=>c.siteId==='x'),false);
eq(weeklyCards(data,'2026-11-02','2026-11-08','2026-10-27'),[]);eq(weeklyCards(data,'2026-10-26','2026-11-01','2026-10-27'),[]);
eq(weekStats(data,'2026-10-19','2026-10-25','2026-10-27').visits.length,4);eq(weekStats(data,'2026-10-19','2026-10-25','2026-10-27').newIssues.length,3);
eq(week('2026-10-25'),['2026-10-19','2026-10-25']);eq(week('2026-10-26'),['2026-10-26','2026-11-01']);eq(kstDay('2026-10-25T15:01:00Z'),'2026-10-26');eq(kstDay('2026-10-25T14:59:00Z'),'2026-10-25');eq(kstDay(''),null);eq(weekTitle('2026-10-19'),'10월 4주차');eq(weekRanges('2026-10-01','2026-10-31').length,5);eq(weekRanges('2026-10-01','2026-10-31').at(-1)?.from,'2026-10-01');eq(weekRanges('2026-12-31','2027-01-03')[0].start,'2026-12-28');
eq(filterBriefData(data,'store','a1').visits.map(v=>v.id),['a-store']);eq(new Set(filterBriefData(data,'site','가상 a').visits.map(v=>v.targetId)),new Set(['a','a1']));eq(filterBriefData(data,'manager','잡매니저 02').visits.map(v=>v.id),['b']);eq(filterBriefData(data,'manager','없는 사람').visits.length,0);
const fixture=platformDemo('2026-10-27'),allTargets=targetsOf(fixture),manager=fixture.users[0],allowed=visibleTargets(allTargets,manager);const scoped=platformBriefData(fixture,allowed);eq(scoped.visits.every(v=>allowed.some(t=>t.id===v.targetId)),true);eq(scoped.issues.every(a=>allowed.some(t=>t.id===a.targetId)),true);
const ownVisit=fixture.visits.find(v=>v.visitorId===manager.id)!;const moved=structuredClone(fixture);moved.sites.forEach(s=>s.managerIds=s.managerIds.filter(id=>id!==manager.id));moved.stores.forEach(s=>s.managerIds=s.managerIds.filter(id=>id!==manager.id));eq(platformBriefData(moved,targetsOf(moved),manager.id).visits.some(v=>v.id===ownVisit.id),true);eq(platformBriefData(fixture,allTargets,'no-user').visits.length,0);
const legacy:any={users:[manager],sites:[{id:'a',name:'실제 가상 현장'}],visits:[{...data.visits[0],siteId:'a'}],actions:[{...data.issues[0],siteId:'a'}],audit:[{entityId:'open',before:null,createdAt:'2026-10-25T15:01:00Z'}]};const actual=legacyBriefData(legacy,new Set(['a']));eq(actual.issues[0].createdDate,'2026-10-26');eq(actual.visits[0].targetId,'a');eq(legacyBriefData(legacy,new Set()).visits.length,0);eq(legacyBriefData({...legacy,audit:[]},new Set(['a'])).issues[0].createdDate,null);
// 판정 집계: 현재 형식(level·issues)만 유형별로 세고, 옛 형식(has/items)은 미판정으로 센다.
{const base={...platformDemo().visits[0],status:'completed' as const,actualDate:'2026-10-20'};const now:any={level:'주의',assessment:'인력 공백 지속',issues:[{type:'채용·인력충원',summary:'공백',severity:'긴급',flow:'지속',customerRequest:false}],by:'ai',model:'m',at:'',confirmedBy:null};
 const old:any={has:true,items:[{type:'채용·인력충원',summary:'공백',severity:'보통'}]};const s=judgedSummary([{...base,id:'n',judgment:now},{...base,id:'o',judgment:old}]);
 eq([s.reports,s.unjudged,s.levels,s.byType.map(b=>[b.type,b.n,b.urgent,b.ongoing])],[2,1,{주의:1},[['채용·인력충원',1,1,1]]]);eq(isCurrentJudgment(old),false);eq(isCurrentJudgment(now),true)}
console.log(`${count} briefing assertions passed: week boundaries, deduplication, independent targets, actual visitors, access scope and legacy data reuse and current-format judgment counts.`);
