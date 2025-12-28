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
  };
}

export function createPlayerArmy(canvasWidth: number, canvasHeight: number): Army {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight - 80; // Mais para baixo - mais tempo de reação
  const soldiers: Soldier[] = [];

  // Começa com 1 soldado para ter margem
  for (let i = 0; i < 1; i++) {
    const angle = (i / 1) * Math.PI * 2;
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
    fireRate: 200, // Disparo mais frequente (era 500ms)
    lastShotTime: 0,
    damage: 1,
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

  // HP dos inimigos aumenta com o level (+50% por level)
  const enemyHp = 1 + Math.floor((level - 1) * 0.5);

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

export function createGate(canvasWidth: number, y: number, side: 'left' | 'right', level: number = 1): Gate {
  const gateWidth = canvasWidth / 2 - 30;
  const roll = Math.random();

  let type: 'add' | 'multiply' | 'subtract' | 'divide' | 'firerate' | 'damage' | 'speed';
  let value: number;
  let color: string;

  // Valores conservadores - evitar multiplicações explosivas
  // Add: 2-5 soldados (independente do level para manter balanceado)
  const maxAdd = 5;

  if (roll < 0.35) {
    // 35% - Adicionar soldados (valores fixos e baixos)
    type = 'add';
    value = Math.floor(Math.random() * maxAdd) + 2; // 2-6 soldados
    color = '#2ECC71';
  } else if (roll < 0.50) {
    // 15% - Multiplicar soldados (apenas x1.5, nunca x2)
    type = 'multiply';
    value = 1.5; // Sempre x1.5 para evitar explosão
    color = '#3498DB';
  } else if (roll < 0.58) {
    // 8% - Buff de firerate
    type = 'firerate';
    value = 1.3;
    color = '#F39C12';
  } else if (roll < 0.66) {
    // 8% - Buff de dano
    type = 'damage';
    value = 1.3;
    color = '#9900ffff';
  } else if (roll < 0.74) {
    // 8% - Buff de velocidade
    type = 'speed';
    value = 1.15;
    color = '#00BCD4';
  } else if (roll < 0.88) {
    // 14% - Subtrair soldados (valores menores, nunca fatal)
    type = 'subtract';
    value = Math.floor(Math.random() * 3) + 1; // 1-3 soldados apenas
    color = '#ff1900ff';
  } else {
    // 12% - Dividir soldados (sempre por 1.5, não por 2)
    type = 'divide';
    value = 1.5; // Divide por 1.5
    color = '#ff0000ff';
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

export function createGatePair(canvasWidth: number, y: number, level: number = 1): Gate[] {
  const leftGate = createGate(canvasWidth, y, 'left', level);
  const rightGate = createGate(canvasWidth, y, 'right', level);

  // SEMPRE garantir que um gate é bom e outro é ruim para forçar decisão estratégica
  const goodTypes = ['add', 'multiply', 'firerate', 'damage', 'speed'];

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
    if (buffRoll < 0.5) {
      leftGate.type = 'add';
      leftGate.value = Math.floor(Math.random() * 4) + 2; // 2-5
      leftGate.color = '#2ECC71';
    } else if (buffRoll < 0.75) {
      leftGate.type = 'multiply';
      leftGate.value = 1.5; // Sempre x1.5
      leftGate.color = '#3498DB';
    } else {
      leftGate.type = 'firerate';
      leftGate.value = 1.3;
      leftGate.color = '#F39C12';
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
  // Vida do boss aumentada em 10x
  const bossHp = (50 + level * 30) * 10;
  return {
    x: canvasWidth / 2 - 50,
    y: -200,
    width: 100,
    height: 100,
    hp: bossHp,
    maxHp: bossHp,
    isActive: true,
    color: '#8B0000',
  };
}

export function createMiniBoss(canvasWidth: number, y: number, level: number): MiniBoss {
  // Vida do mini-boss aumentada em 5x
  const miniBossHp = (20 + level * 15) * 5;
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
