// 데모 주입 파이프라인 CLI. 앱 배포·마이그레이션과 별개로 실행한다.
//   node scripts/seed.mjs build              → seed/out/seed.json, seed.sql, purge.sql
//   node --env-file=.env scripts/seed.mjs apply   → purge + seed 를 한 트랜잭션으로 원격 적용
//   node --env-file=.env scripts/seed.mjs purge   → 데모 행만 삭제
import fs from 'node:fs';
import esbuild from '../node_modules/.pnpm/esbuild@0.28.0/node_modules/esbuild/lib/main.js';
const [cmd='build']=process.argv.slice(2),out='seed/out',ref='nhywssfwtnonytbkufyy';
const bundle=await esbuild.build({entryPoints:['seed/build.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const now=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());
const base=fs.existsSync('data/hrbiz-demo.json')?JSON.parse(fs.readFileSync('data/hrbiz-demo.json','utf8')):null;if(base)base.audit=[];
const data=m.buildSeed(now,m.parseCsv(fs.readFileSync('data/zeniel-branches-geo.csv','utf8')),m.parseCsv(fs.readFileSync('data/zeniel-stores-candidates-geo.csv','utf8')),base);
fs.mkdirSync(out,{recursive:true});const seed=m.seedSql(data),purge=m.purgeSql();
fs.writeFileSync(out+'/seed.json',JSON.stringify(data));fs.writeFileSync(out+'/seed.sql',seed);fs.writeFileSync(out+'/purge.sql',purge);
console.log(`${base?'HR-biz 가상 DB('+base.importedAt+')':'가상 생성기'} · 기준일 ${now} · 사용자 ${data.users.length} · 현장 ${data.sites.length} · 매장 ${data.stores.length} · 방문 ${data.visits.length} · 조치 ${data.actions.length} → ${out}/`);
if(cmd==='build')process.exit(0);
const token=process.env.SUPABASE_ACCESS_TOKEN;if(!token){console.error('SUPABASE_ACCESS_TOKEN 필요');process.exit(1)}
const query=cmd==='purge'?`begin;\n${purge}\ncommit;`:cmd==='apply'?`begin;\n${purge}\n${seed}\ncommit;`:null;if(!query){console.error('build | apply | purge');process.exit(1)}
const r=await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({query})});
console.log(r.status,(await r.text()).slice(0,500));process.exit(r.ok?0:1);
