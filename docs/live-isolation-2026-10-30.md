# ZenField-Live 서울 리전 독립 구축 (2026-10-30)

> **상태: 인프라 준비 완료 / 실제 개인정보 입력 금지 / 운영 웹주소 전환 미실행**

## 현재 연결
- 기존 테스트 DB: `nhywssfwtnonytbkufyy` (`ap-northeast-2`, 서울). 기존 데이터·로그인·사이트를 유지한다.
- 새 실서비스 DB: `fhrxhruchhhpfsljzqwp` (`ap-northeast-2`, 서울), 이름 `ZenField-Live-Seoul`. 실제 사용자 / 현장 / 매장 / 방문 / 조치 0건.
- 구 실서비스 후보: `cyrsdaqqnegrynhwurnb` (`eu-central-1`, 독일). 무료 플랜의 활성 프로젝트 2개 제한으로 일시 중지했다. **삭제하지 않았다.**
- `ops/db-targets.json` 설정은 `targets.real.ref=fhrxhruchhhpfsljzqwp`이지만 **`active=demo` 그대로**. 기존 Worker `https://zenifield.jobsky.workers.dev`는 테스트 DB를 계속 사용한다.

## 서울 DB 구성
- 소스 `supabase/schema.sql` 기반 9개 업무 테이블과 `zf_schema_migrations` 적용.
- `supabase/migrations/SCHEMA_INCLUDES`의 3개 항목 + 이후 4개 SQL을 반영했고 코드의 `zf_schema_migrations` 이력 7건을 기록했다.
- 업무 테이블 RLS 활성화 및 일반 사용자 직접 조회 금지.
- `zenifield-gateway`, `zenifield-cloudflare` Edge Functions 배포됨. `verify_jwt=false`는 서버 전용 해시 인증을 별도로 사용하는 구조다.
- 서버 전용 Live 토큰 해시가 설정되기 전에는 요청이 거부되도록 구성했다. 기존 테스트 토큰은 Live에 사용하지 않는다.

## 정식 오픈 전 선행 작업
1. Live 서버용 독립 토큰 2개 발급, Supabase Edge Secrets `ZENIFIELD_LIVE_GATEWAY_TOKEN_HASH`, `ZENIFIELD_LIVE_CLOUDFLARE_TOKEN_HASH` 설정. 원본은 별도 서버의 Secret에만 저장한다. Git, 채팅 및 공용 로그에 올리지 않는다.
2. 회사 Cloudflare 계정에 **독립된 Live Worker** 배포 후 Live Supabase URL 및 전용 토큰만 연결. 제안 URL `https://zenifield-live.jobsky.workers.dev`은 아직 실제 배포가 아니다.
3. Supabase Auth의 정확한 Live Redirect URLs / Site URL 및 SMTP 구성, 첫 관리자 등록·암호 설정, 비로그인·권한 없는 요청 거부 실검증.
4. 실제 직원·고객 정보의 처리 목적, 최소 수집, 접근권한, 저장·보존, OpenAI API로 전달되는 AI 입력 마스킹·비식별화 및 내부 보안 승인.
5. 제품 P1 날짜·일정·대상 선택 오류 수정, CSV 현장/매장 대량 등록, 직급별 권한 검증 후 실제 데이터 이관.

## 금지
- 기존 테스트 DB 초기화·시드 삭제·기존 Worker 연결을 Live로 변경.
- `active=real` 설정·기존 Worker 재배포 방식으로 테스트 시스템을 대체.
- 직원 명단·개인정보를 GitHub 공개 저장소나 채팅에 올리는 행위.

## 확인
- DB `fhrxhruchhhpfsljzqwp` 테이블 10개, 업무 데이터 0, RLS·접근제어 확인.
- 새 Live 프로젝트 Edge 2개 ACTIVE.
- 별도 Live Worker 및 실제 로그인/401 검증은 미완료.
