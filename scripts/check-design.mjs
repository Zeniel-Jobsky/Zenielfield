// 디자인 지침 점검(경고). 사용: node scripts/check-design.mjs [파일...]  · 인자가 없으면 스테이징된 파일을 본다.
// 1) 화면·스타일을 바꿨는데 지침·룰(AGENTS.md, PROJECT_RULE.md, docs/DESIGN-zenielfield.md)이 같이 바뀌지 않았으면 경고
// 2) 바뀐 화면·스타일 파일에서 디자인 지침 토큰 밖의 색 코드를 경고
// DESIGN_STRICT=1 이면 경고를 실패로 처리한다.
import fs from 'node:fs';
import {execSync} from 'node:child_process';
const args=process.argv.slice(2);
const files=args.length?args:execSync('git diff --cached --name-only --diff-filter=ACM',{encoding:'utf8'}).split('\n').filter(Boolean);
const ui=files.filter(f=>/^(app|components)\/.*\.(tsx|css)$/.test(f));
const rules=['AGENTS.md','PROJECT_RULE.md','docs/DESIGN-zenielfield.md'];
const warnings=[];
if(ui.length&&!args.length){const missing=rules.filter(r=>!files.includes(r));if(missing.length)warnings.push(`화면·스타일 ${ui.length}개를 바꿨는데 다음 문서가 함께 바뀌지 않았습니다: ${missing.join(', ')}\n  → 디자인 변경이면 AGENTS.md "현재 디자인 결정"·PROJECT_RULE.md DC-DESIGN·디자인 지침을 같이 갱신하세요.`)}
// 지침 3절·6.3절·13절 토큰 값
const allowed=new Set(['#003c33','#075447','#002c25','#edf6f1','#ffffff','#fff','#f8faf9','#f1f6f3','#d3e9df','#17171c','#36443e','#59645f','#65726b','#e3e9e6','#cfd9d3','#8a9f93','#65756c','#4c6ee6','#b42318','#8a4b00','#166534','#fff0ed','#a62519','#fef3f2','#516e8a','#826345','#009c64','#ff7759','#000','#000000']);
const tokenFile=fs.existsSync('app/zeniel.css')?fs.readFileSync('app/zeniel.css','utf8'):'';
for(const m of tokenFile.matchAll(/--zf-[a-z0-9-]+:\s*(#[0-9a-fA-F]{3,8})/g))allowed.add(m[1].toLowerCase());
for(const f of ui){if(!fs.existsSync(f))continue;const lines=fs.readFileSync(f,'utf8').split('\n');const bad=new Map();
 lines.forEach((l,i)=>{for(const m of l.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)){const c=m[0].toLowerCase();if(!allowed.has(c)){if(!bad.has(c))bad.set(c,[]);bad.get(c).push(i+1)}}});
 if(bad.size)warnings.push(`${f}: 지침 밖 색 ${bad.size}종 — `+[...bad].slice(0,8).map(([c,ls])=>`${c}(${ls.slice(0,3).join(',')}${ls.length>3?'…':''})`).join(' ')+(bad.size>8?` 외 ${bad.size-8}종`:''))}
if(!warnings.length){if(ui.length)console.log('디자인 점검: 이상 없음');process.exit(0)}
console.warn('⚠ 디자인 점검 (docs/DESIGN-zenielfield.md · AGENTS.md "디자인 개선 절차")');for(const w of warnings)console.warn('- '+w);
if(process.env.DESIGN_STRICT==='1'){console.warn('DESIGN_STRICT=1: 커밋을 중단합니다.');process.exit(1)}
console.warn('경고만 표시하고 계속합니다. 막으려면 DESIGN_STRICT=1');
