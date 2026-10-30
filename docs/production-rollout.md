# 실제 서비스 배치 매뉴얼

2026-10-30. ZeniField를 실제 서비스로 배치하고 운영하는 방법이다. 운영 작업자와 에이전트(GPT·Codex·Claude)가 같은 명령으로 따라 한다.

- **절차 정본:** [`ops/production-rollout.json`](../ops/production-rollout.json). 기계가 읽는 단계 목록이다.
- **DB 대상 정본:** [`ops/db-targets.json`](../ops/db-targets.json). 이 문서는 두 파일을 사람이 읽게 풀어 쓴 것이다.
- 이 문서와 두 정본이 다르면 정본을 기준으로 이 문서를 고친다.

## 결정 (2026-10-30): 지금 프로젝트를 초기화해 실사용으로 쓴다

- **새 프로젝트는 보류:** 새 프로젝트 `ZenField-Live`(`cyrsdaqqnegrynhwurnb`)는 지금 배포 토큰의 계정으로 접근할 수 없어 보류했다.
- **실사용 DB:** 지금 프로젝트 `nhywssfwtnonytbkufyy`를 백업한 뒤 초기화(`db.mjs reset`)해서 실사용 DB로 쓴다.
- **시연:** DB 대신 브라우저 데모 모드(`?mode=demo`, 저장 안 함)로 한다.
- **지우는 것:** 데모·시험 데이터, 출처 없는 방문 1만 건, zf.* 시험 계정과 그 밖의 사용자. `--keep`에 적은 관리자만 남긴다.
- **남기는 것:** 스키마, 이관 이력, 남길 관리자의 로그인.
- **Auth 쪽 기록:** 지운 사용자의 Supabase Auth 계정은 남는다. 다만 `zf_users` 등록이 없으면 로그인되지 않는다.
- **나중에 DB를 둘로 나눌 때:** 시연과 실사용을 다시 나누게 되면 아래 '두 DB 구조'(`db.mjs bootstrap`·`switch`)를 그대로 쓴다.

### 초기화 단계

| 순서 | 단계 (`id`) | 누가 | 승인 | 하는 일 |
| --- | --- | --- | --- | --- |
| 1 | 사전 점검 (`preflight`) | 실행기 | – | 설정값·이관 대기·행 수 확인(읽기만) |
| 2 | 백업 (`backup`) | 실행기 | 필요 | `work/backup/demo-<시각>/`에 zf_ 테이블 9개 JSON |
| 3 | 초기화 (`reset`) | 실행기 | 필요 | 백업을 한 번 더 받고, 한 트랜잭션으로 업무 데이터와 남길 관리자 밖의 사용자를 삭제 |
| 4 | 관리자 로그인·도메인 (`admin-login`) | 사람 | – | 관리 도메인 등록 |
| 5 | 명단 미리 보기 (`users-dry`) | 실행기 | – | `work/users.csv` 형식 확인 |
| 6 | 직원 등록 (`users`) | 실행기 | 필요 | 등록 + 무작위 비밀번호 |
| 7 | 현장·매장 (`targets`) | 사람 | – | 현장·매장·담당·주기 |
| 8 | 운영 확인 (`verify`) | 실행기+사람 | – | 커밋·인증 경계, 직급별 로그인 |

```bash
node scripts/rollout.mjs run backup --approved-by 홍길동
node scripts/rollout.mjs run reset  --approved-by 홍길동 --admin jobsky@zeniel.co.kr
# 직접: node --env-file=.env scripts/db.mjs reset demo --keep jobsky@zeniel.co.kr --confirm nhywssfwtnonytbkufyy --approved-by 홍길동
```

- **reset의 안전장치:**
  - `--confirm`에 대상 ref를 한 번 더 적어야 실행된다.
  - `--keep`의 메일은 로그인한 적 있는 활성 admin이어야 한다.
  - 지우기 직전에 백업을 다시 받는다.
- **PGlite 검증:** 시드 데이터(사용자 41, 방문 1,800, 조치 972 등)를 넣은 PGlite에서 같은 삭제를 돌려, 외래키 오류 없이 관리자 1명만 남는 것을 확인했다.
- **되돌리기:** 백업 JSON으로 되살리는 스크립트는 아직 없다. 필요하면 백업 파일로 이관 파일을 만들어 승인 후 적용한다.

