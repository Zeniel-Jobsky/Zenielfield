<p align="center"><img src="public/brand/zenifield_logo.png" width="240" alt="ZeniField"></p>

<h1 align="center">보고는 쌓이는데, 오늘 어디부터 가야 하죠?</h1>

<p align="center"><b>ZeniField</b>는 현장 방문 보고를 AI 비서 <b>제니에리</b>가 대신 읽고<br>"지금 어디에 무슨 일이 있고, 나는 무엇을 하면 되는지"를 먼저 말해 주는 현장·매장 운영 앱이에요.</p>

<p align="center">📚 <a href="docs/evidence.md"><b>설계 근거 문서</b></a> — AI 도입·사용 방식, 문구, 화면·차트를 정한 논문 근거 · 💰 <a href="docs/cost-estimate.md"><b>내부 비용 산정</b></a> · 🚀 <a href="docs/go-live.md"><b>실서비스 오픈 가이드</b></a></p>

<p align="center"><img src="docs/screenshots/dashboard-pc.jpg" width="620" alt="운영 현황 PC 화면"> <img src="docs/screenshots/dashboard-mobile.jpg" width="200" alt="운영 현황 모바일 화면"></p>

> **월요일 아침 9시, 파트장의 하루는 이렇게 시작돼요.** _(예시 장면)_
> 지난주 잡매니저 여덟 명이 남긴 방문 보고가 수십 건이에요. 예전 같으면 하나씩 열어 읽었겠지만, 이제는 화면 맨 위 제니에리의 세 문단을 읽어요. **무슨 일이 벌어지고 있나**에는 "인천 쪽 두 매장에서 같은 인력 요청이 이어지고 있어요"라고 적혀 있고, **어떻게 대응하면 되나** 줄 끝에는 `일정 잡기` 버튼과 담당 매니저님께 보낼 말 복사가 붙어 있어요. 버튼 한 번에 방문 일정이 잡히고, 복사한 말은 메신저로 바로 가요. 보고서를 다 읽지 않아도 한 주가 정리돼요.

## 제니에리가 정리해서 말씀드려요

<img src="public/brand/zenieri-chatbot.png" width="64" align="right" alt="제니에리">

#### 📰 무슨 앱인가요

현장과 매장을 도는 잡매니저가 남긴 방문 보고를 제가 읽고, 보시는 분의 직급에 맞춰 정리해 드려요. 방문 일정 → 방문·조치(결과와 후속 조치) → 활동 요약이 한 흐름으로 이어지고, 모든 화면 맨 위에서 그 화면에서 먼저 할 일을 말씀드려요. 잡매니저부터 사업부장까지 같은 메뉴를 보시고, 보이는 범위만 직급에 따라 달라요. 현장에서는 말·사진·회의록으로 기록을 남기시면 제가 칸을 채워 드려요.

#### 🧭 왜 이렇게 만들었나요

