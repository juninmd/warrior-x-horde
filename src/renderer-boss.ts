// renderer-boss.ts - Boss specific rendering logic
import { Boss } from './types';
import { safeAddColorStop } from './renderer-utils';
import { BASE_WIDTH } from './constants';
import { QualityManager } from './quality';

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
  ctx.textAlign = 'center';
  if (QualityManager.getInstance().settings.enableShadows) {
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
  }
  ctx.fillText('🛸 NAVE MÃE ALIENÍGENA 🛸', x, barY - 10);

  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(`${Math.ceil(boss.hp)} / ${boss.maxHp}`, x, barY + barHeight / 2 + 4);
}

// Funções de desenho específicas para variantes de boss

export function drawBossBeast(ctx: CanvasRenderingContext2D, boss: Boss, time: number): void {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;
  const pulse = Math.sin(time * 0.005) * 10;

  // Corpo peludo/irregular
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  // Forma irregular base
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const r = (boss.width / 2) + Math.sin(angle * 5 + time * 0.003) * 5 + pulse;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Olho ciclope gigante
  const eyeY = cy - 10;
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(cx, eyeY, 25, 0, Math.PI * 2);
  ctx.fill();

  // Pupila
  ctx.fillStyle = '#000';
  const lookY = eyeY + Math.sin(time * 0.002) * 5;
  ctx.beginPath();
  ctx.arc(cx, lookY, 10, 0, Math.PI * 2);
  ctx.fill();

  // Presas
  ctx.fillStyle = '#F0E68C';
  ctx.beginPath();
  ctx.moveTo(cx - 20, cy + 20);
  ctx.lineTo(cx - 10, cy + 50);
  ctx.lineTo(cx, cy + 20);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 20, cy + 20);
  ctx.lineTo(cx + 10, cy + 50);
  ctx.lineTo(cx, cy + 20);
  ctx.fill();
}

