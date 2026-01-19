// renderer-utils.ts - Shared rendering helpers
import { shadeColor } from './utils';
import { COLORS } from './constants';
import { virtualJoystick } from './input';

// --- UI Drawing Helpers ---

export function drawGlassBadge(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text: string, accentColor: string): void {
  // Fundo Glass
  ctx.fillStyle = 'rgba(10, 10, 20, 0.7)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  // ctx.backdropFilter = 'blur(4px)'; // Not widely supported in Canvas yet

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.stroke();

  // Accent Line (Bottom)
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.roundRect(x + 10, y + h - 4, w - 20, 2, 1);
  ctx.fill();

  // Texto
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 14px "Segoe UI", Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 - 2);
}

// --- Shape Drawing Helpers ---

export function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
  let rot = Math.PI / 2 * 3;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

// --- Input Visuals ---

export function drawJoystick(ctx: CanvasRenderingContext2D): void {
  if (!virtualJoystick.active) return;

  const { startX, startY, currentX, currentY, maxRadius } = virtualJoystick;

  // Base
  ctx.beginPath();
  ctx.arc(startX, startY, maxRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  // Stick
  const dx = currentX - startX;
  const dy = currentY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  let stickX = currentX;
  let stickY = currentY;

  if (distance > maxRadius) {
    const angle = Math.atan2(dy, dx);
    stickX = startX + Math.cos(angle) * maxRadius;
    stickY = startY + Math.sin(angle) * maxRadius;
  }

  ctx.beginPath();
  ctx.arc(stickX, stickY, 20, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fill();
}

// --- Game Specific Helpers ---

export function getComboColor(combo: number): string {
  if (combo >= 15) return COLORS.PLAYER.LASER; // Cyan (Legendary)
  if (combo >= 10) return '#FF00FF'; // Magenta (Epic)
  if (combo >= 7) return COLORS.UI.GOLD;  // Gold
  if (combo >= 5) return COLORS.EFFECTS.EXPLOSION;  // Red
  if (combo >= 3) return COLORS.UI.INFO;  // Orangeish/Info
  return COLORS.UI.SUCCESS; // Green
}
