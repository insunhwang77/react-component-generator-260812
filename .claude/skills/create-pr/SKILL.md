---
name: create-pr
description: 현재 브랜치의 커밋을 원격에 push하고 GitHub PR을 생성한다. diff·커밋 로그를 분석해 references/의 영문·한국어 템플릿 중 하나로 PR 제목과 본문을 자동 작성한다. "PR 만들어줘", "PR 생성해줘", "pull request 열어줘", "push하고 PR 올려줘", "create a PR", "/create-pr" 같은 요청에 사용한다. 
argument-hint: "[en|ko] [base-branch]"
disable-model-invocation: true
context: fork
agent: claude
---

# create-pr: push + GitHub PR 생성

이 스킬은 `context: fork`로 동작한다. 즉 아래 절차 전체가 메인 대화가 아니라 별도로 포크된 서브에이전트 안에서 실행되고, 끝나면 결과(PR URL 또는 실패 사유)만 메인 대화로 돌아온다. push나 `gh pr create` 같은 되돌리기 어려운 원격 작업의 로그·중간 diff가 메인 컨텍스트를 채우지 않도록 하기 위함이다. 이 스킬은 `disable-model-invocation: true`라서 Claude가 알아서 트리거하지 않고, 사용자가 명시적으로 요청했을 때만 실행된다 — 그 요청 자체가 push/PR 생성에 대한 승인이므로, 절차 중간에 별도로 되묻지 않고 끝까지 진행한다.

## 0. 사전 확인

- `git rev-parse --is-inside-work-tree`로 git 저장소인지 확인한다. 아니면 중단하고 알린다.
- `gh auth status`로 GitHub CLI 인증을 확인한다. 인증이 안 되어 있으면 무엇을 해야 하는지 안내하고 중단한다(대신 로그인을 실행하지 않는다).
- 저장소 루트의 `AGENTS.md`(없으면 `CLAUDE.md`)를 읽어 커밋/브랜치/PR 관련 지침이 있으면 이후 전 과정에서 따른다.

## 1. 브랜치 상태 파악

- 현재 브랜치: `git branch --show-current`
- 기본(base) 브랜치: 인자로 지정됐으면 그것을 쓰고, 아니면 `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`으로 확인한다(실패하면 `git symbolic-ref refs/remotes/origin/HEAD`로 대체).
- 현재 브랜치가 base 브랜치와 같으면 PR을 만들 대상이 없다는 뜻이다 — 중단하고 새 브랜치로 작업할 것을 안내한다.
- **커밋되지 않은 변경사항**(`git status --porcelain`)이 있으면 진행하지 않는다. PR은 커밋된 내용만 반영해야 하므로, 무엇이 커밋되지 않았는지 알리고 먼저 커밋(`commit` 스킬 참고)할 것을 안내한 뒤 종료한다.
- `git log <base>..HEAD --oneline`으로 base 대비 커밋이 하나도 없으면 PR을 만들 내용이 없다는 뜻이다 — 중단하고 알린다.

## 2. 기존 PR 확인

`gh pr view --json url,number,state 2>/dev/null`로 현재 브랜치에 이미 열린 PR이 있는지 확인한다. 있으면 새로 만들지 않고 기존 PR URL을 그대로 보고하고 종료한다(중복 PR 생성 방지).

## 3. 변경사항 수집

PR 본문을 채우기 위해 다음을 확인한다:

- `git log <base>..HEAD --oneline` — 이번 PR에 포함되는 커밋 목록. 각 커밋의 의도(무엇을 왜 바꿨는지)를 파악하는 데 쓴다.
- `git diff <base>...HEAD --stat` — 변경된 파일 범위 파악.
- 필요하면 `git diff <base>...HEAD` 전체를 읽고 실제 변경 내용을 이해한다. 표면적인 파일 목록만 보고 요약하지 말고, 커밋 메시지와 diff를 함께 근거로 삼는다.

## 4. 템플릿 언어 결정

- 인자로 `en` 또는 `ko`가 명시되면 그것을 따른다.
- 명시되지 않았으면 이 저장소의 커밋 메시지 언어(`git log <base>..HEAD --oneline`에서 확인한 언어)를 따른다. 이 저장소는 한국어 Conventional Commits 컨벤션(`AGENTS.md` 참고)을 쓰므로 특별한 근거가 없으면 기본값은 한국어다.
- 골라진 언어에 맞는 템플릿을 읽는다: 영문은 [references/pr_template_en.md](references/pr_template_en.md), 한국어는 [references/pr_template_ko.md](references/pr_template_ko.md).

## 5. PR 제목·본문 작성

- **제목**: 이 저장소의 커밋 컨벤션과 동일한 형식(`<type>: <요약>`, 예: `feat: 프롬프트 기반 컴포넌트 생성 UI 추가`)을 따른다. 커밋이 여러 개면 그중 가장 비중이 큰 변경을 기준으로 하나의 제목을 뽑는다.
- **본문**: 4단계에서 고른 템플릿의 섹션 구조를 그대로 사용하고, 각 자리표시자(`<...>`)를 3단계에서 파악한 실제 내용으로 채운다. 템플릿에 없는 섹션을 임의로 추가하지 않는다. 관련 이슈를 모르면 "관련 이슈" 섹션은 통째로 삭제한다(placeholder를 그대로 남기지 않는다).
- Test Plan/테스트 계획 항목은 실제로 실행했거나 실행 가능한 것만 적는다. 실행하지 않은 검증을 지어내지 않는다.

## 6. push 및 PR 생성

1. `git push -u origin <현재-브랜치>`로 push한다. 이미 push된 상태(원격이 최신)면 건너뛴다. **강제 push(`--force`)는 절대 하지 않는다** — 실패하면 원인을 그대로 보고하고 중단한다.
2. PR 본문은 셸 인용 문제를 피하기 위해 임시 파일에 쓰고 `gh pr create --title "<제목>" --body-file <임시파일> --base <base-브랜치>`로 생성한다.
3. 생성된 PR URL을 결과로 보고한다.

## 결과 보고

메인 대화로 돌아갈 때 다음을 포함한다: 생성(또는 기존) PR URL, 어떤 템플릿 언어를 썼는지, 그리고 중단했다면 왜 중단했는지. diff나 커밋 로그 원문을 통째로 되돌려주지 않는다 — 메인 컨텍스트를 가볍게 유지하는 것이 이 스킬을 fork로 분리한 이유다.
