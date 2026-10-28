// 빌드할 때마다 package.json 의 패치 버전을 하나 올린다(0.1.4 → 0.1.5). npm run build 가 먼저 실행한다.
// 올린 package.json 은 빌드 결과와 함께 커밋한다. 건너뛰려면 NO_BUMP=1.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
if(process.env.NO_BUMP==='1'){console.log('버전 올림 건너뜀 (NO_BUMP=1)');process.exit(0)}
const file=resolve(process.cwd(),'package.json'),text=readFileSync(file,'utf8'),pkg=JSON.parse(text);
const m=/^(\d+)\.(\d+)\.(\d+)/.exec(pkg.version||'0.0.0');if(!m){console.error(`버전 형식을 읽을 수 없습니다: ${pkg.version}`);process.exit(1)}
const next=`${m[1]}.${m[2]}.${Number(m[3])+1}`;
// 다른 줄은 건드리지 않고 version 값만 바꾼다(줄바꿈·들여쓰기 유지)
writeFileSync(file,text.replace(/("version"\s*:\s*")[^"]*(")/,`$1${next}$2`));
console.log(`버전 ${pkg.version} → ${next}`);
