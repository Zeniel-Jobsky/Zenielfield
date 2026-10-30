# 실서비스 오픈 가이드

ZeniField를 실제 직원이 쓰게 여는 데 필요한 모든 것을 한 문서에 둔다. 처음에는 **1. 오픈 체크리스트**만 따라 하면 되고, 2절부터는 명령·메일·비용·되돌리기의 자세한 설명이다. 절차 정본은 기계가 읽는 `ops/production-rollout.json`(실행기 `node scripts/rollout.mjs`), 에이전트용 명령 표는 [AGENTS.md "운영 DB·배치 명령"](../AGENTS.md)이다. 셋이 다르면 JSON 기준으로 이 문서를 고친다.

## 차례

- [1. 오픈 체크리스트](#1-오픈-체크리스트)
- [2. 배치 명령·DB 초기화·계정·비용 상세](#2-배치-명령db-초기화계정비용-상세)
- [3. 회사 SMTP 연결(메일 링크 로그인)](#3-회사-smtp-연결메일-링크-로그인)

## 1. 오픈 체크리스트

ZeniField를 실제 직원이 쓰게 여는 순서다. 한 단계씩 따라 하고 끝나면 체크한다. 명령의 자세한 옵션, 비용, 되돌리기는 [배치 매뉴얼](go-live.md)에 있다. 에이전트에게 맡길 때 쓰는 명령 표는 [AGENTS.md "운영 DB·배치 명령"](../AGENTS.md)에 있다.

> 기준: 2026-10-30. 운영 DB = Supabase `nhywssfwtnonytbkufyy`(지금 프로젝트를 초기화해서 씀). 앱 주소 = https://zenifield.jobsky.workers.dev

### 0. 준비 (운영 담당)

- [ ] 로컬 `.env`에 `SUPABASE_ACCESS_TOKEN`, `ZENIFIELD_SUPABASE_URL`, `ZENIFIELD_GATEWAY_TOKEN`이 있다. 값은 비밀번호 관리자에서 받는다. 파일로 주고받지 않는다.
- [ ] `node scripts/rollout.mjs run preflight`를 실행해 설정값이 모두 ✓이고 이관 미적용이 0인지 본다.
- [ ] 요금제를 정한다. Supabase Pro, Cloudflare Workers Paid, OpenAI 월 한도([요금제 업그레이드](#요금제-업그레이드)).

### 1. 데이터 비우기 (운영 담당, 승인 필요)

- [ ] **백업:** `node scripts/rollout.mjs run backup --approved-by <승인자>`를 실행한다. 결과는 `work/backup/`에 남는다.
- [ ] **초기화:** `node scripts/rollout.mjs run reset --approved-by <승인자> --admin <남길 관리자 메일>`을 실행한다.
  - 시연 데이터와 남길 관리자 외 사용자를 지우고, 스키마는 남긴다.
- [ ] `node --env-file=.env scripts/db.mjs status`로 사용자는 남길 관리자만, 업무 데이터는 0인지 확인한다.

### 지금 방식: SMTP 없이 비밀번호 나눠 주기 (2026-10-30 결정)

회사 SMTP를 연결하기 전까지는 메일 링크 대신 무작위 비밀번호를 만들어 나눠 준다. 2단계는 건너뛰고 4·5단계를 아래처럼 한다.

- [ ] 명단을 `work/users.csv`로 저장한다(관리자 화면 `명단 양식`과 같은 형식).
- [ ] `node scripts/rollout.mjs run users-dry --admin <관리자>`를 실행한다.
- [ ] 이어서 `node --env-file=.env scripts/provision-accounts.mjs --csv work/users.csv --admin <관리자>`를 실행한다. `--no-password`를 빼면 비밀번호를 만든다.
  - 사람마다 무작위 비밀번호가 `work/accounts.local.csv`(git 제외)에 써진다.
  - 다시 실행하면 비밀번호가 새로 만들어진다.
- [ ] `accounts.local.csv`의 비밀번호를 한 사람씩 따로 전한다(대면·사내 메신저 1:1). 단체방·메일 일괄 발송은 하지 않는다.
- [ ] 직원은 받은 비밀번호로 로그인한 뒤 **설정 → 내 계정 → 로그인 비밀번호**에서 바로 바꾼다.
- [ ] 다 전했으면 `work/accounts.local.csv`를 지운다.
- [ ] 그 뒤 한 명씩 추가하거나 재설정할 때는 관리자 화면 **설정 → 사용자·권한**의 비밀번호 발급을 쓴다.

### 2. 로그인 메일 준비 (SMTP를 연결할 때, 운영 담당)

자세한 방법(회사 메일 서버 또는 Amazon SES, IT 요청문, 메일 문구, 확인·문제 해결)은 [회사 SMTP 연결 가이드](go-live.md)에 있다.

- [ ] **SMTP:** Authentication → Emails → SMTP Settings에 회사 SMTP를 넣는다(보내는 주소 예: `no-reply@zeniel.co.kr`).
- [ ] **발송 한도:** Authentication → Rate Limits에서 이메일 발송 한도를 직원 수에 맞게 올린다.
- [ ] **메일 문구:** Magic Link 메일 제목·본문을 한국어로 바꾼다.
- [ ] **콜백 주소:** URL Configuration에 `https://zenifield.jobsky.workers.dev/auth/callback`이 있다.
- [ ] **확인:** 관리자 본인 메일로 로그인 링크를 받아 본다.

> SMTP 없이 직원을 등록하면 Supabase 기본 메일(시간당 몇 통) 한도에 걸려 첫 로그인 메일이 대부분 오지 않는다.

### 3. 관리자 준비 (시스템 관리자, 앱 화면)

- [ ] 남긴 관리자로 로그인한다.
- [ ] **설정 → 관리 도메인**에서 사업 도메인을 등록한다.
- [ ] **설정 → 내 계정 → 로그인 비밀번호**에서 본인 비밀번호를 정한다(다음부터 링크 없이 로그인).

### 4. 직원 일괄 등록 (시스템 관리자, 앱 화면)

- [ ] **양식 받기:** 설정 → 사용자·권한 → `명단 양식`을 누르면 지금 명단과 예시 한 줄이 든 CSV가 내려받아진다.
- [ ] **채우기:** Excel에서 `email, name, role, team, part, domains, active`를 채운다.
  - role: `admin` · `director` · `lead` · `partlead` · `manager`
  - domains: 도메인 ID를 `;`로 구분
  - active: 1이면 사용, 0이면 비활성
- [ ] **올리기:** `명단 올리기`로 파일을 올리면 새로·바뀜·같음·오류가 미리 보인다. 오류가 0이면 `n건 반영`을 누른다.
  - 한 건씩 저장되고 감사 기록이 남는다.
  - 실패한 줄은 이유와 함께 보인다.
- [ ] 같은 방법으로 나중에 부서·역할을 바꾸거나 비활성화(active 0)를 정리한다. 삭제는 하지 않는다.

> 명령으로 넣을 수도 있다: `work/users.csv` → `node scripts/rollout.mjs run users-dry --admin <관리자>` → `run users --approved-by <승인자> --admin <관리자>`.

### 5. 첫 로그인 안내 (시스템 관리자)

- [ ] 직원에게 [안내문](#직원-안내문-복사해서-보내기)을 보낸다. 직원이 할 일은 이렇다.
  1. 접속 주소를 연다.
  2. `비밀번호가 없거나 잊었어요`를 누르고 회사 메일을 넣는다.
  3. 받은 링크를 같은 브라우저에서 연다. 이때 계정이 활성화된다.
  4. 설정 → 내 계정에서 비밀번호를 정한다.
- [ ] `node --env-file=.env scripts/db.mjs activation`으로 직급별 첫 로그인 완료 수를 보고, 대기 명단(`work/activation-pending.csv`)에 따로 연락한다.

### 6. 현장·매장 등록 (관리자·팀장·파트장, 앱 화면)

- [ ] 담당·주기 관리에서 현장을 등록하고, 산하 매장을 등록하고, 담당자·관리 주기를 지정한다.
- [ ] 잡매니저 계정으로 로그인해 자기 현장만 보이는지 확인한다.

### 7. 오픈 확인

- [ ] `node scripts/rollout.mjs run verify`로 공개 주소의 커밋과 인증 경계를 확인한다.
- [ ] 직급별(관리자·사업부장·팀장·파트장·잡매니저)로 한 명씩 로그인해 운영 현황·방문 일정·방문·조치의 범위가 맞는지 본다.
- [ ] 끝난 날짜와 결과를 [feature-status.md](feature-status.md)에 한 줄로 남긴다.

### 막히면

| 증상 | 확인 |
| --- | --- |
| 로그인 메일이 안 옴 | 2단계 SMTP·발송 한도, 명단에 그 메일이 활성으로 있는지 |
| 링크를 열면 로그인 화면으로 돌아감 | 링크를 요청한 브라우저에서 열었는지(메일 앱 내장 브라우저 X) |
| 명단 반영에서 일부 실패 | 실패 줄 이유 확인. 담당이 남은 사람의 비활성화·팀 변경은 담당을 먼저 넘긴다 |
| 로그인했는데 화면이 비어 있음 | 6단계 담당 지정 |
| 명령이 실패 | 출력 그대로 운영 담당에게 전달. 다른 방법으로 우회하지 않는다 |

## 2. 배치 명령·DB 초기화·계정·비용 상세

2026-10-30. ZeniField를 실제 서비스로 배치하고 운영하는 방법이다. 운영 작업자와 에이전트(GPT·Codex·Claude)가 같은 명령으로 따라 한다.

- **절차 정본:** [`ops/production-rollout.json`](../ops/production-rollout.json). 기계가 읽는 단계 목록이다.
- **DB 대상 정본:** [`ops/db-targets.json`](../ops/db-targets.json). 이 문서는 두 파일을 사람이 읽게 풀어 쓴 것이다.
- 이 문서와 두 정본이 다르면 정본을 기준으로 이 문서를 고친다.

### 결정 (2026-10-30): 지금 프로젝트를 초기화해 실사용으로 쓴다

- **새 프로젝트는 보류:** 새 프로젝트 `ZenField-Live`(`cyrsdaqqnegrynhwurnb`)는 지금 배포 토큰의 계정으로 접근할 수 없어 보류했다.
- **실사용 DB:** 지금 프로젝트 `nhywssfwtnonytbkufyy`를 백업한 뒤 초기화(`db.mjs reset`)해서 실사용 DB로 쓴다.
- **시연:** DB 대신 브라우저 데모 모드(`?mode=demo`, 저장 안 함)로 한다.
- **지우는 것:** 데모·시험 데이터, 출처 없는 방문 1만 건, zf.* 시험 계정과 그 밖의 사용자. `--keep`에 적은 관리자만 남긴다.
- **남기는 것:** 스키마, 이관 이력, 남길 관리자의 로그인.
- **Auth 쪽 기록:** 지운 사용자의 Supabase Auth 계정은 남는다. 다만 `zf_users` 등록이 없으면 로그인되지 않는다.
- **나중에 DB를 둘로 나눌 때:** `db.mjs bootstrap`·`switch`와 `ops/db-targets.json`이 그대로 남아 있다(명령 설명은 scripts/db.mjs 머리말).

#### 초기화 단계

| 순서 | 단계 (`id`) | 누가 | 승인 | 하는 일 |
| --- | --- | --- | --- | --- |
| 1 | 사전 점검 (`preflight`) | 실행기 | – | 설정값·이관 대기·행 수 확인(읽기만) |
| 2 | 백업 (`backup`) | 실행기 | 필요 | `work/backup/demo-<시각>/`에 zf_ 테이블 9개 JSON |
| 3 | 초기화 (`reset`) | 실행기 | 필요 | 백업을 한 번 더 받고, 한 트랜잭션으로 업무 데이터와 남길 관리자 밖의 사용자를 삭제 |
| 4 | 메일 발송 설정 (`smtp`) | 사람 | 필요 | Supabase Auth에 회사 SMTP, 발송 한도, 한국어 메일, 콜백 주소 |
| 5 | 관리자 로그인·도메인 (`admin-login`) | 사람 | – | 관리 도메인 등록 |
| 6 | 명단 미리 보기 (`users-dry`) | 실행기 | – | `work/users.csv` 형식 확인 |
| 7 | 직원 일괄 등록 (`users`) | 실행기 | 필요 | 명단 전체를 `zf_users`에 등록(비밀번호 없음) |
| 8 | 첫 로그인 안내 (`notify`) | 사람 | – | 아래 직원 안내문 발송 |
| 9 | 활성화 확인 (`activation`) | 실행기 | – | 직급별 첫 로그인 완료 수, 대기 명단 |
| 10 | 현장·매장 (`targets`) | 사람 | – | 현장·매장·담당·주기 |
| 11 | 운영 확인 (`verify`) | 실행기+사람 | – | 커밋·인증 경계, 직급별 로그인 |

#### 한 번에 보기: 초기화 → 일괄 등록 → 첫 로그인 활성화

```bash
node scripts/rollout.mjs run preflight
node scripts/rollout.mjs run backup     --approved-by 홍길동
node scripts/rollout.mjs run reset      --approved-by 홍길동 --admin jobsky@zeniel.co.kr
node scripts/rollout.mjs done smtp      --approved-by 홍길동          # 대시보드에서 SMTP 설정 후
node scripts/rollout.mjs done admin-login                             # 로그인·관리 도메인 등록 후
node scripts/rollout.mjs run users-dry  --admin jobsky@zeniel.co.kr
node scripts/rollout.mjs run users      --approved-by 홍길동 --admin jobsky@zeniel.co.kr
node scripts/rollout.mjs done notify                                  # 안내문 발송 후
node scripts/rollout.mjs run activation                               # 몇 번이든 다시 실행
```

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

### 자주 쓰는 명령

```bash
node --env-file=.env scripts/db.mjs status                              # 두 DB 상태·이관 대기·지금 연결
node --env-file=.env scripts/db.mjs migrate all --dry-run               # 스키마 전환 미리 보기(두 DB)
node --env-file=.env scripts/db.mjs migrate demo --approved-by 홍길동    # 시연 DB 스키마 전환(이관 + Edge)
node --env-file=.env scripts/db.mjs migrate real --approved-by 홍길동    # 실사용 DB 스키마 전환
node --env-file=.env scripts/db.mjs migrate all  --approved-by 홍길동    # 두 DB 모두
node --env-file=.env scripts/db.mjs switch real  --approved-by 홍길동    # 운영 앱 연결 교체(푸시하면 반영)
node scripts/rollout.mjs list                                           # 배치 단계와 진행 상태
```

#### 스키마를 바꿀 때

1. `supabase/migrations/<날짜시각>_<이름>.sql`을 새로 만든다. 적용된 파일은 고치지 않는다. 두 번 실행해도 안전하게 쓴다(`if not exists`, `drop … if exists`).
2. 로컬 PGlite에서 옛 스키마에 먼저 적용해 본다.
3. main에 푸시하면 CI가 **연결된 DB(active)**에 이관 → 번들 → Edge 2개 → 화면 배포를 한다.
4. 연결되지 않은 다른 DB는 아래 명령 한 줄로 맞춘다. 두 DB의 스키마가 어긋난 채로 두지 않는다.
   ```bash
   node --env-file=.env scripts/db.mjs migrate demo --approved-by <승인자>   # active가 real일 때
   ```
5. `db.mjs status`로 두 DB 모두 `미적용 0개`인지 확인한다.

이관 이력은 DB마다 `zf_schema_migrations`에 남는다. 같은 파일은 다시 실행되지 않는다.

### 에이전트(GPT·Codex·Claude) 실행 규칙

요청별 명령 표는 [AGENTS.md "운영 DB·배치 명령"](../AGENTS.md)이 정본이다. 아래는 요약이다.

1. 시작하면 `node scripts/rollout.mjs list`와 `node --env-file=.env scripts/db.mjs status`로 현재 상태를 본다.
2. 자동 단계만 `run`한다.
   - 승인 단계는 사람이 대화에서 준 승인 이름을 `--approved-by`에 넣는다.
   - 승인을 지어내거나 스스로 승인하지 않는다.
3. 수동 단계는 사람에게 할 일을 그대로 전하고, 끝났다고 들으면 `done`으로 기록한다. 비밀번호 입력(`admin-password`)은 대신 하지 않는다.
4. 스키마 변경 요청을 받으면 위 '스키마를 바꿀 때' 절차대로 한다. 두 DB 모두 `미적용 0개`를 확인하고 보고한다.
5. 실패하면 출력 그대로 보고하고 멈춘다. SQL을 직접 실행하거나 다른 명령으로 우회하지 않는다(DC-HALT).
6. 비밀번호·토큰·`work/accounts.local.csv` 내용은 출력·대화·커밋에 옮기지 않는다.

### 계정 등록

1. [`ops/users.template.csv`](../ops/users.template.csv)를 `work/users.csv`로 복사해 실제 명단을 채운다. 실제 명단은 커밋하지 않는다.
   - **칸:** `id,email,name,role,team,part,domains`
   - **role:** `admin`(시스템 관리자) · `director`(사업부장) · `lead`(팀장) · `partlead`(파트장) · `manager`(잡매니저)
   - **domains:** 관리 도메인 ID를 `;`로 구분해 쓴다. 관리자·사업부장은 비운다.
   - **id:** 바꾸지 않는 사번 기반 값을 쓴다(예: `u-20231234`). 담당·방문 기록이 id에 붙는다.
2. `users-dry`로 미리 본다. 형식이 틀린 줄이 하나라도 있으면 아무것도 쓰지 않고 멈춘다.
3. `users`를 실행해 일괄 등록한다(`--admin`은 로그인한 적 있는 관리자).
   - 명단 전체를 `zf_users`에 넣는다. 등록은 그 관리자 이름으로 감사 기록에 남는다.
   - 기본은 `--no-password`다. 비밀번호를 만들지 않고 나눠 주지도 않는다.
   - 같은 명단으로 다시 실행하면 이미 있는 사람은 수정만 한다.
4. **첫 로그인 = 계정 활성화**
   - 직원이 로그인 화면에서 `비밀번호가 없거나 잊었어요`를 눌러 회사 메일을 넣고, 받은 링크를 같은 브라우저에서 연다.
   - 서버는 등록된 활성 메일에만 링크를 보낸다. 등록 여부는 화면에 드러내지 않는다.
   - 링크로 들어오면 그 계정에 로그인 주체(`subject`)가 연결되고, 그때부터 활성 사용자가 된다(첫 조회 `zf_read`가 subject 없는 같은 메일 행에 한 번 연결).
5. `node --env-file=.env scripts/db.mjs activation`으로 직급별 완료/전체 수를 본다. 대기 명단은 `work/activation-pending.csv`(git 제외)에 써서 개별 안내에 쓴다.
6. **비밀번호를 원하면**
   - 관리자 화면 `설정 → 로그인 비밀번호 발급·재설정`에서 사람마다 정한다.
   - 비밀번호를 한 번에 만들려면 `users`를 `--no-password` 없이 실행한다. 그러면 무작위 비밀번호가 `work/accounts.local.csv`에 써지고, 직원에게 따로 전한 뒤 파일을 지운다.
7. 퇴사·이동은 담당을 넘긴 뒤 비활성화한다. 삭제하지 않는다.

#### 직원 안내문 (복사해서 보내기)

> ZeniField 현장 운영 앱을 오늘부터 씁니다.
> 접속: https://zenifield.jobsky.workers.dev
> 처음 로그인: 로그인 화면에서 `비밀번호가 없거나 잊었어요` → 회사 메일 입력 → 메일로 온 로그인 링크를 같은 브라우저에서 열어 주세요. 링크는 한 번만 쓸 수 있고 잠시 뒤 만료됩니다.
> 메일이 안 오면 스팸함을 보고, 그래도 없으면 관리자에게 알려 주세요.

#### 첫 로그인에서 막히는 경우

| 증상 | 원인 | 조치 |
| --- | --- | --- |
| 메일이 안 옴 | 미등록·비활성 메일, SMTP 미설정, 발송 한도 초과 | `activation` 대기 명단에 있는지 확인 → `smtp` 단계 설정·Rate Limits 확인 |
| 링크를 열었는데 로그인 화면으로 돌아옴 | 다른 브라우저(메일 앱 내장 브라우저)에서 열었음 | 링크 요청한 브라우저에 주소를 붙여 넣어 열기 |
| "잠시 후 다시 요청" | 같은 메일로 짧은 시간에 여러 번 요청 | 1분 뒤 다시 |
| 로그인됐는데 화면이 비어 있음 | 담당 현장·매장 배정 전 | `targets` 단계에서 담당 지정 |

#### 알려진 한계

- **현장·매장 일괄 등록 도구가 없다.** 지금은 화면에서 한 건씩 등록한다.

### 요금제 업그레이드

지금 설정: Supabase 시연 프로젝트, Cloudflare Worker `zenifield`(회사 계정 `jobsky@zeniel.co.kr`), OpenAI `gpt-6-luna`.

| 서비스 | 언제 올리나 | 어디서 | 할 일 |
| --- | --- | --- | --- |
| Supabase 조직 플랜 Free → Pro ($25/월) | 실사용 DB를 만들기 전(필수) | 대시보드 → Organization → Billing → Change plan | Free는 일정 기간 쓰지 않으면 프로젝트가 멈추고 백업이 없다. Pro는 조직 단위라 시연·실사용 두 프로젝트가 같은 플랜을 쓴다. 두 번째 프로젝트부터는 프로젝트당 compute 요금이 붙는다(Micro 약 $10, Pro 크레딧 $10은 1개분) |
| Supabase compute Micro → Small / Medium | 실사용 DB, 아침 동시 접속 300명 이상, 또는 Usage에서 CPU·메모리가 늘 80% 이상일 때 | 프로젝트 → Settings → Compute and Disk | 몇 분간 재시작된다. 업무 시간 밖에 바꾼다. 시연 DB는 Micro로 둔다 |
| Supabase 사용량 상한(Spend cap) | 처음부터 | Organization → Billing → Spend cap | 켜 두면 포함량을 넘을 때 과금 대신 제한이 걸린다. 운영이 안정되면 끄고 예산 알림으로 바꾼다 |
| Cloudflare Workers Free → Paid ($5/월) | 실사용 전환 전(권장) | Cloudflare → Workers & Pages → Plans | Free는 하루 요청 10만·CPU 10ms 제한이라 업무 시간에 걸릴 수 있다. Paid는 월 1천만 요청 포함 |
| OpenAI 사용 한도·등급 | 실사용 전환 전(필수) | platform.openai.com → Settings → Limits / Billing | 월 사용 한도(예: 예상의 2배)와 알림(예상의 80%)을 건다. 등급(Tier)은 누적 결제액에 따라 자동으로 오르며, 분당 요청 한도가 부족하면 브리핑이 규칙 결과로 대체된다 |

플랜을 바꾼 날짜와 이유는 `docs/feature-status.md`에 남긴다.

### 동시 사용과 비용

요금은 2026-10 기준 공개 자료다. 계약 전에 각 공식 요금표로 다시 확인한다. 사용량은 아래 가정으로 계산한 추정이며, 첫 달 실제 사용량(Supabase Usage, Cloudflare Workers Analytics, OpenAI Usage)을 보고 고친다.

#### 부하가 걸리는 곳

| 구간 | 동시 사용 시 특성 | 대응 |
| --- | --- | --- |
| Cloudflare Worker (화면·API) | 요청마다 독립 실행, 자동 확장 | Paid $5/월이면 충분 |
| Supabase Edge → PostgreSQL | 로그인 때 기간 창(선택 기간+앞 8주+뒤 6주, 미완료 조치)만 읽음. 읽기는 동시에 처리됨 | 300명 이상이 동시에 몰리면 compute Small 이상 |
| 쓰기 | 버전 충돌 검사 + 작업공간 쓰기 잠금으로 한 건씩 처리. 한 건은 짧음 | 수백 명 규모는 대기를 느끼기 어려움. 수천 명이면 측정 후 조정 |
| AI (OpenAI) | 요청마다 비용. 실패하면 규칙 결과로 대체(DC-AI-FALLBACK) | 월 사용 한도 필수 |

#### 단가 (공개 자료)

| 서비스 | 요금 |
| --- | --- |
| Supabase Pro | 조직당 월 $25. Micro 1개분 크레딧 포함. 월 활성 사용자 10만, DB 8GB 포함, 초과 GB당 $0.125. 송출량은 자료마다 50GB/250GB로 다르고, 초과 GB당 $0.09 |
| Supabase compute | Micro 약 $10, Small 약 $15, Medium 약 $60 /월(공식 표 확인 필요) |
| Cloudflare Workers Paid | 월 $5에 요청 1천만·CPU 3천만 ms 포함. 초과 요청 백만당 $0.30, CPU 백만 ms당 $0.02 |
| OpenAI `gpt-6-luna` | 입력 100만 토큰 $0.10, 출력 100만 토큰 $0.50 |

#### AI 호출 1회 추정

| 호출 | 입력 | 출력 | 1회 비용 |
| --- | --- | --- | --- |
| 브리핑 (`brief`) | 약 15k 토큰 | 약 1.5k 토큰 | 약 $0.0023 |
| 방문 판정 (`judge`, 저장할 때) | 약 10k 토큰 | 약 1k 토큰 | 약 $0.0015 |
| 간편 입력·문장 정리 | 약 4k 토큰(사진 1장당 +1~2k) | 약 0.5k 토큰 | 약 $0.0007 |

1인 하루 가정은 브리핑 2회, 판정 4회, 간편 입력·정리 6회다. 이러면 하루 약 $0.014, 22일 근무로 1인 월 약 $0.31이다.

#### 규모별 월 추정 (시연 DB Micro 포함)

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

### 아직 없는 것

- **현장·매장 일괄 적재 도구:** 지금은 화면에서 한 건씩 등록한다. 수가 많으면 별도 이슈로 만든다.
- **시연 앱 별도 주소:** 운영 앱은 한 DB에만 붙는다. 시연 DB를 화면으로 보려면 로컬 서버(`.env`의 `ZENIFIELD_SUPABASE_URL`을 시연 DB로) 또는 데모 모드(`?mode=demo`, 브라우저 메모리)를 쓴다. 시연 전용 Worker가 필요하면 별도 이슈로 만든다.
- **실사용 DB 설치의 실제 실행:** 설치 절차는 PGlite에서만 검증했다. `schema.sql` 위에 이관을 두 번씩 실행해 통과했다. 실제 프로젝트에서 처음 실행할 때 결과를 이 문서에 기록한다.

### 운영 실행 메모 (2026-10-30)

- **명단 일괄 반영은 관리자 화면에서 한다(2026-10-30 갱신).** 설정 → 사용자·권한 → `명단 양식` 받기 → 채우기 → `명단 올리기` → 새로·바뀜·같음·오류 미리 보기 → `n건 반영`(한 건씩 같은 저장 경로·감사 기록). 부서·역할 변경과 비활성화(active 0)도 같은 방법. 명령(`provision-accounts --csv`)은 화면을 못 쓸 때의 대안이다.
- **본인 비밀번호:** 설정 → 내 계정 → 로그인 비밀번호. 서버는 로그인한 본인 메일에만 쓴다(Edge `change-own-password`, Worker `/api/auth/my-password`).
- **승인 문장 형식:** "백업·초기화 승인, 승인자 ○○○, 남길 관리자 jobsky@zeniel.co.kr". 에이전트는 이 형식의 승인 없이 backup·reset·users를 실행하지 않는다.
- **에이전트 권한 검사:** Claude Code 자동 권한 검사가 운영 DB 대량 삭제 명령(`db.mjs reset`)을 막을 수 있다.
  - 막히면 우회하지 않는다.
  - 운영 담당이 터미널에서 직접 실행하거나, 설정에 이 명령의 허용 규칙을 추가한 뒤 다시 요청한다.
- **지금은 비밀번호 배포 방식(2026-10-30 결정):** SMTP 연결 전까지 `provision-accounts --csv`(비밀번호 생성) → `work/accounts.local.csv` → 1:1 전달 → 직원이 설정 → 내 계정에서 변경. SMTP 연결 방법은 아래 3절.
- **SMTP가 먼저다(메일 링크 방식일 때).** Supabase 기본 메일은 시간당 몇 통이라, 회사 SMTP 없이 직원을 일괄 등록하면 첫 로그인 링크가 대부분 오지 않는다.
- **현재 운영 DB (읽기 확인):** 활성 사용자 40명 중 첫 로그인 13명. 이관 7개 적용, 미적용 0.

## 3. 회사 SMTP 연결(메일 링크 로그인)

2026-10-30. ZeniField 로그인 메일(첫 로그인 링크)을 회사 메일 주소로 보내도록 Supabase Auth에 SMTP를 연결하는 방법이다. 1절 2단계에 해당한다.

### 왜 필요한가

- 직원은 처음에 메일로 받은 로그인 링크로 계정을 활성화한다(1절 5단계).
- Supabase 기본 메일은 시험용이다. 이것만으로는 실제 운영이 어렵다.
  - 시간당 2통 수준으로 제한된다.
  - 프로젝트 팀원 주소로만 보낸다. 다른 주소로 보내면 `Email address not authorized`가 난다.
  - 메일 제목·본문을 고칠 수 없다.
- SMTP를 연결하면 이 제한이 풀리고, 보내는 주소가 `no-reply@zeniel.co.kr`처럼 회사 주소가 된다.

### 지금 회사 메일 상태 (2026-10-30 DNS 조회)

| 항목 | 값 | 뜻 |
| --- | --- | --- |
| MX | `sniper.zeniel.co.kr` | 회사가 메일 서버(또는 메일 보안 게이트웨이)를 직접 운영한다 |
| SPF | `v=spf1 ip4:… (11개) -all` | 목록에 있는 IP만 `@zeniel.co.kr`로 보낼 수 있다. 다른 곳에서 보내면 수신 측이 거절하거나 스팸으로 분류한다 |
| DMARC | 없음 | 보낸 메일의 정책·보고가 없다. 대형 메일 서비스(Gmail 등)는 DMARC가 없는 대량 발송을 점점 걸러 낸다 |

그래서 보내는 방법은 둘 중 하나다. 어느 쪽이든 회사 IT(메일 담당)의 작업이 필요하다.

| | A. 회사 메일 서버로 보내기 | B. 발송 전용 서비스(Amazon SES 서울) |
| --- | --- | --- |
| 하는 일 | 회사 SMTP에 전용 계정으로 인증해 보냄 | SES에서 `zeniel.co.kr` 인증 후 SES로 보냄 |
| IT 작업 | 발송 전용 계정 하나, 외부에서 인증 발송(587/465) 허용 | DNS에 DKIM CNAME 3개·SPF 한 줄 추가, (권장) DMARC |
| 장점 | SPF를 안 바꿔도 됨, 회사 메일과 같은 경로 | 도달률·발송 기록·한도 관리가 좋음, 회사 서버 정책과 무관 |
| 주의 | Supabase 발송 서버 IP가 고정이 아니라 **IP 허용 목록 방식으로는 안 됨**. 인증 발송이 인터넷에서 열려 있어야 함 | AWS 계정 필요, 처음엔 샌드박스(인증된 주소로만 발송) → 운영 전환 신청 필요. 비용은 1,000통당 약 $0.10 |
| 권장 | 회사 메일 서버가 외부 인증 발송을 허용하면 A | 허용하지 않거나 도달률이 중요하면 B |

> Microsoft 365를 쓰는 경우(지금은 아님): `smtp.office365.com`의 아이디·비밀번호 인증(Basic auth)은 2026년 말부터 기본으로 꺼질 예정이다. Supabase SMTP는 아이디·비밀번호 방식만 지원하므로, M365라면 B를 쓴다.

### A. 회사 메일 서버로 보내기

#### IT에 요청할 내용 (복사해서 보내기)

> ZeniField(현장 운영 앱) 로그인 메일 발송용 SMTP 계정을 요청드립니다.
> 1. 발송 전용 메일 계정: `no-reply@zeniel.co.kr`(수신 불필요, 비밀번호는 운영 담당에게 비밀번호 관리자로 전달)
> 2. SMTP 접속 정보: 호스트, 포트(587 STARTTLS 또는 465 SSL), 인증 방식(아이디·비밀번호)
> 3. 외부 인터넷에서 위 계정으로 인증 발송 허용. 발송 서버는 Supabase(AWS) 공용 IP라 고정 IP 허용 목록 방식은 쓸 수 없습니다.
> 4. 발송량: 오픈 첫날 직원 수만큼(예: 300통), 이후 하루 수십 통. 스팸 게이트웨이(sniper)에서 이 계정 발송이 막히지 않게 예외 처리 부탁드립니다.
> 5. (권장) DMARC 레코드 추가: `_dmarc.zeniel.co.kr TXT "v=DMARC1; p=none; rua=mailto:<보고 받을 주소>"`

#### Supabase에 넣기

Supabase 대시보드 → 프로젝트 → **Authentication → Emails → SMTP Settings** → `Enable Custom SMTP`

| 칸 | 값 |
| --- | --- |
| Sender email | `no-reply@zeniel.co.kr` |
| Sender name | `ZeniField` |
| Host | IT가 준 호스트(예: `mail.zeniel.co.kr`) |
| Port | `587`(STARTTLS) 또는 `465`(SSL). 25는 쓰지 않는다 |
| Minimum interval | `10`초(같은 사람에게 연속 발송 간격) |
| Username | `no-reply@zeniel.co.kr`(IT가 준 계정) |
| Password | IT가 준 비밀번호. 이 화면에만 넣는다. `.env`·문서·대화에 남기지 않는다 |

### B. Amazon SES(서울)로 보내기

1. AWS 콘솔 → 리전 **아시아 태평양(서울) ap-northeast-2** → Amazon SES → **Identities → Create identity → Domain** → `zeniel.co.kr`.
2. **DKIM:** Easy DKIM(RSA 2048)을 고르면 CNAME 3개가 나온다. IT가 DNS에 추가한다.
3. **SPF:** 지금 SPF는 `-all`이라 SES를 넣어야 한다. 기존 레코드 끝의 `-all` 앞에 `include:amazonses.com`을 추가한다. IT가 작업한다. 또는 Custom MAIL FROM 도메인(예: `bounce.zeniel.co.kr`)을 설정해서 SPF를 그 하위 도메인에 둔다. 이러면 기존 SPF를 건드리지 않는다.
4. **DMARC(권장):** `_dmarc.zeniel.co.kr TXT "v=DMARC1; p=none; rua=mailto:<보고 주소>"`
5. **운영 전환:** SES → Account dashboard → **Request production access**를 신청한다. 사용 목적은 "사내 직원 로그인 링크 발송, 하루 수백 통 이하"로 적는다. 승인 전에는 인증된 주소로만 보낼 수 있다.
6. **SMTP 자격증명:** SES → **SMTP settings → Create SMTP credentials**에서 IAM 사용자를 만든다. 나오는 SMTP 사용자 이름과 비밀번호는 한 번만 보인다.
7. **Supabase SMTP Settings:**

| 칸 | 값 |
| --- | --- |
| Sender email / name | `no-reply@zeniel.co.kr` / `ZeniField` |
| Host | `email-smtp.ap-northeast-2.amazonaws.com` |
| Port | `587` |
| Username / Password | 6번의 SMTP 자격증명(AWS 접속 키 아님) |

### 공통: 발송 한도·메일 문구·콜백 주소

1. **발송 한도:** **Authentication → Rate Limits**의 이메일 발송 한도(시간당)를 오픈 첫날 인원에 맞춰 올린다(예: 300명이면 시간당 100 이상). SMTP를 켜야 이 값을 바꿀 수 있다. 첫날이 지나면 다시 낮춘다.
2. **링크 유효 시간:** **Authentication → Providers → Email**의 `Email OTP Expiration`은 기본 1시간이다. 그대로 둔다.
3. **콜백 주소:** **Authentication → URL Configuration → Redirect URLs**에 아래 주소가 있어야 한다. 없으면 링크를 눌러도 로그인되지 않는다.
   - `https://zenifield.jobsky.workers.dev/auth/callback`
4. **메일 문구:** **Authentication → Emails → Templates → Magic Link**(SMTP를 켜야 고칠 수 있다)
   - 제목: `ZeniField 로그인 링크`
   - 본문:
     ```html
     <p>안녕하세요. ZeniField 로그인 링크입니다.</p>
     <p><a href="{{ .ConfirmationURL }}">ZeniField에 로그인하기</a></p>
     <p>이 링크는 한 번만 쓸 수 있고 1시간 뒤 만료됩니다. 링크를 요청한 같은 브라우저에서 열어 주세요.</p>
     <p>직접 요청하지 않았다면 이 메일을 지워 주세요.</p>
     ```
   - `{{ .ConfirmationURL }}`은 지우지 않는다. 앱의 PKCE 로그인이 이 주소로 돌아온다.

### 연결 확인

1. 앱 로그인 화면에서 `비밀번호가 없거나 잊었어요` → 등록된 관리자 메일을 입력하고 링크를 요청한다.
2. 1분 안에 메일이 오는지, 보낸 사람이 `ZeniField <no-reply@zeniel.co.kr>`인지 본다.
3. 받은 메일의 원문 보기(헤더)에서 `spf=pass`, `dkim=pass`(B), `dmarc=pass`(DMARC를 넣었으면)를 확인한다.
4. 회사 메일 외에 Gmail·Naver 주소 하나로도 시험한다. 직원이 개인 메일을 쓰지 않더라도 도달률을 확인하는 용도다. 시험할 주소는 미리 명단에 넣는다.
5. 링크를 같은 브라우저에서 열어 로그인되는지 확인한다.
6. **Authentication → Logs**(또는 Logs Explorer `auth`)에서 발송 오류가 없는지 본다.
7. 결과를 [feature-status.md](feature-status.md)에 날짜와 함께 남긴다.

### 문제 해결

| 증상 | 원인 | 조치 |
| --- | --- | --- |
| `Email address not authorized` | Custom SMTP가 꺼져 있음 | SMTP Settings에서 Enable 확인 |
| 링크 요청 후 화면에 "인증 메일을 보내지 못했습니다" | SMTP 접속 실패(호스트·포트·계정) | Auth Logs의 오류 확인 → IT와 접속 정보 대조, 465/587 바꿔 보기 |
| "잠시 후 로그인 링크를 다시 요청해 주세요" | Rate Limits 또는 Minimum interval에 걸림 | Rate Limits 상향, 1분 뒤 다시 |
| 메일이 스팸함으로 감 / 안 옴 | SPF·DKIM 실패, DMARC 없음, 회사 게이트웨이 차단 | 헤더에서 spf·dkim 결과 확인 → A는 IT에 게이트웨이 예외, B는 DNS 레코드 확인 |
| 링크를 눌렀는데 로그인 화면으로 돌아옴 | 다른 브라우저(메일 앱 내장)에서 열었거나, 만료됐거나, 콜백 주소 누락 | 요청한 브라우저에서 열기, 다시 요청, Redirect URLs 확인 |
| 등록 안 된 메일로 요청해도 "보냈어요"가 나옴 | 정상(등록 여부를 드러내지 않음) | 관리자 화면 사용자·권한에서 메일·활성 상태 확인 |

### 바꾸지 않는 것

- 앱 코드·Worker·Edge 설정은 바꾸지 않는다. 메일 발송은 Supabase Auth가 하고, 앱은 링크 요청만 보낸다.
- SMTP 비밀번호는 Supabase 화면에만 넣는다. GitHub Secrets·Worker Secrets·`.env`에 넣을 필요가 없다.

### 출처

- Supabase 기본 메일 제한·Custom SMTP: [Dreamlit – Supabase 메일 보내기](https://dreamlit.ai/blog/posts/how-to-send-emails-supabase), [Brevo – Supabase SMTP 연동](https://developers.brevo.com/docs/supabase-smtp-integration.md), [Rapid Developers – Supabase SMTP 설정](https://www.rapidevelopers.com/supabase-tutorial/how-to-change-smtp-settings-in-supabase)
- Microsoft 365 SMTP Basic auth 일정: [MC786329](https://mc.merill.net/message/MC786329?from=1&to=4), [CaptainDNS 정리](https://www.captaindns.com/en/blog/microsoft-exchange-basic-auth-smtp-end)
- 수치(시간당 2통, 시간당 30통 기본값 등)는 Supabase 대시보드 화면 표기가 기준이다. 다르면 화면을 따른다.

