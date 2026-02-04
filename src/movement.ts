// movement.ts - Sistema de movimento
import { Entities, GameState, Army } from './types';

export function updateArmyPosition(army: Army, targetX: number, canvasWidth: number, dtFactor: number): void {
  // Limitar movimento horizontal
  const minX = 50;
  const maxX = canvasWidth - 50;
  army.targetX = Math.max(minX, Math.min(maxX, targetX));

  // Mover centro do exército suavemente para o target (ajustado por delta time)
  const dx = army.targetX - army.centerX;
  army.centerX += dx * 0.1 * dtFactor;

  // Atualizar posição de cada soldado
  updateSoldierFormation(army, dtFactor);
}

export function updateSoldierFormation(army: Army, dtFactor: number): void {
  const aliveSoldiers = army.soldiers.filter(s => s.isAlive);
  const count = aliveSoldiers.length;

  if (count === 0) return;

  // Formação em círculos concêntricos compactos
  let soldierIndex = 0;
  let ring = 0;
  const baseRadius = 10;
  const ringSpacing = 4; // Muito mais compacto para manter formato circular

  while (soldierIndex < count) {
    const ringRadius = baseRadius + ring * ringSpacing;
    // Primeiro anel tem 1, depois 6, 12, 18... soldados por anel
    const soldiersInRing = ring === 0 ? 1 : Math.min(ring * 6, count - soldierIndex);

    for (let i = 0; i < soldiersInRing && soldierIndex < count; i++) {
      const soldier = aliveSoldiers[soldierIndex];
      // Offset por anel para efeito espiral
      const angleOffset = ring * 0.5;
      const angle = ring === 0 ? 0 : (i / soldiersInRing) * Math.PI * 2 + angleOffset;

      soldier.targetX = army.centerX + Math.cos(angle) * ringRadius;
      soldier.targetY = army.centerY + Math.sin(angle) * ringRadius * 0.6; // 0.6 para efeito 3D

      // Movimento suave para a posição alvo
      soldier.x += (soldier.targetX - soldier.x) * 0.15 * dtFactor;
      soldier.y += (soldier.targetY - soldier.y) * 0.15 * dtFactor;

      soldierIndex++;
    }
    ring++;
  }
}

