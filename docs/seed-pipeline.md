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
