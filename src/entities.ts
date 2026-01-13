// entities.ts - Criação de entidades
import { Army, Soldier, EnemyHorde, Gate, Boss, Entities, MiniBoss, MysteryBox, MAX_HEROES, MAX_ENEMIES, SoldierType } from './types';

let soldierIdCounter = 0;
let hordeIdCounter = 0;
let gateIdCounter = 0;
let miniBossIdCounter = 0;
let mysteryBoxIdCounter = 0;

export function createSoldier(x: number, y: number, color: string, hp: number = 1): Soldier {
  return {
    id: soldierIdCounter++,
    x,
    y,
    targetX: x,
    targetY: y,
    color,
    size: 16,
    isAlive: true,
    animOffset: Math.random() * Math.PI * 2,
    hp,
    maxHp: hp,
    type: 'normal',
  };
}

// Criar super guerreiro (mais forte, mais vida, tiro mais rápido)
export function createSuperSoldier(x: number, y: number): Soldier {
  return {
    id: soldierIdCounter++,
    x,
    y,
    targetX: x,
    targetY: y,
    color: '#FFD700', // Dourado para destacar
    size: 20, // Maior
    isAlive: true,
    animOffset: Math.random() * Math.PI * 2,
    hp: 5, // 5x mais vida
    maxHp: 5,
    type: 'super',
    personalFireRate: 100, // Atira 2x mais rápido
    lastShotTime: 0
  };
}

export function createBazookaSoldier(x: number, y: number): Soldier {
  return {
    id: soldierIdCounter++,
    x,
    y,
    targetX: x,
    targetY: y,
    color: '#2E7D32', // Dark Green
    size: 22, // Bigger
    isAlive: true,
    animOffset: Math.random() * Math.PI * 2,
    hp: 8,
    maxHp: 8,
    type: 'bazooka',
    personalFireRate: 1500, // Slow fire rate
    lastShotTime: 0
  };
}

export function createRamboSoldier(x: number, y: number): Soldier {
  return {
    id: soldierIdCounter++,
    x,
    y,
    targetX: x,
    targetY: y,
    color: '#D32F2F', // Red
    size: 18,
    isAlive: true,
    animOffset: Math.random() * Math.PI * 2,
    hp: 6,
    maxHp: 6,
    type: 'rambo',
    personalFireRate: 100, // Very fast fire rate
    lastShotTime: 0
  };
}

export function createLaserSoldier(x: number, y: number): Soldier {
  return {
    id: soldierIdCounter++,
    x,
    y,
    targetX: x,
    targetY: y,
    color: '#00E5FF', // Cyan
    size: 18,
    isAlive: true,
    animOffset: Math.random() * Math.PI * 2,
    hp: 4,
    maxHp: 4,
    type: 'laser',
    personalFireRate: 800,
    lastShotTime: 0
  };
}

export function createPlayerArmy(canvasWidth: number, canvasHeight: number): Army {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight - 80; // Mais para baixo - mais tempo de reação
  const soldiers: Soldier[] = [];

  // Começa com 5 soldados para ter uma base decente
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const radius = 15;
    soldiers.push(createSoldier(
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius * 0.6, // 0.6 para efeito 3D
      '#4A90D9'
    ));
  }

  return {
    soldiers,
    centerX,
    centerY,
    targetX: centerX,
    color: '#4A90D9',
    isPlayer: true,
    fireRate: 500, // FireRate base: 500ms (mais rápido - era 600)
    lastShotTime: 0,
    damage: 4, // Dano base aumentado para 4 (era 3)
  };
}

export function addSoldiersToArmy(army: Army, count: number): void {
  const baseCount = army.soldiers.length;
  // Limitar ao máximo de heróis
  const maxToAdd = Math.max(0, MAX_HEROES - baseCount);
  const actualCount = Math.min(count, maxToAdd);

  for (let i = 0; i < actualCount; i++) {
    const index = baseCount + i;
    // Formação em espiral/círculos concêntricos
    // Cada "anel" tem ~8 soldados mais que o anterior (densidade crescente)
    const ring = Math.floor(Math.sqrt(index / 2)); // Determina qual anel
    const soldiersInRing = Math.max(6, ring * 6); // Mais soldados por anel externo
    const positionInRing = index - (ring > 0 ? Math.floor((ring * (ring - 1) / 2) * 6) : 0);
    const angle = (positionInRing / soldiersInRing) * Math.PI * 2 + ring * 0.5; // Offset por anel
    const radius = 15 + ring * 12; // Raio aumenta por anel

    army.soldiers.push(createSoldier(
      army.centerX + Math.cos(angle) * radius,
      army.centerY + Math.sin(angle) * radius * 0.6, // 0.6 para efeito 3D
      army.color
    ));
  }
}

