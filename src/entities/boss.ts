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
    lastShot: Date.now(),
    bulletDelay: Math.max(1000 - wave * 100, 100),
    damage: 5,
    bulletSpeed: 2,
    bulletDamage: 5,
    frameIndex: 0,
    frameTimer: 0,
    frameInterval: 120,
  };
}
