// First-time developer setup: `npm run setup`. Safe to re-run; never overwrites an existing .env.
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const pnpmVersion = pkg.packageManager.split('@')[1];
const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const quiet = (cmd) => { try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };
const step = (text) => console.log(`\n▶ ${text}`);
const fail = (text) => { console.error(`\n✖ ${text}`); process.exit(1); };

step('Node.js 버전 확인');
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) fail(`Node.js 22.13 이상이 필요합니다. 현재 ${process.versions.node}. https://nodejs.org 에서 LTS를 설치하세요.`);
console.log(`  Node.js ${process.versions.node}`);

step(`pnpm ${pnpmVersion} 확인`);
if (quiet('pnpm -v') !== pnpmVersion) {
  console.log('  pnpm 설치 중 (npm 전역, 관리자 권한 불필요)');
  run(`npm install -g pnpm@${pnpmVersion}`);
  if (quiet('pnpm -v') !== pnpmVersion) fail(`pnpm 설치 후에도 인식되지 않습니다. 터미널을 새로 열고 다시 실행하세요. npm 전역 경로: ${quiet('npm config get prefix')}`);
}
console.log(`  pnpm ${pnpmVersion}`);

step('패키지 설치');
run('pnpm install');

step('git 훅 연결');
if (existsSync('.git')) { run('git config core.hooksPath .githooks'); console.log('  .githooks 사용 (commit-msg: Co-Authored-By 차단)'); }

step('.env 확인');
if (!existsSync('.env')) {
  copyFileSync('.env.example', '.env');
  console.log('  .env.example → .env 복사');
}
const env = readFileSync('.env', 'utf8');
const pending = ['ZENIFIELD_SUPABASE_URL', 'ZENIFIELD_GATEWAY_TOKEN'].filter((name) => {
  const value = env.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
  return !value || /YOUR_PROJECT_REF|REPLACE_WITH/.test(value);
});
if (pending.length) console.log(`  ⚠ 미설정: ${pending.join(', ')}. 데모 모드는 동작하지만 Supabase 운영 모드는 값이 필요합니다 (프로젝트 관리자에게 받으세요).`);
else console.log('  Supabase 연결 값 설정됨');

console.log('\n✔ 설정 완료. 실행: pnpm dev  →  http://127.0.0.1:5173');
