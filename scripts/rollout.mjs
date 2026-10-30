// 실제 서비스 배치 실행기: ops/production-rollout.json 단계를 순서대로 실행·기록한다. 사람과 에이전트(GPT·Codex·Claude)가 같은 절차를 따른다.
// 사용: node scripts/rollout.mjs list                       단계·상태 보기
//       node scripts/rollout.mjs show <단계>                 이유·명령·확인 기준 보기
//       node scripts/rollout.mjs run <단계> [--approved-by 이름] [--admin 관리자메일] [--name 관리자이름]   자동 단계 실행(승인 단계는 이름 필수)
//       node scripts/rollout.mjs done <단계> [--approved-by 이름]   사람이 한 수동 단계를 끝났다고 기록
//       node scripts/rollout.mjs skip <단계> --approved-by 이름 --reason 이유   해당 없는 단계를 건너뜀으로 기록(예: 새 프로젝트면 purge-demo)
//  - 상태·로그는 git 제외 work/rollout-state.json, work/rollout.log 에 남긴다(비밀값 없음).
//  - 앞 단계(requires)가 끝나지 않았으면 실행하지 않는다. 명령이 실패하면 그 자리에서 멈춘다(DC-HALT).
import {readFileSync,writeFileSync,mkdirSync,existsSync,appendFileSync} from 'node:fs';
import {spawnSync,execSync} from 'node:child_process';
import {supabaseSql} from './lib/supabase-sql.mjs';

const plan=JSON.parse(readFileSync('ops/production-rollout.json','utf8'));
const [cmd,id]=process.argv.slice(2),arg=k=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]||'':''};
const stateFile='work/rollout-state.json';mkdirSync('work',{recursive:true});
const state=existsSync(stateFile)?JSON.parse(readFileSync(stateFile,'utf8')):{};
const save=()=>writeFileSync(stateFile,JSON.stringify(state,null,1));
const log=m=>{const line=`${new Date().toISOString()} ${m}`;appendFileSync('work/rollout.log',line+'\n');console.log(m)};
const stop=m=>{console.error('멈춤: '+m);process.exit(1)};
const step=id&&plan.steps.find(s=>s.id===id);
const TABLES=['zf_domains','zf_users','zf_sites','zf_stores','zf_assignments','zf_policy_versions','zf_visits','zf_actions','zf_audit'];

// 환경 파일(.env)을 읽어 builtin 이 쓴다. 값은 출력하지 않는다.
const env={...process.env};if(existsSync('.env'))for(const l of readFileSync('.env','utf8').split(/\r?\n/)){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m&&!env[m[1]])env[m[1]]=m[2]}
// 프로젝트 ref가 없으면 Supabase 주소(https://<ref>.supabase.co)에서 꺼낸다(다른 스크립트 기본값과 같은 프로젝트)
if(!env.SUPABASE_PROJECT_REF&&env.ZENIFIELD_SUPABASE_URL)env.SUPABASE_PROJECT_REF=(env.ZENIFIELD_SUPABASE_URL.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)||[])[1]||'';
const sql=()=>supabaseSql({ref:env.SUPABASE_PROJECT_REF,token:env.SUPABASE_ACCESS_TOKEN});
const builtin={
 async env(){const need=['SUPABASE_ACCESS_TOKEN','SUPABASE_PROJECT_REF','ZENIFIELD_SUPABASE_URL','ZENIFIELD_GATEWAY_TOKEN'];
  const miss=need.filter(k=>!env[k]||/REPLACE|YOUR_/.test(env[k]));for(const k of need)console.log(`${miss.includes(k)?'✗':'✓'} ${k}`);
  if(miss.length)throw Error('.env 에 없는 값: '+miss.join(', '))},
 async counts(){const q=sql(),rows=await q(TABLES.map(t=>`select '${t}' as t,count(*)::int as n,count(*) filter (where ${t==='zf_users'?"id like 'demo-%'":t==='zf_audit'||t==='zf_assignments'||t==='zf_policy_versions'?'false':"data->>'seed'='demo-seed'"})::int as seed from public.${t}`).join(' union all '));
  for(const r of rows)console.log(`${r.t.padEnd(20)} 전체 ${String(r.n).padStart(7)}  데모 시드 ${r.seed}`);
  const [x]=await q(`select count(*) filter (where id like '%-extra-0%')::int as extra,(select count(*)::int from public.zf_users where email like 'zf.%@zeniel.co.kr') as test from public.zf_visits`);
  console.log(`출처 없는 방문(…-extra-0n) ${x.extra}건 · zf.* 시험 계정 ${x.test}개 (자동 삭제 안 함)`)},
};

