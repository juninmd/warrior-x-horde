// renderer.ts - Renderização do jogo estilo Crowd Runner
import { Entities, GameState, FloatingText, Army, EnemyHorde, Gate, Bullet, Particle, MysteryBox, Soldier, MiniBoss } from './types';
import { ObjectPool } from './pool';
import { shadeColor, getBiomeColors } from './utils';
import { COLORS, MAX_PARTICLES, MAX_RENDERED_SOLDIERS } from './constants';
import { drawGlassBadge, drawStar, drawJoystick, getComboColor } from './renderer-utils';
import { drawBoss } from './renderer-boss';

// --- Sprite Caching System ---
interface SpriteCache {
  images: Map<string, HTMLCanvasElement | OffscreenCanvas>;
  initialized: boolean;
}

const spriteCache: SpriteCache = {
  images: new Map(),
  initialized: false
};

// Helper to generate a key
const getSpriteKey = (type: string, color: string, size: number, isSuper: boolean = false): string => {
  return `${type}_${color}_${size}_${isSuper}`;
};

// Function to pre-render sprites
export function preRenderSprites(): void {
  if (spriteCache.initialized) return;

  // Types of soldiers to cache
  const types: Soldier['type'][] = ['normal', 'bazooka', 'rambo', 'laser'];
  // Common colors
  const colors = [
    COLORS.PLAYER.NORMAL,
    COLORS.ENEMY.BASE,
    COLORS.PLAYER.SUPER,
    COLORS.PLAYER.BAZOOKA,
    COLORS.PLAYER.RAMBO,
    COLORS.PLAYER.LASER,
  ];
  const sizes = [16, 18, 19, 20]; // Sizes from entities.ts

  // Render Soldier Sprites
  for (const type of types) {
    for (const color of colors) {
      for (const size of sizes) {
        // Normal version
        renderSoldierToCache(type, color, size, false);
        // Super version (mostly for 'normal' type but applied generally just in case)
        renderSoldierToCache(type, color, size, true);
      }
    }
  }

  // Render Particle Sprites
  renderParticleToCache('spark', '#FFF');
  renderParticleToCache('spark', COLORS.EFFECTS.SPARK);
  renderParticleToCache('star', COLORS.EFFECTS.SPARK);
  renderParticleToCache('star', '#FF4500');
  renderParticleToCache('trail', COLORS.EFFECTS.TRAIL);
  renderParticleToCache('explosion', COLORS.EFFECTS.EXPLOSION);
  renderParticleToCache('explosion', COLORS.EFFECTS.SPARK);
  renderParticleToCache('explosion', COLORS.EFFECTS.TRAIL);

  spriteCache.initialized = true;
  console.log('Sprites pre-rendered. Cache size:', spriteCache.images.size);
}

