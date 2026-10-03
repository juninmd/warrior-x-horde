// enemy-ai.ts - Ranged enemies: spitters lob acid at the army from inside the horde.
import { Entities, GameState } from './types';
import { createBullet } from './shooting';

const MAX_ENEMY_BULLETS = 24; // keeps patterns readable
const MIN_Y = 90;             // do not shoot while still fading in at the top
const MAX_Y = 640;

export function countEnemyBullets(entities: Entities): number {
  let n = 0;
  for (const b of entities.bullets) if (b.isEnemy) n++;
  return n;
}

/** Returns how many acid shots were fired this frame. */
export function updateEnemyRanged(entities: Entities, gameState: GameState, dtFactor: number): number {
  if (gameState.isGameOver || gameState.isDying) return 0;
  const army = entities.playerArmy;
  let fired = 0;
  let inFlight = countEnemyBullets(entities);

  for (const horde of entities.enemyHordes) {
    if (!horde.isActive || !horde.soldiers) continue; // partial mocks in tests
    for (const s of horde.soldiers) {
      if (!s.isAlive || s.kind !== 'spitter') continue;
      s.cooldown = (s.cooldown ?? 120) - dtFactor;
      if (s.cooldown > 0) continue;
      s.cooldown = 150 + Math.random() * 110 - Math.min(60, gameState.currentLevel * 5);
      if (s.y < MIN_Y || s.y > MAX_Y || inFlight >= MAX_ENEMY_BULLETS) continue;

      const dx = army.centerX - s.x;
      const dy = Math.max(60, army.centerY - s.y);
      const len = Math.hypot(dx, dy);
      const speed = 3.4;
      const b = createBullet(s.x, s.y + 8, 0, 0, 1, true);
      b.speed = (dy / len) * speed;
      b.vx = (dx / len) * speed;
      entities.bullets.push(b);
      inFlight++;
      fired++;
    }
  }
  return fired;
}
