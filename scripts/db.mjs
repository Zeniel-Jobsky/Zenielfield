// 시연 DB·실사용 DB 두 개를 같은 스키마로 관리하고, 운영 앱이 붙는 DB(active)를 바꾼다. 대상 목록은 ops/db-targets.json.
// 사용: node --env-file=.env scripts/db.mjs status                         두 DB의 이관 대기·행 수, 지금 연결(active)
//       node --env-file=.env scripts/db.mjs migrate <demo|real|all> [--dry-run] [--no-edge]   스키마 전환(이관 + Edge 함수 재배포)
//       node --env-file=.env scripts/db.mjs bootstrap real --admin <메일> --name <이름> --approved-by <승인자>   빈 새 프로젝트 설치(최초 1회)
//       node --env-file=.env scripts/db.mjs switch <demo|real> --approved-by <승인자>   운영 앱 연결 교체(ops/db-targets.json active 변경, 푸시하면 CI가 반영)
//       node --env-file=.env scripts/db.mjs backup [demo|real]           zf_ 테이블 JSON 백업(work/backup/)
//       node --env-file=.env scripts/db.mjs reset demo --keep <관리자메일,…> --confirm <ref> --approved-by <승인자>   백업 후 업무 데이터·다른 사용자 삭제(스키마·이관 이력 유지)
//       node --env-file=.env scripts/db.mjs activation [demo|real]       첫 로그인(계정 활성화) 현황, 대기 명단 work/activation-pending.csv
//       node scripts/db.mjs ref | url                                   지금 연결된 DB의 ref·주소(CI가 쓴다)
//  - 한 Supabase 계정 토큰(SUPABASE_ACCESS_TOKEN)으로 두 프로젝트를 다룬다. 게이트웨이 토큰 검증값은 Edge 코드에 있어 두 DB가 같은 Worker 토큰을 쓴다.
//  - 운영 DB를 바꾸는 명령(migrate 실제 실행·bootstrap·switch)은 사용자 승인 후 실행한다. 실패하면 멈춘다(DC-HALT).
import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {supabaseSql} from './lib/supabase-sql.mjs';

const file='ops/db-targets.json',cfg=JSON.parse(readFileSync(file,'utf8'));
const [cmd,which]=process.argv.slice(2),arg=k=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]||'':''},has=k=>process.argv.includes('--'+k);
const stop=m=>{console.error('멈춤: '+m);process.exit(1)};
const target=name=>{const t=cfg.targets[name];if(!t)stop(`대상 '${name}' 없음 (demo | real)`);if(!t.ref)stop(`${t.label} ref가 비어 있습니다. ops/db-targets.json targets.${name}.ref 에 새 프로젝트 ref를 적으세요.`);return {name,...t,url:`https://${t.ref}.supabase.co`}};
const names=w=>w==='all'?Object.keys(cfg.targets).filter(n=>cfg.targets[n].ref):[w];
const run=(c,env={})=>{console.log('$ '+c);const r=spawnSync(c,{shell:true,stdio:'inherit',env:{...process.env,...env}});if(r.status!==0)stop('명령 실패: '+c)};
const token=()=>process.env.SUPABASE_ACCESS_TOKEN||stop('SUPABASE_ACCESS_TOKEN 이 필요합니다(.env 또는 CI Secret).');
const approve=()=>arg('approved-by')||stop('운영 DB를 바꾸는 명령입니다. 사용자 승인 후 --approved-by <이름>을 붙이세요. 에이전트는 스스로 승인하지 않습니다.');
const edge=t=>{run('node scripts/bundle-supabase.mjs');for(const f of ['zenifield-gateway','zenifield-cloudflare'])run(`npx supabase functions deploy ${f} --project-ref ${t.ref} --use-api --no-verify-jwt`)};
const includes=()=>readFileSync('supabase/migrations/SCHEMA_INCLUDES','utf8').split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));

// 백업: zf_ 테이블을 work/backup/<대상>-<시각>/ 에 JSON으로 받는다(되돌릴 근거). reset 은 항상 먼저 백업한다.
const TABLES=['zf_domains','zf_users','zf_sites','zf_stores','zf_assignments','zf_policy_versions','zf_visits','zf_actions','zf_audit'];
const backup=async t=>{const q=supabaseSql({ref:t.ref,token:token()}),dir=`work/backup/${t.name}-${new Date().toISOString().replace(/[:.]/g,'-')}`;mkdirSync(dir,{recursive:true});
 for(const tb of TABLES){const r=await q(`select coalesce(json_agg(x),'[]'::json) as rows from public.${tb} x`);const rows=r[0]?.rows||[];writeFileSync(`${dir}/${tb}.json`,JSON.stringify(rows));console.log(`${tb.padEnd(20)} ${rows.length}행`)}
 console.log('백업 → '+dir);return dir};
