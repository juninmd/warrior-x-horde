// renderer.ts - Renderização do jogo estilo Crowd Runner
import { Entities, GameState, FloatingText, Army, EnemyHorde, Gate, Boss, Bullet, Particle, MysteryBox } from './types';
import { ObjectPool } from './pool';

const floatingTexts: FloatingText[] = [];
const particles: Particle[] = [];

// Pool de partículas
const particlePool = new ObjectPool<Particle>(
  () => ({ x: 0, y: 0, vx: 0, vy: 0, color: '#FFF', size: 0, life: 0, maxLife: 0, type: 'spark' }),
  (p) => {
    p.x = 0;
    p.y = 0;
    p.vx = 0;
    p.vy = 0;
    p.color = '#FFF';
    p.size = 0;
    p.life = 0;
    p.maxLife = 0;
    p.type = 'spark';
  }
);

// Limite máximo de partículas para evitar travamentos
const MAX_PARTICLES = 50; // Reduzido de 100 para 50

// Limite máximo de soldados renderizados por grupo (para performance)
const MAX_RENDERED_SOLDIERS = 100;

// Sistema de partículas (reduzido para melhor performance)
export function addParticle(x: number, y: number, type: Particle['type'], color: string, count = 1): void {
  // Limitar quantidade de partículas
  if (particles.length >= MAX_PARTICLES) return;

  // Reduzir count se estiver chegando no limite
  const availableSlots = MAX_PARTICLES - particles.length;
  const actualCount = Math.min(count, availableSlots, 2); // Máximo 2 partículas por vez (era 3)

  for (let i = 0; i < actualCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = type === 'explosion' ? 1.5 + Math.random() * 2.5 : 0.8 + Math.random() * 1.5;

    const p = particlePool.get();
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - (type === 'star' ? 1.5 : 0);
    p.color = color;
    p.size = type === 'explosion' ? 2 + Math.random() * 2.5 : 1.5 + Math.random() * 2;
    p.life = 1;
    p.maxLife = 1;
    p.type = type;

    particles.push(p);
  }
}

export function addExplosion(x: number, y: number, color: string): void {
  addParticle(x, y, 'explosion', color, 2); // Reduzido de 3 para 2
  addParticle(x, y, 'spark', '#FFD700', 1); // Reduzido de 2 para 1
}

