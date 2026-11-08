// audio.ts - Sistema de áudio simplificado para Crowd Runner

export interface AudioManager {
  gameMusic: HTMLAudioElement;
  bossMusic: HTMLAudioElement;
  gameStart: HTMLAudioElement;
  gameOver: HTMLAudioElement;
  powerUp: HTMLAudioElement;
  nerf: HTMLAudioElement;
  superCannon: HTMLAudioElement;
  victory: HTMLAudioElement;
}

let isMuted = false;
let audioInitialized = false;
// Map to track last played time for throttling
const lastPlayedMap = new Map<string, number>();
const THROTTLE_MS = 80; // Minimum time between same sound instances

// Assets live under the Vite base ("/" in dev, "/<repo>/" on GitHub Pages).
const AUDIO_BASE = `${import.meta.env.BASE_URL}audio/`;

function createAudio(src: string, loop = false, volume = 0.5): HTMLAudioElement {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.volume = volume;
  audio.preload = 'auto';
  // Ensure src is set for keying
  /* v8 ignore start */
  if (!audio.src && src) {
      audio.src = src;
  }
  /* v8 ignore stop */
  return audio;
}

export const audioManager: AudioManager = {
  gameMusic: createAudio(`${AUDIO_BASE}music.mp3`, true, 0.3),
  bossMusic: createAudio(`${AUDIO_BASE}music_boss.mp3`, true, 0.4),
  gameStart: createAudio(`${AUDIO_BASE}game_start.mp3`, false, 0.5),
  gameOver: createAudio(`${AUDIO_BASE}game_over.wav`, false, 0.5),
  powerUp: createAudio(`${AUDIO_BASE}power_up.wav`, false, 0.4),
  nerf: createAudio(`${AUDIO_BASE}nerf.wav`, false, 0.4),
  superCannon: createAudio(`${AUDIO_BASE}boss_death.mp3`, false, 0.5),
  victory: createAudio(`${AUDIO_BASE}wave_complete.wav`, false, 0.5),
};

export function initAudio(): void {
  if (audioInitialized) return;

  // Carregar estado de mute salvo
  try {
    const savedMute = localStorage.getItem('crowdRunnerMute');
    if (savedMute === 'true') {
      isMuted = true;
    }
  } catch (e) {
    /* v8 ignore next */
    console.warn('LocalStorage access denied', e);
  }

  // Pré-carregar apenas o que ainda não começou a carregar: `preload = 'auto'`
  // já dispara o download, e chamar load() de novo aborta a requisição em voo
  // (net::ERR_ABORTED) e recomeça do zero.
  Object.values(audioManager).forEach(audio => {
    if (audio.networkState !== HTMLMediaElement.NETWORK_LOADING && audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
      audio.load();
    }
  });

  audioInitialized = true;
}

export function resetAudio(): void {
  audioInitialized = false;
  isMuted = false;
  lastPlayedMap.clear();
}

export function playSound(sound: HTMLAudioElement): void {
  if (isMuted) return;

  const now = Date.now();
  // Use src as key. If empty (unlikely in prod but possible in tests), use a fallback or object ref.
  const key = sound.src || 'unknown_sound';
  const lastTime = lastPlayedMap.get(key) || 0;

  if (now - lastTime < THROTTLE_MS) {
    return; // Throttled
  }

  lastPlayedMap.set(key, now);

  // Clonar para permitir múltiplas reproduções simultâneas
  const clone = sound.cloneNode(true) as HTMLAudioElement;
  clone.volume = sound.volume;
  clone.play().catch(() => {
    // Ignorar erros de autoplay
  });
}

export function playMusic(isBoss = false): void {
  if (isMuted) return;

  const musicToPlay = isBoss ? audioManager.bossMusic : audioManager.gameMusic;
  const musicToPause = isBoss ? audioManager.gameMusic : audioManager.bossMusic;

  musicToPause.pause();
  musicToPause.currentTime = 0;

  musicToPlay.currentTime = 0;
  musicToPlay.play().catch(() => {
    // Autoplay bloqueado - será iniciado na primeira interação
  });
}

export function stopAllMusic(): void {
  audioManager.gameMusic.pause();
  audioManager.bossMusic.pause();
  audioManager.gameMusic.currentTime = 0;
  audioManager.bossMusic.currentTime = 0;
}

export function toggleMute(): boolean {
  isMuted = !isMuted;

  try {
    localStorage.setItem('crowdRunnerMute', isMuted.toString());
  } catch {
    // Ignore
  }

  if (isMuted) {
    stopAllMusic();
  } else {
    // Se desmutar durante o jogo, retomar música?
    // Melhor deixar para o próximo evento de música ou chamada explícita
  }

  return isMuted;
}

export function isMusicMuted(): boolean {
  return isMuted;
}
