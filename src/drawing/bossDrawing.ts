
import { Boss } from '../types';

const COLORS = {
  text: "white",
};

export function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss | null): void {
  if (!boss) return;
  ctx.fillStyle = "darkred";
  ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`HP: ${boss.hp}`, boss.x + boss.width / 2, boss.y - 10);
}
