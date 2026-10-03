// renderer-boss.ts - Boss specific rendering logic
import { Boss } from './types';
import { safeAddColorStop } from './renderer-utils';
import { BASE_WIDTH } from './constants';
import { getBossLore } from './boss-lore';
import { isPaintedBoss, getBossSprite, BOSS_BOX, BOSS_VISUAL_SCALE, getMothershipSprite, MOTHER_W, MOTHER_H, MOTHER_VISUAL_SCALE, MOTHER_LIGHTS, MOTHER_CANNONS, MOTHER_ORIGIN_Y } from './boss-art';

// Boss final - Nave Mãe Alienígena (detailed cached hull + animated lights/glow)
/* v8 ignore start */
export function drawMothershipBoss(ctx: CanvasRenderingContext2D, boss: Boss, time: number): void {
  const x = boss.x; // the ship moves: draw at the hitbox center
  const hover = Math.sin(time * 0.002) * 5;
  const y = boss.y + hover;
  const sprite = getMothershipSprite((boss.hitTimer ?? 0) > 0);
  const k = MOTHER_VISUAL_SCALE;
  const phase = boss.phase ?? 1;
  const charging = (boss.telegraph ?? 0) > 0;
  const lowHp = boss.hp < boss.maxHp * 0.35;

  ctx.save();
  ctx.translate(x, y);

  // dark aura
  const aura = ctx.createRadialGradient(0, 10, 20, 0, 10, 200);
  safeAddColorStop(aura, 0, 'rgba(40, 10, 80, 0.55)');
  safeAddColorStop(aura, 1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.arc(0, 10, 200, 0, Math.PI * 2); ctx.fill();

  // tractor/damage beam while charging a volley
  if (charging) {
    const t = boss.telegraph ?? 0;
    const beam = ctx.createLinearGradient(0, 40 * k, 0, 360);
    safeAddColorStop(beam, 0, `rgba(111,255,178,${0.1 + (40 - t) * 0.01})`);
    safeAddColorStop(beam, 1, 'rgba(111,255,178,0)');
    ctx.fillStyle = beam;
    ctx.beginPath(); ctx.moveTo(-26 * k, 50 * k); ctx.lineTo(26 * k, 50 * k); ctx.lineTo(120, 360); ctx.lineTo(-120, 360); ctx.closePath(); ctx.fill();
  }

  if (sprite) {
    const w = MOTHER_W * k, h = MOTHER_H * k;
    ctx.drawImage(sprite, -w / 2, -(h / 2 + MOTHER_ORIGIN_Y * k) + 0, w, h);
  }

  // animated rim lights (chasing pattern, faster at later phases)
  const n = MOTHER_LIGHTS.length;
  const head = Math.floor(time * (0.006 + phase * 0.003)) % n;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const d = (i - head + n) % n;
    const a = d === 0 ? 1 : d < 4 ? 0.7 - d * 0.15 : 0.18;
    const [lx, ly] = MOTHER_LIGHTS[i];
    const col = phase >= 3 ? '255,70,70' : '120,255,190';
    ctx.fillStyle = `rgba(${col},${a})`;
    ctx.beginPath(); ctx.arc(lx * k, ly * k, 3.2 * k + (d === 0 ? 1.5 : 0), 0, Math.PI * 2); ctx.fill();
    if (d === 0) {
      const g = ctx.createRadialGradient(lx * k, ly * k, 0, lx * k, ly * k, 14);
      safeAddColorStop(g, 0, `rgba(${col},0.7)`); safeAddColorStop(g, 1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx * k, ly * k, 14, 0, Math.PI * 2); ctx.fill();
    }
  }

  // engine glow + cannon charge
  for (const [cx, cy] of MOTHER_CANNONS) {
    const charge = charging ? 0.5 + 0.5 * Math.sin(time * 0.05) : 0.25;
    const r = (charging ? 16 : 9) * k + charge * 6;
    const g = ctx.createRadialGradient(cx * k, cy * k, 0, cx * k, cy * k, r * 2);
    safeAddColorStop(g, 0, `rgba(140,255,200,${0.35 + charge * 0.6})`);
    safeAddColorStop(g, 1, 'rgba(140,255,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx * k, cy * k, r * 2, 0, Math.PI * 2); ctx.fill();
  }

  // pilot eyes pulse in the dome
  const pulse = 0.6 + 0.4 * Math.sin(time * 0.006);
  ctx.fillStyle = `rgba(255,60,90,${pulse})`;
  for (const ex of [-6, 6]) { ctx.beginPath(); ctx.ellipse(ex * k, -58 * k - MOTHER_ORIGIN_Y * 0.0, 3.2 * k, 2 * k, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';

  // damage: sparks + smoke
  if (lowHp) {
    for (let i = 0; i < 5; i++) {
      const a = time * 0.003 + i * 1.7;
      const sx = Math.cos(a) * 70 * k;
      const sy = Math.sin(a * 1.3) * 12 * k;
      ctx.fillStyle = `rgba(255,${160 + (i * 17) % 80},60,${0.5 + 0.5 * Math.sin(time * 0.03 + i)})`;
      ctx.fillRect(sx, sy, 3, 3);
      ctx.fillStyle = 'rgba(40,30,50,0.35)';
      ctx.beginPath(); ctx.arc(sx, sy - ((time * 0.04 + i * 9) % 30), 6 + (i % 3) * 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  // HP bar below the hull (with phase ticks)
  const bw = 200, bh = 16, by = 92;
  ctx.fillStyle = 'rgba(8,10,20,0.85)';
  ctx.beginPath(); ctx.roundRect(-bw / 2 - 2, by - 2, bw + 4, bh + 4, 7); ctx.fill();
  const hp = Math.max(0, Math.min(1, boss.hp / Math.max(1, boss.maxHp)));
  const hg = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
  safeAddColorStop(hg, 0, phase >= 3 ? '#FF4040' : '#20E08A'); safeAddColorStop(hg, 1, phase >= 3 ? '#B01020' : '#0FA060');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.roundRect(-bw / 2, by, bw * hp, bh, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(-bw / 2 + bw * 0.33 - 1, by + 1, 2, bh - 2); ctx.fillRect(-bw / 2 + bw * 0.66 - 1, by + 1, 2, bh - 2);
  ctx.fillStyle = '#FFF'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
  ctx.fillText(`${getBossLore('mothership').name}: ${Math.ceil(boss.hp)}`, 0, by + 12);
  ctx.restore();
}
/* v8 ignore stop */

/** Draws the cached detailed sprite with idle bobbing/breathing. Returns false when unavailable. */
/* v8 ignore start */
function drawPaintedBoss(ctx: CanvasRenderingContext2D, boss: Boss, time: number): boolean {
  if (!isPaintedBoss(boss.type)) return false;
  const flash = (boss.hitTimer ?? 0) > 0;
  const sprite = getBossSprite(boss.type, flash);
  if (!sprite) return false;

  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;
  const t = time * 0.003;
  const floaty = boss.type === 'ghost' || boss.type === 'crystal' || boss.type === 'eye';
  const bob = Math.sin(t) * (floaty ? 6 : 2.5);
  const breathe = 1 + Math.sin(t * 1.3) * 0.02;
  const size = BOSS_BOX * BOSS_VISUAL_SCALE;
  const enraged = (boss.phase ?? 1) >= 3;

  ctx.save();
  ctx.translate(cx, cy + bob);
  if (enraged) ctx.rotate(Math.sin(time * 0.04) * 0.02); // trembling with rage
  ctx.scale(breathe, 2 - breathe);
  if (boss.type === 'ghost') ctx.globalAlpha = 0.82 + Math.sin(t * 2) * 0.12;
  ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  if (enraged) { // red rim glow overlay for the final phase
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.12 + Math.sin(time * 0.01) * 0.06;
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
  }
  ctx.restore();
  return true;
}
/* v8 ignore stop */

export function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, time: number): void {
  // Sombra genérica base
  const cx = boss.x + boss.width / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, boss.y + boss.height + 20, boss.width / 2 + 10, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dispatch para tipo específico
  if (boss.type === 'mothership') { drawMothershipBoss(ctx, boss, time); return; }
  drawPaintedBoss(ctx, boss, time); // unknown types simply render nothing but the shadow + HP bar

  // Barra de vida comum para bosses não-mothership
  const barWidth = 180;
  const barHeight = 25;
  const barX = cx - barWidth / 2;
  const barY = boss.y - 40;

  // Fundo da barra
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 5);
  ctx.fill();

  // Vida
  const hpGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
  safeAddColorStop(hpGradient, 0, '#E74C3C');
  safeAddColorStop(hpGradient, 1, '#C0392B');

  ctx.fillStyle = hpGradient;
  ctx.beginPath();
  ctx.roundRect(barX + 2, barY + 2, (barWidth - 4) * (boss.hp / boss.maxHp), barHeight - 4, 4);
  ctx.fill();

  // Marcas de fase (66% / 33%)
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(barX + barWidth * 0.33 - 1, barY + 2, 2, barHeight - 4);
  ctx.fillRect(barX + barWidth * 0.66 - 1, barY + 2, 2, barHeight - 4);

  // Borda
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 5);
  ctx.stroke();

  // Texto HP com Nome do Boss
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';

  const bossName = getBossLore(boss.type).name;

  ctx.fillText(`${bossName}: ${Math.ceil(boss.hp)}`, barX + barWidth / 2, barY + barHeight / 2 + 4);
}

/* v8 ignore start */
/** Warning drawn while a boss charges a volley: pulsing ring, "!" and a pattern hint. */
export function drawBossTelegraph(ctx: CanvasRenderingContext2D, boss: Boss, playerX: number, playerY: number, time: number): void {
  const t = boss.telegraph ?? 0;
  if (t <= 0 || !boss.pattern) return;
  const cx = boss.type === 'mothership' ? boss.x : boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;
  const pulse = 0.55 + 0.45 * Math.sin(time * 0.03);
  const r = Math.max(boss.width, 60) * 0.6 + (40 - t) * 0.6;

  ctx.save();
  ctx.strokeStyle = `rgba(255, 60, 60, ${pulse})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(255, 90, 60, ${0.5 * pulse})`;
  const my = boss.y + boss.height;
  if (boss.pattern === 'aimed') {
    ctx.beginPath(); ctx.moveTo(cx, my); ctx.lineTo(playerX, playerY); ctx.stroke();
  } else if (boss.pattern === 'fan') {
    for (const a of [-0.75, 0, 0.75]) {
      ctx.beginPath(); ctx.moveTo(cx, my); ctx.lineTo(cx + Math.sin(a) * 700, my + Math.cos(a) * 700); ctx.stroke();
    }
  } else {
    ctx.fillStyle = `rgba(255, 60, 60, ${0.18 * pulse})`;
    ctx.fillRect(0, my, BASE_WIDTH, 36);
  }
  ctx.setLineDash([]);

  ctx.fillStyle = '#FFD84A';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('!', cx, boss.y - 52);
  ctx.restore();
}
/* v8 ignore stop */
