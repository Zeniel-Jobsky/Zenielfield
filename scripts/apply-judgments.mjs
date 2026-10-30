// 판정 파일을 운영 방문 기록(zf_visits.data.judgment)에 붙인다. 시드 재적재(purge+insert) 없이 방문 ID별 갱신만 한다.
// 사람이 확정한 판정(by가 'ai'가 아닌 것)은 덮어쓰지 않는다. 이관 20261028140000_visit_judgment.sql 적용 뒤에 실행한다.
// 사용: node --env-file=.env scripts/apply-judgments.mjs [판정 파일=data/hrbiz-judgments.json]           → 미리보기(대상 건수·SQL 크기만)
//       node --env-file=.env scripts/apply-judgments.mjs [판정 파일] --apply                              → 운영 적용(한 트랜잭션)
import {supabaseSql} from './lib/supabase-sql.mjs';
import fs from 'node:fs';
const args=process.argv.slice(2),apply=args.includes('--apply'),file=args.find(a=>!a.startsWith('--'))||'data/hrbiz-judgments.json';
const ref=process.env.SUPABASE_PROJECT_REF||'nhywssfwtnonytbkufyy',token=process.env.SUPABASE_ACCESS_TOKEN;if(!token){console.error('SUPABASE_ACCESS_TOKEN 필요');process.exit(1)}
const {judgments}=JSON.parse(fs.readFileSync(file,'utf8')),rows=Object.entries(judgments);
const lit=s=>"'"+String(s).replace(/'/g,"''")+"'";
// 요청 크기 제한(413) 때문에 1,000건씩 나눠 보낸다. 미리보기 합계는 묶음별 결과를 더한다
const CHUNK=1000,chunks=[];for(let i=0;i<rows.length;i+=CHUNK)chunks.push(rows.slice(i,i+CHUNK).map(([id,j])=>`(${lit(id)},${lit(JSON.stringify(j))}::jsonb)`).join(',\n'));
const where=`v.id=j.id and (not (v.data ? 'judgment') or jsonb_typeof(v.data->'judgment')='null' or v.data->'judgment'->>'by'='ai')`;
const sql=supabaseSql({ref,token}),run=async query=>{try{return await sql(query)}catch(e){console.error(e.message.slice(0,500));process.exit(1)}};
const sum={found:0,missing:0,person_confirmed:0,will_update:0,constraint_ready:0};
for(const values of chunks){const [r]=await run(`with j(id,judgment) as (values ${values})
select count(*) filter (where v.id is not null) as found, count(*) filter (where v.id is null) as missing,
 count(*) filter (where v.id is not null and v.data ? 'judgment' and v.data->'judgment'->>'by'<>'ai') as person_confirmed,
 count(*) filter (where ${where.replaceAll('v.id=j.id and ','v.id is not null and ')}) as will_update,
 (select count(*) from pg_constraint where conname='zf_visits_judgment_shape') as constraint_ready
from j left join public.zf_visits v on v.id=j.id`);for(const k of Object.keys(sum))sum[k]=k==='constraint_ready'?Number(r[k]):sum[k]+Number(r[k])}
const check=[sum];
console.log(`판정 ${rows.length}건 · 운영에 있는 방문`,check[0]);
if(!apply){console.log('미리보기만 했습니다. 적용하려면 --apply');process.exit(0)}
if(!Number(check[0].constraint_ready)){console.error('이관 20261028140000_visit_judgment.sql이 아직 운영에 없습니다. 먼저 적용하세요.');process.exit(1)}
let n=0;for(const values of chunks){await run(`begin;
with j(id,judgment) as (values ${values})
update public.zf_visits v set data=jsonb_set(v.data,'{judgment}',j.judgment,true) from j where ${where};
commit;`);n++;process.stdout.write(`  묶음 ${n}/${chunks.length} `)}
const res=await run(`select count(*) as judged from public.zf_visits where data ? 'judgment';`);
console.log('적용 완료',res);
