// boss-art.ts - Detailed procedural art for the 9 chapter bosses.
// Each boss is painted once into a 2x sprite (plus a white damage-flash variant) and animated at draw time.
import { shadeColor } from './utils';
import type { Boss } from './types';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type BossKind = Exclude<Boss['type'], 'mothership' | 'normal'>;

/** Logical sprite box (units) and supersampling. */
export const BOSS_BOX = 310;
export const BOSS_SS = 2;

function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) { try { g.addColorStop(o, c); } catch { /* bad color */ } }
  return g;
}
function rad(ctx: Ctx, x: number, y: number, r0: number, r1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c] of stops) { try { g.addColorStop(o, c); } catch { /* bad color */ } }
  return g;
}
function glow(ctx: Ctx, x: number, y: number, r: number, color: string, a = 1): void {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = rad(ctx, x, y, 0, r, [[0, color], [1, 'rgba(0,0,0,0)']]);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function outline(ctx: Ctx, w = 2.5): void { ctx.strokeStyle = 'rgba(8,6,14,0.7)'; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke(); }
function ell(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); }

function eye(ctx: Ctx, x: number, y: number, r: number, iris: string, glowCol?: string): void {
  if (glowCol) glow(ctx, x, y, r * 2.6, glowCol, 0.7);
  ctx.fillStyle = rad(ctx, x - r * 0.2, y - r * 0.2, 0, r, [[0, '#fff'], [1, '#e8e2d2']]); ell(ctx, x, y, r, r * 0.85); ctx.fill(); outline(ctx, 1.5);
  ctx.fillStyle = rad(ctx, x, y, 0, r * 0.6, [[0, '#111'], [0.4, iris], [1, shadeColor(iris, -40)]]); ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000'; ell(ctx, x, y, r * 0.16, r * 0.45); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(x - r * 0.22, y - r * 0.25, r * 0.13, 0, Math.PI * 2); ctx.fill();
}

// ---------------------------------------------------------------------------

function paintBeast(ctx: Ctx): void { // Fera do Portão
  const fur = '#7a4a26';
  glow(ctx, 0, 40, 120, 'rgba(255,90,40,0.25)');
  // arms (behind)
  for (const side of [-1, 1]) {
    ctx.fillStyle = lin(ctx, side * 70, -10, side * 100, 70, [[0, fur], [1, '#3b2111']]);
    ctx.beginPath(); ctx.moveTo(side * 48, -30); ctx.quadraticCurveTo(side * 112, -20, side * 104, 50); ctx.quadraticCurveTo(side * 84, 56, side * 70, 24); ctx.closePath(); ctx.fill(); outline(ctx);
    ctx.fillStyle = '#e9dfc8'; for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(side * (96 + k * 8), 50); ctx.lineTo(side * (100 + k * 10), 78); ctx.lineTo(side * (106 + k * 8), 50); ctx.fill(); outline(ctx, 1.2); }
  }
  // body
  ctx.fillStyle = lin(ctx, 0, -60, 0, 100, [[0, '#9a6234'], [0.5, fur], [1, '#2e1a0d']]);
  ctx.beginPath(); ctx.moveTo(-70, 70); ctx.quadraticCurveTo(-92, -20, -48, -64); ctx.quadraticCurveTo(0, -84, 48, -64); ctx.quadraticCurveTo(92, -20, 70, 70); ctx.quadraticCurveTo(0, 100, -70, 70); ctx.closePath(); ctx.fill(); outline(ctx, 3);
  // fur strokes
  ctx.lineCap = 'round';
  for (let i = 0; i < 90; i++) { const a = (i * 2.399) % (Math.PI * 2); const r = 20 + (i * 7) % 52; const x = Math.cos(a) * r * 1.1; const y = Math.sin(a) * r * 0.9 + 10; ctx.strokeStyle = i % 3 ? 'rgba(255,200,140,0.22)' : 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 5, y + 11); ctx.stroke(); }
  // belly plate / scars
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ell(ctx, 0, 40, 38, 30); ctx.fill();
  ctx.strokeStyle = 'rgba(220,180,150,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-30, 10); ctx.lineTo(-10, 40); ctx.moveTo(-18, 6); ctx.lineTo(2, 36); ctx.stroke();
  // head
  ctx.fillStyle = lin(ctx, 0, -110, 0, -30, [[0, '#a96d3a'], [1, '#5b3519']]); ell(ctx, 0, -62, 50, 44); ctx.fill(); outline(ctx, 3);
  // horns
  for (const side of [-1, 1]) { ctx.fillStyle = lin(ctx, side * 40, -120, side * 90, -70, [[0, '#f3ead2'], [1, '#9c8c68']]); ctx.beginPath(); ctx.moveTo(side * 34, -88); ctx.quadraticCurveTo(side * 90, -100, side * 84, -146); ctx.quadraticCurveTo(side * 64, -112, side * 22, -78); ctx.closePath(); ctx.fill(); outline(ctx); }
  // snout + tusks + jaw
  ctx.fillStyle = '#3a1d0e'; ell(ctx, 0, -42, 30, 20); ctx.fill(); outline(ctx);
  ctx.fillStyle = '#240c07'; ctx.beginPath(); ctx.moveTo(-26, -44); ctx.quadraticCurveTo(0, -14, 26, -44); ctx.quadraticCurveTo(0, -34, -26, -44); ctx.fill();
  ctx.fillStyle = '#f2ecd8'; for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 20, -42); ctx.lineTo(side * 26, -12); ctx.lineTo(side * 12, -40); ctx.fill(); outline(ctx, 1.2); }
  for (const x of [-12, -4, 4, 12]) { ctx.beginPath(); ctx.moveTo(x - 3, -42); ctx.lineTo(x, -33); ctx.lineTo(x + 3, -42); ctx.fill(); }
  ctx.fillStyle = '#1a0a05'; ctx.beginPath(); ctx.arc(-8, -52, 3, 0, 7); ctx.arc(8, -52, 3, 0, 7); ctx.fill(); // nostrils
  // eyes
  for (const side of [-1, 1]) { glow(ctx, side * 22, -72, 22, 'rgba(255,40,20,0.9)', 0.9); ctx.fillStyle = '#ffdc4a'; ctx.beginPath(); ctx.moveTo(side * 10, -68); ctx.quadraticCurveTo(side * 22, -86, side * 36, -72); ctx.quadraticCurveTo(side * 22, -62, side * 10, -68); ctx.fill(); outline(ctx, 1.5); ctx.fillStyle = '#c01010'; ctx.beginPath(); ctx.arc(side * 23, -72, 4, 0, 7); ctx.fill(); }
  // spiked collar
  ctx.fillStyle = '#4a4f5a'; ctx.fillRect(-46, -26, 92, 10); for (let i = -4; i <= 4; i++) { ctx.fillStyle = '#c9ced8'; ctx.beginPath(); ctx.moveTo(i * 10 - 4, -26); ctx.lineTo(i * 10, -40); ctx.lineTo(i * 10 + 4, -26); ctx.fill(); }
}