function renderSoldierToCache(type: Soldier['type'], color: string, size: number, isSuper: boolean) {
  const key = getSpriteKey(type, color, size, isSuper);
  if (spriteCache.images.has(key)) return;

  // Padding for drawing (shadows, accessories sticking out)
  const padding = size * 1.5;
  const canvasSize = size * 2 + padding * 2;
  const center = canvasSize / 2;

  // Use OffscreenCanvas if available, otherwise regular canvas
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(canvasSize, canvasSize);
    ctx = canvas.getContext('2d');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    ctx = canvas.getContext('2d');
  }

  if (!ctx) return;

  const actualSize = size; // No scaling here, 1:1 sprite
  const x = center;
  const y = center;

  const isPlayer = color === COLORS.PLAYER.NORMAL || color === COLORS.PLAYER.SUPER || color === COLORS.PLAYER.BAZOOKA || color === COLORS.PLAYER.LASER || type !== 'normal';

  // Sombra (static relative to body)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + actualSize * 0.8, actualSize * 0.6, actualSize * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Corpo (círculo principal)
  // Gradients need to be relative to canvas
  const bodyGradient = ctx.createRadialGradient(x - actualSize * 0.2, y - actualSize * 0.2, 0, x, y, actualSize);
  bodyGradient.addColorStop(0, color);
  bodyGradient.addColorStop(1, shadeColor(color, -30));

  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.arc(x, y, actualSize * 0.7, 0, Math.PI * 2);
  ctx.fill();

  if (isPlayer) {
    if (type === 'bazooka') {
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath();
      ctx.roundRect(x - actualSize * 0.6, y - actualSize * 0.8, actualSize * 0.4, actualSize * 1.2, 2);
      ctx.fill();
    } else if (type === 'rambo') {
      ctx.fillStyle = '#111';
      ctx.fillRect(x + actualSize * 0.3, y, actualSize * 0.8, actualSize * 0.2);
    } else if (type === 'laser') {
      ctx.fillStyle = '#FFF';
      ctx.fillRect(x + actualSize * 0.3, y, actualSize * 0.6, actualSize * 0.15);
      ctx.strokeStyle = '#00ffff';
      ctx.strokeRect(x + actualSize * 0.3, y, actualSize * 0.6, actualSize * 0.15);
    } else {
      ctx.fillStyle = shadeColor(color, 20);
      ctx.beginPath();
      ctx.arc(x - actualSize * 0.4, y + actualSize * 0.2, actualSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.strokeStyle = '#DDD';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + actualSize * 0.3, y);
      ctx.lineTo(x + actualSize * 0.8, y - actualSize * 0.4);
      ctx.stroke();
    }
  } else {
    // Enemy Spikes
    ctx.fillStyle = shadeColor(color, -50);
    ctx.beginPath();
    ctx.moveTo(x - actualSize * 0.6, y - actualSize * 0.2);
    ctx.lineTo(x - actualSize * 0.9, y - actualSize * 0.5);
    ctx.lineTo(x - actualSize * 0.4, y - actualSize * 0.4);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + actualSize * 0.6, y - actualSize * 0.2);
    ctx.lineTo(x + actualSize * 0.9, y - actualSize * 0.5);
    ctx.lineTo(x + actualSize * 0.4, y - actualSize * 0.4);
    ctx.fill();
  }

  // Cabeça
  const headGradient = ctx.createRadialGradient(x - actualSize * 0.1, y - actualSize * 0.6, 0, x, y - actualSize * 0.5, actualSize * 0.4);
  if (isPlayer) {
    headGradient.addColorStop(0, '#FFE4C4');
    headGradient.addColorStop(1, '#DEB887');
  } else {
    headGradient.addColorStop(0, '#90EE90');
    headGradient.addColorStop(1, '#2E8B57');
  }

  ctx.fillStyle = headGradient;
  ctx.beginPath();
  ctx.arc(x, y - actualSize * 0.5, actualSize * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Capacete
  ctx.fillStyle = shadeColor(color, -40);
  ctx.beginPath();
  ctx.arc(x, y - actualSize * 0.6, actualSize * 0.35, Math.PI, 0);
  ctx.fill();

  // Detalhes extras de cabeça
  if (type === 'rambo') {
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - actualSize * 0.35, y - actualSize * 0.7);
    ctx.lineTo(x + actualSize * 0.35, y - actualSize * 0.7);
    ctx.stroke();
  } else if (type === 'laser') {
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(x - actualSize * 0.25, y - actualSize * 0.65, actualSize * 0.5, actualSize * 0.15);
  }

  // Olhos brilhantes para inimigos
  if (!isPlayer) {
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x - actualSize * 0.15, y - actualSize * 0.5, actualSize * 0.1, 0, Math.PI * 2);
    ctx.arc(x + actualSize * 0.15, y - actualSize * 0.5, actualSize * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Super effect overlay (baked in)
  if (isSuper) {
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, actualSize + 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  spriteCache.images.set(key, canvas);
}

function renderParticleToCache(type: Particle['type'], color: string) {
  const key = `particle_${type}_${color}`;
  if (spriteCache.images.has(key)) return;

  const size = 10; // Base size for rendering
  const canvasSize = size * 4; // Plenty of room for glows
  const center = canvasSize / 2;

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(canvasSize, canvasSize);
    ctx = canvas.getContext('2d');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    ctx = canvas.getContext('2d');
  }

  if (!ctx) return;

  const p = { x: center, y: center, size: size, color: color, type: type };

  if (p.type === 'spark' || p.type === 'star') {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
  }

  ctx.fillStyle = p.color;
  ctx.beginPath();

  if (p.type === 'star') {
    drawStar(ctx as CanvasRenderingContext2D, p.x, p.y, 5, p.size, p.size / 2);
  } else {
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
  }
  ctx.fill();

  spriteCache.images.set(key, canvas);
}
// ------------------------------

