# 중복 표현 정리 · 브리핑 상태 표시 계획

2026-10-30 · 근거: DC-FEEDBACK ⑧ 한 화면 한 번, 지침 6.1-A · 상태: 2026-10-30 구현 (아래 F)

## 근거(웹 조사)

- 중복 제거가 차트 추가보다 가독성에 효과 큼 → [Made Good](https://madegooddesigns.com/dashboard-design-principles/)
- 같은 지표 반복은 "다른 질문"에 답할 때만 허용(숫자+추이 짝) → [Dashboard Design Patterns](https://dashboarddesignpatterns.github.io/processguidelines.html)
- 요소마다 목적 기여 확인, 아니면 제거 → [Domo](https://domo.com/learn/article/top-10-dashboard-design-mistakes-and-what-to-do-about-them)
- 다른 목적은 다른 화면으로 분리 → [Improvado](https://improvado.io/blog/dashboard-design-guide)
- 대기 2–10초 = 진행 표시, 10초+ = 진행 막대, 스켈레톤은 진행 표시로 쓰지 않음 → [NN/g Skeleton](https://nngroup.com/articles/skeleton-screens/)

## A. 메뉴·머리 중복

| 위치 | 중복 | 정리 |
|------|------|------|
| 상단 `워크스페이스 > {메뉴}` + 눈썹 `WORKSPACE / FIELD…` + H1 | 메뉴 이름 3회 | 눈썹 제거, 상단 경로는 모바일만 |
| H1 아래 `pageDescriptions` | 메뉴 이름 풀어 쓴 문장 | 유지하되 메뉴 이름 반복 금지 |
| 대시보드 `BriefingPreview`(주간 업무 요약) | 메뉴 `주차별 활동 요약`과 같은 내용 | 한 줄 링크로 축소 |
| 브리핑 제목 `주차별 AI 핵심요약` | 메뉴 이름과 이중 | `AI 핵심 요약` 하나로 |

## B. 지표·차트 중복(대시보드)

| 숫자 | 나오는 곳 | 남길 곳 |
|------|-----------|---------|
| 방문 이행률 | DecisionStrip · ScopeRisk 열 · TrendCombo 상자 | 지표 칸(현재값) + 추이(흐름)만 |
| 지연·계획 미등록 | DecisionStrip · DelayHeatmap · 운영 상태 원그래프 · NudgeBand | 지표 칸 + 히트맵, 독려 띠에선 제외 |
| 기한 초과 조치 | DecisionStrip · IssueTypeChart · ScopeRisk 열 · 브리핑 챙길 곳 | 지표 칸 + 유형 차트 |
| 60일+ 미방문 | DecisionStrip · VisitAgeChart 60+ 막대 · 브리핑 | 지표 칸, 막대는 강조 없이 |
| 챙길 대상 목록 | 브리핑 `먼저 챙길 곳` · `SiteDiagnosis`(우선 확인 현장) | 브리핑 하나, 진단은 원본 이동 링크로 |
| 잡매니저 홈 카드 | ManagerHome 카드 · DecisionStrip | 한쪽만 |

## C. 대시보드 ↔ 통계·보고서

- `TypeWeekly`(현장·매장 주별 이행률) ≈ `TrendCombo`(주별 이행 추이) → 보고서는 기간 비교 전용으로 남기고 대시보드는 최근 8주만
- `TeamBars`(조직별 이행 구성) ≈ `ScopeRisk`(조직별 방문 공백) → 보고서 전용, 대시보드는 공백표만
- `VisitMetrics` ≈ `DecisionStrip` → 보고서는 인쇄용 표로 대체
- `TeamBars` 부제 `이행률 높은 순` → DC-FEEDBACK ③ 순위 금지 위반, 조직 순서로

## D. 브리핑 안 중복 표현

- 반짝이 아이콘: 제목 + 칸 제목 4곳 → 제목 1곳 + AiMark만
- 진행 단계: 문장(`보고를 읽고…`) + 단계 목록(`읽고 살피기`) 동시 표시 → 단계 목록만, 문장은 현재 단계에 붙임
- 상태 문구 3종 겹침: 머리 `브리핑 작성 중` · 본문 진행 카드 · 아래 `조건이 바뀌어 다시 쓰는 중` → 머리 한 곳
- `role="status"` 2개 동시(머리·진행 카드) → 낭독 중복, 하나로
- 펼침 단추 2종(`더 보기`·`브리핑 접기`) → 역할 문구 분리 유지, 위치 고정
- `먼저 챙길 곳`의 `받는 사람 · ` 접두와 `전할 말` 칸 → 받는 사람 같으면 한 곳에만

## E. 브리핑 준비 중·준비 후 표시

| 상태 | 지금 | 바꿀 것 |
|------|------|---------|
| 대기(0.7초 지연) | 스켈레톤 + 숨은 문구 `준비하고 있어요` | 머리 칩 `준비 중` 보이게 |
| 작성 중 | 머리 스피너 + 진행 카드 | 머리 칩 `작성 중 n초` + 진행 카드 하나(10초 기준 막대 유지) |
| 다시 쓰는 중 | 이전 내용 사라짐(`busy→null`) | 이전 내용 흐리게 유지 + 칩 `다시 쓰는 중` |
| 완료 | 표시 없음, 시각은 더 보기 안 | 칩 `작성 완료 · HH:MM`(딥그린), 한 번 페이드·reduced-motion 정지 |
| 규칙 대체·확신 낮음 | 맨 아래 회색 줄 | 칩 옆 주의색 한 줄(DC-AI-FALLBACK) |
| 실패 | 빨간 오류 | 유지 |

- 칩 = 머리 오른쪽 한 자리, `aria-live="polite"` 하나, `다시 쓰기` 단추와 같은 줄
- 완료 낭독 `브리핑을 다 썼어요` 한 번

## 다음 단계

- 지침 6.1-A·9-B 갱신 → AGENTS.md "현재 디자인 결정" · DC-DESIGN-NOW 동시 갱신(DC-DESIGN)
- 구현: `app/platform/ai-brief.tsx`, `app/platform/app.tsx`, `charts.tsx`, `decision.tsx`
- 390/820/1280 실화면 확인 후 완료 처리

## F. 구현 내역 (2026-10-30)

- 삭제: 대시보드 `SiteDiagnosis`·`BriefingPreview`, 보고서 `VisitMetrics`, 상단 경로 글자
- `TeamBars` 순위 정렬 제거
- 브리핑: 제목 하나, 칸 제목 반짝이 제거, 상태 칩 `BriefState`, 가림막 `BriefCurtain` + `curtainLines`
- 미반영: 지표 칸↔차트 숫자 겹침(B표)은 숫자+분포로 질문이 달라 유지
- 확인: tsc, run-platform 95, run-briefing 45, 390/820/1280 가림막·완료 칩·가로 넘침 없음
