# ZeniField · 현장·매장 운영관리

**현장 방문 보고를 AI 비서 '제니에리'가 읽고, 직급마다 "지금 어디에 무슨 일이 있고, 나는 무엇을 하면 되는지"를 말해 주는 현장 운영 앱입니다.**

방문 일정 → 방문·조치(기록과 후속 조치 한 화면) → 활동 요약이 한 흐름으로 이어지고, 각 화면 맨 위에서 제니에리가 그 화면의 할 일을 먼저 정리합니다.

## 핵심 강점 한눈에

| 강점 | 사업 측면 (무엇이 좋아지나) | 기술 측면 (어떻게 구현했나) |
| --- | --- | --- |
| **보고를 읽는 AI 브리핑** | 관리자가 수백 건 보고를 읽지 않아도 "무슨 일 → 어디에 → 내가 할 일"을 1분 안에 파악 | 보고 본문·저장된 판정·문제 지도를 AI(`/api/assist` brief 모드)에 보내 칸 구조(`brief-shape.ts`)로 받음. 집계 숫자는 보내지 않고 방향만 전달, AI 실패 시 같은 칸의 규칙 브리핑으로 대체 |
| **직급별로 다른 말** | 잡매니저는 다음 방문, 파트장은 잡매니저 지원, 팀장·사업부장은 조직 단위 판단 — 같은 데이터로 각자 할 일만 | 다이제스트에 `role`(manager·partlead·lead·director)과 보는 범위(`scopeUnits`)를 실어 초점·호칭·받는 사람을 바꿈. 저장본은 사용자·직급별 키 |
| **입력 순간의 AI 종합 판정** | 보고마다 "정상·지켜보기·조치 필요·바로 확인"이 입력자 확인을 거쳐 남아, 감이 아닌 기록으로 우선순위를 정함 | 저장 시 대상 타임라인(이전 보고·조치·기한)으로 판정 → 사람이 확인·수정 → `judgment` 저장. 코드는 판정하지 않음(임계값·키워드 금지, DC-JUDGMENT) |
| **말·사진·손글씨로 기록** | 현장에서 말하거나 회의록을 찍으면 방문 결과·일정 초안이 채워져 기록 누락이 줄어듦 | AI 간편 등록(음성·이미지), 읽지 못한 항목은 따로 표시, 회의록 양식 인식(참석자 이름은 저장 안 함), 반복 말 정리(`collapseRepeats`) |
| **다음 방문 추천** | 일정을 잡을 때 "먼저 가 볼 곳"과 확인할 것·같은 날 함께 갈 곳을 바로 제안 | `status.ts` 사실(기한 지난 회차·기한 넘긴 조치·60일+ 미방문)과 저장 판정만으로 추천, 후보 날짜는 `schedule.ts`. 점수·순위 없음 |
| **화면마다 제니에리 가이드** | 후속 조치·방문 기록에서 밀린 일과 먼저 볼 보고를 바로 걸러 실행으로 연결 | 후속 조치 정리(`action-brief.tsx`), 방문 기록 이슈 가이드 탭(`judgment.ts` issueGuide), 잡매니저 독려 말풍선 — 모두 AI 호출 없이 사실로 즉시 표시 |
| **현장 친화적 표현** | 순위·낙인 대신 할 일과 자기 과거 비교로 말해 현장 반발 없이 실행률을 올림 | 문구 기준 DC-FEEDBACK(과업 주어·꼬리표 금지·순위 금지·빨강은 기한 넘김만), 연구 근거 `docs/briefing-research.md` |
| **운영 안정성** | 여러 사람이 쓰는 운영 DB를 안전하게 바꾸고, 데모로 실데이터 없이 시연 | Supabase 게이트웨이(Edge 검증)·등록 사용자 인증, main 푸시 → 검증 → 이관 → Edge → Cloudflare Worker 자동 배포, 데모 모드는 저장 없음 |

## 초기 버전 대비 바뀐 것 (2026-10-27 → 2026-10-30)

| 초기 | 지금 |
| --- | --- |
| 주차별 활동 요약 = 원문 발췌 목록 | 제니에리 브리핑: 무슨 일 → 어디에 무엇이 → 이렇게 챙겨 보세요(보는 사람의 관리 가이드) |
| 화면이 키워드·임계값으로 문제를 추정 | 입력 때 AI 종합 판정을 사람이 확인해 저장, 화면은 저장된 판정만 사용 |
| 직접 입력 폼 | AI 간편 등록(말·사진·회의록) + 직접 입력, 문장 정리 제안 |
| 일정은 빈칸에서 시작 | 먼저 가 볼 곳 5곳 추천 + 빈 날 + 후보 날짜 |
| 차트 다수·통계 보고서 메뉴 | 차트 한 쌍(조직 공백표·이행률 꺾은선), 통계·보고서 메뉴 통합, 중복 숫자 제거 |
| 같은 화면을 모든 직급이 공유 | 직급별 브리핑·범위·잡매니저 `내 현장` 홈 |
| 로컬·D1 중심 | 운영 Supabase + Cloudflare Worker 자동 배포 파이프라인 |