export function multiplySoldiersInArmy(army: Army, multiplier: number): void {
  const currentCount = army.soldiers.length;
  // Limitar multiplicador para evitar explosão de entidades
  const targetCount = Math.min(MAX_HEROES, Math.floor(currentCount * multiplier));
  const newCount = targetCount - currentCount;
  addSoldiersToArmy(army, Math.max(0, newCount));
}

export function removeSoldiersFromArmy(army: Army, count: number): void {
  for (let i = 0; i < count && army.soldiers.length > 0; i++) {
    army.soldiers.pop();
  }
}

// Adicionar super guerreiros ao exército
export function addSuperSoldiersToArmy(army: Army, count: number): void {
  addSpecialSoldiersToArmy(army, count, 'super');
}

// Adicionar guerreiros especiais ao exército
export function addSpecialSoldiersToArmy(army: Army, count: number, type: SoldierType): void {
  const baseCount = army.soldiers.length;
  // Limitar ao máximo de heróis
  const maxToAdd = Math.max(0, MAX_HEROES - baseCount);
  const actualCount = Math.min(count, maxToAdd);

  for (let i = 0; i < actualCount; i++) {
    const index = baseCount + i;
    // Mesma formação circular dos soldados normais
    const ring = Math.floor(Math.sqrt(index / 2));
    const soldiersInRing = Math.max(6, ring * 6);
    const positionInRing = index - (ring > 0 ? Math.floor((ring * (ring - 1) / 2) * 6) : 0);
    const angle = (positionInRing / soldiersInRing) * Math.PI * 2 + ring * 0.5;
    const radius = 15 + ring * 12;

    const x = army.centerX + Math.cos(angle) * radius;
    const y = army.centerY + Math.sin(angle) * radius * 0.6;

    let soldier;
    switch (type) {
        case 'super': soldier = createSuperSoldier(x, y); break;
        case 'bazooka': soldier = createBazookaSoldier(x, y); break;
        case 'rambo': soldier = createRamboSoldier(x, y); break;
        case 'laser': soldier = createLaserSoldier(x, y); break;
        default: soldier = createSoldier(x, y, army.color);
    }

    army.soldiers.push(soldier);
  }
}

export function createEnemyHorde(canvasWidth: number, y: number, count: number, level: number = 1): EnemyHorde {
  // Calcular limites da estrada com perspectiva
  // A estrada é mais estreita no topo e mais larga embaixo
  const roadTopWidth = canvasWidth * 0.3;
  const roadBottomWidth = canvasWidth;

  // Calcular a largura da estrada nesta posição Y (interpolação linear)
  // Como Y é negativo (acima da tela), usar um valor base
  const normalizedY = Math.max(0, Math.min(1, (y + 200) / 800)); // Normalizar para 0-1
  const roadWidthAtY = roadTopWidth + (roadBottomWidth - roadTopWidth) * normalizedY;

  // Centralizar na estrada com pequena variação
  const maxOffset = roadWidthAtY * 0.2; // 20% de variação máxima
  const x = canvasWidth / 2 + (Math.random() - 0.5) * maxOffset;

  const soldiers: Soldier[] = [];

  // HP dos inimigos aumenta LEVEMENTE com o level (+25% por level ao invés de 50%)
  const enemyHp = 1 + Math.floor((level - 1) * 0.25);

  // Formação em círculos concêntricos (igual ao exército do jogador)
  let soldierIndex = 0;
  let ring = 0;
  const baseRadius = 20;
  const ringSpacing = 18;

  while (soldierIndex < count) {
    const ringRadius = ring === 0 ? 0 : baseRadius + (ring - 1) * ringSpacing;
    const soldiersInRing = ring === 0 ? 1 : Math.min(Math.floor(ring * 6), count - soldierIndex);

    for (let i = 0; i < soldiersInRing && soldierIndex < count; i++) {
      const angle = ring === 0 ? 0 : (i / soldiersInRing) * Math.PI * 2;
      const soldierX = x + Math.cos(angle) * ringRadius;
      const soldierY = y + Math.sin(angle) * ringRadius * 0.5; // Achatar em Y para efeito 3D

      soldiers.push(createSoldier(soldierX, soldierY, '#E74C3C', enemyHp));
      soldierIndex++;
    }
    ring++;
  }

  return {
    id: hordeIdCounter++,
    soldiers,
    count,
    x,
    y,
    width: Math.min(count * 8, 150),
    height: Math.min(count * 4, 80),
    color: '#E74C3C',
    speed: 0,
    isActive: true,
  };
}