export function addTrail(x: number, y: number, color: string): void {
  if (Math.random() < 0.08) { // Reduzido de 0.15 para 0.08
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
      particlePool.release(p);
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

// Cores do bioma baseadas no nível
function getBiomeColors(level: number): { sky: [string, string], ground: [string, string], road: [string, string], tree: string } {
  if (level >= 10) {
    // Alien Dimension
    return {
      sky: ['#1a0b2e', '#4a148c'], // Roxo escuro
      ground: ['#2e0b3d', '#4a148c'], // Roxo neon
      road: ['#000000', '#1a1a1a'], // Preto asfalto espacial
      tree: '#ff00ff' // Árvores alienígenas
    };
  } else if (level >= 7) {
    // Hell / Volcanic
    return {
      sky: ['#300000', '#500000'], // Vermelho escuro
      ground: ['#1a0500', '#3d0a00'], // Lava seca
      road: ['#2e0b0b', '#3d0a0a'], // Pedra queimada
      tree: '#800000' // Árvores mortas
    };
  } else if (level >= 4) {
    // Wasteland / Desert
    return {
      sky: ['#e67e22', '#f1c40f'], // Laranja
      ground: ['#d35400', '#e67e22'], // Areia laranja
      road: ['#7f8c8d', '#95a5a6'], // Asfalto poeirento
      tree: '#8e44ad' // Cactus ou vegetação seca
    };
  } else {
    // Grasslands (Padrão)
    return {
      sky: ['#87CEEB', '#E0F4FF'], // Azul céu
      ground: ['#4A7C59', '#7CAC7C'], // Verde
      road: ['#3D3D3D', '#5A5A5A'], // Cinza asfalto
      tree: '#2d5a2d' // Verde árvore
    };
  }
}

function drawRoad(ctx: CanvasRenderingContext2D, gameState: GameState): void {
  const { width, height } = ctx.canvas;
  const time = Date.now();
  const colors = getBiomeColors(gameState.currentLevel);

  // Definir linha do horizonte onde começa a grama e a estrada visível
  const horizonY = height * 0.22; // Linha do horizonte um pouco mais baixa

  // Céu com gradiente dinâmico
  const skyGradient = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGradient.addColorStop(0, colors.sky[0]);
  skyGradient.addColorStop(1, colors.sky[1]);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, horizonY + 10);

  // Sol ou Lua (dependendo do bioma)
  if (gameState.currentLevel < 7) {
    // Sol
    const sunX = width * 0.82;
    const sunY = height * 0.08;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 60);
    sunGlow.addColorStop(0, 'rgba(255, 255, 220, 1)');
    sunGlow.addColorStop(0.2, 'rgba(255, 240, 180, 0.9)');
    sunGlow.addColorStop(0.5, 'rgba(255, 220, 150, 0.4)');
    sunGlow.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Lua vermelha ou roxa
    const moonX = width * 0.82;
    const moonY = height * 0.08;
    ctx.fillStyle = gameState.currentLevel >= 10 ? '#E0B0FF' : '#FF4444';
    ctx.shadowColor = gameState.currentLevel >= 10 ? '#E0B0FF' : '#FF0000';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Nuvens ou fumaça
  ctx.fillStyle = gameState.currentLevel >= 7 ? 'rgba(50, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.7)';
  const cloudOffset = (time * 0.01) % (width + 300);
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 200 + cloudOffset) % (width + 150)) - 75;
    const cy = 25 + i * 15 + Math.sin(i) * 10;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 40, 15, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 25, cy - 5, 30, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 20, cy + 2, 25, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Montanhas distantes no horizonte
  ctx.fillStyle = gameState.currentLevel >= 7 ? '#200000' : '#A8C4D8';
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  for (let i = 0; i <= width; i += 40) {
    const peakHeight = 25 + Math.sin(i * 0.02) * 15 + Math.sin(i * 0.05) * 10;
    ctx.lineTo(i, horizonY - peakHeight);
  }
  ctx.lineTo(width, horizonY);
  ctx.closePath();
  ctx.fill();

  // Camada mais próxima de montanhas
  ctx.fillStyle = gameState.currentLevel >= 7 ? '#400000' : '#7BA3BD';
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  for (let i = 0; i <= width; i += 50) {
    const peakHeight = 35 + Math.sin(i * 0.025 + 1) * 20 + Math.sin(i * 0.04) * 12;
    ctx.lineTo(i, horizonY - peakHeight);
  }
  ctx.lineTo(width, horizonY);
  ctx.closePath();
  ctx.fill();

  // === NAVE ALIENÍGENA NO CÉU ===
  // Apenas desenhar a nave decorativa se NÃO for o nível 10+ (pois lá a nave é o BOSS)
  if (gameState.currentLevel < 10) {
    const shipX = width / 2;
    const shipY = 25; // Mais para cima ainda
    drawAlienShip(ctx, shipX, shipY, time, horizonY);
  }

  // Área do chão (grama/areia/lava)
  const groundGradient = ctx.createLinearGradient(0, horizonY, 0, height);
  groundGradient.addColorStop(0, colors.ground[0]);
  groundGradient.addColorStop(1, colors.ground[1]);
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, horizonY, width, height - horizonY);

  // Detalhes do chão (rachaduras ou grama)
  ctx.strokeStyle = gameState.currentLevel >= 7 ? 'rgba(255, 100, 0, 0.2)' : 'rgba(50, 100, 50, 0.15)';
  ctx.lineWidth = 1;
  for (let y = horizonY + 20; y < height; y += 30) {
    for (let x = 0; x < width; x += 15) {
      if (Math.random() > 0.7) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 3, y - 5);
        ctx.stroke();
      }
    }
  }

  // === ESTRADA PRINCIPAL - começa no horizonte, NÃO no céu ===
  const roadStartY = horizonY; // Estrada começa no horizonte
  const roadHorizonWidth = width * 0.18; // Largura no horizonte
  const roadBottomWidth = width * 0.95; // Quase toda largura embaixo

  // Asfalto com gradiente realista
  const roadGradient = ctx.createLinearGradient(0, roadStartY, 0, height);
  roadGradient.addColorStop(0, colors.road[0]); // Cor distante
  roadGradient.addColorStop(1, colors.road[1]); // Cor próxima
  ctx.fillStyle = roadGradient;
  ctx.beginPath();
  ctx.moveTo(width / 2 - roadHorizonWidth / 2, roadStartY);
  ctx.lineTo(width / 2 + roadHorizonWidth / 2, roadStartY);
  ctx.lineTo(width / 2 + roadBottomWidth / 2, height);
  ctx.lineTo(width / 2 - roadBottomWidth / 2, height);
  ctx.closePath();
  ctx.fill();

  // Bordas da estrada (acostamento)
  ctx.fillStyle = gameState.currentLevel >= 7 ? '#1a0500' : '#8B8B7A';
  const borderWidth = 8;

  // Borda esquerda
  ctx.beginPath();
  ctx.moveTo(width / 2 - roadHorizonWidth / 2, roadStartY);
  ctx.lineTo(width / 2 - roadHorizonWidth / 2 - 3, roadStartY);
  ctx.lineTo(width / 2 - roadBottomWidth / 2 - borderWidth, height);
  ctx.lineTo(width / 2 - roadBottomWidth / 2, height);
  ctx.closePath();
  ctx.fill();

  // Borda direita
  ctx.beginPath();
  ctx.moveTo(width / 2 + roadHorizonWidth / 2, roadStartY);
  ctx.lineTo(width / 2 + roadHorizonWidth / 2 + 3, roadStartY);
  ctx.lineTo(width / 2 + roadBottomWidth / 2 + borderWidth, height);
  ctx.lineTo(width / 2 + roadBottomWidth / 2, height);
  ctx.closePath();
  ctx.fill();

  // Faixas pontilhadas amarelas (centro da estrada)
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 4;
  ctx.setLineDash([30, 40]);
  ctx.beginPath();
  ctx.moveTo(width / 2, roadStartY + 10);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Linhas laterais brancas da estrada
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 30]);

  // Linha esquerda
  ctx.beginPath();
  ctx.moveTo(width / 2 - roadHorizonWidth / 2 + 5, roadStartY + 10);
  ctx.lineTo(width / 2 - roadBottomWidth / 2 + 30, height);
  ctx.stroke();

  // Linha direita
  ctx.beginPath();
  ctx.moveTo(width / 2 + roadHorizonWidth / 2 - 5, roadStartY + 10);
  ctx.lineTo(width / 2 + roadBottomWidth / 2 - 30, height);
  ctx.stroke();

  ctx.setLineDash([]);

  // Árvores nas laterais
  for (let i = 0; i < 8; i++) {
    const treeY = horizonY + 50 + i * 85;
    if (treeY > height - 80) continue;

    const progress = (treeY - horizonY) / (height - horizonY);
    const treeSize = 10 + progress * 25;

    // Calcular largura da estrada nesta posição Y
    const treeProgress = (treeY - roadStartY) / (height - roadStartY);
    const roadWidthAtY = roadHorizonWidth + (roadBottomWidth - roadHorizonWidth) * treeProgress;

    // Árvore esquerda
    const leftX = (width - roadWidthAtY) / 2 - 30 - progress * 20;
    if (leftX > 15) drawTree(ctx, leftX, treeY, treeSize, colors.tree);

    // Árvore direita
    const rightX = (width + roadWidthAtY) / 2 + 30 + progress * 20;
    if (rightX < width - 15) drawTree(ctx, rightX, treeY, treeSize, colors.tree);
  }

  // Arbustos pequenos perto da estrada
  ctx.fillStyle = gameState.currentLevel >= 7 ? '#200000' : '#4A6A4A';
  for (let i = 0; i < 6; i++) {
    const bushY = horizonY + 80 + i * 100;
    if (bushY > height - 100) continue;

    const progress = (bushY - horizonY) / (height - horizonY);
    const bushSize = 6 + progress * 10;
    const roadWidthAtBush = roadHorizonWidth + (roadBottomWidth - roadHorizonWidth) * progress;

    // Arbusto esquerdo
    const leftBushX = (width - roadWidthAtBush) / 2 - 15;
    ctx.beginPath();
    ctx.arc(leftBushX, bushY, bushSize, 0, Math.PI * 2);
    ctx.fill();

    // Arbusto direito
    const rightBushX = (width + roadWidthAtBush) / 2 + 15;
    ctx.beginPath();
    ctx.arc(rightBushX, bushY, bushSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Função auxiliar para desenhar árvores
function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string = '#2d5a2d'): void {
  // Sombra da árvore
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x + size * 0.2, y + size * 0.45, size * 0.35, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tronco (cor fixa)
  ctx.fillStyle = '#2c1e14';
  ctx.fillRect(x - size * 0.1, y, size * 0.2, size * 0.4);

  // Copa da árvore
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - size * 0.2, size * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = shadeColor(color, 20);
  ctx.beginPath();
  ctx.arc(x - size * 0.15, y - size * 0.1, size * 0.3, 0, Math.PI * 2);
  ctx.arc(x + size * 0.15, y - size * 0.1, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

// Função para desenhar nave alienígena no horizonte
function drawAlienShip(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, horizonY: number = 200): void {
  const hover = Math.sin(time * 0.002) * 3; // Leve flutuação
  const shipY = y + hover;

  ctx.save();

  // Brilho/aura da nave (energia alienígena) - maior
  const glowRadius = 55 + Math.sin(time * 0.005) * 8;
  const glow = ctx.createRadialGradient(x, shipY, 0, x, shipY, glowRadius);
  glow.addColorStop(0, 'rgba(0, 255, 150, 0.4)');
  glow.addColorStop(0.5, 'rgba(0, 200, 100, 0.2)');
  glow.addColorStop(1, 'rgba(0, 150, 80, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, shipY, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // Corpo principal da nave (disco) - maior
  const bodyGradient = ctx.createLinearGradient(x - 45, shipY - 12, x + 45, shipY + 12);
  bodyGradient.addColorStop(0, '#2a2a3a');
  bodyGradient.addColorStop(0.3, '#4a4a6a');
  bodyGradient.addColorStop(0.5, '#6a6a8a');
  bodyGradient.addColorStop(0.7, '#4a4a6a');
  bodyGradient.addColorStop(1, '#2a2a3a');
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.ellipse(x, shipY, 45, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Borda metálica
  ctx.strokeStyle = '#8a8aaa';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cúpula superior (cockpit) - maior
  const domeGradient = ctx.createRadialGradient(x - 5, shipY - 15, 0, x, shipY - 10, 22);
  domeGradient.addColorStop(0, '#66ffaa');
  domeGradient.addColorStop(0.4, '#33cc77');
  domeGradient.addColorStop(0.7, '#229955');
  domeGradient.addColorStop(1, '#116633');
  ctx.fillStyle = domeGradient;
  ctx.beginPath();
  ctx.ellipse(x, shipY - 5, 18, 15, 0, Math.PI, 0);
  ctx.fill();

  // Reflexo na cúpula
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.ellipse(x - 5, shipY - 12, 6, 4, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Luzes piscando na base da nave
  const lightCount = 8;
  for (let i = 0; i < lightCount; i++) {
    const angle = (i / lightCount) * Math.PI * 2 + time * 0.003;
    const lightX = x + Math.cos(angle) * 38;
    const lightY = shipY + Math.sin(angle) * 9;
    const brightness = (Math.sin(time * 0.01 + i) + 1) / 2;

    ctx.fillStyle = `rgba(0, 255, 150, ${0.5 + brightness * 0.5})`;
    ctx.beginPath();
    ctx.arc(lightX, lightY, 2.5 + brightness * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Raio trator GRANDE (luz que desce da nave até o horizonte)
  const beamEndY = horizonY + 50; // Até depois do horizonte
  const beamIntensity = (Math.sin(time * 0.003) + 1) / 2 * 0.3 + 0.15;
  const beamGradient = ctx.createLinearGradient(x, shipY + 12, x, beamEndY);
  beamGradient.addColorStop(0, `rgba(0, 255, 150, ${beamIntensity})`);
  beamGradient.addColorStop(0.3, `rgba(0, 220, 120, ${beamIntensity * 0.7})`);
  beamGradient.addColorStop(0.6, `rgba(0, 180, 100, ${beamIntensity * 0.4})`);
  beamGradient.addColorStop(1, 'rgba(0, 150, 80, 0)');
  ctx.fillStyle = beamGradient;
  ctx.beginPath();
  ctx.moveTo(x - 25, shipY + 10);
  ctx.lineTo(x + 25, shipY + 10);
  ctx.lineTo(x + 80, beamEndY);
  ctx.lineTo(x - 80, beamEndY);
  ctx.closePath();
  ctx.fill();

  // Partículas descendo no raio trator (mais partículas)
  ctx.fillStyle = 'rgba(150, 255, 200, 0.7)';
  const beamHeight = beamEndY - shipY;
  for (let i = 0; i < 12; i++) {
    const particleProgress = ((time * 0.08 + i * 20) % beamHeight) / beamHeight;
    const particleY = shipY + 15 + particleProgress * (beamHeight - 20);
    const beamWidthAtY = 25 + particleProgress * 55;
    const particleX = x + Math.sin(time * 0.004 + i * 1.5) * beamWidthAtY * 0.6;
    const particleSize = 1.5 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSoldier3D(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, animOffset: number, time: number): void {
  const bounce = Math.sin(time * 0.008 + animOffset) * 3;
  const scale = Math.max(0.5, 1 - (800 - y) / 1500); // Escala baseada na posição Y (perspectiva)
  const actualSize = size * scale;
  const isPlayer = color === '#4A90D9' || color === '#FFD700'; // Player (azul) ou Super (dourado)

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

  if (isPlayer) {
    // Detalhe: Escudo pequeno
    ctx.fillStyle = shadeColor(color, 20);
    ctx.beginPath();
    ctx.arc(x - actualSize * 0.4, y + bounce + actualSize * 0.2, actualSize * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Detalhe: Espada (linha simples)
    ctx.strokeStyle = '#DDD';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + actualSize * 0.3, y + bounce);
    ctx.lineTo(x + actualSize * 0.8, y + bounce - actualSize * 0.4);
    ctx.stroke();
  } else {
    // Detalhe Inimigo: Espinhos
    ctx.fillStyle = shadeColor(color, -50);
    // Espinho esquerdo
    ctx.beginPath();
    ctx.moveTo(x - actualSize * 0.6, y + bounce - actualSize * 0.2);
    ctx.lineTo(x - actualSize * 0.9, y + bounce - actualSize * 0.5);
    ctx.lineTo(x - actualSize * 0.4, y + bounce - actualSize * 0.4);
    ctx.fill();
    // Espinho direito
    ctx.beginPath();
    ctx.moveTo(x + actualSize * 0.6, y + bounce - actualSize * 0.2);
    ctx.lineTo(x + actualSize * 0.9, y + bounce - actualSize * 0.5);
    ctx.lineTo(x + actualSize * 0.4, y + bounce - actualSize * 0.4);
    ctx.fill();
  }

  // Cabeça
  const headGradient = ctx.createRadialGradient(x - actualSize * 0.1, y - actualSize * 0.6 + bounce, 0, x, y - actualSize * 0.5 + bounce, actualSize * 0.4);
  // Inimigos têm pele diferente (esverdeada/cinza) se não forem o player
  if (isPlayer) {
    headGradient.addColorStop(0, '#FFE4C4');
    headGradient.addColorStop(1, '#DEB887');
  } else {
    headGradient.addColorStop(0, '#90EE90'); // Pele monstro claro
    headGradient.addColorStop(1, '#2E8B57'); // Pele monstro escuro
  }

  ctx.fillStyle = headGradient;
  ctx.beginPath();
  ctx.arc(x, y - actualSize * 0.5 + bounce, actualSize * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Capacete
  ctx.fillStyle = shadeColor(color, -40);
  ctx.beginPath();
  ctx.arc(x, y - actualSize * 0.6 + bounce, actualSize * 0.35, Math.PI, 0);
  ctx.fill();

  // Olhos brilhantes para inimigos
  if (!isPlayer) {
    ctx.fillStyle = '#FFD700'; // Olhos amarelos
    ctx.beginPath();
    ctx.arc(x - actualSize * 0.15, y - actualSize * 0.5 + bounce, actualSize * 0.1, 0, Math.PI * 2);
    ctx.arc(x + actualSize * 0.15, y - actualSize * 0.5 + bounce, actualSize * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
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
    if (aliveSoldiers.length > 0 && Math.random() < 0.3) { // Reduzido de 0.5
      const randomSoldier = aliveSoldiers[Math.floor(Math.random() * aliveSoldiers.length)];
      addTrail(randomSoldier.x, randomSoldier.y + 10, '#4A90D9');
    }
  }
  lastArmyX = army.centerX;

  // Ordenar soldados por Y para depth sorting
  let sortedSoldiers = [...army.soldiers].filter(s => s.isAlive).sort((a, b) => a.y - b.y);

  // OTIMIZAÇÃO: Limitar renderização a MAX_RENDERED_SOLDIERS
  // Priorizar super guerreiros e soldados mais visíveis (mais próximos do centro)
  if (sortedSoldiers.length > MAX_RENDERED_SOLDIERS) {
    // Separar super guerreiros (sempre renderizar)
    const superSoldiers = sortedSoldiers.filter(s => s.isSuper);
    const normalSoldiers = sortedSoldiers.filter(s => !s.isSuper);

    // Pegar os mais próximos do centro da tela
    const remainingSlots = MAX_RENDERED_SOLDIERS - superSoldiers.length;
    const selectedNormal = normalSoldiers.slice(0, Math.max(0, remainingSlots));

    sortedSoldiers = [...superSoldiers, ...selectedNormal].sort((a, b) => a.y - b.y);
  }

  for (const soldier of sortedSoldiers) {
    // Super guerreiros são desenhados com efeito especial (dourados e maiores)
    if (soldier.isSuper) {
      // Aura dourada
      ctx.save();
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 15;
      drawSoldier3D(ctx, soldier.x, soldier.y, soldier.size, '#FFD700', soldier.animOffset, time);
      ctx.restore();

      // Estrela acima do super guerreiro
      ctx.fillStyle = '#FFD700';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('⭐', soldier.x, soldier.y - soldier.size - 5);
    } else {
      drawSoldier3D(ctx, soldier.x, soldier.y, soldier.size, soldier.color, soldier.animOffset, time);
    }
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
  let sortedSoldiers = [...horde.soldiers].filter(s => s.isAlive).sort((a, b) => a.y - b.y);

  // OTIMIZAÇÃO: Limitar renderização a MAX_RENDERED_SOLDIERS
  if (sortedSoldiers.length > MAX_RENDERED_SOLDIERS) {
    // Pegar uma amostra distribuída uniformemente
    const step = sortedSoldiers.length / MAX_RENDERED_SOLDIERS;
    const sampled: typeof sortedSoldiers = [];
    for (let i = 0; i < MAX_RENDERED_SOLDIERS; i++) {
      sampled.push(sortedSoldiers[Math.floor(i * step)]);
    }
    sortedSoldiers = sampled;
  }

  // FadeIn effect - inimigos aparecem gradualmente quando saem da nave
  const fadeStartY = 100; // Começa a aparecer
  const fadeEndY = 200;   // Totalmente visível
  const hordeAlpha = horde.y < fadeStartY ? 0 :
                     horde.y < fadeEndY ? (horde.y - fadeStartY) / (fadeEndY - fadeStartY) : 1;

  if (hordeAlpha <= 0) return; // Não desenhar se totalmente invisível

  ctx.save();
  ctx.globalAlpha = hordeAlpha;

  for (const soldier of sortedSoldiers) {
    drawSoldier3D(ctx, soldier.x, soldier.y, soldier.size, soldier.color, soldier.animOffset, time);
  }

  // Contador de inimigos (usa contagem REAL, não a renderizada)
  const count = horde.soldiers.filter(s => s.isAlive).length;
  if (count > 0 && hordeAlpha > 0.5) {
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

  ctx.restore();
}

function drawMysteryBox(ctx: CanvasRenderingContext2D, box: MysteryBox, time: number): void {
  if (box.passed) return;

  const scale = Math.max(0.5, 1 - (800 - box.y) / 1500);
  const width = box.width * scale;
  const height = box.height * scale;
  const x = box.x - width / 2;
  const y = box.y;

  // Flutuação
  const hover = Math.sin(time * 0.005) * 5;

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + hover);
  // Rotação leve
  ctx.rotate(Math.sin(time * 0.003) * 0.1);

  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, height, width * 0.6, height * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Caixa
  const gradient = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
  gradient.addColorStop(0, '#9B59B6'); // Roxo
  gradient.addColorStop(0.5, '#8E44AD');
  gradient.addColorStop(1, '#6C3483');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(-width / 2, -height / 2, width, height, 8);
  ctx.fill();

  // Borda brilhante
  ctx.strokeStyle = '#E056FD';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Ponto de interrogação
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.floor(30 * scale)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 0, 0);

  ctx.restore();
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
    case 'superwarrior': text = `⭐×${gate.value}`; break;
  }

  ctx.fillText(text, x + width / 2, gate.y + height / 2);
  ctx.restore();
}

// Boss final - Nave Mãe Alienígena (Scarier version)
function drawMothershipBoss(ctx: CanvasRenderingContext2D, boss: Boss, time: number): void {
  const { width } = ctx.canvas;
  const x = width / 2;
  const y = boss.y;
  const hover = Math.sin(time * 0.002) * 5; // Mais movimento
  const shipY = y + hover;
  const damageFlash = boss.hp < boss.maxHp * 0.3 ? Math.sin(time * 0.05) * 0.5 : 0; // Flash mais rápido e intenso

  ctx.save();

  // Aura de Tensão (Dark Void)
  const voidRadius = 250 + Math.sin(time * 0.003) * 20;
  const voidGlow = ctx.createRadialGradient(x, shipY, 50, x, shipY, voidRadius);
  voidGlow.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
  voidGlow.addColorStop(0.5, 'rgba(20, 0, 40, 0.4)');
  voidGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
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
    damageAura.addColorStop(0, `rgba(255, 0, 0, ${0.4 + damageFlash})`);
    damageAura.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = damageAura;
    ctx.beginPath();
    ctx.arc(x, shipY, 120, 0, Math.PI * 2);
    ctx.fill();
  }

  // Corpo principal da nave (disco) - Mais escuro e sinistro
  const bodyGradient = ctx.createLinearGradient(x - 90, shipY - 25, x + 90, shipY + 25);
  bodyGradient.addColorStop(0, '#000000');
  bodyGradient.addColorStop(0.3, '#1a0b2e'); // Roxo muito escuro
  bodyGradient.addColorStop(0.5, '#2e0b3d');
  bodyGradient.addColorStop(0.7, '#1a0b2e');
  bodyGradient.addColorStop(1, '#000000');
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
  domeGradient.addColorStop(0, '#ffcccc');
  domeGradient.addColorStop(0.3, domeColor);
  domeGradient.addColorStop(1, '#330000');

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
  const barY = shipY + 45;

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
    hpGradient.addColorStop(0, '#00FF88');
    hpGradient.addColorStop(1, '#00CC66');
  } else if (hpPercent > 0.25) {
    hpGradient.addColorStop(0, '#FFAA00');
    hpGradient.addColorStop(1, '#FF8800');
  } else {
    hpGradient.addColorStop(0, '#FF4444');
    hpGradient.addColorStop(1, '#CC0000');
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
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 4;
  ctx.fillText('🛸 NAVE MÃE ALIENÍGENA 🛸', x, barY - 10);

  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(`${Math.ceil(boss.hp)} / ${boss.maxHp}`, x, barY + barHeight / 2 + 4);
}

// Funções de desenho específicas para variantes de boss

function drawBossBeast(ctx: CanvasRenderingContext2D, boss: Boss, time: number): void {
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

function drawBossMachine(ctx: CanvasRenderingContext2D, boss: Boss, time: number): void {
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
  for(let dx of [-1, 1]) {
    for(let dy of [-1, 1]) {
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

function drawBossDemon(ctx: CanvasRenderingContext2D, boss: Boss, time: number): void {
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;
  const pulse = Math.sin(time * 0.008) * 5;

  // Aura de fogo
  const gradient = ctx.createRadialGradient(cx, cy, 30, cx, cy, 70 + pulse);
  gradient.addColorStop(0, '#FFA500');
  gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
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
  ctx.shadowColor = '#FF0000';
  ctx.shadowBlur = 10;
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
  ctx.shadowBlur = 0;
}

function drawBoss(ctx: CanvasRenderingContext2D, boss: Boss, time: number): void {
  // Sombra genérica base
  const cx = boss.x + boss.width / 2;
  const cy = boss.y + boss.height / 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(cx, boss.y + boss.height + 20, boss.width / 2 + 10, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dispatch para tipo específico
  if (boss.type === 'mothership') {
    drawMothershipBoss(ctx, boss, time);
    return;
  } else if (boss.type === 'machine') {
    drawBossMachine(ctx, boss, time);
  } else if (boss.type === 'demon') {
    drawBossDemon(ctx, boss, time);
  } else if (boss.type === 'beast') {
    drawBossBeast(ctx, boss, time);
  } else {
    // Fallback: Normal (código original simplificado ou reutilizar Demon/Beast)
    drawBossBeast(ctx, boss, time);
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

  // Texto HP com Nome do Boss
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';

  let bossName = 'BOSS';
  if (boss.type === 'machine') bossName = 'MECHA TANK';
  else if (boss.type === 'demon') bossName = 'DEMON LORD';
  else if (boss.type === 'beast') bossName = 'GIANT BEAST';

  ctx.fillText(`${bossName}: ${Math.ceil(boss.hp)}`, barX + barWidth / 2, barY + barHeight / 2 + 4);
}

function drawMiniBoss(ctx: CanvasRenderingContext2D, miniBoss: { x: number; y: number; width: number; height: number; hp: number; maxHp: number; isActive: boolean; color: string }, time: number): void {
  if (!miniBoss.isActive) return;

  const pulse = Math.sin(time * 0.008) * 5;

  // Sombra
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(miniBoss.x + miniBoss.width / 2, miniBoss.y + miniBoss.height + 10, miniBoss.width / 2, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Corpo do mini-boss
  const bossGradient = ctx.createRadialGradient(
    miniBoss.x + miniBoss.width / 2 - 10, miniBoss.y + miniBoss.height / 2 - 10, 0,
    miniBoss.x + miniBoss.width / 2, miniBoss.y + miniBoss.height / 2, miniBoss.width / 2 + pulse
  );
  bossGradient.addColorStop(0, '#FF6347');
  bossGradient.addColorStop(1, '#FF4500');

  ctx.fillStyle = bossGradient;
  ctx.beginPath();
  ctx.arc(miniBoss.x + miniBoss.width / 2, miniBoss.y + miniBoss.height / 2, miniBoss.width / 2 + pulse, 0, Math.PI * 2);
  ctx.fill();

  // Olhos
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(miniBoss.x + miniBoss.width * 0.35, miniBoss.y + miniBoss.height * 0.4, 8, 0, Math.PI * 2);
  ctx.arc(miniBoss.x + miniBoss.width * 0.65, miniBoss.y + miniBoss.height * 0.4, 8, 0, Math.PI * 2);
  ctx.fill();

  // Pupilas
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(miniBoss.x + miniBoss.width * 0.35, miniBoss.y + miniBoss.height * 0.4, 3, 0, Math.PI * 2);
  ctx.arc(miniBoss.x + miniBoss.width * 0.65, miniBoss.y + miniBoss.height * 0.4, 3, 0, Math.PI * 2);
  ctx.fill();

  // Barra de vida menor
  const barWidth = 100;
  const barHeight = 15;
  const barX = miniBoss.x + miniBoss.width / 2 - barWidth / 2;
  const barY = miniBoss.y - 25;

  // Fundo da barra
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 3);
  ctx.fill();

  // Vida (laranja)
  const hpGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
  hpGradient.addColorStop(0, '#FF6347');
  hpGradient.addColorStop(1, '#FF4500');

  ctx.fillStyle = hpGradient;
  ctx.beginPath();
  ctx.roundRect(barX + 2, barY + 2, (barWidth - 4) * (miniBoss.hp / miniBoss.maxHp), barHeight - 4, 2);
  ctx.fill();

  // Borda
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 3);
  ctx.stroke();

  // Label "MINI-BOSS"
  ctx.fillStyle = '#FF4500';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('MINI-BOSS', miniBoss.x + miniBoss.width / 2, barY - 5);
}

// Atmosfera tensa quando o boss aparece
function drawBossAtmosphere(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number, time: number): void {
  // Escurecimento gradual das bordas (vinheta)
  const vignetteGradient = ctx.createRadialGradient(
    width / 2, height / 2, height * 0.3,
    width / 2, height / 2, height * 0.9
  );
  vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignetteGradient.addColorStop(0.5, `rgba(20, 0, 0, ${0.3 * intensity})`);
  vignetteGradient.addColorStop(1, `rgba(50, 0, 0, ${0.7 * intensity})`);

  ctx.fillStyle = vignetteGradient;
  ctx.fillRect(0, 0, width, height);

  // Overlay vermelho pulsante
  const pulse = (Math.sin(time * 0.003) + 1) / 2; // 0 a 1
  ctx.fillStyle = `rgba(100, 0, 0, ${0.1 * intensity * pulse})`;
  ctx.fillRect(0, 0, width, height);

  // Raios/relâmpagos ocasionais
  if (Math.random() < 0.02 * intensity) {
    ctx.fillStyle = `rgba(255, 50, 50, ${0.3 * intensity})`;
    ctx.fillRect(0, 0, width, height);
  }

  // Partículas de fogo/cinzas caindo
  if (Math.random() < 0.3 * intensity) {
    const ashX = Math.random() * width;
    const ashY = Math.random() * height;
    ctx.fillStyle = `rgba(255, 100, 50, ${0.5 * intensity})`;
    ctx.beginPath();
    ctx.arc(ashX, ashY, 1 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Texto de aviso pulsante
  if (intensity > 0.5) {
    const warningAlpha = (Math.sin(time * 0.01) + 1) / 2;
    ctx.save();
    ctx.fillStyle = `rgba(255, 0, 0, ${warningAlpha * intensity * 0.8})`;
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = 20;
    ctx.fillText('⚠️ BOSS ⚠️', width / 2, 100);
    ctx.restore();
  }
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
  const { width, height } = ctx.canvas;

  // Badges pequenos nos cantos inferiores (sem fundo escuro grande)
  const bottomY = height - 25;
  const badgeHeight = 22;

  // Level badge - canto inferior esquerdo
  ctx.fillStyle = 'rgba(52, 152, 219, 0.9)';
  ctx.beginPath();
  ctx.roundRect(5, bottomY - badgeHeight/2, 70, badgeHeight, 11);
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Level ${gameState.currentLevel}`, 40, bottomY + 4);

  // Score - centro inferior
  ctx.fillStyle = 'rgba(46, 204, 113, 0.9)';
  ctx.beginPath();
  ctx.roundRect(width / 2 - 40, bottomY - badgeHeight/2, 80, badgeHeight, 11);
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.fillText(`${gameState.score}`, width / 2, bottomY + 4);

  // Contador de exército - canto inferior direito
  ctx.fillStyle = 'rgba(231, 76, 60, 0.9)';
  ctx.beginPath();
  ctx.roundRect(width - 75, bottomY - badgeHeight/2, 70, badgeHeight, 11);
  ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.fillText(`⚔️ ${armyCount}`, width - 40, bottomY + 4);

  // Barra de progresso fina no topo da tela
  const progressWidth = width - 20;
  const progress = Math.min(gameState.distanceTraveled / gameState.levelDistance, 1);
  const progressY = 5;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.roundRect(10, progressY, progressWidth, 5, 2);
  ctx.fill();

  const progressGradient = ctx.createLinearGradient(10, progressY, 10 + progressWidth, progressY);
  progressGradient.addColorStop(0, '#2ECC71');
  progressGradient.addColorStop(1, '#27AE60');

  ctx.fillStyle = progressGradient;
  ctx.beginPath();
  ctx.roundRect(10, progressY, progressWidth * progress, 5, 2);
  ctx.fill();

  // Combo indicator (se houver combo ativo)
  if (gameState.combo > 1) {
    const comboX = width / 2;
    const comboY = 35;
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

    // Barra de tempo do combo (4 segundos agora)
    const comboProgress = gameState.comboTimer / 4000; // 4 segundos
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(-50, 10, 100, 6);
    ctx.fillStyle = getComboColor(gameState.combo);
    ctx.fillRect(-50, 10, 100 * comboProgress, 6);

    ctx.restore();
  }
}

function getComboColor(combo: number): string {
  if (combo >= 15) return '#00FFFF'; // Ciano para combo LENDÁRIO
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

  // Fundo especial para vitória final (level 10+)
  const isFinalVictory = gameState.isVictory && gameState.currentLevel >= 10;

  if (isFinalVictory) {
    // Fundo com efeito de celebração (gradiente colorido)
    const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, height);
    bgGradient.addColorStop(0, 'rgba(0, 50, 30, 0.95)');
    bgGradient.addColorStop(1, 'rgba(0, 20, 10, 0.98)');
    ctx.fillStyle = bgGradient;
  } else {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  }
  ctx.fillRect(0, 0, width, height);

  // Título com efeito de pulsação
  const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.05;
  ctx.save();
  ctx.translate(width / 2, height / 2 - 120);
  ctx.scale(pulse, pulse);

  if (isFinalVictory) {
    // Vitória final épica!
    ctx.fillStyle = '#00FF88';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00FF88';
    ctx.shadowBlur = 30;
    ctx.fillText('🛸 NAVE MÃE DESTRUÍDA! 🛸', 0, -30);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 48px Arial';
    ctx.shadowColor = '#FFD700';
    ctx.fillText('🎉 VITÓRIA FINAL! 🎉', 0, 30);
  } else {
    ctx.fillStyle = gameState.isVictory ? '#2ECC71' : '#E74C3C';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = gameState.isVictory ? '#2ECC71' : '#E74C3C';
    ctx.shadowBlur = 20;
    ctx.fillText(gameState.isVictory ? '🏆 VITÓRIA!' : '💀 GAME OVER', 0, 0);
  }
  ctx.restore();

  ctx.shadowBlur = 0;

  // Caixa de estatísticas
  const boxWidth = 280;
  const boxHeight = 180;
  const boxX = width / 2 - boxWidth / 2;
  const boxY = height / 2 - 60;

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
  ctx.translate(width / 2, boxY + boxHeight + 45);
  ctx.scale(buttonPulse, buttonPulse);

  const buttonGradient = ctx.createLinearGradient(-100, -22, -100, 22);
  buttonGradient.addColorStop(0, '#4A90D9');
  buttonGradient.addColorStop(1, '#2E5A8E');

  ctx.fillStyle = buttonGradient;
  ctx.beginPath();
  ctx.roundRect(-100, -22, 200, 44, 22);
  ctx.fill();

  ctx.shadowColor = '#4A90D9';
  ctx.shadowBlur = 15;
  ctx.strokeStyle = '#6BB3F0';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🔄 JOGAR NOVAMENTE', 0, 5);
  ctx.restore();

  // Botão de compartilhar no X (Twitter)
  ctx.save();
  ctx.translate(width / 2, boxY + boxHeight + 100);
  ctx.scale(buttonPulse, buttonPulse);

  const shareGradient = ctx.createLinearGradient(-100, -20, -100, 20);
  shareGradient.addColorStop(0, '#1DA1F2');
  shareGradient.addColorStop(1, '#0C85D0');

  ctx.fillStyle = shareGradient;
  ctx.beginPath();
  ctx.roundRect(-100, -20, 200, 40, 20);
  ctx.fill();

  ctx.shadowColor = '#1DA1F2';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = '#4FC3F7';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('𝕏 COMPARTILHAR SCORE', 0, 5);
  ctx.restore();

  // Guardar posição do botão de share para detecção de clique
  shareButtonBounds = {
    x: width / 2 - 100,
    y: boxY + boxHeight + 100 - 20,
    width: 200,
    height: 40
  };
}

// Bounds do botão de compartilhar
let shareButtonBounds = { x: 0, y: 0, width: 0, height: 0 };

export function getShareButtonBounds(): { x: number; y: number; width: number; height: number } {
  return shareButtonBounds;
}

export function shareOnX(gameState: GameState): void {
  const text = `🎮 Crowd Runner - Warrior X Horde!\n\n🏆 Score: ${gameState.score}\n👑 High Score: ${gameState.highScore}\n🔥 Max Combo: ${gameState.maxCombo}x\n📊 Level: ${gameState.currentLevel}\n\nConsegue superar?`;
  const url = window.location.href;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  window.open(tweetUrl, '_blank', 'width=550,height=420');
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

  // Boss atmosphere - atualizar intensidade
  if (entities.boss && entities.boss.isActive) {
    gameState.bossActive = true;
    // Aumentar intensidade gradualmente até 1
    gameState.bossAtmosphereIntensity = Math.min(1, gameState.bossAtmosphereIntensity + 0.02);
  } else {
    gameState.bossActive = false;
    // Diminuir intensidade gradualmente
    gameState.bossAtmosphereIntensity = Math.max(0, gameState.bossAtmosphereIntensity - 0.05);
  }

  // Screen shake contínuo quando boss está ativo
  const bossShake = gameState.bossActive ? Math.sin(time * 0.02) * 3 * gameState.bossAtmosphereIntensity : 0;

  // Screen shake
  if (gameState.screenShakeActive || gameState.bossActive) {
    const shakeX = (Math.random() - 0.5) * gameState.screenShakeIntensity + bossShake;
    const shakeY = (Math.random() - 0.5) * gameState.screenShakeIntensity + bossShake * 0.5;
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

  // Desenhar Mystery Boxes
  for (const box of entities.mysteryBoxes) {
    drawMysteryBox(ctx, box, time);
  }

  // Desenhar mini-bosses
  for (const miniBoss of entities.miniBosses) {
    if (miniBoss.isActive) {
      drawMiniBoss(ctx, miniBoss, time);
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

  if (gameState.screenShakeActive || gameState.bossActive) {
    ctx.restore();
  }

  // Boss atmosphere overlay - escurecer a tela
  if (gameState.bossAtmosphereIntensity > 0) {
    drawBossAtmosphere(ctx, width, height, gameState.bossAtmosphereIntensity, time);
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