## 두 DB 구조 (보류, 나중에 나눌 때)

| DB | 용도 | Supabase 프로젝트 |
| --- | --- | --- |
| 시연 DB (`demo`) | 지금은 초기화 후 실사용 | `nhywssfwtnonytbkufyy` |
| 실사용 DB (`real`) | 보류 | 새 프로젝트(접근 가능한 계정으로 만들 때) |

- **연결은 하나:** 운영 앱(Cloudflare Worker `zenifield`)은 `ops/db-targets.json`의 `active`에 적힌 DB 하나에만 붙는다.
- **연결 교체는 값 하나:** `active`만 바꿔 main에 푸시하면 CI가 그 DB에 이관과 Edge 함수를 맞추고, Worker의 `ZENIFIELD_SUPABASE_URL`을 바꿔 배포한다.
- **바꿀 비밀값이 없음:** 게이트웨이 토큰 검증값은 Edge 코드에 들어 있어서 두 DB가 같은 Worker 토큰을 쓴다. 그래서 교체 때 바꿀 비밀값이 없다.
- **토큰 하나로 둘 다:** 두 프로젝트를 같은 Supabase 조직에 두면, 계정 토큰 하나(`SUPABASE_ACCESS_TOKEN`)로 둘 다 다룰 수 있다.
- **로그인 계정은 DB마다 따로:** 시연 DB의 시험 계정으로는 실사용 DB에 로그인할 수 없다.

## 자주 쓰는 명령

```bash
node --env-file=.env scripts/db.mjs status                              # 두 DB 상태·이관 대기·지금 연결
node --env-file=.env scripts/db.mjs migrate all --dry-run               # 스키마 전환 미리 보기(두 DB)
node --env-file=.env scripts/db.mjs migrate demo --approved-by 홍길동    # 시연 DB 스키마 전환(이관 + Edge)
node --env-file=.env scripts/db.mjs migrate real --approved-by 홍길동    # 실사용 DB 스키마 전환
node --env-file=.env scripts/db.mjs migrate all  --approved-by 홍길동    # 두 DB 모두
node --env-file=.env scripts/db.mjs switch real  --approved-by 홍길동    # 운영 앱 연결 교체(푸시하면 반영)
node scripts/rollout.mjs list                                           # 배치 단계와 진행 상태
```

### 스키마를 바꿀 때

1. `supabase/migrations/<날짜시각>_<이름>.sql`을 새로 만든다. 적용된 파일은 고치지 않는다. 두 번 실행해도 안전하게 쓴다(`if not exists`, `drop … if exists`).
2. 로컬 PGlite에서 옛 스키마에 먼저 적용해 본다.
3. main에 푸시하면 CI가 **연결된 DB(active)**에 이관 → 번들 → Edge 2개 → 화면 배포를 한다.
4. 연결되지 않은 다른 DB는 아래 명령 한 줄로 맞춘다. 두 DB의 스키마가 어긋난 채로 두지 않는다.
   ```bash
   node --env-file=.env scripts/db.mjs migrate demo --approved-by <승인자>   # active가 real일 때
   ```
5. `db.mjs status`로 두 DB 모두 `미적용 0개`인지 확인한다.

이관 이력은 DB마다 `zf_schema_migrations`에 남는다. 같은 파일은 다시 실행되지 않는다.

## 두 DB로 나눌 때의 배치 단계 (보류)

`ops/production-rollout.json`은 지금 위 '초기화 단계'로 되어 있다. 아래 순서는 두 DB 구조를 다시 쓸 때의 참고다.

