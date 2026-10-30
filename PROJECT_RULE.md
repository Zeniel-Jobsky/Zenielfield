# Project Rules

## Architecture Boundaries

### Module Ownership
<!-- Define which modules exist and who owns them -->
| Module | Owner | Editable |
|--------|-------|----------|
| `app/` | 화면·API 라우트 (`app/platform` 운영 앱, `app/briefing` 브리핑) | Yes |
| `lib/` | 서버 어댑터 (Cloudflare·Supabase 인증) | Yes |
| `supabase/` | 스키마·이관·Edge 함수. 원격 적용은 승인 후 (DC-INFRA) | Yes |
| `seed/`, `data/` | 데모 주입 파이프라인·원본 데이터 | Yes |
| `scripts/` | 개발·번들·운영 스크립트 | Yes |
| `.github/workflows/` | 검증·운영 배포 파이프라인 | Yes |
| `docs/` | 지침·계획·현황 (DC-DOCS, DC-DESIGN) | Yes |

### Dependency Direction
<!-- Define allowed dependency directions between modules -->

## DC-CODEGEN: Generated File Mapping

> [!IMPORTANT] **REQUIRED**
> Agents use this table to decide which files are safe to edit.
> Files not listed here → agent MUST ask user before editing.

| Generated (DO NOT EDIT) | Source (edit here) | Build command |
|-------------------------|-------------------|---------------|
| `dist/` | `app/`, `lib/`, `worker/` | `npm run build` |
| `dist/server/wrangler.ci.json` | 빌드된 `wrangler.json` + `scripts/prepare-cloudflare-deploy.mjs` | `node scripts/prepare-cloudflare-deploy.mjs` (대상 확인 후 폐기된 `legacy_env=true`만 제거) |
| `supabase/functions/zenifield-gateway/logic.js` | `app/platform/mutations.ts`, `app/platform/model.ts` | `node scripts/bundle-supabase.mjs` |
| `data/hrbiz-demo.json` | HR-biz xlsx(`data/`) + 판정 파일 `data/hrbiz-judgments.json` | `node scripts/import-hrbiz.mjs <xlsx>` (좌표는 기존 JSON에서 이어받음) |
| `data/hrbiz-judgments.json` | 방문 보고 본문 | `node --env-file=.env scripts/judge-reports.mjs` (AI 판정, 이어서 실행 가능) |
| `seed/out/` (git 제외) | `seed/build.ts`, `data/` | `node scripts/seed.mjs build` |
| `__ZF_BUILD__` (푸터 빌드 표기) | `vite.config.ts` `buildInfo()` | 빌드·dev 시 자동 |
| `dist/client/version.json` (새 버전 알림) | `vite.config.ts` `versionFile()` | 빌드 시 자동, dev는 미들웨어 |

## DC-* Guards (project-specific)

