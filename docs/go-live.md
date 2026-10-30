# 실서비스 오픈 절차

ZeniField를 실제 직원이 쓰게 여는 순서다. 한 단계씩 따라 하고 끝나면 체크한다. 명령의 자세한 옵션, 비용, 되돌리기는 [배치 매뉴얼](production-rollout.md)에 있다. 에이전트에게 맡길 때 쓰는 명령 표는 [AGENTS.md "운영 DB·배치 명령"](../AGENTS.md)에 있다.

> 기준: 2026-10-30. 운영 DB = Supabase `nhywssfwtnonytbkufyy`(지금 프로젝트를 초기화해서 씀). 앱 주소 = https://zenifield.jobsky.workers.dev

## 0. 준비 (운영 담당)

- [ ] 로컬 `.env`에 `SUPABASE_ACCESS_TOKEN`, `ZENIFIELD_SUPABASE_URL`, `ZENIFIELD_GATEWAY_TOKEN`이 있다. 값은 비밀번호 관리자에서 받는다. 파일로 주고받지 않는다.
- [ ] `node scripts/rollout.mjs run preflight`를 실행해 설정값이 모두 ✓이고 이관 미적용이 0인지 본다.
- [ ] 요금제를 정한다. Supabase Pro, Cloudflare Workers Paid, OpenAI 월 한도([요금제 업그레이드](production-rollout.md#요금제-업그레이드)).

## 1. 데이터 비우기 (운영 담당, 승인 필요)

- [ ] **백업:** `node scripts/rollout.mjs run backup --approved-by <승인자>`를 실행한다. 결과는 `work/backup/`에 남는다.
- [ ] **초기화:** `node scripts/rollout.mjs run reset --approved-by <승인자> --admin <남길 관리자 메일>`을 실행한다.
  - 시연 데이터와 남길 관리자 외 사용자를 지우고, 스키마는 남긴다.
- [ ] `node --env-file=.env scripts/db.mjs status`로 사용자는 남길 관리자만, 업무 데이터는 0인지 확인한다.

## 지금 방식: SMTP 없이 비밀번호 나눠 주기 (2026-10-30 결정)

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

## 2. 로그인 메일 준비 (SMTP를 연결할 때, 운영 담당)

자세한 방법(회사 메일 서버 또는 Amazon SES, IT 요청문, 메일 문구, 확인·문제 해결)은 [회사 SMTP 연결 가이드](smtp-setup.md)에 있다.


- [ ] **SMTP:** Authentication → Emails → SMTP Settings에 회사 SMTP를 넣는다(보내는 주소 예: `no-reply@zeniel.co.kr`).
- [ ] **발송 한도:** Authentication → Rate Limits에서 이메일 발송 한도를 직원 수에 맞게 올린다.
- [ ] **메일 문구:** Magic Link 메일 제목·본문을 한국어로 바꾼다.
- [ ] **콜백 주소:** URL Configuration에 `https://zenifield.jobsky.workers.dev/auth/callback`이 있다.
- [ ] **확인:** 관리자 본인 메일로 로그인 링크를 받아 본다.

> SMTP 없이 직원을 등록하면 Supabase 기본 메일(시간당 몇 통) 한도에 걸려 첫 로그인 메일이 대부분 오지 않는다.

## 3. 관리자 준비 (시스템 관리자, 앱 화면)

- [ ] 남긴 관리자로 로그인한다.
- [ ] **설정 → 관리 도메인**에서 사업 도메인을 등록한다.
- [ ] **설정 → 내 계정 → 로그인 비밀번호**에서 본인 비밀번호를 정한다(다음부터 링크 없이 로그인).

## 4. 직원 일괄 등록 (시스템 관리자, 앱 화면)

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

## 5. 첫 로그인 안내 (시스템 관리자)

- [ ] 직원에게 [안내문](production-rollout.md#직원-안내문-복사해서-보내기)을 보낸다. 직원이 할 일은 이렇다.
  1. 접속 주소를 연다.
  2. `비밀번호가 없거나 잊었어요`를 누르고 회사 메일을 넣는다.
  3. 받은 링크를 같은 브라우저에서 연다. 이때 계정이 활성화된다.
  4. 설정 → 내 계정에서 비밀번호를 정한다.
- [ ] `node --env-file=.env scripts/db.mjs activation`으로 직급별 첫 로그인 완료 수를 보고, 대기 명단(`work/activation-pending.csv`)에 따로 연락한다.

## 6. 현장·매장 등록 (관리자·팀장·파트장, 앱 화면)

- [ ] 담당·주기 관리에서 현장을 등록하고, 산하 매장을 등록하고, 담당자·관리 주기를 지정한다.
- [ ] 잡매니저 계정으로 로그인해 자기 현장만 보이는지 확인한다.

## 7. 오픈 확인

- [ ] `node scripts/rollout.mjs run verify`로 공개 주소의 커밋과 인증 경계를 확인한다.
- [ ] 직급별(관리자·사업부장·팀장·파트장·잡매니저)로 한 명씩 로그인해 운영 현황·방문 일정·방문·조치의 범위가 맞는지 본다.
- [ ] 끝난 날짜와 결과를 [feature-status.md](feature-status.md)에 한 줄로 남긴다.

## 막히면

| 증상 | 확인 |
| --- | --- |
| 로그인 메일이 안 옴 | 2단계 SMTP·발송 한도, 명단에 그 메일이 활성으로 있는지 |
| 링크를 열면 로그인 화면으로 돌아감 | 링크를 요청한 브라우저에서 열었는지(메일 앱 내장 브라우저 X) |
| 명단 반영에서 일부 실패 | 실패 줄 이유 확인. 담당이 남은 사람의 비활성화·팀 변경은 담당을 먼저 넘긴다 |
| 로그인했는데 화면이 비어 있음 | 6단계 담당 지정 |
| 명령이 실패 | 출력 그대로 운영 담당에게 전달. 다른 방법으로 우회하지 않는다 |
