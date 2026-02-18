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

export function drawJoystick(ctx: CanvasRenderingContext2D): void {
  // Update Alpha for fade in/out
  if (virtualJoystick.active) {
    virtualJoystick.alpha = Math.min(0.8, virtualJoystick.alpha + 0.15); // Higher max alpha
  } else {
    virtualJoystick.alpha = Math.max(0, virtualJoystick.alpha - 0.1);
  }

  if (virtualJoystick.alpha <= 0.01) return;

  const { startX, startY, currentX, currentY, maxRadius } = virtualJoystick;
  const alpha = virtualJoystick.alpha;

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
  const time = Date.now();
  const pulse = Math.sin(time / 150) * 3;
  const rotate = (time / 1000) % (Math.PI * 2);

  // Outer Ring (Glowing Base)
  ctx.beginPath();
  ctx.arc(startX, startY, maxRadius + 5 + pulse, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(0, 255, 255, ${0.4 * alpha})`; // Cyan fade
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner Ring (Static Base)
  ctx.beginPath();
  ctx.arc(startX, startY, maxRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 255, 255, 0.05)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Rotating Segments (Tech feel)
  ctx.save();
  ctx.translate(startX, startY);
  ctx.rotate(rotate);
  ctx.beginPath();
  ctx.arc(0, 0, maxRadius - 5, 0, Math.PI / 2);
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, maxRadius - 5, Math.PI, Math.PI * 1.5);
  ctx.stroke();
  ctx.restore();

  // Connection Line
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(stickX, stickY);
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]); // Tech-style dash
  ctx.stroke();
  ctx.setLineDash([]); // Reset dash

  // Thumb Stick (Glowing Circle)
  ctx.beginPath();
  ctx.arc(stickX, stickY, 15, 0, Math.PI * 2);
  ctx.shadowColor = '#00FFFF';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Ring around Thumb Stick
  ctx.beginPath();
  ctx.arc(stickX, stickY, 18, 0, Math.PI * 2);
  ctx.strokeStyle = '#00FFFF';
  ctx.lineWidth = 2;
  ctx.stroke();

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
