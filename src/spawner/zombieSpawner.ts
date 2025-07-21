
import { createEnemy } from '../entities';
import { gameState } from '../gameState';
import { Enemy } from '../types';

export function createZombie(forcedType?: string): Enemy {
  let zombieType: string = 'normal';

  if (forcedType) {
    zombieType = forcedType;
  } else {
    const probabilities = getZombieTypeProbabilities(gameState.currentWave);
    let cumulativeProbability = 0;
    const rand = Math.random();

    for (const type in probabilities) {
      cumulativeProbability += probabilities[type as keyof typeof probabilities];
      if (rand < cumulativeProbability) {
        zombieType = type;
        break;
      }
    }
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

function getZombieTypeProbabilities(wave: number): { [key: string]: number } {
  let normal = 0.7;
  let fast = 0.2;
  let tank = 0.1;
  let spitter = 0;

  if (wave >= 3) {
    normal = 0.5;
    fast = 0.3;
    tank = 0.15;
    spitter = 0.05;
  }
  if (wave >= 6) {
    normal = 0.4;
    fast = 0.3;
    tank = 0.2;
    spitter = 0.1;
  }
  if (wave >= 10) {
    normal = 0.3;
    fast = 0.25;
    tank = 0.25;
    spitter = 0.2;
  }

  // Normalize probabilities to ensure they sum to 1
  const total = normal + fast + tank + spitter;
  return {
    normal: normal / total,
    fast: fast / total,
    tank: tank / total,
    spitter: spitter / total,
  };
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
