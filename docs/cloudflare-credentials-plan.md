☁️

# Cloudflare 원격 배포 자격증명

2026-10-29 · Codex · 인프라 설정

---

> 💡 **기준** — 배포 토큰은 GitHub의 암호화된 Actions Secret으로 관리한다. 로컬 `.env`와 운영체제 키체인 없이 GitHub에서 빌드·검증·배포한다.

## 보관 위치

| 용도 | 위치 |
|---|---|
| 회사 Worker 배포 토큰 | [GitHub Actions Repository secrets](https://github.com/Zeniel-Jobsky/Zenielfield/settings/secrets/actions)의 `CLOUDFLARE_API_TOKEN` |
| 배포 대상 | `jobsky@zeniel.co.kr` 계정의 `zenifield` Worker |
| 앱 실행 비밀값 | Cloudflare Worker의 Settings → Variables and Secrets (`ZENIFIELD_GATEWAY_TOKEN`, `OPENAI_API_KEY` 등 기존 값) |

Cloudflare 배포 토큰은 GitHub 러너가 Cloudflare에 인증할 때만 필요하다. 앱 실행용 Worker Secret에 배포 토큰을 중복 등록하지 않는다. 사용자 요청에 따라 로컬 키체인 방식은 사용하지 않는다.

## 배포 방법

- 자동: `main`에 푸시하면 기존 `supabase-deploy` 워크플로가 실행된다.
- 브라우저 수동: [GitHub Actions](https://github.com/Zeniel-Jobsky/Zenielfield/actions/workflows/supabase-deploy.yml)에서 **Run workflow → main**을 선택한다. `dry_run`은 끈다.
- CLI 수동: GitHub CLI 로그인 후 `npm run ci:deploy` 또는 `npm run deploy:cloudflare`를 실행한다. 두 명령은 원격 main 워크플로를 요청할 뿐 로컬 파일을 빌드·배포하거나 Secret을 다시 등록하지 않는다. 커밋하지 않은 로컬 수정은 포함되지 않는다.

원격 러너는 `secrets.CLOUDFLARE_API_TOKEN`을 배포 단계에 전달한다. Secret이 없으면 명확한 오류와 함께 중단한다. 토큰을 로그·소스·산출물에 기록하지 않는다. 기존 `ci:secrets` 도구는 Supabase Secret 최초 등록·교체 용도이며 일반 배포 경로에서 제외했다.

## 확인 기록

- GitHub API 메타데이터에서 Repository Secret 존재와 등록 시각을 확인했다(2026-10-29 10:20 KST). 값은 조회하지 않았다.
- `production` 환경에 같은 이름의 다른 토큰이 덮어쓰는 설정이 없음을 확인했다.
- 기존 [성공한 원격 배포](https://github.com/Zeniel-Jobsky/Zenielfield/actions/runs/40800393386)는 GitHub Secret으로 회사 Worker를 배포했다.
- 로컬 루트 `.env*` 파일에 해당 토큰 항목이 없고, 앞서 지정한 로컬 키체인 항목도 없음을 확인했다. 로컬 토큰 저장·읽기 스크립트는 현재 저장소에 없다.
- 타입 검사·전체 테스트·Cloudflare 배포 검사 11개·Cloudflare 대상 빌드(`NO_BUMP=1`)를 통과했다. `.env`·로컬 토큰 없는 임시 디렉터리에서 CLI를 대체해 배포 명령이 GitHub main 워크플로만 요청하는 것도 확인했다.

설정 근거: [GitHub Actions Secret](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets), [워크플로 수동 실행 CLI](https://cli.github.com/manual/gh_workflow_run).
