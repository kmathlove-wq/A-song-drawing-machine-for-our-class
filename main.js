const PASSWORD = "1+1=1";
const STORAGE_KEY = "class-song-drawing-machine-songs";
const PENDING_SYNC_KEY = "class-song-drawing-machine-pending-sync-at";
const SYNC_POLL_INTERVAL_MS = 10000;
const PENDING_SYNC_TIMEOUT_MS = 30000;
const YOUTUBE_API_KEY = window.YOUTUBE_API_KEY || "";
const GITHUB_OWNER = window.GITHUB_OWNER || "";
const GITHUB_REPO = window.GITHUB_REPO || "";
const GITHUB_BRANCH = window.GITHUB_BRANCH || "main";
const GITHUB_WRITE_TOKEN = window.GITHUB_WRITE_TOKEN || "";

const addSongBtn = document.querySelector("#addSongBtn");
const drawSongBtn = document.querySelector("#drawSongBtn");
const pickedSongEl = document.querySelector("#pickedSong");
const youtubePlayer = document.querySelector("#youtubePlayer");
const youtubeLink = document.querySelector("#youtubeLink");
const playerHint = document.querySelector("#playerHint");
const songList = document.querySelector("#songList");
const songCount = document.querySelector("#songCount");
const emptyMessage = document.querySelector("#emptyMessage");
const modalOverlay = document.querySelector("#modalOverlay");
const inputModal = document.querySelector("#inputModal");
const modalCloseBtn = document.querySelector("#modalCloseBtn");
const modalTitle = document.querySelector("#modalTitle");
const modalLabel = document.querySelector("#modalLabel");
const modalInput = document.querySelector("#modalInput");
const modalError = document.querySelector("#modalError");
const modalActions = document.querySelector("#modalActions");
const modalCancelBtn = document.querySelector("#modalCancelBtn");
const modalConfirmBtn = document.querySelector("#modalConfirmBtn");

let songs = [];
let activeModalResolve = null;

function canSyncSongs() {
  return Boolean(GITHUB_OWNER && GITHUB_REPO && GITHUB_WRITE_TOKEN);
}

async function loadSongs() {
  const localSongs = getLocalSongs();

  try {
    const sharedSongs = await fetchSharedSongs();

    if (hasPendingSync() && localSongs.length > 0 && !sameSongList(localSongs, sharedSongs)) {
      return localSongs;
    }

    clearPendingSync();
    storeSongsLocally(sharedSongs);
    return sharedSongs;
  } catch {
    // Fall back to localStorage when offline or GitHub is unavailable.
  }

  return localSongs;
}

function getLocalSongs() {
  const savedSongs = localStorage.getItem(STORAGE_KEY);

  if (!savedSongs) {
    return [];
  }

  try {
    const parsedSongs = JSON.parse(savedSongs);
    return Array.isArray(parsedSongs) ? normalizeSongList(parsedSongs) : [];
  } catch {
    return [];
  }
}

