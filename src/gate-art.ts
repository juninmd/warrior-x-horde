// gate-art.ts - Sci-fi energy portals (the multiplier gates). Painted once per gate into a 2x cache.
import { shadeColor } from './utils';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export const GATE_SS = 2;
export const GATE_PADDING = 40;

export type GateKind = 'add' | 'multiply' | 'subtract' | 'divide' | 'firerate' | 'damage' | 'superwarrior';

export interface GateArt {
  type: GateKind;
  value: number;
  color: string;
  side: 'left' | 'right';
  customText?: string;
}

/** Short caption under the value: tells the player what the gate does. */
export function gateCaption(type: GateKind, custom: boolean): string {
  if (custom) return 'ESCOLHA A CERTA';
  switch (type) {
    case 'add': return 'RECRUTAS';
    case 'multiply': return 'MULTIPLICA';
    case 'subtract': return 'PERDAS';
    case 'divide': return 'REDUZ TROPAS';
    case 'firerate': return 'CADÊNCIA';
    case 'damage': return 'DANO';
    case 'superwarrior': return 'SUPER GUERREIRO';
  }
}

export function isHarmful(type: GateKind, custom?: string, color?: string): boolean {
  if (type === 'subtract' || type === 'divide') return true;
  return Boolean(custom) && color === '#E74C3C';
}

/** Float-noise-free number formatting (1.1700000000000002 -> 1.17). */
export function fmtGateValue(v: number): string {
  return Number.isInteger(v) ? String(v) : String(parseFloat(v.toFixed(2)));
}

export function gateValueText(g: GateArt): string {
  if (g.customText) return g.customText;
  const v = fmtGateValue(g.value);
  switch (g.type) {
    case 'add': return `+${v}`;
    case 'multiply': return `×${v}`;
    case 'subtract': return `-${v}`;
    case 'divide': return `÷${v}`;
    case 'firerate': return g.value < 1 ? `+${Math.round((1 / g.value - 1) * 100)}%` : `-${Math.round((g.value - 1) * 100)}%`; // value scales the shot interval
    case 'damage': return `+${Math.round((g.value - 1) * 100)}%`;
    case 'superwarrior': return `+${v}`;
  }
}

const ICONS: Record<GateKind, string> = { add: '🪖', multiply: '✖️', subtract: '☠️', divide: '➗', firerate: '🔥', damage: '⚔️', superwarrior: '⭐' };
export function gateIcon(type: GateKind, custom?: string): string {
  return custom ? '🧮' : ICONS[type];
}

function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) { try { g.addColorStop(o, c); } catch { /* bad color */ } }
  return g;
}