function paintSlime(ctx: Ctx): void { // Pântano Vivo
  glow(ctx, 0, 30, 130, 'rgba(120,255,60,0.3)');
  // body mass
  ctx.fillStyle = lin(ctx, 0, -80, 0, 90, [[0, 'rgba(190,255,120,0.95)'], [0.5, 'rgba(70,190,40,0.92)'], [1, 'rgba(30,110,30,0.95)']]);
  ctx.beginPath(); ctx.moveTo(-92, 80); ctx.bezierCurveTo(-110, 10, -70, -70, 0, -78); ctx.bezierCurveTo(70, -70, 110, 10, 92, 80);
  for (let x = 92; x > -92; x -= 24) ctx.quadraticCurveTo(x - 6, 100 + (x % 3) * 4, x - 12, 84);
  ctx.closePath(); ctx.fill(); outline(ctx, 3);
  // inner shading
  ctx.fillStyle = rad(ctx, 0, 30, 10, 100, [[0, 'rgba(0,70,0,0)'], [1, 'rgba(0,50,10,0.45)']]); ctx.fill();
  // suspended objects: bones, skull, bubbles
  ctx.fillStyle = 'rgba(240,235,210,0.8)'; ell(ctx, -40, 30, 18, 8, 0.6); ctx.fill(); ell(ctx, 46, 44, 14, 6, -0.4); ctx.fill(); ctx.beginPath(); ctx.arc(50, 8, 11, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(0,40,0,0.7)'; ctx.fillRect(46, 6, 3, 5); ctx.fillRect(52, 6, 3, 5);
  for (const [x, y, r] of [[-60, 0, 9], [-20, 50, 12], [20, 10, 7], [70, -20, 10], [0, -40, 8], [-48, -34, 6]]) { ctx.strokeStyle = 'rgba(230,255,200,0.8)'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(200,255,150,0.25)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke(); }
  // eyes + grin
  eye(ctx, -28, -22, 17, '#9BFF3C', 'rgba(180,255,60,0.9)'); eye(ctx, 26, -26, 21, '#9BFF3C', 'rgba(180,255,60,0.9)');
  ctx.strokeStyle = '#173d10'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-40, 22); ctx.quadraticCurveTo(0, 62, 44, 18); ctx.stroke();
  ctx.fillStyle = '#e8ffd0'; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 11 - 4, 28 - Math.abs(i) * 2); ctx.lineTo(i * 11, 42 - Math.abs(i) * 3); ctx.lineTo(i * 11 + 4, 28 - Math.abs(i) * 2); ctx.fill(); }
  // gloss
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-52, -44, 22, 9, -0.7, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(-30, -62, 9, 4, -0.4, 0, 7); ctx.fill();
  // drips
  ctx.fillStyle = 'rgba(80,200,40,0.9)'; for (const x of [-60, 10, 64]) { ctx.beginPath(); ctx.moveTo(x - 5, 88); ctx.quadraticCurveTo(x, 118, x + 5, 88); ctx.fill(); }
}

function paintEye(ctx: Ctx): void { // O Olho
  glow(ctx, 0, 0, 140, 'rgba(255,40,60,0.35)');
  // tendrils
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) { const a = Math.PI * (0.15 + i * 0.087); ctx.strokeStyle = i % 2 ? '#7a1830' : '#a02444'; ctx.lineWidth = 9 - i * 0.2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 40, 55 + Math.sin(a) * 20); ctx.bezierCurveTo(Math.cos(a) * 80, 110, Math.cos(a) * 30 + (i - 4) * 12, 130, (i - 4) * 18, 150 - Math.abs(i - 4) * 4); ctx.stroke(); }
  // eyeball
  ctx.fillStyle = rad(ctx, -20, -26, 8, 92, [[0, '#ffffff'], [0.7, '#f3dede'], [1, '#c99a9a']]); ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI * 2); ctx.fill(); outline(ctx, 3.5);
  // veins
  ctx.strokeStyle = 'rgba(200,30,50,0.65)'; ctx.lineWidth = 1.6;
  for (let i = 0; i < 24; i++) { const a = i * 0.262 + 0.1; let x = Math.cos(a) * 88, y = Math.sin(a) * 88; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { x -= Math.cos(a) * 12 + (((i * 7 + k * 5) % 7) - 3); y -= Math.sin(a) * 12 + (((i * 5 + k * 3) % 7) - 3); ctx.lineTo(x, y); } ctx.stroke(); }
  // iris + pupil
  ctx.fillStyle = rad(ctx, 0, 0, 6, 46, [[0, '#ff3b3b'], [0.5, '#c4122a'], [0.85, '#6b0818'], [1, '#2a0208']]); ctx.beginPath(); ctx.arc(0, 4, 46, 0, Math.PI * 2); ctx.fill(); outline(ctx, 2);
  ctx.strokeStyle = 'rgba(255,200,120,0.55)'; ctx.lineWidth = 1.5; for (let i = 0; i < 36; i++) { const a = i * 0.1745; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 14, 4 + Math.sin(a) * 14); ctx.lineTo(Math.cos(a) * 44, 4 + Math.sin(a) * 44); ctx.stroke(); }
  ctx.fillStyle = '#000'; ell(ctx, 0, 4, 11, 32); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(-16, -18, 9, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(14, 22, 4, 0, 7); ctx.fill();
  // eyelids with lashes (top)
  ctx.fillStyle = '#5a1020'; ctx.beginPath(); ctx.moveTo(-96, -6); ctx.quadraticCurveTo(0, -140, 96, -6); ctx.quadraticCurveTo(0, -80, -96, -6); ctx.fill(); outline(ctx, 3);
  ctx.strokeStyle = '#2a0610'; ctx.lineWidth = 3; for (let i = -6; i <= 6; i++) { const x = i * 14; const y = -62 - (36 - Math.abs(i) * 5); ctx.beginPath(); ctx.moveTo(x, y + 20); ctx.lineTo(x + i * 1.6, y - 6); ctx.stroke(); }
  // orbiting small eyes
  for (const [x, y, r] of [[-104, 30, 14], [104, 36, 12], [-70, -80, 10], [78, -76, 11]]) eye(ctx, x, y, r, '#ff4a4a', 'rgba(255,60,60,0.8)');
}

