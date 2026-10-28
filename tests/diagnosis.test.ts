import assert from 'node:assert/strict';
import {diagnose,sitesWith,weekDiagnosis,defaultWeek,kstStamp,type DxInput,type DxIssue,type DxVisit} from '../app/diagnosis/model';
import {scopeInput,briefInput} from '../app/diagnosis/adapters';
import {platformBriefData} from '../app/briefing/adapters';
import {platformDemo} from '../app/platform/demo';
import {targetsOf,visibleTargets} from '../app/platform/model';
let count=0;const eq=(a:unknown,b:unknown)=>{assert.deepEqual(a,b);count++};
const NOW='2026-10-27';
const t=(id:string,siteId:string,type:'site'|'store'='site')=>({id,siteId,type,name:type==='store'?'매장 '+id:'현장 '+siteId,siteName:'현장 '+siteId});
const issue=(id:string,targetId:string,siteId:string,o:Partial<DxIssue>={}):DxIssue=>({id,targetId,siteId,visitId:null,ownerId:'m1',type:'인력',content:'내용 '+id,state:'처리 중',dueDate:'2026-11-05',createdDate:'2026-10-20',completedDate:null,...o});
const visit=(id:string,targetId:string,siteId:string,o:Partial<DxVisit>={}):DxVisit=>({id,targetId,siteId,visitorId:'m1',plannedDate:'2026-10-20',actualDate:'2026-10-20',status:'completed',purpose:'점검',...o});
const owners=new Set(['m1','m2']);
const base:DxInput={owners,targets:[t('a','a'),t('a1','a','store'),t('b','b'),t('c','c')],visits:[visit('v1','a','a')],issues:[
 issue('late','a','a',{dueDate:'2026-10-24'}),
 issue('store','a1','a',{type:'고객'}),
 issue('dup','a','a',{dueDate:'2026-10-24'}),
 issue('none','c','c',{ownerId:'',type:'안전'}),
 issue('ghost','c','c',{ownerId:'gone',type:'근태',dueDate:'2026-11-09'}),
 issue('done','b','b',{state:'완료',completedDate:'2026-10-26'}),
 issue('foreign','x','x')]};
base.issues.push(base.issues[0]);
const d=diagnose(base,NOW);
// 이슈 ID 중복 제거, 범위 밖 대상·완료 건 제외
eq(d.summary.totalOpen,5);eq(d.summary.overdue,2);eq(d.summary.unassigned,2);eq(d.summary.repeat,2);eq(d.summary.urgent,null);
eq(d.open.some(a=>a.id==='foreign'||a.id==='done'),false);
// 지표 건수와 상세 목록 건수 일치
for(const f of ['overdue','repeat','unassigned'] as const)eq(sitesWith(d,f).reduce((n,s)=>n+s.issues.length,0),d.summary[f]);
eq(sitesWith(d,'').reduce((n,s)=>n+s.issues.length,0),d.summary.totalOpen);
// 자체/매장 구분과 우선순위
const a=d.sites[0];eq(a.siteId,'a');eq(a.own,2);eq(a.stores,1);eq(a.reasons.includes('기한 초과 3일'),true);eq(d.sites.map(s=>s.siteId),['a','c']);
eq(d.sites[1].reasons.includes('담당 미지정'),true);
// 긴급은 건수가 적어도 먼저 노출
const urgent=diagnose({...base,issues:[...base.issues,issue('u','c','c',{urgent:true,type:'노무'}),issue('n','a','a',{urgent:false,type:'기타'})]},NOW);
eq(urgent.summary.urgent,1);eq(urgent.sites[0].siteId,'c');eq(urgent.sites[0].top.id,'u');
// 반복: 90일 밖이거나 등록일을 모르면 반복이 아니다
eq(diagnose({...base,issues:[issue('p','a','a',{createdDate:'2026-05-01'}),issue('q','a','a',{createdDate:'2026-10-20'})]},NOW).summary.repeat,0);
eq(diagnose({...base,issues:[issue('p','a','a',{createdDate:null}),issue('q','a','a')]},NOW).summary.repeat,0);
// 빈 상태 구분
eq(diagnose({...base,targets:[],issues:[],visits:[]},NOW).state,'no-target');
eq(diagnose({...base,issues:[],visits:[]},NOW).state,'no-data');
eq(diagnose({...base,issues:[]},NOW).state,'clear');
eq(diagnose({...base,issues:[issue('done','b','b',{state:'완료'})]},NOW).state,'clear');
// 주간: 월~일 경계, 신규·해결, 증감, 다음 주 조치
const wk:DxInput={owners,targets:base.targets,visits:[visit('p1','a','a',{status:'planned',plannedDate:'2026-11-03',actualDate:null,purpose:'근태 개선 확인',visitorId:'m2'}),visit('p2','a','a',{status:'planned',plannedDate:'2026-11-09',actualDate:null}),visit('p3','a','a',{status:'cancelled',plannedDate:'2026-11-04',actualDate:null})],issues:[
 issue('n1','a','a',{createdDate:'2026-10-26'}),issue('n2','b','b',{createdDate:'2026-10-27',type:'다른'}),issue('edge-prev','b','b',{createdDate:'2026-10-25',type:'x1'}),
 issue('r1','c','c',{state:'완료',createdDate:'2026-10-10',completedDate:'2026-10-27'}),issue('r-old','c','c',{state:'완료',createdDate:'2026-10-10',completedDate:'2026-10-25',type:'y'}),
 issue('due','a1','a',{dueDate:'2026-11-02',createdDate:'2026-10-12',type:'z'}),issue('due-far','a1','a',{dueDate:'2026-11-10',createdDate:'2026-10-12',type:'w'}),
 issue('prev1','b','b',{createdDate:'2026-10-19',type:'p1'}),issue('prev2','b','b',{createdDate:'2026-10-20',type:'p2'}),issue('prev3','b','b',{createdDate:'2026-10-21',type:'p3'})]};
