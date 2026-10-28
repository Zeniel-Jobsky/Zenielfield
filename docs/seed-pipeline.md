# 데모 데이터 주입 파이프라인

기준: 2026-10-28.

## 원칙

- 앱 코드·배포·마이그레이션과 분리. 앱 데모 모드(`app/platform/demo.ts`)는 가상 데이터만 유지
- 운영 Supabase에 현재 데이터 그대로 적재 → 데모 시연
- 모든 시드 행 = id 접두사 `demo-`·`zeniel-` + `data.seed='demo-seed'` → purge로 통째 삭제
- 실제 관리자 계정·비시드 행은 건드리지 않음

## 구성

| 파일 | 역할 |
| --- | --- |
| `seed/build.ts` | 데이터 조립 · SQL 생성 |
| `scripts/seed.mjs` | CLI: build · apply · purge |
| `data/zeniel-branches-geo.csv` | 지사 7곳 → 현장 (고객사 제니엘) |
| `data/zeniel-stores-candidates-geo.csv` | 매장 후보 54곳 → 가장 가까운 지사 산하 매장 |
| `seed/out/` | 생성물 (git 제외) |

## 데이터

- 가상 데모 생성기 그대로: 사용자 30 · 현장 100 · 매장 500 · 방문 · 조치
- + 지사 7 (수동 관리) · 매장 54 (월 1회), 담당 리테일운영팀 1파트
- 적재 테이블: users · sites · stores · assignments · policy_versions · visits · actions
- 기준일 = 실행일(Asia/Seoul) → 실행 시점마다 방문 일정 재계산

## 실행

- `node scripts/seed.mjs build` → `seed/out/seed.sql`·`purge.sql`·`seed.json`
- `node --env-file=.env scripts/seed.mjs apply` → purge + seed 한 트랜잭션
- `node --env-file=.env scripts/seed.mjs purge` → 시드 행만 삭제
- 필요: `SUPABASE_ACCESS_TOKEN` (Management API)

## 검증

- `tests/run-seed.mjs`: 지사·매장 수, 상위 현장 연결, 담당자, 코드 중복, 태그·purge, GPS 거리
- PGlite에 `schema.sql` 적용 후 seed → 재적재 → purge → `zf_read` 조회 확인 (수동, 저장소 미포함)

## 2026-10-28 갱신

- `zf_domains` 적재 추가, 사용자 `domains`, 현장 `domain` 컬럼 포함
- PGlite 검증: 도메인 3 · 현장 107 전부 도메인 지정 · 사용자 30 전부 도메인 보유

## HR-biz 가상 방문 DB (2026-10-28)

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
