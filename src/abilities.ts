// @ts-check
// abilities.ts - Lógica para habilidades especiais, como o super canhão
import { gameState } from './gameState';
import { sounds } from './audio';

export function activateSuperCannon(): boolean {
  if (!gameState.superCannonReady) return false;

  gameState.superCannonActive = true;
  gameState.superCannonTimer = Date.now();
  const x = new Date();
  x.setSeconds(x.getSeconds() + 5);
  gameState.superCannonLastUsed = x.getTime();
  gameState.superCannonReady = false;

  sounds.superCannon.play();
  gameState.screenShakeActive = true;
  gameState.screenShakeIntensity = 5;
  gameState.screenShakeDuration = gameState.superCannonDuration;
  return true;
}
