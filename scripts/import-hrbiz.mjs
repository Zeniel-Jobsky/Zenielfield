// HR-biz 가상 방문 DB(xlsx) → 시드 데이터셋(JSON). 사용: node --env-file=.env scripts/import-hrbiz.mjs <xlsx> [--geocode]
// 시트: 잡매니저_30명 · 현장_100개 · 매장_500개 · 방문기록_DB · 후속조치_DB. 브리핑·문구·코드북 시트는 파생 자료라 읽지 않는다.
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const [input,...flags]=process.argv.slice(2);if(!input){console.error('xlsx 경로가 필요합니다.');process.exit(1)}
let XLSX;try{XLSX=require('xlsx')}catch{XLSX=require(process.env.XLSX_MODULE||'xlsx')}
const wb=XLSX.readFile(input),sheet=n=>{if(!wb.Sheets[n])throw Error('시트 없음: '+n);return XLSX.utils.sheet_to_json(wb.Sheets[n],{defval:''})};
const day=v=>typeof v==='number'?new Date(Math.round((v-25569)*86400000)).toISOString().slice(0,10):/^\d{4}-\d{2}-\d{2}/.test(String(v))?String(v).slice(0,10):null;
const rule=t=>({'월 1회':{period:'month',count:1},'월 2회':{period:'month',count:2},'격주 1회':{period:'month',count:2},'주 1회':{period:'week',count:1},'필요 시':{period:'manual',count:1}})[String(t).trim()]||{period:'manual',count:1};
const states={'조치 예정':'조치 예정','처리 중':'처리 중','보류':'보류','완료':'완료','기한 초과':'조치 예정'};
const idOf=(prefix,code)=>'demo-'+prefix+'-'+String(code).toLowerCase().replace(/[^a-z0-9]+/g,'-');
const domains=[{id:'dom-hr',code:'HR',name:'인재사업',active:1,version:1},{id:'dom-se',code:'SE',name:'SE운영',active:1,version:1}];
const domainOfTeam=team=>/^SE/.test(team)?'dom-se':'dom-hr';
const U=sheet('잡매니저_30명'),S=sheet('현장_100개'),T=sheet('매장_500개'),V=sheet('방문기록_DB'),A=sheet('후속조치_DB');
const users=U.map(u=>({id:idOf('jm',u['잡매니저ID']),name:String(u['잡매니저명(가명)']||u['잡매니저명']).trim(),email:`${String(u['잡매니저ID']).toLowerCase()}@example.test`,role:'manager',team:u['팀'],part:u['파트'],active:/재직/.test(u['상태'])||!u['상태']?1:0,domains:[domainOfTeam(u['팀'])]}));
const uid=Object.fromEntries(U.map(u=>[u['잡매니저ID'],idOf('jm',u['잡매니저ID'])]));
const visitDates=V.map(v=>day(v['방문일'])).filter(Boolean).sort(),startDate=visitDates[0]||'2026-01-01';
const sites=S.map(s=>({id:idOf('site',s['현장ID']),code:s['현장ID'],name:s['현장명'],client:s['고객사(가상)']||s['고객사']||'',division:'HR-biz 사업부',domain:domainOfTeam(s['담당팀']),team:s['담당팀'],part:s['담당파트'],address:`${s['운영권역']} · ${s['대표 방문지역']}`,region:String(s['대표 방문지역']).replace(/권$/,''),managerIds:[uid[s['담당자ID']]].filter(Boolean),rule:rule(s['현장 방문주기']),cycle:String(s['현장 방문주기']),priority:'보통',status:s['운영상태']||'운영 중',startDate,version:1,lat:null,lng:null,source:s['데이터구분']}));
const sid=Object.fromEntries(S.map(s=>[s['현장ID'],idOf('site',s['현장ID'])]));
const stores=T.map(t=>({id:idOf('store',t['매장ID']),siteId:sid[t['현장ID']],code:t['매장ID'],name:t['매장명'],address:`${t['상위 현장명']} ${t['매장명']}`,region:String(t['방문지역']),managerIds:[uid[t['담당자ID']]].filter(Boolean),rule:rule(t['매장 방문주기']),cycle:String(t['매장 방문주기']),status:t['매장상태']||'운영 중',startDate,version:1,lat:null,lng:null,source:t['데이터구분'],sourceUrl:t['지점명 확인 출처']||''}));
const stid=Object.fromEntries(T.map(t=>[t['매장ID'],idOf('store',t['매장ID'])]));
const visits=V.map(v=>{const store=v['매장ID']?stid[v['매장ID']]:null,d=day(v['방문일']);return{id:idOf('visit',v['방문ID']),targetType:store?'store':'site',siteId:sid[v['현장ID']],storeId:store,visitorId:uid[v['잡매니저ID']],plannedDate:d,time:'',purpose:String(v['방문목적']||v['활동유형']),precheck:'',status:'completed',actualDate:d,actualTime:'',detail:String(v['주요활동내역']),notes:String(v['특이사항']),result:v['후속조치필요']==='Y'?'후속 조치 필요':'특이사항 없음',cancelReason:'',requirementId:null,entry:'manual',version:1,activityType:String(v['활동유형']),priority:String(v['우선순위']),template:String(v['문구템플릿ID']),registeredDate:day(v['방문계획등록일'])}});
const vid=new Set(visits.map(v=>v.id));
const actions=A.map(a=>{const store=a['매장ID']?stid[a['매장ID']]:null,visit=idOf('visit',a['연결방문ID']);return{id:idOf('action',a['조치ID']),targetType:store?'store':'site',siteId:sid[a['현장ID']],storeId:store,visitId:vid.has(visit)?visit:null,type:String(a['활동유형']),content:String(a['후속조치 내용']),issue:String(a['접수된 특이사항']),ownerId:uid[a['담당자ID']],createdDate:day(a['방문일']),dueDate:day(a['조치기한']),state:states[String(a['조치상태']).trim()]||'조치 예정',sourceState:String(a['조치상태']),priority:String(a['우선순위']),completedDate:day(a['완료일']),version:1}});
// 좌표: 실제 지점명(전자랜드)만 Kakao 키워드 검색으로 채운다. 가상 매장명은 좌표를 만들지 않는다.
if(flags.includes('--geocode')){const key=process.env.KAKAO_REST_API_KEY;if(!key){console.error('KAKAO_REST_API_KEY 필요');process.exit(1)}let hit=0;const real=stores.filter(s=>/실제 지점명/.test(s.source));
 for(const s of real){const r=await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?size=1&query=${encodeURIComponent(s.name)}`,{headers:{Authorization:'KakaoAK '+key}});const d=(await r.json()).documents?.[0];if(d){s.lat=+Number(d.y).toFixed(6);s.lng=+Number(d.x).toFixed(6);s.address=d.road_address_name||d.address_name||s.address;hit++}await new Promise(x=>setTimeout(x,120))}
 console.log(`좌표: 실제 지점 ${real.length}곳 중 ${hit}곳`)}
const bad=[...sites.filter(s=>!s.managerIds.length).map(s=>'현장 담당자 없음 '+s.code),...stores.filter(s=>!s.siteId||!s.managerIds.length).map(s=>'매장 참조 오류 '+s.code),...visits.filter(v=>!v.siteId||!v.visitorId||!v.actualDate||(v.targetType==='store'&&!v.storeId)).map(v=>'방문 참조 오류 '+v.id),...actions.filter(a=>!a.siteId||!a.ownerId||!a.dueDate||!a.content).map(a=>'조치 참조 오류 '+a.id)];
if(bad.length){console.error(bad.slice(0,20).join('\n'));process.exit(1)}
fs.mkdirSync('data',{recursive:true});fs.writeFileSync('data/hrbiz-demo.json',JSON.stringify({source:'ZeniField_HRbiz_3개팀_가상방문DB.xlsx',importedAt:new Date().toISOString().slice(0,10),domains,users,sites,stores,visits,actions}));
console.log(`사용자 ${users.length} · 현장 ${sites.length} · 매장 ${stores.length} · 방문 ${visits.length} (${visitDates[0]}~${visitDates.at(-1)}) · 조치 ${actions.length} → data/hrbiz-demo.json`);
