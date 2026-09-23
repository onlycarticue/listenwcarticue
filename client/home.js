const API_URL = import.meta.env.VITE_API_URL || "/api/auth";
const TRACKS_API_URL = API_URL.replace(/\/auth\/?$/, "");
const token = localStorage.getItem("auth_token");
const logoutButton = document.querySelector("#logout");
const profileToggle = document.querySelector("#profile-toggle");
const profileDropdown = document.querySelector("#profile-dropdown");
const profileLogoutButton = document.querySelector("#profile-logout");
const welcomeElement = document.querySelector("#welcome");
const tidalWelcomeElement = document.querySelector("#tidal-welcome");
const adminLink = document.querySelector("#admin-link");
const searchInput = document.querySelector(".search-box input");
const playButtons = document.querySelectorAll("[data-play]");
const favoriteButtons = document.querySelectorAll("[data-favorite]");
const menuButtons = document.querySelectorAll("[data-menu]");
const miniPlayerToggle = document.querySelector("#mini-player-toggle");
const playerTrackName = document.querySelector("#player-track-name");
const playerTrackArtist = document.querySelector("#player-track-artist");
const playerTrackCover = document.querySelector("#player-track-cover");
const playerSeek = document.querySelector("#player-seek");
const playerCurrentTime = document.querySelector("#player-current-time");
const playerDuration = document.querySelector("#player-duration");
const discoverSection = document.querySelector("#discover");
const discoverResultCount = document.querySelector("#discover-result-count");
const discoverEmpty = document.querySelector("#discover-empty");
const discoverCards = document.querySelector("#discover-cards");
const youtubePlayerHost = document.querySelector("#youtube-player");
const audioPlayer = document.querySelector("#audio-player");
const SERVER_URL = TRACKS_API_URL.replace(/\/api\/?$/, "");

const goToLogin = () => window.location.replace("/");

const logout = () => {
  stopCurrentAudio();
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  goToLogin();
};

const toast = document.createElement("div");
toast.className = "play-status";
document.body.appendChild(toast);

const playerState = {
  audioContext: null,
  oscillator: null,
  gainNode: null,
  isPlaying: false,
  currentTrack: null,
  currentTime: 0,
  duration: 0,
  startedAt: 0,
  timerId: null,
  youtubePlayer: null,
  youtubeReadyPromise: null,
  htmlAudio: null,
  playbackRequestId: 0,
};

const trackDurations = {
  "Electric Afterglow": 238,
  "Night Signals": 252,
  Monochrome: 214,
  "Low Key": 229,
  "Vivid Dreams": 267,
  "Cold Lights": 223,
  "Open Water": 248,
  "Slow Motion": 177,
  "Deep focus": 360,
};

let databaseTracks = [];

const formatTime = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
};

const escapeHtml = (value) => String(value || "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatTrackDuration = (seconds) => formatTime(seconds || 0);

const getYouTubeId = (url) => {
  if (!url) return "";
  const match = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
  return match ? match[1] : "";
};

const resolveMediaUrl = (url) => {
  if (!url) return "";
  return String(url).startsWith("http") ? url : `${SERVER_URL}${url}`;
};

const loadYouTubePlayer = () => {
  if (playerState.youtubeReadyPromise) return playerState.youtubeReadyPromise;

  playerState.youtubeReadyPromise = new Promise((resolve, reject) => {
    const createPlayer = () => {
      if (!youtubePlayerHost || !window.YT?.Player) {
        reject(new Error("ไม่สามารถเปิด YouTube Player ได้"));
        return;
      }

      playerState.youtubePlayer = new window.YT.Player(youtubePlayerHost, {
        height: "1",
        width: "1",
        playerVars: { playsinline: 1, controls: 0, rel: 0 },
        events: {
          onReady: (event) => resolve(event.target),
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              playerState.currentTime = 0;
              playerState.currentTrack = null;
              stopAudio();
              updateMiniPlayer(null);
            }
          },
          onError: () => setToast("YouTube ไม่อนุญาตให้เล่นเพลงนี้บนเว็บไซต์"),
        },
      });
    };

    if (window.YT?.Player) {
      createPlayer();
      return;
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      createPlayer();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("โหลด YouTube Player ไม่สำเร็จ"));
    document.head.appendChild(script);
  });

  return playerState.youtubeReadyPromise;
};

