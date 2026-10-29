// 실제 AI 키로 직급별 브리핑 견본 생성: HR-biz 데이터(저장된 판정 포함)로 화면과 같은 범위·기간의 다이제스트를 만들어 /api/assist(brief)와 같은 서버 함수로 보낸다.
// 사용: node --env-file=.env scripts/brief-sample.mjs [YYYY-MM-DD 기준일]
import fs from 'node:fs';
import {buildDigest,aiInput} from '../app/platform/ai-brief';
import {aggregate,targetsOf,visibleTargets,targetOf,type PlatformData} from '../app/platform/model';
import {assistVisit} from '../app/api/assist/server';
import {monthRange} from '../app/lib/date';
const raw=JSON.parse(fs.readFileSync('data/hrbiz-demo.json','utf8'));
const data:PlatformData={users:raw.users,sites:raw.sites,stores:raw.stores,visits:raw.visits,actions:raw.actions,audit:[],domains:raw.domains||[]};
const now=process.argv[2]||'2026-10-26',[start,end]=monthRange(now);
const all=targetsOf(data);
function ctx(me:any):any{const targets=visibleTargets(all,me),scope=targets,type='site' as const,ids=new Set(scope.map(t=>t.id));
 const m=aggregate(scope.filter(t=>t.type===type),data.visits.filter(v=>ids.has(targetOf(v))),start,end,now);
 return {demo:false,data,me,now,start,end,targets,scope,siteScope:scope.filter(t=>t.type==='site'),storeScope:scope.filter(t=>t.type==='store'),visits:data.visits.filter(v=>ids.has(targetOf(v))),actions:data.actions.filter(a=>ids.has(targetOf(a))),metrics:m,allMetrics:m,type,team:'',part:'',manager:'',siteId:'',storeId:'',
  target:(id:string)=>all.find(t=>t.id===id),uname:(id:string)=>data.users.find(u=>u.id===id)?.name||'',label:(v:any)=>all.find(t=>t.id===targetOf(v))?.name||'',owners:()=>'',setTeam(){},setPart(){},setManager(){},showTarget(){}}}
const pick=(role:string)=>data.users.find(u=>u.role===role&&u.active);
for(const role of ['manager','partlead','lead','director']){const me=pick(role);if(!me){console.log(role,'사용자 없음');continue}
 const d=buildDigest(ctx(me)),t0=Date.now();
 const res=await assistVisit(new Request('http://local/api/assist',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':'brief-sample','origin':'http://local'},body:JSON.stringify({text:JSON.stringify(aiInput(d)),images:[],mode:'brief'})}),{});
 const j:any=await res.json();const t=(r:any)=>Array.isArray(r)?r.map((x:any)=>x.v).join(''):String(r??'');
 console.log(`\n===== ${role} (${me.name}) · ${res.status} · ${j.model||''}`);
 if(!res.ok){console.log(j.error);continue}
 const b=j.draft;console.log('현황:',t(b.headline));console.log('전할 말:',t(b.cheer));
 console.log('무슨 일:',t(b.story));console.log('주제:',(b.themes||[]).map((x:any)=>`${x.title}(${x.status})`).join(' / '));
 console.log('먼저 챙길 곳:',(b.focus||[]).map((x:any)=>`${x.name}: ${t(x.reason)}`).join(' | '));
 console.log('지시:',(b.directive||[]).map((x:any)=>x.to+': '+t(x.say)).join(' | '));console.log('이행:',(b.steps||[]).map(t).join(' | '));console.log('판단:',(b.judgment||[]).map(t).join(' | '));console.log('다음 주:',(b.watch||[]).map(t).join(' | '));
 fs.writeFileSync(`.brief-${role}.json`,JSON.stringify({digest:{role:d.role,units:d.units.length,reports:d.reportTotal,judged:d.judged.reports},brief:b},null,1));
}
