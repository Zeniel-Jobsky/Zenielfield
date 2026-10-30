# 로컬 설치·실행·설정·검증 가이드

2026-10-29 · main `475280d`의 실행 스크립트와 설정 예시를 정적으로 확인한 안내다. 새 PC 설치·서버 실행·실제 로그인·저장은 이번 문서 작업에서 시험하지 않았다. [문서 허브](../README.md) · [점검 보고서](archive/documentation-audit-2026-10-29.md)

## 개발 환경과 필수 프로그램

| 프로그램 | 저장소 기준 | 용도 |
| --- | --- | --- |
| Node.js / npm | Node.js 22.13.0 이상 | package.json engines와 setup의 버전 검사 |
| pnpm | 11.25.0 | packageManager에 고정된 패키지 관리자 |
| Git | 버전 하한 미지정 | 저장소 복제·변경 확인·공유 훅 |
| 브라우저 | 지원 버전 목록 미정 | 화면 확인. 위치·음성은 기기와 권한에 의존 |

에디터는 자유롭게 선택한다. Supabase CLI·배포 계정은 일반 로컬 데모 실행의 필수 설치 항목이 아니다. React 19·Next.js 16 API 구조를 Vinext/Vite와 Cloudflare Workers로 실행한다. 의존성 버전은 [package.json](../package.json)과 [잠금 파일](../pnpm-lock.yaml)을 따른다.

## 최초 설치

아래 명령으로 저장소를 받은 뒤 최상위 폴더에서 실행한다.

```bash
git clone https://github.com/Zeniel-Jobsky/Zenielfield.git
cd Zenielfield
```

```bash
node --version
npm --version
git --version
npm run setup
```

[setup](../scripts/setup.mjs)은 Node 버전을 검사하고, 필요한 경우 `npm install -g pnpm@11.25.0`으로 pnpm을 설치한다. 이어 `pnpm install`, `git config core.hooksPath .githooks`, `.env.example` → `.env` 복사를 수행한다. 기존 `.env`는 덮어쓰지 않는다. 전역 npm 설치 가능 여부는 PC 권한과 PATH 설정에 달려 있다.

pnpm이 이미 준비된 환경에서 의존성만 설치하려면 다음 명령을 사용한다. 이 명령은 환경 파일 생성·훅 연결을 대신하지 않는다.

```bash
pnpm install --frozen-lockfile
```

[워크스페이스 설정](../pnpm-workspace.yaml)은 기본 저장소로 `.sites-runtime/pnpm-store`를 사용한다. 다른 OS의 `node_modules`를 복사하면 esbuild·workerd 같은 실행 파일이 맞지 않을 수 있다.

## 로컬 실행과 데모

```bash
pnpm dev
```

일반 체크아웃의 portable 프로필은 [실행 스크립트](../scripts/run-framework.mjs)에서 포트 5173을 지정한다. `http://127.0.0.1:5173`을 열고 데모는 `http://127.0.0.1:5173/?mode=demo` 또는 로그인 화면의 **로그인 없이 체험하기**로 시작한다. 메모리 데모의 변경은 새로고침 시 초기화된다. 서버 종료는 실행 터미널에서 `Ctrl+C`다.

ChatGPT Sites 관리 환경은 체크아웃 전용 실행 프로필에 따라 다른 실행·빌드 경로를 사용한다. [프로필 선택](../scripts/execution-profile.mjs)과 [Vite 설정](../vite.config.ts)을 참고한다. 개인 Vite 설정이 있으면 개발 서버 주소·HTTPS 설정이 달라질 수 있다.

로컬 서버도 설정에 따라 공용 DB·외부 서비스에 연결될 수 있다. `?mode=demo`는 메모리 데모 선택이며 서버 전체의 네트워크 격리 설정은 아니다. 운영 로그인·저장 시험은 승인된 환경과 계정에서 진행한다.

## 환경변수와 개인 설정

다음은 [.env.example](../.env.example)에 있는 이름과 용도다. 실제 `.env` 값·키 유효성은 이번 작업에서 조회하지 않았다.

| 이름 | 용도 | 필요한 경우 |
| --- | --- | --- |
| `ZENIFIELD_SUPABASE_URL` | 서버가 연결하는 프로젝트 주소 | 운영 데이터 연결 |
| `ZENIFIELD_GATEWAY_TOKEN` | 서버 → Edge 게이트웨이 토큰 | 운영 데이터 연결. 브라우저 공개 금지 |
| `ZENIFIELD_AUTH_PROVIDER` | `supabase-email`: 회사 계정, 비우면 Sites 인증 | 인증 선택. 예시는 회사 계정 |
| `OPENAI_API_KEY` | 서버 AI 초안·정리·브리핑 생성 | 실제 AI 기능 |
| `OPENAI_MODEL` | AI 호출 모델 이름 | 예시·서버 fallback은 `gpt-6-luna`. 실제 이용 가능 여부 미확인 |

회사 계정은 사전 등록된 활성 사용자만 사용할 수 있다. 사용자 등록·비밀번호 발급·메일·Edge의 별도 비밀 설정은 [운영 인계](infrastructure.md)를 따른다. 예시의 자리표시자는 실제 자격증명이 아니다. 비밀값을 `NEXT_PUBLIC_` 변수·문서·커밋에 넣지 않는다.

개인 주소와 인증서는 git 제외 `vite.config.local.mjs`에 둔다. [예시 파일](../vite.config.local.example.mjs)은 주소 자리표시자가 있으므로 이 PC에 맞게 검토한 뒤 사용한다. 공유 `vite.config.ts`·`next.config.ts`에 개인 주소·인증서를 추가하지 않는다.

## 테스트와 빌드

```bash
pnpm typecheck
pnpm test
pnpm build
```