async function fetchSharedSongs() {
  const response = await fetch(`./songs.json?ts=${Date.now()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Shared songs fetch failed");
  }

  const sharedSongs = await response.json();

  if (!Array.isArray(sharedSongs)) {
    throw new Error("Shared songs must be an array");
  }

  return normalizeSongList(sharedSongs);
}

function storeSongsLocally(songListValue) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songListValue));
}

function markPendingSync() {
  localStorage.setItem(PENDING_SYNC_KEY, String(Date.now()));
}

function clearPendingSync() {
  localStorage.removeItem(PENDING_SYNC_KEY);
}

function hasPendingSync() {
  const pendingAt = Number(localStorage.getItem(PENDING_SYNC_KEY) || 0);

  return pendingAt > 0 && Date.now() - pendingAt < PENDING_SYNC_TIMEOUT_MS;
}

function sameSongList(firstSongs, secondSongs) {
  return JSON.stringify(firstSongs) === JSON.stringify(secondSongs);
}

function normalizeSongList(songListValue) {
  return songListValue
    .map((song) => {
      if (typeof song === "string") {
        const name = normalizeSongName(song);
        return name ? createSong(name) : null;
      }

      if (song && typeof song === "object" && typeof song.name === "string") {
        const name = normalizeSongName(song.name);
        return name ? { id: String(song.id || createSongId(name)), name } : null;
      }

      return null;
    })
    .filter(Boolean);
}

function createSong(name) {
  return {
    id: createSongId(name),
    name
  };
}

function createSongId(name) {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${compactSearchText(normalizeSearchText(name))}`;
}

async function saveSongs(syncAction = null) {
  storeSongsLocally(songs);
  markPendingSync();

  if (!canSyncSongs() || !syncAction) {
    return;
  }

  const inputs = {
    operation: syncAction.operation,
    song_id: syncAction.song?.id || syncAction.songId || "",
    song_name: syncAction.song?.name || syncAction.songName || ""
  };

  const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/update-songs.yml/dispatches`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${GITHUB_WRITE_TOKEN}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify({
      ref: GITHUB_BRANCH,
      inputs
    })
  });

  if (!response.ok) {
    throw new Error("Song sync failed");
  }
}

async function persistSongs(syncAction = null) {
  try {
    await saveSongs(syncAction);
  } catch {
    await openNoticeModal({
      title: "공유 저장 실패",
      message: "이 브라우저에는 저장됐지만, 다른 컴퓨터에 반영하지 못했어요.",
      confirmText: "확인"
    });
  }
}

async function syncSongsFromSharedList() {
  try {
    const sharedSongs = await fetchSharedSongs();

    if (sameSongList(songs, sharedSongs)) {
      clearPendingSync();
      return;
    }

    if (hasPendingSync()) {
      playerHint.textContent = "공유 목록 저장을 기다리는 중이에요.";
      return;
    }

    songs = sharedSongs;
    storeSongsLocally(songs);
    clearPendingSync();
    renderSongs();
  } catch {
    // Keep the current view when shared sync is temporarily unavailable.
  }
}

function openInputModal({ title, label, type = "text", value = "", confirmText = "확인" }) {
  return new Promise((resolve) => {
    activeModalResolve = resolve;
    modalTitle.textContent = title;
    modalLabel.textContent = label;
    modalLabel.hidden = false;
    modalInput.type = type;
    modalInput.value = value;
    modalInput.placeholder = "";
    modalInput.hidden = false;
    modalError.textContent = "";
    modalConfirmBtn.textContent = confirmText;
    modalCancelBtn.hidden = true;
    modalActions.classList.remove("two-buttons");
    modalOverlay.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => modalInput.focus());
  });
}

function openConfirmModal({ title, message, confirmText = "확인" }) {
  return new Promise((resolve) => {
    activeModalResolve = resolve;
    modalTitle.textContent = title;
    modalLabel.hidden = true;
    modalInput.hidden = true;
    modalError.textContent = message;
    modalConfirmBtn.textContent = confirmText;
    modalCancelBtn.hidden = false;
    modalActions.classList.add("two-buttons");
    modalOverlay.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => modalConfirmBtn.focus());
  });
}

function openNoticeModal({ title, message, confirmText = "확인" }) {
  return openConfirmModal({ title, message, confirmText });
}

function closeInputModal(value = null) {
  if (!activeModalResolve) {
    return;
  }

  const resolve = activeModalResolve;
  activeModalResolve = null;
  modalOverlay.hidden = true;
  document.body.classList.remove("modal-open");
  resolve(value);
}

async function checkPassword() {
  const password = await openInputModal({
    title: "비밀번호 입력",
    label: "비밀번호",
    type: "password",
    confirmText: "입장"
  });

  if (password === null) {
    return false;
  }

  if (password !== PASSWORD) {
    modalError.textContent = "";
    alert("비밀번호가 틀렸어요.");
    return false;
  }

  return true;
}

function normalizeSongName(songName) {
  return songName.trim().replace(/\s+/g, " ");
}

async function addSong() {
  if (!(await checkPassword())) {
    return;
  }

  const songName = await openInputModal({
    title: "노래 이름 입력",
    label: "노래 이름",
    confirmText: "저장"
  });

  if (songName === null) {
    return;
  }

  const normalizedName = normalizeSongName(songName);

  if (!normalizedName) {
    alert("노래 이름을 입력해 주세요.");
    return;
  }

  const newSong = createSong(normalizedName);
  songs.push(newSong);
  await persistSongs({ operation: "add", song: newSong });
  renderSongs();
}

function findSongById(songId) {
  return songs.find((song) => song.id === songId);
}

async function renameSong(songId) {
  const song = findSongById(songId);

  if (!song) {
    await openNoticeModal({
      title: "노래를 찾을 수 없어요",
      message: "목록이 바뀐 것 같아요. 새로고침 후 다시 시도해 주세요.",
      confirmText: "확인"
    });
    return;
  }

  if (!(await checkPassword())) {
    return;
  }

  const newName = await openInputModal({
    title: "새 노래 이름 입력",
    label: "새 노래 이름",
    value: song.name,
    confirmText: "변경"
  });

  if (newName === null) {
    return;
  }

  const normalizedName = normalizeSongName(newName);

  if (!normalizedName) {
    alert("노래 이름을 입력해 주세요.");
    return;
  }

  song.name = normalizedName;
  await persistSongs({ operation: "rename", song });
  renderSongs();
}

async function deleteSong(songId) {
  const song = findSongById(songId);

  if (!song) {
    await openNoticeModal({
      title: "노래를 찾을 수 없어요",
      message: "목록이 바뀐 것 같아요. 새로고침 후 다시 시도해 주세요.",
      confirmText: "확인"
    });
    return;
  }

  if (!(await checkPassword())) {
    return;
  }

  const shouldDelete = await openConfirmModal({
    title: "노래를 삭제할까요?",
    message: `"${song.name}" 노래가 목록에서 사라져요.`,
    confirmText: "삭제"
  });

  if (!shouldDelete) {
    return;
  }

  songs = songs.filter((currentSong) => currentSong.id !== songId);
  await persistSongs({ operation: "delete", songId });
  renderSongs();
}

async function drawSong() {
  if (songs.length === 0) {
    await openNoticeModal({
      title: "노래가 없어요",
      message: "먼저 노래를 추가해 주세요.",
      confirmText: "확인"
    });
    return;
  }

  const randomIndex = Math.floor(Math.random() * songs.length);
  const selectedSong = songs[randomIndex].name;

  pickedSongEl.textContent = selectedSong;
  pickedSongEl.classList.remove("waiting-text");
  await playYoutubeVideo(selectedSong);
}

function getYoutubeSearchUrl(songName) {
  const searchText = `${songName} 공식 뮤직비디오`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchText)}`;
}

function activateYoutubeFallback(songName, message) {
  youtubeLink.href = getYoutubeSearchUrl(songName);
  youtubeLink.hidden = false;
  youtubeLink.classList.remove("disabled");
  youtubeLink.removeAttribute("aria-disabled");
  playerHint.textContent = message;
}

function disableYoutubeFallback() {
  youtubeLink.hidden = true;
  youtubeLink.classList.add("disabled");
  youtubeLink.setAttribute("aria-disabled", "true");
}

async function playYoutubeVideo(songName) {
  disableYoutubeFallback();
  youtubePlayer.hidden = false;
  youtubePlayer.removeAttribute("src");

  if (!YOUTUBE_API_KEY) {
    youtubePlayer.hidden = true;
    activateYoutubeFallback(songName, "자동으로 영상을 찾으려면 배포 설정의 YouTube Data API 키가 필요해요.");
    return;
  }

  playerHint.textContent = `"${songName}" 영상을 찾는 중이에요.`;

  try {
    const videoId = await findYoutubeVideo(songName);

    if (!videoId) {
      youtubePlayer.hidden = true;
      activateYoutubeFallback(songName, "제목에 노래 이름이 있고 조회수 10만 이상인 영상을 찾지 못했어요.");
      return;
    }

    const embedParams = new URLSearchParams({
      autoplay: "1",
      playsinline: "1",
      rel: "0",
      origin: window.location.origin
    });

    youtubePlayer.src = `https://www.youtube.com/embed/${videoId}?${embedParams}`;
    playerHint.textContent = `"${songName}" 영상을 자동 재생하고 있어요. 소리가 막히면 영상의 재생 버튼을 눌러 주세요.`;
  } catch (error) {
    youtubePlayer.hidden = true;
    if (error.message === "YOUTUBE_API_FORBIDDEN") {
      activateYoutubeFallback(songName, "현재 사이트 주소가 API 키 웹사이트 제한에 없어요. Google Cloud에 이 주소를 추가해 주세요.");
      return;
    }

    activateYoutubeFallback(songName, "영상 검색 중 오류가 났어요. 유튜브에서 직접 찾아 주세요.");
  }
}

async function findYoutubeVideo(songName) {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    maxResults: "25",
    order: "relevance",
    safeSearch: "none",
    q: songName,
    key: YOUTUBE_API_KEY
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("YOUTUBE_API_FORBIDDEN");
    }

    throw new Error("YouTube search failed");
  }

  const data = await response.json();
  const videos = data.items || [];
  const videoIds = videos.map((video) => video.id?.videoId).filter(Boolean);
  const videoDetails = await getYoutubeVideoDetails(videoIds);
  const bestVideo = videoDetails
    .filter((video) => isEligibleYoutubeVideo(songName, video))
    .map((video) => ({
      video,
      score: scoreYoutubeResult(songName, video.snippet)
    }))
    .sort((a, b) => b.score - a.score)[0];

  return bestVideo?.video?.id || "";
}

