import { Sounds, VOLUME_CONFIG } from './types';

function createLoopedAudio(src: string, volume: number): HTMLAudioElement {
  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = volume;
  audio.preload = 'auto';
  return audio;
}

const gameSounds = {
  gameStart: new Audio(new URL('/audio/game_start.mp3', import.meta.url).href),
  gameOver: new Audio(new URL('/audio/game_over.wav', import.meta.url).href),
  waveComplete: new Audio(new URL('/audio/wave_complete.wav', import.meta.url).href),
};

const music = {
  gameMusic: createLoopedAudio(new URL('/audio/music.mp3', import.meta.url).href, VOLUME_CONFIG.GAME_MUSIC),
  bossMusic: createLoopedAudio(new URL('/audio/music_boss.mp3', import.meta.url).href, VOLUME_CONFIG.BOSS_MUSIC),
};

const playerSounds = {
  playerShoot: new Audio(new URL('/audio/buff_damage.wav', import.meta.url).href),
  playerHit: new Audio(new URL('/audio/nerf.wav', import.meta.url).href),
  superCannon: new Audio(new URL('/audio/power_up.wav', import.meta.url).href),
  superCannonWarning: new Audio(new URL('/audio/nerf.wav', import.meta.url).href),
};

const enemySounds = {
  enemyHit: new Audio(new URL('/audio/buff_health.wav', import.meta.url).href),
  bossHit: new Audio(new URL('/audio/buff_firerate.wav', import.meta.url).href),
  bossDeath: new Audio(new URL('/audio/boss_death.mp3', import.meta.url).href),
  bossWarning: new Audio(new URL('/audio/nerf.mp3', import.meta.url).href),
  bossPhaseChange: new Audio(new URL('/audio/nerf.wav', import.meta.url).href),
  bossSpawn: new Audio(new URL('/audio/nerf.wav', import.meta.url).href),
  zombieGroan: new Audio(new URL('/audio/nerf.wav', import.meta.url).href),
  zombieSprint: new Audio(new URL('/audio/nerf.wav', import.meta.url).href),
};

const itemSounds = {
  barrelPickup: new Audio(new URL('/audio/power_up.wav', import.meta.url).href),
  nerf: new Audio(new URL('/audio/nerf.wav', import.meta.url).href),
  buff_damage: new Audio(new URL('/audio/buff_damage.wav', import.meta.url).href),
  buff_health: new Audio(new URL('/audio/buff_health.wav', import.meta.url).href),
  buff_firerate: new Audio(new URL('/audio/buff_firerate.wav', import.meta.url).href),
  
};

export const sounds: Sounds = {
  ...gameSounds,
  ...music,
  ...playerSounds,
  ...enemySounds,
  ...itemSounds,
};