| 순서 | 단계 (`id`) | 누가 | 승인 | 하는 일 |
| --- | --- | --- | --- | --- |
| 1 | 사전 점검 (`preflight`) | 실행기 | – | 설정값, 두 DB 상태 확인(읽기만) |
| 2 | 실사용 프로젝트 (`real-project`) | 사람 | 필요 | Supabase 새 프로젝트(서울·Pro), ref를 `ops/db-targets.json`에 기록 |
| 3 | 설치 (`bootstrap`) | 실행기 | 필요 | `schema.sql` 설치 → 이관 → 첫 관리자 → Edge 2개 |
| 4 | 첫 관리자 비밀번호 (`admin-password`) | 관리자 본인 | – | `set-password.mjs`로 직접 입력 |
| 5 | 연결 교체 (`switch`) | 실행기 | 필요 | `active=real` 커밋·푸시, CI가 반영 |
| 6 | 첫 로그인·도메인 (`admin-login`) | 사람 | – | 로그인, 관리 도메인 등록 |
| 7 | 명단 미리 보기 (`users-dry`) | 실행기 | – | `work/users.csv` 형식 확인(쓰지 않음) |
| 8 | 직원 등록 (`users`) | 실행기 | 필요 | 사용자 등록 + 무작위 비밀번호 → `work/accounts.local.csv` |
| 9 | 현장·매장 (`targets`) | 사람 | – | 현장·매장·담당·주기 등록 |
| 10 | 운영 확인 (`verify`) | 실행기+사람 | – | 공개 주소 커밋·인증 경계, 직급별 로그인 |

```bash
node scripts/rollout.mjs show bootstrap
node scripts/rollout.mjs run bootstrap --approved-by 홍길동 --admin admin@zeniel.co.kr --name 홍길동
node scripts/rollout.mjs done admin-password
```

- 앞 단계가 끝나지 않으면 실행하지 않는다. 명령이 실패하면 그 자리에서 멈춘다.
- `db: real` 단계는 실행기가 연결값을 실사용 DB로 바꿔 넘긴다.
- 상태와 기록은 `work/rollout-state.json`, `work/rollout.log`에 남는다(git 제외). 끝나면 요약을 `docs/feature-status.md`에 날짜와 함께 옮긴다.

### 되돌리기

- **연결:** `node --env-file=.env scripts/db.mjs switch demo --approved-by <승인자>`를 실행한 뒤 푸시한다. 실사용 DB의 데이터는 그대로 남는다.
- **화면:** GitHub Actions에서 이전 성공 커밋으로 다시 실행한다.

## 에이전트(GPT·Codex·Claude) 실행 규칙

1. 시작하면 `node scripts/rollout.mjs list`와 `node --env-file=.env scripts/db.mjs status`로 현재 상태를 본다.
2. 자동 단계만 `run`한다.
   - 승인 단계는 사람이 대화에서 준 승인 이름을 `--approved-by`에 넣는다.
   - 승인을 지어내거나 스스로 승인하지 않는다.
3. 수동 단계는 사람에게 할 일을 그대로 전하고, 끝났다고 들으면 `done`으로 기록한다. 비밀번호 입력(`admin-password`)은 대신 하지 않는다.
4. 스키마 변경 요청을 받으면 위 '스키마를 바꿀 때' 절차대로 한다. 두 DB 모두 `미적용 0개`를 확인하고 보고한다.
5. 실패하면 출력 그대로 보고하고 멈춘다. SQL을 직접 실행하거나 다른 명령으로 우회하지 않는다(DC-HALT).
6. 비밀번호·토큰·`work/accounts.local.csv` 내용은 출력·대화·커밋에 옮기지 않는다.

## 계정 등록

1. [`ops/users.template.csv`](../ops/users.template.csv)를 `work/users.csv`로 복사해 실제 명단을 채운다. 실제 명단은 커밋하지 않는다.
   - **칸:** `id,email,name,role,team,part,domains`
   - **role:** `admin`(시스템 관리자) · `director`(사업부장) · `lead`(팀장) · `partlead`(파트장) · `manager`(잡매니저)
   - **domains:** 관리 도메인 ID를 `;`로 구분해 쓴다. 관리자·사업부장은 비운다.
   - **id:** 바꾸지 않는 사번 기반 값을 쓴다(예: `u-20231234`). 담당·방문 기록이 id에 붙는다.
