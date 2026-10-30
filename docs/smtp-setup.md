# 회사 SMTP 연결 가이드

2026-10-30. ZeniField 로그인 메일(첫 로그인 링크)을 회사 메일 주소로 보내도록 Supabase Auth에 SMTP를 연결하는 방법이다. [실서비스 오픈 절차](go-live.md) 2단계에 해당한다.

## 왜 필요한가

- 직원은 처음에 메일로 받은 로그인 링크로 계정을 활성화한다([go-live.md](go-live.md) 5단계).
- Supabase 기본 메일은 시험용이다. 이것만으로는 실제 운영이 어렵다.
  - 시간당 2통 수준으로 제한된다.
  - 프로젝트 팀원 주소로만 보낸다. 다른 주소로 보내면 `Email address not authorized`가 난다.
  - 메일 제목·본문을 고칠 수 없다.
- SMTP를 연결하면 이 제한이 풀리고, 보내는 주소가 `no-reply@zeniel.co.kr`처럼 회사 주소가 된다.

## 지금 회사 메일 상태 (2026-10-30 DNS 조회)

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

## A. 회사 메일 서버로 보내기

### IT에 요청할 내용 (복사해서 보내기)

> ZeniField(현장 운영 앱) 로그인 메일 발송용 SMTP 계정을 요청드립니다.
> 1. 발송 전용 메일 계정: `no-reply@zeniel.co.kr`(수신 불필요, 비밀번호는 운영 담당에게 비밀번호 관리자로 전달)
> 2. SMTP 접속 정보: 호스트, 포트(587 STARTTLS 또는 465 SSL), 인증 방식(아이디·비밀번호)
> 3. 외부 인터넷에서 위 계정으로 인증 발송 허용. 발송 서버는 Supabase(AWS) 공용 IP라 고정 IP 허용 목록 방식은 쓸 수 없습니다.
> 4. 발송량: 오픈 첫날 직원 수만큼(예: 300통), 이후 하루 수십 통. 스팸 게이트웨이(sniper)에서 이 계정 발송이 막히지 않게 예외 처리 부탁드립니다.
> 5. (권장) DMARC 레코드 추가: `_dmarc.zeniel.co.kr TXT "v=DMARC1; p=none; rua=mailto:<보고 받을 주소>"`

### Supabase에 넣기

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

## B. Amazon SES(서울)로 보내기

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

## 공통: 발송 한도·메일 문구·콜백 주소

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

## 연결 확인

1. 앱 로그인 화면에서 `비밀번호가 없거나 잊었어요` → 등록된 관리자 메일을 입력하고 링크를 요청한다.
2. 1분 안에 메일이 오는지, 보낸 사람이 `ZeniField <no-reply@zeniel.co.kr>`인지 본다.
3. 받은 메일의 원문 보기(헤더)에서 `spf=pass`, `dkim=pass`(B), `dmarc=pass`(DMARC를 넣었으면)를 확인한다.
4. 회사 메일 외에 Gmail·Naver 주소 하나로도 시험한다. 직원이 개인 메일을 쓰지 않더라도 도달률을 확인하는 용도다. 시험할 주소는 미리 명단에 넣는다.
5. 링크를 같은 브라우저에서 열어 로그인되는지 확인한다.
6. **Authentication → Logs**(또는 Logs Explorer `auth`)에서 발송 오류가 없는지 본다.
7. 결과를 [feature-status.md](feature-status.md)에 날짜와 함께 남긴다.

## 문제 해결

| 증상 | 원인 | 조치 |
| --- | --- | --- |
| `Email address not authorized` | Custom SMTP가 꺼져 있음 | SMTP Settings에서 Enable 확인 |
| 링크 요청 후 화면에 "인증 메일을 보내지 못했습니다" | SMTP 접속 실패(호스트·포트·계정) | Auth Logs의 오류 확인 → IT와 접속 정보 대조, 465/587 바꿔 보기 |
| "잠시 후 로그인 링크를 다시 요청해 주세요" | Rate Limits 또는 Minimum interval에 걸림 | Rate Limits 상향, 1분 뒤 다시 |
| 메일이 스팸함으로 감 / 안 옴 | SPF·DKIM 실패, DMARC 없음, 회사 게이트웨이 차단 | 헤더에서 spf·dkim 결과 확인 → A는 IT에 게이트웨이 예외, B는 DNS 레코드 확인 |
| 링크를 눌렀는데 로그인 화면으로 돌아옴 | 다른 브라우저(메일 앱 내장)에서 열었거나, 만료됐거나, 콜백 주소 누락 | 요청한 브라우저에서 열기, 다시 요청, Redirect URLs 확인 |
| 등록 안 된 메일로 요청해도 "보냈어요"가 나옴 | 정상(등록 여부를 드러내지 않음) | 관리자 화면 사용자·권한에서 메일·활성 상태 확인 |

## 바꾸지 않는 것

- 앱 코드·Worker·Edge 설정은 바꾸지 않는다. 메일 발송은 Supabase Auth가 하고, 앱은 링크 요청만 보낸다.
- SMTP 비밀번호는 Supabase 화면에만 넣는다. GitHub Secrets·Worker Secrets·`.env`에 넣을 필요가 없다.

## 출처

- Supabase 기본 메일 제한·Custom SMTP: [Dreamlit – Supabase 메일 보내기](https://dreamlit.ai/blog/posts/how-to-send-emails-supabase), [Brevo – Supabase SMTP 연동](https://developers.brevo.com/docs/supabase-smtp-integration.md), [Rapid Developers – Supabase SMTP 설정](https://www.rapidevelopers.com/supabase-tutorial/how-to-change-smtp-settings-in-supabase)
- Microsoft 365 SMTP Basic auth 일정: [MC786329](https://mc.merill.net/message/MC786329?from=1&to=4), [CaptainDNS 정리](https://www.captaindns.com/en/blog/microsoft-exchange-basic-auth-smtp-end)
- 수치(시간당 2통, 시간당 30통 기본값 등)는 Supabase 대시보드 화면 표기가 기준이다. 다르면 화면을 따른다.
