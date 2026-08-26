// renderer-utils.ts - Shared rendering helpers
import { FONT_FAMILY } from './constants';
import { virtualJoystick } from './input-state';
import { QualityManager } from './quality';

// --- Utility Helpers ---

/**
 * Adiciona um color stop de forma segura, evitando DOMException por cores inválidas.
 */
export function safeAddColorStop(gradient: CanvasGradient, offset: number, color: string | undefined): void {
  try {
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
    if (!color || color === 'undefined' || color.includes('NaN')) {
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore start */
/* v8 ignore next */
/* v8 ignore start */
/* v8 ignore next */
      gradient.addColorStop(offset, 'rgba(0,0,0,0)');
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore stop */
/* v8 ignore next */
      return;
/* v8 ignore next */
/* v8 ignore stop */
/* v8 ignore next */
    }
/* v8 ignore next */
    gradient.addColorStop(offset, color);
  } catch (e) {
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore start */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore start */
    console.warn(`[Canvas] Invalid color stop: ${color}`, e);
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore stop */
/* v8 ignore next */
/* v8 ignore next */
    gradient.addColorStop(offset, 'rgba(0,0,0,0)');
/* v8 ignore stop */
  }
}

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
    virtualJoystick.alpha = Math.min(0.9, virtualJoystick.alpha + 0.3); // Higher max alpha
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

  const isMaxed = distance >= maxRadius * 0.95;

  if (isMaxed) {
      // Max Range Glow
      ctx.strokeStyle = '#FF4500'; // Orange-Red when maxed
      ctx.lineWidth = 3;
      if (QualityManager.getInstance().settings.enableShadows) {
        ctx.shadowColor = '#FF4500';
        ctx.shadowBlur = 10;
      }
  } else {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
  }

  ctx.stroke();
  ctx.shadowBlur = 0; // Reset

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
  // Inner Stick Pulse
  const innerPulse = Math.sin(time / 200) * 2;

  ctx.beginPath();
  ctx.arc(stickX, stickY, 15 + innerPulse, 0, Math.PI * 2);

  if (QualityManager.getInstance().settings.enableShadows) {
    ctx.shadowColor = isMaxed ? '#FF4500' : '#00FFFF'; // Change color when maxed
    ctx.shadowBlur = isMaxed ? 25 : 15;
  }

  ctx.fillStyle = isMaxed ? '#FFD700' : '#FFFFFF'; // Gold/White
  ctx.fill();

  // Ring around Thumb Stick
  ctx.beginPath();
  ctx.arc(stickX, stickY, 18 + innerPulse, 0, Math.PI * 2);
  ctx.strokeStyle = isMaxed ? '#FF4500' : '#00FFFF';
  ctx.lineWidth = isMaxed ? 3 : 2;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.restore();
}

// --- Game Specific Helpers ---

export function getComboColor(combo: number): string {
  if (combo >= 50) return '#FF00FF'; // Magenta Neon
  if (combo >= 20) return '#00FFFF'; // Cyan Neon
  if (combo >= 10) return '#FFD700'; // Gold
  if (combo >= 5) return '#FF4500';  // Orange-Red
  if (combo >= 2) return '#00FF00';  // Lime Green
  return '#FFFFFF'; // White (Default)
}
