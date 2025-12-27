// renderer.ts - RenderizaÃ§Ã£o do jogo estilo Crowd Runner
import { Entities, GameState, FloatingText, Army, EnemyHorde, Gate, Boss, Bullet } from './types';

const floatingTexts: FloatingText[] = [];

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
  
  // CÃ©u com cristais de gelo (como na segunda imagem)
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.4);
  skyGradient.addColorStop(0, '#87CEEB');
  skyGradient.addColorStop(1, '#B0E0E6');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);
  
  // Desenhar montanhas/cristais de gelo no fundo
  ctx.fillStyle = '#ADD8E6';
  for (let i = 0; i < 5; i++) {
    const x = i * (width / 4) - 50;
    const peakHeight = 100 + Math.sin(i * 1.5) * 50;
    ctx.beginPath();
    ctx.moveTo(x, height * 0.35);
    ctx.lineTo(x + 60, height * 0.35 - peakHeight);
    ctx.lineTo(x + 120, height * 0.35);
    ctx.closePath();
    ctx.fill();
  }
  
  // Estrada principal com perspectiva
  const roadTop = height * 0.2;
  const roadTopWidth = width * 0.4;
  const roadBottomWidth = width;
  
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
  
  const lineOffset = (gameState.distanceTraveled * 3) % 70;
  
  // Linha central
  ctx.beginPath();
  ctx.moveTo(width / 2, roadTop);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
  
  ctx.setLineDash([]);
}

function drawSoldier3D(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, animOffset: number, time: number): void {
  const bounce = Math.sin(time * 0.008 + animOffset) * 3;
  const scale = Math.max(0.5, 1 - (800 - y) / 1500); // Escala baseada na posiÃ§Ã£o Y (perspectiva)
  const actualSize = size * scale;
  
  // Sombra
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + actualSize * 0.8, actualSize * 0.6, actualSize * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Corpo (cÃ­rculo principal)
  const bodyGradient = ctx.createRadialGradient(x - actualSize * 0.2, y - actualSize * 0.2 + bounce, 0, x, y + bounce, actualSize);
  bodyGradient.addColorStop(0, color);
  bodyGradient.addColorStop(1, shadeColor(color, -30));
  
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.arc(x, y + bounce, actualSize * 0.7, 0, Math.PI * 2);
  ctx.fill();
  
  // CabeÃ§a
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

function drawArmy(ctx: CanvasRenderingContext2D, army: Army, time: number): void {
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
    
    // NÃºmero
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
    case 'multiply': text = `Ã—${gate.value}`; break;
    case 'subtract': text = `-${gate.value}`; break;
    case 'divide': text = `Ã·${gate.value}`; break;
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
    
    // NÃºcleo
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
  
  // Contador de exÃ©rcito
  ctx.fillStyle = '#E74C3C';
  ctx.beginPath();
  ctx.roundRect(width - 95, 10, 80, 30, 15);
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.fillText(`âš”ï¸ ${armyCount}`, width - 55, 28);
  
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
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, width, height);
  
  // TÃ­tulo
  ctx.fillStyle = gameState.isVictory ? '#2ECC71' : '#E74C3C';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 10;
  ctx.fillText(gameState.isVictory ? 'í¾‰ VITÃ“RIA!' : 'í²€ GAME OVER', width / 2, height / 2 - 80);
  
  ctx.shadowBlur = 0;
  
  // Scores
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '28px Arial';
  ctx.fillText(`Score: ${gameState.score}`, width / 2, height / 2);
  
  ctx.fillStyle = '#FFD700';
  ctx.font = '22px Arial';
  ctx.fillText(`í¿† High Score: ${gameState.highScore}`, width / 2, height / 2 + 45);
  
  // BotÃ£o de restart
  ctx.fillStyle = '#3498DB';
  ctx.beginPath();
  ctx.roundRect(width / 2 - 100, height / 2 + 80, 200, 50, 25);
  ctx.fill();
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('í´„ JOGAR NOVAMENTE', width / 2, height / 2 + 110);
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
  
  // Desenhar exÃ©rcito do jogador
  drawArmy(ctx, entities.playerArmy, time);
  
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
