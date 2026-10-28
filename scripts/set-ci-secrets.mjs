// CI 비밀 값 등록: .env 의 값을 읽어 GitHub 저장소 secret 으로 넣는다. cmd·PowerShell·macOS 어디서나 같은 명령.
// 사용: node scripts/set-ci-secrets.mjs   (gh auth login 이 되어 있어야 함)
// 값은 화면에 출력하지 않고 gh 의 표준 입력으로만 넘긴다.
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const names=['SUPABASE_ACCESS_TOKEN','SUPABASE_PROJECT_REF'];
const env=Object.fromEntries(readFileSync('.env','utf8').split(/\r?\n/).map(l=>l.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^(['"])(.*)\1$/,'$2')]));
if(!env.SUPABASE_PROJECT_REF)env.SUPABASE_PROJECT_REF='nhywssfwtnonytbkufyy';
let failed=0;
for(const name of names){
 const value=env[name];if(!value){console.error(`${name}: .env 에 값이 없습니다.`);failed++;continue}
 const r=spawnSync('gh',['secret','set',name],{input:value,stdio:['pipe','inherit','inherit'],shell:process.platform==='win32'});
 if(r.status===0)console.log(`${name}: 등록됨 (길이 ${value.length})`);else{console.error(`${name}: 등록 실패`);failed++}
}
if(failed)process.exitCode=1;else console.log('완료. 이제 실행: gh workflow run supabase-deploy');
