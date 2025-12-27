// shooting.ts - Sistema de tiro automatico e Super Cannon
import { Entities, GameState, Bullet, Army, EnemyHorde, Boss, Soldier } from './types';
import { addFloatingText } from './renderer';

export function createBullet(x: number, y: number, targetX: number, targetY: number, damage: number, isEnemy: boolean): Bullet {
  return {
    x,
    y,
    targetX,
    targetY,
    speed: isEnemy ? 3 : -10,
    damage,
    isEnemy,
  };
}

function findNearestTarget(army: Army, hordes: EnemyHorde[], boss: Boss | null): { x: number; y: number } | null {
  let nearestDist = Infinity;
  let nearest: { x: number; y: number } | null = null;

  for (const horde of hordes) {
    if (!horde.isActive || horde.soldiers.length === 0) continue;
    const dx = horde.x - army.centerX;
    const dy = horde.y - army.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist && horde.y < army.centerY) {
      nearestDist = dist;
      nearest = { x: horde.x, y: horde.y };
    }
  }

  if (boss && boss.isActive) {
    const dx = boss.x + boss.width / 2 - army.centerX;
    const dy = boss.y + boss.height / 2 - army.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) {
      nearest = { x: boss.x + boss.width / 2, y: boss.y + boss.height / 2 };
    }
  }

  return nearest;
}

function checkBulletSoldierCollision(bullet: Bullet, soldier: Soldier): boolean {
  const soldierRadius = soldier.size;
  const bulletRadius = 5;
  const dx = bullet.x - soldier.x;
  const dy = bullet.y - soldier.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < (soldierRadius + bulletRadius);
}

export function updateShooting(entities: Entities, gameState: GameState): void {
  if (gameState.isGameOver || gameState.isVictory) return;

  const army = entities.playerArmy;
  const now = Date.now();

  if (now - army.lastShotTime < army.fireRate) return;

  const target = findNearestTarget(army, entities.enemyHordes, entities.boss);
  if (!target) return;

  const aliveSoldiers = army.soldiers.filter(s => s.isAlive);
  const shootersCount = Math.min(5, aliveSoldiers.length);

  for (let i = 0; i < shootersCount; i++) {
    const shooter = aliveSoldiers[Math.floor(Math.random() * aliveSoldiers.length)];
    entities.bullets.push(createBullet(
      shooter.x,
      shooter.y - 10,
      target.x + (Math.random() - 0.5) * 20,
      target.y,
      army.damage,
      false
    ));
  }

  army.lastShotTime = now;
}

export function activateSuperCannon(gameState: GameState): void {
  const now = Date.now();
  if (!gameState.superCannonReady) return;
  if (now - gameState.superCannonLastUsed < gameState.superCannonCooldown) return;
  
  gameState.superCannonActive = true;
  gameState.superCannonTimer = gameState.superCannonDuration;
  gameState.superCannonLastUsed = now;
  gameState.superCannonReady = false;
}

export function updateSuperCannon(entities: Entities, gameState: GameState, deltaTime: number): void {
  const now = Date.now();
  
  if (!gameState.superCannonReady && now - gameState.superCannonLastUsed >= gameState.superCannonCooldown) {
    gameState.superCannonReady = true;
  }
  
  if (gameState.superCannonActive) {
    gameState.superCannonTimer -= deltaTime;
    
    if (gameState.superCannonTimer <= 0) {
      gameState.superCannonActive = false;
      gameState.superCannonTimer = 0;
    } else {
      applySuperCannonDamage(entities, gameState);
    }
  }
}

function applySuperCannonDamage(entities: Entities, gameState: GameState): void {
  const army = entities.playerArmy;
  if (army.soldiers.length === 0) return;
  
  const beamX = army.centerX;
  const beamWidth = 40;
  const damage = army.damage * gameState.superCannonDamageMultiplier;
  
  for (const horde of entities.enemyHordes) {
    if (!horde.isActive) continue;
    
    for (let i = horde.soldiers.length - 1; i >= 0; i--) {
      const soldier = horde.soldiers[i];
      if (soldier.y < army.centerY && soldier.x > beamX - beamWidth / 2 && soldier.x < beamX + beamWidth / 2) {
        horde.soldiers.splice(i, 1);
        gameState.score += 15;
      }
    }
    
    horde.count = horde.soldiers.length;
    if (horde.soldiers.length === 0) {
      horde.isActive = false;
      gameState.score += 100;
    }
  }
  
  if (entities.boss && entities.boss.isActive) {
    const boss = entities.boss;
    const bossCenter = boss.x + boss.width / 2;
    if (bossCenter > beamX - beamWidth / 2 && bossCenter < beamX + beamWidth / 2) {
      boss.hp -= damage * 0.1;
      if (boss.hp <= 0) {
        boss.isActive = false;
        gameState.isVictory = true;
        gameState.score += 1000;
        addFloatingText('BOSS DESTROYED!', boss.x + boss.width / 2, boss.y, '#FFD700');
      }
    }
  }
}

export function updateBullets(entities: Entities, gameState: GameState): void {
  for (const bullet of entities.bullets) {
    bullet.y += bullet.speed;
  }

  entities.bullets = entities.bullets.filter(b => b.y > -50 && b.y < 900);

  for (let i = entities.bullets.length - 1; i >= 0; i--) {
    const bullet = entities.bullets[i];
    if (bullet.isEnemy) continue;

    let bulletHit = false;

    for (const horde of entities.enemyHordes) {
      if (!horde.isActive || bulletHit) continue;

      for (let j = horde.soldiers.length - 1; j >= 0; j--) {
        const soldier = horde.soldiers[j];
        if (!soldier.isAlive) continue;

        if (checkBulletSoldierCollision(bullet, soldier)) {
          horde.soldiers.splice(j, 1);
          horde.count = horde.soldiers.length;
          gameState.score += 10;

          if (horde.soldiers.length === 0) {
            horde.isActive = false;
            gameState.score += 50;
            addFloatingText('HORDE DESTROYED!', horde.x, horde.y, '#FFD700');
          }

          entities.bullets.splice(i, 1);
          bulletHit = true;
          break;
        }
      }
    }

    if (bulletHit) continue;

    if (entities.boss && entities.boss.isActive) {
      const boss = entities.boss;
      if (bullet.x > boss.x && bullet.x < boss.x + boss.width &&
          bullet.y > boss.y && bullet.y < boss.y + boss.height) {
        boss.hp -= bullet.damage;
        entities.bullets.splice(i, 1);

        if (boss.hp <= 0) {
          boss.isActive = false;
          gameState.isVictory = true;
          gameState.score += 500;
          addFloatingText('BOSS DEFEATED!', boss.x + boss.width / 2, boss.y, '#FFD700');
        }
      }
    }
  }
}