const status=s=>state[s.id]?.skipped?'건너뜀':state[s.id]?.done?'완료':s.requires.every(r=>state[r]?.done)?'다음':'대기';
if(!cmd||cmd==='list'){console.log(plan.name+'  (설명: '+plan.doc+')\n');for(const s of plan.steps)console.log(`[${status(s)}] ${s.id.padEnd(18)} ${s.title}${s.approval?' · 승인 필요':''}${s.kind==='manual'?' · 사람이 함':''}`);process.exit(0)}
if(!step)stop(`단계 '${id||''}' 없음. list 로 확인하세요.`);
if(cmd==='show'){console.log(JSON.stringify(step,null,1));process.exit(0)}
const blocked=step.requires.filter(r=>!state[r]?.done);if(blocked.length)stop(`앞 단계가 끝나지 않았습니다: ${blocked.join(', ')}`);
const by=arg('approved-by');if(step.approval&&!by)stop(`'${step.title}'은 승인 단계입니다. 운영 책임자 승인 후 --approved-by <이름>을 붙이세요. 에이전트는 스스로 승인하지 않습니다.`);
if(cmd==='skip'){if(!by||!arg('reason'))stop('건너뛰기는 --approved-by 와 --reason 이 필요합니다.');state[step.id]={done:true,skipped:arg('reason'),at:new Date().toISOString(),by};save();log(`건너뜀 ${step.id} 승인 ${by} 이유 ${arg('reason')}`);process.exit(0)}
if(cmd==='done'){if(step.kind!=='manual')stop('자동 단계는 run 으로 실행합니다.');state[step.id]={done:true,at:new Date().toISOString(),by:by||'-'};save();log(`완료(수동) ${step.id} 승인 ${by||'-'}`);process.exit(0)}
if(cmd!=='run')stop('list | show | run | done | skip');
if(step.kind==='manual'){console.log(`사람이 하는 단계입니다. 아래를 마친 뒤 done ${step.id} 로 기록하세요.\n- `+step.manual.join('\n- '));process.exit(0)}
const sha=execSync('git rev-parse HEAD').toString().trim(),admin=arg('admin'),aname=arg('name');
// db 가 정해진 단계는 그 DB(ops/db-targets.json)로 연결값을 바꿔 넘긴다
const dbt=step.db&&JSON.parse(readFileSync('ops/db-targets.json','utf8')).targets[step.db];if(step.db&&!dbt?.ref)stop(`${step.db} DB ref가 ops/db-targets.json 에 없습니다.`);
const stepEnv=dbt?{...process.env,SUPABASE_PROJECT_REF:dbt.ref,ZENIFIELD_SUPABASE_URL:`https://${dbt.ref}.supabase.co`}:process.env;if(dbt){env.SUPABASE_PROJECT_REF=dbt.ref;console.log(`대상 DB: ${dbt.label} (${dbt.ref})`)}
log(`시작 ${step.id} 승인 ${by||'-'} 커밋 ${sha.slice(0,7)}`);
for(const raw of step.run){
 if(raw.includes('{admin}')&&!admin)stop('--admin <관리자 이메일> 이 필요합니다.');if(raw.includes('{name}')&&!aname)stop('--name <관리자 이름> 이 필요합니다.');
 const c=raw.replace('{admin}',admin).replace('{name}',JSON.stringify(aname)).replace('{by}',JSON.stringify(by)).replace('{sha}',sha);console.log('\n$ '+c);
 if(c.startsWith('builtin:')){try{await builtin[c.slice(8)]()}catch(e){log(`실패 ${step.id}: ${e.message}`);stop(e.message)}continue}
 const r=spawnSync(c,{shell:true,stdio:'inherit',env:stepEnv});if(r.status!==0){log(`실패 ${step.id}: ${c} (종료 ${r.status})`);stop(`명령 실패: ${c}`)}
}
state[step.id]={done:true,at:new Date().toISOString(),by:by||'-',commit:sha.slice(0,7)};save();log(`완료 ${step.id}\n확인 기준: ${step.check}`);
