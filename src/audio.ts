// @ts-check
// audio.ts - Sistema de áudio aprimorado para comportamentos de zumbis

import { GameState, Sounds } from './types';

// Configuração de volumes padrão
const VOLUME_CONFIG = {
  DEFAULT: 0.5,
  GAME_MUSIC: 0.4,
  BOSS_MUSIC: 0.5,
  AMBIENT_MIN: 0.2,
  AMBIENT_MAX: 0.4,
  ZOMBIE_MIN: 0.3,
  ZOMBIE_MAX: 0.6
};

/**
 * Cria e configura um elemento de áudio com opção de loop
 */
function createLoopedAudio(src: string, volume: number): HTMLAudioElement {
  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = volume;
  // Adiciona preload para melhorar desempenho
  audio.preload = 'auto';
  return audio;
}

// Estado global do sistema de áudio
let isMusicMuted = false;
let initialVolumesSet = false;
const initialVolumes = new Map<HTMLAudioElement, number>();

/**
 * Sons do jogo com caminhos corretos
 */
export const sounds: Sounds = {
  gameStart: new Audio('./src/assets/audio/game_start.mp3'),
  gameOver: new Audio('./src/assets/audio/game_over.wav'),
  gameMusic: createLoopedAudio('./src/assets/audio/music.mp3', VOLUME_CONFIG.GAME_MUSIC),
  bossMusic: createLoopedAudio('./src/assets/audio/music_boss.mp3', VOLUME_CONFIG.BOSS_MUSIC),
  playerShoot: new Audio('./src/assets/audio/buff_damage.wav'),
  nerf: new Audio('./src/assets/audio/nerf.wav'),
  buff_damage: new Audio('./src/assets/audio/buff_damage.wav'),
  buff_health: new Audio('./src/assets/audio/buff_health.wav'),
  buff_firerate: new Audio('./src/assets/audio/buff_firerate.wav'),
  buff_speed: new Audio('./src/assets/audio/buff_speed.wav'),
  buff_shield: new Audio('./src/assets/audio/buff_shield.wav'),
  playerHit: new Audio('./src/assets/audio/nerf.wav'),
  enemyHit: new Audio('./src/assets/audio/buff_health.wav'),
  barrelPickup: new Audio('./src/assets/audio/power_up.wav'),
  bossHit: new Audio('./src/assets/audio/buff_firerate.wav'),
  bossDeath: new Audio('./src/assets/audio/boss_death.mp3'),
  waveComplete: new Audio('./src/assets/audio/wave_complete.wav'),
  bossWarning: new Audio('./src/assets/audio/nerf.mp3'),
  bossPhaseChange: new Audio('./src/assets/audio/nerf.wav'),
  bossSpawn: new Audio('./src/assets/audio/nerf.wav'),
  zombieGroan: new Audio('./src/assets/audio/nerf.wav'),
  zombieSprint: new Audio('./src/assets/audio/nerf.wav'),
  superCannon: new Audio('./src/assets/audio/boss_death.mp3'),
};

/**
 * Pré-carrega todos os sons para evitar atrasos durante o jogo
 */
export function preloadSounds(): void {
  // Salva os volumes iniciais se ainda não foram salvos
  if (!initialVolumesSet) {
    Object.values(sounds).forEach(sound => {
      initialVolumes.set(sound, sound.volume);
    });
    initialVolumesSet = true;
  }

  // Carrega todos os sons
  Object.values(sounds).forEach(sound => {
    // Configura para preload automático
    sound.preload = 'auto';

    // Tenta carregar o áudio
    try {
      sound.load();
    } catch (error) {
      console.error("Erro ao pré-carregar som:", error);
    }
  });
}

/**
 * Reproduz um som com volume aleatório dentro de um intervalo
 */
