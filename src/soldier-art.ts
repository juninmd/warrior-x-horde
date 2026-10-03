// soldier-art.ts - High-detail procedural character art (soldiers + zombie archetypes).
// Everything is drawn once into a sprite cache at SPRITE_SS x resolution, so the cost is paid only on cache miss.
import { shadeColor } from './utils';
import type { Soldier } from './types';
import { HERO_SKINS } from './skins';
import type { SkinStyle } from './skins';

/** Supersampling factor of cached character sprites (sprite is displayed at 1/SPRITE_SS). */
export const SPRITE_SS = 2;

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface PaintOpts {
  type: Soldier['type'];
  color: string;
  isSuper: boolean;
  flash: boolean;
  /** Fewer details (low-end devices). */
  simple: boolean;
}

const ENEMY_COLORS = { tank: '#8E2A2A', runner: '#FF9A3D', spitter: '#8BD02A' } as const;

export function enemyKindFromColor(color: string): 'tank' | 'runner' | 'spitter' | null {
  if (color === ENEMY_COLORS.tank) return 'tank';
  if (color === ENEMY_COLORS.runner) return 'runner';
  if (color === ENEMY_COLORS.spitter) return 'spitter';
  return null;
}

/** Enemy sprites use the zombie base colors or one of the archetype colors; everything else is the player side. */
export function isPlayerColor(color: string, type: Soldier['type']): boolean {
  if (type !== 'normal') return true;
  if (enemyKindFromColor(color)) return false;
  return color !== '#E74C3C' && color !== '#C0392B';
}

function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) {
    try { g.addColorStop(o, c); } catch { /* invalid color string */ }
  }
  return g;
}

function rad(ctx: Ctx, x: number, y: number, r0: number, r1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c] of stops) {
    try { g.addColorStop(o, c); } catch { /* invalid color string */ }
  }
  return g;
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Entry point. (cx, cy) is the sprite anchor; s is the soldier size (16 = standard). */
export function paintCharacter(ctx: Ctx, cx: number, cy: number, s: number, o: PaintOpts): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (isPlayerColor(o.color, o.type)) paintPlayer(ctx, s, o);
  else paintZombie(ctx, s, o);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// PLAYER
// ---------------------------------------------------------------------------