2. `users-dry`로 미리 본다. 형식이 틀린 줄이 하나라도 있으면 아무것도 쓰지 않고 멈춘다.
3. `users`를 실행한다(`--admin`은 실사용 DB에 한 번 이상 로그인한 관리자).
   - 등록은 그 관리자 이름으로 감사 기록에 남는다.
   - 비밀번호는 무작위 14자로 만들어 `work/accounts.local.csv`에만 쓴다.
4. 비밀번호는 직원에게 따로(대면 또는 사내 메신저 1:1) 전한다. 첫 로그인 뒤 바꾸게 안내하고, 전달이 끝나면 파일을 지운다.
5. 이후 한 명씩 추가하거나 재설정할 때는 관리자 화면 `설정 → 사용자·비밀번호`를 쓴다.
6. 퇴사·이동은 담당을 넘긴 뒤 비활성화한다. 삭제하지 않는다.

## 요금제 업그레이드

지금 설정: Supabase 시연 프로젝트, Cloudflare Worker `zenifield`(회사 계정 `jobsky@zeniel.co.kr`), OpenAI `gpt-6-luna`.

| 서비스 | 언제 올리나 | 어디서 | 할 일 |
| --- | --- | --- | --- |
| Supabase 조직 플랜 Free → Pro ($25/월) | 실사용 DB를 만들기 전(필수) | 대시보드 → Organization → Billing → Change plan | Free는 일정 기간 쓰지 않으면 프로젝트가 멈추고 백업이 없다. Pro는 조직 단위라 시연·실사용 두 프로젝트가 같은 플랜을 쓴다. 두 번째 프로젝트부터는 프로젝트당 compute 요금이 붙는다(Micro 약 $10, Pro 크레딧 $10은 1개분) |
| Supabase compute Micro → Small / Medium | 실사용 DB, 아침 동시 접속 300명 이상, 또는 Usage에서 CPU·메모리가 늘 80% 이상일 때 | 프로젝트 → Settings → Compute and Disk | 몇 분간 재시작된다. 업무 시간 밖에 바꾼다. 시연 DB는 Micro로 둔다 |
| Supabase 사용량 상한(Spend cap) | 처음부터 | Organization → Billing → Spend cap | 켜 두면 포함량을 넘을 때 과금 대신 제한이 걸린다. 운영이 안정되면 끄고 예산 알림으로 바꾼다 |
| Cloudflare Workers Free → Paid ($5/월) | 실사용 전환 전(권장) | Cloudflare → Workers & Pages → Plans | Free는 하루 요청 10만·CPU 10ms 제한이라 업무 시간에 걸릴 수 있다. Paid는 월 1천만 요청 포함 |
| OpenAI 사용 한도·등급 | 실사용 전환 전(필수) | platform.openai.com → Settings → Limits / Billing | 월 사용 한도(예: 예상의 2배)와 알림(예상의 80%)을 건다. 등급(Tier)은 누적 결제액에 따라 자동으로 오르며, 분당 요청 한도가 부족하면 브리핑이 규칙 결과로 대체된다 |

플랜을 바꾼 날짜와 이유는 `docs/feature-status.md`에 남긴다.

## 동시 사용과 비용

요금은 2026-10 기준 공개 자료다. 계약 전에 각 공식 요금표로 다시 확인한다. 사용량은 아래 가정으로 계산한 추정이며, 첫 달 실제 사용량(Supabase Usage, Cloudflare Workers Analytics, OpenAI Usage)을 보고 고친다.

### 부하가 걸리는 곳

| 구간 | 동시 사용 시 특성 | 대응 |
| --- | --- | --- |
| Cloudflare Worker (화면·API) | 요청마다 독립 실행, 자동 확장 | Paid $5/월이면 충분 |
| Supabase Edge → PostgreSQL | 로그인 때 기간 창(선택 기간+앞 8주+뒤 6주, 미완료 조치)만 읽음. 읽기는 동시에 처리됨 | 300명 이상이 동시에 몰리면 compute Small 이상 |
| 쓰기 | 버전 충돌 검사 + 작업공간 쓰기 잠금으로 한 건씩 처리. 한 건은 짧음 | 수백 명 규모는 대기를 느끼기 어려움. 수천 명이면 측정 후 조정 |
| AI (OpenAI) | 요청마다 비용. 실패하면 규칙 결과로 대체(DC-AI-FALLBACK) | 월 사용 한도 필수 |