function paintMachine(ctx: Ctx): void { // Mecha Tank
  const steel = '#707b8a';
  glow(ctx, 0, 90, 120, 'rgba(255,120,30,0.25)');
  // treads
  ctx.fillStyle = '#20242c'; ctx.beginPath(); ctx.roundRect(-104, 40, 208, 56, 28); ctx.fill(); outline(ctx, 3);
  ctx.strokeStyle = '#3b414c'; ctx.lineWidth = 3; for (let x = -92; x <= 92; x += 12) { ctx.beginPath(); ctx.moveTo(x, 44); ctx.lineTo(x, 92); ctx.stroke(); }
  for (const x of [-76, -38, 0, 38, 76]) { ctx.fillStyle = lin(ctx, x - 18, 52, x + 18, 84, [[0, '#9aa3b2'], [1, '#2b2f38']]); ctx.beginPath(); ctx.arc(x, 68, 17, 0, 7); ctx.fill(); outline(ctx, 2); ctx.fillStyle = '#14161b'; ctx.beginPath(); ctx.arc(x, 68, 6, 0, 7); ctx.fill(); }
  // hull
  ctx.fillStyle = lin(ctx, 0, -40, 0, 50, [[0, '#9fb0c6'], [0.5, steel], [1, '#3a4250']]);
  ctx.beginPath(); ctx.moveTo(-90, 46); ctx.lineTo(-100, 0); ctx.lineTo(-64, -34); ctx.lineTo(64, -34); ctx.lineTo(100, 0); ctx.lineTo(90, 46); ctx.closePath(); ctx.fill(); outline(ctx, 3);
  // armor panels, rivets, warning stripes
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-60, -34); ctx.lineTo(-60, 46); ctx.moveTo(60, -34); ctx.lineTo(60, 46); ctx.moveTo(-100, 12); ctx.lineTo(100, 12); ctx.stroke();
  ctx.fillStyle = '#d8dde6'; for (let x = -84; x <= 84; x += 22) for (const y of [-24, 36]) { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); }
  ctx.save(); ctx.beginPath(); ctx.rect(-98, 14, 196, 14); ctx.clip(); for (let x = -120; x < 120; x += 20) { ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.moveTo(x, 28); ctx.lineTo(x + 10, 28); ctx.lineTo(x + 24, 14); ctx.lineTo(x + 14, 14); ctx.fill(); } ctx.restore();
  // turret
  ctx.fillStyle = lin(ctx, 0, -92, 0, -30, [[0, '#b9c6d8'], [1, '#566073']]); ctx.beginPath(); ctx.moveTo(-52, -34); ctx.lineTo(-40, -82); ctx.lineTo(40, -82); ctx.lineTo(52, -34); ctx.closePath(); ctx.fill(); outline(ctx, 3);
  // cannon
  ctx.fillStyle = lin(ctx, -14, 0, 14, 0, [[0, '#4a5262'], [0.5, '#9aa6b8'], [1, '#2f3542']]); ctx.beginPath(); ctx.roundRect(-14, -34, 28, 90, 6); ctx.fill(); outline(ctx, 2.5);
  ctx.fillStyle = '#1b1e25'; ctx.beginPath(); ctx.roundRect(-18, 46, 36, 14, 4); ctx.fill(); ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.ellipse(0, 58, 9, 4, 0, 0, 7); ctx.fill(); glow(ctx, 0, 60, 26, 'rgba(255,120,30,0.9)');
  // optic
  glow(ctx, 0, -62, 36, 'rgba(255,40,40,0.9)'); ctx.fillStyle = '#16181e'; ctx.beginPath(); ctx.roundRect(-30, -72, 60, 20, 8); ctx.fill(); outline(ctx, 2); ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.roundRect(-24, -66, 48, 8, 4); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(-10, -65, 10, 2);
  // antennae + exhaust
  ctx.strokeStyle = '#2b2f38'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-34, -82); ctx.lineTo(-40, -112); ctx.moveTo(34, -82); ctx.lineTo(44, -104); ctx.stroke(); glow(ctx, -40, -114, 8, 'rgba(255,60,60,1)');
  ctx.fillStyle = '#20242c'; ctx.fillRect(-92, -26, 12, 26); glow(ctx, -86, -34, 20, 'rgba(120,120,130,0.6)');
}

function paintSpider(ctx: Ctx): void { // Widowmaker
  glow(ctx, 0, 10, 120, 'rgba(190,0,40,0.28)');
  const leg = (side: number, i: number) => {
    const bx = side * 26, by = -10 + i * 14; const kx = side * (86 + i * 6), ky = -64 + i * 30; const tx = side * (112 - i * 4), ty = 36 + i * 22;
    ctx.strokeStyle = '#08060c'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(kx, ky); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = '#2a2430'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(kx, ky); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = 'rgba(190,180,220,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx, by - 2); ctx.lineTo(kx, ky - 2); ctx.stroke();
    ctx.fillStyle = '#d33'; ctx.beginPath(); ctx.arc(kx, ky, 4, 0, 7); ctx.fill();
  };
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) leg(side, i);
  // abdomen
  ctx.fillStyle = rad(ctx, -14, 20, 4, 74, [[0, '#3a3244'], [0.6, '#0c0a12'], [1, '#000']]); ell(ctx, 0, 44, 52, 62); ctx.fill(); outline(ctx, 3);
  // hourglass
  ctx.fillStyle = '#e0142a'; ctx.shadowColor = '#ff2040'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(-18, 22); ctx.lineTo(18, 22); ctx.lineTo(3, 48); ctx.lineTo(18, 74); ctx.lineTo(-18, 74); ctx.lineTo(-3, 48); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ell(ctx, -22, 20, 10, 24, 0.3); ctx.fill();
  // cephalothorax + head
  ctx.fillStyle = rad(ctx, -8, -22, 3, 44, [[0, '#3a3244'], [1, '#0a0810']]); ell(ctx, 0, -14, 36, 32); ctx.fill(); outline(ctx, 3);
  // fangs
  ctx.fillStyle = '#e9e1cf'; for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(side * 12, -2); ctx.quadraticCurveTo(side * 22, 14, side * 8, 30); ctx.quadraticCurveTo(side * 12, 12, side * 4, -2); ctx.fill(); outline(ctx, 1.5); }
  // eight eyes
  for (const [x, y, r] of [[-14, -26, 7], [14, -26, 7], [-26, -18, 5], [26, -18, 5], [-6, -34, 4], [6, -34, 4], [-22, -8, 3.5], [22, -8, 3.5]]) { glow(ctx, x, y, r * 2.4, 'rgba(255,30,50,0.8)', 0.8); ctx.fillStyle = '#ff2a3a'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.22, 0, 7); ctx.fill(); }
  // web strands
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1; for (const x of [-100, -60, 60, 100]) { ctx.beginPath(); ctx.moveTo(x, -116); ctx.quadraticCurveTo(x * 0.5, -60, x * 0.15, -34); ctx.stroke(); }
}