function paintPlayer(ctx: Ctx, s: number, o: PaintOpts): void {
  const F = o.flash;
  const W = (c: string | CanvasGradient): string | CanvasGradient => (F ? '#FFFFFF' : c);
  const base = o.isSuper ? '#E8B923' : o.color;
  const hi = shadeColor(base, 28);
  const mid = base;
  const lo = shadeColor(base, -30);
  const deep = shadeColor(base, -55);
  const ol = F ? '#FFFFFF' : 'rgba(8, 10, 20, 0.55)'; // outline
  const lw = Math.max(0.8, s * 0.055);
  const detail = !F && !o.simple;

  // Ground shadow
  if (!F) {
    ctx.fillStyle = rad(ctx, 0, s * 0.96, 0, s * 0.8, [[0, 'rgba(0,0,0,0.42)'], [1, 'rgba(0,0,0,0)']]);
    ctx.beginPath(); ctx.ellipse(0, s * 0.96, s * 0.8, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Super: cape behind everything
  if (o.isSuper) {
    ctx.fillStyle = W(lin(ctx, 0, -s * 0.3, 0, s * 0.9, [[0, '#C0392B'], [1, '#7B1E15']]));
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, -s * 0.25);
    ctx.quadraticCurveTo(-s * 0.85, s * 0.4, -s * 0.6, s * 0.92);
    ctx.lineTo(s * 0.6, s * 0.92);
    ctx.quadraticCurveTo(s * 0.85, s * 0.4, s * 0.45, -s * 0.25);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ol; ctx.lineWidth = lw; ctx.stroke();
  }

  // --- Legs + boots ---
  for (const side of [-1, 1]) {
    const lx = side * s * 0.17;
    ctx.fillStyle = W(lin(ctx, lx - s * 0.16, 0, lx + s * 0.16, 0, [[0, shadeColor(deep, 12)], [0.5, lo], [1, deep]]));
    rr(ctx, lx - s * 0.16, s * 0.28, s * 0.32, s * 0.55, s * 0.1); ctx.fill();
    ctx.strokeStyle = ol; ctx.lineWidth = lw; ctx.stroke();
    if (detail) { // knee pad + crease
      ctx.fillStyle = shadeColor(deep, 14);
      rr(ctx, lx - s * 0.12, s * 0.46, s * 0.24, s * 0.12, s * 0.05); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = lw * 0.7;
      ctx.beginPath(); ctx.moveTo(lx - s * 0.1, s * 0.66); ctx.lineTo(lx + s * 0.1, s * 0.64); ctx.stroke();
    }
    // boot
    ctx.fillStyle = W('#1d2026');
    rr(ctx, lx - s * 0.19, s * 0.78, s * 0.38, s * 0.19, s * 0.07); ctx.fill();
    ctx.strokeStyle = ol; ctx.lineWidth = lw; ctx.stroke();
    if (detail) {
      ctx.fillStyle = '#3a3f4a'; rr(ctx, lx - s * 0.17, s * 0.78, s * 0.34, s * 0.06, s * 0.03); ctx.fill();
      ctx.fillStyle = '#0a0b0e'; ctx.fillRect(lx - s * 0.19, s * 0.93, s * 0.38, s * 0.04);
    }
  }

  // --- Torso ---
  ctx.fillStyle = W(lin(ctx, -s * 0.5, -s * 0.3, s * 0.5, s * 0.5, [[0, hi], [0.45, mid], [1, lo]]));
  rr(ctx, -s * 0.5, -s * 0.3, s, s * 0.84, s * 0.22); ctx.fill();
  ctx.strokeStyle = ol; ctx.lineWidth = lw; ctx.stroke();

  if (detail) {
    // chest plate
    ctx.fillStyle = rad(ctx, -s * 0.1, -s * 0.12, 0, s * 0.6, [[0, shadeColor(base, 45)], [0.6, shadeColor(base, 5)], [1, shadeColor(base, -22)]]);
    ctx.beginPath();
    ctx.moveTo(-s * 0.38, -s * 0.24); ctx.lineTo(s * 0.38, -s * 0.24);
    ctx.lineTo(s * 0.32, s * 0.2); ctx.quadraticCurveTo(0, s * 0.3, -s * 0.32, s * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = lw * 0.8; ctx.stroke();
    // plate edge highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = lw * 0.7;
    ctx.beginPath(); ctx.moveTo(-s * 0.36, -s * 0.22); ctx.lineTo(s * 0.34, -s * 0.22); ctx.stroke();
    // center seam + straps
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = lw * 0.7;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.22); ctx.lineTo(0, s * 0.26); ctx.stroke();
    ctx.strokeStyle = shadeColor(deep, 5); ctx.lineWidth = s * 0.08;
    ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.28); ctx.lineTo(-s * 0.2, s * 0.5); ctx.moveTo(s * 0.3, -s * 0.28); ctx.lineTo(s * 0.2, s * 0.5); ctx.stroke();
    // mag pouches
    ctx.fillStyle = shadeColor(deep, 10);
    for (const px of [-0.26, 0, 0.26]) { rr(ctx, s * (px - 0.09), s * 0.02, s * 0.18, s * 0.17, s * 0.03); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = lw * 0.6; ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (const px of [-0.26, 0, 0.26]) ctx.fillRect(s * (px - 0.07), s * 0.04, s * 0.14, s * 0.02);
    // emblem
    ctx.fillStyle = o.isSuper ? '#FFF3B0' : shadeColor(base, 60);
    ctx.beginPath(); ctx.arc(-s * 0.24, -s * 0.12, s * 0.05, 0, Math.PI * 2); ctx.fill();
  }
  // belt
  ctx.fillStyle = W('#15171c');
  ctx.fillRect(-s * 0.5, s * 0.44, s, s * 0.1);
  if (detail) {
    ctx.fillStyle = o.isSuper ? '#FFD700' : '#b8bec9';
    rr(ctx, -s * 0.07, s * 0.43, s * 0.14, s * 0.12, s * 0.02); ctx.fill();
  }

  // --- Shoulder pads ---
  for (const side of [-1, 1]) {
    ctx.fillStyle = W(rad(ctx, side * s * 0.5 - s * 0.05, -s * 0.2, 0, s * 0.3, [[0, hi], [1, shadeColor(base, -35)]]));
    ctx.beginPath(); ctx.ellipse(side * s * 0.52, -s * 0.12, s * 0.23, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ol; ctx.lineWidth = lw; ctx.stroke();
    if (detail) { ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = lw * 0.7; ctx.beginPath(); ctx.arc(side * s * 0.52, -s * 0.12, s * 0.15, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke(); }
  }

  // --- Left arm (viewer's left): bent, glove ---
  ctx.strokeStyle = W(lo); ctx.lineWidth = s * 0.2;
  ctx.beginPath(); ctx.moveTo(-s * 0.52, -s * 0.05); ctx.lineTo(-s * 0.6, s * 0.22); ctx.stroke();
  ctx.fillStyle = W('#2b2f38');
  ctx.beginPath(); ctx.arc(-s * 0.6, s * 0.26, s * 0.11, 0, Math.PI * 2); ctx.fill();

  // --- Right arm + weapon ---
  ctx.strokeStyle = ol; ctx.lineWidth = s * 0.26;
  ctx.beginPath(); ctx.moveTo(s * 0.52, -s * 0.06); ctx.lineTo(s * 0.4, -s * 0.4); ctx.stroke();
  ctx.strokeStyle = W(lo); ctx.lineWidth = s * 0.2;
  ctx.beginPath(); ctx.moveTo(s * 0.52, -s * 0.06); ctx.lineTo(s * 0.4, -s * 0.4); ctx.stroke();
  paintWeapon(ctx, s, o, detail);
  ctx.fillStyle = W('#2b2f38');
  ctx.beginPath(); ctx.arc(s * 0.4, -s * 0.42, s * 0.11, 0, Math.PI * 2); ctx.fill();

  // --- Head ---
  paintHead(ctx, s, o, base, detail);

  if (!F && !o.simple && !o.isSuper) paintSkinFlair(ctx, s, o.color);
  if (o.isSuper && !F) { // golden aura + star
    ctx.fillStyle = rad(ctx, 0, -s * 0.1, s * 0.4, s * 1.5, [[0, 'rgba(255,215,0,0.28)'], [1, 'rgba(255,215,0,0)']]);
    ctx.beginPath(); ctx.arc(0, -s * 0.1, s * 1.5, 0, Math.PI * 2); ctx.fill();
  }
}

function paintWeapon(ctx: Ctx, s: number, o: PaintOpts, detail: boolean): void {
  const F = o.flash;
  const W = (c: string | CanvasGradient): string | CanvasGradient => (F ? '#FFFFFF' : c);
  const metal = lin(ctx, 0, -s * 0.62, 0, -s * 0.34, [[0, '#6f7787'], [0.5, '#3a4050'], [1, '#1b1e26']]);
  const outline = F ? '#FFFFFF' : 'rgba(0,0,0,0.6)';
  const lw = Math.max(0.7, s * 0.04);
  const gun = (x: number, y: number, w: number, h: number, r = s * 0.04) => {
    ctx.fillStyle = W(metal); rr(ctx, x, y, w, h, r); ctx.fill();
    ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.stroke();
  };

  if (o.type === 'bazooka') {
    gun(s * 0.02, -s * 0.66, s * 0.9, s * 0.28, s * 0.1);
    ctx.fillStyle = W('#2a2e37'); rr(ctx, s * 0.85, -s * 0.7, s * 0.14, s * 0.36, s * 0.05); ctx.fill();
    ctx.strokeStyle = outline; ctx.stroke();
    if (detail) {
      ctx.fillStyle = '#ff9a2e'; ctx.beginPath(); ctx.arc(s * 0.98, -s * 0.52, s * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rad(ctx, s * 0.98, -s * 0.52, 0, s * 0.3, [[0, 'rgba(255,170,60,0.7)'], [1, 'rgba(255,170,60,0)']]);
      ctx.beginPath(); ctx.arc(s * 0.98, -s * 0.52, s * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c0392b'; ctx.fillRect(s * 0.3, -s * 0.66, s * 0.07, s * 0.28); ctx.fillRect(s * 0.55, -s * 0.66, s * 0.07, s * 0.28);
      ctx.fillStyle = '#9aa3b5'; ctx.fillRect(s * 0.15, -s * 0.74, s * 0.18, s * 0.07); // sight
    }
  } else if (o.type === 'rambo') {
    gun(s * 0.1, -s * 0.56, s * 0.95, s * 0.17, s * 0.03);
    gun(s * 0.28, -s * 0.4, s * 0.15, s * 0.24, s * 0.03); // drum mag
    if (detail) {
      ctx.fillStyle = '#d6b45a';
      for (let i = 0; i < 4; i++) ctx.fillRect(s * (0.18 + i * 0.07), -s * 0.2, s * 0.045, s * 0.1); // ammo belt
      ctx.fillStyle = '#10131a'; ctx.fillRect(s * 0.95, -s * 0.58, s * 0.14, s * 0.07);
      ctx.fillStyle = '#ffb347'; ctx.fillRect(s * 1.05, -s * 0.56, s * 0.08, s * 0.03);
    }
  } else if (o.type === 'laser') {
    gun(s * 0.1, -s * 0.58, s * 0.85, s * 0.18, s * 0.06);
    if (detail) {
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = s * 0.4;
      rr(ctx, s * 0.55, -s * 0.54, s * 0.34, s * 0.1, s * 0.04); ctx.fill();
      ctx.fillRect(s * 0.28, -s * 0.54, s * 0.05, s * 0.1);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#7e8aa3'; ctx.fillRect(s * 0.2, -s * 0.68, s * 0.22, s * 0.08);
    }
  } else { // assault rifle
    gun(s * 0.12, -s * 0.54, s * 0.78, s * 0.13, s * 0.03);
    ctx.fillStyle = W('#2a2f3a'); rr(ctx, -s * 0.02, -s * 0.52, s * 0.18, s * 0.17, s * 0.04); ctx.fill(); // stock
    ctx.strokeStyle = outline; ctx.lineWidth = lw; ctx.stroke();
    if (detail) {
      ctx.fillStyle = '#14171d'; ctx.fillRect(s * 0.3, -s * 0.42, s * 0.1, s * 0.22); // magazine
      ctx.fillStyle = '#8a93a6'; ctx.fillRect(s * 0.4, -s * 0.62, s * 0.2, s * 0.08); // scope
      ctx.fillStyle = 'rgba(160,220,255,0.7)'; ctx.fillRect(s * 0.57, -s * 0.61, s * 0.025, s * 0.06);
      ctx.fillStyle = '#0a0b0e'; ctx.fillRect(s * 0.88, -s * 0.52, s * 0.1, s * 0.05);
    }
  }
}

function paintHead(ctx: Ctx, s: number, o: PaintOpts, base: string, detail: boolean): void {
  const F = o.flash;
  const W = (c: string | CanvasGradient): string | CanvasGradient => (F ? '#FFFFFF' : c);
  const ol = F ? '#FFFFFF' : 'rgba(8, 10, 20, 0.55)';
  const lw = Math.max(0.8, s * 0.05);
  // neck
  ctx.fillStyle = W('#b98b64'); ctx.fillRect(-s * 0.1, -s * 0.34, s * 0.2, s * 0.14);
  // face
  ctx.fillStyle = W(rad(ctx, -s * 0.1, -s * 0.72, 0, s * 0.45, [[0, '#ffe2c4'], [0.7, '#d9a577'], [1, '#a9774f']]));
  ctx.beginPath(); ctx.arc(0, -s * 0.62, s * 0.36, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = ol; ctx.lineWidth = lw; ctx.stroke();
  if (detail) {
    // eyes, brows, nose, mouth
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-s * 0.13, -s * 0.6, s * 0.07, s * 0.055, 0, 0, Math.PI * 2); ctx.ellipse(s * 0.13, -s * 0.6, s * 0.07, s * 0.055, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b2a44'; ctx.beginPath(); ctx.arc(-s * 0.12, -s * 0.6, s * 0.035, 0, Math.PI * 2); ctx.arc(s * 0.14, -s * 0.6, s * 0.035, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4a3322'; ctx.lineWidth = lw * 0.8;
    ctx.beginPath(); ctx.moveTo(-s * 0.21, -s * 0.68); ctx.lineTo(-s * 0.06, -s * 0.66); ctx.moveTo(s * 0.06, -s * 0.66); ctx.lineTo(s * 0.21, -s * 0.68); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,70,40,0.6)'; ctx.beginPath(); ctx.moveTo(0, -s * 0.58); ctx.lineTo(-s * 0.03, -s * 0.48); ctx.lineTo(s * 0.02, -s * 0.47); ctx.stroke();
    ctx.strokeStyle = '#7a3b2a'; ctx.beginPath(); ctx.moveTo(-s * 0.08, -s * 0.4); ctx.quadraticCurveTo(0, -s * 0.37, s * 0.08, -s * 0.4); ctx.stroke();
  }
  // helmet
  const hel = o.isSuper ? '#F0C93A' : shadeColor(base, -35);
  ctx.fillStyle = W(lin(ctx, -s * 0.4, -s * 1.05, s * 0.4, -s * 0.6, [[0, shadeColor(hel, 30)], [0.5, hel], [1, shadeColor(hel, -35)]]));
  ctx.beginPath(); ctx.arc(0, -s * 0.68, s * 0.42, Math.PI * 1.0, Math.PI * 2.0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = ol; ctx.lineWidth = lw; ctx.stroke();
  // brim
  ctx.fillStyle = W(shadeColor(hel, -25)); rr(ctx, -s * 0.44, -s * 0.72, s * 0.88, s * 0.13, s * 0.05); ctx.fill();
  ctx.strokeStyle = ol; ctx.stroke();
  if (detail) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = lw * 0.9;
    ctx.beginPath(); ctx.arc(-s * 0.05, -s * 0.72, s * 0.34, Math.PI * 1.15, Math.PI * 1.5); ctx.stroke();
    // camo band / stripe
    ctx.fillStyle = shadeColor(hel, 22); ctx.fillRect(-s * 0.4, -s * 0.8, s * 0.8, s * 0.04);
    // chin strap
    ctx.strokeStyle = '#1d2026'; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(-s * 0.36, -s * 0.6); ctx.quadraticCurveTo(-s * 0.3, -s * 0.38, -s * 0.05, -s * 0.36); ctx.moveTo(s * 0.36, -s * 0.6); ctx.quadraticCurveTo(s * 0.3, -s * 0.38, s * 0.05, -s * 0.36); ctx.stroke();
  }
  // type extras
  if (o.type === 'rambo') {
    ctx.strokeStyle = W('#c0392b'); ctx.lineWidth = s * 0.14;
    ctx.beginPath(); ctx.moveTo(-s * 0.4, -s * 0.76); ctx.lineTo(s * 0.4, -s * 0.8); ctx.stroke();
    ctx.lineWidth = s * 0.09; ctx.beginPath(); ctx.moveTo(s * 0.38, -s * 0.8); ctx.lineTo(s * 0.62, -s * 0.62); ctx.stroke();
  } else if (o.type === 'laser') {
    ctx.fillStyle = W('#00f0ff'); ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = F ? 0 : s * 0.3;
    rr(ctx, -s * 0.3, -s * 0.66, s * 0.6, s * 0.14, s * 0.06); ctx.fill(); ctx.shadowBlur = 0;
    if (detail) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-s * 0.24, -s * 0.64, s * 0.16, s * 0.03); }
  } else if (o.type === 'bazooka' && detail) {
    // goggles
    ctx.fillStyle = '#10131a'; rr(ctx, -s * 0.3, -s * 0.68, s * 0.6, s * 0.15, s * 0.06); ctx.fill();
    ctx.fillStyle = 'rgba(255,170,60,0.9)'; ctx.beginPath(); ctx.arc(-s * 0.14, -s * 0.6, s * 0.06, 0, Math.PI * 2); ctx.arc(s * 0.14, -s * 0.6, s * 0.06, 0, Math.PI * 2); ctx.fill();
  }
}

/** Per-skin gear (kept in sync with HERO_SKINS styles). */
function paintSkinFlair(ctx: Ctx, s: number, color: string): void {
  const skin = HERO_SKINS.find(k => k.primary === color);
  if (!skin) return;
  paintStyle(ctx, s, skin.style, skin.accent);
}

export function paintStyle(ctx: Ctx, s: number, style: SkinStyle, a: string): void {
  if (style === 'plain') return;
  const topY = -s * 1.08;
  ctx.save();
  ctx.fillStyle = a; ctx.strokeStyle = a; ctx.lineWidth = Math.max(1, s * 0.09);
  switch (style) {
    case 'scarf':
      ctx.beginPath(); rr(ctx, -s * 0.34, -s * 0.3, s * 0.68, s * 0.13, s * 0.05); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.2); ctx.quadraticCurveTo(-s * 0.7, -s * 0.1, -s * 0.66, s * 0.1); ctx.stroke(); break;
    case 'flame':
      for (const [dx, h] of [[-0.18, 0.5], [0, 0.78], [0.18, 0.46]] as const) {
        ctx.fillStyle = dx === 0 ? '#FFF3B0' : a;
        ctx.beginPath(); ctx.moveTo(s * (dx - 0.11), topY + s * 0.12); ctx.quadraticCurveTo(s * dx, topY - s * h, s * (dx + 0.11), topY + s * 0.12); ctx.fill();
      } break;
    case 'crest':
      for (const dx of [-0.2, 0, 0.2]) { ctx.beginPath(); ctx.moveTo(s * dx, topY + s * 0.14); ctx.lineTo(s * dx, topY - s * (0.4 - Math.abs(dx))); ctx.stroke(); } break;
    case 'visor':
      ctx.shadowColor = a; ctx.shadowBlur = s * 0.35; rr(ctx, -s * 0.32, -s * 0.7, s * 0.64, s * 0.14, s * 0.05); ctx.fill(); break;
    case 'mohawk':
      ctx.beginPath(); ctx.moveTo(-s * 0.3, topY + s * 0.2);
      for (let i = 0; i < 4; i++) { ctx.lineTo(-s * 0.3 + s * 0.2 * i + s * 0.1, topY - s * 0.42); ctx.lineTo(-s * 0.3 + s * 0.2 * (i + 1), topY + s * 0.16); }
      ctx.closePath(); ctx.fill(); break;
    case 'halo':
      ctx.shadowColor = a; ctx.shadowBlur = s * 0.4; ctx.beginPath(); ctx.ellipse(0, topY - s * 0.2, s * 0.36, s * 0.1, 0, 0, Math.PI * 2); ctx.stroke(); break;
    case 'band':
      rr(ctx, -s * 0.42, -s * 0.76, s * 0.84, s * 0.1, s * 0.03); ctx.fill();
      ctx.beginPath(); ctx.moveTo(s * 0.4, -s * 0.72); ctx.lineTo(s * 0.76, -s * 0.5); ctx.stroke(); break;
    case 'crown':
      ctx.beginPath(); ctx.moveTo(-s * 0.32, topY + s * 0.12); ctx.lineTo(-s * 0.32, topY - s * 0.24); ctx.lineTo(-s * 0.16, topY - s * 0.06);
      ctx.lineTo(0, topY - s * 0.34); ctx.lineTo(s * 0.16, topY - s * 0.06); ctx.lineTo(s * 0.32, topY - s * 0.24); ctx.lineTo(s * 0.32, topY + s * 0.12); ctx.closePath(); ctx.fill(); break;
    case 'rays':
      for (let i = -2; i <= 2; i++) { const ang = -Math.PI / 2 + i * 0.5; ctx.beginPath(); ctx.moveTo(Math.cos(ang) * s * 0.5, topY + s * 0.34 + Math.sin(ang) * s * 0.5); ctx.lineTo(Math.cos(ang) * s * 0.85, topY + s * 0.34 + Math.sin(ang) * s * 0.85); ctx.stroke(); } break;
    case 'stars':
      for (const [dx, dy] of [[-0.32, -0.2], [0.32, -0.32], [0, -0.52]] as const) { ctx.beginPath(); ctx.arc(s * dx, topY + s * dy, s * 0.08, 0, Math.PI * 2); ctx.fill(); } break;
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// ZOMBIES (base, runner, tank, spitter)
// ---------------------------------------------------------------------------

function paintZombie(ctx: Ctx, s: number, o: PaintOpts): void {
  const kind = enemyKindFromColor(o.color);
  const F = o.flash;
  const W = (c: string | CanvasGradient): string | CanvasGradient => (F ? '#FFFFFF' : c);
  const detail = !F && !o.simple;
  const ol = F ? '#FFFFFF' : 'rgba(10, 6, 6, 0.6)';
  const lw = Math.max(0.8, s * 0.055);

  const skinBase = kind === 'spitter' ? '#8BC34A' : kind === 'tank' ? '#8d9a6a' : kind === 'runner' ? '#B7C26A' : '#7FA650';
  const skinHi = shadeColor(skinBase, 25);
  const skinLo = shadeColor(skinBase, -40);
  const cloth = kind === 'tank' ? '#4b2020' : kind === 'runner' ? '#7a3b12' : kind === 'spitter' ? '#2e4a1c' : '#5a2323';
  const clothHi = shadeColor(cloth, 22);

  const lean = kind === 'runner' ? 0.82 : kind === 'tank' ? 1.22 : 1;
  const hunch = kind === 'runner' ? s * 0.12 : s * 0.06;

  if (!F) {
    ctx.fillStyle = rad(ctx, 0, s * 0.96, 0, s * 0.85 * lean, [[0, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0)']]);
    ctx.beginPath(); ctx.ellipse(0, s * 0.96, s * 0.85 * lean, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  }
  // runner speed streaks
  if (kind === 'runner' && detail) {
    ctx.strokeStyle = 'rgba(255,170,80,0.35)'; ctx.lineWidth = s * 0.07;
    for (const dx of [-0.5, -0.2, 0.2, 0.5]) { ctx.beginPath(); ctx.moveTo(s * dx, -s * 0.7); ctx.lineTo(s * dx, -s * (1.15 + Math.abs(dx))); ctx.stroke(); }
  }

  // legs (ragged pants + bare feet)
  for (const side of [-1, 1]) {
    const lx = side * s * 0.18 * lean;
    ctx.fillStyle = W(lin(ctx, lx - s * 0.15, 0, lx + s * 0.15, 0, [[0, clothHi], [1, shadeColor(cloth, -30)]]));
    rr(ctx, lx - s * 0.15 * lean, s * 0.3, s * 0.3 * lean, s * 0.5, s * 0.08);
    ctx.fill(); ctx.strokeStyle = ol; ctx.lineWidth = lw; ctx.stroke();
    if (detail) { // torn hem
      ctx.fillStyle = shadeColor(cloth, -45);
      ctx.beginPath(); ctx.moveTo(lx - s * 0.15, s * 0.76); ctx.lineTo(lx - s * 0.08, s * 0.84); ctx.lineTo(lx, s * 0.77); ctx.lineTo(lx + s * 0.08, s * 0.85); ctx.lineTo(lx + s * 0.15, s * 0.76); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = W(skinLo); rr(ctx, lx - s * 0.16 * lean, s * 0.82, s * 0.32 * lean, s * 0.13, s * 0.05); ctx.fill();
    ctx.strokeStyle = ol; ctx.stroke();
    if (detail) { ctx.fillStyle = '#d9d2b0'; for (const t of [-0.08, 0, 0.08]) { ctx.beginPath(); ctx.arc(lx + s * t, s * 0.95, s * 0.025, 0, Math.PI * 2); ctx.fill(); } }
  }

  // torso (hunched)
  ctx.save();
  ctx.translate(0, hunch);
  const tw = s * 0.52 * lean;
  ctx.fillStyle = W(lin(ctx, -tw, -s * 0.3, tw, s * 0.5, [[0, clothHi], [0.5, cloth], [1, shadeColor(cloth, -40)]]));
  rr(ctx, -tw, -s * 0.3, tw * 2, s * 0.84, s * 0.2); ctx.fill();
  ctx.strokeStyle = ol; ctx.lineWidth = lw; ctx.stroke();

  if (detail) {
    // torn shirt hem
    ctx.fillStyle = shadeColor(cloth, -50);
    ctx.beginPath(); ctx.moveTo(-tw, s * 0.46);
    for (let i = 0; i <= 6; i++) ctx.lineTo(-tw + (tw * 2 * i) / 6, s * (0.46 + (i % 2 ? 0.1 : 0.02)));
    ctx.lineTo(tw, s * 0.46); ctx.closePath(); ctx.fill();
    // exposed ribs wound
    ctx.fillStyle = 'rgba(70,6,10,0.85)'; ctx.beginPath(); ctx.ellipse(s * 0.1, s * 0.05, s * 0.24, s * 0.3, 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e8dfc4'; ctx.lineWidth = s * 0.05;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.08, -s * 0.12 + i * s * 0.14); ctx.quadraticCurveTo(s * 0.12, -s * 0.16 + i * s * 0.14, s * 0.3, -s * 0.1 + i * s * 0.14); ctx.stroke(); }
    // blood splatter + grime
    ctx.fillStyle = 'rgba(120,8,8,0.6)';
    ctx.beginPath(); ctx.arc(-s * 0.3, -s * 0.05, s * 0.1, 0, Math.PI * 2); ctx.arc(-s * 0.2, s * 0.25, s * 0.06, 0, Math.PI * 2); ctx.arc(s * 0.35, s * 0.35, s * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = lw * 0.7;
    ctx.beginPath(); ctx.moveTo(-s * 0.35, -s * 0.2); ctx.lineTo(-s * 0.25, s * 0.1); ctx.stroke();
  }

  if (kind === 'spitter') { // bloated belly with glowing sacs
    ctx.fillStyle = W(rad(ctx, 0, s * 0.18, 0, s * 0.5, [[0, '#E6FF8A'], [0.6, '#9BDB2E'], [1, '#4F8A12']]));
    ctx.beginPath(); ctx.ellipse(0, s * 0.2, s * 0.42, s * 0.34, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = ol; ctx.stroke();
    if (detail) {
      ctx.fillStyle = 'rgba(230,255,140,0.9)'; ctx.shadowColor = '#B6FF3C'; ctx.shadowBlur = s * 0.4;
      for (const [x, y, r] of [[-0.18, 0.12, 0.09], [0.14, 0.26, 0.11], [0.02, 0.05, 0.06]] as const) { ctx.beginPath(); ctx.arc(s * x, s * y, s * r, 0, Math.PI * 2); ctx.fill(); }
      ctx.shadowBlur = 0;
    }
  }
  if (kind === 'tank') { // armored chest plate + chains
    ctx.fillStyle = W(lin(ctx, 0, -s * 0.3, 0, s * 0.4, [[0, '#8a8f99'], [1, '#3c4048']]));
    rr(ctx, -s * 0.42, -s * 0.24, s * 0.84, s * 0.55, s * 0.12); ctx.fill(); ctx.strokeStyle = ol; ctx.stroke();
    if (detail) {
      ctx.fillStyle = '#c9ced8'; for (const [x, y] of [[-0.3, -0.14], [0.3, -0.14], [-0.3, 0.22], [0.3, 0.22]] as const) { ctx.beginPath(); ctx.arc(s * x, s * y, s * 0.04, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(0, -s * 0.22); ctx.lineTo(0, s * 0.3); ctx.stroke();
    }
  }
  ctx.restore();

  // arms (reaching claws)
  const reach = (side: number, up: number) => {
    ctx.strokeStyle = ol; ctx.lineWidth = s * 0.27 * (kind === 'tank' ? 1.3 : 1);
    ctx.beginPath(); ctx.moveTo(side * s * 0.5 * lean, s * 0.0); ctx.lineTo(side * s * 0.72 * lean, -s * up); ctx.stroke();
    ctx.strokeStyle = W(skinBase); ctx.lineWidth = s * 0.2 * (kind === 'tank' ? 1.3 : 1);
    ctx.beginPath(); ctx.moveTo(side * s * 0.5 * lean, s * 0.0); ctx.lineTo(side * s * 0.72 * lean, -s * up); ctx.stroke();
    ctx.fillStyle = W(skinLo); ctx.beginPath(); ctx.arc(side * s * 0.72 * lean, -s * up, s * 0.12 * (kind === 'tank' ? 1.4 : 1), 0, Math.PI * 2); ctx.fill();
    if (detail) { ctx.strokeStyle = '#efe6c8'; ctx.lineWidth = s * 0.04; for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(side * s * 0.72 * lean + k * s * 0.05, -s * up); ctx.lineTo(side * s * 0.72 * lean + k * s * 0.09, -s * (up + 0.2)); ctx.stroke(); } }
  };
  reach(-1, 0.55); reach(1, 0.4);

  // tank shoulder spikes
  if (kind === 'tank') {
    for (const side of [-1, 1]) {
      ctx.fillStyle = W(lin(ctx, 0, -s * 0.5, 0, 0, [[0, '#9aa0ab'], [1, '#3d4048']]));
      ctx.beginPath(); ctx.ellipse(side * s * 0.6, -s * 0.12, s * 0.28, s * 0.24, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = ol; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(side * s * 0.52, -s * 0.3); ctx.lineTo(side * s * 0.6, -s * 0.62); ctx.lineTo(side * s * 0.7, -s * 0.28); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }

  // head
  const hy = -s * 0.62 + hunch * 1.6;
  const hr = s * (kind === 'tank' ? 0.32 : 0.38);
  ctx.fillStyle = W(rad(ctx, -s * 0.1, hy - s * 0.1, 0, hr * 1.3, [[0, skinHi], [0.65, skinBase], [1, skinLo]]));
  ctx.beginPath(); ctx.arc(0, hy, hr, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = ol; ctx.lineWidth = lw; ctx.stroke();
  // scalp
  ctx.fillStyle = W('#26331a');
  ctx.beginPath(); ctx.arc(0, hy - s * 0.06, hr * 1.04, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  if (kind === 'tank') { // bone helmet horns
    ctx.fillStyle = W('#d9d2b0');
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * hr * 0.7, hy - hr * 0.5); ctx.quadraticCurveTo(side * hr * 1.5, hy - hr * 1.3, side * hr * 1.1, hy - hr * 1.9); ctx.quadraticCurveTo(side * hr * 0.9, hy - hr * 1.1, side * hr * 0.4, hy - hr * 0.7); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ol; ctx.stroke(); }
  }
  if (detail) {
    ctx.fillStyle = '#c9c1a0'; ctx.beginPath(); ctx.arc(s * 0.16, hy - s * 0.18, s * 0.12, 0, Math.PI * 2); ctx.fill(); // exposed skull
    ctx.strokeStyle = '#17220f'; ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.moveTo(-s * 0.28, hy - s * 0.22); ctx.lineTo(-s * 0.38, hy - s * 0.42); ctx.moveTo(-s * 0.05, hy - s * 0.3); ctx.lineTo(-s * 0.02, hy - s * 0.5); ctx.stroke();
    // glowing eyes
    const eyeCol = kind === 'spitter' ? '#C8FF3C' : kind === 'tank' ? '#FF3B2F' : '#FFE14A';
    ctx.fillStyle = eyeCol; ctx.shadowColor = eyeCol; ctx.shadowBlur = s * 0.35;
    ctx.beginPath(); ctx.ellipse(-s * 0.13, hy, s * 0.08, s * 0.06, -0.2, 0, Math.PI * 2); ctx.ellipse(s * 0.13, hy, s * 0.08, s * 0.06, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a0a0a'; ctx.beginPath(); ctx.arc(-s * 0.13, hy, s * 0.025, 0, Math.PI * 2); ctx.arc(s * 0.13, hy, s * 0.025, 0, Math.PI * 2); ctx.fill();
    // open mouth with teeth
    const mouthOpen = kind === 'spitter' ? 0.2 : kind === 'runner' ? 0.17 : 0.1;
    ctx.fillStyle = '#2a0508'; ctx.beginPath(); ctx.ellipse(0, hy + s * 0.2, s * 0.17, s * mouthOpen, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2ecd6'; for (const t of [-0.1, -0.03, 0.04, 0.11]) { ctx.beginPath(); ctx.moveTo(s * t, hy + s * 0.12); ctx.lineTo(s * (t + 0.03), hy + s * 0.12); ctx.lineTo(s * (t + 0.015), hy + s * 0.19); ctx.closePath(); ctx.fill(); }
    if (kind === 'spitter') { // acid drip
      ctx.fillStyle = '#B6FF3C'; ctx.shadowColor = '#B6FF3C'; ctx.shadowBlur = s * 0.3;
      ctx.beginPath(); ctx.moveTo(-s * 0.04, hy + s * 0.32); ctx.quadraticCurveTo(-s * 0.02, hy + s * 0.62, 0, hy + s * 0.6); ctx.quadraticCurveTo(s * 0.03, hy + s * 0.62, s * 0.04, hy + s * 0.32); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
    }
  }
}
