# ZenField-Live 독립 실서비스 환경 구축 기록 (2026-10-30)

## 절대 변경하지 않는 대상

- 기존 테스트 프로젝트: `nhywssfwtnonytbkufyy` (ZeniField). 초기화·삭제·테이블 정리·직원 데이터 이관 금지.
- 기존 Worker: `zenifield` / `https://zenifield.jobsky.workers.dev`. 현행 테스트 접속 그대로 유지.
- `ops/db-targets.json`의 `active: demo` 유지. 기존 `supabase-deploy.yml`이 이 값으로 테스트 Worker를 배포하므로 `active: real`로 변경하지 않는다.

## 생성된 별도 Supabase 리소스

- 프로젝트: `ZenField-Live`, ref `cyrsdaqqnegrynhwurnb`, 리전 `eu-central-1` (독일).
- `supabase/schema.sql` 신규 빈 DB 전용 스키마로 업무 테이블 9개·RLS·RPC 설치.
- `zf_schema_migrations` 이력 테이블 및 기존 7개 이관 적용/기준선 기록; 고객사·직원·방문 실제 레코드 0건.
- `zenifield-gateway`, `zenifield-cloudflare` Edge Functions v1 배포 완료(`verify_jwt=false`, 함수 자체 x-zenifield-gateway 토큰 검사).
- **중요**: Live Edge는 테스트 환경에 하드코딩된 토큰 해시를 사용하지 않는다. `ZENIFIELD_LIVE_GATEWAY_TOKEN_HASH`와 `ZENIFIELD_LIVE_CLOUDFLARE_TOKEN_HASH`가 각자 설정되지 않으면 모든 업무 POST 요청에 401을 반환한다.
- Live 로그인 링크 콜백 허용 목록: `https://zenifield-live.jobsky.workers.dev/auth/callback` 단일 주소. Supabase Authentication → URL Configuration에서도 이 정확한 Redirect URL을 등록해야 한다.
- 2026-10-30 기준 Live DB는 비어 있으며 운영/직원 첫 로그인은 아직 불가능하다.

## 독립 배포 계획 (테스트 환경 보호)

1. 이 PR을 코드 리뷰한 다음 main에 병합한다. **병합 자체는 live Worker를 만들지 않는다.**
2. GitHub → Repository Settings → Environments에 `live`를 만들고 승인을 요구하는 protection rule을 구성한다.
3. `live` 환경 Secret에 아래 3개를 안전하게 설정한다.
   - `SUPABASE_ACCESS_TOKEN` : ZenField-Live 프로젝트에 Secrets 변경 권한이 있는 액세스 토큰
   - `CLOUDFLARE_LIVE_API_TOKEN` : 회사 Cloudflare 계정의 `zenifield-live` Worker만 배포할 수 있는 권한. 현재 `zenifield`용 토큰과 분리
   - `ZENIFIELD_LIVE_GATEWAY_TOKEN` : 비밀번호 관리자에서 관리하는 테스트와 **다른** 고강도 무작위 값
4. GitHub Actions → `zenifield-live-deploy` → Run workflow → main 실행. 이 워크플로는 `active: demo`, DB 두 ref의 일치를 검사하고, 빌드를 검증한 뒤 오직 `zenifield-live` Worker를 배포한다. Live Edge 해시와 Worker Secret을 서로 맞춘다.
5. `https://zenifield-live.jobsky.workers.dev`의 배포 버전·비로그인 401·D1 API 차단 자동 검증이 성공해야 한다.
6. Supabase Live Authentication → URL Configuration의 `https://zenifield-live.jobsky.workers.dev/auth/callback`를 등록하고 회사 SMTP 발송을 설정한다. 이 단계는 별도 승인·관리자 콘솔 작업이다.
7. 이후 승인된 관리자 계정 1명을 Live 전용으로 등록하고 역할별 로그인, 담당 범위, 기록 저장, 토큰 폐기 검증을 수행한다. 현재는 실제 직원 정보를 넣지 않는다.

## 현재 남은 보안·운영 관문

- 회사가 실제 직원·고객 정보를 독일(`eu-central-1`)에 보관하도록 승인했는지 **확인 필수**. 개인정보 국외이전 해당 여부와 위탁·보관·권한 기준 검토 전 실제 정보 입력 금지. 원할 경우 데이터 입력 전에 서울 리전에 새 프로젝트를 별도 생성해야 한다(비용 확인과 승인 필요).
- 현재 Supabase 조직 Free 요금제. 정식 상용 서비스 요금제·백업 정책·사용량/비용 한도 검토 필수.
- 공식 Live Auth Redirect URL 및 SMTP는 이 저장소만 수정해서 활성화할 수 없음.
- 기존 `scripts/db.mjs migrate real` 및 기본 `supabase/functions` 재배포는 테스트용 인증 해시를 포함하므로 **Live에서 실행 금지**. Live Edge v1은 별도 강화 배포본이므로, 이후 Edge 수정 시 Live 토큰 분리 및 단일 콜백 정책을 소스 코드로 이관한 후 별도 승인 배포할 것.
- 새 Worker의 주소는 실제 배포 후 확인; 이전 URL은 정식 Live URL이 아니다.
- 테스트 DB의 업무용 행 수를 Live로 복사하지 않는다.

## 검증 기준

- Live 공개 업무 테이블 9개 모두 RLS 사용, Data API anon/authenticated 직행 차단.
- Live `zf_users`, `zf_sites`, `zf_stores`, `zf_visits`, `zf_actions` 행 수 모두 0건(관리자 생성 전).
- Live Edge 2개 ACTIVE. 세션/서버 토큰 없는 요청은 거부.
- 테스트용 `zenifield` Worker와 테스트 프로젝트는 변경 전과 동일한 연결을 유지한다.

참고: [Supabase Secrets](https://supabase.com/docs/guides/functions/secrets) · [운영 체크리스트](go-live.md)