| Guard | Condition → Action |
|-------|-------------------|
| DC-DESIGN | UI·디자인 변경 → `docs/DESIGN-zenielfield.md` 해당 절 확인 → 지침에 없거나 다르면 지침 먼저 갱신 → **같은 변경에서 `AGENTS.md` "현재 디자인 결정"과 아래 DC-DESIGN-* 행도 갱신(빠지면 미완료)** → 구현 → 390/820/1280px 실화면 검증 → `docs/` 기록. 대체·폐기된 기준은 `docs/design-history.md`로 옮기고 지침·룰에 남기지 않음 |
| DC-DESIGN-SHELL | 메뉴 = 운영 현황(잡매니저 `내 현장`)·방문 일정·방문 기록·후속 조치·활동 요약·담당·주기 관리·현장 주소록, 설정 = 사이드바 하단 아이콘, 페이지 키 불변. 로고 `BrandIdentity` 188/180/158px. 현재 메뉴 딥그린 채움·점 금지. 데모 = 상단 띠 하나, 운영과 같은 구성. 반응형 ≤760/761–1023/≥1024/≥1440만. 조회 필터 = 범위 버튼 + 기간 하나, 761px 이상 모든 화면 한 줄 |
| DC-DESIGN-VISUAL | 딥그린 `#003c33` 단일 강조, 상태색 완료/예정 `#516e8a`/지연 `#b42318`/미등록 `#8a4b00`, 빨강 = 기한 넘긴 사실만, 옅은 표면 2개만. Pretendard 하나, 글자 ≥11px·축 12px, keep-all. Lucide 14/16/20/24·선 1.75, 터치 44px. 패널 흰색·상단 1px 선. 부제 설명·지표 꼬리·인쇄 버튼·표 제목 건수 금지. 문단은 칸(주제)마다 하나·문장별 줄 나누기 금지, 본문 15px·행간 1.7·`--zf-read-measure`(68ch) |
| DC-DESIGN-ZENIERI | AI 표시 = `AiMark`(`zenieri-chatbot.png`, 24/20/44px) 하나. 문장 = 제니에리 해요체 완결 문장·직함 호칭, 메모체·콜론 나열 금지(AI `briefPrompt`·규칙 `ruleBrief` 모두). 권한 안내는 거부 때만. 지침 9-B |
| DC-DESIGN-BRIEF | 브리핑 = 제목 `제니에리가 정리해서 말씀드려요`·누구 이야기 → 무슨 일(한 문단) → 어디에 무엇이(요약+자세히 보기) → 이렇게 챙겨 보세요(보는 사람 관리 가이드·넘기는 지시 금지·복사) → 더 보기(이행 가이드+복사·전할 말·다음 주·근거·AI 고지). 칸 제목 14px·600+16px 아이콘, 상태 칩 하나+작성 중 가림막. 저장본 키 사용자·직급별·로그아웃 삭제. 지침 9-B |
| DC-DESIGN-DASHBOARD | 잡매니저 = H1 아래 기준 시각 → 독려 말풍선(`ZeniCheer`, 사실·자기 과거 비교) → 브리핑 → 카드·목록, 차트 없음. 관리자 = 브리핑 → 범위·탭 → 지표 4개 → 차트 한 쌍(조직 공백표 + 주별 이행률 꺾은선·축 하나). 누적 막대·이중 축·도넛·게이지·중복 차트 금지, 조직 순위 금지, 차트 제목 = 사실 한 문장. 지침 6.1 |
| DC-DESIGN-SCHEDULE | 방문 일정 기본: 잡매니저 월간 / 파트장 이상 단위×요일 주간. 등록 = `VisitSuggest`(먼저 가 보면 좋은 곳 5곳: 왜·주기·마지막 방문·확인할 것·같은 날 함께, `attentionOf`→`staleStores`, 사전 확인사항 빈칸 채움) → 7일 빈 날 → `schedule.ts` 후보 5개. 사람이 고른 값 우선 |
| DC-DESIGN-RECORDS | 방문 기록 = 표 위 탭 한 줄 단일 선택(전체·먼저 볼 보고·안 끝난 이슈·고객 요청·결과 안 쓴 방문), 기준 `judgment.ts` issueGuide(저장 판정만), 0건 숨김, 줄마다 걸린 이슈. 이슈 종류 묶음·판정 수준 묶음·다단계 필터 금지 |
| DC-DESIGN-FORM | 입력 폼 = 한 열 기본(짧은 짝 칸만 2열), 라벨 위, 선택 칸 `(선택)` 표시. 금지: 안내 박스·준비 중 기능 안내·구역 번호·같은 안내 중복·선택 칸 접기. 새로 만들 때 진행 상태 칸 숨김, 수시 방문은 예정 시간·사전 확인사항 숨김. 혼자 남는 칸은 한 줄 전체. 갱신 2026-10-30 |
| DC-DESIGN-ACTIONS | 후속 조치 맨 위 `action-brief.tsx` = 무슨 일(현황·진척 문단, 지난 2주 비교) → 이렇게 챙겨 보세요(할 일 한 문장+밀린 조치 3건+모두 보기). 차트 금지. 상태 탭 건수·공통 정렬(잡매니저별·초과 일수) |
| DC-DESIGN-DETAIL | 상세·활동 요약: H2 20/18px, 반복 목록 기본 3개+44px 더 보기(aria-expanded/controls), 1px 중립 구분선은 그룹 시작에만, 타임라인 날짜 64px/축 16px/본문, `--zf-detail-*` 토큰. 지침 9.1 |
| DC-DESIGN-CHECK | 커밋 시 `.githooks/pre-commit` → `scripts/check-design.mjs` 경고(지침·룰 동반 갱신, 지침 밖 색). `npm run setup`으로 활성화, `DESIGN_STRICT=1`이면 차단 |
| DC-GIT-IDENTITY | 이 저장소의 새 author/committer = `Zeniel-Jobsky <jobsky@zeniel.co.kr>`, 실제 푸시 인증도 Zeniel-Jobsky·대상 origin(회사 저장소) 확인. 전역 Git 사용자 설정은 유지, 토큰은 OS 자격증명 저장소·본문/.env/커밋에 금지. 사용자 결정2026-10-29: 기존 prodigk 이력 유지·정정 목적 강제 푸시 금지. |
| DC-DOCS | 개선 계획·이슈·완료 내역은 `docs/`에 기록, 담당자 배정은 `work/`에만 |
| DC-DEPLOY | `.github/workflows/supabase-deploy.yml`: main 푸시 → 타입·전체 테스트·Cloudflare 인증 검증 → 백엔드 변경 시 이관·번들·Edge 2개 → Cloudflare Worker. 선행 작업 실패 시 화면 배포 금지. 화면만 변경하면 DB·Edge 생략. 수동 dry_run은 이관 목록만 확인. CI는 `NO_BUMP=1`로 커밋된 버전 빌드, Worker 전용 `CLOUDFLARE_API_TOKEN` 사용, 환경 `production`. 이관 이력 `zf_schema_migrations`, 미적용만 파일별 트랜잭션. 기존 수동 적용분은 `--mark-applied`로 기준선. 적용된 이관 수정 금지, 재실행 안전하게 작성·옛 스키마에 로컬 선적용 검증. `schema.sql` 운영 재실행 금지. 운영 DB·Edge·계정 발급은 사용자 승인 후. 반영 내역 `docs/` 기록 |
| DC-PERF | 화면 파생 계산: 대상·사용자 조회는 Map 색인, 루프 안 전체 배열 재필터·재중복제거 금지, 무거운 파생 데이터 `useMemo`. 메뉴·필터 전환은 `useTransition`+상단 진행 막대. 속도 측정은 개발 서버가 아니라 `NO_BUMP=1 npm run build` 후 `npm run preview:dist`에서 |
| DC-AI-FALLBACK | AI 실패(502·503: 크레딧·키·설정)는 오류로 막지 않고 규칙 결과로 대체 + 이유 표기, 탭당 10분 재호출 안 함(`aiDownReason`). 입력 텍스트는 `collapseRepeats` 후 전송. 테스트 `tests/run-dedupe.mjs` |
| DC-AI-TEXT | AI·규칙 브리핑 문장 강조는 `app/platform/rich.tsx` 조각 트리(`Rich=[{v,tone:'num'|'bad'|'good'}]`, `rich` 태그 템플릿)로 생성 시점에 붙인다. 문장을 정규식으로 재해석해 색칠하지 않는다. AI 응답 스키마도 조각 배열, 화면은 `normalizeBrief`/`toRich`로 검사 후 렌더 |
| DC-AI | AI 흔적 3종: `entry='ai'`+`ai` · `aiEdits[]`(기입력 AI 정리, 서버가 applied 계산·보관, 클라이언트 `aiEdits` 무시, entry 불변) · 현황 요약은 비저장. AI 전송 = 집계 숫자·메모/보고 본문만(브리핑은 기간 안 보고·조치 본문, 담당자 이름 제외·전화·메일 마스킹), 개인정보 금지. 데모는 서버 호출 없이 규칙 결과(`데모 …` 표기) |
| DC-FEEDBACK | 화면·브리핑 문구는 연구 근거(`docs/briefing-research.md`)에 따른다. ① 과업 주어: 주어는 사람이 아니라 현장·과업·조치(Kluger & DeNisi 1996: 자기 초점 피드백은 성과를 떨어뜨림). ② 꼬리표 금지: 제목·칩·문장에 '문제·위험·리스크·위기·심각·미이행·누락·편중·소홀'을 쓰지 않고 할 일·사실로 쓴다(`먼저 확인할 사업장`·`바로 확인`·`조치 필요`·`방문 공백`). ③ 순위 금지: 조직·사람을 이행률 등으로 줄 세우지 않는다(Keasey 외 2000·Bevan & Hood 2006: 순위표는 지표 집착·게이밍). ④ 비교는 자기 과거와만(동료 평균·순위 없음). ⑤ 경보 절제: 빨강은 기한을 넘긴 사실에만, 행동으로 이어지지 않는 경보·칩을 늘리지 않는다(경보 피로 고찰). ⑥ AI 과의존 방지: 판단은 추천 없이 안 ①②를 같은 무게로, 설득형 설명 대신 근거량만 작게(Bansal 외 2021·Buçinca 외 2021). ⑦ 결론 먼저: 상황 → 무슨 일 → 할 일 순, 앞 두 단어에 대상·상태(Endsley 1995). ⑧ 한 화면 한 번: 같은 목록·숫자를 두 곳에 두지 않는다. 갱신 2026-10-29 |
| DC-JUDGMENT | 코드는 판정하지 않는다. 코드는 사실만 계산(필요 회차·완료/지연 수·기한·마지막 방문일·분포·담당 수·배정 기간). `위험`·`주의`·`반복`·`편중`·`누락`·우선순위·담당자 패턴 등 상태를 이름 붙이거나 대상·사람을 순위 매기는 값은 **저장된 AI 종합 판정**(방문 `judgment`, 담당자 패턴 판정)에서만 온다(사람이 확인·수정). 금지: 임계값(1.5배, 50%/70%, 이행률 80% 미만 → 주의 등)·가중 점수·키워드/정규식·결과 칸(`후속 조치 필요`)·빈도로 추정, 규칙으로 판정을 대신 채우는 대체 경로. AI 실패·미판정이면 사실만 보이고 `미판정` 표기. 계획 문서에도 임계값 판정표를 두지 않는다. 갱신 2026-10-29 |
| DC-COMMON | 같은 로직을 두 번 만들지 않는다. 날짜(오늘·더하기·차이·주·달·MM.DD·검사) = `app/lib/date.ts` · 목록 중복 제거·색인 = `app/lib/collections.ts` · CSV = `app/lib/csv.ts` · 대상별 사실·최근 판정·주의 대상·장기 미방문·기한 초과 = `app/platform/status.ts` · 일정 미리 찾기·후보 = `app/platform/schedule.ts` · 상태 이름표 = `app/platform/model.ts` SLOT_LABEL 등 · 조직 단위 묶기 = `decision.tsx` scopeUnits · 판정 형식·유형·가림 = `app/platform/judgment.ts` · AI 호출 = `ai-assist.tsx` callAssist(+aiDownReason) · 스크립트 SQL = `scripts/lib/supabase-sql.mjs` · 운영 필터 배치 CSS = `platform/styles.css` 끝 한 블록 · 일반 UI 아이콘 크기 = `--zf-icon-*`(메시지 장식 SVG는 10-A의44/56px). 새 화면은 이 모듈을 가져다 쓰고, 다른 동작이 필요하면 모듈에 옵션을 더한다. 들어갈 수 없는 화면·경로는 남기지 않는다. 줄바꿈 LF(.gitattributes·.editorconfig). 갱신 2026-10-29 |
| DC-AUTH | 로그인 우선 진입. 회사 계정(`ZENIFIELD_AUTH_PROVIDER=supabase-email`, 등록 이메일+비밀번호) 기본. 계정 공용(모든 서버 공유). 에이전트는 계정·권한을 스스로 만들지 않음. 비밀번호 원문 기록 금지 |
| DC-DEPLOY-TARGET | Cloudflare 운영 대상 `jobsky@zeniel.co.kr`·계정 `d50191f54ac6859d1ecedddf26094351`·Worker `zenifield`·`https://zenifield.jobsky.workers.dev`. `wrangler.cloudflare.json`과 CI `CLOUDFLARE_ACCOUNT_ID` 일치 검사, 토큰은 단일 Worker Editor. 배포 토큰은 GitHub Actions 암호화 Secret에만 보관하고 로컬 `.env`·키체인에 의존하지 않는다. main 푸시 또는 Actions 수동 실행으로 원격 빌드·배포하며 `ci:deploy`·`deploy:cloudflare`는 원격 워크플로만 요청한다. 앱 런타임 비밀값은 Cloudflare Worker Secrets. Supabase 전용·D1/R2 바인딩 금지, 기존 개인 계정 자원 보존. 새/기존 정확한 로그인 콜백만 허용. 공개 커밋·인증 경계 확인. 갱신 2026-10-29 |
| DC-DEPLOY-BASE | 백엔드 변경 비교는 마지막 성공한 main 푸시 워크플로 커밋 기준(수동 dry_run 제외). 직전 푸시만 비교해 실패·취소된 중간 변경을 놓치지 않는다. 성공 기준을 확인하지 못하면 검증을 실패시키고 배포하지 않는다. 기준 커밋이 없으면 백엔드 단계도 실행한다. |
| DC-DATA | 조회는 기간 창(선택 기간+앞 8주+뒤 6주, 미완료 조치 항상). 시드는 출처 표시. 출처 없는 기존 방문 1만 건은 별도 묶음으로 보존(삭제 금지). 데모 기준 = HR-biz 엑셀 |
| DC-LOCAL | 개인 서버 설정은 git 제외 `vite.config.local.mjs`. 공유 설정 파일에 개인 주소·인증서 금지. `.env` 비공유 |
| DC-HALT | Infrastructure error → stop, no bypass, report to user. |
| DC-INFRA | Bootstrap/transport/DB/routing code → separate ticket + approval. |

