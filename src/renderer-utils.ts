// renderer-utils.ts - Shared rendering helpers
import { COLORS, FONT_FAMILY } from './constants';
import { virtualJoystick } from './input-state';

// --- UI Drawing Helpers ---

export function drawGlassBadge(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text: string, accentColor: string, fontSize: number = 14): void {
  ctx.save();
  // Fundo Glass
  ctx.fillStyle = 'rgba(10, 10, 20, 0.7)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;

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
  ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`;
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

function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawJoystick(ctx: CanvasRenderingContext2D): void {
  // Update Alpha for fade in/out
  if (virtualJoystick.active) {
    virtualJoystick.alpha = Math.min(0.8, virtualJoystick.alpha + 0.15); // Higher max alpha
  } else {
    virtualJoystick.alpha = Math.max(0, virtualJoystick.alpha - 0.1);
  }

  if (virtualJoystick.alpha <= 0.01) return;

  const { startX, startY, currentX, currentY, maxRadius, alpha } = virtualJoystick;

  ctx.save();
  ctx.globalAlpha = alpha;

  const dx = currentX - startX;
  const dy = currentY - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  let stickX = currentX;
  let stickY = currentY;

  // Clamp stick
  if (distance > maxRadius) {
    const angle = Math.atan2(dy, dx);
    stickX = startX + Math.cos(angle) * maxRadius;
    stickY = startY + Math.sin(angle) * maxRadius;
  }

  // Cyber Ring Animation (Pulse)
  const pulse = Math.sin(Date.now() / 150) * 3;

  // Outer Hexagon (Base)
  ctx.strokeStyle = `rgba(0, 255, 255, ${0.4 * alpha})`; // Cyan fade
  ctx.lineWidth = 2;
  drawHexagon(ctx, startX, startY, maxRadius + 5 + pulse);
  ctx.stroke();

  // Inner Hexagon (Filled Base)
  ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
  drawHexagon(ctx, startX, startY, maxRadius);
  ctx.fill();
  ctx.strokeStyle = '#00FFFF';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Connection Line
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(stickX, stickY);
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]); // Tech-style dash
  ctx.stroke();
  ctx.setLineDash([]);

  // Thumb Stick (Diamond Shape)
  const knobSize = 15;
  ctx.translate(stickX, stickY);
  ctx.rotate(Math.PI / 4); // Rotate square to make diamond

  ctx.shadowColor = '#00FFFF';
  ctx.shadowBlur = 15;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-knobSize/2, -knobSize/2, knobSize, knobSize);

  ctx.strokeStyle = '#00FFFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(-knobSize/2, -knobSize/2, knobSize, knobSize);

  ctx.shadowBlur = 0;
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