export function createGate(canvasWidth: number, y: number, side: 'left' | 'right', level: number = 1, currentHeroCount: number = 0, currentEnemyCount: number = 0): Gate {
  const gateWidth = canvasWidth / 2 - 30;
  let roll = Math.random();

  let type: 'add' | 'multiply' | 'subtract' | 'divide' | 'firerate' | 'damage' | 'superwarrior' | 'bazooka' | 'rambo' | 'laser';
  let value: number;
  let color: string;

  // Se já atingiu o máximo de heróis, não gerar gates de aumento
  const atMaxHeroes = currentHeroCount >= MAX_HEROES;

  // Se no máximo, redistribuir probabilidades (remover add, multiply, superwarrior)
  if (atMaxHeroes) {
    // Apenas gates que não aumentam heróis: firerate, damage, subtract, divide
    if (roll < 0.35) {
      type = 'firerate';
      value = 0.92;
      color = '#F39C12';
    } else if (roll < 0.70) {
      type = 'damage';
      value = 2;
      color = '#9900ffff';
    } else if (roll < 0.85) {
      type = 'subtract';
      value = Math.floor(Math.random() * 2) + 1;
      color = '#ff1900ff';
    } else {
      type = 'divide';
      value = 1.2;
      color = '#ff0000ff';
    }
  } else {
    // Buffs escalam com base em: tamanho do exército, quantidade de inimigos E level
    const armySize = currentHeroCount;
    const enemySize = currentEnemyCount;

    // Calcular razão inimigos/heróis - quanto maior, mais em desvantagem estamos
    const ratio = armySize > 0 ? enemySize / armySize : 10;

    // Fator de emergência mais conservador
    const emergencyFactor = ratio < 0.5
      ? 0.5  // Muito forte, reduzir buffs bastante
      : ratio < 1
        ? 0.7  // Forte, buffs reduzidos
        : ratio < 2
          ? 1.0  // Em desvantagem leve, buffs normais
          : ratio < 4
            ? 1.5  // Desvantagem média, buffs 1.5x
            : 2.0; // Situação crítica, buffs 2x

    // Fator de escala baseado no tamanho do exército - mais conservador
    const armySizeFactor = armySize < 20
      ? 1.8  // Exército muito pequeno
      : armySize < 50
        ? 1.4  // Exército pequeno
        : armySize < 150
          ? 1.0  // Exército médio
          : armySize < 400
            ? 0.7  // Exército grande
            : 0.4; // Exército enorme - reduzir muito

    // Fator de level - começa baixo no L1, cresce com levels
    // Level 1: 0.8x, Level 5: 1.2x, Level 10: 1.7x
    const levelFactor = 0.8 + (level - 1) * 0.1;

    // Combinar os três fatores - máximo mais baixo
    const scaleFactor = Math.min(3.0, emergencyFactor * armySizeFactor * levelFactor); // Máximo 3x

    // Valores base mais baixos, crescem com level
    // Level 1: base 3-8, Level 5: base 7-17, Level 10: base 13-30
    const baseAdd = Math.floor((3 + level * 1) * scaleFactor);
    const maxAdd = Math.floor((baseAdd + 5 + level * 2) * scaleFactor);

    if (roll < 0.40) {
      // 40% - Adicionar soldados (escala com emergência + level)
      type = 'add';
      value = Math.floor(Math.random() * (maxAdd - baseAdd + 1)) + baseAdd;
      color = '#2ECC71';
    } else if (roll < 0.55) {
      // 15% - Multiplicar soldados - mais conservador
      type = 'multiply';
      // Level 1: x1.15-x1.3, Level 10: x1.4-x2.0
      const baseMultiplier = 1.1 + level * 0.03;
      value = Math.min(2.5, baseMultiplier * (scaleFactor > 1 ? 1 + (scaleFactor - 1) * 0.25 : 1));
      color = '#3498DB';
    } else if (roll < 0.63) {
      // 8% - Buff de firerate
      type = 'firerate';
      // Level 1: 0.92, Level 10: 0.85
      value = Math.max(0.80, 0.93 - level * 0.008);
      color = '#F39C12';
    } else if (roll < 0.70) {
      // 7% - Buff de dano - mais conservador
      type = 'damage';
      // Level 1: +1, Level 10: +3, em emergência até +6
      value = Math.max(1, Math.floor((1 + Math.floor(level / 4)) * Math.min(2, scaleFactor)));
      color = '#9900ffff';
    } else if (roll < 0.82) {
      // 12% - Super Guerreiro - mais conservador no L1
      type = 'superwarrior';
      // Level 1: 1-2, Level 5: 2-4, Level 10: 3-8
      const baseSuperWarriors = Math.max(1, Math.floor((1 + Math.floor(level / 3)) * scaleFactor));
      const maxSuperWarriors = Math.max(baseSuperWarriors + 1, Math.floor((baseSuperWarriors + 2 + Math.floor(level / 2)) * scaleFactor));
      value = Math.floor(Math.random() * (maxSuperWarriors - baseSuperWarriors + 1)) + baseSuperWarriors;
      color = '#FFD700'; // Dourado
    } else if (roll < 0.86) {
        // 4% - Bazooka
        type = 'bazooka';
        value = Math.floor(Math.random() * 2) + 1;
        color = '#2E7D32';
    } else if (roll < 0.90) {
        // 4% - Rambo
        type = 'rambo';
        value = Math.floor(Math.random() * 2) + 1;
        color = '#D32F2F';
    } else if (roll < 0.94) {
        // 4% - Laser
        type = 'laser';
        value = Math.floor(Math.random() * 2) + 1;
        color = '#00E5FF';
    } else if (roll < 0.97) {
      // 3% - Subtrair soldados (valores baixos)
      type = 'subtract';
      value = Math.floor(Math.random() * 3) + 1; // 1-3 soldados apenas
      color = '#ff1900ff';
    } else {
      // 3% - Dividir soldados (sempre por 1.2, bem leve)
      type = 'divide';
      value = 1.2; // Divide por 1.2
      color = '#ff0000ff';
    }
  }

  return {
    id: gateIdCounter++,
    x: side === 'left' ? 15 : canvasWidth / 2 + 15,
    y,
    width: gateWidth,
    height: 80,
    type,
    value,
    color,
    side,
    passed: false,
  };
}

