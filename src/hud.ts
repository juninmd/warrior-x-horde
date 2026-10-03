// hud.ts - In-canvas HUD (chapter/progress bar, score, coins, active perks, army panel).
// Layout leaves the right column free for the DOM shop rail / controls and the bottom-left for the SUPER button.
import { BASE_WIDTH, BASE_HEIGHT, FONT_FAMILY } from './constants';
import type { GameState } from './types';
import { getChapter } from './story';
import { getTakenPerks, getShieldCharges } from './perks';
import { QualityManager } from './quality';

type Ctx = CanvasRenderingContext2D;

// --- animated display values -------------------------------------------------
export interface HudAnim {
  score: number;
  coins: number;
  lastCoins: number;
  coinPop: number;       // 0..1 pulse after a coin gain
  lastArmy: number;
  armyDelta: number;
  armyDeltaAge: number;  // seconds since the last change
  last: number;
}

export const hudAnim: HudAnim = { score: 0, coins: 0, lastCoins: 0, coinPop: 0, lastArmy: -1, armyDelta: 0, armyDeltaAge: 99, last: 0 };

export function resetHudAnim(): void {
  hudAnim.score = 0; hudAnim.coins = 0; hudAnim.lastCoins = 0; hudAnim.coinPop = 0;
  hudAnim.lastArmy = -1; hudAnim.armyDelta = 0; hudAnim.armyDeltaAge = 99; hudAnim.last = 0;
}

/** Advances the count-up tweens. `now` in ms. Exported for tests. */
export function stepHudAnim(gs: GameState, armyCount: number, now: number): void {
  const dt = hudAnim.last ? Math.min(0.1, (now - hudAnim.last) / 1000) : 0;
  hudAnim.last = now;
  // count-up: close ~18% of the gap per frame at 60fps, never overshoot
  const k = 1 - Math.pow(0.0005, dt);
  hudAnim.score += (gs.score - hudAnim.score) * k;
  if (Math.abs(gs.score - hudAnim.score) < 0.5) hudAnim.score = gs.score;
  hudAnim.coins += (gs.coins - hudAnim.coins) * k;
  if (Math.abs(gs.coins - hudAnim.coins) < 0.5) hudAnim.coins = gs.coins;
  if (gs.coins > hudAnim.lastCoins) hudAnim.coinPop = 1;
  hudAnim.lastCoins = gs.coins;
  hudAnim.coinPop = Math.max(0, hudAnim.coinPop - dt * 3);
  if (hudAnim.lastArmy >= 0 && armyCount !== hudAnim.lastArmy) {
    hudAnim.armyDelta = armyCount - hudAnim.lastArmy;
    hudAnim.armyDeltaAge = 0;
  }
  hudAnim.lastArmy = armyCount;
  hudAnim.armyDeltaAge += dt;
}

export function fmtNum(n: number): string {
  return Math.floor(n).toLocaleString('pt-BR');
}

export function rankFor(score: number): { rank: string; color: string } {
  if (score >= 5000) return { rank: 'S', color: '#FFD700' };
  if (score >= 3000) return { rank: 'A', color: '#B56BFF' };
  if (score >= 1000) return { rank: 'B', color: '#4AA3FF' };
  if (score >= 500) return { rank: 'C', color: '#2ECC71' };
  return { rank: 'D', color: '#8a96a3' };
}

// --- drawing helpers ---------------------------------------------------------
function glass(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, accent: string): void {
  ctx.fillStyle = 'rgba(8, 12, 24, 0.66)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(0.5, 'rgba(255,255,255,0.02)'); g.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = accent; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.stroke(); ctx.globalAlpha = 1;
}