`pnpm test`는 플랫폼 → 브리핑 → 문제 진단 → Supabase 서버/Edge → 기존 로직 → 반복 말 정리 → 차트 렌더링 → 후속 조치 정렬의 **8개 실행기**를 순서대로 실행한다. 성공 건수는 실행 결과를 확인하며 과거 문서의 수치를 현재 결과로 사용하지 않는다. `pnpm build`는 빌드 전에 패치 버전을 올린다. 문서만 바꿀 때는 실행할 필요가 없다. `npm start`/`npm stop`/`npm restart`/`npm run status`는 백그라운드 개발 서버 관리이며 기존 포트 프로세스를 종료할 수 있다. 빌드 산출물 미리보기는 `npm run preview:dist`다.

| 범위 | 개별 명령 / 근거 |
| --- | --- |
| 플랫폼·브리핑·진단 | `node tests/run-platform.mjs` · `node tests/run-briefing.mjs` · `node tests/run-diagnosis.mjs` |
| 서버·Edge·기존 계산 | `node tests/run-supabase.mjs` · `node tests/logic.mjs` · `node tests/run-dedupe.mjs` |
| 차트 렌더링 | `node tests/run-chart-render.mjs` |
| 후속 조치 정렬 | `node tests/run-action-order.mjs` |
| 추가 로컬 검사 | `node tests/run-geo.mjs` · `node tests/run-seed.mjs` · `node tests/run-cloudflare-auth.mjs` · `node tests/run-cloudflare-supabase.mjs` |
| 디자인 점검 | `node scripts/check-design.mjs <변경 파일 경로...>` — 인자 없으면 스테이징 파일 |
| CI | [verify.yml](../.github/workflows/verify.yml): PR/main push의 타입 검사·기본 테스트. 이 verify 워크플로 자체에는 배포 단계 없음 |

UI 변경 시 [AGENTS.md](../AGENTS.md)의 390px·820px·1280px 실화면 검수와 관련 상태·접근성 확인을 함께 수행한다. 이번 문서 변경에서는 앱 테스트·빌드·브라우저 검수를 실행하지 않았다.

**main 푸시는 별도 [supabase-deploy 워크플로](../.github/workflows/supabase-deploy.yml)의 운영 배포를 유발한다.** 단순 원격 보관은 기능/문서 브랜치를 사용한다. `ci:deploy`와 `deploy:cloudflare`도 원격 배포 요청이므로 일반 설치 확인 명령이 아니다.

`scripts/test-cloudflare-live.mjs`, `scripts/test-supabase-connection.mjs`, `tests/supabase.sql`은 별도 원격/DB 검증 범위다. 일반 설치 확인 명령으로 실행하지 않는다. 운영 DB·Edge·계정 변경은 별도 승인이 필요하며 [운영 인계](infrastructure.md)를 먼저 읽는다.

## 문제 해결

| 증상 | 확인 방법 |
| --- | --- |
| Node 버전 검사 실패 | `node --version`이 22.13.0 이상인지 확인 |
| setup 뒤 pnpm을 찾지 못함 | 터미널을 다시 열고 pnpm 버전·npm 전역 설치 경로·PATH 확인 |
| exFAT에서 설치 EISDIR | 기존 README의 우회 안내는 `pnpm install --node-linker=hoisted`. 이번에는 재현하지 않았으며 소요 시간은 보장하지 않음 |
| esbuild/workerd의 OS·실행 파일 오류 | 다른 OS의 의존성 복사 여부 확인 후 해당 PC에서 재설치 |
| Cloudflare 추가 테스트의 esbuild 경로 오류 | 일부 실행기가 `.pnpm/esbuild@0.28.0/...`를 직접 참조하므로 hoisted 설치와 맞는지 확인 |
| 5173 접속 불가 | 서버 터미널 오류·실제 표시 URL·포트 사용 여부·개인 Vite 설정·실행 프로필 확인 |
| 로그인·운영 조회 실패 | 인증 제공자·등록 이메일 활성 여부·서버 설정·링크를 요청한 브라우저 확인. 계정은 관리자에게 요청 |
| AI 생성 실패 | 해당 서버의 키 설정·서비스 오류 안내와 대체/직접 입력 경로 확인 |
| GPS·주소 검색이 없음 | 현재 GPS_ENABLED/GEO_SEARCH_ENABLED=false로 중지. Kakao 키는 예시에 없고 사용하지 않음 |
| 위치·음성 입력 실패 | 브라우저 지원·보안 컨텍스트·기기 권한 확인. 직접 선택·텍스트 입력 사용 |
| 빈 목록·저장 충돌 | 기간·대상·상태 필터와 역할 범위 확인. 최신 자료를 불러와 입력 내용 재검토 |

근거: [실행 설정](../package.json), [setup](../scripts/setup.mjs), [진입 화면](../app/platform/entry.tsx), [사용자 매뉴얼](guide.md). 실제 서비스 설정과 재현이 남은 항목은 [점검 보고서](archive/documentation-audit-2026-10-29.md)에 구분한다.

## 매뉴얼 화면 캡처

- `npm run screenshots -- --url <개발 서버 주소>` → 데모 모드로 메뉴마다 PC 1280·모바일 390 화면을 `docs/screenshots/*.jpg`에 저장
- 주소 기본값 `ZF_SHOT_URL` → `http://127.0.0.1:5173`. 서버(`npm start` 또는 `npm run preview:dist`)가 먼저 떠 있어야 함
- 일부만: `--only dashboard,visit-action`. 새 버전 알림 띠는 숨기고 브리핑 작성이 끝난 뒤 찍음, 실패 시 종료 코드 1
- 화면을 바꾼 커밋에서 다시 찍어 README `화면으로 보기`와 맞춤(`scripts/screenshots.mjs`에 메뉴 목록)
