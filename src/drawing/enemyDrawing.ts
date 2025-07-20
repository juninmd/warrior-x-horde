
import { zombieSprites } from '../sprites.js';
import { Enemy } from '../types';

const COLORS = {
  text: "white",
};

export function drawEnemies(ctx: CanvasRenderingContext2D, enemies: Enemy[]): void {
  enemies.forEach(enemy => {
    const sprite = zombieSprites[enemy.zombieType as keyof typeof zombieSprites] || zombieSprites.normal;
    ctx.drawImage(sprite, enemy.frameIndex * enemy.width, 0, enemy.width, enemy.height, enemy.x, enemy.y, enemy.width, enemy.height);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`HP: ${enemy.hp}`, enemy.x + 5, enemy.y + 20);
  });
}
