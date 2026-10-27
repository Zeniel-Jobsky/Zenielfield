# ZeniField · 현장·매장 운영관리

현장 방문계획 → 방문 결과 → 후속 조치 → 주간 활동 브리핑을 연결하는 반응형 B2B 웹 애플리케이션입니다.

## 현재 구성

- **Supabase 운영 모드**: 현장·매장·공동담당 배정 이력·방문·이슈·감사 기록을 중앙 PostgreSQL에 저장합니다.
- **데모 모드**: 가상 잡매니저 30명·현장 100개·매장 500개. 브라우저 메모리에서만 작동하며 운영 DB에 자동 복사하지 않습니다.
- **기존 D1 운영**: 기존 데이터·API·인증 보존. Supabase 설정에서 이전 운영 화면으로 진입할 수 있습니다. 자료 이관은 아직 수행하지 않았습니다.

현장과 매장은 별도 방문 대상입니다. 본사 방문이 매장 전체 완료로 바뀌지 않습니다. 예정일이 지나도 결과가 없으면 완료되지 않습니다.

## 기능

조직·담당자·현장·매장·기간 필터, 필요 회차 이행률, 조직별 상세 조회, 계층형 현장·매장 관리, 월/주/목록 캘린더, 모바일 결과 입력, 연결 후속 조치, 주간 브리핑 카드·타임라인, 원본 결과 연결, 사용자 권한 관리, CSV 및 화면 인쇄.

주간 브리핑은 Asia/Seoul 월요일–일요일의 실제 방문일 기준입니다. 요약은 목적과 활동 원문 발췌이며 외부 AI를 사용하지 않습니다. 미해결 이슈는 현재 상태이며 과거 상태 스냅샷이 아닙니다.

## 개발 환경

Node.js 22.13 이상, package.json에 지정된 pnpm 버전을 사용합니다.

```bash
pnpm install
pnpm dev
```

휴대용 개발 프로필은 포트 5173을 사용합니다. ChatGPT Sites 관리 환경에서는 전용 미리보기/빌드 도구를 사용합니다. 새 PC에서의 설치·실행은 아직 별도 검증하지 않았습니다.

```bash
pnpm build
```

## Supabase 연결

[Supabase 설정·운영 인계](docs/supabase-setup.md)를 먼저 확인하세요.

- 서버 환경변수: `ZENIFIELD_SUPABASE_URL`, `ZENIFIELD_GATEWAY_TOKEN`. `.env.example`에는 이름과 가짜 자리표시자만 있습니다.
- 로그인은 기존 Sites/ChatGPT 방식입니다. Supabase Auth의 이메일/비밀번호 가입으로 바꾸지 않았습니다.
- 실제 운영: 사이트 상단 **Supabase 운영 열기**, 또는 `?mode=supabase`로 진입합니다.
- 최초 관리자 이메일은 DB 소유자가 사전 등록합니다. 관리자가 설정에서 잡매니저 계정을 추가한 뒤 현장·매장을 등록합니다.
- 일반 브라우저는 DB 테이블/RPC에 직접 접근하지 않습니다. Sites 인증 → 서버 전용 토큰 검증 Edge Function → 서버 전용 RPC → PostgreSQL 구조입니다.
- 모든 업무 테이블에 RLS와 직접 접근 차단 정책이 있습니다. 토큰 원문/관리자 키를 프런트엔드·GitHub에 넣지 마세요.
- 다른 서버에 배포하려면 Sites 인증 헤더를 그대로 신뢰하면 안 됩니다. 해당 호스팅에 맞는 인증 검증 어댑터를 구현해야 합니다.
- Edge Function 배포와 Sites 배포는 별도입니다. GitHub 자동 배포/양방향 동기화는 구성하지 않았습니다.

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
pnpm exec tsc --noEmit
node tests/run-platform.mjs
node tests/run-briefing.mjs
node tests/run-supabase.mjs
node tests/logic.mjs
node tests/ui-metrics.mjs
```

기존 113개 + 서버/Edge 25개 검증. 전용 Supabase에서 18개 DB 불변조건(rollback)과 실제 Edge HTTP를 통한 저장·재조회 등 14단계도 검증했습니다. 실제 사용자의 브라우저 로그인은 사용자가 직접 수행해야 합니다.

`tests/supabase.sql`은 폐기 가능한 검수 자료를 생성하고 전부 rollback합니다. 기존 D1 API 검증은 격리된 테스트 런타임에서 `CLOUDFLARE_CF_FETCH_ENABLED=false node tests/api-flow.mjs`로 실행합니다. 테스트를 기존 운영 DB에 적용하지 마세요.

## 업무 및 후속 개발 명세

- [플랫폼 업무 구조와 DB 계약](docs/platform-integration.md) — 초기 데모 단계의 설계 기록. 현재 저장 연결 상태는 Supabase 인계를 따릅니다.
- [주간 브리핑](docs/weekly-briefing.md)
- [Supabase 설정·현재 구현·권한·검증](docs/supabase-setup.md)

방문 이력이 있는 대상의 주기는 과거 통계 보존을 위해 잠깁니다. 향후 적용일 지정 주기 이관과 회차 스냅샷, 기존 D1 자료 이관, 첨부파일, 알림, 그룹웨어, XLSX 전용 양식은 후속 개발입니다. 운영 권한과 보관정책은 실제 사용에 맞게 확정해야 합니다.

의존 라이브러리와 제3자 자산의 라이선스는 각 패키지 및 저장소 내 LICENSE 파일을 따릅니다.
