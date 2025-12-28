// renderer.ts - Renderização do jogo estilo Crowd Runner
import { Entities, GameState, FloatingText, Army, EnemyHorde, Gate, Boss, Bullet, Particle } from './types';

const floatingTexts: FloatingText[] = [];
const particles: Particle[] = [];

// Sistema de partículas
export function addParticle(x: number, y: number, type: Particle['type'], color: string, count = 1): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = type === 'explosion' ? 2 + Math.random() * 4 : 1 + Math.random() * 2;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (type === 'star' ? 2 : 0),
      color,
      size: type === 'explosion' ? 3 + Math.random() * 4 : 2 + Math.random() * 3,
      life: 1,
      maxLife: 1,
      type,
    });
  }
}

export function addExplosion(x: number, y: number, color: string): void {
  addParticle(x, y, 'explosion', color, 12);
  addParticle(x, y, 'spark', '#FFD700', 6);
}

export function addTrail(x: number, y: number, color: string): void {
  if (Math.random() < 0.3) {
    addParticle(x, y, 'trail', color, 1);
  }
}

function updateParticles(): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1; // Gravidade
    p.life -= 0.03;
    p.size *= 0.97;

    if (p.life <= 0 || p.size < 0.5) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles(ctx: CanvasRenderingContext2D): void {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.life;

    if (p.type === 'spark' || p.type === 'star') {
      // Brilho
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
    }

    ctx.fillStyle = p.color;
    ctx.beginPath();

    if (p.type === 'star') {
      // Desenhar estrela
      drawStar(ctx, p.x, p.y, 5, p.size, p.size / 2);
    } else {
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
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

export function addFloatingText(text: string, x: number, y: number, color: string): void {
  floatingTexts.push({ text, x, y, color, alpha: 1, scale: 1 });
}

function updateFloatingTexts(): void {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].y -= 2;
    floatingTexts[i].alpha -= 0.02;
    floatingTexts[i].scale += 0.02;
    if (floatingTexts[i].alpha <= 0) {
      floatingTexts.splice(i, 1);
    }
  }
}

function drawRoad(ctx: CanvasRenderingContext2D, gameState: GameState): void {
  const { width, height } = ctx.canvas;

  // Ceu azul
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.3);
  skyGradient.addColorStop(0, '#87CEEB');
  skyGradient.addColorStop(1, '#B0E0E6');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Desenhar montanhas/cristais de gelo no fundo
  ctx.fillStyle = '#ADD8E6';
  for (let i = 0; i < 5; i++) {
    const x = i * (width / 4) - 50;
    const peakHeight = 80 + Math.sin(i * 1.5) * 40;
    ctx.beginPath();
    ctx.moveTo(x, height * 0.15);
    ctx.lineTo(x + 60, height * 0.15 - peakHeight);
    ctx.lineTo(x + 120, height * 0.15);
    ctx.closePath();
    ctx.fill();
  }

  // Estrada principal com perspectiva - comeca mais acima
  const roadTop = height * 0.08; // Comeca bem mais acima
  const roadTopWidth = width * 0.3;

  // Fundo da estrada
  ctx.fillStyle = '#E8E8E8';
  ctx.beginPath();
  ctx.moveTo(width / 2 - roadTopWidth / 2, roadTop);
  ctx.lineTo(width / 2 + roadTopWidth / 2, roadTop);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Bordas da estrada
  ctx.fillStyle = '#2C3E50';
  ctx.lineWidth = 3;

  // Borda esquerda
  ctx.beginPath();
  ctx.moveTo(width / 2 - roadTopWidth / 2, roadTop);
  ctx.lineTo(0, height);
  ctx.lineTo(-20, height);
  ctx.lineTo(width / 2 - roadTopWidth / 2 - 20, roadTop);
  ctx.closePath();
  ctx.fill();

  // Borda direita
  ctx.beginPath();
  ctx.moveTo(width / 2 + roadTopWidth / 2, roadTop);
  ctx.lineTo(width, height);
  ctx.lineTo(width + 20, height);
  ctx.lineTo(width / 2 + roadTopWidth / 2 + 20, roadTop);
  ctx.closePath();
  ctx.fill();

  // Faixas pontilhadas da estrada
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.setLineDash([40, 30]);

  // Linha central
  ctx.beginPath();
  ctx.moveTo(width / 2, roadTop);
  ctx.lineTo(width / 2, height);
  ctx.stroke();

  ctx.setLineDash([]);
}

