# 우리반 전용 노래 추첨기 — AGENTS.md

## 프로젝트 개요

우리반에서 사용할 수 있는 정적 웹 기반 노래 추첨기.
노래를 추가, 수정, 삭제할 때는 비밀번호를 입력해야 하며, 등록된 노래 중 하나를 무작위로 뽑는다.
뽑힌 노래는 YouTube Data API로 가장 가까운 영상을 검색해 페이지 안에서 자동 재생을 시도한다.
API 키가 없거나 검색/재생에 실패하면 `유튜브에서 찾기` 버튼으로 직접 검색할 수 있게 한다.

## 파일 구조

```text
A-song-drawing-machine-for-our-class/
├── index.html          # 앱 화면 구조, 결과 영역, 유튜브 iframe, 노래 목록 DOM
├── main.js             # 비밀번호, 노래 CRUD, 랜덤 추첨, YouTube API 검색 로직
├── sytle.css           # 전체 레이아웃, 버튼, 결과 박스, 목록, 유튜브 영역 스타일
├── favicon.svg         # 노란색 그라데이션 배경과 음표 모양 사이트 아이콘
├── config.example.js   # API 키 예시 파일
├── config.js           # 실제 API 키 파일, Git에는 올리지 않고 배포 서버에 직접 둔다
├── .github/workflows/pages.yml # GitHub Pages 배포 시 secret으로 config.js 생성
├── AGENTS.md           # Codex/Agent용 프로젝트 규칙
└── CLAUDE.md           # Claude용 프로젝트 규칙
```

## 실행 방법

정적 파일이라 `index.html`을 브라우저로 열면 기본 화면은 동작한다.
다만 API 키 제한을 `HTTP 리퍼러`로 걸었거나 브라우저 정책 문제가 있으면 로컬 서버로 실행하는 편이 좋다.

```bash
npx serve .
# 또는 VS Code Live Server 사용
```

## 기술 스택

- HTML, CSS, Vanilla JavaScript
- 빌드 툴 없음
- 패키지 의존성 없음
- 브라우저 `localStorage` 사용
- YouTube Data API v3 사용

## main.js 구조

### 핵심 상수와 상태

| 이름 | 설명 |
|---|---|
| `PASSWORD` | 노래 추가, 이름 변경, 삭제에 필요한 비밀번호. 현재 `1+1=1` |
| `STORAGE_KEY` | localStorage 저장 키. `class-song-drawing-machine-songs` |
| `YOUTUBE_API_KEY` | `config.js`의 `window.YOUTUBE_API_KEY`에서 읽는 YouTube API 키 |
| `songs[]` | 등록된 노래 목록 배열 |

### 주요 함수

| 함수 | 설명 |
|---|---|
| `loadSongs()` | localStorage에서 노래 목록을 불러온다 |
| `saveSongs()` | 현재 노래 목록을 localStorage에 저장한다 |
| `checkPassword()` | `prompt()`로 비밀번호를 확인한다 |
| `addSong()` | 비밀번호 확인 후 노래를 추가한다 |
| `renameSong(index)` | 비밀번호 확인 후 노래 이름을 바꾼다 |
| `deleteSong(index)` | 비밀번호 확인 후 노래를 삭제한다 |
| `drawSong()` | 등록된 노래 중 하나를 랜덤으로 뽑고 유튜브 재생을 시도한다 |
| `openInputModal(options)` | 비밀번호, 노래 추가, 이름 변경에 쓰는 커스텀 입력 모달을 연다 |
| `openConfirmModal(options)` | 삭제 확인에 쓰는 커스텀 확인 모달을 연다 |
| `openNoticeModal(options)` | 안내 메시지에 쓰는 커스텀 확인 모달을 연다 |
| `playYoutubeVideo(songName)` | YouTube API로 영상을 찾아 iframe 자동 재생을 시도한다 |
| `findYoutubeVideo(songName)` | YouTube Data API로 후보를 찾고 조회수/제목 조건을 통과한 영상을 고른다 |
| `getYoutubeVideoDetails(videoIds)` | `videos.list`로 후보 영상의 제목과 조회수 통계를 가져온다 |
| `isEligibleYoutubeVideo(songName, video)` | 제목에 노래 이름이 있고 조회수 10만 이상인지 확인한다 |
| `scoreYoutubeResult(songName, snippet)` | 제목/채널 기준으로 공식 음원에 가까운 검색 결과에 높은 점수를 준다 |
| `renderSongs()` | 노래 목록 DOM을 다시 그린다 |