const floatingTexts: FloatingText[] = [];
const particles: Particle[] = [];

// Pool de floating texts
const floatingTextPool = new ObjectPool<FloatingText>(
  () => ({ text: '', x: 0, y: 0, color: '#FFF', alpha: 1, scale: 1 }),
  (t) => {
    t.text = '';
    t.x = 0;
    t.y = 0;
    t.color = '#FFF';
    t.alpha = 1;
    t.scale = 1;
  }
);

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

// Sistema de partículas
export function addParticle(x: number, y: number, type: Particle['type'], color: string, count = 1): void {
  // Limitar quantidade de partículas
  if (particles.length >= MAX_PARTICLES) return;

  // Reduzir count se estiver chegando no limite
  const availableSlots = MAX_PARTICLES - particles.length;
  const actualCount = Math.min(count, availableSlots, 2); // Máximo 2 partículas por vez

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
  addParticle(x, y, 'explosion', color, 2);
  addParticle(x, y, 'spark', '#FFD700', 1);
}

export function addTrail(x: number, y: number, color: string): void {
  if (Math.random() < 0.08) {
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
    const key = `particle_${p.type}_${p.color}`;
    const cachedCanvas = spriteCache.images.get(key);

    if (cachedCanvas) {
      ctx.save();
      ctx.globalAlpha = p.life;

      const size = 10; // Base size used in cache
      const scale = p.size / size;
      const canvasSize = cachedCanvas.width;

      // Draw centered
      ctx.translate(p.x, p.y);
      ctx.scale(scale, scale);
      ctx.drawImage(cachedCanvas, -canvasSize/2, -canvasSize/2);

      ctx.restore();
    } else {
      // Fallback if not cached
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
}

export function addFloatingText(text: string, x: number, y: number, color: string, sizeMultiplier: number = 1): void {
  const ft = floatingTextPool.get();
  ft.text = text;
  ft.x = x;
  ft.y = y;
  ft.color = color;
  ft.alpha = 1;
  ft.scale = 1 * sizeMultiplier;
  floatingTexts.push(ft);
}

function updateFloatingTexts(): void {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].y -= 2;
    floatingTexts[i].alpha -= 0.02;
    floatingTexts[i].scale += 0.02;
    if (floatingTexts[i].alpha <= 0) {
      floatingTextPool.release(floatingTexts[i]);
      floatingTexts.splice(i, 1);
    }
  }
}