if(cmd==='backup'){await backup(target(which||cfg.active));process.exit(0)}

// 초기화: 백업 뒤 한 트랜잭션으로 업무 데이터(도메인·현장·매장·배정·주기·방문·조치·감사)와 --keep 밖의 사용자를 지운다. 스키마·이관 이력은 남긴다.
if(cmd==='reset'){const by=approve(),t=target(which||''),keep=arg('keep').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(arg('confirm')!==t.ref)stop(`되돌릴 수 없는 삭제입니다. 대상 ref를 --confirm ${t.ref} 로 한 번 더 적으세요.`);
 if(!keep.length)stop('--keep <남길 관리자 메일,…> 이 필요합니다(로그인한 적 있는 활성 관리자 1명 이상).');
 const q=supabaseSql({ref:t.ref,token:token()}),lit=s=>"'"+String(s).replace(/'/g,"''")+"'",inKeep=`(${keep.map(lit).join(',')})`;
 const kept=await q(`select email from public.zf_users where lower(email) in ${inKeep} and role='admin' and active=1 and subject is not null`);
 if(kept.length!==keep.length)stop(`활성·로그인 이력 있는 admin이 아닌 메일: ${keep.filter(k=>!kept.some(x=>x.email.toLowerCase()===k)).join(', ')}`);
 console.log(`== ${t.label} 초기화 (승인 ${by}, 남길 관리자 ${keep.join(', ')})`);await backup(t);
 await q(`begin;
delete from public.zf_actions; delete from public.zf_visits; delete from public.zf_assignments; delete from public.zf_policy_versions;
delete from public.zf_stores; delete from public.zf_sites; delete from public.zf_audit;
delete from public.zf_users where lower(email) not in ${inKeep};
update public.zf_users set domains=array[]::text[] where lower(email) in ${inKeep};
delete from public.zf_domains;
commit;`);
 console.log('✓ 초기화 완료. 남은 행:');for(const r of await q(TABLES.map(tb=>`select '${tb}' t,count(*)::int n from public.${tb}`).join(' union all ')))console.log(`${r.t.padEnd(20)} ${r.n}`);
 process.exit(0)}

// 계정 활성화 현황: 첫 로그인(이메일 링크·비밀번호)으로 계정 주체(subject)가 연결된 사용자 수. 미활성 명단은 git 제외 work/activation-pending.csv 에만 쓴다.
if(cmd==='activation'){const t=target(which||cfg.active),q=supabaseSql({ref:t.ref,token:token()});
 const rows=await q(`select email,name,role,team,part,(subject is not null) done from public.zf_users where active=1 order by done,team,part,name`);
 const wait=rows.filter(r=>!r.done);console.log(`${t.label}: 활성 사용자 ${rows.length}명 중 첫 로그인 완료 ${rows.length-wait.length}명 · 대기 ${wait.length}명`);
 for(const role of ['admin','director','lead','partlead','manager']){const all=rows.filter(r=>r.role===role);if(all.length)console.log(`  ${role.padEnd(9)} ${all.length-all.filter(r=>!r.done).length}/${all.length}`)}
 mkdirSync('work',{recursive:true});writeFileSync('work/activation-pending.csv','﻿email,name,role,team,part\n'+wait.map(r=>[r.email,r.name,r.role,r.team,r.part].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')+'\n');
 console.log('대기 명단 → work/activation-pending.csv (git 제외)');process.exit(0)}

if(cmd==='ref'||cmd==='url'){const t=target(cfg.active);console.log(cmd==='ref'?t.ref:t.url);process.exit(0)}

if(cmd==='status'){
 console.log(`운영 앱 연결: ${cfg.active} (${cfg.targets[cfg.active].label})\n`);
 for(const n of Object.keys(cfg.targets)){const t=cfg.targets[n];if(!t.ref){console.log(`[${n}] ${t.label}: 아직 없음(ref 비어 있음)`);continue}
  const q=supabaseSql({ref:t.ref,token:token()});
  try{const [r]=await q(`select (select count(*)::int from public.zf_users) u,(select count(*)::int from public.zf_sites) s,(select count(*)::int from public.zf_visits) v,(select count(*)::int from public.zf_schema_migrations) m`);
   console.log(`[${n}] ${t.label} ${t.ref}: 사용자 ${r.u} · 현장 ${r.s} · 방문 ${r.v} · 적용 이관 ${r.m}`)}catch(e){console.log(`[${n}] ${t.label} ${t.ref}: 조회 실패 — ${e.message.slice(0,120)}`)}
  run(`node scripts/migrate.mjs --dry-run --project ${t.ref}`)}
 process.exit(0)}

if(cmd==='migrate'){if(!which)stop('migrate <demo|real|all>');const dry=has('dry-run');if(!dry)approve();
 for(const n of names(which)){const t=target(n);console.log(`\n== ${t.label} (${t.ref}) 스키마 전환${dry?' 미리 보기':''}`);
  run(`node scripts/migrate.mjs --project ${t.ref}${dry?' --dry-run':''}`);if(!dry&&!has('no-edge'))edge(t)}
 process.exit(0)}

if(cmd==='bootstrap'){const by=approve(),t=target(which||''),admin=arg('admin'),name=arg('name');
 if(t.name===cfg.active)stop('지금 운영 앱이 붙어 있는 DB에는 설치하지 않습니다.');
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(admin)||!name)stop('--admin <첫 관리자 메일> --name <이름> 이 필요합니다.');
 const q=supabaseSql({ref:t.ref,token:token()});
 const [e]=await q(`select count(*)::int n from information_schema.tables where table_schema='public' and table_name like 'zf\\_%'`);
 if(e.n)stop(`${t.label}에 이미 zf_ 테이블 ${e.n}개가 있습니다. 빈 프로젝트에만 설치합니다.`);
 console.log(`== ${t.label} 설치 (승인 ${by})`);
 await q(readFileSync('supabase/schema.sql','utf8'));console.log('✓ schema.sql');
 const inc=includes().filter(f=>readdirSync('supabase/migrations').includes(f));
 run(`node scripts/migrate.mjs --project ${t.ref} --mark-applied ${inc.join(',')}`);
 const lit=s=>"'"+String(s).replace(/'/g,"''")+"'";
 await q(`insert into public.zf_users(id,email,name,role,team,part,active,version,domains) values('u-admin-01',${lit(admin)},${lit(name)},'admin','운영','운영지원',1,1,array[]::text[]) on conflict(id) do nothing`);console.log(`✓ 첫 관리자 ${admin}`);
 edge(t);
 console.log(`\n완료. 다음: 첫 관리자 비밀번호 발급 → node --env-file=.env scripts/set-password.mjs ${admin} <비밀번호> 는 연결 교체 뒤(그 DB의 Edge 기준) 또는 .env ZENIFIELD_SUPABASE_URL=${t.url} 로 실행.`);
 process.exit(0)}

if(cmd==='switch'){const by=approve(),t=target(which||'');if(t.name===cfg.active)stop(`이미 ${t.label}에 연결되어 있습니다.`);
 const q=supabaseSql({ref:t.ref,token:token()});
 const [r]=await q(`select (select count(*)::int from public.zf_users where role='admin' and active=1) a`).catch(e=>stop(`${t.label} 조회 실패: ${e.message}`));
 if(!r.a)stop(`${t.label}에 활성 관리자가 없습니다. bootstrap 을 먼저 하세요.`);
 run(`node scripts/migrate.mjs --dry-run --project ${t.ref}`);
 cfg.active=t.name;writeFileSync(file,JSON.stringify(cfg,null,2)+'\n');
 console.log(`\n✓ ops/db-targets.json active=${t.name} (승인 ${by}). 커밋·푸시하면 CI가 ${t.label}에 이관·Edge를 맞추고 Worker 연결값(ZENIFIELD_SUPABASE_URL)을 바꿔 배포합니다.\n  되돌리기: node scripts/db.mjs switch ${Object.keys(cfg.targets).find(n=>n!==t.name)} --approved-by <이름> 후 푸시.`);
 process.exit(0)}

stop('status | migrate <demo|real|all> | bootstrap real | switch <demo|real> | ref | url');
