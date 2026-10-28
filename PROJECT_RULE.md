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
| DC-DESIGN-NOW | 딥그린 `#003c33` 단일 강조(이행률만) · 상태색 완료 `#003c33`/예정 `#516e8a`/지연 `#b42318`/미등록 `#8a4b00` · 도넛·게이지 금지 · 조직 막대 딥그린 단색 · 목표선은 설정된 목표만 · 축·범례 12px · 대시보드 = 조회 범위→핵심 지표→차트(12열, 7개 이내)→브리핑→표 · 모바일 제목 26px/메타 11px 이상/터치 44px · 갱신 2026-10-28 |
| DC-DOCS | 개선 계획·이슈·완료 내역은 `docs/`에 기록, 담당자 배정은 `work/`에만 |
| DC-HALT | Infrastructure error → stop, no bypass, report to user. |
| DC-INFRA | Bootstrap/transport/DB/routing code → separate ticket + approval. |

## Build & Test

| Action | Command |
|--------|---------|
| Build | `npm run build` |
| Test | `node tests/run-platform.mjs` · `run-briefing` · `ui-metrics` · `logic` · `run-geo` · `run-seed` · `run-supabase` · `run-cloudflare-auth` · `run-cloudflare-supabase` (`tests/*.mjs`) |
| Type check | `node_modules/.bin/tsc --noEmit -p .` |
| Dev server | `npm run dev` (PC별 설정은 git 제외 `vite.config.local.mjs`) |
| Lint | `npx deuk-agent-flow lint:md` |
