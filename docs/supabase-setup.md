# Supabase 연결 및 운영 인계

2026-10-27. 서울 리전의 ZeniField 전용 프로젝트에 구성. 기존 ZeniManager 프로젝트와 기존 D1 데이터는 수정하지 않았다.

## 실행 구조

브라우저 → Sites 인증이 적용된 `/api/platform` → 서버 전용 토큰으로 인증하는 Supabase Edge Function → service_role 전용 RPC → PostgreSQL.

- 로그인은 기존 Sites/ChatGPT 방식 유지. Supabase Auth 회원가입이나 비밀번호 수집을 새로 추가하지 않음.
- 일반 브라우저·anon·authenticated 역할은 테이블/RPC에 직접 접근할 수 없음. 8개 테이블에 RLS와 명시적 차단 정책 적용.
- Edge Function은 모든 요청의 서버 토큰을 SHA-256 검증. `verify_jwt=false`는 이 별도 인증을 사용하기 때문이며 인증 생략이 아님.
- Supabase 관리자 키는 Edge Function 기본 비밀 환경에서만 읽음. 브라우저·GitHub·Sites 응답에 포함하지 않음.
- Sites 서버는 클라이언트가 보낸 사용자 ID/이메일을 사용하지 않고 플랫폼이 전달한 인증 헤더만 전달함. 다른 서버로 이전할 때는 이 신뢰 경계에 맞는 인증 어댑터 구현 필수.

## 시작하기

1. 사이트 상단 `Supabase 운영 열기` 또는 `?mode=supabase`로 진입.
2. 사전 등록된 관리자 이메일의 ChatGPT 계정으로 로그인. 계정이 다르면 DB 소유자가 `zf_users`에 올바른 관리자를 사전 등록해야 함. 누구나 최초 관리자가 되는 공개 가입 흐름은 없음.
3. 설정에서 잡매니저 이메일·팀·파트·역할 등록. 초대 메일은 자동 발송하지 않음.
4. 같은 팀·파트의 잡매니저를 선택하여 현장 → 매장 등록.
5. 방문계획 → 결과 → 후속 조치 입력. 새로고침/다른 접속에서도 DB 저장 기록 조회.

운영 DB의 가상 30명·100현장·500매장 자동 삽입은 없음. 데모는 계속 브라우저 메모리로 분리되며, 운영은 등록한 데이터부터 집계한다.

## 저장 테이블

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

## 설정·배포

- `.env.example`: 필요한 서버 환경변수 이름만 기재. 실제 값은 커밋 금지.
- Sites에서는 native runtime environment 설정에 `ZENIFIELD_SUPABASE_URL`, secret인 `ZENIFIELD_GATEWAY_TOKEN` 저장.
- Edge 코드 `index.ts`의 토큰 해시와 Sites 서버 토큰은 같은 쌍이어야 함. 배포 관리자에게 기존 값을 전달받거나 양쪽을 함께 교체해야 함.
- Edge 기본 환경의 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`(또는 `SUPABASE_SECRET_KEYS`) 사용.
- `supabase/schema.sql`은 **빈 전용 프로젝트**를 위한 설치 명세. 현재 운영 프로젝트에 다시 실행하지 않음. 원격 migration history에 이미 적용되어 있음. 기존 테이블 삭제/reset 금지.
- `node scripts/bundle-supabase.mjs`로 공용 검증 로직을 Edge용 `logic.js`에 번들. 플랫폼 검증 로직 변경 시 함께 재생성 후 Edge 재배포.
- Edge 배포와 Sites 배포는 별도. GitHub 자동 배포/동기화는 미구성.

## 기존 자료

기존 D1 바인딩·스키마·API·로그인은 보존. Supabase 운영 설정의 `기존 D1 운영 열기`에서 조회 가능. 이전 저장 자료의 이관은 아직 수행하지 않았다. 이관할 때는 원본 ID·방문 유형·배정 및 변경 이력의 대응 검증과 백업이 먼저 필요하다.

## 검증

- 기존 자동 검증 113개 유지.
- `node tests/run-supabase.mjs`: 서버 15개, Edge 10개 검사.
- `tests/supabase.sql`: 18개 DB 불변조건. 전용 프로젝트에만 실행하며 전부 rollback.
- 원격 Edge HTTP를 통한 14개 단계 검증: 사용자/현장/매장/계획/결과/연결 조치 저장·완료·재조회, 비동기 충돌, 권한 및 토큰 검사. 검수용 자료는 정리함.
- Supabase Security Advisors: lint 없음 확인.
- 실제 사용자의 브라우저 로그인은 사용자가 직접 수행해야 함. 로그인 이메일과 사전 등록 프로필이 일치해야 한다.

## 개인 Cloudflare 테스트 호스팅 추가 (2026-10-27)

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
