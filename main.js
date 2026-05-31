const PASSWORD = "1+1=1";
const STORAGE_KEY = "class-song-drawing-machine-songs";
const YOUTUBE_API_KEY = window.YOUTUBE_API_KEY || "";

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
const modalConfirmBtn = document.querySelector("#modalConfirmBtn");

let songs = loadSongs();
let activeModalResolve = null;

function loadSongs() {
  const savedSongs = localStorage.getItem(STORAGE_KEY);

  if (!savedSongs) {
    return [];
  }

  try {
    const parsedSongs = JSON.parse(savedSongs);
    return Array.isArray(parsedSongs) ? parsedSongs : [];
  } catch {
    return [];
  }
}

function saveSongs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
}

function openInputModal({ title, label, type = "text", value = "", confirmText = "확인" }) {
  return new Promise((resolve) => {
    activeModalResolve = resolve;
    modalTitle.textContent = title;
    modalLabel.textContent = label;
    modalInput.type = type;
    modalInput.value = value;
    modalInput.placeholder = "";
    modalError.textContent = "";
    modalConfirmBtn.textContent = confirmText;
    modalOverlay.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => modalInput.focus());
  });
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

  songs.push(normalizedName);
  saveSongs();
  renderSongs();
}

async function renameSong(index) {
  if (!(await checkPassword())) {
    return;
  }

  const newName = await openInputModal({
    title: "새 노래 이름 입력",
    label: "새 노래 이름",
    value: songs[index],
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

  songs[index] = normalizedName;
  saveSongs();
  renderSongs();
}

async function deleteSong(index) {
  if (!(await checkPassword())) {
    return;
  }

  const shouldDelete = confirm(`"${songs[index]}" 노래를 삭제할까요?`);

  if (!shouldDelete) {
    return;
  }

  songs.splice(index, 1);
  saveSongs();
  renderSongs();
}

async function drawSong() {
  if (songs.length === 0) {
    alert("먼저 노래를 추가해 주세요.");
    return;
  }

  const randomIndex = Math.floor(Math.random() * songs.length);
  const selectedSong = songs[randomIndex];

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
    activateYoutubeFallback(songName, "자동으로 영상을 찾으려면 main.js에 YouTube Data API 키가 필요해요.");
    return;
  }

  playerHint.textContent = `"${songName}" 영상을 찾는 중이에요.`;

  try {
    const videoId = await findYoutubeVideo(songName);

    if (!videoId) {
      youtubePlayer.hidden = true;
      activateYoutubeFallback(songName, "자동으로 찾지 못했어요. 유튜브에서 직접 찾아 주세요.");
      return;
    }

    youtubePlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    playerHint.textContent = `"${songName}" 영상을 자동 재생하고 있어요.`;
  } catch {
    youtubePlayer.hidden = true;
    activateYoutubeFallback(songName, "영상 검색 중 오류가 났어요. 유튜브에서 직접 찾아 주세요.");
  }
}

async function findYoutubeVideo(songName) {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    maxResults: "1",
    q: `${songName} 공식 뮤직비디오`,
    key: YOUTUBE_API_KEY
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);

  if (!response.ok) {
    throw new Error("YouTube search failed");
  }

  const data = await response.json();
  return data.items?.[0]?.id?.videoId || "";
}

function renderSongs() {
  songList.innerHTML = "";
  songCount.textContent = `${songs.length}곡`;
  emptyMessage.hidden = songs.length > 0;

  songs.forEach((song, index) => {
    const item = document.createElement("li");
    item.className = "song-item";

    const name = document.createElement("span");
    name.className = "song-name";
    name.textContent = song;

    const actions = document.createElement("div");
    actions.className = "song-actions";

    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.textContent = "이름 변경";
    renameButton.addEventListener("click", () => renameSong(index));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "삭제";
    deleteButton.className = "danger-button";
    deleteButton.addEventListener("click", () => deleteSong(index));

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
renderSongs();
