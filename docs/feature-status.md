# 기능 현황 및 개선 과제

기준: 2026-10-27. 핵심 업무 흐름(현장·매장 → 방문계획 → 결과 → 후속 조치 → 주간 브리핑)은 데모와 Supabase 운영 모드 모두 구현되어 있다. 운영 사이트는 Sites 비밀값 교체 후 실제 로그인 확인이 남아 있다.

## 확인 근거

| 항목 | 결과 |
| --- | --- |
| `tsc --noEmit` | 오류 없음 |
| `tests/run-platform.mjs` | 82개 통과 · 시드 19개 |
| `tests/run-briefing.mjs` | 32개 통과 |
| `tests/run-supabase.mjs` | 서버 15개 + Edge 10개 통과 |
| `tests/ui-metrics.mjs` | 9개 통과 |
| `tests/logic.mjs` | 20개 통과 |
| 원격 Edge Function | 새 게이트웨이 토큰 인증 통과(403 미등록 사용자), 잘못된 토큰 401 |
| 로컬 `pnpm dev` | 페이지 200, `/api/platform` 비로그인 401 |

## 실제 동작하는 기능

| 영역 | 기능 | 저장 위치 |
| --- | --- | --- |
| 조직·사용자 | 사업부·팀·파트·역할 등록, 활성/비활성, 권한별 접근 범위 | `zf_users` |
| 현장·매장 | 계층형 등록·수정, 고유코드, 매장은 상위 현장 필수 참조 | `zf_sites`, `zf_stores` |
| 담당 배정 | 복수 담당, 배정 시작·종료 이력, 과거 방문자 보존 | `zf_assignments` |
| 방문 | 현장/매장 독립 방문, 계획 → 결과, 지연 판정, 자동 완료 없음 | `zf_visits` |
| 후속 조치 | 방문 결과 "후속 조치 필요" 시 연결 입력, 상태·완료일 | `zf_actions` |
| 관리주기 | 필요 회차 계산·이행률, 방문 존재 시 주기 잠금 | `zf_policy_versions` |
| 감사·동시성 | DB가 변경 전/후 기록, 버전 충돌 409 | `zf_audit` |
| 화면 | 조직·담당자·기간 필터, 월/주/목록 캘린더, 모바일 결과 입력 | — |
| 주간 브리핑 | Asia/Seoul 월–일, 카드·타임라인, 원본 방문 연결 | 조회 전용 |
| 내보내기 | UTF-8 BOM CSV, 화면 인쇄 | — |
| 데모 모드 | 가상 30명·100현장·500매장, 브라우저 메모리만 사용 | 저장 안 함 |
| 기존 D1 운영 | 기존 화면·API 보존, 설정에서 진입 | Cloudflare D1 |
| 보안 경계 | Sites 인증 → 게이트웨이 토큰 → service_role RPC, 전 테이블 RLS 차단 | — |

## 확인이 필요한 부분

| 항목 | 상태 | 할 일 |
| --- | --- | --- |
| 운영 사이트 Supabase 모드 | 게이트웨이 토큰 재발급으로 현재 401 | Sites secret `ZENIFIELD_GATEWAY_TOKEN` 교체 |
| 실제 브라우저 로그인 | 미확인 | 관리자 ChatGPT 계정으로 `?mode=supabase` 진입 |
| 최초 관리자 | `zf_users` 사전 등록 여부 미확인 | 로그인 이메일과 일치하는지 확인 |
| 로컬 Supabase 모드 | 로컬 로그인 `seedy@sites.test`는 미등록 | 필요 시 테스트 계정 등록 |
| 새 PC 설치 | `npm run setup` 작성, 이미 세팅된 PC에서만 실행 | 새 PC에서 pnpm 설치 경로 확인 |

## 추가 개선이 필요한 부분

### 높음 (운영 전)

- 기존 D1 자료 Supabase 이관: 백업, 원본 ID·방문 유형·배정 이력 대응 검증 후 수행.
- 사용자 초대: 현재 관리자 수동 등록, 초대 메일 없음.
- 운영 권한·보관정책 확정: 역할별 수정 범위, 감사 기록 보관 기간.
- 마이그레이션 관리: `supabase/schema.sql` 단일 파일, `supabase/migrations/` 없음. 원격 이력과 맞춘 migration 정리 필요.

