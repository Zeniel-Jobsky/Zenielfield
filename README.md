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
- 주소 검색 `/api/geo`는 같은 이메일 세션과 활성 계정을 검증한 뒤 기존 Kakao 검색 로직으로 연결합니다. Cloudflare에서 사용하려면 `KAKAO_REST_API_KEY`를 Worker secret으로 별도 설정해야 합니다. 키가 없으면 설정 필요 안내를 반환합니다.
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
