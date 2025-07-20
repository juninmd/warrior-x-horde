
import { createEnemy } from '../entities';
import { gameState } from '../gameState';
import { Enemy } from '../types';

export function createZombie(): Enemy {
  let zombieType: string;
  const rand = Math.random();

  if (gameState.currentWave < 3) {
    zombieType = 'normal';
  } else if (gameState.currentWave < 6) {
    if (rand < 0.8) zombieType = 'normal';
    else zombieType = 'fast';
  } else if (gameState.currentWave < 10) {
    if (rand < 0.6) zombieType = 'normal';
    else if (rand < 0.9) zombieType = 'fast';
    else zombieType = 'tank';
  } else {
    if (rand < 0.5) zombieType = 'normal';
    else if (rand < 0.75) zombieType = 'fast';
    else if (rand < 0.9) zombieType = 'tank';
    else zombieType = 'spitter';
  }

  const zombie: Enemy = createEnemy(zombieType, gameState.currentWave);
  zombie.isZombie = true;
  zombie.moveStyle = getRandomZombieMovement();
  zombie.canSprint = Math.random() < gameState.zombieSprintChance;
  zombie.sprintCooldown = 0;
  zombie.sprintDuration = 0;
  zombie.baseSpeed = zombie.speed;
  return zombie;
}

function getRandomZombieMovement(): string {
  const styles = ["shambler", "runner", "crawler", "lurker"];
  return styles[Math.floor(Math.random() * styles.length)];
}

export function triggerZombieSprints(enemies: Enemy[]): void {
    if (gameState.zombieSprintCooldown > 0 || Math.random() >= 0.1) return;

    gameState.zombieSprintCooldown = 5000; // 5 segundos de cooldown
    enemies.forEach(zombie => {
        if (zombie.canSprint && zombie.sprintCooldown <= 0 && Math.random() < 0.3) {
            zombie.sprintCooldown = 8000 + Math.random() * 4000;
            zombie.sprintDuration = 1000 + Math.random() * 1500;
            zombie.speed = zombie.baseSpeed * (2 + Math.random() * 0.5);
            zombie.isSprinting = true;
        }
    });
}
