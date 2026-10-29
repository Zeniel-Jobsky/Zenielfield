# 문서 최신화 및 정적 검증 기록

2026-10-29 · [문서 허브](../README.md)

## 기준과 보존

대상은 https://github.com/Zeniel-Jobsky/Zenielfield 만이다. 최신 조회 main 475280dcc4ae8f493a19d23433eb8779138c9880에서 docs/zenifield-manual-final-20261029 작업 트리를 만들었다. 이전 문서 커밋 e490e44와 docs/documentation-hub-20261029의 PROJECT_RULE.md 충돌 상태는 보존했다. 이전 브랜치를 병합하지 않고 문서별로 가져왔다.

## 대조와 수정

- 메뉴 8개·역할 5개를 app.tsx·model.ts·mutations.ts·users.tsx와 대조했다.
- package.json·setup.mjs·run-framework.mjs 기준으로 Node 22.13 이상·pnpm 11.25·기본 테스트 8개 실행기를 안내한다.
- 브리핑의 AI 해석 더 보기·접기 상태 보관과 판정 표시 이름을 반영했다.
- AI 폼 초안 필수·판정 검토 후 저장을 명시했다. 메모만의 수동 저장·직접 입력 전환 시 메모 전달은 구현 완료로 안내하지 않는다.
- 방문 목록·대상 상세는 날짜 내림차순이다. 실제 시간·동률 이력 정렬은 해당 main에서 확인되지 않았다.
- 사용자·도메인·비밀번호와 필요 시 주기의 역할 제한을 관리자 가이드에 추가했다.
- 인덱스 표를 정리하고 관리자 가이드를 연결했다. 누락된 repo-dev-plan-v1-current 문서는 링크를 해제하고 누락 사실을 유지한다.

## 과거 안내와 한계

README 원문은 과거 기록으로 접어 보존한다. demo-walkthrough·weekly-briefing·AI/GPS 초기 계획·platform-integration은 당시 설계/기록이며 현재 절차는 새 가이드를 우선한다. GPS_ENABLED/GEO_SEARCH_ENABLED는 false다. D1 코드 제거와 실제 자료 보존·이관 여부는 별개다. 디자인 지침의 초기 차트 미구현 표현과 후속 구현 기록 혼재는 디자인 기준을 변경하지 않고 확인 과제로 남긴다.

원래 작업 폴더의 미커밋 개선은 최신 main에 반영되었다고 간주하지 않았다. 실제 .env·비밀값은 조회하지 않았다. 실제 로그인·AI·DB 저장·계정 발급·새 PC 설치·브라우저 검수·배포는 하지 않았다. 문서만 변경하므로 빌드·앱 테스트는 실행하지 않는다.

## 변경 범위와 검증

README, 설치·사용·관리자 가이드, 본 보고서, feature-status, 계획001, repo-dev-plan-v2의 8개 Markdown 파일만 변경한다. AGENTS·PROJECT_RULE·디자인 지침·코드·환경설정은 변경하지 않는다. 상대 링크·제목 앵커·인덱스·충돌 표식·문서 외 차이·git diff --check를 검사하고 결과를 아래에 기록한다. push는 승인 전까지 하지 않는다.


## 최신 main 재확인

최초 문서 준비 후 원격 main이 475280d로 이동해 그 커밋에서 새 최종 브랜치를 만들고 문서 변경을 유지했다. 추가된 후속 조치 정렬·테스트 8개 실행기·브리핑 생성 안내와 문서 2개 인덱스를 반영했다. 기존 충돌 작업 트리와 main은 변경하지 않았다.

## 정적 검사 결과

변경 대상은 Markdown 8개뿐이다. 상대 링크 170개·제목 앵커 23개·README 인덱스 문서 40개를 검사했고 누락 0개다. 인코딩·충돌 표식·문서 외 변경 검사 통과. git diff --check도 별도 실행한다. 기존 문서 커밋 e490e44와 PROJECT_RULE.md 충돌은 보존했고 새 브랜치는 아직 commit·push하지 않았다.
