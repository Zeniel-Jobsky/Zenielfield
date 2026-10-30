# 인프라·운영 구성

Supabase·Cloudflare·Git 계정·데모 시드·관리 도메인의 구성과 이력이다. 실제 서비스 배치·DB 초기화·계정 등록 절차는 [production-rollout.md](production-rollout.md)가 정본이고, 이 문서는 구성의 배경과 이력을 담는다.

| 절 | 원래 문서 |
| --- | --- |
| [Supabase 연결 및 운영 인계](#supabase-연결-및-운영-인계) | `supabase-setup.md` |
| [Cloudflare 회사 계정 이관](#cloudflare-회사-계정-이관) | `cloudflare-account-migration-plan.md` |
| [Cloudflare 원격 배포 자격증명](#cloudflare-원격-배포-자격증명) | `cloudflare-credentials-plan.md` |
| [Git 작업 계정](#git-작업-계정) | `git-account-plan.md` |
| [데모 데이터 주입 파이프라인](#데모-데이터-주입-파이프라인) | `seed-pipeline.md` |
| [관리 도메인](#관리-도메인) | `domain-plan.md` |

## Supabase 연결 및 운영 인계

_원래 문서: `docs/supabase-setup.md` (2026-10-30 통합)_

2026-10-27. 서울 리전의 ZeniField 전용 프로젝트에 구성. 기존 ZeniManager 프로젝트와 기존 D1 데이터는 수정하지 않았다.

### 실행 구조

브라우저 → Sites 인증이 적용된 `/api/platform` → 서버 전용 토큰으로 인증하는 Supabase Edge Function → service_role 전용 RPC → PostgreSQL.

- 로그인은 기존 Sites/ChatGPT 방식 유지. Supabase Auth 회원가입이나 비밀번호 수집을 새로 추가하지 않음.
- 일반 브라우저·anon·authenticated 역할은 테이블/RPC에 직접 접근할 수 없음. 8개 테이블에 RLS와 명시적 차단 정책 적용.
- Edge Function은 모든 요청의 서버 토큰을 SHA-256 검증. `verify_jwt=false`는 이 별도 인증을 사용하기 때문이며 인증 생략이 아님.
- Supabase 관리자 키는 Edge Function 기본 비밀 환경에서만 읽음. 브라우저·GitHub·Sites 응답에 포함하지 않음.
- Sites 서버는 클라이언트가 보낸 사용자 ID/이메일을 사용하지 않고 플랫폼이 전달한 인증 헤더만 전달함. 다른 서버로 이전할 때는 이 신뢰 경계에 맞는 인증 어댑터 구현 필수.

### 시작하기

1. 사이트 상단 `Supabase 운영 열기` 또는 `?mode=supabase`로 진입.
2. 사전 등록된 관리자 이메일의 ChatGPT 계정으로 로그인. 계정이 다르면 DB 소유자가 `zf_users`에 올바른 관리자를 사전 등록해야 함. 누구나 최초 관리자가 되는 공개 가입 흐름은 없음.
3. 설정에서 잡매니저 이메일·팀·파트·역할 등록. 초대 메일은 자동 발송하지 않음.
4. 같은 팀·파트의 잡매니저를 선택하여 현장 → 매장 등록.
5. 방문계획 → 결과 → 후속 조치 입력. 새로고침/다른 접속에서도 DB 저장 기록 조회.

운영 DB의 가상 30명·100현장·500매장 자동 삽입은 없음. 데모는 계속 브라우저 메모리로 분리되며, 운영은 등록한 데이터부터 집계한다.

### 저장 테이블

| 테이블 | 내용 |
| --- | --- |
| zf_users | 계정·조직·역할·활성 상태·로그인 주체 연결 |
| zf_sites / zf_stores | 현장/매장. 식별자·코드·참조·버전은 관계형 컬럼, 화면 계약은 검증된 JSONB |
| zf_assignments | 공동 담당의 배정 시작·종료 이력 |
| zf_visits | 독립된 현장/매장 방문, 계획·결과·관련 회차 키 |
| zf_actions | 대상 및 방문 연결, 상태·등록일·완료일 |
| zf_policy_versions | 관리주기 정책 이력 |
| zf_audit | DB가 기록하는 이전/이후 값과 수정자·시각 |

필요 회차는 저장한 주기에서 계산한다. 방문이 존재하면 주기를 잠가 과거 분모가 변하지 않도록 한다. 향후 적용일을 지정하는 주기 이관과 회차 스냅샷은 후속 개발이다. 담당자 변경은 과거 방문자를 바꾸지 않는다. 쓰기는 트랜잭션·버전 충돌 검사와 workspace write lock을 사용한다.

### 설정·배포

- `.env.example`: 필요한 서버 환경변수 이름만 기재. 실제 값은 커밋 금지.
- Sites에서는 native runtime environment 설정에 `ZENIFIELD_SUPABASE_URL`, secret인 `ZENIFIELD_GATEWAY_TOKEN` 저장.
- Edge 코드 `index.ts`의 토큰 해시와 Sites 서버 토큰은 같은 쌍이어야 함. 배포 관리자에게 기존 값을 전달받거나 양쪽을 함께 교체해야 함.
- Edge 기본 환경의 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`(또는 `SUPABASE_SECRET_KEYS`) 사용.
- `supabase/schema.sql`은 **빈 전용 프로젝트**를 위한 설치 명세. 현재 운영 프로젝트에 다시 실행하지 않음. 원격 migration history에 이미 적용되어 있음. 기존 테이블 삭제/reset 금지.
- `node scripts/bundle-supabase.mjs`로 공용 검증 로직을 Edge용 `logic.js`에 번들. 플랫폼 검증 로직 변경 시 함께 재생성 후 Edge 재배포.
- GitHub `main` 자동 배포는 아래 파이프라인에서 이관·Edge → Cloudflare 순서를 따른다. Sites 배포는 별도.

### 기존 자료

기존 D1 바인딩·스키마·API·로그인은 보존. Supabase 운영 설정의 `기존 D1 운영 열기`에서 조회 가능. 이전 저장 자료의 이관은 아직 수행하지 않았다. 이관할 때는 원본 ID·방문 유형·배정 및 변경 이력의 대응 검증과 백업이 먼저 필요하다.

### 검증

- 기존 자동 검증 113개 유지.
- `node tests/run-supabase.mjs`: 서버 15개, Edge 10개 검사.
- `tests/supabase.sql`: 18개 DB 불변조건. 전용 프로젝트에만 실행하며 전부 rollback.
- 원격 Edge HTTP를 통한 14개 단계 검증: 사용자/현장/매장/계획/결과/연결 조치 저장·완료·재조회, 비동기 충돌, 권한 및 토큰 검사. 검수용 자료는 정리함.
- Supabase Security Advisors: lint 없음 확인.
- 실제 사용자의 브라우저 로그인은 사용자가 직접 수행해야 함. 로그인 이메일과 사전 등록 프로필이 일치해야 한다.

### 개인 Cloudflare 테스트 호스팅 추가 (2026-10-27)

기존 Sites의 로그인과 게이트웨이를 보존하며 개인 Cloudflare Worker에 별도 인증 어댑터를 추가했습니다. 사용자가 승인한 `ugen.kwon@gmail.com` 테스트 관리자만 새로 등록했습니다. 기존 관리자, 테이블, RPC, RLS, D1 자료는 초기화하지 않았습니다.

- 주소: https://zenifield.ugen-kwon.workers.dev/?mode=supabase
- 흐름: 브라우저 → HttpOnly 세션을 처리하는 Cloudflare Worker → 전용 서버 토큰 + Supabase Auth `/user` 검증 Edge (`zenifield-cloudflare`) → 기존 업무 검증/RPC → PostgreSQL.
- 로그인은 이메일 링크 + PKCE. 이메일 링크는 요청한 브라우저에서 엽니다. Worker에는 게이트웨이 토큰만 있고 관리자 키는 Edge에만 있습니다. 일반 클라이언트는 테이블/RPC를 직접 호출하지 않습니다.
- `zf_users`의 활성 등록 이메일과 검증된 Auth 이메일을 대조합니다. 기존에 연결된 Sites 주체를 유지하고, 신규 테스트 계정은 `supabase:<Auth UUID>`를 사용합니다. 비활성 계정은 다음 API 요청부터 거부됩니다.
- Cloudflare 전용 서버 토큰은 기존 Sites 토큰과 분리했습니다. Worker secret `ZENIFIELD_GATEWAY_TOKEN`과 Edge secret `ZENIFIELD_CLOUDFLARE_TOKEN_HASH`는 같은 쌍이어야 합니다. 토큰 교체 시 양쪽을 함께 갱신합니다.
- Auth 리디렉션 허용 목록에는 정확한 Cloudflare `/auth/callback`만 추가했습니다. 기존 항목과 이메일 템플릿은 유지했습니다. 기본 메일 발송 제한이 있으므로 실제 수신은 사용자 계정으로 확인해야 합니다.
- `node tests/run-cloudflare-supabase.mjs`: 41개 인증/쿠키/PKCE/CSRF 및 AI 경로 인증 검사.
- Cloudflare 실제 HTTP 17개 검증: 저장·재조회, 현장/매장 분리, 충돌, 매니저 권한, 세션 갱신/로그아웃, 직접 DB 접근 차단. 폐기용 DB/Auth 계정과 업무 기록은 검증 후 정리했습니다.

원래 Sites 인증을 개인 Cloudflare에서 그대로 신뢰하는 방식은 사용하지 않습니다. Cloudflare에서는 기존 D1 API를 차단하고 Supabase 운영만 제공합니다. 새 계정은 설정에서 업무 프로필을 등록한 뒤 이메일 링크로 로그인합니다. 이메일 발송 자격/SMTP 구성은 Supabase 프로젝트의 설정을 따릅니다.

### 이관 자동 적용 파이프라인 (2026-10-28)

- 워크플로 파일: `.github/workflows/supabase-deploy.yml`(활성). `main` 푸시마다 타입·전체 테스트·Cloudflare 인증 경계를 검증한 뒤 Worker를 배포한다. `supabase/`, `app/platform/mutations.ts`, `app/platform/model.ts`, 이관/번들 스크립트 변경이 있으면 먼저 `scripts/migrate.mjs` → `bundle-supabase.mjs` → Edge 2개 배포가 성공해야 Worker를 배포한다. 화면만 바뀌면 DB·Edge 단계는 생략한다. 수동 실행은 백엔드도 확인하며 `dry_run`을 켜면 목록만 확인하고 배포하지 않는다.
- 이력: `public.zf_schema_migrations(name, checksum, applied_at)`. 파일명 순으로 미적용만 실행하고 파일마다 `begin … commit`. 적용된 파일의 내용이 바뀌면 경고만 하고 다시 실행하지 않는다(새 파일로 추가).
- 저장소 Settings → Secrets → 기존 `SUPABASE_ACCESS_TOKEN`(Supabase Management API 토큰), `SUPABASE_PROJECT_REF`와 `CLOUDFLARE_API_TOKEN`(zenifield Worker 전용 배포 토큰)을 사용한다. 배포 환경은 기존 `production`이며, 승인자를 설정하면 배포 전에 승인이 필요하다. CI 빌드는 `NO_BUMP=1`, `ZENIFIELD_DEPLOY_TARGET=cloudflare`로 실행하고 생성된 `dist/server/wrangler.json`을 배포한다. Cloudflare의 기존 런타임 secret은 유지한다.
- CI는 `scripts/prepare-cloudflare-deploy.mjs`로 대상 계정·Worker를 확인한 뒤 기존 빌드 설정의 폐기된 `legacy_env=true`만 제거한 `dist/server/wrangler.ci.json`을 생성한다. 배포 명령은 `pnpm dlx wrangler@4.151.0 deploy --config dist/server/wrangler.ci.json`. Worker별 subdomain 조회를 지원하는 CLI로 고정하고 앱의 기존 빌드 의존성(4.92.0)은 유지한다. 계정 전체 권한을 토큰에 추가하지 않는다.
- 백엔드 변경은 GitHub Actions의 마지막 성공한 `main` 푸시 커밋과 비교한다(`actions: read`, 수동 `dry_run` 제외). 이전 푸시가 실패·취소됐어도 다음 푸시에서 미반영 변경을 다시 포함한다. API 조회 실패 시 검증을 중단하며, 성공 기준 커밋이 없으면 백엔드 단계도 실행한다.
- 처음 켤 때 기준선: `supabase/migrations/APPLIED_BASELINE`에 적힌 파일(손으로 이미 적용한 `visit_entry`, `domains`)은 이력 표가 비어 있는 첫 실행에서 실행하지 않고 적용됨으로만 기록된다. 사람이 따로 할 일은 없다. 필요하면 `--mark-applied`로 수동 지정도 된다.
- 초기 Supabase 시크릿 등록용 도구는 `npm run ci:secrets` (= `node scripts/set-ci-secrets.mjs`)다. 기존 Supabase Secret을 처음 등록·교체할 때만 `.env`에서 읽어 `gh`로 넘긴다. 일반 배포는 Secret을 다시 등록하지 않고 GitHub Actions 화면 또는 `npm run ci:deploy`로 요청한다. 배포 빌드·검증·인증은 GitHub에서 실행된다.
- 작성 규칙: 이관은 두 번 실행해도 안전하게 쓴다(`create … if not exists`, `drop function if exists`, 제약은 `pg_constraint` 확인 후 추가).


### 회사 Cloudflare 계정 전환 (2026-10-29)

현재 배포 대상은 `jobsky@zeniel.co.kr` 계정의 `zenifield` Worker다. 주소는 https://zenifield.jobsky.workers.dev 이며 계정 ID는 `d50191f54ac6859d1ecedddf26094351`이다. 위의 개인 계정 호스팅 항목은 이전 이력이다.

- GitHub `production` 환경과 `main` 자동 배포 순서를 유지한다. 저장소 `CLOUDFLARE_API_TOKEN`은 사용자가 발급한 회사 계정의 단일 `zenifield` Worker `Individual Workers Editor` 토큰으로 교체한다. 계정 전체 관리 권한·D1 권한은 필요 없다.
- 배포 토큰 관리 위치는 GitHub 저장소 **Settings → Secrets and variables → Actions → Repository secrets → `CLOUDFLARE_API_TOKEN`**이다. 로컬 `.env`·키체인은 필요 없다. main 푸시 시 자동 배포하며 수동 실행도 GitHub **Actions → supabase-deploy → Run workflow → main**에서 한다. `npm run deploy:cloudflare`·`ci:deploy` 역시 GitHub에 같은 수동 실행을 요청한다(GitHub CLI 로그인만 필요). [원격 자격증명 관리](cloudflare-credentials-plan.md).
- 배포 설정과 CI 계정 ID를 함께 고정하고 `prepare-cloudflare-deploy.mjs`가 다른 계정·D1/R2 바인딩을 거부한다. 새 Worker는 Supabase 전용이며 기존 개인 계정의 D1 데이터는 삭제·초기화하지 않는다.
- Worker 비밀값은 승인된 기존 `ZENIFIELD_GATEWAY_TOKEN`, `OPENAI_API_KEY`와 기존 Supabase URL·AI 모델을 등록한다. CI는 런타임 secret을 소스에 넣거나 덮어쓰지 않는다.
- Supabase 인증 허용 목록에 정확한 `https://zenifield.jobsky.workers.dev/auth/callback`을 추가했다. 기존 허용 목록·기본 Site URL은 유지한다. Edge 함수도 새/기존 정확한 두 콜백만 허용한다. DB 스키마 변경·사용자 생성·비밀번호 변경은 없다.
- 새 도메인에서는 기존 회사 계정으로 다시 로그인한다. 기존 도메인의 호스트 전용 로그인 쿠키는 새 도메인에 전달되지 않는다.
- 배포 후 `check-cloudflare-deployment.mjs`가 새 공개 주소의 커밋·Supabase 로그인 설정·비로그인 차단·기존 D1 API 차단을 확인한다.

세부 기록: [Cloudflare 회사 계정 이관](cloudflare-account-migration-plan.md).

## Cloudflare 회사 계정 이관

_원래 문서: `docs/cloudflare-account-migration-plan.md` (2026-10-30 통합)_
☁️

## Cloudflare 회사 계정 이관

2026-10-29 · Codex · 인프라 변경 · 이관 완료

---

> 💡 **목표** — `jobsky@zeniel.co.kr` 계정에서 현재 앱과 `main` 자동 배포를 유지한다. 기존 Supabase 운영 데이터와 로그인 계정은 그대로 사용한다.

### 대상과 범위

| 항목 | 설정 |
|---|---|
| 새 계정 | jobsky@zeniel.co.kr |
| 계정 ID | d50191f54ac6859d1ecedddf26094351 |
| Worker | zenifield |
| 공개 주소 | https://zenifield.jobsky.workers.dev |
| 배포 | GitHub main → 기존 production 환경 → 검증·필요한 Edge → Cloudflare |
| 토큰 | 계정 소유 zenifield-github-actions, 단일 Worker의 Individual Workers Editor |
| 데이터 | 기존 Supabase 유지, 회사 Worker에는 D1/R2 바인딩 없음 |

사용자가 이번 계정 전환을 요청했으며 이메일 인증과 배포 토큰 발급을 직접 완료했다. 기존 Gateway/OpenAI 비밀값의 새 Worker 등록도 승인했다. 이 문서는 `DC-INFRA`의 별도 인프라 작업 기록이다. 배포 토큰은 GitHub Actions 암호화 Secret에 보관하며 로컬 `.env`·키체인에 의존하지 않는다. [원격 자격증명 관리](cloudflare-credentials-plan.md).

### 준비·변경

- 새 계정에서 Worker 생성과 `jobsky.workers.dev` 하위 도메인을 확인했다.
- 승인된 기존 Worker 비밀값 4개를 등록했다. 값은 대화·소스·문서에 기록하지 않는다.
- Supabase 로그인 콜백에 새 정확한 주소를 추가하고 기존 항목과 기본 Site URL 보존을 확인했다.
- Edge 함수가 새/기존 정확한 콜백만 허용하게 수정했다. 비슷한 외부 도메인·HTTP·추가 쿼리를 거부하는 회귀 검사를 추가했다.
- `wrangler.cloudflare.json`과 CI에 회사 계정을 고정했다. 과거 개인 계정의 D1 바인딩을 새 Worker에 연결하지 않는다. 기존 자원은 삭제하지 않는다.
- 배포 후 공개 주소의 커밋·인증 경계를 확인하도록 CI를 강화했다.

### 로컬 검증

- 타입 검사·전체 테스트 통과.
- Cloudflare 인증 경계 13개·Cloudflare/Supabase 61개 통과.
- 배포 커밋·공개 인증 검사 5개, 계정 고정·바인딩 검사 6개 통과.
- 회사 계정 대상 빌드 및 배포 설정 검사 통과. 버전 `0.1.4`.
- 운영 DB 스키마와 로그인 계정·비밀번호는 변경하지 않는다. 계정 생성·쓰기 검수 스크립트는 실행하지 않는다.

### 운영 반영 결과

- GitHub 저장소의 암호화된 Cloudflare 배포 토큰 교체 완료. production 환경에 옛 값을 덮어쓰는 동명 secret이 없음도 확인했다.
- 소스 커밋 `ca57cea`의 [자동 배포 40799902115](https://github.com/Zeniel-Jobsky/Zenielfield/actions/runs/40799902115)에서 verify → migrate-and-deploy → cloudflare-deploy가 모두 성공했다. DB 스키마 변경은 없고 Edge 로그인 콜백 변경을 배포했다.
- 새 공개 주소 `/version.json`이 `v0.1.4 · ca57cea`와 일치한다. 새 계정 Worker 메타데이터에서도 기존 로그인·AI 비밀값 4개와 Supabase 로그인 모드, D1/R2 바인딩 없음을 확인했다.
- Chrome에서 새 주소의 회사 이메일·비밀번호 로그인 화면과 `로그인 없이 체험하기` → 운영 현황 데모 진입을 확인했다.
- 비로그인 데이터 API 401, 기존 D1 API 503, 존재하지 않는 검증용 주소의 비밀번호 로그인 401을 확인했다. 마지막 검사는 기존 Worker→Supabase 서버 토큰 연결을 검증하며 계정 생성·DB 쓰기는 수행하지 않았다.
- 실제 사용자 비밀번호로의 로그인과 유료 AI 호출은 실행하지 않았다. 새 도메인에서 기존 회사 계정으로 다시 로그인하면 된다.
- 기존 개인 계정의 Worker·D1·기존 로그인 콜백은 전환 중 보존했다. 앞으로 main의 자동 배포 대상은 회사 계정이다.

참고: [Cloudflare Worker 권한](https://developers.cloudflare.com/workers/authorization/workers/), [Supabase 인증 설정 API](https://supabase.com/docs/reference/api/v1-update-auth-service-config).

## Cloudflare 원격 배포 자격증명

_원래 문서: `docs/cloudflare-credentials-plan.md` (2026-10-30 통합)_
☁️

## Cloudflare 원격 배포 자격증명

2026-10-29 · Codex · 인프라 설정

---

> 💡 **기준** — 배포 토큰은 GitHub의 암호화된 Actions Secret으로 관리한다. 로컬 `.env`와 운영체제 키체인 없이 GitHub에서 빌드·검증·배포한다.

### 보관 위치

| 용도 | 위치 |
|---|---|
| 회사 Worker 배포 토큰 | [GitHub Actions Repository secrets](https://github.com/Zeniel-Jobsky/Zenielfield/settings/secrets/actions)의 `CLOUDFLARE_API_TOKEN` |
| 배포 대상 | `jobsky@zeniel.co.kr` 계정의 `zenifield` Worker |
| 앱 실행 비밀값 | Cloudflare Worker의 Settings → Variables and Secrets (`ZENIFIELD_GATEWAY_TOKEN`, `OPENAI_API_KEY` 등 기존 값) |

Cloudflare 배포 토큰은 GitHub 러너가 Cloudflare에 인증할 때만 필요하다. 앱 실행용 Worker Secret에 배포 토큰을 중복 등록하지 않는다. 사용자 요청에 따라 로컬 키체인 방식은 사용하지 않는다.

### 배포 방법

- 자동: `main`에 푸시하면 기존 `supabase-deploy` 워크플로가 실행된다.
- 브라우저 수동: [GitHub Actions](https://github.com/Zeniel-Jobsky/Zenielfield/actions/workflows/supabase-deploy.yml)에서 **Run workflow → main**을 선택한다. `dry_run`은 끈다.
- CLI 수동: GitHub CLI 로그인 후 `npm run ci:deploy` 또는 `npm run deploy:cloudflare`를 실행한다. 두 명령은 원격 main 워크플로를 요청할 뿐 로컬 파일을 빌드·배포하거나 Secret을 다시 등록하지 않는다. 커밋하지 않은 로컬 수정은 포함되지 않는다.

원격 러너는 `secrets.CLOUDFLARE_API_TOKEN`을 배포 단계에 전달한다. Secret이 없으면 명확한 오류와 함께 중단한다. 토큰을 로그·소스·산출물에 기록하지 않는다. 기존 `ci:secrets` 도구는 Supabase Secret 최초 등록·교체 용도이며 일반 배포 경로에서 제외했다.

### 확인 기록

- GitHub API 메타데이터에서 Repository Secret 존재와 등록 시각을 확인했다(2026-10-29 10:20 KST). 값은 조회하지 않았다.
- `production` 환경에 같은 이름의 다른 토큰이 덮어쓰는 설정이 없음을 확인했다.
- 기존 [성공한 원격 배포](https://github.com/Zeniel-Jobsky/Zenielfield/actions/runs/40800393386)는 GitHub Secret으로 회사 Worker를 배포했다.
- 로컬 루트 `.env*` 파일에 해당 토큰 항목이 없고, 앞서 지정한 로컬 키체인 항목도 없음을 확인했다. 로컬 토큰 저장·읽기 스크립트는 현재 저장소에 없다.
- 타입 검사·전체 테스트·Cloudflare 배포 검사 11개·Cloudflare 대상 빌드(`NO_BUMP=1`)를 통과했다. `.env`·로컬 토큰 없는 임시 디렉터리에서 CLI를 대체해 배포 명령이 GitHub main 워크플로만 요청하는 것도 확인했다.

설정 근거: [GitHub Actions Secret](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets), [워크플로 수동 실행 CLI](https://cli.github.com/manual/gh_workflow_run).

## Git 작업 계정

_원래 문서: `docs/git-account-plan.md` (2026-10-30 통합)_

2026-10-29 · 저장소 계정 설정 완료

### 확인한 상태

기존 origin은 이미 `https://github.com/Zeniel-Jobsky/Zenielfield.git`이었다. 전역 작성자·커미터 설정은 prodigk/ugen.kwon@gmail.com, 저장된 HTTPS 인증 계정도 GitHub `/user` 확인 결과 prodigk였다. GitHub 연결 플러그인 계정 역시 prodigk로, 로컬 Git 인증과 별개다.

### 적용 범위

- 저장소 로컬 author/committer: `Zeniel-Jobsky <jobsky@zeniel.co.kr>`.
- 저장소 로컬 GitHub credential username: Zeniel-Jobsky, 기본 푸시 대상 origin.
- 공식 GitHub CLI의 브라우저 인증으로 새 계정을 연결하고 토큰은 OS 자격증명 저장소에 보관한다. 다른 저장소의 Git 사용자·자격증명 설정은 바꾸지 않는다.
- 기존 main의 prodigk 작성 커밋33개를 정정할 경우 이후 포함138개 커밋 ID가 바뀌는 것으로 사전 점검했다. 사용자 선택은 **앞으로만 적용·기존 이력 유지**이므로 이력 정정·강제 푸시는 하지 않는다.
- AGENTS Git 작업 계정·PROJECT_RULE DC-GIT-IDENTITY에 같은 규칙을 기록한다.

### 검증

- 새 author/committer의 `git var` 결과가 모두 `Zeniel-Jobsky <jobsky@zeniel.co.kr>`임을 확인했다.
- GitHub CLI 브라우저 인증 완료 후 실제 로그인 계정 Zeniel-Jobsky, 토큰의 OS keyring 보관을 확인했다.
- 저장소 로컬 `credential.https://github.com.helper`에서 기존 helper 상속을 비운 뒤 `gh auth git-credential`을 사용한다. Git이 선택한 자격증명으로 GitHub `/user`를 호출한 결과도 Zeniel-Jobsky였다.
- 저장소 로컬 기본 푸시 대상과 main의 pushRemote는 origin이다. 기존 개인 계정의 전역 Git 작성자와 osxkeychain helper는 변경하지 않았다.
- 기존 main 이력은 그대로 보존하며 사용자 선택에 따라 작성자 정정·강제 푸시는 하지 않는다.
- 이 설정 기록을 새 계정으로 커밋·일반 푸시해 저장소에 반영한다. 서비스 코드·UI·데이터 변경은 없다.

GitHub 연결 플러그인은 로컬 Git과 별개로 prodigk 연결 상태다. 이번 변경은 이 저장소의 CLI 커밋·푸시에 적용한다. 연결 플러그인을 통한 쓰기는 인증 계정을 확인한 뒤 수행해야 한다.

## 데모 데이터 주입 파이프라인

_원래 문서: `docs/seed-pipeline.md` (2026-10-30 통합)_

기준: 2026-10-28.

### 원칙

- 앱 코드·배포·마이그레이션과 분리. 앱 데모 모드(`app/platform/demo.ts`)는 가상 데이터만 유지
- 운영 Supabase에 현재 데이터 그대로 적재 → 데모 시연
- 모든 시드 행 = id 접두사 `demo-`·`zeniel-` + `data.seed='demo-seed'` → purge로 통째 삭제
- 실제 관리자 계정·비시드 행은 건드리지 않음

### 구성

| 파일 | 역할 |
| --- | --- |
| `seed/build.ts` | 데이터 조립 · SQL 생성 |
| `scripts/seed.mjs` | CLI: build · apply · purge |
| `data/zeniel-branches-geo.csv` | 지사 7곳 → 현장 (고객사 제니엘) |
| `data/zeniel-stores-candidates-geo.csv` | 매장 후보 54곳 → 가장 가까운 지사 산하 매장 |
| `seed/out/` | 생성물 (git 제외) |

### 데이터

- 가상 데모 생성기 그대로: 사용자 30 · 현장 100 · 매장 500 · 방문 · 조치
- + 지사 7 (수동 관리) · 매장 54 (월 1회), 담당 리테일운영팀 1파트
- 적재 테이블: users · sites · stores · assignments · policy_versions · visits · actions
- 기준일 = 실행일(Asia/Seoul) → 실행 시점마다 방문 일정 재계산

### 실행

- `node scripts/seed.mjs build` → `seed/out/seed.sql`·`purge.sql`·`seed.json`
- `node --env-file=.env scripts/seed.mjs apply` → purge + seed 한 트랜잭션
- `node --env-file=.env scripts/seed.mjs purge` → 시드 행만 삭제
- 필요: `SUPABASE_ACCESS_TOKEN` (Management API)

### 검증

- `tests/run-seed.mjs`: 지사·매장 수, 상위 현장 연결, 담당자, 코드 중복, 태그·purge, GPS 거리
- PGlite에 `schema.sql` 적용 후 seed → 재적재 → purge → `zf_read` 조회 확인 (수동, 저장소 미포함)

### 2026-10-28 갱신

- `zf_domains` 적재 추가, 사용자 `domains`, 현장 `domain` 컬럼 포함
- PGlite 검증: 도메인 3 · 현장 107 전부 도메인 지정 · 사용자 30 전부 도메인 보유

### HR-biz 가상 방문 DB (2026-10-28)

- 원본: `ZeniField_HRbiz_3개팀_가상방문DB.xlsx` (카카오톡 수신) → `node scripts/import-hrbiz.mjs data/<xlsx>` → `data/hrbiz-demo.json` (좌표는 기존 JSON에서 이어받음, 외부 지도 API 미사용 · 문제 판정은 `data/hrbiz-judgments.json`을 방문 ID로 붙임)
- `scripts/seed.mjs`는 이 JSON이 있으면 가상 생성기 대신 사용. 지사 7곳·매장 후보 54곳은 그대로 추가
- 읽는 시트: 잡매니저_30명 · 현장_100개 · 매장_500개 · 방문기록_DB · 후속조치_DB. 브리핑·문구·코드북은 파생 자료라 미사용
- 결과: 사용자 30 · 현장 100(+7) · 매장 500(+54) · 방문 1,800(2026-07-06~10-26) · 조치 972 · 도메인 2(인재사업 HR · SE운영 SE)
- 매핑: 월 1회→month/1 · 월 2회·격주 1회→month/2 · 주 1회→week/1 · 필요 시→manual
- 조치 상태 `기한 초과`→`조치 예정` (초과 여부는 기한으로 계산), 원값 `sourceState` 보존
- 방문 = 전부 완료 기록, `entry:'manual'`, `requirementId` 없음(회차는 기간 매칭). 활동유형·우선순위·템플릿은 data에 보존
- 좌표: 실제 지점명(전자랜드) 25곳 중 24곳 Kakao 키워드 일치, `전자랜드 스페이스1점` 미확인. 가상 매장명은 좌표 없음
- 주의: 매장 55곳은 담당자 파트가 상위 현장 파트와 다름(원본 그대로). 앱에서 그 매장을 수정하면 담당자 재지정 필요
- PGlite 검증: 적재·재적재·purge·`zf_read` 통과 (도메인 2, 현장 107, 매장 554, 방문 1,800, 조치 972, 배정 ≥ 661)
- 운영 적재(2026-10-28): 이관 `20261028000000_visit_entry` · `20261028100000_domains` 적용 → `seed.mjs apply` → Edge `zenifield-gateway` 재배포. 결과: 도메인 2 · 사용자 32(실제 2 포함) · 현장 107 · 매장 554 · 방문 1,800 · 조치 972 · 배정 689

## 관리 도메인

_원래 문서: `docs/domain-plan.md` (2026-10-30 통합)_

기준: 2026-10-28.

### 진단

- DB 분류 축 = 팀·파트(자유 문자열)뿐. 사업부는 코드에 `'유통사업부'` 고정
- 대상자(멤버)가 어느 업무 영역을 관리하는지 기록 없음 → 등록·배정 시 영역 검증 불가
- 운영 DB: 사용자 2명(유통운영팀·테스트팀), 현장·매장 0

### 설계

- `domain` 엔티티 = 관리 도메인 (예: 리테일 · 서비스 · 물류). 관리자만 등록·비활성
- 사용자 `domains[]` = 그 멤버가 관리하는 도메인. 관리자·사업부장 = 전체
- 현장 `domain` 필수 · 활성 도메인만. 매장 = 상위 현장 도메인 상속
- 등록 규칙: 등록자(팀장·파트장)가 관리하는 도메인만 선택 가능. 담당자도 그 도메인 관리자여야 함
- 조회 범위: `domains` 있는 사용자 = 그 도메인 대상만. 비어 있으면 기존 팀·파트 범위 (이관 전 계정)
- `division`(사업부 표시) = 도메인 이름으로 파생. 필터 "사업부" → "도메인"

### DB

- `zf_domains(id, code unique, name, active, version, data)`
- `zf_users.domains text[]`, `zf_sites.domain → zf_domains`
- `zf_can_target`·`zf_write`에 도메인 검사 추가
- 이관: `supabase/migrations/20261028100000_domains.sql`

### 화면

- 설정 → 관리 도메인 목록·등록·비활성
- 사용자 등록 → 관리 도메인 체크
- 현장 등록 → 도메인 선택(본인 관리 범위), 매장 = 상속 표시
- 필터 → 도메인

### 데모·시드

- 데모 도메인 3개(리테일·서비스·물류) = 팀 구성과 1:1, 사용자·현장에 부여
- 시드 파이프라인: `zf_domains` 적재, 지사·매장 후보 = 리테일

### 검증 (2026-10-28)

- 단위: `tests/run-platform.mjs` 도메인 12건 (조회 범위·필수·비활성·권한·상속·사용자 도메인)
- DB(PGlite, `schema.sql`): 팀장 타 도메인 등록 → `DOMAIN`, 미지정 → `DOMAIN`, 담당자 도메인 불일치 → `ASSIGNEE`, 매장 상속 확인, 팀장 `zf_read` = 본인 도메인 현장만
- 운영 DB 적용 전: 기존 사용자 2명 `domains` 비어 있음 → 전체 범위 유지. 현장 0건이라 기존 행 영향 없음