async function getYoutubeVideoDetails(videoIds) {
  if (videoIds.length === 0) {
    return [];
  }

  const params = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    id: videoIds.join(","),
    key: YOUTUBE_API_KEY
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("YOUTUBE_API_FORBIDDEN");
    }

    throw new Error("YouTube video details failed");
  }

  const data = await response.json();
  return data.items || [];
}

function isEligibleYoutubeVideo(songName, video) {
  const viewCount = Number(video?.statistics?.viewCount || 0);
  const durationSeconds = parseYoutubeDuration(video?.contentDetails?.duration || "");

  return titleIncludesSongName(video?.snippet?.title || "", songName) && viewCount >= 100000 && durationSeconds >= 60;
}

function titleIncludesSongName(title, songName) {
  const normalizedTitle = normalizeSearchText(title);
  const normalizedSongName = normalizeSearchText(songName);
  const compactTitle = compactSearchText(normalizedTitle);
  const compactSongName = compactSearchText(normalizedSongName);

  return normalizedTitle.includes(normalizedSongName) || compactTitle.includes(compactSongName);
}

function scoreYoutubeResult(songName, snippet) {
  const title = normalizeSearchText(snippet?.title || "");
  const channel = normalizeSearchText(snippet?.channelTitle || "");
  const compactTitle = compactSearchText(title);
  const compactSongName = compactSearchText(normalizeSearchText(songName));
  const queryWords = normalizeSearchText(songName).split(" ").filter(Boolean);
  const badWords = ["news", "story", "shorts", "tiktok", "reaction", "interview", "cover", "karaoke", "live", "incoming", "call", "전화", "놀이", "뉴스", "이야기", "리액션", "커버"];
  const goodWords = ["official", "audio", "music", "video", "mv", "lyrics", "topic"];
  let score = 0;

  if (compactTitle === compactSongName) {
    score += 80;
  } else if (compactTitle.startsWith(compactSongName)) {
    score += 45;
  }

  queryWords.forEach((word) => {
    if (title.includes(word)) {
      score += 8;
    }

    if (channel.includes(word)) {
      score += 2;
    }
  });

  if (titleIncludesSongName(snippet?.title || "", songName)) {
    score += 20;
  }

  if ((snippet?.title || "").includes("#")) {
    score -= 18;
  }

  score -= Math.min(Math.max(title.length - normalizeSearchText(songName).length, 0), 40) * 0.25;

  goodWords.forEach((word) => {
    if (title.includes(word) || channel.includes(word)) {
      score += 3;
    }
  });

  badWords.forEach((word) => {
    if (title.includes(word) || channel.includes(word)) {
      score -= 12;
    }
  });

  return score;
}