## YouTube 동작 방식

```text
drawSong()
├── songs[]에서 랜덤 노래 선택
├── 결과 텍스트 갱신
└── playYoutubeVideo(songName)
    ├── API 키가 없으면 fallback 버튼 활성화
    ├── 등록된 노래 이름 그대로 YouTube Data API 검색
    ├── 후보 25개의 상세 정보와 조회수 확인
    ├── 제목에 노래 이름이 포함되고 조회수 10만 이상인 후보만 통과
    ├── 통과한 후보를 제목/채널 기준으로 점수화
    ├── 찾으면 iframe src 설정 후 자동 재생 시도
    └── 실패하면 `유튜브에서 찾기` 버튼 활성화
```

## API 키 관리

- 실제 키는 `config.js`에 둔다.
- `config.js`는 GitHub에 올리지 않는다.
- 배포 사이트에서 API를 호출해야 하면 배포 서버의 사이트 루트에 `config.js`를 직접 업로드한다.
- GitHub Pages 배포는 `YOUTUBE_API_KEY` 저장소 secret으로 `config.js`를 생성하는 workflow를 사용한다.
- 공개 브라우저에서 키가 보일 수 있으므로 Google Cloud 제한 설정이 필수다.
- `config.example.js`는 API 키 형식 예시로 유지한다.
- `main.js`는 `window.YOUTUBE_API_KEY || ""` 형태로 키를 읽는다.
- `index.html`은 배포 캐시 방지를 위해 `config.js`와 `main.js`에 버전 쿼리를 붙여 로드한다.
- Google Cloud에서 API 제한사항은 `YouTube Data API v3`로 제한한다.
- 공개 웹사이트와 로컬 Live Server를 쓸 경우 애플리케이션 제한사항은 `HTTP 리퍼러`로 제한한다.
- Live Server 테스트 주소가 바뀌면 Google Cloud 웹사이트 제한에 해당 origin을 추가해야 한다.

## 화면 구성

```text
.app
├── .draw-panel
│   ├── 노래 추가 버튼
│   ├── 결과 박스 (#pickedSong)
│   ├── 노래 뽑기 버튼
│   └── .youtube-box
│       ├── #youtubePlayer
│       └── #youtubeLink
└── .list-panel
    ├── 등록된 노래 수 (#songCount)
    ├── 노래 목록 (#songList)
    └── 빈 목록 안내 (#emptyMessage)

#modalOverlay
└── #inputModal
    ├── #modalCloseBtn
    ├── #modalTitle
    ├── #modalInput
    ├── #modalCancelBtn
    └── #modalConfirmBtn
```

## 주의사항

- `sytle.css` 파일명은 현재 오타처럼 보이지만 `index.html`에서 이 이름으로 연결되어 있으므로 임의로 바꾸지 않는다.
- `config.js`는 GitHub에 커밋하지 않는다. 배포 서버에 직접 둘 때도 Google Cloud에서 API/웹사이트 제한을 반드시 건다.
- YouTube 자동 재생은 브라우저 정책에 따라 소리 있는 재생이 막힐 수 있다.
- YouTube 검색 실패, API 키 없음, 할당량 초과 시 fallback 버튼이 활성화되어야 한다.
- 노래 목록은 서버가 아니라 사용자의 브라우저 localStorage에 저장된다.

## GitHub

저장소: `https://github.com/kmathlove-wq/A-song-drawing-machine-for-our-class`
브랜치: `main`

사용자가 따로 업로드하지 말라고 하지 않으면 코드 변경 후 항상 커밋 + 푸시한다.
푸시할 때 잘못된 환경 토큰을 피하려면 다음 명령을 사용한다.

```bash
env -u GITHUB_TOKEN -u GH_TOKEN git push origin main
```

## 작업 규칙

### 절약 규칙

- 이미 읽은 파일은 변경 가능성이 있을 때만 다시 확인한다.
- 불필요한 도구 호출은 하지 않는다.
- 가능한 도구 호출은 동시에 실행한다.
- 긴 출력은 필요한 범위만 잘라 확인한다.
- 사용자가 이미 설명한 내용을 다시 반복하지 않는다.

### 기타 규칙

- 새로 알게 된 프로젝트 지식은 필요할 때 `AGENTS.md` 또는 `CLAUDE.md`에 반영한다.
- `AGENTS.md`와 `CLAUDE.md`는 각각 200줄을 넘기지 않는다.
- 사용자 요청 없이 기존 변경사항을 되돌리지 않는다.