function rgba(hex: string, a: number): string {
  if (!hex.startsWith('#') || hex.length < 7) return `rgba(255,255,255,${a})`;
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Paints one portal. (x, y) is the top-left of the field; w x h its size.
 * `simple` skips scanlines/glows for low-end devices.
 */
export function paintGate(ctx: Ctx, x: number, y: number, w: number, h: number, g: GateArt, simple: boolean, shadows = true): void {
  const col = g.color;
  const harmful = isHarmful(g.type, g.customText, g.color);
  const light = shadeColor(col, 35);
  const dark = shadeColor(col, -45);

  // floor light pool + shadow
  if (!simple) {
    const pool = ctx.createRadialGradient(x + w / 2, y + h + 8, 4, x + w / 2, y + h + 8, w * 0.7);
    pool.addColorStop(0, rgba(col, 0.45)); pool.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = pool; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 8, w * 0.7, 20, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x + w / 2 + 4, y + h + 12, w / 2 + 6, 12, 0, 0, Math.PI * 2); ctx.fill();

  // energy field
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.clip();
  ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [[0, rgba(col, 0.78)], [0.55, rgba(col, 0.5)], [1, rgba(dark, 0.7)]]);
  ctx.fillRect(x, y, w, h);
  if (!simple) {
    // diagonal energy streaks
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    for (let i = -h; i < w; i += 26) { ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + 14, y + h); ctx.lineTo(x + i + 14 + h * 0.5, y); ctx.lineTo(x + i + h * 0.5, y); ctx.closePath(); ctx.fill(); }
    // scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let yy = y + 2; yy < y + h; yy += 4) ctx.fillRect(x, yy, w, 1);
    // edge glow
    for (const edge of [0, 1]) {
      const ex = edge ? x + w - 18 : x;
      ctx.fillStyle = lin(ctx, ex, 0, ex + 18, 0, edge ? [[0, rgba(light, 0)], [1, rgba(light, 0.65)]] : [[0, rgba(light, 0.65)], [1, rgba(light, 0)]]);
      ctx.fillRect(ex, y, 18, h);
    }
    // top/bottom light
    ctx.fillStyle = lin(ctx, 0, y, 0, y + 16, [[0, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(x, y, w, 16);
  }
  if (harmful) { // hazard stripes along the bottom
    for (let i = -20; i < w; i += 20) { ctx.fillStyle = 'rgba(20,0,0,0.5)'; ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + 10, y + h); ctx.lineTo(x + i + 20, y + h - 9); ctx.lineTo(x + i + 10, y + h - 9); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
  ctx.strokeStyle = rgba(light, 0.95); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.stroke();

  // pylons
  for (const side of [0, 1]) {
    const px = side ? x + w - 4 : x - 14;
    const g2 = lin(ctx, px, 0, px + 18, 0, [[0, '#6b7385'], [0.5, '#c3cad8'], [1, '#444b5a']]);
    ctx.fillStyle = g2; ctx.beginPath(); ctx.roundRect(px, y - 20, 18, h + 40, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(8,10,20,0.75)'; ctx.lineWidth = 2; ctx.stroke();
    // bands
    ctx.fillStyle = harmful ? '#e0503a' : '#2f3544';
    for (const by of [y + 8, y + h - 22]) ctx.fillRect(px + 1, by, 16, 8);
    if (harmful) { ctx.fillStyle = '#ffd34a'; for (let k = 0; k < 4; k++) ctx.fillRect(px + 1 + k * 4, y + 8, 2, 8); }
    // top lamp
    const lamp = ctx.createRadialGradient(px + 9, y - 22, 0, px + 9, y - 22, 16);
    lamp.addColorStop(0, '#fff'); lamp.addColorStop(0.3, light); lamp.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = lamp; ctx.beginPath(); ctx.arc(px + 9, y - 22, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px + 9, y - 22, 3.2, 0, Math.PI * 2); ctx.fill();
    // base plate
    ctx.fillStyle = '#2b303c'; ctx.beginPath(); ctx.roundRect(px - 4, y + h + 14, 26, 8, 3); ctx.fill();
  }

  // top beam with caption plate
  ctx.fillStyle = lin(ctx, 0, y - 18, 0, y - 4, [[0, '#d5dbe8'], [1, '#6a7285']]);
  ctx.beginPath(); ctx.roundRect(x - 6, y - 17, w + 12, 12, 4); ctx.fill(); ctx.strokeStyle = 'rgba(8,10,20,0.75)'; ctx.lineWidth = 1.8; ctx.stroke();
  const cap = gateCaption(g.type, Boolean(g.customText));
  ctx.font = '800 11px Rajdhani, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const pw = Math.min(w - 20, ctx.measureText(cap).width + 22);
  const shiftX = g.side === 'right' ? -18 : 0; // the shop rail covers the right edge: keep content clear of it
  const cx = x + w / 2 + shiftX;
  ctx.fillStyle = harmful ? '#7a1010' : dark; ctx.beginPath(); ctx.roundRect(cx - pw / 2, y - 31, pw, 15, 7); ctx.fill();
  ctx.strokeStyle = rgba(light, 0.9); ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillText(cap, cx, y - 23);

  // content: icon badge + value
  const text = gateValueText(g);
  const iconR = 18;
  const small = Boolean(g.customText) || text.length > 6;
  const fs = small ? 24 : 38;
  ctx.font = `900 ${fs}px Rajdhani, Arial, sans-serif`;
  const tw = ctx.measureText(text).width;
  const total = iconR * 2 + 10 + tw;
  const left = cx - total / 2;
  // badge
  const bx = left + iconR; const by = y + h / 2;
  ctx.fillStyle = 'rgba(8,10,20,0.55)'; ctx.beginPath(); ctx.arc(bx, by, iconR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(light, 0.95); ctx.lineWidth = 2; ctx.stroke();
  ctx.font = '20px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(gateIcon(g.type, g.customText), bx, by + 1);
  // value with outline + glow
  ctx.font = `900 ${fs}px Rajdhani, Arial, sans-serif`; ctx.textAlign = 'left';
  const tx = left + iconR * 2 + 10;
  if (!simple && shadows) { ctx.shadowColor = rgba(light, 0.9); ctx.shadowBlur = 10; }
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(8,10,20,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(text, tx, by + 1);
  ctx.fillStyle = '#fff'; ctx.fillText(text, tx, by + 1);
  ctx.shadowBlur = 0;
}
