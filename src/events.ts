// @ts-check
// events.ts - Sistema de eventos dinâmicos para o jogo
import { entities } from './game';
import { gameState } from './gameState';
import { createZombie } from './spawner/zombieSpawner';
import { createBarrel } from './entities/barrel';
import { sounds } from './audio';

export function triggerRandomEvent(): void {
  if (!gameState.isStarted || gameState.isGameOver || entities.boss) return;

  const eventRoll = Math.random();

  if (eventRoll < 0.3) {
    triggerHordeEvent();
  } else if (eventRoll < 0.6) {
    triggerSpecialBarrelDrop();
  } else {
    // No event or future environmental hazard event
    console.log('No event triggered this time.');
  }
}

function triggerHordeEvent(): void {
  console.log('Horde Event Triggered!');
  sounds.bossWarning.play(); // Reusing sound for now

  const hordeTypeRoll = Math.random();
  let zombieType: string;
  const spawnCount = 10 + Math.floor(gameState.currentWave / 2);

  if (hordeTypeRoll < 0.4) {
    zombieType = 'normal';
  } else if (hordeTypeRoll < 0.7) {
    zombieType = 'fast';
  } else if (hordeTypeRoll < 0.9) {
    zombieType = 'tank';
  } else {
    zombieType = 'spitter';
  }

  for (let i = 0; i < spawnCount; i++) {
    entities.enemies.push(createZombie(zombieType));
  }
}

function triggerSpecialBarrelDrop(): void {
  console.log('Special Barrel Drop Event Triggered!');
  sounds.barrelPickup.play(); // Reusing sound for now

  const barrelTypeRoll = Math.random();
  let barrelType: 'buff_shield' | 'buff_damage' | 'buff_firerate' | 'health' | 'reinforcement';

  if (barrelTypeRoll < 0.3) {
    barrelType = 'buff_shield';
  } else if (barrelTypeRoll < 0.6) {
    barrelType = 'buff_damage';
  } else if (barrelTypeRoll < 0.8) {
    barrelType = 'buff_firerate';
  } else if (barrelTypeRoll < 0.9) {
    barrelType = 'health';
  } else {
    barrelType = 'reinforcement';
  }

  entities.barrels.push(createBarrel(barrelType, Math.random() < 0.5 ? 'left' : 'right'));
}
