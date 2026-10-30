# ZenField-Live — 격리 구축 인계 (2026-10-30)

> **상태: 준비 중 / 실제 개인정보 입력 금지 / 운영 배포 미실행**

## 분리 원칙
- 테스트 DB: `nhywssfwtnonytbkufyy` (서울); 현재 웹주소 `https://zenifield.jobsky.workers.dev`에 연결. 어떤 데이터도 삭제하거나 초기화하지 않는다.
- Live DB: `cyrsdaqqnegrynhwurnb` (프랑크푸르트); 현재 실제 사용자·현장·방문 데이터는 비어 있음.
- `ops/db-targets.json`은 `targets.real.ref`만 등록했으며 `active=demo`를 유지한다. **`switch real` 명령이나 기존 Cloudflare Worker의 DB Secret 변경 금지.**
- 실서비스 도메인 `https://zenifield-live.jobsky.workers.dev`는 제안된 별도 Worker 이름이며 **아직 생성·접속 검증되지 않았다.**

## DB
- 새 DB는 `supabase/schema.sql`과 7개 마이그레이션의 적용을 확인했다.
- 9개 업무 테이블 + `zf_schema_migrations`; 각 업무 테이블 RLS 활성화, 업무 데이터 0건.
- 마이그레이션 이력 7건. 별도 Supabase 마이그레이션 로그와 코드베이스의 `zf_schema_migrations`를 모두 확인한다.
- 실제 운영 전에 `zf_read`·`zf_write` RPC, 권한별 접근·저장, 쓰기 충돌, 인증 경계를 직급별 테스트 계정으로 검증한다.

## 인증·Edge 함수
- 테스트 해시를 Live 프로젝트에 재사용하지 않는다. Live의 Edge 함수는 `ZENIFIELD_LIVE_GATEWAY_TOKEN_HASH` / `ZENIFIELD_LIVE_CLOUDFLARE_TOKEN_HASH` 없이는 모두 401(거부)이어야 한다.
- 전용 값은 각기 별도의 충분히 강한 난수 서버 토큰에서 SHA-256을 계산해 Supabase Edge Secrets에만 저장한다. **원문 토큰은 각각 서버 환경 Secret에만 저장.** Git·채팅·로그에 기록 금지.
- Live Cloudflare Worker는 별도 Worker/Secrets, Supabase URL `https://cyrsdaqqnegrynhwurnb.supabase.co`, Auth Redirect URL을 사용한다.
- 테스트 Cloudflare Worker 및 테스트 Edge 설정은 변경하지 않는다.
- SMTP, 비밀번호 분배, 운영 관리자 계정은 승인 이후 처리한다. 현재 실제 사용자를 등록하지 않는다.

## 정식 오픈 전 차단 조건
1. **데이터 위치:** Live DB가 `eu-central-1`(독일)임을 승인할지 결정. 대한민국 직원·고객정보를 저장할 계획이면 개인정보 국외이전 요건·내부정보보호 승인 검토. 가능하면 새 서울 리전(`ap-northeast-2`) 프로젝트 사용. Supabase 프로젝트의 리전은 제자리에서 바꿀 수 없다.
2. 개인정보의 AI 전송 경로, 비식별화, 접근권한, 보관·파기, 법령·내규 승인.
3. P1 일정/등록 오류와 현장·매장 CSV 대량 등록 기능 해결.
4. Live 전용 Server Token, Edge Secrets, Cloudflare Worker, GitHub CI 별도 배포 플로우 구성 및 실패 시 즉시 차단 검증.
5. 관리자 최초 등록·비밀번호·회복 절차 정리 및 테스트 후 직원·현장 데이터 반영.

## 절대 하지 말 것
- 기존 ZeniField 테스트 DB 초기화, 삭제 또는 시드 정리.
- 위 조건이 해결되기 전 `active=real`로 전환·운영 Worker 덮어쓰기.
- 실제 직원 명단을 public GitHub 또는 ChatGPT 대화에 업로드.
