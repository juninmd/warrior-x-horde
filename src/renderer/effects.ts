
import { Player, Boss } from '../types';

const COLORS = {
  superCannon: ["rgba(255, 0, 0, ", "rgba(255, 255, 0, ", "rgba(255, 0, 0, "]
};

export function drawSuperCannonEffect(ctx: CanvasRenderingContext2D, player: Player): void {
  const beamWidth = 20;
  const beamX = player.x + player.width / 2 - beamWidth / 2;
  const beamHeight = player.y;

  const pulse = Math.sin(Date.now() / 100) * 0.2 + 0.8;

  const gradient = ctx.createLinearGradient(beamX, 0, beamX + beamWidth, 0);
  gradient.addColorStop(0, `${COLORS.superCannon[0]}${0.2 * pulse})`);
  gradient.addColorStop(0.5, `${COLORS.superCannon[1]}${0.4 * pulse})`);
  gradient.addColorStop(1, `${COLORS.superCannon[2]}${0.2 * pulse})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(beamX, 0, beamWidth, beamHeight);

  ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + 0.3 * pulse})`;
  ctx.lineWidth = 2 + 2 * pulse;
  ctx.strokeRect(beamX, 0, beamWidth, beamHeight);
}

export function drawBossHealthBar(ctx: CanvasRenderingContext2D, boss: Boss): void {
  const barWidth = ctx.canvas.width - 40;
  const barHeight = 20;
  const x = 20;
  const y = 20;
  const hpPercent = boss.hp / boss.maxHp;
  const barColor = `rgb(${Math.floor(255 * (1 - hpPercent))}, ${Math.floor(255 * hpPercent)}, 0)`;

  ctx.fillStyle = "black";
  ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

  ctx.fillStyle = barColor;
  ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

  ctx.strokeStyle = "white";
  ctx.strokeRect(x, y, barWidth, barHeight);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText("CHEFE", x + barWidth / 2, y + 15);
}
