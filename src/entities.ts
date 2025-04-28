// Converted to TypeScript
// entities.js - Classes e funções para entidades do jogo
import { sounds } from './audio';
import { canvas, gameState } from './game'; // Ensure canvas is typed as HTMLCanvasElement
import { Player, Enemy, Boss, Barrel, Bullet, Entities, GameState } from './types';

// Constantes
const PLAYER_WIDTH = 64;
const PLAYER_HEIGHT = 64;
const BULLET_WIDTH = 5;
const BULLET_HEIGHT = 10;
const SUPER_CANNON_COOLDOWN = 10000;  // 10 segundos de cooldown

// Criar jogador principal
function createPlayer(): Player {
  return {
    offsetX: 0,
    offsetY: 0,
    type: 'ally',
    isMainPlayer: true,
    x: (canvas as HTMLCanvasElement)?.width / 2 - PLAYER_WIDTH / 2 || 0,
    y: (canvas as HTMLCanvasElement)?.height - 100 || 0,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    speed: 2,
    bulletSpeed: 4,
    bulletDamage: 1,
    fireRate: 600,
    lastShotTime: 0,
    hp: 10,
    shield: 0,
    frameIndex: 0,
    frameTimer: 0,
    frameInterval: 120,
    damageEffect: 0,
  };
}

// Ajustar a criação de reforços para garantir que sejam criados corretamente
function createReinforcement(offsetX: number, mainPlayer: Player): Player {
  return {
    type: 'ally',
    isMainPlayer: false,
    offsetX: offsetX,
    offsetY: 0,
    x: mainPlayer.x + offsetX,
    y: mainPlayer.y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    speed: mainPlayer.speed,
    bulletSpeed: mainPlayer.bulletSpeed,
    bulletDamage: mainPlayer.bulletDamage,
    fireRate: mainPlayer.fireRate,
    lastShotTime: 0,
    hp: 3, // Reforços são mais fracos
    shield: 0,
    frameIndex: 0,
    frameTimer: 0,
    frameInterval: 120,
    damageEffect: 0,
  };
}
const zombieSpeedBase = 0.1;
// Criar inimigo
function createEnemy(wave: number): Enemy {
  return {
    x: Math.random() * ((canvas as HTMLCanvasElement)?.width - 50 || 0),
    y: -Math.random() * 100 - 50,
    width: 50,
    height: 50,
    speed: zombieSpeedBase + (wave / 5) * zombieSpeedBase,
    hp: wave,
    damageEffect: 0,
    frameIndex: 0,
    frameTimer: 0,
    frameInterval: 120,
    zombieType: 'normal',
    isZombie: true,
    sprintCooldown: 0,
    sprintDuration: 0,
    baseSpeed: 2
  };
}

// Criar chefe
function createBoss(wave: number): Boss {
  return {
    type: 'boss',
    x: (canvas as HTMLCanvasElement)?.width / 2 - 120 || 0,
    y: -Math.random() * 100 - 50,
    width: 240,
    height: 120,
    speed: 0.1,
    hp: (1 + wave * 10) * 3,
    maxHp: (1 + wave * 10) * 3,
    damageEffect: 0,
    lastShot: Date.now(),
    bulletDelay: Math.max(1000 - wave * 100, 100), // Reduz 100ms por wave, mínimo de 100ms
    damage: 5,
    bulletSpeed: 2,
    bulletDamage: 5,
    frameIndex: 0,
    frameTimer: 0,
    frameInterval: 120,
  };
}

// Criar barril
function createBarrel(type: 'buff' | 'nerf' | 'reinforcement' | 'health' | 'shield'): Barrel {
  const BarrelAttributes = {
    buff: { speed: 1.0, hp: 5 }, // Increased speed for better visibility
    nerf: { speed: 0.8, hp: 10 },
    reinforcement: { speed: 1.0, hp: 5 },
    health: { speed: 1.5, hp: 1 },
    shield: { speed: 1.2, hp: 1 }
  };
  const barrelKey = type.toLowerCase() as keyof typeof BarrelAttributes;
  const attributes = BarrelAttributes[barrelKey];
  if (!attributes) {
    console.error(`Tipo de barril inválido: ${type}`);
    throw new Error(`Tipo de barril inválido: ${type}`);
  }

  return {
    x: Math.random() * ((canvas as HTMLCanvasElement)?.width - 30 || 0),
    y: -Math.random() * 100 - 50,
    barrelType: type,
    width: 30,
    height: 30,
    type: 'barrel',
    speed: attributes.speed,
    hp: attributes.hp
  };
}

