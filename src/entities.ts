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
  const centerY = canvasHeight - 150;
  const soldiers: Soldier[] = [];
  
  // Começa com 5 soldados
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
  const x = canvasWidth / 2 + (Math.random() - 0.5) * 100;
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
  const isGood = Math.random() > 0.3;
  
  let type: 'add' | 'multiply' | 'subtract' | 'divide';
  let value: number;
  let color: string;
  
  if (isGood) {
    if (Math.random() > 0.5) {
      type = 'add';
      value = Math.floor(Math.random() * 20) + 5;
      color = '#2ECC71';
    } else {
      type = 'multiply';
      value = Math.floor(Math.random() * 2) + 2;
      color = '#3498DB';
    }
  } else {
    if (Math.random() > 0.5) {
      type = 'subtract';
      value = Math.floor(Math.random() * 10) + 5;
      color = '#E74C3C';
    } else {
      type = 'divide';
      value = Math.floor(Math.random() * 2) + 2;
      color = '#9B59B6';
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

export function createGatePair(canvasWidth: number, y: number): Gate[] {
  const leftGate = createGate(canvasWidth, y, 'left');
  const rightGate = createGate(canvasWidth, y, 'right');
  
  // Garantir que um é bom e outro é ruim
  if ((leftGate.type === 'add' || leftGate.type === 'multiply') && 
      (rightGate.type === 'add' || rightGate.type === 'multiply')) {
    rightGate.type = Math.random() > 0.5 ? 'subtract' : 'divide';
    rightGate.value = rightGate.type === 'subtract' ? 
      Math.floor(Math.random() * 10) + 5 : 
      Math.floor(Math.random() * 2) + 2;
    rightGate.color = rightGate.type === 'subtract' ? '#E74C3C' : '#9B59B6';
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