## Build & Test

| Action | Command |
|--------|---------|
| Build | `npm run build` (먼저 `scripts/bump-version.mjs`가 패치 버전을 1 올림, 올린 `package.json`은 함께 커밋. 건너뛰기 `NO_BUMP=1`) |
| Test | `node tests/run-platform.mjs` · `run-briefing` · `logic` · `run-geo` · `run-seed` · `run-supabase` · `run-cloudflare-auth` · `run-cloudflare-supabase` (`tests/*.mjs`) |
| Design check | `node scripts/check-design.mjs <파일...>` (인자 없으면 스테이징 파일) |
| Type check | `node_modules/.bin/tsc --noEmit -p .` |
| Dev server | `npm start` · `npm stop` · `npm restart` · `npm run status` (기존 포트 프로세스 종료 후 백그라운드 실행, Windows·macOS 공통, 로그 `.dev-server.log`). 직접 실행은 `npm run dev`. 빌드 결과 미리보기는 `npm run preview:dist`. PC별 설정은 git 제외 `vite.config.local.mjs` |
| Accounts (prod) | `node --env-file=.env scripts/provision-accounts.mjs [--dry-run]` 권한별 zf.*@zeniel.co.kr 11개, 비밀번호 → `work/accounts.local.csv`(git 제외). 사용자 승인 후 |
| Migrate (prod) | `node --env-file=.env scripts/migrate.mjs [--dry-run] [--mark-applied a.sql,b.sql]` · CI: Actions `supabase-deploy` |
| Lint | `npx deuk-agent-flow lint:md` |