### 중간
- AI·직접 입력 분리: [스키마](ai-entry-schema.md) 구현, 원격 이관·Edge 재배포 완료(2026-10-28).
- GPS 지점 자동 선택: [GPS](gps-plan.md) 구현. 매장 검색·주소 좌표 변환 구현, Kakao 키 설정 필요.
- 데모 주입 파이프라인: [문서](seed-pipeline.md) 구현, 운영 적재 대기. HR-biz 가상 DB(xlsx) 운영 적재 완료(2026-10-28).
- 방문 등록 기본 AI 입력·권한 요청: [문서](ai-input-default.md) 구현.
- 관리 도메인: [문서](domain-plan.md) 구현. 원격 이관 적용 완료(2026-10-28).
- 방문·일지 워크플로 재설계: [문서](visit-workflow.md) 구현(계획 자동 연결·일시 기본 지금·제안 조치 일괄 등록·홈 "지금 여기서").
- 대시보드·브리핑·필터 2차 개편: [대시보드 계획](dashboard-plan.md).
- 기입력 결과 AI 정리(`aiEdits`)·AI 현황 요약·푸터 빌드 표기: 구현(2026-10-28). [워크플로](visit-workflow.md), [스키마](ai-entry-schema.md), [대시보드](dashboard-plan.md). 이관·Edge 운영 반영은 아래 Actions 실행에서 완료.
- 운영 반영(2026-10-28 14:35, Actions supabase-deploy #40638708419 성공): 이관 기준선 2개(visit_entry, domains) 기록 + 적용 2개(read_window, ai_edits), logic.js 번들, Edge zenifield-gateway·zenifield-cloudflare 재배포.
- 운영 자동 파이프라인: `.github/workflows/supabase-deploy.yml` + `scripts/migrate.mjs`(활성). `main` 검증 → 필요한 이관·Edge → Cloudflare Worker 순서로 연결. 저장소 secret은 기존 Supabase 2개와 Worker 전용 `CLOUDFLARE_API_TOKEN`. [설치 문서](supabase-setup.md).
- 대시보드 차트화: [대시보드 개선 계획](dashboard-plan.md) DB-1–DB-10·BR-1·BR-2 완료, BR-3 남음.

- 주기 변경 적용일 지정과 필요 회차 스냅샷: 현재는 방문이 있으면 주기 변경 불가.
- 사진·첨부파일: Storage, 파일 검증, 권한, 보관정책.
- 알림: 지연 방문·미처리 조치 알림.
- XLSX 전용 양식과 정식 보고서 템플릿.
- CI: GitHub Actions로 테스트 자동 실행, Edge Function 배포 자동화.

### 낮음

- 그룹웨어 연동.
- 다른 호스팅 이전 시 인증 어댑터: 현재 Sites `oai-authenticated-*` 헤더에 의존.
- 미해결 이슈의 과거 시점 스냅샷: 브리핑은 현재 상태만 표시.
- 의존성 도구 `deuk-agent-flow` 5.0.x 패키지 누락 파일(로컬 개발 도구, 앱과 무관).

## 운영 전환 체크리스트

- [ ] Sites에 `ZENIFIELD_SUPABASE_URL`, `ZENIFIELD_GATEWAY_TOKEN` 설정
- [ ] 관리자 계정 로그인 및 화면 조회 확인
- [ ] 잡매니저 계정 등록 후 현장·매장·방문 입력 1건 시험
- [ ] `index.ts` 토큰 해시 변경 커밋
- [ ] D1 이관 여부 결정
- [ ] 권한·보관정책 확정
- [ ] Supabase access token(`sbp_`) 폐기 또는 보관 위치 결정

관련 문서: [Supabase 설정·운영 인계](supabase-setup.md), [플랫폼 업무 구조](platform-integration.md), [주간 브리핑](weekly-briefing.md), [대시보드 개선 계획](dashboard-plan.md).

## 회사 계정 로그인 (2026-10-28)

- 앱 첫 화면 = 로그인. 로그인 후 실제 DB로 동작, 데모는 앱 안 전환 또는 `?mode=demo`
- 방식: 등록 이메일 + 비밀번호 (Supabase Auth). 비밀번호 없으면 이메일 링크
- 전환: `ZENIFIELD_AUTH_PROVIDER=supabase-email` (로컬 `.env`, Cloudflare vars). 비우면 기존 Sites(ChatGPT) 로그인
- 계정 발급: 설정 → "로그인 비밀번호 발급·재설정"(시스템 관리자) 또는 `node --env-file=.env scripts/set-password.mjs <email> <비밀번호>`(서버 토큰 보유자)
- 등록(zf_users)에 없는 이메일은 비밀번호가 있어도 로그인 불가
- Edge `zenifield-cloudflare` 재배포: Sites 서버 토큰도 허용(로컬·Sites 서버가 같은 로그인 경로 사용)
- 로컬 개발 전용: `@example.test` 시드 계정 역할별 로그인 버튼 (ChatGPT 모드에서만 표시)
- 방문 1만 건(`…-extra-01~05`, 출처 표시 없음): 기존 데이터. 묶음(dataset)으로 보존 예정, 시드 `apply` 전 처리 필요

## Cloudflare 화면 배포 (2026-10-28)

- 대상: `ugen.kwon@gmail.com` 계정의 `zenifield` Worker, [공개 주소](https://zenifield.ugen-kwon.workers.dev). 화면 소스 커밋 `3377e3a`, 배포 버전 `ecab24f3-03c0-4f4a-a180-f8688c008434`.
- 현장·매장 탭 하단선과 핵심 지표의 간격을 PC·태블릿 16px, 모바일 12px로 수정하고 왼쪽 컬러 테두리 선언을 제거했다. 모바일 데모·운영 전환 문구의 가로 넘침도 수정했다.
- `npm run typecheck`, `npm test`, Cloudflare 인증 테스트 2종, 디자인 점검, Cloudflare 대상 빌드 통과. 공개 데모에서 1280px·390px 간격·테두리·가로 폭 확인, 기존 Chrome 세션의 Supabase 운영 대시보드 조회 확인.
- 이번 배포에서 운영 DB 이관과 Supabase Edge 함수 변경은 실행하지 않았다.

### 최신 소스·자동 배포 연결 (2026-10-28)

- GitHub `main`의 `2031c71`을 동기화해 Cloudflare에 수동 배포했다. Worker 버전 `b34be923-8d0b-4b36-b2e3-9991c42026ad`, 화면 표기 `v0.1.1 · 2031c71`.
- 타입 검사·전체 테스트·Cloudflare 인증 테스트 2종·Cloudflare 대상 빌드 통과. 로컬 390·820·1280px 화면과 공개 데모의 빌드 표기 확인. Supabase 선행 배포는 Actions `40638708419`의 이관·Edge 성공 결과를 확인했다.
- 자동 배포는 같은 `supabase-deploy` 워크플로를 확장했다. UI 변경만 있는 푸시는 DB·Edge를 건너뛰고, 백엔드 변경은 해당 단계가 성공해야 Worker를 배포한다. 검사 실패·취소·수동 `dry_run`에서는 화면을 배포하지 않는다.
- CI는 `NO_BUMP=1`로 커밋된 버전을 빌드한다. Worker 버전 메시지와 Actions 요약에 소스 커밋·배포 주소를 남기므로 이후 자동 배포 이력은 [Actions 실행 기록](https://github.com/Zeniel-Jobsky/Zenielfield/actions/workflows/supabase-deploy.yml)에서 확인한다.
- 사용자가 승인한 `zenifield` 전용 `Individual Workers Editor` 토큰을 GitHub Actions의 암호화된 `CLOUDFLARE_API_TOKEN` secret으로 등록했다. 토큰과 `.env` 원문은 소스·문서·산출물에 포함하지 않는다.
- 첫 자동 실행 `40641160666`은 검증·빌드가 성공했으나 기존 Wrangler 4.92.0이 계정 전체 subdomain을 조회해 권한 오류가 발생했다. 배포 단계만 Worker별 조회를 지원하는 `wrangler@4.151.0`으로 고정했다. 앱 빌드 의존성과 토큰의 Worker 전용 권한 범위는 유지한다.
