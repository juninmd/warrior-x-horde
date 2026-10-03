// biome-art.ts - Detailed procedural scenery for the 10 biomes.
// Painted once per level into the (supersampled) background cache, so heavy detail is free at runtime.
import type { ThemeConfig } from './constants';
import { shadeColor } from './utils';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function grad(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) { try { g.addColorStop(o, c); } catch { /* bad color */ } }
  return g;
}
function radial(ctx: Ctx, x: number, y: number, r0: number, r1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c] of stops) { try { g.addColorStop(o, c); } catch { /* bad color */ } }
  return g;
}

/** Rolling silhouette from horizon upward. `amp` px peaks; fills down to baseY. */
function ridge(ctx: Ctx, w: number, baseY: number, amp: number, freq: number, phase: number, fill: string | CanvasGradient, rng: () => number, jag = 0): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  for (let x = 0; x <= w; x += 6) {
    const y = baseY - amp * (0.55 + 0.3 * Math.sin(x * freq + phase) + 0.15 * Math.sin(x * freq * 2.7 + phase * 1.7)) - (jag ? rng() * jag : 0);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, baseY);
  ctx.closePath();
  ctx.fill();
}

function stars(ctx: Ctx, w: number, h: number, count: number, rng: () => number, maxY: number): void {
  for (let i = 0; i < count; i++) {
    const x = rng() * w; const y = rng() * maxY;
    const r = rng() < 0.08 ? 1.4 : rng() * 0.8 + 0.2;
    ctx.fillStyle = `rgba(255,255,${220 + Math.floor(rng() * 35)},${0.35 + rng() * 0.65})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  void h;
}

function glowBlob(ctx: Ctx, x: number, y: number, r: number, color: string, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = radial(ctx, x, y, 0, r, [[0, color], [1, 'rgba(0,0,0,0)']]);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Sky + celestial
// ---------------------------------------------------------------------------

const SKY_EXTRA: Record<string, { mid: string; night: boolean; glow: string }> = {
  Grasslands: { mid: '#B9E4FF', night: false, glow: 'rgba(255,240,190,0.55)' },
  Desert: { mid: '#FFB347', night: false, glow: 'rgba(255,200,120,0.6)' },
  Snow: { mid: '#CFE8FF', night: false, glow: 'rgba(230,245,255,0.6)' },
  Toxic: { mid: '#7DBF3A', night: false, glow: 'rgba(170,255,90,0.45)' },
  Candy: { mid: '#FFC8E8', night: false, glow: 'rgba(255,220,240,0.6)' },
  Ocean: { mid: '#5CC0F0', night: false, glow: 'rgba(200,240,255,0.55)' },
  Hell: { mid: '#7A1408', night: true, glow: 'rgba(255,110,30,0.6)' },
  Cyber: { mid: '#2B0B54', night: true, glow: 'rgba(255,60,220,0.45)' },
  Space: { mid: '#14083A', night: true, glow: 'rgba(120,90,255,0.35)' },
  Alien: { mid: '#3A0B52', night: true, glow: 'rgba(210,90,255,0.45)' },
};

function paintSky(ctx: Ctx, w: number, horizonY: number, theme: ThemeConfig, rng: () => number): void {
  const ex = SKY_EXTRA[theme.name] ?? { mid: theme.colors.sky[0], night: false, glow: 'rgba(255,255,255,0.4)' };
  ctx.fillStyle = grad(ctx, 0, 0, 0, horizonY + 6, [[0, theme.colors.sky[0]], [0.55, ex.mid], [1, theme.colors.sky[1]]]);
  ctx.fillRect(0, 0, w, horizonY + 8);

  if (ex.night) stars(ctx, w, horizonY, 140, rng, horizonY * 0.9);

  // nebula (space / alien / cyber)
  if (theme.name === 'Space' || theme.name === 'Alien') {
    const cols = theme.name === 'Space' ? ['rgba(120,70,255,0.35)', 'rgba(255,90,200,0.25)', 'rgba(60,160,255,0.25)'] : ['rgba(210,90,255,0.35)', 'rgba(90,255,200,0.2)', 'rgba(255,90,160,0.25)'];
    for (let i = 0; i < 9; i++) glowBlob(ctx, rng() * w, rng() * horizonY * 0.8, 50 + rng() * 80, cols[i % cols.length], 0.7);
  }
  // aurora (snow)
  if (theme.name === 'Snow') {
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = grad(ctx, 0, 10, 0, horizonY * 0.7, [[0, 'rgba(120,255,200,0)'], [0.5, `rgba(${k ? 160 : 90},255,${k ? 230 : 190},0.22)`], [1, 'rgba(120,200,255,0)']]);
      ctx.beginPath(); ctx.moveTo(0, 20 + k * 14);
      for (let x = 0; x <= w; x += 12) ctx.lineTo(x, 25 + k * 14 + Math.sin(x * 0.02 + k * 2) * 14);
      for (let x = w; x >= 0; x -= 12) ctx.lineTo(x, horizonY * 0.62 + Math.sin(x * 0.03 + k) * 10);
      ctx.closePath(); ctx.fill();
    }
  }
  // horizon glow
  ctx.fillStyle = grad(ctx, 0, horizonY - 70, 0, horizonY + 6, [[0, 'rgba(255,255,255,0)'], [1, ex.glow]]);
  ctx.fillRect(0, horizonY - 70, w, 76);
}

function paintCelestial(ctx: Ctx, w: number, h: number, theme: ThemeConfig): void {
  if (theme.celestial.type === 'none') return;
  const x = w * 0.78;
  const y = h * 0.075;
  if (theme.celestial.type === 'sun') {
    glowBlob(ctx, x, y, 110, theme.celestial.color, 0.35);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,230,160,0.06)';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a - 0.05) * 105, y + Math.sin(a - 0.05) * 105); ctx.lineTo(x + Math.cos(a + 0.05) * 105, y + Math.sin(a + 0.05) * 105); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = radial(ctx, x, y, 0, 30, [[0, '#FFFFFF'], [0.5, shadeColor(theme.celestial.color, 25)], [1, theme.celestial.color]]);
    ctx.beginPath(); ctx.arc(x, y, 28, 0, Math.PI * 2); ctx.fill();
  } else {
    glowBlob(ctx, x, y, 90, theme.celestial.shadowColor ?? theme.celestial.color, 0.45);
    ctx.fillStyle = radial(ctx, x - 8, y - 8, 4, 38, [[0, '#FFFFFF'], [1, theme.celestial.color]]);
    ctx.beginPath(); ctx.arc(x, y, 32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (const [cx, cy, r] of [[-10, -6, 7], [8, 8, 9], [10, -12, 4], [-6, 12, 5]]) { ctx.beginPath(); ctx.arc(x + cx, y + cy, r, 0, Math.PI * 2); ctx.fill(); }
  }
}

// ---------------------------------------------------------------------------
// Horizon scenery per biome
// ---------------------------------------------------------------------------

function treeLine(ctx: Ctx, w: number, baseY: number, h: number, color: string, rng: () => number, pine = false): void {
  ctx.fillStyle = color;
  for (let x = -10; x < w + 10; x += 5 + rng() * 6) {
    const th = h * (0.5 + rng() * 0.7);
    ctx.beginPath();
    if (pine) { ctx.moveTo(x - th * 0.22, baseY); ctx.lineTo(x, baseY - th); ctx.lineTo(x + th * 0.22, baseY); }
    else { ctx.arc(x, baseY - th * 0.55, th * 0.42, 0, Math.PI * 2); ctx.rect(x - 1, baseY - th * 0.3, 2, th * 0.3); }
    ctx.closePath(); ctx.fill();
  }
}

function building(ctx: Ctx, x: number, baseY: number, bw: number, bh: number, color: string, lit: string | null, rng: () => number): void {
  ctx.fillStyle = grad(ctx, x, baseY - bh, x + bw, baseY, [[0, shadeColor(color, 12)], [1, shadeColor(color, -25)]]);
  ctx.fillRect(x, baseY - bh, bw, bh);
  if (lit) {
    for (let wy = baseY - bh + 4; wy < baseY - 4; wy += 5) for (let wx = x + 2; wx < x + bw - 2; wx += 4) {
      if (rng() < 0.45) { ctx.fillStyle = lit; ctx.globalAlpha = 0.5 + rng() * 0.5; ctx.fillRect(wx, wy, 2, 2.5); }
    }
    ctx.globalAlpha = 1;
  }
}

function paintHorizon(ctx: Ctx, w: number, horizonY: number, theme: ThemeConfig, rng: () => number): void {
  const far = theme.colors.mountain.far;
  const near = theme.colors.mountain.near;
  const name = theme.name;

  switch (name) {
    case 'Grasslands': {
      ridge(ctx, w, horizonY + 2, 46, 0.012, 0.4, shadeColor(far, 4), rng);
      treeLine(ctx, w, horizonY - 14, 14, shadeColor('#4A7C59', -25), rng);
      ridge(ctx, w, horizonY + 2, 34, 0.02, 2.1, shadeColor('#5E9460', -5), rng);
      treeLine(ctx, w, horizonY - 2, 11, '#2d5a2d', rng);
      // windmill + farmhouse on the mid hill
      ctx.fillStyle = '#e9e1d0'; ctx.beginPath(); ctx.moveTo(98, horizonY - 4); ctx.lineTo(102, horizonY - 24); ctx.lineTo(108, horizonY - 24); ctx.lineTo(112, horizonY - 4); ctx.fill();
      ctx.strokeStyle = '#d9d0bd'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; ctx.beginPath(); ctx.moveTo(105, horizonY - 24); ctx.lineTo(105 + Math.cos(a) * 15, horizonY - 24 + Math.sin(a) * 15); ctx.stroke(); }
      ctx.fillStyle = '#b5523b'; ctx.fillRect(380, horizonY - 10, 18, 9); ctx.beginPath(); ctx.moveTo(378, horizonY - 10); ctx.lineTo(389, horizonY - 19); ctx.lineTo(400, horizonY - 10); ctx.fill();
      // birds
      ctx.strokeStyle = 'rgba(30,40,50,0.55)'; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) { const bx = 60 + rng() * 260; const by = 40 + rng() * 60; ctx.beginPath(); ctx.moveTo(bx - 4, by); ctx.quadraticCurveTo(bx - 2, by - 3, bx, by); ctx.quadraticCurveTo(bx + 2, by - 3, bx + 4, by); ctx.stroke(); }
      break;
    }
    case 'Desert': {
      ridge(ctx, w, horizonY + 2, 36, 0.01, 0.6, shadeColor('#D8A15A', 6), rng);
      // mesas
      ctx.fillStyle = shadeColor('#B9763C', -8);
      for (const [mx, mw, mh] of [[40, 70, 38], [330, 90, 30], [420, 50, 44]]) { ctx.beginPath(); ctx.moveTo(mx, horizonY); ctx.lineTo(mx + 6, horizonY - mh); ctx.lineTo(mx + mw - 6, horizonY - mh); ctx.lineTo(mx + mw, horizonY); ctx.fill(); }
      // pyramids
      for (const [px, ps] of [[210, 34], [250, 22]]) {
        ctx.fillStyle = grad(ctx, px, horizonY - ps, px + ps, horizonY, [[0, '#F2C679'], [0.5, '#E0A857'], [0.5, '#B77E3A'], [1, '#9A6530']]);
        ctx.beginPath(); ctx.moveTo(px - ps, horizonY); ctx.lineTo(px, horizonY - ps); ctx.lineTo(px + ps, horizonY); ctx.fill();
      }
      ridge(ctx, w, horizonY + 3, 22, 0.018, 2.4, '#E3B25E', rng);
      ridge(ctx, w, horizonY + 3, 12, 0.03, 4.2, '#EBC06A', rng);
      break;
    }
    case 'Snow': {
      // jagged ice mountains with shaded faces + snowcaps
      for (let i = 0; i < 7; i++) {
        const mx = i * 80 - 20 + rng() * 30; const mh = 50 + rng() * 45; const mw = 70 + rng() * 40;
        ctx.fillStyle = grad(ctx, mx, horizonY - mh, mx + mw, horizonY, [[0, '#E9F4FF'], [0.5, '#B9D3EA'], [0.5, '#8FB1CF'], [1, '#6F93B5']]);
        ctx.beginPath(); ctx.moveTo(mx - mw / 2, horizonY); ctx.lineTo(mx - 8, horizonY - mh * 0.65); ctx.lineTo(mx, horizonY - mh); ctx.lineTo(mx + 10, horizonY - mh * 0.7); ctx.lineTo(mx + mw / 2, horizonY); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.moveTo(mx - 12, horizonY - mh * 0.72); ctx.lineTo(mx, horizonY - mh); ctx.lineTo(mx + 12, horizonY - mh * 0.74); ctx.lineTo(mx + 4, horizonY - mh * 0.66); ctx.lineTo(mx - 3, horizonY - mh * 0.72); ctx.fill();
      }
      treeLine(ctx, w, horizonY + 1, 18, '#3f6b62', rng, true);
      treeLine(ctx, w, horizonY + 3, 12, '#2f5a55', rng, true);
      ridge(ctx, w, horizonY + 4, 8, 0.03, 1, '#F4FAFF', rng);
      break;
    }
    case 'Toxic': {
      ridge(ctx, w, horizonY + 2, 24, 0.015, 1.4, '#41621F', rng);
      // factory skyline
      for (let i = 0; i < 9; i++) building(ctx, 10 + i * 52 + rng() * 14, horizonY, 18 + rng() * 22, 14 + rng() * 26, '#2c3a1d', 'rgba(190,255,80,0.9)', rng);
      for (const cx of [60, 200, 360]) { // chimneys + smoke
        ctx.fillStyle = '#3a4a22'; ctx.fillRect(cx, horizonY - 52, 7, 52); ctx.fillStyle = '#b6ff3c'; ctx.fillRect(cx, horizonY - 52, 7, 3);
        for (let k = 0; k < 5; k++) glowBlob(ctx, cx + 4 + k * 7, horizonY - 58 - k * 11, 14 + k * 4, 'rgba(150,220,70,0.5)', 0.55);
      }
      // cooling towers
      ctx.fillStyle = '#334523'; for (const tx of [130, 300]) { ctx.beginPath(); ctx.moveTo(tx - 16, horizonY); ctx.quadraticCurveTo(tx - 8, horizonY - 18, tx - 11, horizonY - 34); ctx.lineTo(tx + 11, horizonY - 34); ctx.quadraticCurveTo(tx + 8, horizonY - 18, tx + 16, horizonY); ctx.fill(); }
      break;
    }
    case 'Candy': {
      ridge(ctx, w, horizonY + 2, 40, 0.014, 0.8, '#FFB3D9', rng);
      ridge(ctx, w, horizonY + 2, 28, 0.02, 2.5, '#FF8FC7', rng);
      // stripes on hills
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
      for (let i = 0; i < 16; i++) { const sx = i * 32 + rng() * 10; ctx.beginPath(); ctx.moveTo(sx, horizonY - 4); ctx.quadraticCurveTo(sx + 10, horizonY - 24, sx + 20, horizonY - 8); ctx.stroke(); }
      // lollipop trees + gingerbread house
      for (let i = 0; i < 8; i++) {
        const lx = 20 + i * 62 + rng() * 20; const ly = horizonY - 6 - rng() * 6; const col = ['#FF5FA2', '#FFD93D', '#6BCBFF', '#B28DFF'][i % 4];
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly - 18); ctx.stroke();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(lx, ly - 22, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(lx, ly - 22, 4.5, 0, Math.PI * 1.6); ctx.stroke();
      }
      ctx.fillStyle = '#9C5B3A'; ctx.fillRect(250, horizonY - 14, 24, 12); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(246, horizonY - 14); ctx.lineTo(262, horizonY - 28); ctx.lineTo(278, horizonY - 14); ctx.fill();
      break;
    }
    case 'Ocean': {
      ctx.fillStyle = grad(ctx, 0, horizonY - 10, 0, horizonY + 4, [[0, '#5CC0F0'], [1, '#2B8BC9']]); ctx.fillRect(0, horizonY - 10, w, 14);
      // islands + palms
      for (const [ix, iw] of [[70, 90], [330, 120]]) {
        ctx.fillStyle = '#2f7a4a'; ctx.beginPath(); ctx.ellipse(ix, horizonY - 2, iw / 2, 12, 0, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ix, horizonY - 8); ctx.quadraticCurveTo(ix + 4, horizonY - 20, ix + 2, horizonY - 28); ctx.stroke();
        ctx.fillStyle = '#2b9a52'; for (const a of [-2.6, -1.9, -1.2, -0.5]) { ctx.beginPath(); ctx.ellipse(ix + 2 + Math.cos(a) * 7, horizonY - 28 + Math.sin(a) * 4, 8, 2.2, a, 0, Math.PI * 2); ctx.fill(); }
      }
      // lighthouse
      ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.moveTo(410, horizonY - 2); ctx.lineTo(414, horizonY - 34); ctx.lineTo(422, horizonY - 34); ctx.lineTo(426, horizonY - 2); ctx.fill();
      ctx.fillStyle = '#e74c3c'; ctx.fillRect(413, horizonY - 22, 10, 5); ctx.fillStyle = '#FFE066'; ctx.fillRect(414, horizonY - 40, 8, 6);
      glowBlob(ctx, 418, horizonY - 37, 22, 'rgba(255,240,150,0.7)', 0.8);
      // sailboats
      for (const [bx, by] of [[200, horizonY - 3], [260, horizonY - 2]]) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(bx, by - 14); ctx.lineTo(bx + 8, by - 2); ctx.lineTo(bx, by - 2); ctx.fill(); ctx.fillStyle = '#6b4a2e'; ctx.fillRect(bx - 6, by - 2, 16, 2.5); }
      // sun glitter
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 40; i++) ctx.fillRect(w * 0.7 + rng() * 80, horizonY - 8 + rng() * 10, 6 * rng() + 1, 1);
      break;
    }
    case 'Hell': {
      ridge(ctx, w, horizonY + 2, 44, 0.013, 0.2, '#3a0d0a', rng, 6);
      // volcanoes with lava
      for (const [vx, vw, vh] of [[90, 120, 70], [360, 150, 80]]) {
        ctx.fillStyle = grad(ctx, vx, horizonY - vh, vx, horizonY, [[0, '#1c0806'], [1, '#4a130c']]);
        ctx.beginPath(); ctx.moveTo(vx - vw / 2, horizonY); ctx.lineTo(vx - 14, horizonY - vh); ctx.lineTo(vx + 14, horizonY - vh); ctx.lineTo(vx + vw / 2, horizonY); ctx.fill();
        glowBlob(ctx, vx, horizonY - vh, 40, 'rgba(255,120,30,0.9)', 0.9);
        ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 2; ctx.shadowColor = '#ff5a00'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.moveTo(vx - 8, horizonY - vh + 2); ctx.quadraticCurveTo(vx - 20, horizonY - vh * 0.5, vx - 34, horizonY); ctx.moveTo(vx + 6, horizonY - vh + 2); ctx.quadraticCurveTo(vx + 14, horizonY - vh * 0.4, vx + 26, horizonY); ctx.stroke(); ctx.shadowBlur = 0;
        for (let k = 0; k < 4; k++) glowBlob(ctx, vx + k * 6 - 8, horizonY - vh - 14 - k * 12, 16 + k * 5, 'rgba(60,20,16,0.8)', 0.6); // ash plume
      }
      // spires
      ctx.fillStyle = '#1a0605'; for (let i = 0; i < 14; i++) { const sx = i * 36 + rng() * 14; const sh = 14 + rng() * 26; ctx.beginPath(); ctx.moveTo(sx - 5, horizonY); ctx.lineTo(sx, horizonY - sh); ctx.lineTo(sx + 5, horizonY); ctx.fill(); }
      break;
    }
    case 'Cyber': {
      for (let layer = 0; layer < 2; layer++) {
        const col = layer === 0 ? '#1a1240' : '#120a30'; const litCol = layer === 0 ? 'rgba(0,240,255,0.9)' : 'rgba(255,60,220,0.9)';
        for (let x = -10; x < w; x += 16 + rng() * 14) building(ctx, x, horizonY + (layer ? 0 : -2), 14 + rng() * 22, (layer ? 20 : 34) + rng() * (layer ? 36 : 56), col, litCol, rng);
      }
      // antennas, neon signs
      ctx.strokeStyle = '#2a2060'; ctx.lineWidth = 1; for (const ax of [60, 180, 300, 420]) { ctx.beginPath(); ctx.moveTo(ax, horizonY - 60); ctx.lineTo(ax, horizonY - 88); ctx.stroke(); glowBlob(ctx, ax, horizonY - 88, 5, 'rgba(255,60,60,1)', 1); }
      for (const [sx, col] of [[100, '#00F0FF'], [250, '#FF2BD6'], [380, '#7DFF9B']] as const) { ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 8; ctx.fillRect(sx, horizonY - 46 - rng() * 14, 14, 3); ctx.shadowBlur = 0; }
      break;
    }
    case 'Space': {
      // ringed planet
      const px = 120, py = horizonY - 70;
      glowBlob(ctx, px, py, 80, 'rgba(120,90,255,0.35)', 0.9);
      ctx.fillStyle = radial(ctx, px - 14, py - 14, 4, 52, [[0, '#E8C8FF'], [0.5, '#8A5BE0'], [1, '#2B1670']]); ctx.beginPath(); ctx.arc(px, py, 44, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,220,255,0.65)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(px, py, 78, 16, -0.35, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(180,140,255,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(px, py, 66, 12, -0.35, 0, Math.PI * 2); ctx.stroke();
      // moon + station
      ctx.fillStyle = radial(ctx, 372, horizonY - 38, 2, 22, [[0, '#FFFFFF'], [1, '#8d97b8']]); ctx.beginPath(); ctx.arc(375, horizonY - 36, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9aa6c8'; ctx.fillRect(290, horizonY - 46, 22, 4); ctx.fillRect(298, horizonY - 54, 6, 20); ctx.fillStyle = '#4ad0ff'; ctx.fillRect(285, horizonY - 48, 8, 8); ctx.fillRect(309, horizonY - 48, 8, 8);
      // asteroid ridge
      ridge(ctx, w, horizonY + 2, 14, 0.04, 3.1, '#1b1240', rng, 6);
      break;
    }
    case 'Alien': {
      ridge(ctx, w, horizonY + 2, 22, 0.02, 0.3, '#2a0a3a', rng, 4);
      // floating rock islands with glowing crystals
      for (const [fx, fy, fs] of [[90, horizonY - 78, 34], [250, horizonY - 96, 26], [390, horizonY - 66, 38]]) {
        ctx.fillStyle = grad(ctx, fx, fy, fx, fy + fs, [[0, '#5b3a78'], [1, '#2a1640']]);
        ctx.beginPath(); ctx.moveTo(fx - fs, fy); ctx.quadraticCurveTo(fx, fy - fs * 0.3, fx + fs, fy); ctx.lineTo(fx + fs * 0.4, fy + fs * 0.9); ctx.lineTo(fx, fy + fs * 0.6); ctx.lineTo(fx - fs * 0.5, fy + fs * 0.8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#8BFFEA'; ctx.shadowColor = '#8BFFEA'; ctx.shadowBlur = 10;
        for (const dx of [-0.4, 0, 0.35]) { ctx.beginPath(); ctx.moveTo(fx + dx * fs - 3, fy - 1); ctx.lineTo(fx + dx * fs, fy - fs * (0.4 + Math.abs(dx) * 0.3)); ctx.lineTo(fx + dx * fs + 3, fy - 1); ctx.fill(); }
        ctx.shadowBlur = 0;
      }
      // tentacle spires
      ctx.strokeStyle = '#3d1257'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const sx = 20 + i * 64 + rng() * 20; ctx.beginPath(); ctx.moveTo(sx, horizonY); ctx.bezierCurveTo(sx + 14, horizonY - 14, sx - 12, horizonY - 28, sx + 8, horizonY - 40 - rng() * 14); ctx.stroke(); glowBlob(ctx, sx + 8, horizonY - 44, 6, 'rgba(255,123,229,0.9)', 0.9); }
      break;
    }
    default:
      ridge(ctx, w, horizonY + 2, 36, 0.02, 0, near, rng);
  }
  void far;
}

// ---------------------------------------------------------------------------
// Ground texture
// ---------------------------------------------------------------------------

function speckle(ctx: Ctx, w: number, y0: number, y1: number, count: number, rng: () => number, light: string, dark: string): void {
  for (let i = 0; i < count; i++) {
    const y = y0 + Math.pow(rng(), 0.8) * (y1 - y0);
    const depth = (y - y0) / (y1 - y0);
    const sz = 0.6 + depth * 2.2 * rng();
    ctx.fillStyle = rng() < 0.5 ? light : dark;
    ctx.globalAlpha = 0.12 + rng() * 0.22;
    ctx.fillRect(rng() * w, y, sz * 1.6, sz);
  }
  ctx.globalAlpha = 1;
}

function paintGround(ctx: Ctx, w: number, h: number, horizonY: number, theme: ThemeConfig, rng: () => number): void {
  const [g0, g1] = theme.colors.ground;
  ctx.fillStyle = grad(ctx, 0, horizonY, 0, h, [[0, shadeColor(g0, 10)], [0.35, g0], [1, shadeColor(g1, -12)]]);
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // large soft tonal blotches for variation
  for (let i = 0; i < 26; i++) {
    const y = horizonY + 20 + rng() * (h - horizonY - 20);
    glowBlob(ctx, rng() * w, y, 30 + rng() * 60 * ((y - horizonY) / (h - horizonY) + 0.4), rng() < 0.5 ? shadeColor(g1, 22) : shadeColor(g0, -22), 0.16);
  }
  speckle(ctx, w, horizonY, h, 2200, rng, shadeColor(g1, 35), shadeColor(g0, -40));

  const name = theme.name;
  const span = h - horizonY;
  const at = (rng_: () => number) => { const t = Math.pow(rng_(), 1.3); return { y: horizonY + 6 + t * (span - 6), t }; };

  if (name === 'Grasslands' || name === 'Candy' || name === 'Toxic' || name === 'Alien') {
    // tufts / blades
    for (let i = 0; i < 700; i++) {
      const { y, t } = at(rng); const x = rng() * w; const len = 2 + t * 9;
      const col = name === 'Grasslands' ? (rng() < 0.5 ? '#6FB26A' : '#2f6a3c') : name === 'Candy' ? ['#FF9ACB', '#FFE08A', '#9BE7FF'][i % 3] : name === 'Toxic' ? (rng() < 0.5 ? '#C8FF5A' : '#3d6b1a') : (rng() < 0.5 ? '#C06BFF' : '#5AFFD9');
      ctx.strokeStyle = col; ctx.globalAlpha = 0.35 + rng() * 0.4; ctx.lineWidth = 0.6 + t * 1.1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + (rng() - 0.5) * 3, y - len * 0.6, x + (rng() - 0.5) * 5, y - len); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  if (name === 'Grasslands') { // wildflowers
    for (let i = 0; i < 160; i++) { const { y, t } = at(rng); ctx.fillStyle = ['#FFFFFF', '#FFD93D', '#FF7BAC', '#B28DFF'][i % 4]; ctx.beginPath(); ctx.arc(rng() * w, y, 0.7 + t * 1.6, 0, Math.PI * 2); ctx.fill(); }
  }
  if (name === 'Desert') { // dune ripples + pebbles
    ctx.strokeStyle = 'rgba(120,70,20,0.25)'; ctx.lineWidth = 1;
    for (let y = horizonY + 8; y < h; y += 7 + (y - horizonY) * 0.06) { ctx.beginPath(); for (let x = 0; x <= w; x += 18) { const yy = y + Math.sin(x * 0.04 + y * 0.3) * (1 + (y - horizonY) * 0.012); if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,240,200,0.18)'; for (let y = horizonY + 11; y < h; y += 14 + (y - horizonY) * 0.08) { ctx.beginPath(); for (let x = 0; x <= w; x += 20) { const yy = y + Math.sin(x * 0.03 + y) * 2; if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke(); }
    for (let i = 0; i < 90; i++) { const { y, t } = at(rng); ctx.fillStyle = 'rgba(90,55,30,0.55)'; ctx.beginPath(); ctx.ellipse(rng() * w, y, 1 + t * 3, 0.6 + t * 1.6, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  if (name === 'Snow') { // drifts + sparkle
    for (let i = 0; i < 40; i++) { const { y, t } = at(rng); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(rng() * w, y, 20 + t * 70, 3 + t * 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(120,160,210,0.18)'; ctx.beginPath(); ctx.ellipse(rng() * w, y + 4 + t * 4, 18 + t * 60, 2 + t * 6, 0, 0, Math.PI * 2); ctx.fill(); }
    for (let i = 0; i < 160; i++) { const { y, t } = at(rng); ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 0.5 + rng() * 0.5; const x = rng() * w; ctx.fillRect(x - 0.5, y - t * 1.2, 1, 2 + t * 2); ctx.fillRect(x - t * 1.2, y - 0.5, 2 + t * 2, 1); }
    ctx.globalAlpha = 1;
  }
  if (name === 'Toxic') { // glowing puddles
    for (let i = 0; i < 16; i++) { const { y, t } = at(rng); const x = rng() * w; const rw = 10 + t * 38; ctx.fillStyle = 'rgba(70,160,20,0.65)'; ctx.beginPath(); ctx.ellipse(x, y, rw, rw * 0.32, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(200,255,90,0.7)'; ctx.lineWidth = 1 + t; ctx.stroke(); glowBlob(ctx, x, y, rw * 1.5, 'rgba(160,255,60,0.5)', 0.4); }
  }
  if (name === 'Ocean') { // shallow water: sun-glints, foam lines
    for (let y = horizonY + 10; y < h; y += 9 + (y - horizonY) * 0.12) { ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1 + (y - horizonY) * 0.004; ctx.beginPath(); for (let x = 0; x <= w; x += 14) { const yy = y + Math.sin(x * 0.05 + y) * 2; if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); } ctx.stroke(); }
    for (let i = 0; i < 220; i++) { const { y, t } = at(rng); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(rng() * w, y, 2 + t * 6, 0.8 + t); }
  }
  if (name === 'Hell') { // cracked basalt + lava veins
    ctx.lineCap = 'round';
    for (let i = 0; i < 46; i++) { const { y, t } = at(rng); let x = rng() * w; let yy = y; ctx.beginPath(); ctx.moveTo(x, yy); for (let k = 0; k < 6; k++) { x += (rng() - 0.5) * (14 + t * 30); yy += (rng() - 0.3) * (5 + t * 14); ctx.lineTo(x, yy); } ctx.strokeStyle = '#ff6a10'; ctx.shadowColor = '#ff4a00'; ctx.shadowBlur = 8; ctx.lineWidth = 0.8 + t * 2; ctx.globalAlpha = 0.85; ctx.stroke(); }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    for (let i = 0; i < 120; i++) { const { y, t } = at(rng); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(rng() * w, y, 2 + t * 8, 1 + t * 3, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  if (name === 'Cyber') { // glowing grid + circuit traces
    ctx.strokeStyle = 'rgba(0,240,255,0.45)'; ctx.lineWidth = 1; ctx.shadowColor = '#00F0FF'; ctx.shadowBlur = 4;
    for (let x = -w; x < w * 2; x += 44) { ctx.beginPath(); ctx.moveTo(x, horizonY); ctx.lineTo((x - w / 2) * 4.2 + w / 2, h); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,43,214,0.4)';
    for (let k = 0, y = horizonY + 3; y < h; k++, y += 3 + k * 3.2) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.shadowBlur = 0;
  }
  if (name === 'Space') { // moon dust + craters
    for (let i = 0; i < 38; i++) { const { y, t } = at(rng); const x = rng() * w; const r = 4 + t * 24; ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.34, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1 + t; ctx.beginPath(); ctx.ellipse(x, y - r * 0.05, r, r * 0.34, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }
  }
  if (name === 'Alien') { // bioluminescent veins + spores
    ctx.lineCap = 'round';
    for (let i = 0; i < 30; i++) { const { y, t } = at(rng); let x = rng() * w; let yy = y; ctx.beginPath(); ctx.moveTo(x, yy); for (let k = 0; k < 5; k++) { x += (rng() - 0.5) * (18 + t * 30); yy += (rng() - 0.4) * (6 + t * 12); ctx.lineTo(x, yy); } ctx.strokeStyle = 'rgba(120,255,225,0.7)'; ctx.shadowColor = '#5AFFD9'; ctx.shadowBlur = 6; ctx.lineWidth = 0.7 + t * 1.6; ctx.stroke(); }
    ctx.shadowBlur = 0;
    for (let i = 0; i < 60; i++) { const { y, t } = at(rng); glowBlob(ctx, rng() * w, y, 4 + t * 12, ['rgba(255,123,229,0.9)', 'rgba(139,255,234,0.9)'][i % 2], 0.8); }
  }

  // aerial perspective: fade into horizon haze
  const ex = SKY_EXTRA[name];
  ctx.fillStyle = grad(ctx, 0, horizonY, 0, horizonY + 90, [[0, ex ? ex.glow : 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);
  ctx.fillRect(0, horizonY, w, 90);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Paints sky, celestial body, horizon scenery and ground into a (logical) w x h space. */
export function paintBiomeScene(ctx: Ctx, w: number, h: number, horizonY: number, theme: ThemeConfig): void {
  const rng = mulberry32(hash(theme.name));
  paintSky(ctx, w, horizonY, theme, rng);
  paintCelestial(ctx, w, h, theme);
  paintHorizon(ctx, w, horizonY, theme, rng);
  paintGround(ctx, w, h, horizonY, theme, rng);
}

/** Wear, cracks, ruts, reflectors... painted over the road trapezoid after the base road is drawn. */
export function paintRoadDetail(ctx: Ctx, w: number, h: number, horizonY: number, theme: ThemeConfig): void {
  const rng = mulberry32(hash(theme.name) ^ 0x9e3779b9);
  const topHalf = w * 0.09;
  const botHalf = w * 0.475;
  const half = (y: number) => topHalf + (botHalf - topHalf) * ((y - horizonY) / (h - horizonY));

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(w / 2 - topHalf, horizonY); ctx.lineTo(w / 2 + topHalf, horizonY); ctx.lineTo(w / 2 + botHalf, h); ctx.lineTo(w / 2 - botHalf, h); ctx.closePath();
  ctx.clip();

  const span = h - horizonY;
  const spot = () => { const t = Math.pow(rng(), 1.25); const y = horizonY + 4 + t * (span - 4); const hw = half(y); return { y, t, x: w / 2 + (rng() * 2 - 1) * hw }; };
  const type = theme.roadType;

  // grain
  for (let i = 0; i < 2600; i++) { const p = spot(); ctx.fillStyle = rng() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.16)'; ctx.fillRect(p.x, p.y, 0.8 + p.t * 2.2, 0.6 + p.t * 1.4); }

  // tire-wear lanes (darker polished bands)
  for (const off of [-0.42, 0.42]) {
    ctx.fillStyle = grad(ctx, 0, horizonY, 0, h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.20)']]);
    ctx.beginPath(); ctx.moveTo(w / 2 + off * topHalf - topHalf * 0.12, horizonY); ctx.lineTo(w / 2 + off * topHalf + topHalf * 0.12, horizonY);
    ctx.lineTo(w / 2 + off * botHalf + botHalf * 0.12, h); ctx.lineTo(w / 2 + off * botHalf - botHalf * 0.12, h); ctx.closePath(); ctx.fill();
  }

  if (type === 'asphalt' || type === 'brick') {
    // cracks + patches + oil
    ctx.lineCap = 'round';
    for (let i = 0; i < 26; i++) { const p = spot(); let x = p.x, y = p.y; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rng() - 0.5) * (8 + p.t * 22); y += (rng() - 0.2) * (4 + p.t * 12); ctx.lineTo(x, y); } ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 0.6 + p.t * 1.4; ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 0.5; ctx.stroke(); }
    for (let i = 0; i < 9; i++) { const p = spot(); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(p.x, p.y, 10 + p.t * 40, 5 + p.t * 22); }
    for (let i = 0; i < 5; i++) { const p = spot(); ctx.fillStyle = 'rgba(10,10,18,0.5)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 4 + p.t * 20, 2 + p.t * 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(150,170,255,0.18)'; ctx.beginPath(); ctx.ellipse(p.x - 1, p.y - 1, 3 + p.t * 14, 1 + p.t * 5, 0, 0, Math.PI * 2); ctx.fill(); }
    if (type === 'brick') { // mortar in perspective
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
      for (let y = horizonY + 4, k = 0; y < h; k++, y += 4 + k * 2.2) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      for (let i = -9; i <= 9; i++) { ctx.beginPath(); ctx.moveTo(w / 2 + i * topHalf / 4.5, horizonY); ctx.lineTo(w / 2 + i * botHalf / 4.5, h); ctx.stroke(); }
    }
  } else if (type === 'dirt') { // ruts, stones
    for (const off of [-0.38, 0.38]) { ctx.strokeStyle = 'rgba(40,20,5,0.45)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(w / 2 + off * topHalf, horizonY); ctx.lineTo(w / 2 + off * botHalf, h); ctx.stroke(); ctx.strokeStyle = 'rgba(255,220,170,0.12)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    for (let i = 0; i < 160; i++) { const p = spot(); ctx.fillStyle = 'rgba(70,45,25,0.6)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 0.8 + p.t * 3, 0.5 + p.t * 1.8, 0, 0, Math.PI * 2); ctx.fill(); }
  } else if (type === 'ice') { // frost cracks + glassy sheen
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    for (let i = 0; i < 30; i++) { const p = spot(); let x = p.x, y = p.y; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (rng() - 0.5) * (10 + p.t * 30); y += (rng() - 0.5) * (6 + p.t * 16); ctx.lineTo(x, y); } ctx.lineWidth = 0.5 + p.t; ctx.stroke(); }
    ctx.fillStyle = grad(ctx, 0, horizonY, 0, h, [[0, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(0, horizonY, w, span);
  } else if (type === 'holographic') { // neon chevrons
    ctx.strokeStyle = 'rgba(0,240,255,0.5)'; ctx.shadowColor = '#00F0FF'; ctx.shadowBlur = 6;
    for (let y = horizonY + 12, k = 0; y < h; k++, y += 14 + k * 9) { const hw = half(y) * 0.35; ctx.lineWidth = 1 + k * 0.5; ctx.beginPath(); ctx.moveTo(w / 2 - hw, y + hw * 0.4); ctx.lineTo(w / 2, y); ctx.lineTo(w / 2 + hw, y + hw * 0.4); ctx.stroke(); }
    ctx.shadowBlur = 0;
  } else if (type === 'alien') { // organic veins
    ctx.lineCap = 'round';
    for (let i = 0; i < 24; i++) { const p = spot(); let x = p.x, y = p.y; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rng() - 0.5) * (14 + p.t * 30); y += (rng() - 0.3) * (6 + p.t * 16); ctx.lineTo(x, y); } ctx.strokeStyle = 'rgba(255,123,229,0.65)'; ctx.shadowColor = '#FF7BE5'; ctx.shadowBlur = 6; ctx.lineWidth = 0.6 + p.t * 1.6; ctx.stroke(); }
    ctx.shadowBlur = 0;
  }

  // wet gloss toward the horizon
  ctx.fillStyle = grad(ctx, 0, horizonY, 0, horizonY + span * 0.5, [[0, 'rgba(255,255,255,0.10)'], [1, 'rgba(255,255,255,0)']]);
  ctx.fillRect(0, horizonY, w, span * 0.5);
  ctx.restore();

  // side reflectors / posts along both edges (perspective-scaled)
  for (let t = 0.06, k = 0; t < 1; k++, t += 0.07 + k * 0.012) {
    const y = horizonY + t * span; const hw = half(y); const sz = 1 + t * 5;
    for (const side of [-1, 1]) {
      const x = w / 2 + side * (hw + 4 + t * 6);
      if (type === 'asphalt' || type === 'brick') { ctx.fillStyle = '#d7dbe2'; ctx.fillRect(x - sz / 2, y - sz * 3, sz, sz * 3); ctx.fillStyle = '#e74c3c'; ctx.fillRect(x - sz / 2, y - sz * 3, sz, sz * 0.8); }
      else if (type === 'holographic') { ctx.fillStyle = '#00F0FF'; ctx.shadowColor = '#00F0FF'; ctx.shadowBlur = 6; ctx.fillRect(x - sz / 2, y - sz * 2, sz, sz * 2); ctx.shadowBlur = 0; }
      else if (type === 'alien') { glowBlob(ctx, x, y - sz * 2, sz * 3, 'rgba(139,255,234,0.9)', 0.9); }
    }
  }
}
