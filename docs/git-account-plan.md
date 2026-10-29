# Git 작업 계정 Zeniel-Jobsky 적용

2026-10-29 · 저장소 계정 설정 완료

## 확인한 상태

기존 origin은 이미 `https://github.com/Zeniel-Jobsky/Zenielfield.git`이었다. 전역 작성자·커미터 설정은 prodigk/ugen.kwon@gmail.com, 저장된 HTTPS 인증 계정도 GitHub `/user` 확인 결과 prodigk였다. GitHub 연결 플러그인 계정 역시 prodigk로, 로컬 Git 인증과 별개다.

## 적용 범위

- 저장소 로컬 author/committer: `Zeniel-Jobsky <jobsky@zeniel.co.kr>`.
- 저장소 로컬 GitHub credential username: Zeniel-Jobsky, 기본 푸시 대상 origin.
- 공식 GitHub CLI의 브라우저 인증으로 새 계정을 연결하고 토큰은 OS 자격증명 저장소에 보관한다. 다른 저장소의 Git 사용자·자격증명 설정은 바꾸지 않는다.
- 기존 main의 prodigk 작성 커밋33개를 정정할 경우 이후 포함138개 커밋 ID가 바뀌는 것으로 사전 점검했다. 사용자 선택은 **앞으로만 적용·기존 이력 유지**이므로 이력 정정·강제 푸시는 하지 않는다.
- AGENTS Git 작업 계정·PROJECT_RULE DC-GIT-IDENTITY에 같은 규칙을 기록한다.

## 검증

- 새 author/committer의 `git var` 결과가 모두 `Zeniel-Jobsky <jobsky@zeniel.co.kr>`임을 확인했다.
- GitHub CLI 브라우저 인증 완료 후 실제 로그인 계정 Zeniel-Jobsky, 토큰의 OS keyring 보관을 확인했다.
- 저장소 로컬 `credential.https://github.com.helper`에서 기존 helper 상속을 비운 뒤 `gh auth git-credential`을 사용한다. Git이 선택한 자격증명으로 GitHub `/user`를 호출한 결과도 Zeniel-Jobsky였다.
- 저장소 로컬 기본 푸시 대상과 main의 pushRemote는 origin이다. 기존 개인 계정의 전역 Git 작성자와 osxkeychain helper는 변경하지 않았다.
- 기존 main 이력은 그대로 보존하며 사용자 선택에 따라 작성자 정정·강제 푸시는 하지 않는다.
- 이 설정 기록을 새 계정으로 커밋·일반 푸시해 저장소에 반영한다. 서비스 코드·UI·데이터 변경은 없다.

GitHub 연결 플러그인은 로컬 Git과 별개로 prodigk 연결 상태다. 이번 변경은 이 저장소의 CLI 커밋·푸시에 적용한다. 연결 플러그인을 통한 쓰기는 인증 계정을 확인한 뒤 수행해야 한다.
