// 기존 Vite 빌드 산출물을 Worker 전용 토큰 지원 CLI에 전달한다.
// legacy_env=true는 새 Wrangler의 기본 동작과 같아 이 폐기된 필드만 제거한다.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const built = resolve('dist/server/wrangler.json');
const config = JSON.parse(readFileSync(built, 'utf8'));
const target = JSON.parse(readFileSync(resolve('wrangler.cloudflare.json'), 'utf8'));
if (config.name !== target.name || config.account_id !== target.account_id) {
  throw new Error('Cloudflare 대상 빌드를 먼저 실행하세요. 배포 대상이 일치하지 않습니다.');
}
if (config.legacy_env === false) {
  throw new Error('기존 Service environment 설정은 자동 변환할 수 없습니다.');
}
delete config.legacy_env;
writeFileSync(resolve('dist/server/wrangler.ci.json'), JSON.stringify(config, null, 2) + '\n');
console.log(`Prepared CI deployment config for ${config.name}`);