function paintSkull(ctx: Ctx): void { // Rei dos Ossos
  glow(ctx, 0, -10, 130, 'rgba(120,255,200,0.22)');
  // ribcage
  ctx.strokeStyle = '#d9d2b8'; ctx.lineCap = 'round';
  ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(0, 106); ctx.stroke();
  for (let i = 0; i < 5; i++) for (const side of [-1, 1]) { ctx.lineWidth = 6 - i * 0.6; ctx.beginPath(); ctx.moveTo(0, 36 + i * 15); ctx.quadraticCurveTo(side * (58 - i * 5), 30 + i * 15, side * (46 - i * 5), 62 + i * 15); ctx.stroke(); }
  // shoulder bones + arms
  for (const side of [-1, 1]) { ctx.fillStyle = lin(ctx, side * 70, 10, side * 100, 40, [[0, '#f3edd8'], [1, '#a59a78']]); ell(ctx, side * 66, 28, 20, 14, side * 0.4); ctx.fill(); outline(ctx, 2); ctx.strokeStyle = '#d9d2b8'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(side * 70, 34); ctx.lineTo(side * 98, 70); ctx.stroke(); }
  // skull
  ctx.fillStyle = lin(ctx, -50, -100, 50, -10, [[0, '#fffaf0'], [0.55, '#e9e0c6'], [1, '#a89c7a']]);
  ctx.beginPath(); ctx.moveTo(-54, -34); ctx.quadraticCurveTo(-72, -104, 0, -112); ctx.quadraticCurveTo(72, -104, 54, -34); ctx.quadraticCurveTo(52, -10, 30, 0); ctx.lineTo(-30, 0); ctx.quadraticCurveTo(-52, -10, -54, -34); ctx.closePath(); ctx.fill(); outline(ctx, 3);
  // cracks
  ctx.strokeStyle = 'rgba(60,50,30,0.6)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(14, -108); ctx.lineTo(20, -84); ctx.lineTo(10, -70); ctx.lineTo(18, -52); ctx.moveTo(-30, -96); ctx.lineTo(-24, -78); ctx.stroke();
  // eye sockets with fire
  for (const side of [-1, 1]) { ctx.fillStyle = '#0a0a0e'; ell(ctx, side * 24, -48, 17, 20, side * 0.2); ctx.fill(); outline(ctx, 2); glow(ctx, side * 24, -48, 30, 'rgba(90,255,200,0.9)'); ctx.fillStyle = '#b7fff0'; ctx.beginPath(); ctx.moveTo(side * 24 - 7, -42); ctx.quadraticCurveTo(side * 24, -66, side * 24 + 7, -42); ctx.fill(); }
  // nose + teeth + jaw
  ctx.fillStyle = '#16120a'; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(-7, -14); ctx.lineTo(7, -14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f4eedb'; for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.roundRect(i * 8 - 3.5, -8, 7, 15, 2); ctx.fill(); outline(ctx, 1.2); }
  ctx.fillStyle = lin(ctx, 0, 8, 0, 36, [[0, '#e9e0c6'], [1, '#a89c7a']]); ctx.beginPath(); ctx.moveTo(-34, 6); ctx.quadraticCurveTo(0, 44, 34, 6); ctx.lineTo(28, 2); ctx.lineTo(-28, 2); ctx.closePath(); ctx.fill(); outline(ctx, 2);
  // crown
  ctx.fillStyle = lin(ctx, 0, -150, 0, -96, [[0, '#ffe680'], [1, '#c99a1a']]); ctx.beginPath(); ctx.moveTo(-50, -98); ctx.lineTo(-52, -140); ctx.lineTo(-28, -118); ctx.lineTo(-10, -152); ctx.lineTo(10, -118); ctx.lineTo(28, -152); ctx.lineTo(44, -118); ctx.lineTo(54, -140); ctx.lineTo(52, -98); ctx.closePath(); ctx.fill(); outline(ctx, 2.5);
  for (const [x, c] of [[-10, '#e0142a'], [28, '#1ea0ff'], [-40, '#2ecc71']] as const) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, -112, 5, 0, 7); ctx.fill(); }
}

function paintDemon(ctx: Ctx): void { // Senhor das Cinzas
  glow(ctx, 0, 0, 150, 'rgba(255,70,20,0.4)');
  // wings
  for (const side of [-1, 1]) {
    ctx.fillStyle = lin(ctx, side * 40, -80, side * 118, 60, [[0, '#6a0d0d'], [1, '#2a0505']]);
    ctx.beginPath(); ctx.moveTo(side * 30, -20); ctx.lineTo(side * 100, -108); ctx.lineTo(side * 112, -48); ctx.lineTo(side * 118, 8); ctx.lineTo(side * 92, -6); ctx.lineTo(side * 84, 40); ctx.lineTo(side * 58, 16); ctx.lineTo(side * 36, 56); ctx.closePath(); ctx.fill(); outline(ctx, 3);
    ctx.strokeStyle = '#a02020'; ctx.lineWidth = 3; for (const [x, y] of [[100, -108], [118, 8], [84, 40]]) { ctx.beginPath(); ctx.moveTo(side * 30, -20); ctx.lineTo(side * x, y); ctx.stroke(); }
  }
  // body
  ctx.fillStyle = lin(ctx, 0, -50, 0, 100, [[0, '#e8452c'], [0.5, '#a31e12'], [1, '#400806']]); ctx.beginPath(); ctx.moveTo(-52, 96); ctx.quadraticCurveTo(-70, 0, -38, -40); ctx.lineTo(38, -40); ctx.quadraticCurveTo(70, 0, 52, 96); ctx.closePath(); ctx.fill(); outline(ctx, 3);
  // muscles
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, 80); for (let i = 0; i < 4; i++) { ctx.moveTo(-30, -14 + i * 22); ctx.quadraticCurveTo(-14, -6 + i * 22, 0, -12 + i * 22); ctx.moveTo(30, -14 + i * 22); ctx.quadraticCurveTo(14, -6 + i * 22, 0, -12 + i * 22); } ctx.stroke();
  ctx.fillStyle = 'rgba(255,200,140,0.18)'; ell(ctx, -22, -12, 14, 20, -0.3); ctx.fill(); ell(ctx, 22, -12, 14, 20, 0.3); ctx.fill();
  // lava cracks
  ctx.strokeStyle = '#ffb14a'; ctx.shadowColor = '#ff7a1a'; ctx.shadowBlur = 10; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(-2, 30); ctx.lineTo(-16, 50); ctx.moveTo(18, 0); ctx.lineTo(26, 24); ctx.stroke(); ctx.shadowBlur = 0;
  // arms with claws
  for (const side of [-1, 1]) { ctx.strokeStyle = '#7a140c'; ctx.lineWidth = 20; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(side * 44, -26); ctx.lineTo(side * 80, 30); ctx.stroke(); ctx.fillStyle = '#ffe9c0'; for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(side * 80 + k * 8 - 3, 36); ctx.lineTo(side * 80 + k * 10, 64); ctx.lineTo(side * 80 + k * 8 + 3, 36); ctx.fill(); } }
  // head
  ctx.fillStyle = lin(ctx, 0, -100, 0, -40, [[0, '#e8452c'], [1, '#8f1a10']]); ell(ctx, 0, -62, 36, 38); ctx.fill(); outline(ctx, 3);
  for (const side of [-1, 1]) { ctx.fillStyle = lin(ctx, side * 30, -126, side * 50, -70, [[0, '#2a2020'], [1, '#6b5a50']]); ctx.beginPath(); ctx.moveTo(side * 22, -84); ctx.quadraticCurveTo(side * 66, -96, side * 52, -142); ctx.quadraticCurveTo(side * 40, -106, side * 14, -76); ctx.closePath(); ctx.fill(); outline(ctx, 2); }
  for (const side of [-1, 1]) { glow(ctx, side * 16, -66, 20, 'rgba(255,240,80,1)', 0.95); ctx.fillStyle = '#fff6a0'; ctx.beginPath(); ctx.moveTo(side * 4, -62); ctx.quadraticCurveTo(side * 16, -80, side * 30, -64); ctx.quadraticCurveTo(side * 16, -56, side * 4, -62); ctx.fill(); outline(ctx, 1.5); ctx.fillStyle = '#000'; ell(ctx, side * 17, -66, 2.5, 7); ctx.fill(); }
  ctx.fillStyle = '#2a0505'; ctx.beginPath(); ctx.moveTo(-18, -44); ctx.quadraticCurveTo(0, -26, 18, -44); ctx.quadraticCurveTo(0, -38, -18, -44); ctx.fill(); ctx.fillStyle = '#fff'; for (const x of [-12, -4, 4, 12]) { ctx.beginPath(); ctx.moveTo(x - 3, -43); ctx.lineTo(x, -34); ctx.lineTo(x + 3, -43); ctx.fill(); }
  // flames around shoulders
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 1 ? '#fff3b0' : '#ff9a2a'; ctx.beginPath(); ctx.moveTo(side * (50 + i * 10) - 6, -22); ctx.quadraticCurveTo(side * (50 + i * 10), -64 - i * 10, side * (50 + i * 10) + 6, -22); ctx.fill(); }
}

