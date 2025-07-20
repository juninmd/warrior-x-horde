
import { Enemy } from '../types';

const COLORS = {
  text: "white",
  normal: "gray",
  fast: "red",
  spitter: "green",
  tank: "darkgray",
};

export function drawEnemies(ctx: CanvasRenderingContext2D, enemies: Enemy[]): void {
  enemies.forEach(enemy => {
    switch (enemy.zombieType) {
        case 'normal':
            ctx.fillStyle = COLORS.normal;
            break;
        case 'fast':
            ctx.fillStyle = COLORS.fast;
            break;
        case 'spitter':
            ctx.fillStyle = COLORS.spitter;
            break;
        case 'tank':
            ctx.fillStyle = COLORS.tank;
            break;
    }
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`HP: ${enemy.hp}`, enemy.x + 5, enemy.y + 20);
  });
}