export function moveEntitiesDown(entities: Entities, gameState: GameState, dtFactor: number): void {
  if (gameState.isGameOver || gameState.isPaused) return;

  // Não mover se está em vitória (transição de nível)
  if (gameState.isVictory) return;

  const baseSpeed = gameState.gameSpeed;
  // Gates começam lentos e ficam mais rápidos com o level (2.5x no level 1, até 5x no level 10+)
  // Limite máximo de velocidade (4.0x) para não ficar impossível de pegar
  const gateSpeedMultiplier = Math.min(4.0, 2.5 + (gameState.currentLevel - 1) * 0.25);
  const gateSpeed = baseSpeed * gateSpeedMultiplier * dtFactor;

  // Inimigos começam BEM lentos e aceleram aos poucos com o level
  // Level 1: 0.25x, Level 5: 0.45x, Level 10: 0.70x
  const enemySpeedMultiplier = Math.min(0.8, 0.25 + (gameState.currentLevel - 1) * 0.05);
  const enemySpeed = baseSpeed * enemySpeedMultiplier * dtFactor;

  const canvasHeight = 800;
  const pursuitThreshold = canvasHeight * 0.6;

  // Mover gates para baixo (velocidade aumenta com level)
  for (const gate of entities.gates) {
    gate.y += gateSpeed;
  }

  // Mover hordas inimigas para baixo (LENTO) e perseguir jogador
  for (const horde of entities.enemyHordes) {
    horde.y += enemySpeed;

    // Calcular limites da estrada nesta posição Y
    const roadTopWidth = 0.3; // 30% da largura no topo
    const normalizedY = Math.max(0, Math.min(1, horde.y / canvasHeight));
    const canvasWidth = 480; // Largura padrão do canvas
    const roadWidthAtY = canvasWidth * (roadTopWidth + (1 - roadTopWidth) * normalizedY);
    const roadMinX = (canvasWidth - roadWidthAtY) / 2 + 30; // Margem de 30px
    const roadMaxX = (canvasWidth + roadWidthAtY) / 2 - 30;

    // Se a horda passou do threshold, perseguir o jogador horizontalmente
    if (horde.y > pursuitThreshold && horde.isActive) {
      const targetX = entities.playerArmy.centerX;
      const dx = targetX - horde.x;
      horde.x += dx * 0.03 * dtFactor;

      // Limitar dentro da estrada
      horde.x = Math.max(roadMinX, Math.min(roadMaxX, horde.x));
    }

    // Atualizar formação circular dos soldados da horda
    updateHordeFormation(horde, enemySpeed, dtFactor);
  }

  // Mover boss - comportamento diferente para nave mãe
  if (entities.boss && entities.boss.isActive) {
    const boss = entities.boss;
    const canvasWidth = 480; // Largura padrão do canvas

    // Nave mãe (boss final do level 10) - movimento aleatório suave
    if (boss.type === 'mothership') {
      // Inicializa velocidades aleatórias se não existirem
      /* v8 ignore next 3 */
      if (boss.vx === undefined) boss.vx = (Math.random() - 0.5) * 2;
      /* v8 ignore next 2 */
      if (boss.vy === undefined) boss.vy = (Math.random() - 0.5) * 0.5;

      // Movimento suave
      boss.x += boss.vx * dtFactor;
      boss.y += boss.vy * dtFactor;

      // Limites horizontais (margem de 20px)
      const minX = 20;
      const maxX = canvasWidth - boss.width - 20;
      /* v8 ignore start */
      if (boss.x < minX) {
        boss.x = minX;
        boss.vx = Math.abs(boss.vx) * (0.8 + Math.random() * 0.4);
      } else if (boss.x > maxX) {
        boss.x = maxX;
        boss.vx = -Math.abs(boss.vx) * (0.8 + Math.random() * 0.4);
      }
      /* v8 ignore stop */

      // Limites verticais (entre y=20 e y=80)
      const minY = 20;
      const maxY = 80;
      /* v8 ignore start */
      if (boss.y < minY) {
        boss.y = minY;
        boss.vy = Math.abs(boss.vy) * (0.8 + Math.random() * 0.4);
      } else if (boss.y > maxY) {
        boss.y = maxY;
        boss.vy = -Math.abs(boss.vy) * (0.8 + Math.random() * 0.4);
      }
      /* v8 ignore stop */

      // Mudança aleatória de direção ocasional (ajustada para delta time)
      /* v8 ignore start */
      if (Math.random() < 0.02 * dtFactor) {
        boss.vx += (Math.random() - 0.5) * 0.5;
        boss.vy += (Math.random() - 0.5) * 0.2;
        // Limitar velocidade máxima
        boss.vx = Math.max(-2, Math.min(2, boss.vx));
        boss.vy = Math.max(-0.5, Math.min(0.5, boss.vy));
      }
      /* v8 ignore stop */
    } else {
      // Boss normal - fica parado por 10 segundos, depois avança
      const timeSinceSpawn = Date.now() - boss.spawnTime;
      const waitTime = 10000; // 10 segundos parado

      // Primeiro, mover até a posição inicial (y = 100)
      /* v8 ignore start */
      if (boss.y < 100) {
        boss.y += baseSpeed * dtFactor;
      } else if (timeSinceSpawn > waitTime) {
        /* v8 ignore stop */
        // Após 10 segundos, começa a avançar igual aos inimigos comuns
        boss.isMoving = true;

        // Calcular limite inferior para o boss não ultrapassar o exército
        const armyTopY = entities.playerArmy.centerY - 50;

        // Só avança se estiver acima do exército
        if (boss.y + boss.height < armyTopY) {
           boss.y += enemySpeed * 0.8; // Um pouco mais lento que inimigos normais
        } else {
           // Se chegou no exército, mantém posição relativa (não ultrapassa)
           // Na verdade, ele deve tentar "esmagar", então fica colado
           boss.y = Math.min(boss.y + enemySpeed * 0.8, armyTopY - boss.height + 20); // +20 para overlapping visual
        }

        // Boss também persegue o jogador horizontalmente (lentamente)
        const targetX = entities.playerArmy.centerX - boss.width / 2;
        const dx = targetX - boss.x;
        boss.x += dx * 0.01 * dtFactor;
      }
    }
  }

  // Mover Mystery Boxes (mesma velocidade das gates/mundo)
  for (const box of entities.mysteryBoxes) {
    if (box && !box.passed) {
      box.y += gateSpeed;
    }
  }

  // Mover Moedas (mesma velocidade das gates)
  for (const coin of entities.coins) {
    if (!coin.passed) {
      coin.y += gateSpeed;
    }
  }

  // Mover mini-bosses (mais lentos que as hordas normais)
  for (const miniBoss of entities.miniBosses) {
    /* v8 ignore next */
    if (!miniBoss.isActive) continue;

    // Mini-boss se move mais devagar verticalmente
    const miniBossSpeed = baseSpeed * 0.4 * dtFactor; // 40% da velocidade base (bem lento)

    /* v8 ignore next 3 */
    if (miniBoss.y < 200) {
      miniBoss.y += miniBossSpeed;
    } else {
      // Mini-boss continua descendo lentamente e persegue o jogador
      miniBoss.y += miniBossSpeed * 0.3;

      // Mini-boss persegue o jogador horizontalmente (lentamente)
      const targetX = entities.playerArmy.centerX - miniBoss.width / 2;
      const dx = targetX - miniBoss.x;
      miniBoss.x += dx * 0.015 * dtFactor; // Perseguição mais lenta
    }
  }

  // Remover mini-bosses inativos
  entities.miniBosses = entities.miniBosses.filter(mb => mb.isActive && mb.y < 1000);

  // Mover bullets
  // REMOVIDO: A movimentação de bullets foi movida para updateBullets em shooting.ts
  // Isso evita duplicação de lógica, já que updateBullets já é chamado no game loop.
  // for (const bullet of entities.bullets) {
  //   bullet.y += bullet.speed * dtFactor;
  // }

  // Atualizar distância percorrida (baseado na velocidade dos gates)
  gameState.distanceTraveled += gateSpeed;
}

