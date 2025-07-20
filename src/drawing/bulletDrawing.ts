
import { Bullet } from '../types';

const COLORS = {
  bullet: "yellow",
  enemyBullet: "orange",
};

export function drawBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[]): void {
  bullets.forEach(bullet => {
    ctx.fillStyle = bullet.isEnemy ? COLORS.enemyBullet : COLORS.bullet;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
}