wk.issues=wk.issues.map(i=>i.dueDate==='2026-11-05'?{...i,dueDate:'2026-12-31'}:i);
const w=weekDiagnosis(wk,'2026-10-26','2026-11-01',NOW);
eq(w.phase,'current');eq(w.newIssues.map(x=>x.id).sort(),['n1','n2']);eq(w.resolved.map(x=>x.id),['r1']);
eq(w.openNow,wk.issues.filter(x=>x.state!=='완료').length);
// 지난주 월~화(prev1, prev2)와 같은 요일까지 비교: 2건 대 2건
eq(w.delta,{value:0,label:'지난주 같은 요일까지'});
// 다음 주(11.02~11.08): 기한 있는 미해결 이슈와 예정 방문만, 취소·범위 밖 제외
eq(w.upcoming.map(x=>x.key),['a:due','v:p1']);eq(w.upcoming[1].ownerId,'m2');
// 완료된 주는 직전 주 전체와 비교
const past=weekDiagnosis(wk,'2026-10-19','2026-10-25',NOW);eq(past.phase,'past');eq(past.newIssues.some(x=>x.id==='prev1'),true);eq(past.delta?.label,'직전 주 전체');
// 등록일 미확인 이슈는 신규에서 제외하고 증감을 숨긴다
const noDate=weekDiagnosis({...wk,issues:[...wk.issues,issue('nd','a','a',{createdDate:null,type:'q9'})]},'2026-10-26','2026-11-01',NOW);eq(noDate.unknownCreated,1);eq(noDate.delta,null);eq(noDate.newIssues.some(x=>x.id==='nd'),false);
// 비교 구간보다 이전 자료가 없으면 증감을 숨긴다
eq(weekDiagnosis({...wk,issues:[issue('only','a','a',{createdDate:'2026-10-27'})]},'2026-10-26','2026-11-01',NOW).delta,null);
// 미래 주차는 집계하지 않고, 기본 주차는 오늘이 속한 주
eq(weekDiagnosis(wk,'2026-11-02','2026-11-08',NOW).newIssues.length,0);eq(weekDiagnosis(wk,'2026-11-02','2026-11-08',NOW).delta,null);
eq(defaultWeek('2026-10-01','2026-10-31',NOW),'2026-10-26');eq(defaultWeek('2026-12-01','2026-12-31','2026-12-31'),'2026-12-28');
// 재개 이슈(처리 중이지만 완료일이 남은 경우)는 해결로 세지 않는다
eq(weekDiagnosis({...wk,issues:[issue('re','c','c',{state:'처리 중',createdDate:'2026-10-10',completedDate:'2026-10-27'})]},'2026-10-26','2026-11-01',NOW).resolved.length,0);
// 조회기간 경계 주차는 겹치는 날짜만 집계
eq(weekDiagnosis(wk,'2026-10-26','2026-11-01',NOW,{from:'2026-10-27',to:'2026-11-01'}).newIssues.map(x=>x.id),['n2']);
// 어댑터: 실제 플랫폼 데이터와 권한 범위
const fixture=platformDemo(NOW),all=targetsOf(fixture),mgr=fixture.users[0],allowed=visibleTargets(all,mgr);
const sc=scopeInput(fixture,allowed);eq(sc.issues.every(i=>allowed.some(x=>x.id===i.targetId)),true);eq(sc.visits.every(v=>allowed.some(x=>x.id===v.targetId)),true);
const full=diagnose(scopeInput(fixture,all),NOW);eq(full.summary.totalOpen,fixture.actions.filter(x=>x.state!=='완료').length);eq(full.summary.urgent,null);
eq(diagnose(sc,NOW).summary.totalOpen,fixture.actions.filter(x=>x.state!=='완료'&&allowed.some(t=>t.id===(x.targetType==='store'?x.storeId:x.siteId))).length);
eq(briefInput(platformBriefData(fixture,all),fixture.users).issues.length,fixture.actions.length);
eq(diagnose(scopeInput({...fixture,users:[]},all),NOW).summary.unassigned,full.summary.totalOpen);
eq(/^\d{2}\.\d{2} \d{2}:\d{2}$/.test(kstStamp()),true);eq(kstStamp(new Date('2026-10-27T05:00:00Z')),'10.27 14:00');
console.log(`${count} diagnosis assertions passed: dedup by issue id, site/store split, priority and reasons, week boundaries, reopen/unknown dates, comparison hiding, empty-state kinds and access scope.`);