function paintGhost(ctx: Ctx): void { // Fantasma
  glow(ctx, 0, 0, 150, 'rgba(150,210,255,0.4)');
  ctx.fillStyle = lin(ctx, 0, -100, 0, 110, [[0, 'rgba(235,248,255,0.95)'], [0.6, 'rgba(160,205,240,0.75)'], [1, 'rgba(110,160,230,0)']]);
  ctx.beginPath(); ctx.moveTo(-70, 100); ctx.quadraticCurveTo(-98, -10, -50, -70); ctx.quadraticCurveTo(0, -112, 50, -70); ctx.quadraticCurveTo(98, -10, 70, 100);
  for (let x = 70; x > -70; x -= 28) ctx.quadraticCurveTo(x - 7, 128 + (x % 5), x - 14, 100);
  ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(190,230,255,0.9)'; ctx.lineWidth = 2.5; ctx.stroke();
  // inner ripples
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.6; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-50 + i * 4, -10 + i * 22); ctx.quadraticCurveTo(0, 10 + i * 22, 50 - i * 4, -10 + i * 22); ctx.stroke(); }
  // arms (wispy)
  for (const side of [-1, 1]) { ctx.fillStyle = 'rgba(200,230,255,0.75)'; ctx.beginPath(); ctx.moveTo(side * 60, -10); ctx.quadraticCurveTo(side * 120, 10, side * 108, 60); ctx.quadraticCurveTo(side * 96, 30, side * 62, 30); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(190,230,255,0.8)'; ctx.lineWidth = 2; ctx.stroke(); for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(side * 108 + k * 5, 56); ctx.lineTo(side * 112 + k * 8, 78); ctx.stroke(); } }
  // face
  for (const side of [-1, 1]) { ctx.fillStyle = '#0a1020'; ell(ctx, side * 24, -38, 14, 22, side * 0.15); ctx.fill(); glow(ctx, side * 24, -36, 24, 'rgba(120,255,255,0.95)'); ctx.fillStyle = '#c8ffff'; ell(ctx, side * 24, -34, 4, 8); ctx.fill(); }
  ctx.fillStyle = '#0a1020'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(0, 46, 14, 0); ctx.quadraticCurveTo(0, 12, -14, 0); ctx.fill();
  // floating wisps
  for (const [x, y, r] of [[-88, -60, 8], [96, -40, 6], [-100, 40, 5], [90, 70, 7]]) glow(ctx, x, y, r * 2.2, 'rgba(160,230,255,0.9)');
}

function paintCrystal(ctx: Ctx): void { // Prism Core
  glow(ctx, 0, 0, 150, 'rgba(0,255,255,0.35)');
  const shard = (pts: [number, number][], c0: string, c1: string) => {
    ctx.fillStyle = lin(ctx, pts[0][0], pts[0][1], pts[2][0], pts[2][1], [[0, c0], [1, c1]]);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y); ctx.closePath(); ctx.fill(); outline(ctx, 2.2);
  };
  // back shards
  shard([[-70, 60], [-96, -20], [-60, -70], [-40, 20]], '#7ff7ff', '#0a6a88');
  shard([[70, 60], [96, -10], [64, -76], [40, 20]], '#ff9aff', '#6a1a88');
  shard([[-30, 80], [-50, 10], [-10, -40], [10, 40]], '#9aa8ff', '#1a2a88');
  // central prism
  shard([[0, -118], [-58, -20], [-30, 78], [30, 78]], '#e8ffff', '#00b7d8');
  shard([[0, -118], [58, -20], [30, 78], [0, 10]], '#ffffff', '#58e0ff');
  shard([[0, -118], [-58, -20], [0, 10]], '#ffffff', '#9aefff');
  // facet highlights + rainbow refraction
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35;
  const rainbow = lin(ctx, -50, -40, 50, 60, [[0, '#ff4a4a'], [0.25, '#ffd84a'], [0.5, '#4aff7a'], [0.75, '#4ab8ff'], [1, '#c04aff']]);
  ctx.fillStyle = rainbow; ctx.beginPath(); ctx.moveTo(0, -118); ctx.lineTo(58, -20); ctx.lineTo(30, 78); ctx.lineTo(-30, 78); ctx.lineTo(-58, -20); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -110); ctx.lineTo(-48, -22); ctx.moveTo(-6, -70); ctx.lineTo(18, 40); ctx.stroke();
  // glowing core
  glow(ctx, 0, -4, 46, 'rgba(255,255,255,1)'); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -4, 14, 0, 7); ctx.fill(); glow(ctx, 0, -4, 70, 'rgba(0,255,255,0.8)', 0.7);
  // orbiting shards
  for (const [x, y, s] of [[-110, -60, 14], [112, -52, 12], [-100, 74, 11], [100, 80, 15]]) shard([[x, y - s], [x + s * 0.7, y], [x, y + s], [x - s * 0.7, y]], '#ffffff', '#4fd9ff');
}

const PAINTERS: Record<BossKind, (ctx: Ctx) => void> = {
  beast: paintBeast, slime: paintSlime, eye: paintEye, machine: paintMachine,
  spider: paintSpider, skull: paintSkull, demon: paintDemon, ghost: paintGhost, crystal: paintCrystal,
};

/** Paints one boss centered at (0,0) of the current transform. */
export function paintBoss(ctx: Ctx, kind: BossKind): void {
  PAINTERS[kind](ctx);
}

export function isPaintedBoss(type: Boss['type']): type is BossKind {
  return type in PAINTERS;
}

/** Visual scale on top of the 100x100 hitbox so the art reads as imposing. */
export const BOSS_VISUAL_SCALE = 0.46;

const cache = new Map<string, HTMLCanvasElement | OffscreenCanvas>();

export function clearBossArtCache(): void { cache.clear(); }

function makeCanvas(px: number): HTMLCanvasElement | OffscreenCanvas {
  /* v8 ignore next 4 */
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(px, px);
  const c = document.createElement('canvas'); c.width = px; c.height = px; return c;
}

