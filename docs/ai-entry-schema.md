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