export function createGatePair(canvasWidth: number, y: number, level: number = 1, currentHeroCount: number = 0, currentEnemyCount: number = 0): Gate[] {
  const leftGate = createGate(canvasWidth, y, 'left', level, currentHeroCount, currentEnemyCount);
  const rightGate = createGate(canvasWidth, y, 'right', level, currentHeroCount, currentEnemyCount);

  // Se no máximo de heróis, não forçar gates de aumento
  const atMaxHeroes = currentHeroCount >= MAX_HEROES;

  // Tipos que aumentam heróis (excluir se no máximo)
  const goodTypes = atMaxHeroes
    ? ['firerate', 'damage'] // Apenas buffs que não aumentam heróis
    : ['add', 'multiply', 'firerate', 'damage', 'superwarrior', 'bazooka', 'rambo', 'laser'];

  const leftIsGood = goodTypes.includes(leftGate.type);
  const rightIsGood = goodTypes.includes(rightGate.type);

  if (leftIsGood && rightIsGood) {
    // Mudar o direito para ruim (mas com valores baixos)
    rightGate.type = Math.random() > 0.5 ? 'subtract' : 'divide';
    rightGate.value = rightGate.type === 'subtract' ?
      Math.floor(Math.random() * 2) + 1 : // 1-2 apenas
      1.5; // Divide por 1.5
    rightGate.color = rightGate.type === 'subtract' ? '#E74C3C' : '#9B59B6';
  } else if (!leftIsGood && !rightIsGood) {
    // Mudar o esquerdo para bom (valores conservadores)
    const buffRoll = Math.random();
    if (atMaxHeroes) {
      // Apenas firerate e damage quando no máximo
      if (buffRoll < 0.5) {
        leftGate.type = 'firerate';
        leftGate.value = 0.92;
        leftGate.color = '#F39C12';
      } else {
        leftGate.type = 'damage';
        leftGate.value = 2;
        leftGate.color = '#9900ffff';
      }
    } else {
      if (buffRoll < 0.3) {
        leftGate.type = 'add';
        leftGate.value = Math.floor(Math.random() * 4) + 2; // 2-5
        leftGate.color = '#2ECC71';
      } else if (buffRoll < 0.5) {
        leftGate.type = 'multiply';
        leftGate.value = 1.5; // Sempre x1.5
        leftGate.color = '#3498DB';
      } else if (buffRoll < 0.7) {
        leftGate.type = 'firerate';
        leftGate.value = 0.92;
        leftGate.color = '#F39C12';
      } else if (buffRoll < 0.8) {
        leftGate.type = 'superwarrior';
        leftGate.value = 1;
        leftGate.color = '#FFD700';
      } else {
        // Special soldiers chance
        const specialRoll = Math.random();
        if (specialRoll < 0.33) {
             leftGate.type = 'bazooka';
             leftGate.value = 1;
             leftGate.color = '#2E7D32';
        } else if (specialRoll < 0.66) {
             leftGate.type = 'rambo';
             leftGate.value = 1;
             leftGate.color = '#D32F2F';
        } else {
             leftGate.type = 'laser';
             leftGate.value = 1;
             leftGate.color = '#00E5FF';
        }
      }
    }
  }

  // Garantir que o gate bom tenha valor ligeiramente vantajoso
  if (!leftIsGood && rightIsGood) {
    if (leftGate.type === 'subtract' && rightGate.type === 'add') {
      rightGate.value = Math.max(rightGate.value, leftGate.value + 1);
    }
  } else if (leftIsGood && !rightIsGood) {
    if (rightGate.type === 'subtract' && leftGate.type === 'add') {
      leftGate.value = Math.max(leftGate.value, rightGate.value + 1);
    }
  }

  return [leftGate, rightGate];
}

