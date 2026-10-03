// renderer-boss.ts - Boss specific rendering logic
import { Boss } from './types';
import { safeAddColorStop } from './renderer-utils';
import { BASE_WIDTH } from './constants';
import { QualityManager } from './quality';
import { getBossLore } from './boss-lore';
import { isPaintedBoss, getBossSprite, BOSS_BOX, BOSS_VISUAL_SCALE } from './boss-art';

// Boss final - Nave Mãe Alienígena (Scarier version)
export function drawMothershipBoss(ctx: CanvasRenderingContext2D, boss: Boss, time: number): void {
  // Coordenadas de desenho são lógicas (o ctx já está escalado pelo DPR), então
  // `ctx.canvas.width` (backing store) deslocaria a nave para fora da tela em
  // qualquer aparelho com devicePixelRatio > 1.
  const x = BASE_WIDTH / 2;
  const y = boss.y;
  const hover = Math.sin(time * 0.002) * 5; // Mais movimento
  const shipY = y + hover;
  const damageFlash = boss.hp < boss.maxHp * 0.3 ? Math.sin(time * 0.05) * 0.5 : 0; // Flash mais rápido e intenso

  ctx.save();

  // Aura de Tensão (Dark Void)
  const voidRadius = 250 + Math.sin(time * 0.003) * 20;
  const voidGlow = ctx.createRadialGradient(x, shipY, 50, x, shipY, voidRadius);
  safeAddColorStop(voidGlow, 0, 'rgba(0, 0, 0, 0.8)');
  safeAddColorStop(voidGlow, 0.5, 'rgba(20, 0, 40, 0.4)');
  safeAddColorStop(voidGlow, 1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = voidGlow;
  ctx.beginPath();
  ctx.arc(x, shipY, voidRadius, 0, Math.PI * 2);
  ctx.fill();

  // Tentáculos de energia escura
  ctx.strokeStyle = `rgba(100, 0, 200, ${0.3 + damageFlash})`;
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + time * 0.001;
    ctx.beginPath();
    ctx.moveTo(x, shipY);
    const c1x = x + Math.cos(angle) * 100;
    const c1y = shipY + Math.sin(angle) * 100;
    const ex = x + Math.cos(angle + time * 0.002) * 200;
    const ey = shipY + Math.sin(angle + time * 0.002) * 200;
    ctx.quadraticCurveTo(c1x, c1y, ex, ey);
    ctx.stroke();
  }

  // Aura de dano (vermelha pulsante crítica)
  if (boss.hp < boss.maxHp * 0.5) {
    const damageAura = ctx.createRadialGradient(x, shipY, 0, x, shipY, 120);
    safeAddColorStop(damageAura, 0, `rgba(255, 0, 0, ${0.4 + damageFlash})`);
    safeAddColorStop(damageAura, 1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = damageAura;
    ctx.beginPath();
    ctx.arc(x, shipY, 120, 0, Math.PI * 2);
    ctx.fill();
  }

  // Corpo principal da nave (disco) - Mais escuro e sinistro
  const bodyGradient = ctx.createLinearGradient(x - 90, shipY - 25, x + 90, shipY + 25);
  safeAddColorStop(bodyGradient, 0, '#000000');
  safeAddColorStop(bodyGradient, 0.3, '#1a0b2e'); // Roxo muito escuro
  safeAddColorStop(bodyGradient, 0.5, '#2e0b3d');
  safeAddColorStop(bodyGradient, 0.7, '#1a0b2e');
  safeAddColorStop(bodyGradient, 1, '#000000');
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.ellipse(x, shipY, 90, 25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Borda metálica brilhante (roxa)
  ctx.strokeStyle = '#b829ff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Anel externo (vermelho escuro)
  ctx.strokeStyle = '#500000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, shipY + 3, 75, 15, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Cúpula superior (cockpit) - Olho maligno
  const domeColor = boss.hp < boss.maxHp * 0.3 ?
    `rgba(255, ${255 * Math.abs(Math.sin(time * 0.05))}, 255, 1)` : '#ff0000'; // Vermelho puro ou branco piscando

  const domeGradient = ctx.createRadialGradient(x, shipY - 15, 0, x, shipY - 15, 30);
  safeAddColorStop(domeGradient, 0, '#ffcccc');
  safeAddColorStop(domeGradient, 0.3, domeColor);
  safeAddColorStop(domeGradient, 1, '#330000');

  ctx.fillStyle = domeGradient;
  ctx.beginPath();
  ctx.ellipse(x, shipY - 5, 25, 20, 0, Math.PI, 0);
  ctx.fill();

  // Pupila do Olho
  ctx.fillStyle = '#000';
  const pupilX = x + Math.sin(time * 0.002) * 5;
  const pupilY = shipY - 5 + Math.cos(time * 0.003) * 3;
  ctx.beginPath();
  ctx.ellipse(pupilX, pupilY, 5, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Reflexo na cúpula
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x - 8, shipY - 15, 8, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Luzes piscando na base da nave - mais luzes (roxa/vermelha)
  const lightCount = 16;
  for (let i = 0; i < lightCount; i++) {
    const angle = (i / lightCount) * Math.PI * 2 + time * 0.004;
    const lightX = x + Math.cos(angle) * 75;
    const lightY = shipY + Math.sin(angle) * 18;
    const brightness = (Math.sin(time * 0.015 + i) + 1) / 2;

    const lightColor = boss.hp < boss.maxHp * 0.3 ?
      `rgba(255, ${100 * brightness}, 0, ${0.5 + brightness * 0.5})` :
      `rgba(180, 0, 255, ${0.5 + brightness * 0.5})`; // Roxo
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.arc(lightX, lightY, 3 + brightness * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Canhões laterais (múltiplos)
  ctx.fillStyle = '#111';
  ctx.fillRect(x - 90, shipY - 5, 20, 10);
  ctx.fillRect(x + 70, shipY - 5, 20, 10);

  // Canhões inferiores
  ctx.fillRect(x - 30, shipY + 15, 10, 15);
  ctx.fillRect(x + 20, shipY + 15, 10, 15);

  // Disparos dos canhões (visual)
  if (Math.sin(time * 0.05) > 0.5) {
    ctx.fillStyle = 'rgba(255, 50, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(x - 95, shipY, 6, 0, Math.PI * 2);
    ctx.arc(x + 95, shipY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.arc(x - 25, shipY + 30, 4, 0, Math.PI * 2);
    ctx.arc(x + 25, shipY + 30, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Barra de vida do BOSS FINAL - maior e mais visível
  const barWidth = 280;
  const barHeight = 20;
  const barX = x - barWidth / 2;
  const barY = shipY + 78; // abaixo do casco e das luzes da base, sem cobrir a nave

  // Fundo da barra
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.beginPath();
  ctx.roundRect(barX - 3, barY - 3, barWidth + 6, barHeight + 6, 8);
  ctx.fill();

  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 5);
  ctx.fill();

  // Vida - verde quando alta, vermelho quando baixa
  const hpPercent = boss.hp / boss.maxHp;
  const hpGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
  if (hpPercent > 0.5) {
    safeAddColorStop(hpGradient, 0, '#00FF88');
    safeAddColorStop(hpGradient, 1, '#00CC66');
  } else if (hpPercent > 0.25) {
    safeAddColorStop(hpGradient, 0, '#FFAA00');
    safeAddColorStop(hpGradient, 1, '#FF8800');
  } else {
    safeAddColorStop(hpGradient, 0, '#FF4444');
    safeAddColorStop(hpGradient, 1, '#CC0000');
  }

  ctx.fillStyle = hpGradient;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth * hpPercent, barHeight, 5);
  ctx.fill();

  // Borda da barra
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 5);
  ctx.stroke();

  // Texto "NAVE MÃE" e HP
  ctx.fillStyle = '#FF4444';
  ctx.font = 'bold 14px Arial';
  /* v8 ignore start */
  ctx.textAlign = 'center';
  if (QualityManager.getInstance().settings.enableShadows) { /* v8 ignore next */
    ctx.shadowColor = '#000';
  /* v8 ignore stop */
    ctx.shadowBlur = 4;
  }
  ctx.fillText('🛸 NAVE MÃE ALIENÍGENA 🛸', x, barY - 10);

  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(`${Math.ceil(boss.hp)} / ${boss.maxHp}`, x, barY + barHeight / 2 + 4);
}

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