/** Cached sprite (normal or white damage flash). Returns null if a 2D context is unavailable. */
export function getBossSprite(kind: BossKind, flash: boolean): HTMLCanvasElement | OffscreenCanvas | null {
  const key = `${kind}${flash ? '_f' : ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const px = BOSS_BOX * BOSS_SS;
  const canvas = makeCanvas(px);
  const ctx = canvas.getContext('2d') as Ctx | null;
  if (!ctx) return null;
  ctx.scale(BOSS_SS, BOSS_SS);
  ctx.translate(BOSS_BOX / 2, BOSS_BOX / 2);
  paintBoss(ctx, kind);
  if (flash) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillRect(0, 0, px, px);
  }
  cache.set(key, canvas);
  return canvas;
}

// ---------------------------------------------------------------------------
// MINI-BOSSES (elite monsters): brute / juggernaut / stalker / urchin
// ---------------------------------------------------------------------------

export type MiniKind = 'normal' | 'armored' | 'speed' | 'spiky';
export const MINI_BOX = 290;
/** Visual scale vs the 80x80 hitbox (art spans about ±80 units). */
export const MINI_VISUAL_SCALE = 0.47;

export const MINI_NAMES: Record<MiniKind, string> = { normal: 'BRUTAMONTES', armored: 'JUGGERNAUT', speed: 'CAÇADOR', spiky: 'PORCO-ESPINHO' };

function paintBrute(ctx: Ctx): void { // orange ogre with club
  glow(ctx, 0, 30, 100, 'rgba(255,100,20,0.3)');
  ctx.save(); ctx.rotate(-0.5); ctx.fillStyle = lin(ctx, 0, -20, 0, 80, [[0, '#8a5a30'], [1, '#4a2e16']]); ctx.beginPath(); ctx.roundRect(60, -60, 22, 120, 8); ctx.fill(); outline(ctx);
  ctx.fillStyle = '#c9ced8'; for (const y of [-52, -34, -16]) { ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(48, y + 6); ctx.lineTo(60, y + 12); ctx.fill(); ctx.beginPath(); ctx.moveTo(82, y); ctx.lineTo(94, y + 6); ctx.lineTo(82, y + 12); ctx.fill(); } ctx.restore();
  ctx.fillStyle = lin(ctx, 0, -40, 0, 80, [[0, '#ff7a3a'], [0.5, '#e0501a'], [1, '#7a2208']]); ctx.beginPath(); ctx.moveTo(-60, 76); ctx.quadraticCurveTo(-78, -10, -40, -44); ctx.lineTo(40, -44); ctx.quadraticCurveTo(78, -10, 60, 76); ctx.closePath(); ctx.fill(); outline(ctx, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(0, 36, 36, 30, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, -20); ctx.lineTo(-4, 10); ctx.moveTo(10, -24); ctx.lineTo(18, 4); ctx.stroke();
  for (const s of [-1, 1]) { ctx.fillStyle = '#c63f12'; ctx.beginPath(); ctx.ellipse(s * 62, -10, 20, 24, 0, 0, 7); ctx.fill(); outline(ctx, 2.5); ctx.fillStyle = '#ffd9b0'; for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(s * 62 + k * 7 - 3, 12); ctx.lineTo(s * 62 + k * 9, 30); ctx.lineTo(s * 62 + k * 7 + 3, 12); ctx.fill(); } }
  ctx.fillStyle = lin(ctx, 0, -100, 0, -36, [[0, '#ff8a4a'], [1, '#c63f12']]); ctx.beginPath(); ctx.ellipse(0, -62, 36, 32, 0, 0, 7); ctx.fill(); outline(ctx, 3);
  for (const s of [-1, 1]) { ctx.fillStyle = '#f3ead2'; ctx.beginPath(); ctx.moveTo(s * 26, -82); ctx.quadraticCurveTo(s * 52, -92, s * 44, -118); ctx.quadraticCurveTo(s * 34, -96, s * 16, -80); ctx.fill(); outline(ctx, 1.8); }
  eye(ctx, -14, -66, 9, '#ffcc00', 'rgba(255,200,0,0.8)'); eye(ctx, 14, -66, 9, '#ffcc00', 'rgba(255,200,0,0.8)');
  ctx.fillStyle = '#240a05'; ctx.beginPath(); ctx.moveTo(-22, -46); ctx.quadraticCurveTo(0, -24, 22, -46); ctx.fill(); ctx.fillStyle = '#fff'; for (const x of [-14, -5, 5, 14]) { ctx.beginPath(); ctx.moveTo(x - 3, -45); ctx.lineTo(x, -36); ctx.lineTo(x + 3, -45); ctx.fill(); }
}

function paintJuggernaut(ctx: Ctx): void { // steel knight with tower shield
  glow(ctx, 0, 20, 100, 'rgba(160,190,255,0.25)');
  ctx.fillStyle = lin(ctx, 0, -40, 0, 80, [[0, '#aab4c4'], [0.5, '#6b7585'], [1, '#2d333d']]); ctx.beginPath(); ctx.moveTo(-58, 78); ctx.lineTo(-66, -10); ctx.lineTo(-38, -46); ctx.lineTo(38, -46); ctx.lineTo(66, -10); ctx.lineTo(58, 78); ctx.closePath(); ctx.fill(); outline(ctx, 3);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(0, 78); ctx.moveTo(-60, 20); ctx.lineTo(60, 20); ctx.stroke();
  ctx.fillStyle = '#e0e6f2'; for (const [x, y] of [[-40, -20], [40, -20], [-40, 50], [40, 50], [-20, 0], [20, 0]]) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
  for (const s of [-1, 1]) { ctx.fillStyle = lin(ctx, s * 50, -60, s * 90, 0, [[0, '#c9d2e0'], [1, '#4b5362']]); ctx.beginPath(); ctx.ellipse(s * 62, -30, 26, 22, s * 0.3, 0, 7); ctx.fill(); outline(ctx, 2.5); ctx.fillStyle = '#e6ebf5'; ctx.beginPath(); ctx.moveTo(s * 58, -46); ctx.lineTo(s * 66, -78); ctx.lineTo(s * 74, -44); ctx.fill(); outline(ctx, 1.5); }
  // tower shield
  ctx.fillStyle = lin(ctx, -88, -30, -50, 70, [[0, '#d8dee9'], [1, '#59616f']]); ctx.beginPath(); ctx.moveTo(-96, -34); ctx.lineTo(-48, -34); ctx.lineTo(-48, 50); ctx.lineTo(-72, 76); ctx.lineTo(-96, 50); ctx.closePath(); ctx.fill(); outline(ctx, 3);
  ctx.fillStyle = '#e03a3a'; ctx.beginPath(); ctx.moveTo(-72, -20); ctx.lineTo(-58, 8); ctx.lineTo(-72, 40); ctx.lineTo(-86, 8); ctx.closePath(); ctx.fill();
  // helmet
  ctx.fillStyle = lin(ctx, 0, -110, 0, -46, [[0, '#d0d8e6'], [1, '#6b7585']]); ctx.beginPath(); ctx.moveTo(-34, -48); ctx.quadraticCurveTo(-40, -108, 0, -112); ctx.quadraticCurveTo(40, -108, 34, -48); ctx.closePath(); ctx.fill(); outline(ctx, 3);
  ctx.fillStyle = '#0c0f16'; ctx.beginPath(); ctx.roundRect(-26, -78, 52, 14, 5); ctx.fill(); ctx.fillStyle = '#ff3b3b'; ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 10; ctx.fillRect(-20, -74, 40, 5); ctx.shadowBlur = 0;
  ctx.fillStyle = '#e03a3a'; ctx.beginPath(); ctx.moveTo(-6, -112); ctx.lineTo(0, -138); ctx.lineTo(6, -112); ctx.fill(); outline(ctx, 1.5);
}

function paintStalker(ctx: Ctx): void { // yellow lean raptor-like hunter
  glow(ctx, 0, 10, 100, 'rgba(255,240,40,0.3)');
  ctx.strokeStyle = '#8a7a10'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 50); ctx.bezierCurveTo(-60, 60, -80, 20, -70, -20); ctx.stroke(); ctx.strokeStyle = '#f2d818'; ctx.lineWidth = 5; ctx.stroke(); // tail
  for (const s of [-1, 1]) { ctx.strokeStyle = '#6a5c0c'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(s * 20, 20); ctx.lineTo(s * 44, 52); ctx.lineTo(s * 30, 82); ctx.stroke(); ctx.strokeStyle = '#e8cc14'; ctx.lineWidth = 8; ctx.stroke(); ctx.fillStyle = '#fff'; for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(s * 30 + k * 6, 82); ctx.lineTo(s * 30 + k * 9, 96); ctx.lineTo(s * 30 + k * 6 + 3, 82); ctx.fill(); } }
  ctx.fillStyle = lin(ctx, 0, -50, 0, 60, [[0, '#fff27a'], [0.5, '#e8cc14'], [1, '#8a7a10']]); ctx.beginPath(); ctx.moveTo(-34, 60); ctx.quadraticCurveTo(-52, 0, -26, -44); ctx.lineTo(26, -44); ctx.quadraticCurveTo(52, 0, 34, 60); ctx.closePath(); ctx.fill(); outline(ctx, 3);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 5; for (const y of [-26, -6, 14, 34]) { ctx.beginPath(); ctx.moveTo(-34, y); ctx.lineTo(-10, y + 8); ctx.moveTo(34, y); ctx.lineTo(10, y + 8); ctx.stroke(); }
  for (const s of [-1, 1]) { ctx.strokeStyle = '#6a5c0c'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(s * 34, -26); ctx.lineTo(s * 72, -8); ctx.stroke(); ctx.strokeStyle = '#e8cc14'; ctx.lineWidth = 6; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(s * 72, -14); ctx.quadraticCurveTo(s * 98, -4, s * 94, 22); ctx.quadraticCurveTo(s * 84, 0, s * 70, -2); ctx.fill(); outline(ctx, 1.5); }
  ctx.fillStyle = lin(ctx, 0, -96, 0, -40, [[0, '#fff27a'], [1, '#c8a810']]); ctx.beginPath(); ctx.moveTo(-30, -44); ctx.lineTo(-18, -92); ctx.lineTo(0, -104); ctx.lineTo(18, -92); ctx.lineTo(30, -44); ctx.quadraticCurveTo(0, -30, -30, -44); ctx.fill(); outline(ctx, 3);
  for (const s of [-1, 1]) { ctx.fillStyle = '#c8a810'; ctx.beginPath(); ctx.moveTo(s * 16, -92); ctx.lineTo(s * 40, -116); ctx.lineTo(s * 26, -80); ctx.fill(); outline(ctx, 1.5); glow(ctx, s * 12, -70, 16, 'rgba(255,40,40,1)'); ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.ellipse(s * 12, -70, 6, 4, s * 0.5, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#2a0a0a'; ctx.beginPath(); ctx.moveTo(-14, -52); ctx.lineTo(0, -44); ctx.lineTo(14, -52); ctx.fill(); ctx.fillStyle = '#fff'; for (const x of [-9, -3, 3, 9]) { ctx.beginPath(); ctx.moveTo(x - 2, -52); ctx.lineTo(x, -44); ctx.lineTo(x + 2, -52); ctx.fill(); }
}

function paintUrchin(ctx: Ctx): void { // purple spiked mass
  glow(ctx, 0, 0, 110, 'rgba(180,60,255,0.4)');
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const l = i % 2 ? 84 : 98; ctx.fillStyle = lin(ctx, 0, 0, Math.cos(a) * l, Math.sin(a) * l, [[0, '#7a2ab8'], [1, '#f0d8ff']]); ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.14) * 52, Math.sin(a - 0.14) * 52); ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l); ctx.lineTo(Math.cos(a + 0.14) * 52, Math.sin(a + 0.14) * 52); ctx.closePath(); ctx.fill(); outline(ctx, 1.8); }
  ctx.fillStyle = rad(ctx, -14, -18, 4, 64, [[0, '#d38aff'], [0.55, '#8a2fd0'], [1, '#3a0f66']]); ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.fill(); outline(ctx, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.ellipse(-22, -30, 18, 8, -0.7, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(30,0,60,0.35)'; for (const [x, y, r] of [[26, 24, 8], [-30, 22, 6], [10, 40, 5], [34, -8, 5]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  eye(ctx, -18, -8, 14, '#ff4ad8', 'rgba(255,80,220,0.8)'); eye(ctx, 20, -10, 12, '#ff4ad8', 'rgba(255,80,220,0.8)');
  ctx.fillStyle = '#1a0530'; ctx.beginPath(); ctx.moveTo(-26, 22); ctx.quadraticCurveTo(0, 50, 26, 22); ctx.quadraticCurveTo(0, 32, -26, 22); ctx.fill(); ctx.fillStyle = '#fff'; for (const x of [-16, -6, 6, 16]) { ctx.beginPath(); ctx.moveTo(x - 3, 25); ctx.lineTo(x, 34); ctx.lineTo(x + 3, 25); ctx.fill(); }
}

const MINI_PAINTERS: Record<MiniKind, (ctx: Ctx) => void> = { normal: paintBrute, armored: paintJuggernaut, speed: paintStalker, spiky: paintUrchin };

export function paintMiniBoss(ctx: Ctx, kind: MiniKind): void { (MINI_PAINTERS[kind] ?? paintBrute)(ctx); }

export function getMiniBossSprite(kind: MiniKind, flash: boolean): HTMLCanvasElement | OffscreenCanvas | null {
  const key = `mini_${kind}${flash ? '_f' : ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const px = MINI_BOX * BOSS_SS;
  const canvas = makeCanvas(px);
  const ctx = canvas.getContext('2d') as Ctx | null;
  if (!ctx) return null;
  ctx.scale(BOSS_SS, BOSS_SS);
  ctx.translate(MINI_BOX / 2, MINI_BOX / 2);
  paintMiniBoss(ctx, kind);
  if (flash) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillRect(0, 0, px, px);
  }
  cache.set(key, canvas);
  return canvas;
}