현장과 매장은 독립 방문 대상이고, 예정일이 지나도 자동 완료되지 않습니다. 회차 이행률과 실제 방문 건수는 구분합니다.

2026-10-30 기준 main 소스로 정리했어요. 실제 운영 로그인·외부 AI 응답은 이 문서 작성 때 다시 확인하지 않았어요.

## 화면 둘러보기 (데모, PC 1280px · 모바일 390px)

모든 직급이 같은 메뉴·같은 구성을 보고, 내용 범위만 직급에 따라 달라요. 화면마다 맨 위에서 제니에리가 그 화면의 할 일을 먼저 정리해요.

| 메뉴 | 무엇을 하나 | PC | 모바일 |
| --- | --- | --- | --- |
| **운영 현황** | 제니에리 말풍선(오늘·이번 주·챙길 것) → 브리핑(무슨 일 → 어디에 무엇이 → 이렇게 챙겨 보세요: 바로 하기·보낼 말) → 지표·차트 | <img src="docs/screenshots/dashboard-pc.jpg" width="360" alt="운영 현황 PC 화면"> | <img src="docs/screenshots/dashboard-mobile.jpg" width="130" alt="운영 현황 모바일 화면"> |
| **방문 일정** | 제니에리 정리(이번 주 일정·일정 잡을 회차) → 먼저 일정 잡을 곳·`일정 잡기` | <img src="docs/screenshots/visits-pc.jpg" width="360" alt="방문 일정 PC 화면"> | <img src="docs/screenshots/visits-mobile.jpg" width="130" alt="방문 일정 모바일 화면"> |
| **방문 일정 등록** | 제니에리가 먼저 가 볼 곳 5곳을 고름(왜·주기·확인할 것·같은 날 함께) → 날짜 후보 | <img src="docs/screenshots/plan-form-pc.jpg" width="360" alt="방문 일정 등록 PC 화면"> | <img src="docs/screenshots/plan-form-mobile.jpg" width="130" alt="방문 일정 등록 모바일 화면"> |
| **방문·조치** | 방문 기록과 후속 조치를 한 화면에서: 결과 안 쓴 방문·기한 넘긴 조치 정리 → 탭(방문 │ 조치) → 방문 아래 그 방문의 조치 | <img src="docs/screenshots/visit-action-pc.jpg" width="360" alt="방문·조치 PC 화면"> | <img src="docs/screenshots/visit-action-mobile.jpg" width="130" alt="방문·조치 모바일 화면"> |
| **활동 요약** | 기간 브리핑 + 날짜별 방문 타임라인 | <img src="docs/screenshots/activity-pc.jpg" width="360" alt="활동 요약 PC 화면"> | <img src="docs/screenshots/activity-mobile.jpg" width="130" alt="활동 요약 모바일 화면"> |
| **담당·주기 관리** | 제니에리 정리(담당 없는 곳·60일+ 미방문) → 담당 정하기·일정 잡기 | <img src="docs/screenshots/sites-pc.jpg" width="360" alt="담당·주기 관리 PC 화면"> | <img src="docs/screenshots/sites-mobile.jpg" width="130" alt="담당·주기 관리 모바일 화면"> |
| **현장 주소록** | 주소·담당 검색, 비어 있는 주소 안내 | <img src="docs/screenshots/contacts-pc.jpg" width="360" alt="현장 주소록 PC 화면"> | <img src="docs/screenshots/contacts-mobile.jpg" width="130" alt="현장 주소록 모바일 화면"> |

## 목차