감이 아니라 연구 결과를 따라 만들었어요. 사람은 정보가 많을수록 '무슨 뜻인지 이해하는' 단계에서 막혀서([Endsley 1995](https://doi.org/10.1518/001872095779049543)), 제가 보고를 읽고 **지금 상황 → 무슨 일 → 어떻게 대응**의 순서로 먼저 정리해요. 요약을 먼저 보여 드리고 자세한 건 펼쳐 보시게 했어요([Shneiderman 1996](https://doi.org/10.1109/VL.1996.545307)). 현장에서는 말로 남기는 편이 키보드보다 약 3배 빨라서([Ruan 외 2017](https://doi.org/10.1145/3161187)) 말·사진·회의록으로 기록할 수 있게 했어요.

저를 너무 믿으셔도 곤란해요. 사람은 자동화가 틀려도 따르는 경향이 있어서([Parasuraman & Riley 1997](https://doi.org/10.1518/001872097778543886), [Goddard 외 2012](https://doi.org/10.1136/amiajnl-2011-000089)), 보고의 판정은 제가 제안하고 **사람이 확인해 저장한 것만** 써요. 코드는 기한·회차 같은 사실만 계산하고, 그럴듯한 설명으로 설득하지 않아요([Bansal 외 2021](https://doi.org/10.1145/3411764.3445717)). 대신 근거량과 원본 보고로 가는 링크를 붙여 바로 확인하시게 했어요([Vasconcelos 외 2023](https://doi.org/10.1145/3579605)). 숫자는 제가 지어낼 수 있어서([Ji 외 2023](https://doi.org/10.1145/3571730)) 집계 숫자는 저에게 보내지 않고 코드가 계산해요.

말투도 근거를 따랐어요. 사람에게 향한 피드백은 오히려 성과를 떨어뜨려서([Kluger & DeNisi 1996](https://scholars.huji.ac.il/node/1802)) "누가 못했다"가 아니라 "어느 현장의 무엇이 남았다"로 말씀드려요. 순위표는 지표 맞추기와 집착을 낳아서([Keasey 외 2000](https://ideas.repec.org/a/taf/acctbr/v30y2000i4p275-286.html), [Bevan & Hood 2006](https://eprints.lse.ac.uk/16211)) 사람·조직을 줄 세우지 않고, 비교는 지난주의 나와만 해요. 빨간색은 기한을 넘긴 사실에만 써요. 경보가 잦으면 무뎌지기 때문이에요.

👉 논문별 핵심과 앱에 반영한 곳은 <a href="docs/evidence.md"><b>설계 근거 문서</b></a>에 모두 정리해 두었어요.

#### ✅ 어떻게 쓰시면 되나요

화면 맨 위 제 정리를 읽으시고, 줄 끝의 바로 하기 버튼(`일정 잡기`·`작성`·`조치`)과 받는 분께 보낼 말 복사를 쓰시면 돼요. 판단이 필요한 일은 안 ①②를 같은 무게로 보여 드리니 직접 골라 주세요. 제가 연결되지 않을 때도 같은 칸을 규칙으로 정리해 업무가 멈추지 않아요.

<details>
<summary>더 보기: 근거와 앱에 반영한 것 (논문 목록)</summary>

| 결정 | 근거 | 연구 결과 |
| --- | --- | --- |
| AI가 보고를 읽고 상황 → 무슨 일 → 대응 순서로 브리핑 | [Endsley 1995](https://doi.org/10.1518/001872095779049543), *Human Factors* | 상황 인식은 지각 → 이해 → 예측. 정보가 많으면 "이해"가 병목 |
| 말·사진으로 방문 결과 입력(AI 간편 등록) | [Ruan 외 2017](https://doi.org/10.1145/3161187), *IMWUT* | 휴대폰 말 입력이 키보드보다 약 3배 빠름 |
| AI 판정은 사람이 확인해 저장, 코드는 판정하지 않음 | [Parasuraman & Riley 1997](https://doi.org/10.1518/001872097778543886) · [Goddard 외 2012](https://doi.org/10.1136/amiajnl-2011-000089), *JAMIA* | 자동화 과신과 자동화 편향(틀린 권고도 따름) |
| AI 설명 대신 근거량과 원본 링크, 선택지는 같은 무게 | [Bansal 외 2021](https://doi.org/10.1145/3411764.3445717), CHI · [Buçinca 외 2021](https://doi.org/10.1145/3449287), CSCW · [Vasconcelos 외 2023](https://doi.org/10.1145/3579605), CSCW | 설득형 설명은 수용만 늘림, 확인 비용을 낮춰야 과의존이 줄어듦 |
| AI에 집계 숫자를 보내지 않고 숫자는 코드가 계산 | [Ji 외 2023](https://doi.org/10.1145/3571730), *ACM Computing Surveys* | 생성 모델의 환각 |
| 사람·조직 순위 없음, 주어는 현장·과업, 빨강은 기한 넘김만 | [Kluger & DeNisi 1996](https://scholars.huji.ac.il/node/1802) · [Keasey 외 2000](https://ideas.repec.org/a/taf/acctbr/v30y2000i4p275-286.html) · [Bevan & Hood 2006](https://eprints.lse.ac.uk/16211) · 경보 피로 고찰 | 자기 초점 피드백·순위표·잦은 경보의 역효과 |
| 요약 먼저, 자세히 보기로 펼침 | [Shneiderman 1996](https://doi.org/10.1109/VL.1996.545307) | Overview first, details on demand |
| 도넛·게이지 대신 꺾은선·표 | [Cleveland & McGill 1984](https://doi.org/10.1080/01621459.1984.10478080), *JASA* | 위치·길이 비교가 각도·면적보다 정확 |
| 방문 기록·후속 조치를 한 화면으로 | [Senathirajah 외 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7641790/), *JMIR* | 정보가 여러 화면으로 나뉘면 판단이 흐려지고 왕복이 늘어남 |
| 입력 폼 한 열·라벨은 칸 위, 터치 44px | [Penzo 2006](https://www.uxmatters.com/mt/archives/2006/07/label-placement-in-forms.php) · [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | 위 라벨이 가장 빠름, 접근성 기준 |

현장 방문 보고 앱을 직접 실험한 연구는 없어서, 인접 분야(인간-AI 협업·의사결정 지원·의료 정보 화면·시각화)의 연구를 근거로 썼어요. 원문을 확인하지 못한 자료는 근거로 쓰지 않아요. DOI와 반영 위치 전체는 [docs/evidence.md](docs/evidence.md)에 있어요.

</details>

## 목차

- [화면으로 보기](#화면으로-보기) · [핵심 기능](#핵심-기능) · [시작하기](#시작하기) · [메뉴별 사용 안내](#메뉴별-사용-안내) · [개발자 안내](#개발자-안내) · [문서 모음](#문서-모음)
- [개발자 안내 › 🚀 실서비스(라이브) 세팅](#-실서비스라이브-세팅) · [참고: 지난 기록](#참고-지난-기록)

## 화면으로 보기

데모 데이터, PC 1280px와 모바일 390px 화면이에요. `npm run screenshots`로 다시 찍어요([캡처 방법](docs/local-development.md#매뉴얼-화면-캡처)).

### 운영 현황
제니에리 말풍선(오늘·이번 주·챙길 것) → 브리핑(무슨 일이 벌어지고 있나 → 어디에 무엇이 → 어떻게 대응하면 되나) → 지표·차트.

(화면은 이 문서 맨 위 그림이에요.)

### 방문 일정
제니에리 방문 길라잡이: 추천 이유 문단 → 이번 주 추천 동선 그림(잡힌 방문 점을 누르면 결과 등록, 점선 추천 점을 누르면 그 날 일정 등록).

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

### 🚀 실서비스(라이브) 세팅

개발자(운영 담당)가 실제 서비스를 여는 일까지 맡아요. 코드를 고친 뒤 배포만으로 끝나지 않고, 아래 순서로 운영 DB와 계정을 준비해야 직원이 쓸 수 있어요.

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

## 문서 모음

문서 전체 안내는 [docs/README.md](docs/README.md)에 있어요.

| 문서 | 내용 |
| --- | --- |
| [실서비스 오픈 가이드](docs/go-live.md) | 오픈 체크리스트, DB 초기화, 직원 일괄 등록, 비밀번호·메일 로그인, 회사 SMTP, 비용, 되돌리기 |
| [사용 안내](docs/guide.md) | 사용자·관리자 화면 사용법 |
| [업무·데이터 명세](docs/spec.md) | 방문 흐름, 데이터 계약, AI 간편 등록, 주간 브리핑, 방문·조치 설계 |
| [설계 근거](docs/evidence.md) · [디자인 지침](docs/DESIGN-zenielfield.md) | 논문 근거(AI 도입·사용, 문구, 화면·차트)와 화면 기준 |
| [내부 비용 산정](docs/cost-estimate.md) | 기능점수(FP)로 잰 개발 규모·사내 인건비 환산, 월 운영비, 유지 인력, 연간 총비용 |
| [인프라 구성](docs/infrastructure.md) · [로컬 개발](docs/local-development.md) · [테스트](docs/testing.md) | 개발·운영 구성 |
| [기능 현황](docs/feature-status.md) · [남은 이슈](docs/next-issues-plan.md) | 진행 기록 |
| [archive/](docs/archive/) | 끝난 계획·지난 보고·이전 README |

## 참고: 지난 기록

<details>
<summary>첫 버전(2026-10-27)과 달라진 점</summary>

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
