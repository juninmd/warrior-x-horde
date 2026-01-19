// entities.ts - Criação de entidades
import { Army, Soldier, EnemyHorde, Gate, Boss, Entities, MiniBoss, MysteryBox, Coin } from './types';
import { MAX_HEROES, MAX_ENEMIES } from './constants';

let soldierIdCounter = 0;
let hordeIdCounter = 0;
let gateIdCounter = 0;
let miniBossIdCounter = 0;
let mysteryBoxIdCounter = 0;
let coinIdCounter = 0;

export function createSoldier(x: number, y: number, color: string, hp: number = 1, type: Soldier['type'] = 'normal'): Soldier {
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
    isSuper: false,
    type,
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
    isSuper: true,
    personalFireRate: 100, // Atira 2x mais rápido
    type: 'normal', // Considerado normal, mas com flag isSuper
  };
}

// Criar soldados especiais
export function createSpecialSoldier(x: number, y: number, type: Soldier['type']): Soldier {
  let color = '#4A90D9';
  let size = 18;
  let hp = 2;

  switch (type) {
    case 'bazooka':
      color = '#27ae60'; // Verde escuro
      size = 19;
      hp = 3;
      break;
    case 'rambo':
      color = '#e74c3c'; // Vermelho
      size = 18;
      hp = 4;
      break;
    case 'laser':
      color = '#00ffff'; // Ciano
      size = 18;
      hp = 2;
      break;
  }

  return {
    id: soldierIdCounter++,
    x,
    y,
    targetX: x,
    targetY: y,
    color,
    size,
    isAlive: true,
    animOffset: Math.random() * Math.PI * 2,
    hp,
    maxHp: hp,
    isSuper: false,
    type,
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
    fireRate: 700, // FireRate base: 700ms (mais lento para equilibrar)
    lastShotTime: 0,
    damage: 3, // Dano base reduzido para 3
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
    const radius = 10 + ring * 4; // Raio aumenta por anel

    army.soldiers.push(createSoldier(
      army.centerX + Math.cos(angle) * radius,
      army.centerY + Math.sin(angle) * radius * 0.6, // 0.6 para efeito 3D
      army.color
    ));
  }
}

