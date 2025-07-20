// @ts-check
// entities/enemy.ts - Funções de criação para inimigos
import { canvas } from '../game';
import { Enemy } from '../types';

const ZOMBIE_WIDTH = 50;
const ZOMBIE_HEIGHT = 50;

export function createEnemy(type: string, wave: number): Enemy {
  const baseSpeed = 0.1 + (wave / 5) * 0.05; // Base speed increases with wave
  let enemy: Enemy;

  switch (type) {
    case 'normal':
      enemy = {
        zombieType: 'normal',
        x: Math.random() * ((canvas as HTMLCanvasElement)?.width - ZOMBIE_WIDTH || 0),
        y: -Math.random() * 100 - ZOMBIE_HEIGHT,
        width: ZOMBIE_WIDTH,
        height: ZOMBIE_HEIGHT,
        speed: baseSpeed,
        hp: 1 + Math.floor(wave / 10), // HP increases every 10 waves
        damageEffect: 0,
        frameIndex: 0,
        frameTimer: 0,
        frameInterval: 120,
        isZombie: true,
        sprintCooldown: 0,
        sprintDuration: 0,
        baseSpeed: baseSpeed,
        attackType: 'melee',
        attackDamage: 1,
        isDeadAndAnimating: false,
      };
      break;
    case 'fast':
      enemy = {
        zombieType: 'fast',
        x: Math.random() * ((canvas as HTMLCanvasElement)?.width - ZOMBIE_WIDTH || 0),
        y: -Math.random() * 100 - ZOMBIE_HEIGHT,
        width: ZOMBIE_WIDTH * 0.8, // Smaller
        height: ZOMBIE_HEIGHT * 0.8,
        speed: baseSpeed * 1.5, // Faster
        hp: 0.5 + Math.floor(wave / 20), // Less HP, increases every 20 waves
        damageEffect: 0,
        frameIndex: 0,
        frameTimer: 0,
        frameInterval: 100, // Faster animation
        isZombie: true,
        sprintCooldown: 0,
        sprintDuration: 0,
        baseSpeed: baseSpeed * 1.5,
        attackType: 'melee',
        attackDamage: 1,
        isDeadAndAnimating: false,
      };
      break;
    case 'tank':
      enemy = {
        zombieType: 'tank',
        x: Math.random() * ((canvas as HTMLCanvasElement)?.width - ZOMBIE_WIDTH * 1.2 || 0),
        y: -Math.random() * 100 - ZOMBIE_HEIGHT * 1.2,
        width: ZOMBIE_WIDTH * 1.2, // Larger
        height: ZOMBIE_HEIGHT * 1.2,
        speed: baseSpeed * 0.7, // Slower
        hp: 3 + Math.floor(wave / 5), // More HP, increases every 5 waves
        damageEffect: 0,
        frameIndex: 0,
        frameTimer: 0,
        frameInterval: 150, // Slower animation
        isZombie: true,
        sprintCooldown: 0,
        sprintDuration: 0,
        baseSpeed: baseSpeed * 0.7,
        attackType: 'melee',
        attackDamage: 2, // More damage
        isDeadAndAnimating: false,
      };
      break;
    case 'spitter':
      enemy = {
        zombieType: 'spitter',
        x: Math.random() * ((canvas as HTMLCanvasElement)?.width - ZOMBIE_WIDTH || 0),
        y: -Math.random() * 100 - ZOMBIE_HEIGHT,
        width: ZOMBIE_WIDTH,
        height: ZOMBIE_HEIGHT,
        speed: baseSpeed * 0.9, // Slightly slower
        hp: 1 + Math.floor(wave / 15), // Moderate HP
        damageEffect: 0,
        frameIndex: 0,
        frameTimer: 0,
        frameInterval: 120,
        isZombie: true,
        sprintCooldown: 0,
        sprintDuration: 0,
        baseSpeed: baseSpeed * 0.9,
        attackType: 'ranged',
        attackDamage: 1,
        bulletSpeed: 3,
        isDeadAndAnimating: false,
      };
      break;
    default:
      // Default to normal zombie if type is unknown
      enemy = {
        zombieType: 'normal',
        x: Math.random() * ((canvas as HTMLCanvasElement)?.width - ZOMBIE_WIDTH || 0),
        y: -Math.random() * 100 - ZOMBIE_HEIGHT,
        width: ZOMBIE_WIDTH,
        height: ZOMBIE_HEIGHT,
        speed: baseSpeed,
        hp: 1 + Math.floor(wave / 10),
        damageEffect: 0,
        frameIndex: 0,
        frameTimer: 0,
        frameInterval: 120,
        isZombie: true,
        sprintCooldown: 0,
        sprintDuration: 0,
        baseSpeed: baseSpeed,
        attackType: 'melee',
        attackDamage: 1,
        isDeadAndAnimating: false,
      };
      break;
  }
  return enemy;
}
