// @ts-check
// entities/enemy.ts - Funções de criação para inimigos
import { canvas } from '../game';
import { Enemy } from '../types';

const zombieSpeedBase = 0.1;

export function createEnemy(wave: number): Enemy {
  return {
    x: Math.random() * ((canvas as HTMLCanvasElement)?.width - 50 || 0),
    y: -Math.random() * 100 - 50,
    width: 50,
    height: 50,
    speed: zombieSpeedBase + (wave / 5) * zombieSpeedBase,
    hp: wave,
    damageEffect: 0,
    frameIndex: 0,
    frameTimer: 0,
    frameInterval: 120,
    zombieType: 'normal',
    isZombie: true,
    sprintCooldown: 0,
    sprintDuration: 0,
    baseSpeed: 2
  };
}
