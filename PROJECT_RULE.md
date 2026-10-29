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

DC-DESIGN: 모든 후속 조치 상태 탭에 공통 정렬 선택 적용. 담당자는 현재 탭 건수 내림차순. 초과 일수는 미완료 오늘 기준·완료 완료일 기준, 기한 내 또는 완료일 미상은 0일. 공통 날짜 함수·정렬 함수를 재사용하고 권한·필터 보존.

운영 현황·방문 기록 필터는 태블릿·데스크톱에서 조직 필터 다음 줄에 최신 기간 선택·초기화를 왼쪽 정렬한다. 기간 팝오버·모바일 접이식 범위 선택은 유지한다(DC-DESIGN).

| Guard | Condition → Action |
|-------|-------------------|
| DC-DESIGN | UI·디자인 변경 → `docs/DESIGN-zenielfield.md` 해당 절 확인 → 지침에 없거나 다르면 지침 먼저 갱신 → **같은 변경에서 `AGENTS.md` "현재 디자인 결정"과 이 항목도 갱신(빠지면 미완료)** → 구현 → 390/820/1280px 실화면 검증 → `docs/` 기록 |
| DC-DESIGN-LOGO | 공통 `BrandIdentity` → `public/brand/zenifield_logo.png`(376×138 투명 PNG, 업데이트 워드마크·설명). 로그인188px/사이드바180px/모바일 메뉴158px·높이auto, 원본 비율·색 보존·접힌 메뉴ZF 유지. 중복 조직 안내 카드·워크스페이스 소제목 제거, 로고→주 메뉴24px·항목46px/모바일48px·간격4px·좌측 정렬 유지. 갱신2026-10-29 |
| DC-DESIGN-DASHBOARD | 운영 현황 H2 18px(모바일 17px)·600·1.4, 그룹 간 32px(모바일 24px), 차트 열 24px·행 32px(모바일 24px), 제목→내용 16px(모바일 12px)·구조선→제목 20px(모바일 16px). 흰 표면·상단 1px 선·왼쪽 정렬, 긴 제목·도구 줄바꿈. `app/zeniel.css` 공통 토큰 + `.dashboard-content` 범위. 지침 4절·6.1-A, 갱신 2026-10-28 |
| DC-DESIGN-NOW | 메뉴 이름·순서 = 운영 현황·현장·매장 관리·방문 일정·방문 기록·후속 조치·주차별 활동 요약·통계·보고서·설정(후속 조치가 브리핑 위, 페이지 키 불변) · 사이드바 현재 메뉴 = 딥그린 채움만, 점 표식 금지(빨간 점은 알림 종 전용) · 딥그린 `#003c33` 단일 강조(이행률만) · 현장·매장 탭 하단선→지표 셀 간격 PC·태블릿 16px/모바일 12px, 셀은 상단 1px 구조선·왼쪽 컬러 테두리 없음 · 모바일 데모·운영 전환 문구 줄바꿈 허용 · 상태색 완료 `#003c33`/예정 `#516e8a`/지연 `#b42318`/미등록 `#8a4b00` · 도넛·게이지 금지(예외: 현장 운영 상태 원그래프) · 조직 막대 딥그린 단색 · 목표선은 설정된 목표만 · 축·범례 12px · 대시보드 = 조회 범위·탭→핵심 지표 4→차트 6(둘씩 세 줄)→우선 확인 현장(진단 간략형, 지표 칩은 브리핑 화면에만)→주간 업무 요약(방문 우선 확인 표 삭제·한 화면 한 번, 지침 6.1-A) · 반응형 단계 고정 ≤760/761–1023/≥1024/≥1440만(필터 한 줄만 ≥1280) · 모바일 제목 26px/메타 11px 이상/터치 44px · 옅은 표면은 `--zf-warning-soft #fdf4e7`·`--zf-info-soft #eef2f6`만 · 글자 하한 11px(축·범례 12px) · 화면 파일 전체 색 점검 통과 상태 유지 · 잡매니저 홈 = 오늘 업무(기록 버튼)→지표→AI 요약→주간→차트→진단→브리핑 · AI 핵심 요약(지표 아래, 버튼 없이 자동: 지문 같으면 재사용/다르면 재작성/없으면 작성, 기본 요약·첫 제안→보고 내용 더 보기(현장별 접힘·선은 현장 사이만) / 브리핑 자세히 보기(흐름·성과·챙길 곳·추가 판단·근거), 요소 선택은 설정 화면) · AI로 정리하기(결과 화면 `특이사항` 바로 아래 버튼 한 줄, 안내는 회색·실패만 빨강, 바뀌는 칸만 현재/제안 체크, 저장 시 aiEdits) · 푸터 빌드 표기 · 데모 표시는 상단 배너 한 줄+역할 선택만, 중간 반복·운영 화면 데모 전환 금지 · 등록 화면 AI 기본·전환 링크 아이콘+간격·계획 자동 연결 ±14일·판독 못한 부분은 `읽지 못한 항목` 블록(칸·내용·위치·후보 칩·직접 입력·넘기기, 본문에는 읽은 것만, 중첩 form 금지)·AI 정리 제안마다 복사 아이콘(`CopyButton` 44px·체크 불변)·회의록 양식 아이콘(주제·현장·참석 인원·일시·논의·추가 사항) → 회의록이면 빈 대상(이름 하나 일치)·방문일·시각만 채움·사람 선택 우선·참석자 이름 비저장·저장 구조 불변 · 독려 안내(지침 10-A: 저장 직후 시트 안·대시보드 지표 아래 띠, 업무 아이콘44/56px(완료 문서/일정 달력·화살표/확인 현장·경고, 64캔버스·2.5 라운드 선·중립/딥그린/selected, 위험만danger)·평문 제목 한 줄·아래 전체 폭, 얼굴·몸짓·외부장식·말풍선 제거, 아이콘 정적·숫자 +n/막대만 한 번 재생·reduced-motion 정지, 역할 4단계, 내용은 status.ts 사실+저장 판정만, 큰 숫자 칸(누르면 목록·0이면 숨김)→하위 단위 칩(누르면 범위)→다음 방문+일정 잡기, 채우기 문장 금지) · 역할별 필터(기본 본인 범위 선택 상태·드러내지 않음, 현재 범위 버튼 누름·터치 때만 바꿀 수 있는 단계 펼침, 선택지 1개 단계 숨김, 중복 표기 금지, 지침 7절) · 조회 기간 [◀ 이름 ▶](화살표=단위 이동, 가운데=빠른 선택+직접 선택, 모바일 하단 시트, 배치 규칙 한 블록) · 일정 미리 찾기·후보(사실 한 줄+후보 5개 날짜순·꼬리표, 누르면 바로 채움, schedule.ts) · 일정 잡기 전 7일 칩(n건/비어 있음, 누르면 AI 입력에 날짜, 초안은 빈칸만·사람이 고른 값 우선, 외부 캘린더 연동 없음) · 일반 UI 아이콘 4단계 14/16/20/24(토큰, 선 1.75; 메시지 장식 SVG는10-A) · 검색 자동완성(담당자·현장·매장 8개·초성·고르면 필터) · 갱신 2026-10-29 · 주차별 업무 기록 = AI 브리핑 + 현장별 방문 목록만(흐름·조회·요약 카드·조치 반복 없음) · 사용자 메뉴(오른쪽 위 아바타: 새로고침·설정·로그아웃/로그인, 운영 띠 없음·데모 띠 안내만) · AI 브리핑 맨 위(상황 판단→무슨 일이 벌어지고 있나→챙길 곳→지시 가이드(부서+개인)→이행 가이드, 세부는 펼쳐서, 문장에 집계 숫자 없음, 해요체, 생성 단계 표시) · AI 관여 요소 전부 AiMark 반짝이(지침 9-B) · 판정 화면 이름 정상·지켜보기·조치 필요·바로 확인(저장값 불변)·위험/리스크 문구 금지·조직 표 순위 없음·빨강은 기한 넘긴 사실에만(지침 9-B) |
| DC-DESIGN-AI-BRIEF | 기본 상태·요약20/18px·첫 제안17/16px, 보고 내용과 추가 판단은 가벼운 흰 보조 버튼으로 점진 공개. 현장별 더 보기 기본 접힘·구분선은 현장 사이만·세부 선 금지·공통 근거 명시. 44px·aria-expanded/controls·포커스 유지·조건 변경 시 접기, 실패·규칙 대체·확신 낮음 상시 표시. 주차별 동일, 생성·집계 불변. 지침 6.1-A, 갱신 2026-10-28 |
| DC-DESIGN-CHART-GRID | 대시보드 차트 6개는 모든 행 6+6 균등 2열. `.dashboard-chart-grid` 아래 `.dashboard-chart-pair`의 subgrid로 제목·설명/범례/본문 공유·상하단 정렬. 자동 높이·고정 높이/내부 세로 스크롤 금지, 열24px·쌍32px. 태블릿·모바일 1열·내용 높이·32/24px, 잡매니저 비교 쌍도 동일. 추이 SVG 실제 축·수치12px·최대560px. 데이터·상태색·원본 이동 유지, 차트 항상 펼침·접기 아이콘 없음. 표현(2026-10-29 시안): 트랙 위 막대+옆 값, 조직 공백표 열별 의미색·행 구분선, 경과 막대 위 값·트랙 없음, 추이 누적 막대+조각별 건수+격자+회차/% 이중 축(이 차트만)+이행률 상자(모바일은 합계만 숨김), 이슈 유형 행별 100%·1건 최소 칸·이름 두 줄, 통계·보고서 차트 동일. 지침 6.1-A, 갱신 2026-10-29 |
| DC-DESIGN-STATUS-RATIO | 현장/매장 운영 상태 = 운영 중 해당 유형 전체 대상이100%인 원그래프(2026-10-29 사용자 요청, 막대에서 변경). 조각 상태 수/전체 수 원비율, 숫자만 정수 반올림. 건수(개)·비율(%)을 조각·목록에 표기, 0개는 경계 선+`0개 0%`, 이력 미확인 빗금/예정 파랑/필요 방문 없음 옅은 회색·12px 글자. 전체0은 빈 안내. 모든 ChartPanel 접기 제거·상시 표시, 기존 분류·범위·원본 이동 보존. 지침6.5, 갱신2026-10-29 |
| DC-DESIGN-CHECK | 커밋 시 `.githooks/pre-commit` → `scripts/check-design.mjs` 경고(지침·룰 동반 갱신, 지침 밖 색). `npm run setup`으로 활성화, `DESIGN_STRICT=1`이면 차단 |
| DC-DESIGN-DETAIL | 상세페이지·주차별 활동: H2 20/18px·600, 주차18/17px·소제목16px, 그룹32/24px·제목→내용16px. 반복 목록/주차 기본3개+44px 더보기/접기·aria-expanded/controls, 기록 본문 개별 접힘·조건 변경 초기화. 대그룹·상세 그룹 시작 1px 중립선+선→제목24/20px·주차 경계선 유지, 항목별 반복선 금지. 주요정보 진한색·메타12px 이상, 제목/본문/버튼 좌측정렬·아이콘 고정 칸·가변텍스트 minmax(0,1fr). 타임라인 날짜64px/연결축16px/가변본문·열16px/항목24px, 1px 세로선+딥그린 지점·마지막 아래 선 없음, 본문 현장·방문자/목적 2열+오른쪽 펼침 버튼(태블릿 현장 위/목적·버튼 아래 한 줄·모바일 날짜 위), 활동 내용 버튼 열128px 고정·표면36px/조작44px·펼침 전후 목적/버튼 배치 고정. 반복 가로선/항목 고정높이 금지. `--zf-detail-*` 공통 토큰, 지침9.1, 390/820/1280 및200% 확인, 집계·권한·원본이동 보존. 갱신2026-10-29 |
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
- [DR-02] @modify 생성 파일은 직접 고치지 말고 소스를 고쳐 빌드로 갱신한다(DC-CODEGEN 표).
- [DR-03] @create,modify 같은 개념·식별자·분기 기준을 두 곳에 쓰지 않는다(DC-COMMON).
- [DR-04] @start,create,modify 손대기 전에 설계 정본을 확인하고 어긋나면 멈춰 정본을 먼저 고친다.
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
