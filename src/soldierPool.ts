import { ObjectPool } from './pool';
import { Soldier } from './types';

const defaultSoldierFactory = (): Soldier => ({
  id: -1, // Will be overwritten
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  color: '#FFF',
  size: 16,
  isAlive: true,
  animOffset: Math.random() * Math.PI * 2,
  hp: 1,
  maxHp: 1,
  type: 'normal',
  hitTimer: 0,
  isSuper: false,
  personalFireRate: undefined
});

const soldierReset = (soldier: Soldier): void => {
  soldier.isAlive = true;
  soldier.hitTimer = 0;
  soldier.isSuper = false;
  soldier.personalFireRate = undefined;
  soldier.type = 'normal';
  soldier.animOffset = Math.random() * Math.PI * 2;
  // x, y, hp, color, id will be overwritten by creation logic
};

export const soldierPool = new ObjectPool<Soldier>(defaultSoldierFactory, soldierReset);