export function playSoundWithRandomVolume(
  sound: HTMLAudioElement,
  minVolume: number,
  maxVolume: number
): void {
  // Não toque se o áudio estiver mudo
  if (isMusicMuted) return;

  // Clona o áudio para permitir sobreposição de sons
  const soundClone = sound.cloneNode(true) as HTMLAudioElement;
  soundClone.volume = minVolume + Math.random() * (maxVolume - minVolume);

  // Reproduz com tratamento de erro melhorado
  soundClone.play().catch(error => {
    console.warn(`Não foi possível reproduzir o som: ${error.message}`);
  });
}

/**
 * Reproduz sons ambientes baseados no estado do jogo
 */
export function playAmbientSounds(gameState: GameState): void {
  // Não reproduz sons ambientes se o áudio estiver mudo
  if (isMusicMuted) return;

  // Som de alerta quando o boss está prestes a aparecer
  if (gameState.bossSpawnCooldown > 0 &&
    gameState.bossSpawnCooldown < gameState.maxBossSpawnCooldown * 0.5 &&
    Math.random() < 0.05) {
    playSoundWithRandomVolume(
      sounds.bossWarning,
      VOLUME_CONFIG.AMBIENT_MIN,
      VOLUME_CONFIG.AMBIENT_MAX
    );
  }
  // Sons ocasionais de zumbis em ondas mais avançadas
  else if (gameState.currentWave > 3 && Math.random() < 0.03) {
    playSoundWithRandomVolume(
      sounds.zombieGroan,
      VOLUME_CONFIG.ZOMBIE_MIN,
      VOLUME_CONFIG.ZOMBIE_MAX
    );
  }
}

/**
 * Ativa/desativa todos os sons do jogo
 * @returns O novo estado do áudio (true = ativado, false = desativado)
 */
export function toggleAudio() {
  isMusicMuted = !isMusicMuted;
  alert(`Áudio ${isMusicMuted ? 'desativado' : 'ativado'}`);

  // Aplicar volume a todos os sons
  (Object.keys(sounds) as (keyof Sounds)[]).forEach(key => {
    const sound = sounds[key];
    if (sound) {
      sound.volume = isMusicMuted ? 0 : 0.5;
    }
    else {
      console.warn(`Som ${key} não encontrado.`);
    }
  });

  // Volumes específicos para músicas
  sounds.gameMusic.volume = isMusicMuted ? 0 : 0.4;
  sounds.bossMusic.volume = isMusicMuted ? 0 : 0.5;
}

/**
 * Reproduz a música de fundo apropriada (normal ou boss)
 */
export function playBackgroundMusic(isBossFight = false): void {
  // Não faz nada se o áudio estiver mudo
  if (isMusicMuted) return;

  const musicToPlay = isBossFight ? sounds.bossMusic : sounds.gameMusic;
  const musicToPause = isBossFight ? sounds.gameMusic : sounds.bossMusic;

  // Pausa a música atual
  musicToPause.pause();
  musicToPause.currentTime = 0;

  // Inicia a nova música
  musicToPlay.currentTime = 0;
  musicToPlay.play().catch(error => {
    console.warn(`Não foi possível tocar a música de fundo: ${error.message}`);
  });
}

/**
 * Reproduz um som simples com tratamento de erro
 */
export function playSound(sound: HTMLAudioElement): void {
  if (isMusicMuted) return;

  // Clona o áudio para permitir sobreposição
  const soundClone = sound.cloneNode(true) as HTMLAudioElement;

  soundClone.play().catch(error => {
    console.warn(`Não foi possível reproduzir o som: ${error.message}`);
  });
}

/**
 * Define o volume para todos os sons
 */
export function setGlobalVolume(volume: number): void {
  Object.values(sounds).forEach(sound => {
    const originalVolume = initialVolumes.get(sound) || VOLUME_CONFIG.DEFAULT;
    // Ajusta proporcionalmente ao volume original
    sound.volume = originalVolume * volume;
  });
}

/**
 * Pausa todos os sons ativos
 */
export function pauseAllSounds(): void {
  Object.values(sounds).forEach(sound => {
    sound.pause();
  });
}