## Rules (id-based)

deuk-agent-flow 티켓이 참조하는 룰 id다. 상세 지시문은 위 DC-* 표가 정본이며 여기는 포인터만 둔다.

- [DR-01] @start 승인된 티켓 범위 안에서 작업한다.
- [DR-02] @modify 생성 파일은 직접 고치지 말고 소스를 고쳐 빌드로 갱신한다.
- [DR-03] @create,modify 같은 개념·식별자·분기 기준을 두 곳에 쓰지 마라. 이미 정의된 곳이 있으면 그것을 쓴다.
- [DR-04] @start,create,modify 손대기 전에 이 작업의 설계 정본을 확인한다. 어긋나면 멈추고 승인받아 정본을 먼저 고친다.
- [DC-HALT] @modify 인프라 에러는 멈추고 사용자에게 보고한다.
- [DC-INFRA] @modify 인프라 코드는 티켓 스코프에 명시된 경우만 고친다.
- [DC-JUDGMENT] @modify 코드는 사실만 계산하고 판정은 저장된 AI 종합 판정에서만(위 표).
- [DC-FEEDBACK] @create,modify 화면·브리핑 문구는 docs/briefing-research.md 근거를 따른다(위 표).
- [DC-COMMON] @create,modify 공통 로직은 정해진 한 모듈만 쓴다(위 표).
- [DC-DEPLOY] @modify main 푸시가 CI 배포를 실행하며 운영 DB·Edge·계정은 승인 후(위 표).
- [DC-DESIGN] @create,modify UI 변경은 지침·AGENTS.md·이 파일을 같은 변경에서 갱신하고 390/820/1280 확인(위 표).
- [DC-AI] @modify AI 전송은 집계·본문만, 개인정보 금지(위 표).
- [DC-AUTH] @modify 로그인 우선·계정 공용·비밀번호 기록 금지(위 표).
- [DC-DOCS] @create,modify 계획·이슈·완료 내역은 docs/에(위 표).
