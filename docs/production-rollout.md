# 실제 서비스 배치 매뉴얼

2026-10-30. 운영 작업자와 에이전트(GPT·Codex·Claude)가 같은 절차로 ZeniField를 실제 서비스로 배치하는 방법이다. 절차의 정본은 기계가 읽는 [`ops/production-rollout.json`](../ops/production-rollout.json)이고, 이 문서는 사람이 읽는 설명이다. 둘이 다르면 JSON을 기준으로 이 문서를 고친다.

## 한눈에

| 순서 | 단계 (`id`) | 누가 | 승인 | 하는 일 |
| --- | --- | --- | --- | --- |
| 1 | 사전 점검 (`preflight`) | 실행기 | – | 설정값·이관 대기·테이블 행 수 확인(읽기만) |
| 2 | 백업 (`backup`) | 실행기 | 필요 | zf_ 테이블 9개를 `work/backup/<시각>/`에 JSON으로 받기 |
| 3 | 이관 (`migrate`) | 실행기 | 필요 | 저장소 이관 중 미적용분만 적용 |
| 4 | 초기화 방식 결정 (`leftover-decision`) | 사람 | 필요 | 새 프로젝트(A) 또는 지금 프로젝트 비우기(B) |
| 5 | 데모 시드 정리 (`purge-demo`) | 실행기 | 필요 | B일 때만. A면 `skip` |
| 6 | 관리 도메인 (`domains`) | 사람 | – | 설정 화면에서 사업 도메인 등록 |
| 7 | 명단 미리 보기 (`users-dry`) | 실행기 | – | `work/users.csv` 형식·대상 확인(쓰지 않음) |
| 8 | 직원 등록 (`users`) | 실행기 | 필요 | 사용자 등록 + 무작위 비밀번호 → `work/accounts.local.csv` |
| 9 | 현장·매장 (`targets`) | 사람 | – | 현장·매장·담당·주기 등록 |
| 10 | 비밀값 확인 (`secrets`) | 사람 | – | Worker Secrets·OpenAI 결제 한도 |
| 11 | 배포 (`deploy`) | 실행기 | 필요 | GitHub Actions로 다시 배포 |
| 12 | 운영 확인 (`verify`) | 실행기+사람 | – | 공개 주소 커밋·인증 경계, 직급별 로그인 |

## 실행기 사용법

```bash
node scripts/rollout.mjs list                                  # 단계와 상태(완료·다음·대기·건너뜀)
node scripts/rollout.mjs show backup                           # 이유·명령·확인 기준
node scripts/rollout.mjs run preflight                         # 자동 단계 실행
node scripts/rollout.mjs run backup --approved-by 홍길동        # 승인 단계는 승인한 사람 이름 필수
node scripts/rollout.mjs done domains                          # 사람이 한 단계를 끝났다고 기록
node scripts/rollout.mjs skip purge-demo --approved-by 홍길동 --reason "선택 A 새 프로젝트"
node scripts/rollout.mjs run users --approved-by 홍길동 --admin admin@zeniel.co.kr
```

- 앞 단계가 끝나지 않으면 실행하지 않는다. 명령이 하나라도 실패하면 그 자리에서 멈춘다.
- 상태는 `work/rollout-state.json`, 기록은 `work/rollout.log`에 남는다(git 제외, 비밀값 없음). 끝나면 요약을 `docs/feature-status.md`에 날짜와 함께 옮긴다.
- 필요한 `.env`: `SUPABASE_ACCESS_TOKEN`(Supabase 계정 → Access Tokens), `ZENIFIELD_SUPABASE_URL`, `ZENIFIELD_GATEWAY_TOKEN`. `SUPABASE_PROJECT_REF`가 없으면 주소에서 꺼낸다.

## 에이전트(GPT·Codex·Claude) 실행 규칙

1. 시작하면 `node scripts/rollout.mjs list`로 다음 단계를 보고 `show <단계>`로 이유·확인 기준을 읽는다.
2. 자동 단계만 `run`한다. 승인 단계는 사람이 대화에서 승인한 이름을 받아 `--approved-by`에 넣는다. 승인을 지어내거나 스스로 승인하지 않는다.
3. 수동 단계는 사람에게 할 일을 그대로 전하고, 사람이 끝냈다고 말하면 `done`으로 기록한다.
4. 실패하면 출력 그대로 보고하고 멈춘다. SQL을 직접 실행하거나 다른 명령으로 우회하지 않는다(DC-HALT).
5. 비밀번호·토큰·`work/accounts.local.csv` 내용을 출력하거나 대화·커밋에 옮기지 않는다.
6. 각 단계의 `check` 기준과 실제 출력을 비교해 보고한다.

## 지금 운영 DB 상태 (2026-10-30 사전 점검)

| 테이블 | 전체 | 데모 시드 |
| --- | --- | --- |
| zf_domains | 2 | 2 |
| zf_users | 40 | 30 |
| zf_sites | 107 | 107 |
| zf_stores | 554 | 554 |
| zf_visits | 11,811 | 1,798 |
| zf_actions | 972 | 972 |