### 단가 (공개 자료)

| 서비스 | 요금 |
| --- | --- |
| Supabase Pro | 조직당 월 $25. Micro 1개분 크레딧 포함. 월 활성 사용자 10만, DB 8GB 포함, 초과 GB당 $0.125. 송출량은 자료마다 50GB/250GB로 다르고, 초과 GB당 $0.09 |
| Supabase compute | Micro 약 $10, Small 약 $15, Medium 약 $60 /월(공식 표 확인 필요) |
| Cloudflare Workers Paid | 월 $5에 요청 1천만·CPU 3천만 ms 포함. 초과 요청 백만당 $0.30, CPU 백만 ms당 $0.02 |
| OpenAI `gpt-6-luna` | 입력 100만 토큰 $0.10, 출력 100만 토큰 $0.50 |

### AI 호출 1회 추정

| 호출 | 입력 | 출력 | 1회 비용 |
| --- | --- | --- | --- |
| 브리핑 (`brief`) | 약 15k 토큰 | 약 1.5k 토큰 | 약 $0.0023 |
| 방문 판정 (`judge`, 저장할 때) | 약 10k 토큰 | 약 1k 토큰 | 약 $0.0015 |
| 간편 입력·문장 정리 | 약 4k 토큰(사진 1장당 +1~2k) | 약 0.5k 토큰 | 약 $0.0007 |

1인 하루 가정은 브리핑 2회, 판정 4회, 간편 입력·정리 6회다. 이러면 하루 약 $0.014, 22일 근무로 1인 월 약 $0.31이다.

### 규모별 월 추정 (시연 DB Micro 포함)

| 사용자 | Supabase | Cloudflare | AI | 합계(월) |
| --- | --- | --- | --- | --- |
| 50명 | $25 + 실사용 Micro $10 = $35 | $5 | 약 $16 | 약 $56 |
| 300명 | $25 + Small $15 + 시연 Micro $10 = $50 | $5 | 약 $95 | 약 $150 |
| 1,000명 | $25 + Medium $60 + 시연 Micro $10 = $95 | $5~10 | 약 $310 | 약 $410~415 |

- 비용을 가장 크게 움직이는 것은 AI 호출 수다. 브리핑은 사용자·직급별로 저장해 다시 부르지 않으므로, 하루 브리핑 횟수가 가정보다 크게 늘지는 않는다.
- 송출량 추정: 로그인 1회 약 1~3MB × 하루 3회 × 300명 × 22일이면 약 40GB/월이다. 송출량 포함분이 50GB라면 300명 근처에서 초과분이 생길 수 있다.

출처:
- [Supabase 요금(Jetadmin)](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/)
- [Supabase 요금(Makerkit)](https://makerkit.dev/blog/saas/supabase-pricing)
- [Cloudflare Workers 요금(공식)](https://developers.cloudflare.com/workers/platform/pricing/)
- [GPT-6 Luna 요금(eesel)](https://www.eesel.ai/blog/gpt-6-luna-pricing)
- [GPT-6 Sol·Luna 요금(Yotta Labs)](https://www.yottalabs.ai/post/gpt-6-sol-luna-pricing-vs-astra-open-models-2026)

## 아직 없는 것

- **현장·매장 일괄 적재 도구:** 지금은 화면에서 한 건씩 등록한다. 수가 많으면 별도 이슈로 만든다.
- **시연 앱 별도 주소:** 운영 앱은 한 DB에만 붙는다. 시연 DB를 화면으로 보려면 로컬 서버(`.env`의 `ZENIFIELD_SUPABASE_URL`을 시연 DB로) 또는 데모 모드(`?mode=demo`, 브라우저 메모리)를 쓴다. 시연 전용 Worker가 필요하면 별도 이슈로 만든다.
- **실사용 DB 설치의 실제 실행:** 설치 절차는 PGlite에서만 검증했다. `schema.sql` 위에 이관을 두 번씩 실행해 통과했다. 실제 프로젝트에서 처음 실행할 때 결과를 이 문서에 기록한다.