function drawSoldier3D(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, animOffset: number, time: number): void {
  const bounce = Math.sin(time * 0.008 + animOffset) * 3;
  const scale = Math.max(0.5, 1 - (800 - y) / 1500); // Escala baseada na posição Y (perspectiva)
  const actualSize = size * scale;

  // Sombra
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + actualSize * 0.8, actualSize * 0.6, actualSize * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Corpo (círculo principal)
  const bodyGradient = ctx.createRadialGradient(x - actualSize * 0.2, y - actualSize * 0.2 + bounce, 0, x, y + bounce, actualSize);
  bodyGradient.addColorStop(0, color);
  bodyGradient.addColorStop(1, shadeColor(color, -30));

  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.arc(x, y + bounce, actualSize * 0.7, 0, Math.PI * 2);
  ctx.fill();

  // Cabeça
  const headGradient = ctx.createRadialGradient(x - actualSize * 0.1, y - actualSize * 0.6 + bounce, 0, x, y - actualSize * 0.5 + bounce, actualSize * 0.4);
  headGradient.addColorStop(0, '#FFE4C4');
  headGradient.addColorStop(1, '#DEB887');

  ctx.fillStyle = headGradient;
  ctx.beginPath();
  ctx.arc(x, y - actualSize * 0.5 + bounce, actualSize * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Capacete
  ctx.fillStyle = shadeColor(color, -40);
  ctx.beginPath();
  ctx.arc(x, y - actualSize * 0.6 + bounce, actualSize * 0.35, Math.PI, 0);
  ctx.fill();
}

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

// Histórico de posições para trail effect
let lastArmyX = 0;

function drawArmy(ctx: CanvasRenderingContext2D, army: Army, time: number): void {
  // Trail effect - adicionar partículas quando se move
  const dx = army.centerX - lastArmyX;
  if (Math.abs(dx) > 2) {
    // Adicionar trail particles para soldados aleatórios
    const aliveSoldiers = army.soldiers.filter(s => s.isAlive);
    if (aliveSoldiers.length > 0 && Math.random() < 0.5) {
      const randomSoldier = aliveSoldiers[Math.floor(Math.random() * aliveSoldiers.length)];
      addTrail(randomSoldier.x, randomSoldier.y + 10, '#4A90D9');
    }
  }
  lastArmyX = army.centerX;

  // Ordenar soldados por Y para depth sorting
  const sortedSoldiers = [...army.soldiers].filter(s => s.isAlive).sort((a, b) => a.y - b.y);

  for (const soldier of sortedSoldiers) {
    drawSoldier3D(ctx, soldier.x, soldier.y, soldier.size, soldier.color, soldier.animOffset, time);
  }

  // Contador de soldados (badge flutuante)
  const count = army.soldiers.filter(s => s.isAlive).length;
  if (count > 0) {
    // Sombra do badge
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(army.centerX + 3, army.centerY - 55, 28, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Badge
    const badgeGradient = ctx.createLinearGradient(army.centerX - 25, army.centerY - 75, army.centerX + 25, army.centerY - 45);
    badgeGradient.addColorStop(0, '#4A90D9');
    badgeGradient.addColorStop(1, '#2E5A8E');

    ctx.fillStyle = badgeGradient;
    ctx.beginPath();
    ctx.ellipse(army.centerX, army.centerY - 58, 28, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Borda do badge
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Número
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(count.toString(), army.centerX, army.centerY - 58);
  }
}

function drawEnemyHorde(ctx: CanvasRenderingContext2D, horde: EnemyHorde, time: number): void {
  const sortedSoldiers = [...horde.soldiers].filter(s => s.isAlive).sort((a, b) => a.y - b.y);

  for (const soldier of sortedSoldiers) {
    drawSoldier3D(ctx, soldier.x, soldier.y, soldier.size, soldier.color, soldier.animOffset, time);
  }

  // Contador de inimigos
  const count = horde.soldiers.filter(s => s.isAlive).length;
  if (count > 0) {
    // Sombra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(horde.x + 3, horde.y - 45, 25, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Badge vermelho
    const badgeGradient = ctx.createLinearGradient(horde.x - 22, horde.y - 60, horde.x + 22, horde.y - 35);
    badgeGradient.addColorStop(0, '#E74C3C');
    badgeGradient.addColorStop(1, '#C0392B');

    ctx.fillStyle = badgeGradient;
    ctx.beginPath();
    ctx.ellipse(horde.x, horde.y - 48, 25, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(count.toString(), horde.x, horde.y - 48);
  }
}

function drawGate(ctx: CanvasRenderingContext2D, gate: Gate): void {
  if (gate.passed) return;

  const scale = Math.max(0.5, 1 - (800 - gate.y) / 1500);
  const width = gate.width * scale;
  const height = gate.height * scale;
  const x = gate.x + (gate.width - width) / 2;

  // Barrel 3D effect
  const barrelGradient = ctx.createLinearGradient(x, gate.y, x + width, gate.y);
  barrelGradient.addColorStop(0, shadeColor(gate.color, 20));
  barrelGradient.addColorStop(0.5, gate.color);
  barrelGradient.addColorStop(1, shadeColor(gate.color, -20));

  // Sombra do barril
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x + width / 2 + 5, gate.y + height + 10, width / 2, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Corpo do barril
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.roundRect(x, gate.y, width, height, 10);
  ctx.fill();

  // Topo colorido
  ctx.fillStyle = barrelGradient;
  ctx.beginPath();
  ctx.roundRect(x + 5, gate.y + 5, width - 10, height - 10, 8);
  ctx.fill();

  // Listras do barril
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x, gate.y + 10 + i * (height / 4), width, 3);
  }

  // Texto com sombra
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.floor(28 * scale)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let text = '';
  switch (gate.type) {
    case 'add': text = `+${gate.value}`; break;
    case 'multiply': text = `×${gate.value}`; break;
    case 'subtract': text = `-${gate.value}`; break;
    case 'divide': text = `÷${gate.value}`; break;
    case 'firerate': text = `🔥×${gate.value}`; break;
    case 'damage': text = `⚔️×${gate.value}`; break;
    case 'speed': text = `💨×${gate.value}`; break;
  }

  ctx.fillText(text, x + width / 2, gate.y + height / 2);
  ctx.restore();
}

function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, time: number): void {
  const pulse = Math.sin(time * 0.005) * 10;

  // Sombra
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(boss.x + boss.width / 2, boss.y + boss.height + 20, boss.width / 2 + 10, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Corpo do boss
  const bossGradient = ctx.createRadialGradient(
    boss.x + boss.width / 2 - 20, boss.y + boss.height / 2 - 20, 0,
    boss.x + boss.width / 2, boss.y + boss.height / 2, boss.width / 2 + pulse
  );
  bossGradient.addColorStop(0, '#DC143C');
  bossGradient.addColorStop(1, '#8B0000');

  ctx.fillStyle = bossGradient;
  ctx.beginPath();
  ctx.arc(boss.x + boss.width / 2, boss.y + boss.height / 2, boss.width / 2 + pulse, 0, Math.PI * 2);
  ctx.fill();

  // Olhos malignos
  ctx.fillStyle = '#FFFF00';
  ctx.beginPath();
  ctx.arc(boss.x + boss.width * 0.35, boss.y + boss.height * 0.4, 12, 0, Math.PI * 2);
  ctx.arc(boss.x + boss.width * 0.65, boss.y + boss.height * 0.4, 12, 0, Math.PI * 2);
  ctx.fill();

  // Pupilas
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(boss.x + boss.width * 0.35, boss.y + boss.height * 0.4, 5, 0, Math.PI * 2);
  ctx.arc(boss.x + boss.width * 0.65, boss.y + boss.height * 0.4, 5, 0, Math.PI * 2);
  ctx.fill();

  // Barra de vida
  const barWidth = 180;
  const barHeight = 25;
  const barX = boss.x + boss.width / 2 - barWidth / 2;
  const barY = boss.y - 50;

  // Fundo da barra
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 5);
  ctx.fill();

  // Vida
  const hpGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
  hpGradient.addColorStop(0, '#E74C3C');
  hpGradient.addColorStop(1, '#C0392B');

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

  // Texto HP
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.ceil(boss.hp)}/${boss.maxHp}`, barX + barWidth / 2, barY + barHeight / 2 + 5);
}

function drawBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[]): void {
  for (const bullet of bullets) {
    // Brilho
    const gradient = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, 8);
    gradient.addColorStop(0, bullet.isEnemy ? '#FF6B6B' : '#FFD700');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Núcleo
    ctx.fillStyle = bullet.isEnemy ? '#E74C3C' : '#FFF';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawUI(ctx: CanvasRenderingContext2D, gameState: GameState, armyCount: number): void {
  const { width } = ctx.canvas;

  // Barra superior com gradiente
  const uiGradient = ctx.createLinearGradient(0, 0, 0, 70);
  uiGradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  uiGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = uiGradient;
  ctx.fillRect(0, 0, width, 70);

  // Level badge
  ctx.fillStyle = '#3498DB';
  ctx.beginPath();
  ctx.roundRect(15, 10, 80, 30, 15);
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Level ${gameState.currentLevel}`, 55, 28);

  // Score
  ctx.fillStyle = '#2ECC71';
  ctx.beginPath();
  ctx.roundRect(width / 2 - 50, 10, 100, 30, 15);
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.fillText(`${gameState.score}`, width / 2, 28);

  // Contador de exército
  ctx.fillStyle = '#E74C3C';
  ctx.beginPath();
  ctx.roundRect(width - 95, 10, 80, 30, 15);
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.fillText(`⚔️ ${armyCount}`, width - 55, 28);

  // Barra de progresso
  const progressWidth = width - 40;
  const progress = Math.min(gameState.distanceTraveled / gameState.levelDistance, 1);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.roundRect(20, 50, progressWidth, 10, 5);
  ctx.fill();

  const progressGradient = ctx.createLinearGradient(20, 50, 20 + progressWidth, 50);
  progressGradient.addColorStop(0, '#2ECC71');
  progressGradient.addColorStop(1, '#27AE60');

  ctx.fillStyle = progressGradient;
  ctx.beginPath();
  ctx.roundRect(20, 50, progressWidth * progress, 10, 5);
  ctx.fill();

  // Super Cannon cooldown indicator
  const cannonSize = 40;
  const cannonX = width - cannonSize - 15;
  const cannonY = 50;

  // Fundo do indicador
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.arc(cannonX + cannonSize / 2, cannonY + cannonSize / 2, cannonSize / 2, 0, Math.PI * 2);
  ctx.fill();

  if (gameState.superCannonActive) {
    // Ativo - brilhando
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(cannonX + cannonSize / 2, cannonY + cannonSize / 2, cannonSize / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', cannonX + cannonSize / 2, cannonY + cannonSize / 2 + 4);
  } else if (gameState.superCannonReady) {
    // Pronto para usar
    ctx.fillStyle = '#2ECC71';
    ctx.beginPath();
    ctx.arc(cannonX + cannonSize / 2, cannonY + cannonSize / 2, cannonSize / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SPACE', cannonX + cannonSize / 2, cannonY + cannonSize / 2 + 4);
  } else {
    // Em cooldown - mostrar progresso
    const cooldownProgress = (Date.now() - gameState.superCannonLastUsed) / gameState.superCannonCooldown;
    const endAngle = -Math.PI / 2 + (cooldownProgress * Math.PI * 2);

    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(cannonX + cannonSize / 2, cannonY + cannonSize / 2, cannonSize / 2 - 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#E74C3C';
    ctx.beginPath();
    ctx.moveTo(cannonX + cannonSize / 2, cannonY + cannonSize / 2);
    ctx.arc(cannonX + cannonSize / 2, cannonY + cannonSize / 2, cannonSize / 2 - 3, -Math.PI / 2, endAngle);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    const secondsLeft = Math.ceil((gameState.superCannonCooldown - (Date.now() - gameState.superCannonLastUsed)) / 1000);
    ctx.fillText(`${secondsLeft}`, cannonX + cannonSize / 2, cannonY + cannonSize / 2 + 4);
  }

  // Combo indicator (se houver combo ativo)
  if (gameState.combo > 1) {
    const comboX = width / 2;
    const comboY = 100;
    const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.1;

    ctx.save();
    ctx.translate(comboX, comboY);
    ctx.scale(pulse, pulse);

    // Fundo do combo com brilho
    ctx.shadowColor = getComboColor(gameState.combo);
    ctx.shadowBlur = 20;

    ctx.fillStyle = getComboColor(gameState.combo);
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${gameState.combo}x COMBO!`, 0, 0);

    // Barra de tempo do combo
    const comboProgress = gameState.comboTimer / 2000; // 2 segundos
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(-50, 10, 100, 6);
    ctx.fillStyle = getComboColor(gameState.combo);
    ctx.fillRect(-50, 10, 100 * comboProgress, 6);

    ctx.restore();
  }
}

function getComboColor(combo: number): string {
  if (combo >= 10) return '#FF00FF'; // Magenta para combo épico
  if (combo >= 7) return '#FFD700';  // Dourado
  if (combo >= 5) return '#FF6B6B';  // Vermelho claro
  if (combo >= 3) return '#F39C12';  // Laranja
  return '#2ECC71'; // Verde
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D): void {
  for (const ft of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = ft.alpha;
    ctx.fillStyle = ft.color;
    ctx.font = `bold ${Math.floor(32 * ft.scale)}px Arial`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 5;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

function drawGameOver(ctx: CanvasRenderingContext2D, gameState: GameState): void {
  const { width, height } = ctx.canvas;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, width, height);

  // Título com efeito de pulsação
  const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.05;
  ctx.save();
  ctx.translate(width / 2, height / 2 - 100);
  ctx.scale(pulse, pulse);

  ctx.fillStyle = gameState.isVictory ? '#2ECC71' : '#E74C3C';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.shadowColor = gameState.isVictory ? '#2ECC71' : '#E74C3C';
  ctx.shadowBlur = 20;
  ctx.fillText(gameState.isVictory ? '🏆 VITÓRIA!' : '💀 GAME OVER', 0, 0);
  ctx.restore();

  ctx.shadowBlur = 0;

  // Caixa de estatísticas
  const boxWidth = 280;
  const boxHeight = 180;
  const boxX = width / 2 - boxWidth / 2;
  const boxY = height / 2 - 40;

  ctx.fillStyle = 'rgba(30, 30, 50, 0.9)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 15);
  ctx.fill();

  ctx.strokeStyle = '#4A90D9';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Scores com ícones
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px Arial';
  ctx.fillText(`🎯 Score:`, boxX + 20, boxY + 35);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#2ECC71';
  ctx.fillText(`${gameState.score}`, boxX + boxWidth - 20, boxY + 35);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFD700';
  ctx.font = '18px Arial';
  ctx.fillText(`👑 High Score:`, boxX + 20, boxY + 70);
  ctx.textAlign = 'right';
  ctx.fillText(`${gameState.highScore}`, boxX + boxWidth - 20, boxY + 70);

  // Max combo
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FF6B6B';
  ctx.fillText(`🔥 Max Combo:`, boxX + 20, boxY + 105);
  ctx.textAlign = 'right';
  ctx.fillStyle = getComboColor(gameState.maxCombo);
  ctx.fillText(`${gameState.maxCombo}x`, boxX + boxWidth - 20, boxY + 105);

  // Nível alcançado
  ctx.textAlign = 'left';
  ctx.fillStyle = '#3498DB';
  ctx.fillText(`📊 Level:`, boxX + 20, boxY + 140);
  ctx.textAlign = 'right';
  ctx.fillText(`${gameState.currentLevel}`, boxX + boxWidth - 20, boxY + 140);

  // Botão de restart animado
  const buttonPulse = 1 + Math.sin(Date.now() * 0.005) * 0.03;
  ctx.save();
  ctx.translate(width / 2, boxY + boxHeight + 50);
  ctx.scale(buttonPulse, buttonPulse);

  const buttonGradient = ctx.createLinearGradient(-100, -25, -100, 25);
  buttonGradient.addColorStop(0, '#4A90D9');
  buttonGradient.addColorStop(1, '#2E5A8E');

  ctx.fillStyle = buttonGradient;
  ctx.beginPath();
  ctx.roundRect(-100, -25, 200, 50, 25);
  ctx.fill();

  ctx.shadowColor = '#4A90D9';
  ctx.shadowBlur = 15;
  ctx.strokeStyle = '#6BB3F0';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🔄 JOGAR NOVAMENTE', 0, 6);
  ctx.restore();
}

// Desenhar Super Cannon beam
function drawSuperCannonBeam(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, gameState: GameState): void {
  if (!gameState.superCannonActive) return;

  const beamWidth = 40;
  const beamX = centerX - beamWidth / 2;

  // Efeito de pulsação
  const pulse = Math.sin(Date.now() / 50) * 0.2 + 0.8;

  // Gradiente do beam
  const gradient = ctx.createLinearGradient(beamX, 0, beamX + beamWidth, 0);
  gradient.addColorStop(0, `rgba(255, 200, 50, ${0.3 * pulse})`);
  gradient.addColorStop(0.3, `rgba(255, 255, 100, ${0.8 * pulse})`);
  gradient.addColorStop(0.5, `rgba(255, 255, 255, ${1 * pulse})`);
  gradient.addColorStop(0.7, `rgba(255, 255, 100, ${0.8 * pulse})`);
  gradient.addColorStop(1, `rgba(255, 200, 50, ${0.3 * pulse})`);

  // Beam principal
  ctx.fillStyle = gradient;
  ctx.fillRect(beamX, 0, beamWidth, centerY);

  // Glow externo
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 30;
  ctx.fillStyle = `rgba(255, 215, 0, ${0.4 * pulse})`;
  ctx.fillRect(beamX - 10, 0, beamWidth + 20, centerY);
  ctx.shadowBlur = 0;

  // Partículas no beam
  for (let i = 0; i < 10; i++) {
    const particleY = (Math.random() * centerY);
    const particleX = centerX + (Math.random() - 0.5) * beamWidth * 0.8;
    const particleSize = Math.random() * 4 + 2;

    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.5})`;
    ctx.beginPath();
    ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // Indicador de tempo restante
  const progress = gameState.superCannonTimer / gameState.superCannonDuration;
  const barWidth = 60;
  const barHeight = 6;
  const barX = centerX - barWidth / 2;
  const barY = centerY + 30;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(barX, barY, barWidth * progress, barHeight);
}

export function render(ctx: CanvasRenderingContext2D, entities: Entities, gameState: GameState): void {
  const { width, height } = ctx.canvas;
  const time = Date.now();

  ctx.clearRect(0, 0, width, height);

  // Screen shake
  if (gameState.screenShakeActive) {
    const shakeX = (Math.random() - 0.5) * gameState.screenShakeIntensity;
    const shakeY = (Math.random() - 0.5) * gameState.screenShakeIntensity;
    ctx.save();
    ctx.translate(shakeX, shakeY);
  }

  // Desenhar estrada
  drawRoad(ctx, gameState);

  // Desenhar gates (ordenados por Y)
  const sortedGates = [...entities.gates].sort((a, b) => a.y - b.y);
  for (const gate of sortedGates) {
    drawGate(ctx, gate);
  }

  // Desenhar hordas inimigas
  for (const horde of entities.enemyHordes) {
    if (horde.isActive) {
      drawEnemyHorde(ctx, horde, time);
    }
  }

  // Desenhar boss
  if (entities.boss && entities.boss.isActive) {
    drawBoss(ctx, entities.boss, time);
  }

  // Desenhar bullets
  drawBullets(ctx, entities.bullets);

  // Desenhar partículas (efeitos visuais)
  updateParticles();
  drawParticles(ctx);

  // Desenhar exército do jogador
  drawArmy(ctx, entities.playerArmy, time);

  // Desenhar Super Cannon beam (por cima de tudo exceto UI)
  drawSuperCannonBeam(ctx, entities.playerArmy.centerX, entities.playerArmy.centerY, gameState);

  if (gameState.screenShakeActive) {
    ctx.restore();
  }

  // UI
  drawUI(ctx, gameState, entities.playerArmy.soldiers.filter(s => s.isAlive).length);

  // Floating texts
  updateFloatingTexts();
  drawFloatingTexts(ctx);

  // Game over/Victory screen
  if (gameState.isGameOver) {
    drawGameOver(ctx, gameState);
  }
}
