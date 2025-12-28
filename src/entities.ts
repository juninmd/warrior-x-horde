// entities.ts - Criação de entidades
import { Army, Soldier, EnemyHorde, Gate, Boss, Entities, MiniBoss, MAX_HEROES, MAX_ENEMIES } from './types';

let soldierIdCounter = 0;
let hordeIdCounter = 0;
let gateIdCounter = 0;
let miniBossIdCounter = 0;

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
    isSuper: false,
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
  };
}

export function createPlayerArmy(canvasWidth: number, canvasHeight: number): Army {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight - 80; // Mais para baixo - mais tempo de reação
  const soldiers: Soldier[] = [];

  // Começa com 5 soldados para ter uma base decente
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const radius = 20;
    soldiers.push(createSoldier(
      centerX + Math.cos(angle) * radius,
      centerY + Math.sin(angle) * radius * 0.5,
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
    const angle = ((baseCount + i) / (baseCount + actualCount)) * Math.PI * 2;
    const radius = 20 + Math.floor((baseCount + i) / 8) * 15;
    army.soldiers.push(createSoldier(
      army.centerX + Math.cos(angle) * radius,
      army.centerY + Math.sin(angle) * radius * 0.5,
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
  const baseCount = army.soldiers.length;
  // Limitar ao máximo de heróis
  const maxToAdd = Math.max(0, MAX_HEROES - baseCount);
  const actualCount = Math.min(count, maxToAdd);

  for (let i = 0; i < actualCount; i++) {
    const angle = ((baseCount + i) / (baseCount + actualCount)) * Math.PI * 2;
    const radius = 20 + Math.floor((baseCount + i) / 8) * 15;
    army.soldiers.push(createSuperSoldier(
      army.centerX + Math.cos(angle) * radius,
      army.centerY + Math.sin(angle) * radius * 0.5
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

export function createGate(canvasWidth: number, y: number, side: 'left' | 'right', level: number = 1, currentHeroCount: number = 0): Gate {
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
    // MUITO mais chances de aumentar o exército e super soldados!
    // Add com valores incrementais baseados no level - AUMENTADOS
    const baseAdd = 8 + Math.floor(level / 2); // 8 no level 1, aumenta com level
    const maxAdd = baseAdd + 12; // Até +12 extra

    if (roll < 0.55) {
      // 55% - Adicionar soldados (valores maiores!)
      type = 'add';
      value = Math.floor(Math.random() * (maxAdd - baseAdd + 1)) + baseAdd; // 8-20 no level 1
      color = '#2ECC71';
    } else if (roll < 0.70) {
      // 15% - Multiplicar soldados
      type = 'multiply';
      value = 1.8; // x1.8 para crescimento mais forte
      color = '#3498DB';
    } else if (roll < 0.78) {
      // 8% - Buff de firerate (diminui aos pouquinhos)
      type = 'firerate';
      value = 0.90; // Multiplica por 0.90 (~10% mais rápido por gate)
      color = '#F39C12';
    } else if (roll < 0.84) {
      // 6% - Buff de dano FORTE
      type = 'damage';
      value = 2; // Dobra o dano!
      color = '#9900ffff';
    } else if (roll < 0.94) {
      // 10% - Super Guerreiro (adiciona 2-4 heróis especiais)
      type = 'superwarrior';
      value = 2 + Math.floor(Math.random() * 3); // 2-4 super guerreiros
      color = '#FFD700'; // Dourado
    } else if (roll < 0.97) {
      // 3% - Subtrair soldados (valores baixos)
      type = 'subtract';
      value = Math.floor(Math.random() * 2) + 1; // 1-2 soldados apenas
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

export function createGatePair(canvasWidth: number, y: number, level: number = 1, currentHeroCount: number = 0): Gate[] {
  const leftGate = createGate(canvasWidth, y, 'left', level, currentHeroCount);
  const rightGate = createGate(canvasWidth, y, 'right', level, currentHeroCount);

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

export function createInitialEntities(canvasWidth: number, canvasHeight: number): Entities {
  // Criar hordas iniciais com mínimo de 15
  const initialHordes = [];

  // Spawnar 2 hordas iniciais
  const hordePositions = [-80, -250];
  const enemyCounts = [15, 15]; // Mínimo 15 inimigos

  for (let i = 0; i < hordePositions.length; i++) {
    initialHordes.push(createEnemyHorde(canvasWidth, hordePositions[i], enemyCounts[i], 1));
  }

  return {
    playerArmy: createPlayerArmy(canvasWidth, canvasHeight),
    enemyHordes: initialHordes,
    gates: [],
    weapons: [],
    bullets: [],
    boss: null,
    miniBosses: [],
  };
}
