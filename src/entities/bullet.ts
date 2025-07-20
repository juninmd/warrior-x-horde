// @ts-check
// entities/bullet.ts - Função de criação para balas
import { Player, Boss, Bullet } from '../types';

const BULLET_WIDTH = 5;
const BULLET_HEIGHT = 10;

export function createBullet(entity: Player | Boss, isEnemy = false): Bullet {
  return {
    type: 'bullet',
    isEnemy: isEnemy,
    x: entity.x + entity.width / 2 - BULLET_WIDTH / 2,
    y: isEnemy ? entity.y + entity.height : entity.y,
    width: BULLET_WIDTH,
    height: BULLET_HEIGHT,
    speed: entity.bulletSpeed || 2,
    damage: entity.bulletDamage || (isEnemy ? entity.bulletDamage || 5 : 1)
  };
}
