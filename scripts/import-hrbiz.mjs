// HR-biz 가상 방문 DB(xlsx) → 시드 데이터셋(JSON). 사용: node --env-file=.env scripts/import-hrbiz.mjs <xlsx>  (좌표는 기존 JSON에서 이어받음, 외부 지도 API 미사용)
// 시트: 잡매니저_30명 · 현장_100개 · 매장_500개 · 방문기록_DB · 후속조치_DB. 브리핑·문구·코드북 시트는 파생 자료라 읽지 않는다.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {cleanJudgment,isCurrentJudgment} from '../app/platform/judgment.ts';
const require=createRequire(import.meta.url);
const [input,...flags]=process.argv.slice(2);if(!input){console.error('xlsx 경로가 필요합니다.');process.exit(1)}
const XLSX=require('xlsx');
const wb=XLSX.readFile(input),sheet=n=>{if(!wb.Sheets[n])throw Error('시트 없음: '+n);return XLSX.utils.sheet_to_json(wb.Sheets[n],{defval:''})};
const day=v=>typeof v==='number'?new Date(Math.round((v-25569)*86400000)).toISOString().slice(0,10):/^\d{4}-\d{2}-\d{2}/.test(String(v))?String(v).slice(0,10):null;
// 모르는 주기 값은 필요 시로 바꾸지 않고 적재를 멈춘다. 엑셀의 '필요 시'는 근거 칸이 없으므로 근거 없는 필요 시(manual 없음)로 들어온다.
const RULES={'월 1회':{period:'month',count:1},'월 2회':{period:'month',count:2},'격주 1회':{period:'month',count:2},'주 1회':{period:'week',count:1},'필요 시':{period:'manual',count:1}};
const rule=t=>{const r=RULES[String(t).trim()];if(!r)throw Error(`알 수 없는 방문주기: ${t}`);return r};
const states={'조치 예정':'조치 예정','처리 중':'처리 중','보류':'보류','완료':'완료','기한 초과':'조치 예정'};
const idOf=(prefix,code)=>'demo-'+prefix+'-'+String(code).toLowerCase().replace(/[^a-z0-9]+/g,'-');
const domains=[{id:'dom-hr',code:'HR',name:'인재사업',active:1,version:1},{id:'dom-se',code:'SE',name:'SE운영',active:1,version:1}];
const domainOfTeam=team=>/^SE/.test(team)?'dom-se':'dom-hr';
const U=sheet('잡매니저_30명'),S=sheet('현장_100개'),T=sheet('매장_500개'),V=sheet('방문기록_DB'),A=sheet('후속조치_DB');
const users=U.map(u=>({id:idOf('jm',u['잡매니저ID']),name:String(u['잡매니저명(가명)']||u['잡매니저명']).trim(),email:`${String(u['잡매니저ID']).toLowerCase()}@example.test`,role:'manager',team:u['팀'],part:u['파트'],active:/재직/.test(u['상태'])||!u['상태']?1:0,domains:[domainOfTeam(u['팀'])]}));
// 역할별 테스트 계정: 관리자·사업부장·팀장(팀별)·파트장(파트별). 로컬 개발 로그인(@example.test) 전용.
const teams=[...new Set(U.map(u=>u['팀']))],parts=[...new Set(U.map(u=>u['파트']))];
users.push({id:'demo-admin',name:'HR-biz 관리자',email:'admin@example.test',role:'admin',team:'HR-biz 사업부',part:'운영지원',active:1,domains:[]},{id:'demo-director',name:'HR-biz 사업부장',email:'director@example.test',role:'director',team:'HR-biz 사업부',part:'사업부',active:1,domains:[]},
 ...teams.map((t,i)=>({id:'demo-lead-'+(i+1),name:t+' 팀장',email:`lead${i+1}@example.test`,role:'lead',team:t,part:parts.find(p=>p.startsWith(t))||'A파트',active:1,domains:[domainOfTeam(t)]})),
 ...parts.map((p,i)=>{const t=U.find(u=>u['파트']===p)['팀'];return{id:'demo-partlead-'+(i+1),name:p+' 파트장',email:`partlead${i+1}@example.test`,role:'partlead',team:t,part:p,active:1,domains:[domainOfTeam(t)]}}));