function normalizeSearchText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function compactSearchText(text) {
  return text.replace(/\s+/g, "");
}

function parseYoutubeDuration(duration) {
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);

  if (!match) {
    return 0;
  }

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

function renderSongs() {
  songList.innerHTML = "";
  songCount.textContent = `${songs.length}곡`;
  emptyMessage.hidden = songs.length > 0;

  songs.forEach((song) => {
    const item = document.createElement("li");
    item.className = "song-item";

    const name = document.createElement("span");
    name.className = "song-name";
    name.textContent = song.name;

    const actions = document.createElement("div");
    actions.className = "song-actions";

    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.textContent = "이름 변경";
    renameButton.addEventListener("click", () => renameSong(song.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "삭제";
    deleteButton.className = "danger-button";
    deleteButton.addEventListener("click", () => deleteSong(song.id));

    actions.append(renameButton, deleteButton);
    item.append(name, actions);
    songList.append(item);
  });
}

addSongBtn.addEventListener("click", addSong);
drawSongBtn.addEventListener("click", drawSong);
inputModal.addEventListener("submit", (event) => {
  event.preventDefault();
  closeInputModal(modalInput.value);
});
modalCloseBtn.addEventListener("click", () => closeInputModal(null));
modalCancelBtn.addEventListener("click", () => closeInputModal(false));
modalOverlay.addEventListener("click", (event) => {
  if (event.target === modalOverlay) {
    closeInputModal(null);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalOverlay.hidden) {
    closeInputModal(null);
  }
});

disableYoutubeFallback();
youtubePlayer.hidden = true;
(async function init() {
  songs = await loadSongs();
  renderSongs();
  window.setInterval(syncSongsFromSharedList, SYNC_POLL_INTERVAL_MS);
})();
