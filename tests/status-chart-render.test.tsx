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
const slices=(html:string)=>[...html.matchAll(/<path d="M130 128 L([\d.-]+) ([\d.-]+) A80 80 0 (\d) 1 ([\d.-]+) ([\d.-]+) Z"[^>]*><title>([^<]*)<\/title>/g)].map(m=>({large:m[3],title:m[6]}));
const lines=(html:string)=>[...html.matchAll(/<line [^>]*><title>([^<]*)<\/title>/g)].map(m=>m[1]);

// 원그래프: 100개 중 계획 미등록 40·방문 완료 30·방문 예정 30. 건수·비율은 목록과 조각 제목에 같은 값으로 나온다.
const sites=Array.from({length:100},(_,i)=>target("site-"+i));
const visits=sites.slice(40,70).map(t=>visit(t,"completed")).concat(sites.slice(70).map(t=>visit(t,"planned")));
const html=render([...sites,target("closed","site","중단"),target("other-type","store")],visits);
assert.match(html,/운영 중 100개/);assert.match(html,/원그래프/);assert.doesNotMatch(html,/status-hbar-head|<i style="width:/);
assert.match(row(html,"계획 미등록"),/aria-label="계획 미등록 40개, 40%"/);
assert.match(row(html,"방문 완료"),/30개, 30%/);assert.match(row(html,"방문 예정"),/30개, 30%/);
assert.match(row(html,"방문 지연"),/0개, 0%/);
const s=slices(html);assert.deepEqual(s.map(x=>x.title),["계획 미등록 40개 40%","방문 예정 30개 30%","방문 완료 30개 30%"]);
assert.equal(s[0].large,"0");  // 40%는 반원 이하
// 0개 상태는 조각이 없고 선으로 표시하며 건수·비율을 같이 쓴다.
assert.deepEqual(lines(html).sort(),["방문 지연 0개 0%","이력 미확인 0개 0%","필요 방문 없음 0개 0%"].sort());
assert.match(html,/class="swatch line"/);assert.match(html,/0개 0%/);
assert.match(html,/class="status-hbar-count">40<span>개<\/span>/);assert.match(html,/class="status-hbar-percent">40%<\/span>/);

// 7개(7%)처럼 작은 조각은 원 안이 아니라 바깥에 건수·비율 레이블을 쓴다.
const small=render(Array.from({length:100},(_,i)=>target("s"+i)),Array.from({length:100},(_,i)=>i<7?visit(target("s"+i),"planned"):visit(target("s"+i),"completed")).map((v,i)=>({...v,siteId:"s"+i,id:"v"+i})));
assert.match(small,/class="pie-out"[^>]*>7개 7%<\/text>/);

// 작은 조각·0개 선 레이블이 몰려도 같은 쪽 레이블은 세로 15px 이상 떨어진다(겹침 방지).
const crowd=Array.from({length:100},(_,i)=>target("c"+i));
const crowdHtml=render(crowd,crowd.slice(0,7).map((t,i)=>visit(t,i<4?"planned":"completed")));
const outs=[...crowdHtml.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)" text-anchor="[a-z]+" class="pie-out"/g)].map(m=>({x:Number(m[1]),y:Number(m[2])}));
assert.ok(outs.length>=4,"crowded case has several outside labels");
for(const side of [outs.filter(o=>o.x>=130),outs.filter(o=>o.x<130)]){const ys=side.map(o=>o.y).sort((p,q)=>p-q);for(let i=1;i<ys.length;i++)assert.ok(ys[i]-ys[i-1]>=15-1e-6,"outside pie labels overlap: "+ys.join(","))}

// 한 상태가 전부이면 원 하나(조각 경로 없음)·100%.
const full=render([target("one")]);assert.match(full,/<circle [^>]*r="80"/);assert.match(row(full,"계획 미등록"),/1개, 100%/);assert.equal(slices(full).length,0);
const empty=render([]);assert.match(empty,/조회 범위에 운영 중인 현장이 없습니다/);assert.doesNotMatch(empty,/NaN|Infinity|status-pie-svg/);
const stores=render([target("one-site"),target("one-store","store")],[],"store");assert.match(stores,/매장 운영 상태/);assert.match(stores,/운영 중 1개/);assert.match(row(stores,"계획 미등록"),/1개, 100%/);
const panel=renderToStaticMarkup(createElement(ChartPanel,{title:"항상 표시",legend:createElement("span",null,"범례"),children:createElement("p",null,"본문")}));
assert.match(panel,/범례/);assert.match(panel,/본문/);assert.doesNotMatch(panel,/chart-fold|aria-expanded|접기|folded/);
console.log("Status chart render checks passed: pie slice order and shares, zero-count lines with labels, outside labels for small slices, 100% single circle, empty/type filtering and always-visible panels.");