const renderDatabaseTracks = (tracks) => {
  if (!discoverCards) return;

  discoverCards.innerHTML = tracks.map((track, index) => {
    const cover = track.coverArt
      ? `<img class="tidal-art database-cover" src="${escapeHtml(track.coverArt)}" alt="ปก ${escapeHtml(track.title)}" />`
      : `<div class="tidal-art a${(index % 4) + 1}">${escapeHtml(track.title.slice(0, 2).toUpperCase())}</div>`;
    return `<article data-track-name="${escapeHtml(track.title)}" data-track-artist="${escapeHtml(track.artist)}" data-track-duration="${Number(track.durationSec) || 0}" data-audio-url="${escapeHtml(track.audioUrl)}" data-cover-art="${escapeHtml(track.coverArt)}">
      ${cover}
      <h3>${escapeHtml(track.title)}</h3>
      <p>${escapeHtml(track.artist)}${track.album ? ` · ${escapeHtml(track.album)}` : ""}</p>
      <small class="track-duration">${formatTrackDuration(track.durationSec)}</small>
      <button data-play type="button" aria-label="เล่น ${escapeHtml(track.title)}">▶</button>
    </article>`;
  }).join("");

  databaseTracks = tracks;
  if (discoverResultCount) discoverResultCount.textContent = `${tracks.length} เพลงจากฐานข้อมูล`;
  if (discoverEmpty) discoverEmpty.hidden = tracks.length !== 0;
  discoverCards.querySelectorAll("[data-play]").forEach((button) => {
    button.addEventListener("click", () => togglePlayback(button));
  });
  discoverCards.querySelectorAll("article[data-track-name]").forEach((card) => {
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      togglePlayback(card);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      togglePlayback(card);
    });
  });
};

const loadDatabaseTracks = async () => {
  try {
    const response = await fetch(`${TRACKS_API_URL}/tracks`);
    if (!response.ok) throw new Error("ไม่สามารถโหลดเพลงจากฐานข้อมูลได้");
    const tracks = await response.json();
    renderDatabaseTracks(Array.isArray(tracks) ? tracks : []);
  } catch (error) {
    if (discoverResultCount) discoverResultCount.textContent = "โหลดเพลงไม่สำเร็จ";
    if (discoverEmpty) {
      discoverEmpty.hidden = false;
      discoverEmpty.textContent = "ไม่สามารถเชื่อมต่อฐานข้อมูลเพลงได้";
    }
    setToast(error.message);
  }
};

const setToast = (message) => {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(setToast.timeoutId);
  setToast.timeoutId = window.setTimeout(() => toast.classList.remove("visible"), 1800);
};

const setAdminLinkVisibility = (role) => {
  if (!adminLink) return;
  const isAdmin = role === "admin";
  adminLink.classList.toggle("hidden", !isAdmin);
  adminLink.style.display = isAdmin ? "block" : "none";
  adminLink.setAttribute("aria-hidden", String(!isAdmin));
};

const stopCurrentAudio = () => {
  if (playerState.oscillator) {
    try {
      playerState.oscillator.stop();
    } catch (error) {
      // ignore cleanup error when oscillator already stopped
    }
    playerState.oscillator.disconnect();
    playerState.oscillator = null;
  }
  if (playerState.gainNode) {
    playerState.gainNode.disconnect();
    playerState.gainNode = null;
  }
  if (playerState.youtubePlayer?.pauseVideo) {
    playerState.youtubePlayer.pauseVideo();
  }
  if (playerState.htmlAudio) {
    playerState.htmlAudio.pause();
  }
  window.clearInterval(playerState.timerId);
  playerState.timerId = null;
  playerState.isPlaying = false;
};

const updateProgress = () => {
  if (playerState.isPlaying) {
    if (playerState.htmlAudio && playerState.currentTrack?.audioUrl && !getYouTubeId(playerState.currentTrack.audioUrl)) {
      playerState.currentTime = playerState.htmlAudio.currentTime;
      playerState.duration = playerState.htmlAudio.duration || playerState.duration;
    } else if (playerState.youtubePlayer?.getCurrentTime && playerState.currentTrack?.audioUrl) {
      playerState.currentTime = playerState.youtubePlayer.getCurrentTime();
      playerState.duration = playerState.youtubePlayer.getDuration() || playerState.duration;
    } else {
      playerState.currentTime = Math.min(
        playerState.duration,
        (performance.now() / 1000) - playerState.startedAt,
      );
    }
  }

  if (playerSeek) playerSeek.value = String(playerState.currentTime);
  if (playerCurrentTime) playerCurrentTime.textContent = formatTime(playerState.currentTime);
  if (playerDuration) playerDuration.textContent = formatTime(playerState.duration);
};

