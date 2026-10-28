// Supabase 이관 자동 적용. supabase/migrations/*.sql 을 파일명 순으로 읽어 아직 적용되지 않은 것만 운영 DB에 실행한다.
// 적용 이력은 public.zf_schema_migrations(name, applied_at, checksum) 에 남기고, 같은 이름은 다시 실행하지 않는다.
// 사용: node --env-file=.env scripts/migrate.mjs [--dry-run] [--project <ref>] [--mark-applied <파일명,...>]
//  - 필요 환경: SUPABASE_ACCESS_TOKEN (Management API), SUPABASE_PROJECT_REF (기본 nhywssfwtnonytbkufyy)
//  - 각 파일은 하나의 트랜잭션(begin … commit)으로 실행한다. 실패하면 그 파일에서 멈추고 이력에 남기지 않는다.
//  - --mark-applied: 이미 손으로 적용한 이관을 실행하지 않고 이력에만 기록한다(최초 도입 시 기준선 잡기).
//  - --dry-run: 아무것도 쓰지 않는다(이력 표도 만들지 않음). 이력 표가 없으면 전부 미적용으로 표시된다.
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const args=process.argv.slice(2),dry=args.includes('--dry-run'),at=args.indexOf('--project'),mk=args.indexOf('--mark-applied');
const mark=mk>=0?(args[mk+1]||'').split(',').filter(Boolean):[];
const project=(at>=0?args[at+1]:'')||process.env.SUPABASE_PROJECT_REF||'nhywssfwtnonytbkufyy',token=process.env.SUPABASE_ACCESS_TOKEN||'';
const dir=resolve(process.cwd(),'supabase/migrations');
const files=readdirSync(dir).filter(f=>/^\d{14}_.+\.sql$/.test(f)).sort();
async function query(sql){
 const r=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({query:sql})});
 const text=await r.text();if(!r.ok)throw new Error(`HTTP ${r.status} ${text.slice(0,400)}`);try{return JSON.parse(text)}catch{return text}
}
const ledger=`create table if not exists public.zf_schema_migrations(name text primary key,checksum text not null,applied_at timestamptz not null default now());
alter table public.zf_schema_migrations enable row level security;`;
if(!files.length){console.log('적용할 이관 파일이 없습니다.');process.exit(0)}
if(!token){console.error('SUPABASE_ACCESS_TOKEN 이 없습니다. .env 또는 CI secret 으로 전달하세요.');process.exitCode=1}
else{
 const applied=new Map();
 if(!dry)await query(ledger);
 try{for(const row of await query('select name,checksum from public.zf_schema_migrations'))applied.set(row.name,row.checksum)}catch(e){if(!dry)throw e;console.log('이력 표(zf_schema_migrations)가 아직 없습니다. 첫 실행 때 만들어집니다.')}
 for(const f of mark){
  if(!files.includes(f)){console.error(`없는 파일: ${f}`);process.exitCode=1;continue}
  if(applied.has(f))continue;
  const sum=createHash('sha256').update(readFileSync(resolve(dir,f),'utf8')).digest('hex').slice(0,16);
  if(!dry)await query(`insert into public.zf_schema_migrations(name,checksum) values ('${f.replace(/'/g,"''")}','${sum}')`);
  applied.set(f,sum);console.log(`${dry?'[dry-run] ':''}기준선 기록(실행 안 함): ${f}`);
 }
 let ran=0;
 for(const f of files){
  const sql=readFileSync(resolve(dir,f),'utf8'),sum=createHash('sha256').update(sql).digest('hex').slice(0,16);
  if(applied.has(f)){if(applied.get(f)!==sum)console.warn(`주의: ${f} 는 이미 적용되었지만 내용이 바뀌었습니다(체크섬 ${applied.get(f)} → ${sum}). 적용된 이관은 수정하지 말고 새 파일로 추가하세요.`);continue}
  console.log(`${dry?'[dry-run] ':''}적용: ${f}`);
  if(dry)continue;
  const name=f.replace(/'/g,"''");
  await query(`begin;\n${sql}\ninsert into public.zf_schema_migrations(name,checksum) values ('${name}','${sum}');\ncommit;`);
  ran++;
 }
 console.log(dry?`미적용 ${files.filter(f=>!applied.has(f)).length}개 (dry-run)`:`완료: ${ran}개 적용, ${files.length-ran}개 이미 적용됨`);
}