// ---------------------------------------------------------------------------
// MOTHERSHIP (final boss)
// ---------------------------------------------------------------------------

export const MOTHER_W = 380;
export const MOTHER_H = 250;
/** Art spans about ±150 units; the hitbox radius is 70 so we draw it at ~0.7. */
export const MOTHER_VISUAL_SCALE = 0.7;
/** Cannon muzzles in art units (x, y) - used for charge glow and projectile origin. */
export const MOTHER_CANNONS: [number, number][] = [[-78, 74], [0, 84], [78, 74]];
/** Rim window lights (art units) animated by the renderer. */
export const MOTHER_LIGHTS: [number, number][] = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2;
  return [Math.cos(a) * 118, Math.sin(a) * 24 + 4] as [number, number];
});

function paintMothership(ctx: Ctx): void {
  // under-hull + cannons + engines
  ctx.fillStyle = lin(ctx, 0, 10, 0, 60, [[0, '#2a2038'], [1, '#0f0a18']]);
  ctx.beginPath(); ctx.ellipse(0, 22, 126, 40, 0, 0, Math.PI); ctx.closePath(); ctx.fill(); outline(ctx, 3);
  for (const [cx, cy] of MOTHER_CANNONS) {
    ctx.fillStyle = lin(ctx, cx - 10, 0, cx + 10, 0, [[0, '#4a3f66'], [0.5, '#9486b8'], [1, '#2c2540']]);
    ctx.beginPath(); ctx.roundRect(cx - 9, 36, 18, cy - 30, 5); ctx.fill(); outline(ctx, 2.5);
    ctx.fillStyle = '#12091d'; ctx.beginPath(); ctx.ellipse(cx, cy, 11, 5, 0, 0, 7); ctx.fill(); outline(ctx, 2);
    ctx.fillStyle = '#6fffb2'; ctx.beginPath(); ctx.ellipse(cx, cy, 5, 2.4, 0, 0, 7); ctx.fill();
  }
  // under panel seams
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.6;
  for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * 22, 20); ctx.lineTo(i * 14, 56 - Math.abs(i) * 2); ctx.stroke(); }
  // engine ring
  for (let i = -3; i <= 3; i++) { const x = i * 34; ctx.fillStyle = '#12091d'; ctx.beginPath(); ctx.ellipse(x, 44 - Math.abs(i) * 4, 8, 4, 0, 0, 7); ctx.fill(); outline(ctx, 1.5); }

  // main disc
  ctx.fillStyle = lin(ctx, 0, -34, 0, 34, [[0, '#8d83ad'], [0.35, '#5a4f7a'], [0.7, '#2f2745'], [1, '#17102a']]);
  ctx.beginPath(); ctx.ellipse(0, 0, 150, 38, 0, 0, Math.PI * 2); ctx.fill(); outline(ctx, 3.5);
  // top rim highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -2, 146, 34, 0, Math.PI * 1.06, Math.PI * 1.94); ctx.stroke();
  // panel lines + rivets + glyphs
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.6;
  for (let i = -7; i <= 7; i++) { ctx.beginPath(); ctx.moveTo(i * 20, -34 * Math.sqrt(Math.max(0, 1 - (i * 20 / 150) ** 2))); ctx.lineTo(i * 20, 38 * Math.sqrt(Math.max(0, 1 - (i * 20 / 150) ** 2))); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, 0, 118, 24, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#c9c1e0'; for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 136, Math.sin(a) * 31, 1.6, 0, 7); ctx.fill(); }
  ctx.strokeStyle = 'rgba(111,255,178,0.7)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  for (const gx of [-96, 96]) { ctx.beginPath(); ctx.moveTo(gx - 10, 4); ctx.lineTo(gx - 3, -4); ctx.lineTo(gx + 4, 4); ctx.lineTo(gx + 10, -4); ctx.stroke(); }
  // glowing conduits
  ctx.save(); ctx.shadowColor = '#4dff9a'; ctx.shadowBlur = 8; ctx.strokeStyle = '#4dff9a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 6, 128, 26, 0, Math.PI * 0.08, Math.PI * 0.92); ctx.stroke(); ctx.restore();

  // upper hull
  ctx.fillStyle = lin(ctx, 0, -62, 0, -18, [[0, '#a79ccc'], [1, '#4a3f6a']]);
  ctx.beginPath(); ctx.ellipse(0, -22, 96, 24, 0, Math.PI, Math.PI * 2); ctx.lineTo(96, -18); ctx.ellipse(0, -18, 96, 14, 0, 0, Math.PI); ctx.closePath(); ctx.fill(); outline(ctx, 3);
  // side pods
  for (const s of [-1, 1]) {
    ctx.fillStyle = lin(ctx, s * 120, -30, s * 160, 30, [[0, '#6c6190'], [1, '#231a38']]);
    ctx.beginPath(); ctx.ellipse(s * 144, 2, 18, 12, 0, 0, 7); ctx.fill(); outline(ctx, 2.5);
    ctx.fillStyle = '#7dffb8'; ctx.beginPath(); ctx.ellipse(s * 150, 2, 6, 4, 0, 0, 7); ctx.fill();
  }

  // dome
  ctx.fillStyle = lin(ctx, 0, -100, 0, -30, [[0, 'rgba(190,255,230,0.55)'], [1, 'rgba(60,200,140,0.35)']]);
  ctx.beginPath(); ctx.ellipse(0, -36, 52, 52, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
  // pilot (silhouette inside)
  ctx.fillStyle = 'rgba(20,50,40,0.75)'; ctx.beginPath(); ctx.ellipse(0, -52, 17, 22, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(15,40,30,0.8)'; ctx.beginPath(); ctx.ellipse(0, -66, 20, 17, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(15,40,30,0.8)'; ctx.lineWidth = 3; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 10, -40); ctx.quadraticCurveTo(s * 28, -34, s * 24, -22); ctx.stroke(); }
  // dome frame + reflections
  ctx.strokeStyle = 'rgba(210,255,235,0.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, -36, 52, 52, 0, Math.PI, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(210,255,235,0.45)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -88); ctx.lineTo(0, -34); ctx.moveTo(-26, -78); ctx.quadraticCurveTo(-34, -56, -34, -34); ctx.moveTo(26, -78); ctx.quadraticCurveTo(34, -56, 34, -34); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(-26, -76, 14, 6, -0.7, 0, 7); ctx.fill();
  // antennas
  ctx.strokeStyle = '#2a2140'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const [x, h] of [[-36, 30], [0, 44], [36, 30]]) { ctx.beginPath(); ctx.moveTo(x, -80 + Math.abs(x) * 0.5); ctx.lineTo(x * 1.1, -80 - h); ctx.stroke(); }
}

export function getMothershipSprite(flash: boolean): HTMLCanvasElement | OffscreenCanvas | null {
  const key = `mothership${flash ? '_f' : ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const w = MOTHER_W * BOSS_SS, h = MOTHER_H * BOSS_SS;
  /* v8 ignore next 5 */
  const canvas: HTMLCanvasElement | OffscreenCanvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = canvas.getContext('2d') as Ctx | null;
  if (!ctx) return null;
  ctx.scale(BOSS_SS, BOSS_SS);
  ctx.translate(MOTHER_W / 2, MOTHER_H / 2 + 20);
  paintMothership(ctx);
  if (flash) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillRect(0, 0, w, h);
  }
  cache.set(key, canvas);
  return canvas;
}

/** Offset of the art origin inside the sprite (the sprite is shifted down by 20 units). */
export const MOTHER_ORIGIN_Y = 20;
export { paintMothership };