function text(ctx: Ctx, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', weight = 800, stroke = true): void {
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke && typeof ctx.strokeText === 'function') { ctx.lineWidth = Math.max(2, size * 0.2); ctx.strokeStyle = 'rgba(5,8,18,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}

// --- sections ----------------------------------------------------------------
export function drawProgress(ctx: Ctx, gs: GameState, now: number): void {
  const x = 18, y = 12, w = BASE_WIDTH - 36, h = 10;
  const p = Math.max(0, Math.min(1, gs.distanceTraveled / Math.max(1, gs.levelDistance)));

  ctx.fillStyle = 'rgba(6,10,22,0.7)'; ctx.beginPath(); ctx.roundRect(x - 2, y - 2, w + 4, h + 4, 8); ctx.fill();
  const fill = ctx.createLinearGradient(x, 0, x + w, 0);
  fill.addColorStop(0, '#00C9FF'); fill.addColorStop(0.55, '#5CF0A8'); fill.addColorStop(1, '#FFD84A');
  ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, Math.max(h, w * p), h, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.roundRect(x, y, Math.max(h, w * p), h / 2, 5); ctx.fill();

  // milestones: radio call (50%) and boss (90%)
  const milestone = (at: number, icon: string, reached: boolean) => {
    const mx = x + w * at;
    ctx.fillStyle = reached ? '#FFD84A' : 'rgba(255,255,255,0.35)';
    ctx.fillRect(mx - 1, y - 3, 2, h + 6);
    ctx.font = `12px ${FONT_FAMILY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = reached ? 1 : 0.75; ctx.fillText(icon, mx, y + h + 11); ctx.globalAlpha = 1;
  };
  milestone(0.5, '📻', p >= 0.5);
  milestone(0.9, '💀', p >= 0.9);

  // runner marker
  const mx = x + w * p;
  const pulse = 1 + Math.sin(now * 0.008) * 0.12;
  ctx.fillStyle = '#fff';
  if (QualityManager.getInstance().settings.enableShadows) { ctx.shadowColor = '#00C9FF'; ctx.shadowBlur = 8; }
  ctx.beginPath(); ctx.arc(mx, y + h / 2, 5.5 * pulse, 0, Math.PI * 2); ctx.fill();
  if (QualityManager.getInstance().settings.enableShadows) ctx.shadowBlur = 0;
}

export function drawChapterChip(ctx: Ctx, level: number): void {
  const ch = getChapter(level);
  const label = level <= 10 ? `CAP. ${level} · ${ch.place.toUpperCase()}` : `INFINITO ${level - 10} · ${ch.place.toUpperCase()}`;
  const w = Math.min(BASE_WIDTH - 140, label.length * 6.9 + 24); // estimated text width (no measureText: cheap + mock-friendly)
  glass(ctx, 18, 44, w, 20, 10, '#00C9FF');
  text(ctx, label, 18 + w / 2, 54.5, 11, '#CFEFFF', 'center', 800, false);
}

export function drawRank(ctx: Ctx, rank: string, color: string, now: number): void {
  ctx.save();
  ctx.translate(40, 112);
  if (rank === 'S' || rank === 'A') { const p = 1 + Math.sin(now * 0.005) * 0.06; ctx.scale(p, p); }
  // glow (skipped without post-processing)
  if (QualityManager.getInstance().settings.enablePostProcessing) {
    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 34);
    glow.addColorStop(0, color); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.35; ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }
  // medal
  const g = ctx.createLinearGradient(0, -22, 0, 22);
  g.addColorStop(0, '#2b3347'); g.addColorStop(1, '#0c101c');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 23, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 3.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 18, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
  text(ctx, rank, 0, 1.5, 26, color, 'center', 900);
  ctx.restore();
}

export function drawScoreBlock(ctx: Ctx, gs: GameState, now: number): void {
  const x = 76;
  text(ctx, 'PONTOS', x, 84, 10, '#9fb0cc', 'left', 800, false);
  text(ctx, fmtNum(hudAnim.score), x, 106, 28, '#FFFFFF', 'left', 900);

  if (gs.highScore > 0) {
    const beaten = gs.score > gs.highScore;
    const close = !beaten && gs.score > gs.highScore * 0.9;
    const label = beaten ? '👑 NOVO RECORDE!' : `👑 RECORDE ${fmtNum(gs.highScore)}`;
    const col = beaten ? (Math.floor(now / 250) % 2 ? '#FFD700' : '#FF9A3D') : close ? (Math.floor(now / 200) % 2 ? '#FF6A3D' : '#d9dfeb') : '#c9a227';
    text(ctx, label, x, 128, 12, col, 'left', 800);
  }

  if (gs.combo > 1) { // multiplier chip next to the score
    const mult = (1 + gs.combo * 0.05).toFixed(2);
    const px = 214;
    const pulse = 1 + Math.sin(now * 0.012) * 0.06;
    ctx.save(); ctx.translate(px, 100); ctx.scale(pulse, pulse);
    glass(ctx, -4, -13, 66, 26, 13, '#FFD700');
    text(ctx, `x${mult}`, 29, 0.5, 17, '#FFD700', 'center', 900);
    ctx.restore();
  }
}

export function drawCoins(ctx: Ctx): void {
  const w = 108, h = 30, x = 276, y = 66;
  const pop = hudAnim.coinPop;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(1 + pop * 0.18, 1 + pop * 0.18);
  ctx.translate(-(x + w / 2), -(y + h / 2));
  glass(ctx, x, y, w, h, 15, pop > 0 ? '#FFE680' : '#F1C40F');
  // coin
  if (QualityManager.getInstance().settings.enablePostProcessing) {
    const g = ctx.createRadialGradient(x + 17, y + 13, 1, x + 17, y + 15, 12);
    g.addColorStop(0, '#FFF3B0'); g.addColorStop(0.6, '#FFC928'); g.addColorStop(1, '#B8860B');
    ctx.fillStyle = g;
  } else ctx.fillStyle = '#FFC928'; ctx.beginPath(); ctx.arc(x + 17, y + 15, 10, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7a5a06'; ctx.lineWidth = 1.5; ctx.stroke();
  text(ctx, '$', x + 17, y + 15.5, 12, '#7a5a06', 'center', 900, false);
  text(ctx, fmtNum(hudAnim.coins), x + 34, y + 15.5, 18, '#FFE680', 'left', 900);
  ctx.restore();
}

export function drawPerkRow(ctx: Ctx): void {
  const perks = getTakenPerks();
  const shield = getShieldCharges();
  if (perks.length === 0 && shield === 0) return;
  let x = 18;
  const y = 146;
  ctx.font = `14px ${FONT_FAMILY}`;
  for (const { perk, count } of perks) {
    const label = count > 1 ? `${perk.icon}×${count}` : perk.icon;
    const w = count > 1 ? 40 : 28;
    glass(ctx, x, y, w, 22, 11, '#7aa7ff');
    ctx.font = `13px ${FONT_FAMILY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    ctx.fillText(label, x + w / 2, y + 12);
    x += w + 5;
  }
  if (shield > 0) {
    glass(ctx, x, y, 44, 22, 11, '#4AD0FF');
    ctx.font = `800 12px ${FONT_FAMILY}`; ctx.textAlign = 'center'; ctx.fillStyle = '#BFF0FF'; ctx.textBaseline = 'middle';
    ctx.fillText(`🛡️${shield}`, x + 22, y + 12);
  }
}

export interface ArmyStats { count: number; power: number; shotsPerSec: number; }

export function drawArmyPanel(ctx: Ctx, s: ArmyStats): void {
  const x = 104, w = 292, h = 44, y = BASE_HEIGHT - 62;
  glass(ctx, x, y, w, h, 16, '#4AA3FF');
  const cells: { icon: string; value: string; label: string; color: string }[] = [
    { icon: '🪖', value: fmtNum(s.count), label: 'TROPAS', color: '#7CF0A5' },
    { icon: '⚔️', value: fmtNum(s.power), label: 'PODER', color: '#FF7BA3' },
    { icon: '🔥', value: `${s.shotsPerSec.toFixed(1)}/s`, label: 'CADÊNCIA', color: '#FFB84A' },
  ];
  const cw = w / cells.length;
  cells.forEach((c, i) => {
    const cx = x + cw * i + cw / 2;
    if (i > 0) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + cw * i - 0.5, y + 8, 1, h - 16); }
    ctx.font = `15px ${FONT_FAMILY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    ctx.fillText(c.icon, cx - 24, y + 17);
    text(ctx, c.value, cx + 6, y + 17, 17, c.color, 'center', 900);
    text(ctx, c.label, cx, y + 34, 9, '#9fb0cc', 'center', 800, false);
  });
  // army delta pop (+N / -N)
  if (hudAnim.armyDeltaAge < 1 && hudAnim.armyDelta !== 0) {
    const a = 1 - hudAnim.armyDeltaAge;
    ctx.globalAlpha = a;
    const up = hudAnim.armyDelta > 0;
    text(ctx, `${up ? '+' : ''}${hudAnim.armyDelta}`, x + cw / 2 + 6, y - 6 - (1 - a) * 14, 18, up ? '#7CF0A5' : '#FF6B6B', 'center', 900);
    ctx.globalAlpha = 1;
  }
}

/** Draws the full HUD. Returns the rank so the caller can react to rank-ups. */
export function drawHud(ctx: Ctx, gs: GameState, stats: ArmyStats, now: number): { rank: string; color: string } {
  stepHudAnim(gs, stats.count, now);
  const rk = rankFor(gs.score);
  ctx.save();
  drawProgress(ctx, gs, now);
  drawChapterChip(ctx, gs.currentLevel);
  drawRank(ctx, rk.rank, rk.color, now);
  drawScoreBlock(ctx, gs, now);
  drawCoins(ctx);
  drawPerkRow(ctx);
  drawArmyPanel(ctx, stats);
  ctx.restore();
  return rk;
}