- 이관 미적용 0개.
- 출처 없는 방문 1만 건(`…-extra-01~05`, 10,013건)이 모두 데모 현장에 붙어 있다. 그래서 데모 시드만 지우면 외래키 때문에 정리가 실패한다.
- zf.* 시험 계정이 11개 있다. 이 계정들과 출처 없는 방문은 규칙상 자동으로 지우지 않는다(DC-DATA). 4단계에서 사람이 방식을 정해야 한다.

## 초기화 방식

### 선택 A (권장): 새 Supabase 프로젝트로 시작

지금 프로젝트는 데모·시연용으로 남기고, 실제 서비스는 빈 프로젝트에서 시작한다. 지울 것이 없어서 되돌릴 일도 없다. 다만 인프라 작업이라 단계마다 승인이 필요하다(DC-INFRA).

1. Supabase에서 서울 리전 새 프로젝트를 만든다(Pro 플랜).
2. SQL 편집기에서 `supabase/schema.sql`을 한 번 실행한다. 이 파일은 빈 프로젝트용이며, 기존 프로젝트에는 실행하지 않는다.
3. 같은 프로젝트에 `node scripts/migrate.mjs --mark-applied <지금까지 이관 파일 전부>`로 기준선을 잡는다.
4. 첫 관리자 한 명을 `zf_users`에 등록한다(관리자 이메일·이름·role=admin).
5. Edge 함수 2개(`zenifield-gateway`, `zenifield-cloudflare`)를 새 프로젝트에 배포하고 게이트웨이 토큰 쌍을 새로 만든다.
6. GitHub `production` 환경 Secret `SUPABASE_ACCESS_TOKEN`·`SUPABASE_PROJECT_REF`와 Worker Secrets `ZENIFIELD_SUPABASE_URL`·`ZENIFIELD_GATEWAY_TOKEN`을 새 프로젝트 값으로 바꾼다.
7. 로컬 `.env`도 새 값으로 바꾸고 `preflight`부터 다시 실행한다. `purge-demo`는 `skip`으로 기록한다.

로그인 계정은 프로젝트마다 따로다. 새 프로젝트에서는 시험 계정을 다시 만들지 않는 한 존재하지 않는다.

### 선택 B: 지금 프로젝트 비우기

1. `backup`이 끝났는지 확인한다.
2. 출처 없는 방문·조치와 zf.* 시험 계정을 지우는 이관 파일 `supabase/migrations/<날짜>_reset_test_data.sql`을 만든다. 두 번 실행해도 안전하게 쓴다.
3. 이관 파일을 PR로 검토·승인받는다.
4. `migrate` 단계로 적용한다.
5. `purge-demo`를 실행한다.

SQL 편집기에서 손으로 지우지 않는다. 이력·감사가 남지 않기 때문이다.

## 계정 등록 절차

1. [`ops/users.template.csv`](../ops/users.template.csv)를 `work/users.csv`로 복사해 실제 명단을 채운다. 실제 명단은 커밋하지 않는다.
   - 칸: `id,email,name,role,team,part,domains`
   - role: `admin`(시스템 관리자) · `director`(사업부장) · `lead`(팀장) · `partlead`(파트장) · `manager`(잡매니저)
   - domains: 관리 도메인 ID를 `;`로 구분해 쓴다. 관리자·사업부장은 비운다.
   - id는 바꾸지 않는 사번 기반 값으로 쓴다(예: `u-20231234`). 담당·방문 기록이 id에 붙는다.
2. `users-dry`로 형식을 확인한다. 한 줄이라도 틀리면 아무것도 쓰지 않고 멈춘다.
3. `users`를 실행한다(`--admin`은 한 번 이상 로그인한 활성 관리자).
   - 등록은 그 관리자 이름으로 감사 기록에 남는다.
   - 비밀번호는 무작위 14자로 만들어 `work/accounts.local.csv`에만 쓴다.
   - 다시 실행하면 비밀번호가 새로 만들어진다.
4. 비밀번호는 사람에게 따로(대면·사내 메신저 1:1) 전한다. 첫 로그인 뒤 바꾸게 안내하고, 전달이 끝나면 `accounts.local.csv`를 지운다.
5. 이후 한 명씩 추가·재설정할 때는 관리자 화면 `설정 → 사용자·비밀번호`를 쓴다.
6. 퇴사·이동은 담당을 먼저 다른 사람에게 넘긴 뒤 비활성화한다. 삭제하지 않는다.

## 동시 사용과 비용

요금은 2026-10 기준 공개 자료이고, 계약 전에 각 공식 요금표로 다시 확인한다. 사용량은 아래 가정에 따른 추정이다. 첫 달 실제 사용량(Supabase Usage, Cloudflare Workers Analytics, OpenAI Usage)을 보고 고친다.

### 구조상 부하가 걸리는 곳