function drawRoad(ctx: CanvasRenderingContext2D, gameState: GameState): void {
  const { width, height } = ctx.canvas;
  const time = Date.now();
  const colors = getBiomeColors(gameState.currentLevel);

  // Definir linha do horizonte
  const horizonY = height * 0.22;

  // Céu com gradiente dinâmico
  const skyGradient = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGradient.addColorStop(0, colors.sky[0]);
  skyGradient.addColorStop(1, colors.sky[1]);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, horizonY + 10);

  // Sol ou Lua
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

  // === NAVE ALIENÍGENA NO CÉU (Decorativa) ===
  if (gameState.currentLevel < 10) {
    const shipX = width / 2;
    const shipY = 25;
    // Simplified ship drawing here or use the boss renderer if possible?
    // Since it's decor, let's keep it simple here to avoid importing boss renderer for decor
    // Actually, let's just not draw it or simplify it greatly.
    // For now, I will omit the detailed decor ship to save space, or implement a very simple one.
  }

  // Área do chão
  const groundGradient = ctx.createLinearGradient(0, horizonY, 0, height);
  groundGradient.addColorStop(0, colors.ground[0]);
  groundGradient.addColorStop(1, colors.ground[1]);
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, horizonY, width, height - horizonY);

  // Detalhes do chão
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

  // === ESTRADA PRINCIPAL ===
  const roadStartY = horizonY;
  const roadHorizonWidth = width * 0.18;
  const roadBottomWidth = width * 0.95;

  // Asfalto
  const roadGradient = ctx.createLinearGradient(0, roadStartY, 0, height);
  roadGradient.addColorStop(0, colors.road[0]);
  roadGradient.addColorStop(1, colors.road[1]);
  ctx.fillStyle = roadGradient;
  ctx.beginPath();
  ctx.moveTo(width / 2 - roadHorizonWidth / 2, roadStartY);
  ctx.lineTo(width / 2 + roadHorizonWidth / 2, roadStartY);
  ctx.lineTo(width / 2 + roadBottomWidth / 2, height);
  ctx.lineTo(width / 2 - roadBottomWidth / 2, height);
  ctx.closePath();
  ctx.fill();

  // Bordas da estrada
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

  // Faixas
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 4;
  ctx.setLineDash([30, 40]);
  ctx.beginPath();
  ctx.moveTo(width / 2, roadStartY + 10);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Linhas laterais
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 30]);
  ctx.beginPath();
  ctx.moveTo(width / 2 - roadHorizonWidth / 2 + 5, roadStartY + 10);
  ctx.lineTo(width / 2 - roadBottomWidth / 2 + 30, height);
  ctx.stroke();
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
    const treeProgress = (treeY - roadStartY) / (height - roadStartY);
    const roadWidthAtY = roadHorizonWidth + (roadBottomWidth - roadHorizonWidth) * treeProgress;
    const leftX = (width - roadWidthAtY) / 2 - 30 - progress * 20;
    if (leftX > 15) drawTree(ctx, leftX, treeY, treeSize, colors.tree);
    const rightX = (width + roadWidthAtY) / 2 + 30 + progress * 20;
    if (rightX < width - 15) drawTree(ctx, rightX, treeY, treeSize, colors.tree);
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string = '#2d5a2d'): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x + size * 0.2, y + size * 0.45, size * 0.35, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2c1e14';
  ctx.fillRect(x - size * 0.1, y, size * 0.2, size * 0.4);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - size * 0.2, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shadeColor(color, 20);
  ctx.beginPath();
  ctx.arc(x - size * 0.15, y - size * 0.1, size * 0.3, 0, Math.PI * 2);
  ctx.arc(x + size * 0.15, y - size * 0.1, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawSoldier3D(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, animOffset: number, time: number, type: Soldier['type'] = 'normal', isSuper: boolean = false): void {
  // Attempt to use cached sprite
  const key = getSpriteKey(type, color, size, isSuper);
  const cachedCanvas = spriteCache.images.get(key);

  const bounce = Math.sin(time * 0.008 + animOffset) * 3;
  const scale = Math.max(0.5, 1 - (800 - y) / 1500);
  const actualSize = size * scale;

  if (cachedCanvas) {
    const canvasSize = cachedCanvas.width;
    ctx.save();
    ctx.translate(x, y + bounce);
    ctx.scale(scale, scale);
    ctx.drawImage(cachedCanvas, -canvasSize / 2, -canvasSize / 2);
    ctx.restore();
    return;
  }

  // Fallback drawing if needed (should be rare if cache works)
}

// Histórico de posições para trail effect
let lastArmyX = 0;

function drawArmy(ctx: CanvasRenderingContext2D, army: Army, time: number): void {
  if (!spriteCache.initialized) {
    preRenderSprites();
  }

  const dx = army.centerX - lastArmyX;
  if (Math.abs(dx) > 2) {
    const aliveSoldiers = army.soldiers.filter(s => s.isAlive);
    if (aliveSoldiers.length > 0 && Math.random() < 0.3) {
      const randomSoldier = aliveSoldiers[Math.floor(Math.random() * aliveSoldiers.length)];
      addTrail(randomSoldier.x, randomSoldier.y + 10, '#4A90D9');
    }
  }
  lastArmyX = army.centerX;

  let sortedSoldiers = [...army.soldiers].filter(s => s.isAlive).sort((a, b) => a.y - b.y);

  if (sortedSoldiers.length > MAX_RENDERED_SOLDIERS) {
    const superSoldiers = sortedSoldiers.filter(s => s.isSuper);
    const normalSoldiers = sortedSoldiers.filter(s => !s.isSuper);
    const remainingSlots = MAX_RENDERED_SOLDIERS - superSoldiers.length;
    const selectedNormal = normalSoldiers.slice(0, Math.max(0, remainingSlots));
    sortedSoldiers = [...superSoldiers, ...selectedNormal].sort((a, b) => a.y - b.y);
  }

  for (const soldier of sortedSoldiers) {
    if (soldier.isSuper) {
      ctx.save();
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 15;
      drawSoldier3D(ctx, soldier.x, soldier.y, soldier.size, '#FFD700', soldier.animOffset, time, soldier.type, true);
      ctx.restore();
      ctx.fillStyle = '#FFD700';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('⭐', soldier.x, soldier.y - soldier.size - 5);
    } else {
      drawSoldier3D(ctx, soldier.x, soldier.y, soldier.size, soldier.color, soldier.animOffset, time, soldier.type, false);
    }
  }

  // Contador de soldados
  const count = army.soldiers.filter(s => s.isAlive).length;
  if (count > 0) {
    drawGlassBadge(ctx, army.centerX - 28, army.centerY - 75, 56, 36, count.toString(), '#4A90D9');
  }
}

function drawEnemyHorde(ctx: CanvasRenderingContext2D, horde: EnemyHorde, time: number): void {
  if (!spriteCache.initialized) preRenderSprites();

  let sortedSoldiers = [...horde.soldiers].filter(s => s.isAlive).sort((a, b) => a.y - b.y);

  if (sortedSoldiers.length > MAX_RENDERED_SOLDIERS) {
    const step = sortedSoldiers.length / MAX_RENDERED_SOLDIERS;
    const sampled: typeof sortedSoldiers = [];
    for (let i = 0; i < MAX_RENDERED_SOLDIERS; i++) {
      sampled.push(sortedSoldiers[Math.floor(i * step)]);
    }
    sortedSoldiers = sampled;
  }

  const fadeStartY = 100;
  const fadeEndY = 200;
  const hordeAlpha = horde.y < fadeStartY ? 0 :
                     horde.y < fadeEndY ? (horde.y - fadeStartY) / (fadeEndY - fadeStartY) : 1;

  if (hordeAlpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = hordeAlpha;

  for (const soldier of sortedSoldiers) {
    drawSoldier3D(ctx, soldier.x, soldier.y, soldier.size, soldier.color, soldier.animOffset, time, soldier.type, false);
  }

  const count = horde.soldiers.filter(s => s.isAlive).length;
  if (count > 0 && hordeAlpha > 0.5) {
      drawGlassBadge(ctx, horde.x - 25, horde.y - 60, 50, 30, count.toString(), '#E74C3C');
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
  const hover = Math.sin(time * 0.005) * 5;

  ctx.save();
  ctx.translate(x + width / 2, y + height / 2 + hover);
  ctx.rotate(Math.sin(time * 0.003) * 0.1);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, height, width * 0.6, height * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  const gradient = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
  gradient.addColorStop(0, '#9B59B6');
  gradient.addColorStop(0.5, '#8E44AD');
  gradient.addColorStop(1, '#6C3483');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(-width / 2, -height / 2, width, height, 8);
  ctx.fill();
  ctx.strokeStyle = '#E056FD';
  ctx.lineWidth = 3;
  ctx.stroke();
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

  const barrelGradient = ctx.createLinearGradient(x, gate.y, x + width, gate.y);
  barrelGradient.addColorStop(0, shadeColor(gate.color, 20));
  barrelGradient.addColorStop(0.5, gate.color);
  barrelGradient.addColorStop(1, shadeColor(gate.color, -20));

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x + width / 2 + 5, gate.y + height + 10, width / 2, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.roundRect(x, gate.y, width, height, 10);
  ctx.fill();
  ctx.fillStyle = barrelGradient;
  ctx.beginPath();
  ctx.roundRect(x + 5, gate.y + 5, width - 10, height - 10, 8);
  ctx.fill();

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.floor(28 * scale)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let text = '';
  if (gate.customText) {
    text = gate.customText;
    ctx.font = `bold ${Math.floor(22 * scale)}px Arial`;
  } else {
    switch (gate.type) {
      case 'add': text = `+${gate.value}`; break;
      case 'multiply': text = `×${gate.value}`; break;
      case 'subtract': text = `-${gate.value}`; break;
      case 'divide': text = `÷${gate.value}`; break;
      case 'firerate': text = `🔥×${gate.value}`; break;
      case 'damage': text = `⚔️×${gate.value}`; break;
      case 'superwarrior': text = `⭐×${gate.value}`; break;
    }
  }
  ctx.fillText(text, x + width / 2, gate.y + height / 2);
  ctx.restore();
}

function drawMiniBoss(ctx: CanvasRenderingContext2D, miniBoss: MiniBoss, time: number): void {
  if (!miniBoss.isActive) return;
  const pulse = Math.sin(time * 0.008) * 5;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(miniBoss.x + miniBoss.width / 2, miniBoss.y + miniBoss.height + 10, miniBoss.width / 2, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  const cx = miniBoss.x + miniBoss.width / 2;
  const cy = miniBoss.y + miniBoss.height / 2;
  const r = (miniBoss.width / 2) + pulse;
  ctx.fillStyle = miniBoss.color;
  if (miniBoss.type === 'armored') {
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.strokeStyle = '#CCC';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - r, cy - r, r * 2, r * 2);
  } else if (miniBoss.type === 'speed') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy + r);
    ctx.lineTo(cx - r, cy + r);
    ctx.fill();
  } else if (miniBoss.type === 'spiky') {
    drawStar(ctx, cx, cy, 6, r, r * 0.5);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(miniBoss.x + miniBoss.width * 0.35, miniBoss.y + miniBoss.height * 0.4, 8, 0, Math.PI * 2);
  ctx.arc(miniBoss.x + miniBoss.width * 0.65, miniBoss.y + miniBoss.height * 0.4, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(miniBoss.x + miniBoss.width * 0.35, miniBoss.y + miniBoss.height * 0.4, 3, 0, Math.PI * 2);
  ctx.arc(miniBoss.x + miniBoss.width * 0.65, miniBoss.y + miniBoss.height * 0.4, 3, 0, Math.PI * 2);
  ctx.fill();

  // Mini Bar
  const barWidth = 100;
  const barHeight = 15;
  const barX = miniBoss.x + miniBoss.width / 2 - barWidth / 2;
  const barY = miniBoss.y - 25;
  ctx.fillStyle = '#333';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = '#FF6347';
  ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * (miniBoss.hp / miniBoss.maxHp), barHeight - 4);
}

function drawBossAtmosphere(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number, time: number): void {
  const vignetteGradient = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.9);
  vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignetteGradient.addColorStop(0.5, `rgba(20, 0, 0, ${0.3 * intensity})`);
  vignetteGradient.addColorStop(1, `rgba(50, 0, 0, ${0.7 * intensity})`);
  ctx.fillStyle = vignetteGradient;
  ctx.fillRect(0, 0, width, height);

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
    const gradient = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, 8);
    gradient.addColorStop(0, bullet.isEnemy ? '#FF6B6B' : '#FFD700');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bullet.isEnemy ? '#E74C3C' : '#FFF';
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawUI(ctx: CanvasRenderingContext2D, gameState: GameState, armyCount: number, fireRate: number, damage: number): void {
  const { width, height } = ctx.canvas;
  const bottomY = height - 30;
  const badgeHeight = 36;
  const progressWidth = width - 40;
  const progressX = 20;
  const progressY = 15;
  const progressHeight = 8;
  const progress = Math.min(gameState.distanceTraveled / gameState.levelDistance, 1);

  ctx.save();
  // Progress Bar
  ctx.fillStyle = COLORS.UI.GLASS_BG;
  ctx.strokeStyle = COLORS.UI.GLASS_BORDER;
  ctx.beginPath();
  ctx.roundRect(progressX - 4, progressY - 4, progressWidth + 8, progressHeight + 8, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#00C9FF';
  ctx.beginPath();
  ctx.roundRect(progressX, progressY, progressWidth * progress, progressHeight, 4);
  ctx.fill();

  // Badges
  drawGlassBadge(ctx, 10, bottomY - badgeHeight/2, 80, badgeHeight, `Lv. ${gameState.currentLevel}`, '#4A90D9');
  drawGlassBadge(ctx, width / 2 - 50 - 60, bottomY - badgeHeight/2, 100, badgeHeight, `${gameState.score}`, '#F1C40F');
  drawGlassBadge(ctx, width / 2 + 50, bottomY - badgeHeight/2, 100, badgeHeight, `💰 ${gameState.coins}`, '#FFD700');

  const shotsPerSec = (1000 / fireRate).toFixed(1);
  drawGlassBadge(ctx, 10, progressY + progressHeight + 15, 100, 28, `🔥 ${shotsPerSec}/s`, '#F39C12');
  drawGlassBadge(ctx, 120, progressY + progressHeight + 15, 80, 28, `⚔️ ${damage.toFixed(1)}`, '#E91E63');
  ctx.restore();

  // Combo
  if (gameState.combo > 1) {
    const comboX = width / 2;
    const comboY = 35;
    const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.1;
    ctx.save();
    ctx.translate(comboX, comboY);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = getComboColor(gameState.combo);
    ctx.shadowBlur = 20;
    ctx.fillStyle = getComboColor(gameState.combo);
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${gameState.combo}x COMBO!`, 0, 0);
    const comboProgress = gameState.comboTimer / 4000;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(-50, 10, 100, 6);
    ctx.fillStyle = getComboColor(gameState.combo);
    ctx.fillRect(-50, 10, 100 * comboProgress, 6);
    ctx.restore();
  }
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
  const isFinalVictory = gameState.isVictory && gameState.currentLevel >= 10;

  ctx.fillStyle = isFinalVictory ? 'rgba(0, 50, 30, 0.95)' : 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, width, height);

  const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.05;
  ctx.save();
  ctx.translate(width / 2, height / 2 - 120);
  ctx.scale(pulse, pulse);
  if (isFinalVictory) {
    ctx.fillStyle = '#00FF88';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🛸 NAVE MÃE DESTRUÍDA! 🛸', 0, -40);
    ctx.fillText('🎉 PARABÉNS! 🎉', 0, 10);
  } else {
    ctx.fillStyle = gameState.isVictory ? '#2ECC71' : '#E74C3C';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gameState.isVictory ? '🏆 VITÓRIA!' : '💀 GAME OVER', 0, 0);
  }
  ctx.restore();

  const boxWidth = 280;
  const boxHeight = 180;
  const boxX = width / 2 - boxWidth / 2;
  const boxY = height / 2 - 60;
  ctx.fillStyle = 'rgba(30, 30, 50, 0.9)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 15);
  ctx.fill();
  ctx.strokeStyle = '#4A90D9';
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px Arial';
  ctx.fillText(`🎯 Score:`, boxX + 20, boxY + 35);
  ctx.textAlign = 'right';
  ctx.fillText(`${gameState.score}`, boxX + boxWidth - 20, boxY + 35);

  ctx.textAlign = 'left';
  ctx.font = '18px Arial';
  ctx.fillText(`👑 High Score:`, boxX + 20, boxY + 70);
  ctx.textAlign = 'right';
  ctx.fillText(`${gameState.highScore}`, boxX + boxWidth - 20, boxY + 70);

  // Update bounds for sharing buttons
  shareButtonBounds = {
    x: width / 2 - 100,
    y: boxY + boxHeight + 100 - 20,
    width: 200,
    height: 40
  };

  whatsappButtonBounds = {
    x: width / 2 - 100,
    y: boxY + boxHeight + 150 - 20,
    width: 200,
    height: 40
  };

  // Draw Share Buttons placeholders (visual only as text usually)
  ctx.save();
  ctx.translate(width / 2, boxY + boxHeight + 45);
  ctx.fillStyle = '#4A90D9';
  ctx.fillRect(-100, -22, 200, 44);
  ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center';
  ctx.fillText(isFinalVictory ? '➡️ NÍVEL 11' : '🔄 RESTART', 0, 5);
  ctx.restore();

  ctx.save();
  ctx.translate(width / 2, boxY + boxHeight + 100);
  ctx.fillStyle = '#1DA1F2';
  ctx.fillRect(-100, -20, 200, 40);
  ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center';
  ctx.fillText('𝕏 SHARE', 0, 5);
  ctx.restore();

  ctx.save();
  ctx.translate(width / 2, boxY + boxHeight + 150);
  ctx.fillStyle = '#25D366';
  ctx.fillRect(-100, -20, 200, 40);
  ctx.fillStyle = '#FFF';
  ctx.textAlign = 'center';
  ctx.fillText('📱 WHATSAPP', 0, 5);
  ctx.restore();
}

let shareButtonBounds = { x: 0, y: 0, width: 0, height: 0 };
let whatsappButtonBounds = { x: 0, y: 0, width: 0, height: 0 };

export function getShareButtonBounds(): { x: number; y: number; width: number; height: number } {
  return shareButtonBounds;
}

export function getWhatsAppButtonBounds(): { x: number; y: number; width: number; height: number } {
  return whatsappButtonBounds;
}

export function shareOnX(gameState: GameState): void {
  const text = `🎮 Crowd Runner!\n🏆 Score: ${gameState.score}\nLevel: ${gameState.currentLevel}`;
  const url = window.location.href;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
}

export function shareOnWhatsApp(gameState: GameState): void {
  const text = `🎮 Crowd Runner!\n🏆 Score: ${gameState.score}\nLevel: ${gameState.currentLevel}`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
}

function drawSuperCannonBeam(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, gameState: GameState): void {
  if (!gameState.superCannonActive) return;
  const beamWidth = 40;
  const beamX = centerX - beamWidth / 2;
  const pulse = Math.sin(Date.now() / 50) * 0.2 + 0.8;

  const gradient = ctx.createLinearGradient(beamX, 0, beamX + beamWidth, 0);
  gradient.addColorStop(0, `rgba(255, 200, 50, ${0.3 * pulse})`);
  gradient.addColorStop(0.5, `rgba(255, 255, 255, ${1 * pulse})`);
  gradient.addColorStop(1, `rgba(255, 200, 50, ${0.3 * pulse})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(beamX, 0, beamWidth, centerY);

  // Time bar
  const progress = gameState.superCannonTimer / gameState.superCannonDuration;
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(centerX - 30, centerY + 30, 60 * progress, 6);
}

export function drawPauseScreen(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('⏸️ PAUSADO', width / 2, height / 2);
}

export function render(ctx: CanvasRenderingContext2D, entities: Entities, gameState: GameState): void {
  const { width, height } = ctx.canvas;
  const time = Date.now();

  ctx.clearRect(0, 0, width, height);

  // Boss atmosphere
  if (entities.boss && entities.boss.isActive) {
    gameState.bossActive = true;
    gameState.bossAtmosphereIntensity = Math.min(1, gameState.bossAtmosphereIntensity + 0.02);
  } else {
    gameState.bossActive = false;
    gameState.bossAtmosphereIntensity = Math.max(0, gameState.bossAtmosphereIntensity - 0.05);
  }

  const bossShake = gameState.bossActive ? Math.sin(time * 0.02) * 3 * gameState.bossAtmosphereIntensity : 0;
  if (gameState.screenShakeActive || gameState.bossActive) {
    const shakeX = (Math.random() - 0.5) * gameState.screenShakeIntensity + bossShake;
    const shakeY = (Math.random() - 0.5) * gameState.screenShakeIntensity + bossShake * 0.5;
    ctx.save();
    ctx.translate(shakeX, shakeY);
  }

  drawRoad(ctx, gameState);

  const sortedGates = [...entities.gates].sort((a, b) => a.y - b.y);
  for (const gate of sortedGates) drawGate(ctx, gate);

  for (const horde of entities.enemyHordes) {
    if (horde.isActive) drawEnemyHorde(ctx, horde, time);
  }

  for (const box of entities.mysteryBoxes) drawMysteryBox(ctx, box, time);

  for (const miniBoss of entities.miniBosses) {
    if (miniBoss.isActive) drawMiniBoss(ctx, miniBoss, time);
  }

  if (entities.boss && entities.boss.isActive) {
    drawBoss(ctx, entities.boss, time);
  }

  drawBullets(ctx, entities.bullets);
  updateParticles();
  drawParticles(ctx);
  drawArmy(ctx, entities.playerArmy, time);
  drawSuperCannonBeam(ctx, entities.playerArmy.centerX, entities.playerArmy.centerY, gameState);

  if (gameState.screenShakeActive || gameState.bossActive) {
    ctx.restore();
  }

  if (gameState.bossAtmosphereIntensity > 0) {
    drawBossAtmosphere(ctx, width, height, gameState.bossAtmosphereIntensity, time);
  }

  drawUI(ctx, gameState, entities.playerArmy.soldiers.filter(s => s.isAlive).length, entities.playerArmy.fireRate, entities.playerArmy.damage);
  drawJoystick(ctx);
  updateFloatingTexts();
  drawFloatingTexts(ctx);

  if (gameState.isGameOver) {
    drawGameOver(ctx, gameState);
  }
}