export function addSpecialSoldiersToArmy(army: Army, type: Soldier['type'], count: number): void {
  const baseCount = army.soldiers.length;
  const maxToAdd = Math.max(0, MAX_HEROES - baseCount);
  const actualCount = Math.min(count, maxToAdd);

  for (let i = 0; i < actualCount; i++) {
    const index = baseCount + i;
    const ring = Math.floor(Math.sqrt(index / 2));
    const soldiersInRing = Math.max(6, ring * 6);
    const positionInRing = index - (ring > 0 ? Math.floor((ring * (ring - 1) / 2) * 6) : 0);
    const angle = (positionInRing / soldiersInRing) * Math.PI * 2 + ring * 0.5;
    const radius = 10 + ring * 4;

    army.soldiers.push(createSpecialSoldier(
      army.centerX + Math.cos(angle) * radius,
      army.centerY + Math.sin(angle) * radius * 0.6,
      type
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
    const radius = 10 + ring * 4;

    army.soldiers.push(createSuperSoldier(
      army.centerX + Math.cos(angle) * radius,
      army.centerY + Math.sin(angle) * radius * 0.6
    ));
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

  // HP dos inimigos aumenta com o level (+60% por level) - Aumentado
  const enemyHp = 3 + Math.floor((level - 1) * 0.6);

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

  let type: 'add' | 'multiply' | 'subtract' | 'divide' | 'firerate' | 'damage' | 'superwarrior';
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
      ? 1.5  // Reduzido de 1.8
      : armySize < 50
        ? 1.2  // Reduzido de 1.4
        : armySize < 150
          ? 0.9  // Reduzido de 1.0
          : armySize < 400
            ? 0.6  // Reduzido de 0.7
            : 0.3; // Reduzido de 0.4

    // Fator de level - começa baixo no L1, cresce com levels
    // Level 1: 0.6x, Level 5: 0.9x, Level 10: 1.2x
    const levelFactor = 0.6 + (level - 1) * 0.06;

    // Combinar os três fatores - máximo mais baixo
    const scaleFactor = Math.min(1.8, emergencyFactor * armySizeFactor * levelFactor); // Máximo 1.8x

    // Valores base REDUZIDOS
    const baseAdd = Math.max(1, Math.floor((1 + level * 0.4) * scaleFactor));
    const maxAdd = Math.max(2, Math.floor((baseAdd + 2 + level * 0.8) * scaleFactor));

    if (roll < 0.50) {
      // 50% - Adicionar soldados (escala com emergência + level)
      type = 'add';
      value = Math.floor(Math.random() * (maxAdd - baseAdd + 1)) + baseAdd;
      color = '#2ECC71';
    } else if (roll < 0.65) {
      // 15% - Multiplicar soldados - muito conservador
      type = 'multiply';
      // Level 1: x1.02-x1.1, Level 10: x1.15
      const baseMultiplier = 1.02 + level * 0.015;
      value = Math.min(1.8, baseMultiplier * (scaleFactor > 1 ? 1 + (scaleFactor - 1) * 0.15 : 1)); // Max 1.8
      color = '#3498DB';
    } else if (roll < 0.73) {
      // 8% - Buff de firerate
      type = 'firerate';
      // Redução leve: Level 1: 0.98, Level 10: 0.95
      value = Math.max(0.92, 0.98 - level * 0.003);
      color = '#F39C12';
    } else if (roll < 0.80) {
      // 7% - Buff de dano - mais conservador
      type = 'damage';
      // Apenas +5% a +10% de dano
      value = 1.05 + (level * 0.01);
      color = '#9900ffff';
    } else if (roll < 0.94) {
      // 14% - Super Guerreiro - mais conservador
      type = 'superwarrior';
      // Level 1: 1, Level 5: 1-2, Level 10: 2-4
      const baseSuperWarriors = Math.max(1, Math.floor((0.5 + Math.floor(level / 4)) * scaleFactor));
      const maxSuperWarriors = Math.max(baseSuperWarriors, Math.floor((baseSuperWarriors + 1 + Math.floor(level / 3)) * scaleFactor));
      value = Math.floor(Math.random() * (maxSuperWarriors - baseSuperWarriors + 1)) + baseSuperWarriors;
      color = '#FFD700'; // Dourado
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
  // 40% de chance de spawnar um Math Gate (Teste de Tabuada) - Aumentado para trabalhar a lógica
  if (Math.random() < 0.4 && currentHeroCount < MAX_HEROES) {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    const result = a * b;
    const wrongResult = Math.max(1, result + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 5) + 1));

    const isLeftCorrect = Math.random() > 0.5;

    // Gate Correto
    const correctGate = createGate(canvasWidth, y, isLeftCorrect ? 'left' : 'right', level, currentHeroCount, currentEnemyCount);
    correctGate.type = 'add';
    correctGate.value = result;
    correctGate.color = '#2ECC71'; // Verde
    correctGate.customText = `${a} × ${b} = ${result}`;

    // Gate Incorreto
    const wrongGate = createGate(canvasWidth, y, isLeftCorrect ? 'right' : 'left', level, currentHeroCount, currentEnemyCount);
    wrongGate.type = 'subtract';
    // Penalidade é a "quantidade que errou" (diferença absoluta entre o resultado correto e o exibido)
    // Se o resultado exibido é 7 e o correto é 9, perde 2. Se exibido é 100, perde 91.
    // Para garantir punição justa, garantimos que a diferença seja pelo menos 1
    wrongGate.value = Math.max(1, Math.abs(result - wrongResult));
    wrongGate.color = '#E74C3C'; // Vermelho
    wrongGate.customText = `${a} × ${b} = ${wrongResult}`;

    return [correctGate, wrongGate];
  }

  const leftGate = createGate(canvasWidth, y, 'left', level, currentHeroCount, currentEnemyCount);
  const rightGate = createGate(canvasWidth, y, 'right', level, currentHeroCount, currentEnemyCount);

  // Se no máximo de heróis, não forçar gates de aumento
  const atMaxHeroes = currentHeroCount >= MAX_HEROES;

  // Tipos que aumentam heróis (excluir se no máximo)
  const heroIncreaseTypes = ['add', 'multiply', 'superwarrior'];
  const goodTypes = atMaxHeroes
    ? ['firerate', 'damage'] // Apenas buffs que não aumentam heróis
    : ['add', 'multiply', 'firerate', 'damage', 'superwarrior'];

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
      if (buffRoll < 0.4) {
        leftGate.type = 'add';
        leftGate.value = Math.floor(Math.random() * 4) + 2; // 2-5
        leftGate.color = '#2ECC71';
      } else if (buffRoll < 0.65) {
        leftGate.type = 'multiply';
        leftGate.value = 1.5; // Sempre x1.5
        leftGate.color = '#3498DB';
      } else if (buffRoll < 0.85) {
        leftGate.type = 'firerate';
        leftGate.value = 0.92;
        leftGate.color = '#F39C12';
      } else {
        leftGate.type = 'superwarrior';
        leftGate.value = 1;
        leftGate.color = '#FFD700';
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
  // Level 10+ = Boss final (Nave Mãe)
  if (level >= 10) {
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

  // Boss normal - HP (Aumentado drasticamente)
  const bossHp = (80 + level * 30) * 30; // Aumentado para desafiar mais

  // Determinar o tipo de boss baseado no nível (1-9)
  let type: Boss['type'] = 'beast';
  let color = '#8B0000';

  switch (level) {
    case 1:
      type = 'beast';
      color = '#8B4513'; // Marrom
      break;
    case 2:
      type = 'slime';
      color = '#00FF00'; // Verde
      break;
    case 3:
      type = 'eye';
      color = '#FFFFFF'; // Branco/Vermelho
      break;
    case 4:
      type = 'machine';
      color = '#708090'; // Cinza
      break;
    case 5:
      type = 'spider';
      color = '#000000'; // Preto
      break;
    case 6:
      type = 'skull';
      color = '#F0F0F0'; // Osso
      break;
    case 7:
      type = 'demon';
      color = '#FF2020'; // Vermelho
      break;
    case 8:
      type = 'ghost';
      color = '#ADD8E6'; // Azul claro transparente
      break;
    case 9:
      type = 'crystal';
      color = '#00FFFF'; // Ciano
      break;
    default:
      type = 'beast';
      color = '#8B4513';
  }

  return {
    x: canvasWidth / 2 - 50,
    y: -200,
    width: 100,
    height: 100,
    hp: bossHp,
    maxHp: bossHp,
    isActive: true,
    color,
    spawnTime: Date.now(),
    isMoving: false,
    type,
  };
}

export function createMiniBoss(canvasWidth: number, y: number, level: number): MiniBoss {
  // Vida do mini-boss aumentada drasticamente
  const miniBossHp = (30 + level * 15) * 8;
  const types: MiniBoss['type'][] = ['normal', 'armored', 'speed', 'spiky'];
  const type = types[Math.floor(Math.random() * types.length)];

  let color = '#FF4500';
  if (type === 'armored') color = '#555555';
  if (type === 'speed') color = '#FFFF00';
  if (type === 'spiky') color = '#800080';

  return {
    id: miniBossIdCounter++,
    x: canvasWidth / 2 - 40 + (Math.random() - 0.5) * 100,
    y,
    width: 80,
    height: 80,
    hp: miniBossHp,
    maxHp: miniBossHp,
    isActive: true,
    color,
    type,
  };
}

export function createMysteryBox(canvasWidth: number, y: number): MysteryBox {
  // Posicionar nas laterais (esquerda ou direita)
  const width = 50;
  const margin = 40; // Margem para ficar dentro da área jogável
  const isLeft = Math.random() > 0.5;

  const x = isLeft
    ? margin
    : canvasWidth - width - margin;

  // HP para ser destrutível
  const hp = 5;

  return {
    id: mysteryBoxIdCounter++,
    x,
    y,
    width,
    height: 50,
    hp,
    maxHp: hp,
    passed: false,
  };
}

export function createCoin(x: number, y: number, value: number = 1): Coin {
  return {
    id: coinIdCounter++,
    x,
    y,
    width: 20,
    height: 20,
    value,
    passed: false,
    bounceOffset: Math.random() * Math.PI * 2,
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
    coins: [],
    bullets: [],
    boss: null,
    miniBosses: [],
  };
}