// Criar bala
function createBullet(entity: Player | Boss, isEnemy = false): Bullet {
  return {
    type: 'bullet',
    isEnemy: isEnemy,
    x: entity.x + entity.width / 2 - BULLET_WIDTH / 2,
    y: isEnemy ? entity.y + entity.height : entity.y,
    width: BULLET_WIDTH,
    height: BULLET_HEIGHT,
    speed: entity.bulletSpeed || 2,
    damage: entity.bulletDamage || (isEnemy ? entity.bulletDamage || 5 : 1)
  };
}

// Ativar super canhão
function activateSuperCannon(): boolean {
  if (!gameState.superCannonReady) return false;

  gameState.superCannonActive = true;
  gameState.superCannonTimer = Date.now();
  gameState.superCannonLastUsed = Date.now();
  gameState.superCannonReady = false;

  sounds.superCannon.play();
  return true;
}

// Atualizar entidades
function updateEntities(entities: Entities, gameState: GameState): void {
  const now = Date.now();

  // Atualizar aliados
  entities.allies.forEach((ally, index) => {
    // Atualizar efeito de dano
    if (ally.damageEffect > 0) ally.damageEffect--;

    // Verificar cooldown do super canhão para o jogador principal
    if (ally.isMainPlayer && !gameState.superCannonReady && now - gameState.superCannonLastUsed >= gameState.superCannonCooldown) {
      gameState.superCannonReady = true;
    }

    // Desativar super canhão após duração
    if (ally.isMainPlayer && gameState.superCannonActive && now - gameState.superCannonTimer > gameState.superCannonDuration) {
      gameState.superCannonActive = false;
    }
  });

  // Atualizar balas
  entities.bullets = entities.bullets.filter(bullet => {
    bullet.y += bullet.isEnemy ? bullet.speed : -bullet.speed;
    return bullet.y > 0 && bullet.y < canvas.height;
  });

  // Atualizar inimigos
  entities.enemies.forEach((enemy, index) => {
    enemy.y += enemy.speed;
    if (enemy.y > canvas.height) {
      // Dano ao jogador quando inimigo escapa
      if (entities.allies.length > 0) {
        applyDamage(entities.allies[0], 1);
      }
      entities.enemies.splice(index, 1);
    }
    if (enemy.damageEffect > 0) enemy.damageEffect--;
  });

  // Atualizar chefe
  if (entities.boss) {
    entities.boss.y += entities.boss.speed;
    if (entities.boss.damageEffect > 0) entities.boss.damageEffect--;

    // Tiros do chefe
    if (now - entities.boss.lastShot > entities.boss.bulletDelay) {
      entities.bullets.push(createBullet(entities.boss, true));
      entities.boss.lastShot = now;
    }

    // Game over se chefe passar da tela
    if (entities.boss.y > canvas.height) {
      entities.boss = null;
      if (gameState) gameState.isGameOver = true;
    }
  }

  // Atualizar barris
  entities.barrels.forEach(barrel => {
    barrel.y += barrel.speed;
    return barrel.y <= canvas.height;
  });
}

// Aplicar dano
function applyDamage(entity: Player, damage: number): boolean {
  if (entity.shield > 0) {
    entity.shield--;
  } else {
    entity.hp -= damage;
    entity.damageEffect = 5;
  }
  return entity.hp <= 0;
}

export {
  createPlayer,
  createReinforcement,
  createEnemy,
  createBoss,
  createBarrel,
  createBullet,
  updateEntities,
  activateSuperCannon,
  applyDamage
};