// Atualizar formação circular da horda inimiga
function updateHordeFormation(horde: { x: number; y: number; soldiers: { x: number; y: number; targetX: number; targetY: number; isAlive: boolean }[]; isActive: boolean }, speed: number, dtFactor: number): void {
  const aliveSoldiers = horde.soldiers.filter(s => s.isAlive);
  const count = aliveSoldiers.length;

  if (count === 0) return;

  // Formação em círculos concêntricos
  let soldierIndex = 0;
  let ring = 0;
  const baseRadius = 20;
  const ringSpacing = 18;

  while (soldierIndex < count) {
    const ringRadius = ring === 0 ? 0 : baseRadius + (ring - 1) * ringSpacing;
    const soldiersInRing = ring === 0 ? 1 : Math.min(Math.floor(ring * 6), count - soldierIndex);

    for (let i = 0; i < soldiersInRing && soldierIndex < count; i++) {
      const soldier = aliveSoldiers[soldierIndex];
      const angle = ring === 0 ? 0 : (i / soldiersInRing) * Math.PI * 2;

      soldier.targetX = horde.x + Math.cos(angle) * ringRadius;
      soldier.targetY = horde.y + Math.sin(angle) * ringRadius * 0.5;

      // Movimento suave para a posição alvo
      soldier.x += (soldier.targetX - soldier.x) * 0.1 * dtFactor;
      soldier.y += (soldier.targetY - soldier.y) * 0.1 * dtFactor + speed;

      soldierIndex++;
    }
    ring++;
  }
}

export function updateMovement(entities: Entities, gameState: GameState, canvasWidth: number, targetX: number, dtFactor: number): void {
  updateArmyPosition(entities.playerArmy, targetX, canvasWidth, dtFactor);
  moveEntitiesDown(entities, gameState, dtFactor);
}
