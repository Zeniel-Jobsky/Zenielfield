☁️

# Cloudflare 회사 계정 이관

2026-10-29 · Codex · 인프라 변경 · 진행 중

---

> 💡 **목표** — `jobsky@zeniel.co.kr` 계정에서 현재 앱과 `main` 자동 배포를 유지한다. 기존 Supabase 운영 데이터와 로그인 계정은 그대로 사용한다.

## 대상과 범위

| 항목 | 설정 |
|---|---|
| 새 계정 | jobsky@zeniel.co.kr |
| 계정 ID | d50191f54ac6859d1ecedddf26094351 |
| Worker | zenifield |
| 공개 주소 | https://zenifield.jobsky.workers.dev |
| 배포 | GitHub main → 기존 production 환경 → 검증·필요한 Edge → Cloudflare |
| 토큰 | 계정 소유 zenifield-github-actions, 단일 Worker의 Individual Workers Editor |
| 데이터 | 기존 Supabase 유지, 회사 Worker에는 D1/R2 바인딩 없음 |

사용자가 이번 계정 전환을 요청했으며 이메일 인증과 배포 토큰 발급을 직접 완료했다. 기존 Gateway/OpenAI 비밀값의 새 Worker 등록도 승인했다. 이 문서는 `DC-INFRA`의 별도 인프라 작업 기록이다. 토큰 원문은 로컬 `.env`와 암호화된 서비스 secret에만 보관한다.

## 준비·변경

- 새 계정에서 Worker 생성과 `jobsky.workers.dev` 하위 도메인을 확인했다.
- 승인된 기존 Worker 비밀값 4개를 등록했다. 값은 대화·소스·문서에 기록하지 않는다.
- Supabase 로그인 콜백에 새 정확한 주소를 추가하고 기존 항목과 기본 Site URL 보존을 확인했다.
- Edge 함수가 새/기존 정확한 콜백만 허용하게 수정했다. 비슷한 외부 도메인·HTTP·추가 쿼리를 거부하는 회귀 검사를 추가했다.
- `wrangler.cloudflare.json`과 CI에 회사 계정을 고정했다. 과거 개인 계정의 D1 바인딩을 새 Worker에 연결하지 않는다. 기존 자원은 삭제하지 않는다.
- 배포 후 공개 주소의 커밋·인증 경계를 확인하도록 CI를 강화했다.

## 로컬 검증

- 타입 검사·전체 테스트 통과.
- Cloudflare 인증 경계 13개·Cloudflare/Supabase 61개 통과.
- 배포 커밋·공개 인증 검사 5개, 계정 고정·바인딩 검사 6개 통과.
- 회사 계정 대상 빌드 및 배포 설정 검사 통과. 버전 `0.1.4`.
- 운영 DB 스키마와 로그인 계정·비밀번호는 변경하지 않는다. 계정 생성·쓰기 검수 스크립트는 실행하지 않는다.

## 남은 확인

- GitHub 저장소의 암호화된 Cloudflare 배포 토큰 교체 완료. production 환경에 이전 값을 덮어쓰는 동명 secret이 없음도 확인.
- 검증한 변경을 main에 반영하고 자동 배포가 새 계정에서 성공하는지 확인.
- 새 주소의 버전·로그인·데모 화면과 인증 경계 확인.
