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

function createAudio(src: string, loop = false, volume = 0.5): HTMLAudioElement {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.volume = volume;
  audio.preload = 'auto';
  return audio;
}

export const audioManager: AudioManager = {
  gameMusic: createAudio('/audio/music.mp3', true, 0.3),
  bossMusic: createAudio('/audio/music_boss.mp3', true, 0.4),
  gameStart: createAudio('/audio/game_start.mp3', false, 0.5),
  gameOver: createAudio('/audio/game_over.wav', false, 0.5),
  powerUp: createAudio('/audio/power_up.wav', false, 0.4),
  nerf: createAudio('/audio/nerf.wav', false, 0.4),
  superCannon: createAudio('/audio/boss_death.mp3', false, 0.5),
  victory: createAudio('/audio/wave_complete.wav', false, 0.5),
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
    console.warn('LocalStorage access denied', e);
  }

  // Pré-carregar todos os áudios
  Object.values(audioManager).forEach(audio => {
    audio.load();
  });

  audioInitialized = true;
}

export function resetAudio(): void {
  audioInitialized = false;
  isMuted = false;
}

export function playSound(sound: HTMLAudioElement): void {
  if (isMuted) return;

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
