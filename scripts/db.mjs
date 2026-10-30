// 시연 DB·실사용 DB 두 개를 같은 스키마로 관리하고, 운영 앱이 붙는 DB(active)를 바꾼다. 대상 목록은 ops/db-targets.json.
// 사용: node --env-file=.env scripts/db.mjs status                         두 DB의 이관 대기·행 수, 지금 연결(active)
//       node --env-file=.env scripts/db.mjs migrate <demo|real|all> [--dry-run] [--no-edge]   스키마 전환(이관 + Edge 함수 재배포)
//       node --env-file=.env scripts/db.mjs bootstrap real --admin <메일> --name <이름> --approved-by <승인자>   빈 새 프로젝트 설치(최초 1회)
//       node --env-file=.env scripts/db.mjs switch <demo|real> --approved-by <승인자>   운영 앱 연결 교체(ops/db-targets.json active 변경, 푸시하면 CI가 반영)
//       node scripts/db.mjs ref | url                                     지금 연결된 DB의 ref·주소(CI가 쓴다)
//  - 한 Supabase 계정 토큰(SUPABASE_ACCESS_TOKEN)으로 두 프로젝트를 다룬다. 게이트웨이 토큰 검증값은 Edge 코드에 있어 두 DB가 같은 Worker 토큰을 쓴다.
//  - 운영 DB를 바꾸는 명령(migrate 실제 실행·bootstrap·switch)은 사용자 승인 후 실행한다. 실패하면 멈춘다(DC-HALT).
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
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
