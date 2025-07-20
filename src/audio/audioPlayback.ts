// @ts-check
// audio/audioPlayback.ts - Funções de reprodução e controle de áudio
import { GameState, Sounds } from '../types';
import { sounds } from '../audio';
import { VOLUME_CONFIG } from '../types';

let isMusicMuted = false;
const initialVolumes = new Map<HTMLAudioElement, number>();
let initialVolumesSet = false;

/**
 * Salva os volumes iniciais de todos os sons.
 */
function saveInitialVolumes(): void {
  if (!initialVolumesSet) {
    Object.values(sounds).forEach(sound => {
      initialVolumes.set(sound, sound.volume);
    });
    initialVolumesSet = true;
  }
}

/**
 * Pré-carrega todos os sons.
 */
export function preloadSounds(): void {
  saveInitialVolumes();
  Object.values(sounds).forEach(sound => {
    sound.preload = 'auto';
    sound.load();
  });
}

/**
 * Reproduz um som com volume aleatório.
 */
export function playSoundWithRandomVolume(sound: HTMLAudioElement, min: number, max: number): void {
  if (isMusicMuted) return;
  const soundClone = sound.cloneNode(true) as HTMLAudioElement;
  soundClone.volume = min + Math.random() * (max - min);
  soundClone.play().catch(e => console.warn(`Audio play failed: ${e.message}`));
}

/**
 * Reproduz sons ambientes com base no estado do jogo.
 */
export function playAmbientSounds(gameState: GameState): void {
  if (isMusicMuted) return;
  const { bossSpawnCooldown, maxBossSpawnCooldown, currentWave } = gameState;

  if (bossSpawnCooldown > 0 && bossSpawnCooldown < maxBossSpawnCooldown * 0.5 && Math.random() < 0.05) {
    playSoundWithRandomVolume(sounds.bossWarning, VOLUME_CONFIG.AMBIENT_MIN, VOLUME_CONFIG.AMBIENT_MAX);
  } else if (currentWave > 3 && Math.random() < 0.03) {
    playSoundWithRandomVolume(sounds.zombieGroan, VOLUME_CONFIG.ZOMBIE_MIN, VOLUME_CONFIG.ZOMBIE_MAX);
  }
}

/**
 * Ativa ou desativa o áudio.
 */
export function toggleAudio(): void {
  isMusicMuted = !isMusicMuted;
  const newVolume = isMusicMuted ? 0 : 1;
  setGlobalVolume(newVolume);
  alert(`Áudio ${isMusicMuted ? 'desativado' : 'ativado'}`);
}

/**
 * Define o volume global para todos os sons.
 */
export function setGlobalVolume(volume: number): void {
  Object.values(sounds).forEach(sound => {
    const originalVolume = initialVolumes.get(sound) || VOLUME_CONFIG.DEFAULT;
    sound.volume = originalVolume * volume;
  });
}

/**
 * Reproduz a música de fundo apropriada.
 */
export function playBackgroundMusic(isBossFight = false): void {
  if (isMusicMuted) return;
  const musicToPlay = isBossFight ? sounds.bossMusic : sounds.gameMusic;
  const musicToPause = isBossFight ? sounds.gameMusic : sounds.bossMusic;

  musicToPause.pause();
  musicToPause.currentTime = 0;
  musicToPlay.play().catch(e => console.warn(`Music play failed: ${e.message}`));
}

/**
 * Reproduz um som simples.
 */
export function playSound(sound: HTMLAudioElement): void {
  if (isMusicMuted) return;
  const soundClone = sound.cloneNode(true) as HTMLAudioElement;
  soundClone.play().catch(e => console.warn(`Audio play failed: ${e.message}`));
}

/**
 * Pausa todos os sons.
 */
export function pauseAllSounds(): void {
  Object.values(sounds).forEach(sound => sound.pause());
}