- [핵심 강점 한눈에](#핵심-강점-한눈에)
- [화면 둘러보기](#화면-둘러보기-데모-pc-1280px--모바일-390px)
- [초기 버전 대비 바뀐 것](#초기-버전-대비-바뀐-것-2026-10-27--2026-10-30)
- [프로젝트 소개 및 현재 구현 현황](#프로젝트-소개-및-현재-구현-현황)
- [개발 환경 및 필수 설치 프로그램](#개발-환경-및-필수-설치-프로그램)
- [로컬 설치 및 실행](#로컬-설치-및-실행)
- [사용자 가이드](#사용자-가이드)
- [개발자 가이드 및 프로젝트 구조](#개발자-가이드-및-프로젝트-구조)
- [환경변수 및 설정](#환경변수-및-설정)
- [테스트 및 문제 해결](#테스트-및-문제-해결)
- [관련 문서 인덱스](#관련-문서-인덱스)
- [확인이 필요한 문서](#확인이-필요한-문서)
- [과거 README 기록](#과거-readme-기록)

처음 실행할 때는 [로컬 개발 가이드](docs/local-development.md), 업무 사용법은 [메뉴별 사용자 가이드](docs/user-guide.md), 관리자 업무는 [관리자 가이드](docs/admin-guide.md), 현황은 [기능 현황](docs/feature-status.md), 오래된 내용은 [문서 점검 보고서](docs/documentation-audit-2026-10-29.md)를 확인하세요.

## 프로젝트 소개 및 현재 구현 현황

| 구분 | 소스에서 확인한 내용 |
| --- | --- |
| 운영 | 등록 사용자 인증·Supabase 서버 게이트웨이·권한·현장/매장·방문·후속 조치 저장 경로 |
| 데모 | 가상 데이터로 화면·입력을 체험. 메모리 변경은 새로고침 시 초기화, 운영 DB 자동 복사 없음 |
| 분석 | 회차 실적·조직 공백표·이행률 추이·제니에리 브리핑·저장된 방문 종합 판정 |
| 입력 | AI 초안·문장 정리·판정 검토·직접 입력·연결 조치. 외부 서비스와 설정 의존 |
| 현재 중지 | GPS 자동 선택·위치 기록·주소/매장 검색 UI. GPS_ENABLED/GEO_SEARCH_ENABLED=false, Kakao 키 미사용 |
| 제거된 경로 | 기존 D1 화면·API·DB/Drizzle 파일은 최신 소스에서 제거됨. 실제 기존 자료의 이관 여부는 별도 확인 |
| 내보내기·후속 | CSV·화면 인쇄 경로 있음. 정식 XLSX·첨부 원본 보관·업무 알림·그룹웨어 등은 후속 범위 |

현장과 매장은 독립 방문 대상입니다. 본사 방문으로 모든 매장이 완료되지 않고 예정일 경과로 자동 완료되지 않습니다. 회차 이행률과 실제 방문 건수는 구분합니다. 주간 활동은 실제 완료 방문을 한국시간 월–일로 집계합니다.

## 개발 환경 및 필수 설치 프로그램

Node.js **22.13.0 이상**(npm 포함), pnpm **11.25.0**, Git, 브라우저가 필요합니다. Git·브라우저의 버전 하한은 저장소에서 정하지 않았습니다. 에디터는 자유롭게 선택합니다. 일반 로컬 데모에는 배포 계정이나 Supabase CLI가 필요하지 않습니다.

React 19·Next.js 16 API 구조를 Vinext/Vite·Cloudflare Workers로 실행합니다. 정확한 의존성은 [package.json](package.json)과 [pnpm 잠금 파일](pnpm-lock.yaml)을 따릅니다.

## 로컬 설치 및 실행

저장소 최상위 폴더에서 실행합니다.

```bash
npm run setup
pnpm dev
```

setup은 Node 검사·고정 pnpm 설치·의존성 설치·공유 Git 훅 연결·환경 예시 복사를 수행합니다. 기존 .env는 덮어쓰지 않습니다. 일반 portable 프로필은 http://127.0.0.1:5173, 데모는 같은 주소의 /?mode=demo 또는 로그인 화면 ‘로그인 없이 체험하기’에서 엽니다. 직접 실행 종료는 Ctrl+C입니다.

백그라운드 개발 서버는 npm start / npm stop / npm restart / npm run status로 관리합니다. 기존 포트 프로세스를 종료할 수 있으므로 [상세 가이드](docs/local-development.md)를 먼저 읽으세요. 로컬 서버도 설정에 따라 공용 자원에 연결되며 데모 선택이 서버 전체 격리를 뜻하지 않습니다. 새 PC 설치는 이번에 시험하지 않았습니다.

## 사용자 가이드

[app/platform/app.tsx](app/platform/app.tsx)의 기본 메뉴 이름·순서를 따릅니다. 메뉴는 앱 내부 상태로 이동하며 독립 URL이 아닐 수 있습니다.

| 메뉴 | 업무와 사용법 |
| --- | --- |
| 로그인·공통 도구 | [시작하기](docs/user-guide.md#시작하기): 인증·데모·조회 범위·아바타 계정 메뉴 |
| 운영 현황 | [역할별 홈·제니에리 브리핑·지표·차트](docs/user-guide.md#운영-현황) |
| 방문 일정 | [월/주 달력·먼저 가 볼 곳 추천·등록·필요 회차](docs/user-guide.md#방문-일정) |
| 방문·조치 | [방문 결과·후속 조치 한 화면: 제니에리 정리·탭·방문 아래 조치](docs/user-guide.md#방문-기록) |
| 활동 요약 | [기간 브리핑·타임라인·원본 이동](docs/user-guide.md#주차별-활동-요약) |
| 담당·주기 관리 | [현장·매장 계층·담당·방문 주기](docs/user-guide.md#현장매장-관리) |
| 현장 주소록 | 주소·담당 검색 |
| 설정(사이드바 하단 아이콘) | [사용자·도메인·권한·AI 요소](docs/user-guide.md#설정) |

## 개발자 가이드 및 프로젝트 구조

| 경로 | 역할 |
| --- | --- |
| app/platform/ | 운영/데모 UI·권한·회차·저장 검증·AI·일정·상태 공통 모듈 |
| app/briefing/ · app/diagnosis/ | 주간 활동·문제 진단의 모델/어댑터/화면 |
| app/api/ · lib/ · worker/ | API·인증/커넥터 어댑터·Worker 진입 |
| app/lib/ · components/ · hooks/ | 공통 날짜·CSV·목록·모델·UI·훅 |
| supabase/ | 신규 설치 스키마·추가 이관·Edge 함수 |
| data/ · seed/ | 원본/가공 자료·시드 생성. 앱 메모리 데모와 원격 적재는 별도 |
| scripts/ · tests/ | 설치·실행·번들·운영 도구·검증 |
| docs/ · docs/specs/ · docs/plans/ | 가이드·현황·원문·구현 계획·요구사항 추적 |
| public/ · vendor/ · examples/ | 정적 자산·라이선스·예제(오래된 D1 예제 포함) |
| .github/ · .githooks/ · .vscode/ · .openai/ | CI·공유 훅·편집기·Sites 설정 |

[AGENTS](AGENTS.md) → [프로젝트 룰](PROJECT_RULE.md) → [디자인 지침](docs/DESIGN-zenielfield.md)을 먼저 읽고 [개발 계획 v2](docs/repo-dev-plan-v2.md)를 따릅니다. 공통 로직의 기준 위치는 DC-COMMON에 있습니다. 생성물 dist/·Edge logic.js·hrbiz-demo.json·seed/out/은 프로젝트 룰의 생성 규칙을 따릅니다. node_modules/·.sites-runtime/·.wrangler/·.next/·.vinext/는 의존성·로컬 실행 상태입니다.

## 환경변수 및 설정

[.env.example](.env.example)의 ZENIFIELD_SUPABASE_URL·ZENIFIELD_GATEWAY_TOKEN은 운영 연결, ZENIFIELD_AUTH_PROVIDER는 인증 선택, OPENAI_API_KEY·OPENAI_MODEL은 AI에 사용합니다. 회사 계정은 supabase-email, 비우면 Sites 인증입니다. 실제 비밀값은 문서·커밋에 넣지 않습니다.

개인 주소·HTTPS는 git 제외 vite.config.local.mjs에 두며 [예시](vite.config.local.example.mjs)를 검토합니다. [변수별 용도](docs/local-development.md#환경변수와-개인-설정) · [운영 인계](docs/supabase-setup.md)

## 테스트 및 문제 해결

```bash
pnpm typecheck
pnpm test
```

기본 test는 플랫폼·브리핑·진단·Supabase·기존 로직·반복 말 정리·차트 렌더링·후속 조치 정렬의 8개 실행기입니다. pnpm build는 패치 버전을 올리고 빌드하므로 문서만 바꿀 때는 필요하지 않습니다. [검사·빌드 상세](docs/local-development.md#테스트와-빌드) · [문제 해결](docs/local-development.md#문제-해결)

[verify CI](.github/workflows/verify.yml)는 타입·기본 테스트를 실행합니다. **main 푸시는 별도 [supabase-deploy](.github/workflows/supabase-deploy.yml)의 운영 배포를 유발합니다.** 문서만 원격 보관하고 배포하지 않을 때는 문서 브랜치를 사용합니다. 이번 작업은 운영 배포를 요청하지 않습니다.

## 관련 문서 인덱스

기존 파일은 삭제·이동하지 않았습니다. 계획·과거 검증 기록은 현재 완료 판정과 구분합니다.

| 분류 | 문서 |
| --- | --- |
| 개발·디자인 기준 | [🎨 ZeniField UI 작업 지침](AGENTS.md) |
| 개발·디자인 기준 | [Project Rules](PROJECT_RULE.md) |
| 개발·디자인 기준 | [ZeniField — Claude Code](CLAUDE.md) |
| 기능 명세·개선 계획 | [AI 브리핑 정보 위계와 단계적 공개](docs/ai-brief-disclosure-plan.md) |
| 기능 명세·개선 계획 | [AI 간편 등록 · 직접 입력 분리 스키마](docs/ai-entry-schema.md) |
| 기능 명세·개선 계획 | [방문 등록 기본 = AI 입력](docs/ai-input-default.md) |
| 기능 명세·개선 계획 | [AI 간편등록 개발 계획 (방문결과 · 주간 브리핑)](docs/ai-quick-entry-plan.md) |
| 기능 명세·개선 계획 | [브리핑 노출 방식 근거와 반영 (2026-10-29)](docs/briefing-research.md) |
| 운영·데이터 | [Cloudflare 회사 계정 이관](docs/cloudflare-account-migration-plan.md) |
| 운영·데이터 | [Cloudflare 원격 배포 자격증명](docs/cloudflare-credentials-plan.md) |
| 기능 명세·개선 계획 | [대시보드 차트 그리드 정렬](docs/dashboard-grid-plan.md) |
| 기능 명세·개선 계획 | [통합 대시보드 제목과 그룹 구분](docs/dashboard-hierarchy-plan.md) |
| 기능 명세·개선 계획 | [대시보드 개선 계획](docs/dashboard-plan.md) |
| 사용 | [ZeniField 개선 보고 및 시연 안내](docs/demo-walkthrough.md) |
| 개발·디자인 기준 | [ZeniField 디자인 지침](docs/DESIGN-zenielfield.md) |
| 현황·검증 | [문서 허브 정리 및 원격 정합 점검](docs/documentation-audit-2026-10-29.md) |
| 기능 명세·개선 계획 | [관리 도메인](docs/domain-plan.md) |
| 현황·검증 | [기능 현황 및 개선 과제](docs/feature-status.md) |
| 기능 명세·개선 계획 | [GPS 지점 자동 선택](docs/gps-plan.md) |
| 기능 명세·개선 계획 | [최신 소스 기반 테스트 계획](docs/latest-source-test-plan.md) |
| 현황·검증 | [최신 소스 기반 테스트 결과 (자동 검사 회차)](docs/latest-source-test-result-2026-10-29.md) |
| 설치·실행·설정·검사 | [로컬 설치·실행·설정·검증 가이드](docs/local-development.md) |
| 기능 명세·개선 계획 | [메뉴·레이블 개선 검토안](docs/navigation-label-plan.md) |
| 기능 명세·개선 계획 | [운영 현황 메시지 아이콘 개선](docs/nudge-icon-design-plan.md) |
| 기능 명세·개선 계획 | [001. 사업장 문제 진단 개발 계획](docs/plans/001-site-problem-diagnosis.md) |
| 기능 명세·개선 계획 | [ZeniField 현장·매장 플랫폼: 연결 및 후속 개발 명세](docs/platform-integration.md) |
| 기능 명세·개선 계획 | [로컬 프로그램 테스트 계획](docs/program-test-plan.md) |
| 개발·디자인 기준 | [저장소 기반 개발 계획 v2 (보완)](docs/repo-dev-plan-v2.md) |
| 운영·데이터 | [데모 데이터 주입 파이프라인](docs/seed-pipeline.md) |
| 요구사항 원문 | [사업장 문제 진단 기획안](docs/specs/site-problem-diagnosis.md) |
| 운영·데이터 | [Supabase 연결 및 운영 인계](docs/supabase-setup.md) |
| 사용 | [메뉴별 사용자 가이드](docs/user-guide.md) |
| 운영·계정 | [관리자 가이드](docs/admin-guide.md) |
| 기능 명세·개선 계획 | [담당 지역 미방문 독려 보강 계획](docs/visit-nudge-plan.md) |
| 기능 명세·개선 계획 | [방문·일지 워크플로](docs/visit-workflow.md) |
| 기능 명세·개선 계획 | [주차별 활동 요약 디자인 개선](docs/weekly-activity-design-plan.md) |
| 기능 명세·개선 계획 | [주간 활동 브리핑 구현](docs/weekly-briefing.md) |
| 기능 명세·개선 계획 | [주차별 활동 타임라인 공간·흐름 개선](docs/weekly-timeline-plan.md) |
| 라이선스 | [shadcn-tailwind-4.13.0.LICENSE.md](vendor/shadcn-tailwind-4.13.0.LICENSE.md) |
| 기능 명세·개선 계획 | [사이드바 탐색 개선](docs/sidebar-navigation-plan.md) |
| 운영·계정 | [Git 작업 계정 설정 기록](docs/git-account-plan.md) |
| 기능 명세·개선 계획 | [운영 현황 차트 비율 개선](docs/status-chart-ratio-plan.md) |

| 기능 명세·개선 계획 | [후속 조치 정렬](docs/overdue-action-order.md) |
| 기능 명세·개선 계획 | [기간 필터 배치](docs/results-filter-layout.md) |

## 확인이 필요한 문서

기존 README의 D1 보존·AI 미사용·이전 명령/배포 주소, 과거 시연 안내의 GPS/수동 AI 요약 안내, 디자인 지침의 차트 미구현 표시, 초기 AI 저장안은 최신 코드와 다릅니다. [점검 보고서](docs/documentation-audit-2026-10-29.md)에 근거·확인 과제를 기록했습니다. 운영 이관 상태·현재 계정·외부 서비스·현재 공개 리비전은 임의로 확정하지 않습니다.

## 과거 README 기록

<details>
<summary>정리 전 원격 README 원문 (과거 안내이며 현재 사용 절차가 아님)</summary>

아래는 삭제하지 않고 보존한 원문입니다. 과거 인증·D1·GPS·AI·배포 주소·테스트 명령·수치는 위의 현재 안내와 구분하세요.

# ZeniField · 현장·매장 운영관리

현장 방문계획 → 방문 결과 → 후속 조치 → 주간 활동 브리핑을 연결하는 반응형 B2B 웹 애플리케이션입니다.

## 현재 구성

- **Supabase 운영 모드**: 현장·매장·공동담당 배정 이력·방문·이슈·감사 기록을 중앙 PostgreSQL에 저장합니다.
- **데모 모드**: 가상 잡매니저 30명·현장 100개·매장 500개. 브라우저 메모리에서만 작동하며 운영 DB에 자동 복사하지 않습니다.
- **기존 D1 운영**: 기존 데이터·API·인증 보존. Supabase 설정에서 이전 운영 화면으로 진입할 수 있습니다. 자료 이관은 아직 수행하지 않았습니다.

현장과 매장은 별도 방문 대상입니다. 본사 방문이 매장 전체 완료로 바뀌지 않습니다. 예정일이 지나도 결과가 없으면 완료되지 않습니다.

UI를 만들거나 수정할 때는 저장소 최상위 [UI 작업 지침](AGENTS.md)에 따라 [디자인 지침](docs/DESIGN-zenielfield.md) 기준으로 폴리싱하고 실제 화면·관련 검증을 완료한 뒤 반영합니다.

## 기능

조직·담당자·현장·매장·기간 필터, 필요 회차 이행률, 조직별 상세 조회, 계층형 현장·매장 관리, 월/주/목록 캘린더, 모바일 결과 입력, 연결 후속 조치, 주간 브리핑 카드·타임라인, 원본 결과 연결, 사용자 권한 관리, CSV 및 화면 인쇄.

주간 브리핑은 Asia/Seoul 월요일–일요일의 실제 방문일 기준입니다. 요약은 목적과 활동 원문 발췌이며 외부 AI를 사용하지 않습니다. 미해결 이슈는 현재 상태이며 과거 상태 스냅샷이 아닙니다.

## 개발 환경

Node.js 22.13 이상만 설치되어 있으면 됩니다. 처음 받은 PC에서는 아래 명령 하나로 pnpm 설치, 패키지 설치, `.env` 생성까지 진행됩니다. 다시 실행해도 안전하며 기존 `.env`를 덮어쓰지 않습니다.

```bash
npm run setup
pnpm dev
```

의존성 저장소는 프로젝트 안의 `.sites-runtime/pnpm-store`에 만들어지므로(`pnpm-workspace.yaml`) 첫 설치에 시간이 오래 걸릴 수 있습니다. 다른 OS에서 설치한 `node_modules`를 복사해 쓰면 esbuild·workerd 등 실행 파일이 맞지 않아 테스트가 실패하므로, 새 PC에서는 `node_modules`를 지우고 다시 설치하세요.

**exFAT 드라이브 주의**: exFAT는 심볼릭 링크를 지원하지 않아 기본 설치가 `EISDIR`로 실패합니다. 이 경우 `pnpm install --node-linker=hoisted`로 설치하세요(약 1시간 소요). NTFS 드라이브나 리눅스·맥에서는 필요 없습니다.

휴대용 개발 프로필은 포트 5173을 사용합니다. ChatGPT Sites 관리 환경에서는 전용 미리보기/빌드 도구를 사용합니다. 새 PC에서의 설치·실행은 아직 별도 검증하지 않았습니다.

```bash
pnpm build
```

## Supabase 연결

### 개인 Cloudflare 계정의 Supabase 테스트 배포

GitHub main `12cbc0e`의 Vinext/Vite/Cloudflare Workers 구성을 유지한 별도 배포입니다. `wrangler.cloudflare.json`은 `ugen.kwon@gmail.com` 계정의 `zenifield` Worker와 새 `zenifield-test` D1 바인딩을 지정합니다. 기존 `.openai/hosting.json`의 Sites 프로젝트 식별자와 원래 D1 자료는 변경하지 않습니다. 새 D1에는 기존 스키마만 적용했으며 운영 자료는 이관하지 않았습니다.

```bash
corepack pnpm exec wrangler whoami
corepack pnpm run deploy:cloudflare
```

실제 DB 테스트: https://zenifield.ugen-kwon.workers.dev/?mode=supabase

- Cloudflare Access 결제 등록 없이 Supabase Auth 이메일 링크로 로그인합니다. 사전 등록한 활성 `zf_users` 계정만 사용할 수 있습니다. 승인된 테스트 관리자 이메일은 `ugen.kwon@gmail.com`입니다.
- 이메일 링크는 요청한 브라우저에서 열어야 합니다. PKCE 검증자를 HttpOnly 쿠키에 저장하고 서버에서 코드를 교환합니다. 로그인 토큰은 브라우저 JavaScript나 응답 JSON에 전달하지 않습니다.
- `ZENIFIELD_AUTH_PROVIDER=supabase-email`일 때 Worker가 운영 API를 `zenifield-cloudflare` Edge Function으로 중계합니다. Edge는 별도 서버 토큰과 Auth `/user` 응답을 검증하고, 등록 이메일·활성 상태를 확인한 뒤 기존 업무 검증 및 RPC를 재사용합니다. 클라이언트가 보낸 Sites 신원 헤더는 신뢰하지 않습니다.
- 주소 검색 `/api/geo`는 위치 기능 중지로 꺼져 있습니다(2026-10-28). 세션을 검증한 뒤 외부 지도 API를 부르지 않고 410을 반환합니다. Kakao 키는 쓰지 않습니다.
- Worker의 `ZENIFIELD_SUPABASE_URL`, `ZENIFIELD_GATEWAY_TOKEN`은 secret으로 저장합니다. 해당 전용 토큰의 SHA-256 값만 Edge secret `ZENIFIELD_CLOUDFLARE_TOKEN_HASH`에 저장합니다. Supabase 관리자 키는 Edge 환경에만 있습니다. 기존 Sites 게이트웨이 토큰과 별개입니다.
- 기존 Sites 배포는 ChatGPT 인증과 원래 `zenifield-gateway`를 유지합니다. 기존 관리자의 로그인 주체는 덮어쓰지 않습니다. Cloudflare 신규 테스트 계정은 별도 `supabase:<Auth UUID>` 주체를 사용합니다.
- 데모 데이터는 계속 메모리에서만 처리하며 운영 DB로 자동 복사하지 않습니다. Cloudflare의 기존 D1 운영 API는 Sites 인증을 제공하지 않으므로 차단합니다.

로그인에는 Supabase 기본 메일 발송 제한이 적용됩니다. 이메일 템플릿은 변경하지 않았고, Cloudflare 콜백 주소만 기존 리디렉션 허용 목록에 추가했습니다. 여러 사용자에게 발송하려면 프로젝트의 메일 발송 자격과 SMTP 설정을 확인하세요.

검증: `node tests/run-cloudflare-supabase.mjs` (54개 인증/세션·주소 검색 연결 검사). `scripts/test-cloudflare-live.mjs`는 관리용 환경변수가 있는 체크아웃에서만 실행하며, 고유한 폐기용 DB/Auth 계정으로 저장·재조회·권한·세션을 검사하고 정확한 검수 자료만 정리합니다. 실제 사용자의 이메일 수신과 브라우저 로그인은 사용자가 확인합니다.

Edge 변경 시 `supabase functions deploy zenifield-cloudflare --project-ref <ref> --use-api`로 별도 배포해야 합니다. 공용 업무 검증을 변경하면 기존 `scripts/bundle-supabase.mjs` 실행 후 두 Edge Function을 함께 배포합니다. `supabase/schema.sql` 재실행이나 기존 데이터 초기화는 하지 않습니다.

[Supabase 설정·운영 인계](docs/supabase-setup.md)를 먼저 확인하세요.

- 서버 환경변수: `ZENIFIELD_SUPABASE_URL`, `ZENIFIELD_GATEWAY_TOKEN`. `.env.example`에는 이름과 가짜 자리표시자만 있습니다.
- 로그인은 기존 Sites/ChatGPT 방식입니다. Supabase Auth의 이메일/비밀번호 가입으로 바꾸지 않았습니다.
- 실제 운영: 사이트 상단 **Supabase 운영 열기**, 또는 `?mode=supabase`로 진입합니다.
- 최초 관리자 이메일은 DB 소유자가 사전 등록합니다. 관리자가 설정에서 잡매니저 계정을 추가한 뒤 현장·매장을 등록합니다.
- 일반 브라우저는 DB 테이블/RPC에 직접 접근하지 않습니다. Sites 인증 → 서버 전용 토큰 검증 Edge Function → 서버 전용 RPC → PostgreSQL 구조입니다.
- 모든 업무 테이블에 RLS와 직접 접근 차단 정책이 있습니다. 토큰 원문/관리자 키를 프런트엔드·GitHub에 넣지 마세요.
- 다른 서버에 배포하려면 Sites 인증 헤더를 그대로 신뢰하면 안 됩니다. 해당 호스팅에 맞는 인증 검증 어댑터를 구현해야 합니다.
- GitHub `main` 푸시는 `.github/workflows/supabase-deploy.yml`에서 검증 후 Cloudflare `zenifield` Worker로 자동 배포합니다. 백엔드가 바뀌면 이관·Edge 배포가 먼저 성공해야 화면을 배포하며, 화면만 바뀌면 기존 DB·Edge를 그대로 사용합니다. Sites 배포는 별도입니다.

자동 배포에는 저장소 Actions secret `CLOUDFLARE_API_TOKEN`(Worker 전용)과 기존 `SUPABASE_ACCESS_TOKEN`·`SUPABASE_PROJECT_REF`가 필요합니다. 실행 결과는 [GitHub Actions](https://github.com/Zeniel-Jobsky/Zenielfield/actions/workflows/supabase-deploy.yml)에서 확인합니다. 수동 실행의 `dry_run`은 이관 목록만 확인하고 배포하지 않습니다. CI는 `NO_BUMP=1`로 Git에 커밋된 버전을 그대로 빌드합니다. 런타임 비밀값은 Cloudflare의 기존 secret을 사용하며 `.env`는 Git이나 CI 산출물에 올리지 않습니다.

CI의 배포 단계는 Worker 전용 토큰을 지원하는 `wrangler@4.151.0`을 별도로 실행합니다. `scripts/prepare-cloudflare-deploy.mjs`가 기존 빌드 산출물에서 폐기된 `legacy_env=true`만 제거한 호환 설정을 생성합니다. 앱 빌드와 로컬 개발의 기존 Wrangler 의존성은 유지합니다. 기존 4.92.0은 계정 전체의 subdomain 조회를 요구해 Worker 전용 토큰 배포가 실패합니다.

## 소스 구조

- `app/platform/`: 통합 플랫폼, 실제 운영/데모 전환 및 사용자 관리
- `app/briefing/`: 주간 활동 집계·카드·타임라인
- `app/api/platform/`: Supabase 서버 게이트웨이. 브라우저 입력이 아닌 신뢰된 로그인 주체 사용
- `supabase/schema.sql`: 빈 전용 프로젝트용 설치 명세. 운영 DB에 재실행하거나 reset하지 마세요.
- `supabase/functions/zenifield-gateway/`: 별도 서버 토큰 인증, 검증 및 DB RPC 연결
- `scripts/bundle-supabase.mjs`: 공용 업무 검증 로직을 Edge용으로 재생성
- `app/field-app.tsx`, `app/api/data/`, `db/`, `drizzle/`: 보존된 기존 D1 운영

플랫폼 검증 로직 변경 시 `node scripts/bundle-supabase.mjs` 실행 후 Edge Function도 재배포해야 합니다. `.openai/hosting.json`은 기존 Sites 프로젝트 식별자와 D1 바인딩 선언이며 비밀키가 아닙니다.

## 검증

```bash
pnpm typecheck   # tsc --noEmit
pnpm test        # 아래 6개를 순서대로 실행
```

개별 실행:

```bash
node tests/run-platform.mjs
node tests/run-briefing.mjs
node tests/run-supabase.mjs
node tests/logic.mjs
node tests/ui-metrics.mjs
```

PR과 `main` 푸시마다 GitHub Actions(`.github/workflows/verify.yml`)가 같은 검증을 실행합니다.

2026-10-28 Windows(Node 22, pnpm 11.25)에서 `pnpm typecheck` 통과, `pnpm test` 192개 단언 통과(플랫폼 52, 브리핑 32, 진단 54, Supabase 서버 15·Edge 10, 로직 20, UI 지표 9). 전용 Supabase에서 18개 DB 불변조건(rollback)과 실제 Edge HTTP를 통한 저장·재조회 등 14단계도 검증했습니다. 실제 사용자의 브라우저 로그인은 사용자가 직접 수행해야 합니다.

`tests/supabase.sql`은 폐기 가능한 검수 자료를 생성하고 전부 rollback합니다. 기존 D1 API 검증은 격리된 테스트 런타임에서 `CLOUDFLARE_CF_FETCH_ENABLED=false node tests/api-flow.mjs`로 실행합니다. 테스트를 기존 운영 DB에 적용하지 마세요.

## 개발 절차

[저장소 기반 개발 계획 v2](docs/repo-dev-plan-v2.md)를 따릅니다. 새 기획을 받으면 코드보다 먼저 `docs/plans/NNN-<기능>.md`에 요구사항 추적표와 확정 필요 결정을 쓰고, 원문은 `docs/specs/`에 보관합니다.

- `main`에는 `pnpm typecheck`와 `pnpm test`가 통과한 상태만 둡니다.
- 작업은 `feat/NNN-<기능>`, `fix/…`, `chore/…` 브랜치에서 하고 작업 패키지 단위로 커밋합니다.
- 기준 상태는 태그 `baseline-2026-10-27`입니다.
- DB 변경은 승인 후 `supabase/migrations/`의 추가 마이그레이션으로만 합니다.

## 업무 및 후속 개발 명세

- [플랫폼 업무 구조와 DB 계약](docs/platform-integration.md) — 초기 데모 단계의 설계 기록. 현재 저장 연결 상태는 Supabase 인계를 따릅니다.
- [주간 브리핑](docs/weekly-briefing.md)
- [Supabase 설정·현재 구현·권한·검증](docs/supabase-setup.md)

방문 이력이 있는 대상의 주기는 과거 통계 보존을 위해 잠깁니다. 향후 적용일 지정 주기 이관과 회차 스냅샷, 기존 D1 자료 이관, 첨부파일, 알림, 그룹웨어, XLSX 전용 양식은 후속 개발입니다. 운영 권한과 보관정책은 실제 사용에 맞게 확정해야 합니다.

의존 라이브러리와 제3자 자산의 라이선스는 각 패키지 및 저장소 내 LICENSE 파일을 따릅니다.

## 현재 통합 소스 기준

`Zeniel-Jobsky/Zenielfield`의 main `d394460`을 클론해 현재 작업 폴더의 기준으로 가져왔습니다. 최신 AI 입력·음성 입력·사이드바 스크롤 개선에 기존 화면·입력 보호 개선과 Cloudflare/Supabase 연결을 통합했습니다. 작업 브랜치는 `work/upstream-cloudflare-supabase`, 이전 로컬 소스 백업은 `backup/pre-upstream-import`입니다. `.env`는 로컬에 보존하며 배포용 비밀값은 Cloudflare/Supabase의 기존 secret 설정을 사용합니다.

Cloudflare의 `/api/assist`는 Supabase에서 검증한 등록 사용자 세션으로만 호출합니다. AI는 입력 초안만 반환하며 저장은 기존 입력 검토·저장 흐름을 따릅니다. 서버의 `OPENAI_API_KEY`/`OPENAI_MODEL` 설정이 필요합니다. 실제 AI 호출 없이 모의 응답으로 인증 경계를 검증했습니다. 사용자의 실제 Supabase 이메일 로그인 성공은 확인했습니다.


</details>
