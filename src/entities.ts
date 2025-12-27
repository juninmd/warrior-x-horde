// entities.ts - Criação de entidades
import { Army, Soldier, EnemyHorde, Gate, Weapon, Boss, Entities } from './types';

let soldierIdCounter = 0;
let hordeIdCounter = 0;
let gateIdCounter = 0;

export function createSoldier(x: number, y: number, color: string): Soldier {
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
    fireRate: 500,
    lastShotTime: 0,
    damage: 1,
  };
}

export function addSoldiersToArmy(army: Army, count: number): void {
  const baseCount = army.soldiers.length;
  for (let i = 0; i < count; i++) {
    const angle = ((baseCount + i) / (baseCount + count)) * Math.PI * 2;
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
  const newCount = Math.floor(currentCount * multiplier) - currentCount;
  addSoldiersToArmy(army, Math.max(0, newCount));
}

export function removeSoldiersFromArmy(army: Army, count: number): void {
  for (let i = 0; i < count && army.soldiers.length > 0; i++) {
    army.soldiers.pop();
  }
}

export function createEnemyHorde(canvasWidth: number, y: number, count: number): EnemyHorde {
  // Calcular limites da estrada com perspectiva
  // A estrada é mais estreita no topo e mais larga embaixo
  const roadTop = 0.08; // 8% da altura = topo da estrada
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

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 15 + Math.floor(i / 6) * 12;
    soldiers.push(createSoldier(
      x + Math.cos(angle) * radius,
      y + Math.sin(angle) * radius * 0.5,
      '#E74C3C'
    ));
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

export function createGate(canvasWidth: number, y: number, side: 'left' | 'right'): Gate {
  const gateWidth = canvasWidth / 2 - 30;
  const roll = Math.random();

  let type: 'add' | 'multiply' | 'subtract' | 'divide' | 'firerate' | 'damage' | 'speed';
  let value: number;
  let color: string;

  if (roll < 0.30) {
    // 30% - Adicionar soldados (valores mais generosos)
    type = 'add';
    value = Math.floor(Math.random() * 10) + 8; // 8-17 soldados
    color = '#2ECC71';
  } else if (roll < 0.50) {
    // 20% - Multiplicar soldados
    type = 'multiply';
    value = 2; // Sempre x2 para ser previsível
    color = '#3498DB';
  } else if (roll < 0.58) {
    // 8% - Buff de firerate
    type = 'firerate';
    value = 2;
    color = '#F39C12';
  } else if (roll < 0.66) {
    // 8% - Buff de dano
    type = 'damage';
    value = 2;
    color = '#E91E63';
  } else if (roll < 0.74) {
    // 8% - Buff de velocidade
    type = 'speed';
    value = 1.3;
    color = '#00BCD4';
  } else if (roll < 0.88) {
    // 14% - Subtrair soldados (valores menores, nunca fatal)
    type = 'subtract';
    value = Math.floor(Math.random() * 4) + 2; // 2-5 soldados apenas
    color = '#E74C3C';
  } else {
    // 12% - Dividir soldados (sempre por 2, nunca pior)
    type = 'divide';
    value = 2; // Sempre divide por 2
    color = '#9B59B6';
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

export function createGatePair(canvasWidth: number, y: number): Gate[] {
  const leftGate = createGate(canvasWidth, y, 'left');
  const rightGate = createGate(canvasWidth, y, 'right');

  // SEMPRE garantir que um gate é bom e outro é ruim
  const goodTypes = ['add', 'multiply', 'firerate', 'damage', 'speed'];
  const badTypes = ['subtract', 'divide'];

  const leftIsGood = goodTypes.includes(leftGate.type);
  const rightIsGood = goodTypes.includes(rightGate.type);

  if (leftIsGood && rightIsGood) {
    // Mudar o direito para ruim (mas com valores baixos)
    rightGate.type = Math.random() > 0.5 ? 'subtract' : 'divide';
    rightGate.value = rightGate.type === 'subtract' ?
      Math.floor(Math.random() * 3) + 2 : // 2-4 apenas
      2; // Sempre divide por 2
    rightGate.color = rightGate.type === 'subtract' ? '#E74C3C' : '#9B59B6';
  } else if (!leftIsGood && !rightIsGood) {
    // Mudar o esquerdo para bom (com valores generosos)
    const buffRoll = Math.random();
    if (buffRoll < 0.5) {
      leftGate.type = 'add';
      leftGate.value = Math.floor(Math.random() * 8) + 10; // 10-17 soldados
      leftGate.color = '#2ECC71';
    } else if (buffRoll < 0.85) {
      leftGate.type = 'multiply';
      leftGate.value = 2;
      leftGate.color = '#3498DB';
    } else {
      leftGate.type = 'firerate';
      leftGate.value = 2;
      leftGate.color = '#F39C12';
    }
  }

  // Garantir que o gate bom tenha valor vantajoso sobre o ruim
  // Se o ruim subtrai X, o bom deve adicionar pelo menos X+5
  if (!leftIsGood && rightIsGood) {
    if (leftGate.type === 'subtract' && rightGate.type === 'add') {
      rightGate.value = Math.max(rightGate.value, leftGate.value + 5);
    }
  } else if (leftIsGood && !rightIsGood) {
    if (rightGate.type === 'subtract' && leftGate.type === 'add') {
      leftGate.value = Math.max(leftGate.value, rightGate.value + 5);
    }
  }

  return [leftGate, rightGate];
}

export function createBoss(canvasWidth: number, level: number): Boss {
  return {
    x: canvasWidth / 2 - 50,
    y: -200,
    width: 100,
    height: 100,
    hp: 50 + level * 30,
    maxHp: 50 + level * 30,
    isActive: true,
    color: '#8B0000',
  };
}

export function createInitialEntities(canvasWidth: number, canvasHeight: number): Entities {
  return {
    playerArmy: createPlayerArmy(canvasWidth, canvasHeight),
    enemyHordes: [],
    gates: [],
    weapons: [],
    bullets: [],
    boss: null,
  };
}
