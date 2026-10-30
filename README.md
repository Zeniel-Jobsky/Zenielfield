<p align="center"><img src="public/brand/zenifield_logo.png" width="240" alt="ZeniField"></p>

# ZeniField · 현장·매장 운영관리

<img src="public/brand/zenieri-chatbot.png" width="72" align="left" alt="제니에리">

**현장 방문 보고를 AI 비서 '제니에리'가 읽고, 직급마다 "지금 어디에 무슨 일이 있고, 나는 무엇을 하면 되는지"를 알려 주는 현장 운영 앱입니다.**

<br clear="left">

- 방문 일정 → 방문·조치(결과와 후속 조치) → 활동 요약이 한 흐름으로 이어져요.
- 모든 화면 맨 위에서 제니에리가 그 화면의 할 일을 먼저 정리하고, 줄마다 바로 하기 버튼과 보낼 말 복사를 붙여요.
- 모든 직급이 같은 메뉴를 보고, 보이는 범위만 직급(잡매니저·파트장·팀장·사업부장)에 따라 달라요.
- **연구 근거로 설계했어요.** AI를 넣는 이유, AI를 믿고 쓰는 방식, 문구·차트·화면 배치를 인간-AI 협업·의사결정 지원·피드백·시각화 논문에 근거해 정했어요([근거 기반 설계](#근거-기반-설계) · [근거 전체](docs/evidence.md)).

## 🚀 실서비스(라이브) 세팅

실제 직원이 쓰게 여는 절차는 **[실서비스 오픈 가이드](docs/go-live.md)** 하나에 모았어요. 순서만 보면 이래요.

| 순서 | 할 일 | 누가 · 어디서 |
| --- | --- | --- |
| 1 | 준비: `.env` 값, 사전 점검(`node scripts/rollout.mjs run preflight`), 요금제 | 운영 담당 · 터미널 |
| 2 | 데이터 비우기: 백업 → 초기화(승인 필요) | 운영 담당 · 터미널 |
| 3 | 관리자 준비: 관리 도메인 등록, 본인 비밀번호 | 시스템 관리자 · 설정 |
| 4 | 직원 일괄 등록: `명단 양식` 받기 → 채우기 → `명단 올리기` → 미리 보기 → 반영 | 시스템 관리자 · 설정 → 사용자·권한 |
| 5 | 첫 로그인: 비밀번호 1:1 전달(`work/accounts.local.csv`) → 직원이 설정 → 내 계정에서 변경. 회사 SMTP를 붙이면 메일 링크 로그인 | 관리자 · 직원 |
| 6 | 현장·매장·담당·주기 등록 → 직급별 로그인 확인 | 관리자·팀장·파트장 · 담당·주기 관리 |

- 에이전트(GPT·Codex·Claude)에게 맡길 때는 [AGENTS.md "운영 DB·배치 명령"](AGENTS.md) 표의 명령과 승인 문장만 써요.
- 운영 DB를 바꾸는 단계(백업·초기화·직원 등록)는 승인자 이름(`--approved-by`)이 있어야 실행돼요.


## 목차

0. [실서비스(라이브) 세팅](#-실서비스라이브-세팅)
1. [핵심 철학](#핵심-철학)
2. [근거 기반 설계](#근거-기반-설계) · [핵심 기능](#핵심-기능)
3. [화면으로 보기](#화면으로-보기)
4. [처음 버전과 달라진 점](#처음-버전과-달라진-점)
5. [시작하기](#시작하기)
6. [메뉴별 사용 안내](#메뉴별-사용-안내)
7. [개발자 안내](#개발자-안내)
8. [문서 모음](#문서-모음)

## 핵심 철학

<img src="public/brand/zenieri-chatbot.png" width="48" align="right" alt="제니에리">

1. **보는 데서 끝나지 않고 바로 한다.** _(Hattie & Timperley 2007: 피드백은 "다음은 무엇인가"에 답해야 효과가 있다)_ 화면마다 제니에리가 할 일을 먼저 말하고, 줄마다 `일정 잡기`·`작성`·`조치` 같은 바로 하기 버튼과 받는 사람에게 보낼 말을 붙여요.
2. **사람이 아니라 일에 대해 말한다.** _(Kluger & DeNisi 1996: 주의가 자기로 향하는 피드백은 성과를 낮춘다 · Keasey 외 2000, Bevan & Hood 2006: 순위표는 지표 집착·게이밍을 낳는다)_ "누가 못했다"가 아니라 "어느 현장의 무엇이 남았다"로 써요. 순위·낙인·빨간 경보를 늘리지 않고, 비교는 자기 지난주와만 해요.
3. **판단은 기록에서, 결정은 사람이.** _(Parasuraman & Riley 1997, Goddard 외 2012: 자동화 과신·자동화 편향)_ 코드는 사실(기한·회차·마지막 방문)만 계산해요. "바로 확인·조치 필요" 같은 판정은 입력할 때 AI가 제안하고 사람이 확인해 저장한 것만 써요. 임계값·키워드로 추정하지 않아요.
4. **AI는 비서다.** _(Amershi 외 2019 인간-AI 상호작용 지침 · Buçinca 외 2021, Bansal 외 2021: 과의존 줄이기)_ 제니에리는 정리·제안·초안을 맡고, AI가 안 되어도 같은 칸의 규칙 정리로 업무가 멈추지 않아요. 선택지는 같은 무게로 보여 주고 추천을 강요하지 않아요.
5. **결론 먼저, 한 화면에 한 번.** _(Endsley 1995 상황 인식 · Sweller 1988 인지 부하 · Shneiderman 1996 개요 먼저, 세부는 필요할 때)_ 무슨 일 → 어디에 → 할 일 순서로, 같은 숫자·목록을 두 곳에 두지 않아요.
6. **모두 같은 화면, 범위만 다르게.** 잡매니저부터 사업부장까지 같은 메뉴·같은 구성을 보고, 직급에 따라 보이는 범위와 호칭만 달라져요.
7. **개인정보는 보내지 않는다.** AI에는 보고 본문과 사실만 보내고 이름·연락처는 빼요.

## 근거 기반 설계

ZeniField의 주요 결정은 감이 아니라 연구 결과에 근거해요. 아래는 대표 근거이고, 출처(DOI)와 반영 위치 전체는 [docs/evidence.md](docs/evidence.md)에 있어요.

| 결정 | 근거 | 연구 결과 |
| --- | --- | --- |
| AI가 보고를 읽고 상황 → 무슨 일 → 대응 순서로 브리핑 | Endsley 1995, *Human Factors* | 상황 인식은 지각 → 이해 → 예측. 정보가 많으면 "이해"가 병목 |
| 말·사진으로 방문 결과 입력(AI 간편 등록) | Ruan 외 2017, *IMWUT* | 휴대폰 말 입력이 키보드보다 약 3배 빠름 |
| AI 판정은 사람이 확인해 저장, 코드는 판정하지 않음 | Parasuraman & Riley 1997 · Goddard 외 2012, *JAMIA* | 자동화 과신과 자동화 편향(틀린 권고도 따름) |
| AI 설명 대신 근거량과 원본 링크, 선택지는 같은 무게 | Bansal 외 2021, CHI · Buçinca 외 2021, CSCW · Vasconcelos 외 2023, CSCW | 설득형 설명은 수용만 늘림, 확인 비용을 낮춰야 과의존이 줄어듦 |
| AI에 집계 숫자를 보내지 않고 숫자는 코드가 계산 | Ji 외 2023, *ACM Computing Surveys* | 생성 모델의 환각 |
| 사람·조직 순위 없음, 주어는 현장·과업, 빨강은 기한 넘김만 | Kluger & DeNisi 1996 · Keasey 외 2000 · Bevan & Hood 2006 · 경보 피로 고찰 | 자기 초점 피드백·순위표·잦은 경보의 역효과 |
| 요약 먼저, 자세히 보기로 펼침 | Shneiderman 1996 | Overview first, details on demand |
| 도넛·게이지 대신 꺾은선·표 | Cleveland & McGill 1984, *JASA* | 위치·길이 비교가 각도·면적보다 정확 |
| 방문 기록·후속 조치를 한 화면으로 | Senathirajah 외 2020, *JMIR* | 정보가 여러 화면으로 나뉘면 판단이 흐려지고 왕복이 늘어남 |
| 입력 폼 한 열·라벨은 칸 위, 터치 44px | Penzo 2006 · WCAG 2.2 | 위 라벨이 가장 빠름, 접근성 기준 |

> 현장 방문 보고 앱을 직접 실험한 연구는 없어서, 인접 분야(인간-AI 협업·의사결정 지원·의료 정보 화면·시각화) 근거를 썼어요. 원문을 확인하지 못한 자료는 근거로 쓰지 않아요.

## 핵심 기능

### 1. 보고를 읽는 AI 브리핑
- **좋아지는 것:** 수백 건 보고를 읽지 않아도 "무슨 일 → 어디에 → 내가 할 일"을 1분 안에 파악해요.
- **구현:** 보고 본문·저장된 판정·문제 지도를 AI에 보내 정해진 칸 구조로 받아요(`brief-shape.ts`). 집계 숫자는 보내지 않고, AI가 안 되면 같은 칸의 규칙 브리핑으로 대신해요.

### 2. 직급별로 다른 말
- **좋아지는 것:** 잡매니저는 다음 방문, 파트장은 잡매니저 지원, 팀장·사업부장은 조직 단위 판단만 봐요.
- **구현:** 브리핑 입력에 직급과 보는 범위(`scopeUnits`)를 실어 초점·호칭·받는 사람을 바꿔요. 저장본은 사용자·직급별로 따로 둬요.

### 3. 입력하는 순간의 AI 종합 판정
- **좋아지는 것:** 보고마다 정상·지켜보기·조치 필요·바로 확인이 사람 확인을 거쳐 남아, 감이 아닌 기록으로 우선순위를 정해요.
- **구현:** 저장할 때 그 현장의 이전 보고·조치·기한으로 판정하고, 사람이 확인·수정한 뒤 저장해요. 코드는 판정하지 않아요(임계값·키워드 금지).

### 4. 말·사진·손글씨로 기록
- **좋아지는 것:** 현장에서 말하거나 회의록을 찍으면 결과·일정 초안이 채워져 기록 누락이 줄어요.
- **구현:** AI 간편 등록(음성·이미지), 읽지 못한 항목 따로 표시, 회의록 양식 인식(참석자 이름은 저장 안 함), 반복 말 정리.

### 5. 다음 방문 추천과 바로 하기
- **좋아지는 것:** 일정을 잡을 때 먼저 가 볼 곳·확인할 것·같은 날 함께 갈 곳을 바로 제안하고, 버튼 하나로 등록까지 이어져요.
- **구현:** 기한 지난 회차·기한 넘긴 조치·60일+ 미방문 같은 사실과 저장된 판정만으로 고르고(`status.ts`), 날짜 후보는 `schedule.ts`가 계산해요. 점수·순위는 쓰지 않아요.

### 6. 현장 친화적인 표현과 안전한 운영
- **좋아지는 것:** 순위·낙인 대신 할 일과 자기 과거 비교로 말해 현장 반발 없이 실행률을 높이고, 공용 운영 DB를 안전하게 바꿔요.
- **구현:** 문구 기준(과업 주어·꼬리표 금지·빨강은 기한 넘김만, 근거 `docs/evidence.md`). 서버 게이트웨이 검증, main 푸시 → 검증 → DB 이관 → 서버 함수 → 화면 자동 배포, 데모는 저장하지 않아요.

## 화면으로 보기

데모 데이터, PC 1280px와 모바일 390px 화면이에요. `npm run screenshots`로 다시 찍어요([캡처 방법](docs/local-development.md#매뉴얼-화면-캡처)).

### 운영 현황
제니에리 말풍선(오늘·이번 주·챙길 것) → 브리핑(무슨 일 → 어디에 무엇이 → 이렇게 챙겨 보세요) → 지표·차트.

<img src="docs/screenshots/dashboard-pc.jpg" width="560" alt="운영 현황 PC"> <img src="docs/screenshots/dashboard-mobile.jpg" width="190" alt="운영 현황 모바일">

### 방문 일정
이번 주 일정·일정 잡을 회차를 정리하고, 먼저 일정 잡을 곳에 `일정 잡기`를 붙여요.

<img src="docs/screenshots/visits-pc.jpg" width="560" alt="방문 일정 PC"> <img src="docs/screenshots/visits-mobile.jpg" width="190" alt="방문 일정 모바일">

### 방문 일정 등록
제니에리가 먼저 가 볼 곳 5곳을 골라 주고(왜·주기·확인할 것·같은 날 함께), 고르면 날짜 후보로 이어져요.

<img src="docs/screenshots/plan-form-pc.jpg" width="560" alt="방문 일정 등록 PC"> <img src="docs/screenshots/plan-form-mobile.jpg" width="190" alt="방문 일정 등록 모바일">

### 방문·조치
방문 기록과 후속 조치를 한 화면에서 봐요. 결과 안 쓴 방문·기한 넘긴 조치 정리 → 탭(방문 │ 조치) → 방문 아래 그 방문의 조치.

<img src="docs/screenshots/visit-action-pc.jpg" width="560" alt="방문·조치 PC"> <img src="docs/screenshots/visit-action-mobile.jpg" width="190" alt="방문·조치 모바일">

### 활동 요약
기간 브리핑과 날짜별 방문 타임라인이에요.

<img src="docs/screenshots/activity-pc.jpg" width="560" alt="활동 요약 PC"> <img src="docs/screenshots/activity-mobile.jpg" width="190" alt="활동 요약 모바일">

### 담당·주기 관리
담당 없는 곳·60일+ 미방문을 정리하고 `담당 정하기`·`일정 잡기`를 붙여요.

<img src="docs/screenshots/sites-pc.jpg" width="560" alt="담당·주기 관리 PC"> <img src="docs/screenshots/sites-mobile.jpg" width="190" alt="담당·주기 관리 모바일">

### 현장 주소록
주소·담당을 검색해요.

<img src="docs/screenshots/contacts-pc.jpg" width="560" alt="현장 주소록 PC"> <img src="docs/screenshots/contacts-mobile.jpg" width="190" alt="현장 주소록 모바일">

## 처음 버전과 달라진 점

<details>
<summary>2026-10-27 첫 버전과 비교 (펼치기)</summary>

2026-10-27 첫 버전 → 2026-10-30

- **브리핑:** 원문 발췌 목록 → 제니에리가 무슨 일·어디에·할 일로 정리
- **판정:** 화면이 키워드·임계값으로 추정 → 입력 때 AI 판정을 사람이 확인해 저장
- **입력:** 직접 입력 폼 → AI 간편 등록(말·사진·회의록) + 직접 입력
- **일정:** 빈칸에서 시작 → 먼저 가 볼 곳 추천 + 빈 날 + 후보 날짜
- **방문·조치:** 메뉴 둘로 나뉨 → 한 화면, 방문 아래 그 방문의 조치
- **차트:** 여러 개 + 통계·보고서 메뉴 → 차트 한 쌍(조직 공백표·이행률 꺾은선)
- **배포:** 로컬·D1 중심 → 운영 Supabase + Cloudflare Worker 자동 배포

날짜별 작업 기록은 [docs/archive/changelog-2026-10.md](docs/archive/changelog-2026-10.md)에 있어요.

</details>

## 시작하기

필요한 것: Node.js 22.13.0 이상, pnpm 11.25.0, Git, 브라우저.

```bash
npm run setup   # Node 검사·pnpm·의존성·Git 훅·.env 예시
pnpm dev        # http://127.0.0.1:5173  (데모: /?mode=demo)
```

- 백그라운드 서버: `npm start` · `npm stop` · `npm restart` · `npm run status`
- 검사: `pnpm typecheck` · `pnpm test`
- 매뉴얼 화면 캡처: `npm run screenshots -- --url <서버 주소>`
- 자세한 설치·설정: [로컬 개발 가이드](docs/local-development.md)
- **주의:** main 푸시는 운영 자동 배포를 실행해요([supabase-deploy](.github/workflows/supabase-deploy.yml)).

## 메뉴별 사용 안내

| 메뉴 | 하는 일 |
| --- | --- |
| [운영 현황](docs/guide.md#운영-현황) | 제니에리 말풍선·브리핑·지표·차트 |
| [방문 일정](docs/guide.md#방문-일정) | 달력·먼저 가 볼 곳 추천·일정 등록 |
| [방문·조치](docs/guide.md#방문-기록) | 방문 결과·후속 조치 한 화면 |
| [활동 요약](docs/guide.md#주차별-활동-요약) | 기간 브리핑·날짜별 타임라인 |
| [담당·주기 관리](docs/guide.md#현장매장-관리) | 현장·매장·담당·방문 주기 |
| 현장 주소록 | 주소·담당 검색 |
| [설정](docs/guide.md#설정) (프로필 메뉴 → 설정) | 내 계정(비밀번호·화면 옵션) · 사용자·권한(명단 일괄 반영) · 관리 도메인 · 브리핑 내용 |

관리자 업무는 [사용 안내 2절](docs/guide.md#2-관리자-안내)을 봐 주세요.

## 개발자 안내

- **먼저 읽기:** [AGENTS](AGENTS.md) → [프로젝트 룰](PROJECT_RULE.md) → [디자인 지침](docs/DESIGN-zenielfield.md)
- **기술:** React 19 · Next.js 16 API 구조를 Vinext/Vite · Cloudflare Workers로 실행, 운영 데이터는 Supabase

| 경로 | 역할 |
| --- | --- |
| `app/platform/` | 화면·권한·회차·저장 검증·AI·일정·상태 공통 모듈 |
| `app/api/` · `lib/` · `worker/` | API·인증 어댑터·Worker 진입 |
| `supabase/` | 스키마·이관·Edge 함수 |
| `data/` · `seed/` | 원본 자료·데모 시드 |
| `scripts/` · `tests/` | 실행·번들·운영 도구·검증 |
| `docs/` | 가이드·지침·계획·현황 |

- **환경변수:** [.env.example](.env.example) — 운영 연결(`ZENIFIELD_SUPABASE_URL`·`ZENIFIELD_GATEWAY_TOKEN`), 인증(`ZENIFIELD_AUTH_PROVIDER`), AI(`OPENAI_API_KEY`·`OPENAI_MODEL`). 비밀값은 문서·커밋에 남기지 않아요.
- **배포 순서:** DB 이관 → 서버 검증 로직 번들 → Edge 함수 → 화면. 운영 DB·Edge·계정은 승인 후에만([운영 인계](docs/infrastructure.md)).

## 문서 모음

문서 전체 안내는 [docs/README.md](docs/README.md)에 있어요.

| 문서 | 내용 |
| --- | --- |
| [실서비스 오픈 가이드](docs/go-live.md) | 오픈 체크리스트, DB 초기화, 직원 일괄 등록, 비밀번호·메일 로그인, 회사 SMTP, 비용, 되돌리기 |
| [사용 안내](docs/guide.md) | 사용자·관리자 화면 사용법 |
| [업무·데이터 명세](docs/spec.md) | 방문 흐름, 데이터 계약, AI 간편 등록, 주간 브리핑, 방문·조치 설계 |
| [설계 근거](docs/evidence.md) · [디자인 지침](docs/DESIGN-zenielfield.md) | 논문 근거(AI 도입·사용, 문구, 화면·차트)와 화면 기준 |
| [인프라 구성](docs/infrastructure.md) · [로컬 개발](docs/local-development.md) · [테스트](docs/testing.md) | 개발·운영 구성 |
| [기능 현황](docs/feature-status.md) · [남은 이슈](docs/next-issues-plan.md) | 진행 기록 |
| [archive/](docs/archive/) | 끝난 계획·지난 보고·이전 README |
