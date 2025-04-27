// @ts-check
// entities.js - Classes e funções para entidades do jogo
import { sounds } from './audio.js';
import { canvas, gameState } from './game.js';

// Constantes
const PLAYER_WIDTH = 64;
const PLAYER_HEIGHT = 64;
const BULLET_WIDTH = 5;
const BULLET_HEIGHT = 10;
const SUPER_CANNON_COOLDOWN = 10000;  // 10 segundos de cooldown

// Criar jogador principal
function createPlayer() {
  return {
    type: 'ally',
    isMainPlayer: true,
    x: canvas.width / 2 - PLAYER_WIDTH / 2,
    y: canvas.height - 100,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    speed: 2,
    bulletSpeed: 4,
    bulletDamage: 1,
    superCannonDamageMultiply: 5,
    fireRate: 600,
    lastShotTime: 0,
    hp: 10,
    shield: 0,
    kills: 0,
    totalKills: 0,
    frameIndex: 0,
    frameTimer: 0,
    frameInterval: 120,
    damageEffect: 0,
    superCannonActive: false,
    superCannonTimer: 0,
    superCannonDuration: 3000,
    superCannonCooldown: SUPER_CANNON_COOLDOWN,
    superCannonLastUsed: 0,
    superCannonReady: true
  };
}

// Ajustar a criação de reforços para garantir que sejam criados corretamente
function createReinforcement(offsetX, mainPlayer) {
  return {
    type: 'ally',
    isMainPlayer: false,
    x: mainPlayer.x + offsetX,
    y: mainPlayer.y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    offsetX: offsetX,
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
    damageEffect: 0
  };
}
const zombieSpeedBase = 0.1;
// Criar inimigo
function createEnemy(wave) {
  return {
    type: 'enemy',
    x: Math.random() * (canvas.width - 50),
    y: -Math.random() * 100 - 50,
    width: 50,
    height: 50,
    speed: zombieSpeedBase + (wave / 5) * zombieSpeedBase,
    hp: wave,
    damageEffect: 0,
    frameIndex: 0,
    frameTimer: 0,
    frameInterval: 120,
  };
}

// Criar chefe
function createBoss(wave) {
  return {
    type: 'boss',
    x: canvas.width / 2 - 120,
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
    frameIndex: 0,
    frameTimer: 0,
    frameInterval: 120,
  };
}


// Criar barril
function createBarrel(type) {
  const BarrelAttributes = {
    BUFF: { speed: 0.6, hp: 5 },
    REINFORCEMENT: { speed: 0.3, hp: 10 },
    NERF: { speed: 2.0, hp: 5 },
    HEALTH: { speed: 2.0, hp: 1 },
    SHIELD: { speed: 1, hp: 1 }
  };

  const attributes = BarrelAttributes[type.toUpperCase()];
  if (!attributes) {
    console.error(`Tipo de barril inválido: ${type}`);
    throw new Error(`Tipo de barril inválido: ${type}`);
  }

  return {
    type: 'barrel',
    barrelType: type,
    x: Math.random() * (canvas.width - 30),
    y: -Math.random() * 100 - 50,
    width: 30,
    height: 30,
    speed: attributes.speed,
    hp: attributes.hp
  };
}

// Criar bala
function createBullet(entity, isEnemy = false) {
  return {
    type: 'bullet',
    isEnemy: isEnemy,
    x: entity.x + entity.width / 2 - BULLET_WIDTH / 2,
    y: isEnemy ? entity.y + entity.height : entity.y,
    width: BULLET_WIDTH,
    height: BULLET_HEIGHT,
    speed: entity.bulletSpeed || 2,
    damage: entity.bulletDamage || (isEnemy ? entity.damage || 5 : 1)
  };
}

// Ativar super canhão
function activateSuperCannon(player) {
  if (!player.superCannonReady) return false;

  player.superCannonActive = true;
  player.superCannonTimer = Date.now();
  player.superCannonLastUsed = Date.now();
  player.superCannonReady = false;
  player.kills = 0; // Reset kills

  sounds.superCannon.play();
  return true;
}

// Atualizar entidades
function updateEntities(entities, gameState) {
  const now = Date.now();

  // Atualizar aliados
  entities.allies.forEach((ally, index) => {
    // Atualizar efeito de dano
    if (ally.damageEffect > 0) ally.damageEffect--;

    // Verificar cooldown do super canhão para o jogador principal
    if (ally.isMainPlayer && !ally.superCannonReady && now - ally.superCannonLastUsed >= ally.superCannonCooldown) {
      ally.superCannonReady = true;
    }

    // Desativar super canhão após duração
    if (ally.isMainPlayer && ally.superCannonActive && now - ally.superCannonTimer > ally.superCannonDuration) {
      ally.superCannonActive = false;
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
  entities.barrels = entities.barrels.filter(barrel => {
    barrel.y += barrel.speed;
    return barrel.y <= canvas.height;
  });
}

// Aplicar dano
function applyDamage(entity, damage) {
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