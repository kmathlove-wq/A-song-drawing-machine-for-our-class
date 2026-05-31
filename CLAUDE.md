# 프로젝트 협업 규칙

## 절약 규칙

- 이미 읽은 파일은 변경 가능성이 있을 때만 다시 확인한다.
- 불필요한 도구 호출은 하지 않는다.
- 독립적으로 실행 가능한 도구 호출은 동시에 실행한다.
- 긴 출력은 필요한 범위만 잘라 확인한다.
- 사용자가 이미 설명한 내용을 다시 반복하지 않는다.

## 기타 규칙

- 새로 알게 된 프로젝트 지식은 필요할 때 `AGENTS.md` 또는 `CLAUDE.md`에 반영한다.
- `AGENTS.md`와 `CLAUDE.md`는 각각 200줄을 넘기지 않는다.
- 사용자 요청 없이 기존 변경사항을 되돌리지 않는다.
- 사용자가 따로 업로드하지 말라고 하지 않으면 작업 후 GitHub에 커밋하고 푸시한다.
- 푸시할 때 잘못된 환경 토큰을 피하려면 `env -u GITHUB_TOKEN -u GH_TOKEN git push origin main`을 사용한다.

## 현재 코드 정보

- 이 프로젝트는 우리반 전용 노래 추첨기 정적 웹앱이다.
- `index.html`은 추첨 화면, 유튜브 재생 영역, 등록된 노래 목록 구조를 담당한다.
- `sytle.css`는 전체 레이아웃, 버튼, 결과 영역, 목록, 유튜브 영역 스타일을 담당한다.
- `main.js`는 비밀번호 확인, 노래 추가/수정/삭제, 랜덤 추첨, localStorage 저장, YouTube Data API 검색과 임베드 재생을 담당한다.
- 노래 추가, 이름 변경, 삭제 비밀번호는 `1+1=1`이다.
- 노래 목록은 `localStorage`의 `class-song-drawing-machine-songs` 키에 저장된다.
- 실제 YouTube API 키는 Git에 올리지 않는 `config.js`의 `window.YOUTUBE_API_KEY`에서 읽는다.
- Git에는 예시 파일인 `config.example.js`만 올리고, `.gitignore`로 `config.js`를 제외한다.
- API 키가 없거나 검색/재생에 실패하면 `유튜브에서 찾기` 버튼이 활성화된다.
