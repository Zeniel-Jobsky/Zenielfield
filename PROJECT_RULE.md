---
architecture_docs: ""
---

# Project Rules

## Architecture Boundaries

> [!NOTE] **To AI Agents**
> If `architecture_docs` is empty and no rules are defined below,
> this project has no architecture rules yet.
> → Ask user to define them, or analyze codebase and propose a draft.
> → Do NOT make assumptions about project architecture.

### Module Ownership
<!-- Define which modules exist and who owns them -->
| Module | Owner | Editable |
|--------|-------|----------|
| `app/` | 화면·API 라우트 (`app/platform` 운영 앱, `app/briefing` 브리핑) | Yes |
| `lib/` | 서버 어댑터 (Cloudflare·Supabase 인증) | Yes |
| `supabase/` | 스키마·이관·Edge 함수. 원격 적용은 승인 후 (DC-INFRA) | Yes |
| `seed/`, `data/` | 데모 주입 파이프라인·원본 데이터 | Yes |
| `scripts/` | 개발·번들·운영 스크립트 | Yes |
| `docs/` | 지침·계획·현황 (DC-DOCS, DC-DESIGN) | Yes |

### Dependency Direction
<!-- Define allowed dependency directions between modules -->

## DC-CODEGEN: Generated File Mapping

> [!IMPORTANT] **REQUIRED**
> Agents use this table to decide which files are safe to edit.
> Files not listed here → agent MUST ask user before editing.

| Generated (DO NOT EDIT) | Source (edit here) | Build command |
|-------------------------|-------------------|---------------|
| `dist/` | `app/`, `lib/`, `worker/` | `npm run build` |
| `supabase/functions/zenifield-gateway/logic.js` | `app/platform/mutations.ts`, `app/platform/model.ts` | `node scripts/bundle-supabase.mjs` |
| `data/hrbiz-demo.json` | HR-biz xlsx | `node --env-file=.env scripts/import-hrbiz.mjs <xlsx> --geocode` |
| `seed/out/` (git 제외) | `seed/build.ts`, `data/` | `node scripts/seed.mjs build` |

## DC-* Guards (project-specific)

| Guard | Condition → Action |
|-------|-------------------|
| DC-DESIGN | UI·디자인 변경 → `docs/DESIGN-zenielfield.md` 해당 절 확인 → 지침에 없거나 다르면 지침 먼저 갱신 → **같은 변경에서 `AGENTS.md` "현재 디자인 결정"과 이 항목도 갱신(빠지면 미완료)** → 구현 → 390/820/1280px 실화면 검증 → `docs/` 기록 |
| DC-DESIGN-NOW | 딥그린 `#003c33` 단일 강조(이행률만) · 현장·매장 탭 하단선→지표 셀 간격 PC·태블릿 16px/모바일 12px, 셀은 상단 1px 구조선·왼쪽 컬러 테두리 없음 · 모바일 데모·운영 전환 문구 줄바꿈 허용 · 상태색 완료 `#003c33`/예정 `#516e8a`/지연 `#b42318`/미등록 `#8a4b00` · 도넛·게이지 금지 · 조직 막대 딥그린 단색 · 목표선은 설정된 목표만 · 축·범례 12px · 대시보드 = 조회 범위→핵심 지표→차트(12열, 7개 이내)→브리핑→표 · 모바일 제목 26px/메타 11px 이상/터치 44px · 옅은 표면은 `--zf-warning-soft #fdf4e7`·`--zf-info-soft #eef2f6`만 · 글자 하한 11px(축·범례 12px) · 화면 파일 전체 색 점검 통과 상태 유지 · 등록 화면 AI 기본·전환 링크 아이콘+간격·계획 자동 연결 ±14일 · 갱신 2026-10-28 |
| DC-DESIGN-CHECK | 커밋 시 `.githooks/pre-commit` → `scripts/check-design.mjs` 경고(지침·룰 동반 갱신, 지침 밖 색). `npm run setup`으로 활성화, `DESIGN_STRICT=1`이면 차단 |
| DC-DOCS | 개선 계획·이슈·완료 내역은 `docs/`에 기록, 담당자 배정은 `work/`에만 |
| DC-DEPLOY | 운영 반영 순서: 이관 적용 → `bundle-supabase.mjs` → Edge 재배포(gateway, cloudflare) → 화면. 이관은 옛 스키마에 로컬 선적용 검증. `schema.sql` 운영 재실행 금지. 운영 DB·Edge·계정 발급은 사용자 승인 후. 반영 내역 `docs/` 기록 |
| DC-AUTH | 로그인 우선 진입. 회사 계정(`ZENIFIELD_AUTH_PROVIDER=supabase-email`, 등록 이메일+비밀번호) 기본. 계정 공용(모든 서버 공유). 에이전트는 계정·권한을 스스로 만들지 않음. 비밀번호 원문 기록 금지 |
| DC-DATA | 조회는 기간 창(선택 기간+앞 8주+뒤 6주, 미완료 조치 항상). 시드는 출처 표시. 출처 없는 기존 방문 1만 건은 별도 묶음으로 보존(삭제 금지). 데모 기준 = HR-biz 엑셀 |
| DC-LOCAL | 개인 서버 설정은 git 제외 `vite.config.local.mjs`. 공유 설정 파일에 개인 주소·인증서 금지. `.env` 비공유 |
| DC-HALT | Infrastructure error → stop, no bypass, report to user. |
| DC-INFRA | Bootstrap/transport/DB/routing code → separate ticket + approval. |

## Build & Test

| Action | Command |
|--------|---------|
| Build | `npm run build` |
| Test | `node tests/run-platform.mjs` · `run-briefing` · `ui-metrics` · `logic` · `run-geo` · `run-seed` · `run-supabase` · `run-cloudflare-auth` · `run-cloudflare-supabase` (`tests/*.mjs`) |
| Design check | `node scripts/check-design.mjs <파일...>` (인자 없으면 스테이징 파일) |
| Type check | `node_modules/.bin/tsc --noEmit -p .` |
| Dev server | `npm run dev` (PC별 설정은 git 제외 `vite.config.local.mjs`) |
| Lint | `npx deuk-agent-flow lint:md` |
