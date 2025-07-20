
import { Barrel } from '../types';

const COLORS = {
  text: "white",
  buff: "green",
  health: "red",
  nerf: "purple",
  reinforcement: "orange",
};

export function drawBarrels(ctx: CanvasRenderingContext2D, barrels: Barrel[]): void {
  barrels.forEach(barrel => {
    ctx.fillStyle = COLORS.buff;
    switch (barrel.barrelType) {
      case 'health':
        ctx.fillStyle = COLORS.health;
        break;
      case 'reinforcement':
        ctx.fillStyle = COLORS.reinforcement;
        break;
    }
    ctx.fillRect(barrel.x, barrel.y, barrel.width, barrel.height);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`HP: ${barrel.hp}`, barrel.x + barrel.width / 2, barrel.y + 40);
  });
}
