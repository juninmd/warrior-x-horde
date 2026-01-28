// renderer-utils.ts - Shared rendering helpers
import { COLORS } from './constants';
import { virtualJoystick } from './input';

// --- UI Drawing Helpers ---

export function drawGlassBadge(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text: string, accentColor: string, fontSize: number = 14): void {
  ctx.save();
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
  ctx.font = `bold ${fontSize}px "Segoe UI", Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 - 2);
  ctx.restore();
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
  // Update Alpha for fade in/out
  if (virtualJoystick.active) {
    virtualJoystick.alpha = Math.min(1, virtualJoystick.alpha + 0.15);
  } else {
    virtualJoystick.alpha = Math.max(0, virtualJoystick.alpha - 0.1);
  }

  if (virtualJoystick.alpha <= 0.01) return;

  const { startX, startY, currentX, currentY, maxRadius, alpha } = virtualJoystick;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Base (Outer Ring)
  ctx.beginPath();
  ctx.arc(startX, startY, maxRadius, 0, Math.PI * 2);

  // Gradient fill for base
  const baseGrad = ctx.createRadialGradient(startX, startY, maxRadius * 0.2, startX, startY, maxRadius);
  baseGrad.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
  baseGrad.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
  ctx.fillStyle = baseGrad;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();

  // Stick Position Calculation
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

  // Stick (Knob)
  ctx.beginPath();
  ctx.arc(stickX, stickY, 25, 0, Math.PI * 2);

  // Knob Gradient
  const knobGrad = ctx.createRadialGradient(stickX - 5, stickY - 5, 0, stickX, stickY, 25);
  knobGrad.addColorStop(0, '#FFFFFF');
  knobGrad.addColorStop(1, '#B0BEC5');
  ctx.fillStyle = knobGrad;

  // Knob Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  ctx.fill();

  // Inner detail of Knob
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.beginPath();
  ctx.arc(stickX, stickY, 12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fill();

  ctx.restore();
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