| 구간 | 동시 사용 시 특성 | 대응 |
| --- | --- | --- |
| Cloudflare Worker (화면·API) | 요청마다 독립 실행, 자동 확장. 동시 사용자 수 제한 없음 | 유료 $5/월이면 충분 |
| Supabase Edge → PostgreSQL | 로그인 때 기간 창(선택 기간+앞 8주+뒤 6주, 미완료 조치)만 읽음. 읽기는 동시 처리 | 300명 이상이 아침에 몰리면 compute를 Small 이상으로 |
| 쓰기 | 버전 충돌 검사 + 작업공간 쓰기 잠금으로 한 번에 하나씩 처리. 한 건은 짧음 | 수백 명 규모에서는 대기 체감 없음. 수천 명이면 측정 후 조정 |
| AI (OpenAI) | 요청당 비용. 실패하면 규칙 결과로 대체(DC-AI-FALLBACK) | 월 사용 한도 설정 필수 |

### 단가 (공개 자료)

| 서비스 | 요금 |
| --- | --- |
| Supabase Pro | 조직당 월 $25. Micro compute 1개 크레딧 포함. 월 활성 사용자 10만, DB 8GB, 이후 GB당 $0.125. 송출량 포함분은 자료마다 50GB/250GB로 다르고, 초과분은 GB당 $0.09 |
| Supabase compute 증설 | Small 약 $15/월, Medium 약 $60/월(공식 표 확인 필요) |
| Cloudflare Workers 유료 | 월 $5에 요청 1천만·CPU 3천만 ms 포함. 초과분은 요청 백만 건당 $0.30, CPU 백만 ms당 $0.02 |
| OpenAI `gpt-6-luna` (`OPENAI_MODEL` 기본값) | 입력 100만 토큰 $0.10, 출력 100만 토큰 $0.50 |

### AI 호출 1회 추정

| 호출 | 입력 | 출력 | 1회 비용 |
| --- | --- | --- | --- |
| 브리핑 (`brief`) | 약 15k 토큰 | 약 1.5k 토큰 | 약 $0.0023 |
| 방문 판정 (`judge`, 저장할 때) | 약 10k 토큰 | 약 1k 토큰 | 약 $0.0015 |
| 결과·일정 간편 입력, 문장 정리 | 약 4k 토큰(사진 1장당 +1~2k) | 약 0.5k 토큰 | 약 $0.0007 |

1인 하루 기준 가정은 브리핑 2회, 판정 4회, 간편 입력·정리 6회다. 이러면 하루 약 $0.014, 22일 근무로 1인 월 약 $0.31이 된다.

### 규모별 월 추정

| 사용자 | Supabase | Cloudflare | AI | 합계(월) |
| --- | --- | --- | --- | --- |
| 50명 | $25 (Micro) | $5 | 약 $16 | 약 $46 |
| 300명 | $40 (Small) | $5 | 약 $95 | 약 $140 |
| 1,000명 | $85 (Medium) | $5~10 | 약 $310 | 약 $400~405 |

- 비용이 가장 크게 움직이는 것은 AI 호출 수다. 브리핑은 사용자·직급별로 저장해 다시 부르지 않으므로, 하루 브리핑 횟수가 가정보다 크게 늘지는 않는다.
- 송출량 추정: 로그인 1회 약 1~3MB × 하루 3회 × 300명 × 22일이면 약 40GB/월이다. 송출량 포함분이 50GB라면 300명 근처에서 초과분이 생길 수 있다.
- 운영 첫 주에 Supabase Usage와 OpenAI Usage를 보고 위 가정을 실제 값으로 바꾼다.

출처:
- [Supabase 요금 정리(Jetadmin)](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/)
- [Supabase 요금(Makerkit)](https://makerkit.dev/blog/saas/supabase-pricing)
- [Cloudflare Workers 요금(공식)](https://developers.cloudflare.com/workers/platform/pricing/)
- [GPT-6 Luna 요금(eesel)](https://www.eesel.ai/blog/gpt-6-luna-pricing)
- [GPT-6 Sol·Luna 요금(Yotta Labs)](https://www.yottalabs.ai/post/gpt-6-sol-luna-pricing-vs-astra-open-models-2026)

## 되돌리기

- 데이터: `work/backup/<시각>/*.json`이 기준이다. 되살리기는 테이블 순서(도메인 → 사용자 → 현장 → 매장 → 배정·주기 → 방문 → 조치)대로 이관 파일로 만들어 승인 후 적용한다.
- 화면: GitHub Actions에서 이전 성공 커밋으로 `workflow_dispatch`를 다시 실행한다.
- 계정: 관리자 화면에서 비활성화하거나 비밀번호를 재설정한다.

## 아직 없는 것

- **현장·매장 일괄 적재 도구:** 지금은 화면에서 한 건씩 등록한다. 수가 많으면 별도 이슈로 만든다.
- **백업 되살리기 스크립트:** 백업 받기는 자동이지만, 되살리기는 이관 파일을 손으로 만들어야 한다.
- **선택 A의 새 프로젝트 부트스트랩 자동화:** 위 1~7번 순서를 사람이 승인하며 진행한다.