export function drawBossMachine(ctx: CanvasRenderingContext2D, boss: Boss, time: number): void {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;

  // Corpo metálico quadrado com cantos cortados
  ctx.fillStyle = '#555';
  ctx.beginPath();
  const s = boss.width;
  ctx.moveTo(cx - s/2 + 10, cy - s/2);
  ctx.lineTo(cx + s/2 - 10, cy - s/2);
  ctx.lineTo(cx + s/2, cy - s/2 + 10);
  ctx.lineTo(cx + s/2, cy + s/2 - 10);
  ctx.lineTo(cx + s/2 - 10, cy + s/2);
  ctx.lineTo(cx - s/2 + 10, cy + s/2);
  ctx.lineTo(cx - s/2, cy + s/2 - 10);
  ctx.lineTo(cx - s/2, cy - s/2 + 10);
  ctx.closePath();
  ctx.fill();

  // Detalhes mecânicos (rivets)
  ctx.fillStyle = '#888';
  for(const dx of [-1, 1]) {
    for(const dy of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + dx * (s/2 - 10), cy + dy * (s/2 - 10), 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Núcleo brilhante
  const corePulse = Math.abs(Math.sin(time * 0.01));
  ctx.fillStyle = `rgba(0, 255, 255, ${0.5 + corePulse * 0.5})`;
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.fill();

  // Canhões laterais
  ctx.fillStyle = '#333';
  ctx.fillRect(cx - s/2 - 10, cy - 10, 15, 20);
  ctx.fillRect(cx + s/2 - 5, cy - 10, 15, 20);
}

export function drawBossDemon(ctx: CanvasRenderingContext2D, boss: Boss, time: number): void {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;
  const pulse = Math.sin(time * 0.008) * 5;

  // Aura de fogo
  const gradient = ctx.createRadialGradient(cx, cy, 30, cx, cy, 70 + pulse);
  safeAddColorStop(gradient, 0, '#FFA500');
  safeAddColorStop(gradient, 1, 'rgba(255, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, 70 + pulse, 0, Math.PI * 2);
  ctx.fill();

  // Cabeça demoníaca
  ctx.fillStyle = '#800000';
  ctx.beginPath();
  ctx.arc(cx, cy, 40, 0, Math.PI * 2);
  ctx.fill();

  // Chifres curvos grandes
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(cx - 20, cy - 20);
  ctx.bezierCurveTo(cx - 50, cy - 50, cx - 60, cy - 10, cx - 80, cy - 40);
  ctx.lineTo(cx - 30, cy - 10);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 20, cy - 20);
  ctx.bezierCurveTo(cx + 50, cy - 50, cx + 60, cy - 10, cx + 80, cy - 40);
  ctx.lineTo(cx + 30, cy - 10);
  ctx.fill();

  // Olhos vermelhos brilhantes
  ctx.fillStyle = '#FF0000';
  if (QualityManager.getInstance().settings.enableShadows) {
    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = 10;
  }
  ctx.beginPath();
  ctx.moveTo(cx - 15, cy - 5);
  ctx.lineTo(cx - 5, cy + 5);
  ctx.lineTo(cx - 25, cy + 5);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 15, cy - 5);
  ctx.lineTo(cx + 5, cy + 5);
  ctx.lineTo(cx + 25, cy + 5);
  ctx.fill();
  if (QualityManager.getInstance().settings.enableShadows) {
    ctx.shadowBlur = 0;
  }
}

export function drawBossSlime(ctx: CanvasRenderingContext2D, boss: Boss, time: number): void {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;
  const wobble = Math.sin(time * 0.005 + cx) * 5;

  ctx.fillStyle = '#00FF00';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 45 + wobble, 35 - wobble, 0, 0, Math.PI * 2);
  ctx.fill();

  // Olhos
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(cx - 15, cy, 10, 0, Math.PI * 2);
  ctx.arc(cx + 15, cy, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx - 15, cy, 4, 0, Math.PI * 2);
  ctx.arc(cx + 15, cy, 4, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBossEye(ctx: CanvasRenderingContext2D, boss: Boss): void {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;

  // Globo ocular
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(cx, cy, 40, 0, Math.PI * 2);
  ctx.fill();

  // Íris
  ctx.fillStyle = '#FF0000';
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.fill();

  // Pupila
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();

  // Veias
  ctx.strokeStyle = '#FFCCCC';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 40, cy);
  ctx.lineTo(cx - 20, cy);
  ctx.moveTo(cx + 40, cy);
  ctx.lineTo(cx + 20, cy);
  ctx.moveTo(cx, cy - 40);
  ctx.lineTo(cx, cy - 20);
  ctx.moveTo(cx, cy + 40);
  ctx.lineTo(cx, cy + 20);
  ctx.stroke();
}

export function drawBossSpider(ctx: CanvasRenderingContext2D, boss: Boss): void {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;

  // Pernas
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  for(let i=0; i<8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const legX = cx + Math.cos(angle) * 60;
    const legY = cy + Math.sin(angle) * 60;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(legX, legY);
    ctx.stroke();
  }

  // Corpo
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fill();

  // Olhos múltiplos
  ctx.fillStyle = '#F0F0F0';
  for(let i=0; i<4; i++) {
    ctx.beginPath();
    ctx.arc(cx - 10 + i * 6, cy - 5, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawBossSkull(ctx: CanvasRenderingContext2D, boss: Boss): void {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;

  ctx.fillStyle = '#F0F0F0';
  ctx.beginPath();
  ctx.arc(cx, cy - 10, 30, 0, Math.PI * 2); // Crânio
  ctx.fillRect(cx - 20, cy + 10, 40, 20); // Maxilar
  ctx.fill();

  // Órbitas
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx - 12, cy - 10, 8, 0, Math.PI * 2);
  ctx.arc(cx + 12, cy - 10, 8, 0, Math.PI * 2);
  ctx.fill();

  // Nariz
  ctx.beginPath();
  ctx.moveTo(cx, cy + 5);
  ctx.lineTo(cx - 5, cy + 15);
  ctx.lineTo(cx + 5, cy + 15);
  ctx.fill();
}

export function drawBossGhost(ctx: CanvasRenderingContext2D, boss: Boss, time: number): void {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;
  const float = Math.sin(time * 0.003) * 10;

  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#ADD8E6';
  ctx.beginPath();
  ctx.arc(cx, cy + float - 10, 30, Math.PI, 0);
  ctx.lineTo(cx + 30, cy + float + 30);
  for(let i=0; i<3; i++) {
    ctx.lineTo(cx + 20 - i * 20, cy + float + 20);
    ctx.lineTo(cx + 10 - i * 20, cy + float + 30);
  }
  ctx.lineTo(cx - 30, cy + float + 30);
  ctx.fill();
  ctx.restore();

  // Olhos
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx - 10, cy + float - 10, 4, 0, Math.PI * 2);
  ctx.arc(cx + 10, cy + float - 10, 4, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBossCrystal(ctx: CanvasRenderingContext2D, boss: Boss, time: number): void {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;
  const rot = time * 0.001;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  ctx.fillStyle = '#00FFFF';
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(30, 0);
  ctx.lineTo(0, 40);
  ctx.lineTo(-30, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(15, -10);
  ctx.lineTo(0, 0);
  ctx.fill();

  ctx.restore();
}

export function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, time: number): void {
  // Sombra genérica base
  const cx = boss.x + boss.width / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, boss.y + boss.height + 20, boss.width / 2 + 10, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dispatch para tipo específico
  switch (boss.type) {
    case 'mothership': drawMothershipBoss(ctx, boss, time); return;
    case 'machine': drawBossMachine(ctx, boss, time); break;
    case 'demon': drawBossDemon(ctx, boss, time); break;
    case 'beast': drawBossBeast(ctx, boss, time); break;
    case 'slime': drawBossSlime(ctx, boss, time); break;
    case 'eye': drawBossEye(ctx, boss); break;
    case 'spider': drawBossSpider(ctx, boss); break;
    case 'skull': drawBossSkull(ctx, boss); break;
    case 'ghost': drawBossGhost(ctx, boss, time); break;
    case 'crystal': drawBossCrystal(ctx, boss, time); break;
    default: drawBossBeast(ctx, boss, time); break;
  }

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

  let bossName = 'BOSS';
  if (boss.type === 'machine') bossName = 'MECHA TANK';
  else if (boss.type === 'demon') bossName = 'DEMON LORD';
  else if (boss.type === 'beast') bossName = 'GIANT BEAST';
  else if (boss.type === 'slime') bossName = 'TOXIC SLIME';
  else if (boss.type === 'eye') bossName = 'THE WATCHER';
  else if (boss.type === 'spider') bossName = 'WIDOWMAKER';
  else if (boss.type === 'skull') bossName = 'BONE KING';
  else if (boss.type === 'ghost') bossName = 'PHANTOM';
  else if (boss.type === 'crystal') bossName = 'PRISM CORE';

  ctx.fillText(`${bossName}: ${Math.ceil(boss.hp)}`, barX + barWidth / 2, barY + barHeight / 2 + 4);
}