export function createBoss(canvasWidth: number, level: number): Boss {
  // Level 10 = Boss final (Nave Mãe)
  const isMothership = level >= 10;

  if (isMothership) {
    // Nave mãe - boss final com vida desafiadora mas alcançável
    const bossHp = 5000 + (level - 10) * 2000; // 5000 HP base + 2000 por level acima de 10
    return {
      x: canvasWidth / 2,
      y: 25, // Posição fixa da nave no topo (não se move!)
      width: 90,
      height: 30,
      hp: bossHp,
      maxHp: bossHp,
      isActive: true,
      color: '#00FF88',
      spawnTime: Date.now(),
      isMoving: false, // Nave não se move, fica no topo
      type: 'mothership',
    };
  }

  // Boss normal - HP reduzido para ser mais justo
  const bossHp = (30 + level * 20) * 20; // Reduzido de 30x para 20x
  return {
    x: canvasWidth / 2 - 50,
    y: -200,
    width: 100,
    height: 100,
    hp: bossHp,
    maxHp: bossHp,
    isActive: true,
    color: '#8B0000',
    spawnTime: Date.now(),
    isMoving: false,
    type: 'normal',
  };
}

export function createMiniBoss(canvasWidth: number, y: number, level: number): MiniBoss {
  // Vida do mini-boss reduzida para 3x (era 5x)
  const miniBossHp = (15 + level * 10) * 3;
  return {
    id: miniBossIdCounter++,
    x: canvasWidth / 2 - 40 + (Math.random() - 0.5) * 100,
    y,
    width: 80,
    height: 80,
    hp: miniBossHp,
    maxHp: miniBossHp,
    isActive: true,
    color: '#FF4500', // Laranja escuro para mini-boss
  };
}

export function createMysteryBox(canvasWidth: number, y: number): MysteryBox {
  // Posicionar aleatoriamente na largura da estrada
  const roadWidth = canvasWidth * 0.5; // Aproximação
  const x = canvasWidth / 2 + (Math.random() - 0.5) * roadWidth;

  return {
    id: mysteryBoxIdCounter++,
    x,
    y,
    width: 50,
    height: 50,
    passed: false,
  };
}

export function createInitialEntities(canvasWidth: number, canvasHeight: number): Entities {
  // Criar hordas iniciais com mínimo de 15
  const initialHordes = [];

  // Spawnar 3 hordas iniciais bem próximas para ação imediata
  const hordePositions = [-20, -80, -140];
  const enemyCounts = [10, 100, 20]; // Grupos pequenos iniciais

  for (let i = 0; i < hordePositions.length; i++) {
    initialHordes.push(createEnemyHorde(canvasWidth, hordePositions[i], enemyCounts[i], 1));
  }

  return {
    playerArmy: createPlayerArmy(canvasWidth, canvasHeight),
    enemyHordes: initialHordes,
    gates: [],
    weapons: [],
    mysteryBoxes: [],
    bullets: [],
    boss: null,
    miniBosses: [],
  };
}
