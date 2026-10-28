# AI 간편 등록 · 직접 입력 분리 스키마

기준: 2026-10-28. [AI 간편등록 개발 계획](ai-quick-entry-plan.md)의 방문결과 흐름 기준.

## 원칙

- 입력 방식 = 방문 기록 단위 판별값 `entry` (`manual` | `ai`)
- 화면 분리: AI 간편 등록 → `AiVisitForm`, 직접 입력 → `PlatformForm`. 서로 전환 없음
- AI 화면 = 대상 선택 · 말·글·사진 · AI 초안 검토만 표시
- 완료된 기록의 `entry` 변경 불가. 계획(planned)은 결과 입력 시 `entry` 결정
- AI 기록 = 방문 결과(completed)만

## `zf_visits.data`

| 키 | 직접 입력 | AI 간편 등록 |
| --- | --- | --- |
| `entry` | `manual` (없으면 manual) | `ai` |
| `ai` | 없음 (저장 시 제거) | 필수 |
| `purpose·detail·notes·result` | 사용자 입력 | 검토 후 최종값 |

## `ai` 기록

| 키 | 내용 |
| --- | --- |
| `input.text` · `input.imageCount` | 원문 메모, 사진 수(0–3, 사진 미저장) |
| `draft` | AI 초안 `purpose·detail·notes·result` |
| `edited` | 초안과 다른 칸 목록 (서버가 계산) |
| `summary` · `category` · `urgency` | 한 줄 요약, 분류, 긴급도 (선택지 밖 값 제거) |
| `confidence` · `model` · `generatedAt` | 확신도, 모델명, 생성 시각 |

## DB

- 생성 컬럼 `zf_visits.entry` + 인덱스 (대시보드 필터용)
- 제약: `entry` ∈ (manual, ai) · `entry='ai'` ⇔ `data.ai` 존재 · AI는 completed + `input`·`draft` 객체
- 이관: `supabase/migrations/20261028000000_visit_entry.sql`. 원격 미적용
- 이전 형식(`extra`·`aiAssisted`·`aiFields`)은 저장 시 제거

## 검증 위치

- `app/platform/mutations.ts` `aiEntryOf` → `logic.js` 번들 (Edge 동일)

## 목록 표시 (방문 결과·이력)

- AI 기록 = "AI 작성" 배지 · 수정 칸 수 · 긴급도 · 분류 · 한 줄 요약
- 상단 칩: AI 작성 · 긴급도 높음 · 분류 5종 건수, 누르면 필터

## `aiEdits` — 기입력 결과 AI 정리 기록 (2026-10-28)

| 키 | 내용 |
| --- | --- |
| `model` · `generatedAt` | 제안을 만든 모델·시각 |
| `appliedAt` · `byId` | 반영 저장 시각·반영한 사용자(서버 기록) |
| `before` · `proposed` | 제안 당시 값과 AI 제안값 (`purpose·detail·notes·result`) |
| `applied` | 실제 반영된 칸(저장값 = 제안값 ≠ 이전값). 서버가 계산 |

- `entry`와 무관하게 `manual`·`ai` 기록 모두 가질 수 있다. 최근 10개 보관. 클라이언트가 보낸 `aiEdits`는 무시하고 서버 보관본만 쓴다.
- 제약: `zf_visits_ai_edits_array` (배열). 이관 `supabase/migrations/20261028130000_ai_edits.sql`.
- 대시보드 `AI 현황 요약`(`mode:'brief'`)은 저장하지 않는다. 입력은 `app/platform/ai-brief.tsx` `buildDigest()`의 집계 숫자뿐이다.
