// 운영 방문 보고 내려받기(읽기 전용): 판정 백필 입력으로 쓴다. 출력은 import-hrbiz.mjs와 같은 모양(users·sites·stores·visits·actions)이라
// judge-reports.mjs / apply-judgments.mjs를 그대로 쓸 수 있다. 사용: node --env-file=.env scripts/export-visits.mjs [출력=work/prod-visits.json]
import fs from 'node:fs';
import {supabaseSql} from './lib/supabase-sql.mjs';
const out=process.argv[2]||'work/prod-visits.json',sql=supabaseSql();
const rows=async t=>(await sql(`select data from public.${t}`)).map(r=>r.data);
const users=await sql(`select id,name,role,team,part,active from public.zf_users`),sites=await rows('zf_sites'),stores=await rows('zf_stores'),visits=await rows('zf_visits'),actions=await rows('zf_actions');
fs.mkdirSync('work',{recursive:true});fs.writeFileSync(out,JSON.stringify({source:'prod-export',exportedAt:new Date().toISOString(),users,sites,stores,visits,actions}));
const done=visits.filter(v=>v.status==='completed'),unj=done.filter(v=>!v.judgment||typeof v.judgment!=='object'||!v.judgment.level);
console.log(`방문 ${visits.length}건(완료 ${done.length}, 판정 없음 ${unj.length}) · 조치 ${actions.length}건 · 현장 ${sites.length} · 매장 ${stores.length} → ${out}`);
