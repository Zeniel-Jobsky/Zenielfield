import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {StoreStatusChart} from '../app/platform/decision';
import {ChartPanel} from '../app/platform/charts';
import {aggregate,type Target,type FieldVisit} from '../app/platform/model';
import type {Context} from '../app/platform/context';

const now='2026-10-20',start='2026-10-01',end='2026-10-31';
const target=(id:string,type:'site'|'store'='site',status='운영 중'):Target=>({id,type,siteId:id,storeId:type==='store'?id:null,name:id,siteName:id,team:'팀',part:'파트',division:'사업부',domain:'업무',region:'서울',address:'',managerIds:['m'],rule:{period:'month',count:1},status,startDate:'2026-01-01',lat:null,lng:null});
const visit=(t:Target,status:'planned'|'completed'):FieldVisit=>({id:'v-'+t.id,targetType:t.type,siteId:t.siteId,storeId:t.storeId,visitorId:'m',plannedDate:status==='completed'?'2026-10-05':'2026-10-29',time:'10:00',purpose:'점검',precheck:'',actualDate:status==='completed'?'2026-10-05':null,actualTime:'10:00',result:'특이사항 없음',detail:'점검',notes:'',status,cancelReason:'',requirementId:null,version:1});
function render(scope:Target[],visits:FieldVisit[]=[],type:'site'|'store'='site'){
 const c:Pick<Context,'scope'|'visits'|'type'|'allMetrics'|'go'>={scope,visits,type,allMetrics:aggregate(scope,visits,start,end,now),go:()=>{}};
 return renderToStaticMarkup(createElement(StoreStatusChart,{c:c as Context}));
}
function row(html:string,label:string){const value=[...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map(m=>m[0]).find(s=>s.includes(`aria-label="${label} `));assert.ok(value,`Missing ${label} row`);return value}
function width(html:string){const value=html.match(/<i style="width:([\d.]+)%/);assert.ok(value);return Number(value[1])}

// The largest category is 40 of 100. Scaling against the maximum would incorrectly fill it to 100%.
const sites=Array.from({length:100},(_,i)=>target('site-'+i));
const visits=sites.slice(40,70).map(t=>visit(t,'completed')).concat(sites.slice(70).map(t=>visit(t,'planned')));
const html=render([...sites,target('closed','site','중단'),target('other-type','store')],visits);
assert.equal(width(row(html,'계획 미등록')),40);
assert.match(row(html,'계획 미등록'),/aria-label="계획 미등록 40개, 40%"/);
assert.equal(width(row(html,'방문 완료')),30);
assert.equal(width(row(html,'방문 예정')),30);
assert.equal(width(row(html,'방문 지연')),0);
assert.match(html,/운영 중 100개/);
assert.match(html,/대상 수/);assert.match(html,/비율/);
assert.match(html,/class="status-hbar-count">40<span>개<\/span>/);
assert.match(html,/class="status-hbar-percent">40%<\/span>/);

// Use the unrounded ratio for bar geometry while displaying a rounded whole percentage.
const fractionalTargets=Array.from({length:107},(_,i)=>target('fraction-'+i));
const fraction=render(fractionalTargets,fractionalTargets.slice(51).map(t=>visit(t,'completed')));
const fractionRow=row(fraction,'계획 미등록');
// The reported 51 of 107 case must show about 47.66% length and the label 48%.
assert.ok(Math.abs(width(fractionRow)-51/107*100)<1e-10);
assert.match(fractionRow,/51개, 48%/);

const full=render([target('one')]);assert.equal(width(row(full,'계획 미등록')),100);
const empty=render([]);assert.match(empty,/조회 범위에 운영 중인 현장이 없습니다/);assert.doesNotMatch(empty,/NaN|Infinity|status-hbar-percent/);
const stores=render([target('one-site'),target('one-store','store')],[],'store');assert.match(stores,/매장 운영 상태/);assert.match(stores,/운영 중 1개/);assert.equal(width(row(stores,'계획 미등록')),100);
const panel=renderToStaticMarkup(createElement(ChartPanel,{title:'항상 표시',legend:createElement('span',null,'범례'),children:createElement('p',null,'본문')}));
assert.match(panel,/범례/);assert.match(panel,/본문/);assert.doesNotMatch(panel,/chart-fold|aria-expanded|접기|folded/);
console.log('Status chart render regression checks passed: shared 100% scale, original ratios, separate units, zero/full/empty/type filtering and always-visible panels.');
