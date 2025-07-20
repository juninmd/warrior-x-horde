// @ts-check
// entities/player.ts - Funções de criação para o jogador e reforços
import { canvas } from '../game';
import { Player } from '../types';

const PLAYER_WIDTH = 64;
const PLAYER_HEIGHT = 64;

export function createPlayer(): Player {
  return {
    offsetX: 0,
    offsetY: 0,
    type: 'ally',
    isMainPlayer: true,
    x: (canvas as HTMLCanvasElement)?.width / 2 - PLAYER_WIDTH / 2 || 0,
    y: (canvas as HTMLCanvasElement)?.height - 100 || 0,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    speed: 2,
    bulletSpeed: 4,
    bulletDamage: 1,
    fireRate: 600,
    lastShotTime: 0,
    hp: 10,
    shield: 0,
    frameIndex: 0,
    frameTimer: 0,
    frameInterval: 120,
    damageEffect: 0,
    animationState: 'idle',
  };
}

export function createReinforcement(allyCount: number, mainPlayer: Player): Player {
  return {
    type: 'ally',
    isMainPlayer: false,
    offsetX: 0,
    offsetY: 0,
    x: mainPlayer.x,
    y: mainPlayer.y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    speed: mainPlayer.speed,
    bulletSpeed: mainPlayer.bulletSpeed,
    bulletDamage: mainPlayer.bulletDamage,
    fireRate: mainPlayer.fireRate,
    lastShotTime: 0,
    hp: 5, // Reforços são mais duráveis
    shield: 0,
    frameIndex: 0,
    frameTimer: 0,
    frameInterval: 120,
    damageEffect: 0,
    animationState: 'idle',
  };
}
