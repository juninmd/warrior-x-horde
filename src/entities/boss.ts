// @ts-check
// entities/boss.ts - Função de criação para o chefe
import { canvas } from '../game';
import { Boss } from '../types';

export function createBoss(wave: number): Boss {
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
    
    lastShot: 0,
    bulletDelay: 1000,
    damage: 10,
    bulletSpeed: 5,
    bulletDamage: 10,
    frameIndex: 0,
    frameTimer: 0,
    frameInterval: 120,
  };
}