const updateMiniPlayer = (track) => {
  if (!track) {
    playerTrackName.textContent = "No track selected";
    playerTrackArtist.textContent = "Select a song to play";
    if (playerTrackCover) {
      playerTrackCover.style.backgroundImage = "";
      playerTrackCover.textContent = "♪";
    }
    playerState.currentTime = 0;
    playerState.duration = 0;
    updateProgress();
    return;
  }

  playerTrackName.textContent = track.title;
  playerTrackArtist.textContent = track.artist;
  if (playerTrackCover) {
    const coverUrl = resolveMediaUrl(track.coverArt);
    playerTrackCover.style.backgroundImage = coverUrl ? `url("${coverUrl}")` : "";
    playerTrackCover.textContent = coverUrl ? "" : "♪";
  }
  const loadedAudioDuration = playerState.htmlAudio?.duration;
  const hasLoadedAudioDuration = track.audioUrl
    && !getYouTubeId(track.audioUrl)
    && Number.isFinite(loadedAudioDuration)
    && loadedAudioDuration > 0;
  playerState.duration = hasLoadedAudioDuration
    ? loadedAudioDuration
    : Number(track.durationSec) || trackDurations[track.title] || 240;
  if (playerSeek) {
    playerSeek.max = String(playerState.duration);
    playerSeek.value = String(playerState.currentTime);
  }
  updateProgress();
  if (miniPlayerToggle) {
    miniPlayerToggle.textContent = playerState.isPlaying ? "❚❚" : "▶";
  }
};

const applyPlayButtonState = (button, track, isActive) => {
  if (!button) return;
  if (button.classList.contains("recent-track")) {
    button.dataset.playing = String(isActive);
    button.classList.toggle("is-playing", isActive && track?.title === playerState.currentTrack?.title);
    return;
  }
  const label = button.classList.contains("solid-play") ? "Play now" : "▶";
  const pausedLabel = button.classList.contains("solid-play") ? "Pause" : "❚❚";
  button.dataset.playing = String(isActive);
  button.textContent = isActive ? pausedLabel : label;
  button.classList.toggle("active", isActive && track?.title === playerState.currentTrack?.title);
};

const syncPlayUI = (trackName) => {
  document.querySelectorAll("[data-play]").forEach((button) => {
    const buttonTitle = button.dataset.trackName || button.closest("article")?.dataset.trackName || button.closest(".recent-track")?.dataset.trackName || "Electric Afterglow";
    const isThisTrack = buttonTitle === trackName;
    applyPlayButtonState(button, { title: buttonTitle }, playerState.isPlaying && isThisTrack);
  });
};

const startYouTubeAudio = async (track, startAt) => {
  const videoId = getYouTubeId(track.audioUrl);
  if (!videoId) {
    setToast("รูปแบบลิงก์ YouTube ไม่ถูกต้อง");
    return;
  }

  try {
    const requestId = playerState.playbackRequestId;
    const youtubePlayer = await loadYouTubePlayer();
    if (requestId !== playerState.playbackRequestId || playerState.currentTrack?.title !== track.title) return;
    playerState.currentTime = Number(startAt) || 0;
    playerState.duration = Number(track.durationSec) || 240;
    youtubePlayer.loadVideoById({ videoId, startSeconds: playerState.currentTime });
    youtubePlayer.playVideo();
    playerState.isPlaying = true;
    updateMiniPlayer(track);
    syncPlayUI(track.title);
    window.clearInterval(playerState.timerId);
    playerState.timerId = window.setInterval(updateProgress, 250);
    setToast(`กำลังเล่น: ${track.title}`);
  } catch (error) {
    setToast(error.message);
  }
};