const uid=Object.fromEntries(U.map(u=>[u['잡매니저ID'],idOf('jm',u['잡매니저ID'])]));
const visitDates=V.map(v=>day(v['방문일'])).filter(Boolean).sort(),startDate=visitDates[0]||'2026-01-01';
const sites=S.map(s=>({id:idOf('site',s['현장ID']),code:s['현장ID'],name:s['현장명'],client:s['고객사(가상)']||s['고객사']||'',division:'HR-biz 사업부',domain:domainOfTeam(s['담당팀']),team:s['담당팀'],part:s['담당파트'],address:`${s['운영권역']} · ${s['대표 방문지역']}`,region:String(s['대표 방문지역']).replace(/권$/,''),managerIds:[uid[s['담당자ID']]].filter(Boolean),rule:rule(s['현장 방문주기']),cycle:String(s['현장 방문주기']),priority:'보통',status:s['운영상태']||'운영 중',startDate,version:1,lat:null,lng:null,source:s['데이터구분']}));
const sid=Object.fromEntries(S.map(s=>[s['현장ID'],idOf('site',s['현장ID'])]));
const stores=T.map(t=>({id:idOf('store',t['매장ID']),siteId:sid[t['현장ID']],code:t['매장ID'],name:t['매장명'],address:`${t['상위 현장명']} ${t['매장명']}`,region:String(t['방문지역']),managerIds:[uid[t['담당자ID']]].filter(Boolean),rule:rule(t['매장 방문주기']),cycle:String(t['매장 방문주기']),status:t['매장상태']||'운영 중',startDate,version:1,lat:null,lng:null,source:t['데이터구분'],sourceUrl:t['지점명 확인 출처']||''}));
const stid=Object.fromEntries(T.map(t=>[t['매장ID'],idOf('store',t['매장ID'])]));
const visits=V.map(v=>{const store=v['매장ID']?stid[v['매장ID']]:null,d=day(v['방문일']);return{id:idOf('visit',v['방문ID']),targetType:store?'store':'site',siteId:sid[v['현장ID']],storeId:store,visitorId:uid[v['잡매니저ID']],plannedDate:d,time:'',purpose:String(v['방문목적']||v['활동유형']),precheck:'',status:'completed',actualDate:d,actualTime:'',detail:String(v['주요활동내역']),notes:String(v['특이사항']),result:v['후속조치필요']==='Y'?'후속 조치 필요':'특이사항 없음',cancelReason:'',requirementId:null,entry:'manual',version:1,activityType:String(v['활동유형']),priority:String(v['우선순위']),template:String(v['문구템플릿ID']),registeredDate:day(v['방문계획등록일'])}});
// 문제 판정: scripts/judge-reports.mjs가 만든 판정 파일이 있으면 방문 ID로 붙인다(다시 생성해도 AI를 또 부르지 않음).
const judged=fs.existsSync('data/hrbiz-judgments.json')?JSON.parse(fs.readFileSync('data/hrbiz-judgments.json','utf8')).judgments:{};let judgedN=0,staleN=0;
// 현재 형식 판정만 cleanJudgment로 정리해 붙인다. 옛 형식(has/items)은 붙이지 않는다.
for(const v of visits){const j=judged[v.id];if(!j)continue;if(!isCurrentJudgment(j)){staleN++;continue}v.judgment=cleanJudgment(j);judgedN++}
if(staleN)console.warn(`옛 형식 판정 ${staleN}건은 붙이지 않음 — scripts/judge-reports.mjs --redo로 다시 판정`);
const vid=new Set(visits.map(v=>v.id));
const actions=A.map(a=>{const store=a['매장ID']?stid[a['매장ID']]:null,visit=idOf('visit',a['연결방문ID']);return{id:idOf('action',a['조치ID']),targetType:store?'store':'site',siteId:sid[a['현장ID']],storeId:store,visitId:vid.has(visit)?visit:null,type:String(a['활동유형']),content:String(a['후속조치 내용']),issue:String(a['접수된 특이사항']),ownerId:uid[a['담당자ID']],createdDate:day(a['방문일']),dueDate:day(a['조치기한']),state:states[String(a['조치상태']).trim()]||'조치 예정',sourceState:String(a['조치상태']),priority:String(a['우선순위']),completedDate:day(a['완료일']),version:1}});
// 좌표 이어받기: 다시 만들면 기존 data/hrbiz-demo.json의 매장 좌표·주소를 매장 코드로 그대로 옮긴다(외부 API 호출 없음).
if(fs.existsSync('data/hrbiz-demo.json')){const prev=new Map(JSON.parse(fs.readFileSync('data/hrbiz-demo.json','utf8')).stores.filter(s=>s.lat!=null).map(s=>[s.code,s]));let kept=0;for(const s of stores){const o=prev.get(s.code);if(o){s.lat=o.lat;s.lng=o.lng;s.address=o.address;kept++}}console.log(`좌표: 기존 데이터에서 ${kept}곳 이어받음`)}
const bad=[...sites.filter(s=>!s.managerIds.length).map(s=>'현장 담당자 없음 '+s.code),...stores.filter(s=>!s.siteId||!s.managerIds.length).map(s=>'매장 참조 오류 '+s.code),...visits.filter(v=>!v.siteId||!v.visitorId||!v.actualDate||(v.targetType==='store'&&!v.storeId)).map(v=>'방문 참조 오류 '+v.id),...actions.filter(a=>!a.siteId||!a.ownerId||!a.dueDate||!a.content).map(a=>'조치 참조 오류 '+a.id)];
if(bad.length){console.error(bad.slice(0,20).join('\n'));process.exit(1)}
fs.mkdirSync('data',{recursive:true});fs.writeFileSync('data/hrbiz-demo.json',JSON.stringify({source:'ZeniField_HRbiz_3개팀_가상방문DB.xlsx',importedAt:new Date().toISOString().slice(0,10),domains,users,sites,stores,visits,actions}));
console.log(`사용자 ${users.length} · 현장 ${sites.length} · 매장 ${stores.length} · 방문 ${visits.length} (${visitDates[0]}~${visitDates.at(-1)}) · 조치 ${actions.length} · 판정 ${judgedN} → data/hrbiz-demo.json`);