const startMp3Audio = (track, startAt) => {
  if (!audioPlayer) {
    setToast("เบราว์เซอร์ไม่รองรับการเล่น MP3");
    return;
  }

  const requestId = playerState.playbackRequestId;
  const source = resolveMediaUrl(track.audioUrl);
  playerState.htmlAudio = audioPlayer;
  audioPlayer.src = source;
  audioPlayer.currentTime = 0;
  audioPlayer.onloadedmetadata = () => {
    audioPlayer.currentTime = Number(startAt) || 0;
    playerState.duration = audioPlayer.duration || Number(track.durationSec) || 240;
    updateMiniPlayer(track);
  };
  audioPlayer.onended = () => {
    playerState.currentTime = 0;
    playerState.currentTrack = null;
    stopAudio();
    updateMiniPlayer(null);
  };
  audioPlayer.play().then(() => {
    if (requestId !== playerState.playbackRequestId || playerState.currentTrack?.title !== track.title) return;
    playerState.isPlaying = true;
    playerState.duration = audioPlayer.duration || Number(track.durationSec) || 240;
    updateMiniPlayer(track);
    syncPlayUI(track.title);
    window.clearInterval(playerState.timerId);
    playerState.timerId = window.setInterval(updateProgress, 250);
    setToast(`กำลังเล่น: ${track.title}`);
  }).catch(() => setToast("ไม่สามารถเล่นไฟล์ MP3 นี้ได้"));
};

const startAudio = (trackOrName, startAt = playerState.currentTime) => {
  const track = typeof trackOrName === "string"
    ? { ...(playerState.currentTrack || {}), title: trackOrName }
    : trackOrName;
  const trackName = track.title;

  playerState.playbackRequestId += 1;
  stopCurrentAudio();

  if (track.audioUrl && getYouTubeId(track.audioUrl)) {
    startYouTubeAudio(track, startAt);
    return;
  }
  if (track.audioUrl) {
    startMp3Audio(track, startAt);
    return;
  }

  setToast("เพลงนี้ยังไม่มีไฟล์ MP3 หรือ YouTube URL");
  return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    setToast("เบราว์เซอร์ของคุณไม่รองรับการเล่นเสียง");
    return;
  }

  if (!playerState.audioContext) {
    playerState.audioContext = new AudioContextClass();
  }

  if (playerState.audioContext.state === "suspended") {
    playerState.audioContext.resume();
  }

  if (playerState.oscillator) {
    stopCurrentAudio();
  }

  const gainNode = playerState.audioContext.createGain();
  const oscillator = playerState.audioContext.createOscillator();
  const frequencies = {
    "Electric Afterglow": 220,
    "Night Signals": 262,
    "Monochrome": 196,
    "Low Key": 330,
    "Vivid Dreams": 294,
    "Cold Lights": 247,
    "Open Water": 175,
    "Slow Motion": 311,
    "Deep focus": 310,
  };

  oscillator.type = "sine";
  oscillator.frequency.value = frequencies[trackName] || 220;
  gainNode.gain.value = 0.05;

  oscillator.connect(gainNode);
  gainNode.connect(playerState.audioContext.destination);
  oscillator.start();

  playerState.gainNode = gainNode;
  playerState.oscillator = oscillator;
  playerState.isPlaying = true;
  playerState.duration = Number(track.durationSec) || trackDurations[trackName] || playerState.duration || 240;
  playerState.currentTime = Math.min(Math.max(0, startAt), playerState.duration);
  playerState.startedAt = (performance.now() / 1000) - playerState.currentTime;
  window.clearInterval(playerState.timerId);
  playerState.timerId = window.setInterval(() => {
    updateProgress();
    if (playerState.currentTime >= playerState.duration) {
      playerState.currentTime = 0;
      playerState.currentTrack = null;
      stopAudio();
      updateMiniPlayer(null);
    }
  }, 250);
  updateProgress();
  syncPlayUI(trackName);
  setToast(`กำลังเล่น: ${trackName}`);
};

const stopAudio = () => {
  stopCurrentAudio();
  syncPlayUI(playerState.currentTrack?.title || "");
  if (playerState.currentTrack) {
    setToast(`หยุดเล่น: ${playerState.currentTrack.title}`);
  }
};

const getTrackMeta = (button) => {
  const article = button.closest("article");
  const recentTrack = button.closest(".recent-track");
  const title = button.dataset.trackName || article?.dataset.trackName || recentTrack?.dataset.trackName || "Electric Afterglow";
  const artist = button.dataset.trackArtist || article?.dataset.trackArtist || recentTrack?.dataset.trackArtist || recentTrack?.querySelector("small")?.textContent || "Mira Vale";
  const durationSec = Number(button.dataset.trackDuration || article?.dataset.trackDuration || recentTrack?.dataset.trackDuration || 0);
  const audioUrl = button.dataset.audioUrl || article?.dataset.audioUrl || recentTrack?.dataset.audioUrl || "";
  const coverArt = button.dataset.coverArt || article?.dataset.coverArt || recentTrack?.dataset.coverArt || "";
  return { title, artist, durationSec, audioUrl, coverArt };
};

const togglePlayback = (button) => {
  const track = getTrackMeta(button);

  if (playerState.currentTrack && playerState.currentTrack.title === track.title && playerState.isPlaying) {
    stopAudio();
    updateMiniPlayer(playerState.currentTrack);
    return;
  }

  const isDifferentTrack = playerState.currentTrack?.title !== track.title;
  playerState.currentTrack = track;
  playerState.currentTime = isDifferentTrack ? 0 : playerState.currentTime;
  updateMiniPlayer(track);
  startAudio(track, isDifferentTrack ? 0 : playerState.currentTime);
};

const seekPlayback = (event) => {
  if (!playerState.currentTrack) {
    setToast("เลือกเพลงก่อนเพื่อเลือกวินาที");
    return;
  }

  const nextTime = Number(event.target.value);
  playerState.currentTime = nextTime;

  if (playerState.htmlAudio && !getYouTubeId(playerState.currentTrack.audioUrl)) {
    playerState.htmlAudio.currentTime = nextTime;
  } else if (playerState.youtubePlayer?.seekTo && getYouTubeId(playerState.currentTrack.audioUrl)) {
    playerState.youtubePlayer.seekTo(nextTime, true);
  } else {
    playerState.startedAt = (performance.now() / 1000) - nextTime;
  }

  updateProgress();
};

const handleSearch = (event) => {
  const query = event.target.value.trim().toLowerCase();
  const visibleCards = document.querySelectorAll("#discover .tidal-cards article");
  let visibleCount = 0;

  visibleCards.forEach((element) => {
    const text = element.textContent.toLowerCase();
    const isMatch = !query || text.includes(query);
    element.style.display = isMatch ? "" : "none";
    if (isMatch) visibleCount += 1;
  });

  if (discoverResultCount) discoverResultCount.textContent = query ? `พบ ${visibleCount} เพลง` : `${databaseTracks.length} เพลงจากฐานข้อมูล`;
  if (discoverEmpty) discoverEmpty.hidden = visibleCount !== 0;
};

const attachNavigationHandlers = () => {
  document.querySelectorAll('.sidebar nav a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      document.querySelectorAll(".view-section").forEach((section) => {
        section.classList.toggle("is-active", section === target);
      });
      document.querySelectorAll('.sidebar nav a[href^="#"]').forEach((navLink) => {
        navLink.classList.toggle("active", navLink === link);
      });
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (target === discoverSection && searchInput) {
        window.setTimeout(() => searchInput.focus(), 350);
      }
    });
  });
};

const attachFavoriteHandlers = () => {
  favoriteButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const isActive = button.classList.toggle("active");
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.textContent = isActive ? "♥" : "♡";
      setToast(isActive ? `เพิ่ม ${button.dataset.trackName || "เพลงนี้"} ลงรายการโปรดแล้ว` : `ลบ ${button.dataset.trackName || "เพลงนี้"} จากรายการโปรดแล้ว`);
    });
  });

  menuButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setToast(`เพิ่ม ${button.dataset.trackName || "เพลงนี้"} ลงคิวเล่น`);
    });
  });
};

const attachPlayHandlers = () => {
  playButtons.forEach((button) => {
    button.addEventListener("click", () => togglePlayback(button));
  });

  if (miniPlayerToggle) {
    miniPlayerToggle.addEventListener("click", () => {
      if (!playerState.currentTrack) {
        setToast("เลือกเพลงก่อนเพื่อเล่น");
        return;
      }

      if (playerState.isPlaying) {
        stopAudio();
        updateMiniPlayer(playerState.currentTrack);
      } else {
        startAudio(playerState.currentTrack, playerState.currentTime);
        updateMiniPlayer(playerState.currentTrack);
      }
    });
  }

  if (playerSeek) playerSeek.addEventListener("input", seekPlayback);
};

const initPlayerStyles = () => {
  const styleTag = document.createElement("style");
  styleTag.textContent = `
    .admin-link {
      display: none;
    }
    .admin-link.hidden {
      display: none;
    }
    .youtube-player {
      position: fixed;
      width: 1px;
      height: 1px;
      left: -10px;
      bottom: -10px;
      opacity: 0;
      pointer-events: none;
    }
    .view-section {
      display: none;
    }
    .view-section.is-active {
      display: block;
    }
    .discover-empty {
      padding: 36px 0;
      color: #a9aec4;
      text-align: center;
    }
    .mini-player {
      position: fixed;
      left: 50%;
      bottom: 18px;
      transform: translateX(-50%);
      width: min(760px, calc(100vw - 30px));
      min-height: 88px;
      padding: 14px 18px;
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      flex-wrap: wrap;
      background: rgba(18, 18, 24, 0.92);
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 18px 36px rgba(0,0,0,0.25);
      z-index: 50;
    }
    .mini-player__meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .mini-player__cover {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #7c3aed, #8b5cf6);
      color: white;
      font-weight: 800;
    }
    .mini-player__meta strong {
      display: block;
      font-size: 0.95rem;
    }
    .mini-player__meta small {
      color: #b7bdd9;
      display: block;
      margin-top: 3px;
    }
    .mini-player__controls button {
      width: 42px;
      height: 42px;
      border: none;
      border-radius: 50%;
      background: #fff;
      color: #111827;
      font-size: 1.1rem;
      font-weight: 800;
      cursor: pointer;
    }
    .mini-player__timeline {
      flex: 1 1 260px;
      display: grid;
      grid-template-columns: auto minmax(120px, 1fr) auto;
      align-items: center;
      gap: 9px;
      color: #b7bdd9;
      font-size: 11px;
    }
    .mini-player__timeline input {
      width: 100%;
      accent-color: #9b7dff;
      cursor: pointer;
    }
    .play-status {
      position: fixed;
      right: 20px;
      bottom: 24px;
      background: rgba(20, 20, 28, 0.96);
      color: #f5f5f5;
      padding: 10px 14px;
      border-radius: 999px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.3);
      font-size: 12px;
      opacity: 0;
      transform: translateY(8px);
      transition: 0.2s ease;
      pointer-events: none;
      z-index: 99;
    }
    .play-status.visible {
      opacity: 1;
      transform: translateY(0);
    }
    [data-play].active,
    .solid-play.active,
    .focus-mix button.active {
      background: #9b7dff;
      color: white;
      box-shadow: 0 10px 22px rgba(155, 125, 255, 0.35);
    }
    .circle.active {
      background: rgba(255, 112, 157, 0.18);
      border-color: rgba(255, 112, 157, 0.9);
      color: #ff7aa9;
    }
    .recent-track.is-playing {
      background: rgba(155, 125, 255, 0.12);
    }
  `;
  document.head.appendChild(styleTag);
};

const attachAuthHandlers = () => {
  [logoutButton, profileLogoutButton]
    .filter(Boolean)
    .forEach((button) => button.addEventListener("click", logout));

  if (!profileToggle || !profileDropdown) return;
  const closeProfileMenu = () => {
    profileDropdown.hidden = true;
    profileToggle.setAttribute("aria-expanded", "false");
  };
  profileToggle.addEventListener("click", () => {
    const isOpen = !profileDropdown.hidden;
    profileDropdown.hidden = isOpen;
    profileToggle.setAttribute("aria-expanded", String(!isOpen));
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".profile-menu")) closeProfileMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeProfileMenu();
  });
};

if (!token) {
  if (welcomeElement) welcomeElement.textContent = "เลือกเพลงที่ใช่สำหรับคุณ";
  if (tidalWelcomeElement) tidalWelcomeElement.textContent = "Guest";
  if (logoutButton) logoutButton.textContent = "เข้าสู่ระบบ";
  if (profileLogoutButton) profileLogoutButton.textContent = "เข้าสู่ระบบ";
} else {
  fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
    .then(async (response) => {
      if (!response.ok) throw new Error("Session expired");
      return response.json();
    })
    .then(({ user }) => {
      localStorage.setItem("auth_user", JSON.stringify(user));
      if (welcomeElement) welcomeElement.textContent = `${user.username} 👋`;
      if (tidalWelcomeElement) tidalWelcomeElement.textContent = user.username;
      setAdminLinkVisibility(user.role);
    })
    .catch(() => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      goToLogin();
    });
}

if (searchInput) {
  searchInput.addEventListener("input", handleSearch);
}

attachPlayHandlers();
attachFavoriteHandlers();
attachAuthHandlers();
attachNavigationHandlers();
initPlayerStyles();
loadDatabaseTracks();

window.addEventListener("beforeunload", () => {
  stopCurrentAudio();
});
