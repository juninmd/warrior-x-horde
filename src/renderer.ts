// renderer.ts - Renderização do jogo estilo Crowd Runner
import { Entities, GameState, FloatingText, Army, EnemyHorde, Gate, Bullet, Particle, MysteryBox, Soldier, MiniBoss } from './types';
import { ObjectPool } from './pool';
import { shadeColor, getBiomeColors, fastRemove } from './utils';
import { COLORS, MAX_PARTICLES, MAX_RENDERED_SOLDIERS, ThemeConfig, BASE_WIDTH, BASE_HEIGHT } from './constants';
import { drawGlassBadge, drawStar, drawJoystick, getComboColor } from './renderer-utils';
import { drawBoss } from './renderer-boss';
import { QualityManager } from './quality';

// --- Sprite Caching System ---
interface SpriteCache {
  images: Map<string, HTMLCanvasElement | OffscreenCanvas>;
  initialized: boolean;
}

const spriteCache: SpriteCache = {
  images: new Map(),
  initialized: false
};

// --- Background Caching System ---
let backgroundCache: HTMLCanvasElement | OffscreenCanvas | null = null;
let lastCachedLevel = -1;
let lastCachedWidth = 0;
let lastCachedHeight = 0;

/* v8 ignore start */
function updateBackgroundCache(theme: ThemeConfig, width: number, height: number): void {
  if (!backgroundCache) {
    if (typeof OffscreenCanvas !== 'undefined') {
      backgroundCache = new OffscreenCanvas(width, height);
    } else {
      backgroundCache = document.createElement('canvas');
      backgroundCache.width = width;
      backgroundCache.height = height;
    }
  }

  // Ensure size match
  if (backgroundCache.width !== width || backgroundCache.height !== height) {
    backgroundCache.width = width;
    backgroundCache.height = height;
  }

  const ctx = backgroundCache.getContext('2d') as CanvasRenderingContext2D;

  // Clear
  ctx.clearRect(0, 0, width, height);

  // Draw static layers
  drawSky(ctx, width, height, theme);
  drawCelestialBody(ctx, width, height, theme);
  drawMountains(ctx, width, height, theme);
  drawGround(ctx, width, height, theme);
}

// Helper to generate a key
const getSpriteKey = (type: string, color: string, size: number, isSuper: boolean = false, isFlash: boolean = false): string => {
  return `${type}_${color}_${size}_${isSuper}_${isFlash}`;
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
        renderSoldierToCache(type, color, size, false, false);
        // Flash version (white silhouette)
        renderSoldierToCache(type, color, size, false, true);

        // Super version
        renderSoldierToCache(type, color, size, true, false);
        // Super Flash version
        renderSoldierToCache(type, color, size, true, true);
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

function renderSoldierToCache(type: Soldier['type'], color: string, size: number, isSuper: boolean, isFlash: boolean) {
  const key = getSpriteKey(type, color, size, isSuper, isFlash);
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

  if (isFlash) {
      // Draw a pure white silhouette for damage flash
      renderSoldierShape(ctx, type, '#FFFFFF', x, y, actualSize, isSuper, true);
  } else {
      renderSoldierShape(ctx, type, color, x, y, actualSize, isSuper, false);
  }

  spriteCache.images.set(key, canvas);
}

function renderSoldierShape(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, type: Soldier['type'], color: string, x: number, y: number, actualSize: number, isSuper: boolean, isFlash: boolean) {
  const isPlayer = color === COLORS.PLAYER.NORMAL || color === COLORS.PLAYER.SUPER || color === COLORS.PLAYER.BAZOOKA || color === COLORS.PLAYER.LASER || type !== 'normal';
  const quality = QualityManager.getInstance().settings;

  // If flashing, skip complex gradients and details, just shape

  if (!isFlash && quality.enableShadows) {
    // Sombra (static relative to body)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + actualSize * 0.8, actualSize * 0.6, actualSize * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Corpo (círculo principal)
  let bodyFill: string | CanvasGradient = color;
  if (!isFlash && !quality.simplifiedRendering) {
      const bodyGradient = ctx.createRadialGradient(x - actualSize * 0.2, y - actualSize * 0.2, 0, x, y, actualSize);
      bodyGradient.addColorStop(0, color);
      bodyGradient.addColorStop(1, shadeColor(color, -30));
      bodyFill = bodyGradient;
  }

  ctx.fillStyle = bodyFill;
  ctx.beginPath();
  ctx.arc(x, y, actualSize * 0.7, 0, Math.PI * 2);
  ctx.fill();

  if (isPlayer) {
    if (type === 'bazooka') {
      ctx.fillStyle = isFlash ? '#FFF' : '#2c3e50';
      ctx.beginPath();
      ctx.roundRect(x - actualSize * 0.6, y - actualSize * 0.8, actualSize * 0.4, actualSize * 1.2, 2);
      ctx.fill();
    } else if (type === 'rambo') {
      ctx.fillStyle = isFlash ? '#FFF' : '#111';
      ctx.fillRect(x + actualSize * 0.3, y, actualSize * 0.8, actualSize * 0.2);
    } else if (type === 'laser') {
      ctx.fillStyle = '#FFF';
      ctx.fillRect(x + actualSize * 0.3, y, actualSize * 0.6, actualSize * 0.15);
      if (!isFlash) {
          ctx.strokeStyle = '#00ffff';
          ctx.strokeRect(x + actualSize * 0.3, y, actualSize * 0.6, actualSize * 0.15);
      }
    } else {
      ctx.fillStyle = isFlash ? '#FFF' : shadeColor(color, 20);
      ctx.beginPath();
      ctx.arc(x - actualSize * 0.4, y + actualSize * 0.2, actualSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
      if (!isFlash) {
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
    }
  } else {
    // Enemy Spikes
    ctx.fillStyle = isFlash ? '#FFF' : shadeColor(color, -50);
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
  let headFill: string | CanvasGradient;
  if (isFlash) {
      headFill = '#FFF';
  } else {
    const headGradient = ctx.createRadialGradient(x - actualSize * 0.1, y - actualSize * 0.6, 0, x, y - actualSize * 0.5, actualSize * 0.4);
    if (isPlayer) {
        headGradient.addColorStop(0, '#FFE4C4');
        headGradient.addColorStop(1, '#DEB887');
    } else {
        headGradient.addColorStop(0, '#90EE90');
        headGradient.addColorStop(1, '#2E8B57');
    }
    headFill = headGradient;
  }

  ctx.fillStyle = headFill;
  ctx.beginPath();
  ctx.arc(x, y - actualSize * 0.5, actualSize * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Capacete
  ctx.fillStyle = isFlash ? '#FFF' : shadeColor(color, -40);
  ctx.beginPath();
  ctx.arc(x, y - actualSize * 0.6, actualSize * 0.35, Math.PI, 0);
  ctx.fill();

  // Detalhes extras de cabeça
  if (type === 'rambo') {
    ctx.strokeStyle = isFlash ? '#FFF' : '#ff0000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - actualSize * 0.35, y - actualSize * 0.7);
    ctx.lineTo(x + actualSize * 0.35, y - actualSize * 0.7);
    ctx.stroke();
  } else if (type === 'laser') {
    ctx.fillStyle = isFlash ? '#FFF' : '#00ffff';
    ctx.fillRect(x - actualSize * 0.25, y - actualSize * 0.65, actualSize * 0.5, actualSize * 0.15);
  }

  // Olhos brilhantes para inimigos
  if (!isPlayer && !isFlash) {
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(x - actualSize * 0.15, y - actualSize * 0.5, actualSize * 0.1, 0, Math.PI * 2);
    ctx.arc(x + actualSize * 0.15, y - actualSize * 0.5, actualSize * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Super effect overlay (baked in)
  if (isSuper && !isFlash) {
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, actualSize + 2, 0, Math.PI * 2);
    ctx.stroke();
  }
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

  if ((p.type === 'spark' || p.type === 'star') && QualityManager.getInstance().settings.enableShadows) {
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
/* v8 ignore stop */
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
    /* v8 ignore next 10 */
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
  const quality = QualityManager.getInstance().settings;
  const limit = Math.floor(MAX_PARTICLES * quality.particleMultiplier);

  // Limitar quantidade de partículas
  /* v8 ignore next */
  if (particles.length >= limit) return;

  // Reduzir count se estiver chegando no limite
  const availableSlots = limit - particles.length;
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
      fastRemove(particles, i);
    }
  }
}

/* v8 ignore start */
function drawParticles(ctx: CanvasRenderingContext2D): void {
  for (const p of particles) {
    const key = `particle_${p.type}_${p.color}`;
    const cachedCanvas = spriteCache.images.get(key);

    if (cachedCanvas) {
      // Optimization: Manual Transform instead of save/restore
      const size = 10; // Base size used in cache
      const scale = p.size / size;
      const canvasSize = cachedCanvas.width;

      const px = p.x;
      const py = p.y;

      // Transform
      ctx.translate(px, py);
      ctx.scale(scale, scale);

      ctx.globalAlpha = p.life;
      ctx.drawImage(cachedCanvas, -canvasSize/2, -canvasSize/2);

      // Inverse Transform
      ctx.scale(1/scale, 1/scale);
      ctx.translate(-px, -py);
      ctx.globalAlpha = 1.0;

    } else {
      /* v8 ignore start */
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
      /* v8 ignore stop */
    }
  }
}
/* v8 ignore stop */

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

// --- Map / Background Rendering ---
/* v8 ignore start */
const HORIZON_RATIO = 0.22;

function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number, theme: ThemeConfig): void {
  const horizonY = height * HORIZON_RATIO;
  const skyGradient = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGradient.addColorStop(0, theme.colors.sky[0]);
  skyGradient.addColorStop(1, theme.colors.sky[1]);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, horizonY + 10);
}

function drawCelestialBody(ctx: CanvasRenderingContext2D, width: number, height: number, theme: ThemeConfig): void {
  if (theme.celestial.type === 'none') return;

  const x = width * 0.82;
  const y = height * 0.08;

  if (theme.celestial.type === 'sun') {
    const sunGlow = ctx.createRadialGradient(x, y, 0, x, y, 60);
    sunGlow.addColorStop(0, theme.celestial.color);
    sunGlow.addColorStop(0.2, shadeColor(theme.celestial.color, 20));
    sunGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    sunGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(x, y, 60, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Moon
    ctx.fillStyle = theme.celestial.color;
    if (theme.celestial.shadowColor) {
      ctx.shadowColor = theme.celestial.shadowColor;
      ctx.shadowBlur = 20;
    }
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawClouds(ctx: CanvasRenderingContext2D, width: number, time: number, theme: ThemeConfig): void {
  ctx.fillStyle = theme.colors.clouds;
  const cloudOffset = (time * 0.01) % (width + 300);

  for (let i = 0; i < 4; i++) {
    const cx = ((i * 200 + cloudOffset) % (width + 150)) - 75;
    const cy = 25 + i * 15 + Math.sin(i) * 10;

    // Simple cloud shape
    ctx.beginPath();
    ctx.ellipse(cx, cy, 40, 15, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 25, cy - 5, 30, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 20, cy + 2, 25, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMountains(ctx: CanvasRenderingContext2D, width: number, height: number, theme: ThemeConfig): void {
  const horizonY = height * HORIZON_RATIO;

  // Distant mountains
  ctx.fillStyle = theme.colors.mountain.far;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  for (let i = 0; i <= width; i += 40) {
    const peakHeight = 25 + Math.sin(i * 0.02) * 15 + Math.sin(i * 0.05) * 10;
    ctx.lineTo(i, horizonY - peakHeight);
  }
  ctx.lineTo(width, horizonY);
  ctx.closePath();
  ctx.fill();

  // Near mountains
  ctx.fillStyle = theme.colors.mountain.near;
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  for (let i = 0; i <= width; i += 50) {
    const peakHeight = 35 + Math.sin(i * 0.025 + 1) * 20 + Math.sin(i * 0.04) * 12;
    ctx.lineTo(i, horizonY - peakHeight);
  }
  ctx.lineTo(width, horizonY);
  ctx.closePath();
  ctx.fill();
}

function drawGround(ctx: CanvasRenderingContext2D, width: number, height: number, theme: ThemeConfig): void {
  const horizonY = height * HORIZON_RATIO;

  const groundGradient = ctx.createLinearGradient(0, horizonY, 0, height);
  groundGradient.addColorStop(0, theme.colors.ground[0]);
  groundGradient.addColorStop(1, theme.colors.ground[1]);
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, horizonY, width, height - horizonY);

  // Ground details (textures/lines)
  if (theme.groundType === 'grid') {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      // Vertical lines
      for (let x = -width; x < width * 2; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, horizonY);
          ctx.lineTo((x - width/2) * 4 + width/2, height);
          ctx.stroke();
      }
      // Horizontal lines
      for(let y = horizonY; y < height; y += (y - horizonY) * 0.5 + 5) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
      }
  } else if (theme.groundType === 'cracked') {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 20; i++) {
          const x = Math.random() * width;
          const y = horizonY + Math.random() * (height - horizonY);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.random() * 40 - 20, y + Math.random() * 40 - 20);
          ctx.lineTo(x + Math.random() * 40 - 20, y + Math.random() * 40 - 20);
          ctx.stroke();
      }
  } else if (theme.groundType === 'waves') {
       ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
       ctx.lineWidth = 2;
       for (let y = horizonY + 20; y < height; y += 30) {
           ctx.beginPath();
           for (let x = 0; x <= width; x += 50) {
               ctx.quadraticCurveTo(x + 25, y - 10, x + 50, y);
           }
           ctx.stroke();
       }
  } else if (theme.groundType === 'bubbles') {
      ctx.fillStyle = 'rgba(100, 255, 100, 0.2)';
      for (let i = 0; i < 20; i++) {
           const x = Math.random() * width;
           const y = horizonY + Math.random() * (height - horizonY);
           const r = Math.random() * 10 + 5;
           ctx.beginPath();
           ctx.arc(x, y, r, 0, Math.PI * 2);
           ctx.fill();
      }
  } else if (theme.groundType !== 'none') {
    // Default / Grass / Sand / Snow
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = horizonY + 20; y < height; y += 30) {
      for (let x = 0; x < width; x += 15) {
        if (Math.random() > 0.8) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + 3, y - 5);
        }
      }
    }
    ctx.stroke();
  }
}

function drawRoadSurface(ctx: CanvasRenderingContext2D, width: number, height: number, theme: ThemeConfig): void {
  const horizonY = height * HORIZON_RATIO;
  const roadStartY = horizonY;
  const roadHorizonWidth = width * 0.18;
  const roadBottomWidth = width * 0.95;

  // Road Asphalt
  const roadGradient = ctx.createLinearGradient(0, roadStartY, 0, height);
  roadGradient.addColorStop(0, theme.colors.road[0]);
  roadGradient.addColorStop(1, theme.colors.road[1]);

  ctx.fillStyle = roadGradient;
  ctx.beginPath();
  ctx.moveTo(width / 2 - roadHorizonWidth / 2, roadStartY);
  ctx.lineTo(width / 2 + roadHorizonWidth / 2, roadStartY);
  ctx.lineTo(width / 2 + roadBottomWidth / 2, height);
  ctx.lineTo(width / 2 - roadBottomWidth / 2, height);
  ctx.closePath();
  ctx.fill();

  // Specific Road details
  if (theme.roadType === 'brick') {
     ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
     ctx.lineWidth = 1;
     // simple brick pattern
     ctx.beginPath();
     for(let y = roadStartY; y < height; y+=20) {
         ctx.moveTo(width/2 - roadBottomWidth, y); // overdraw is fine, clipped by loop logic usually or distinct path
         // Actually better to re-clip or just draw lines roughly
         // Simplified:
         ctx.moveTo(0, y); ctx.lineTo(width, y); // across screen, cheap but works if layered
     }
     ctx.stroke();
  }

  // Road Borders
  ctx.fillStyle = shadeColor(theme.colors.road[1], -30); // Darker border
  const borderWidth = 8;

  // Left border
  ctx.beginPath();
  ctx.moveTo(width / 2 - roadHorizonWidth / 2, roadStartY);
  ctx.lineTo(width / 2 - roadHorizonWidth / 2 - 3, roadStartY);
  ctx.lineTo(width / 2 - roadBottomWidth / 2 - borderWidth, height);
  ctx.lineTo(width / 2 - roadBottomWidth / 2, height);
  ctx.closePath();
  ctx.fill();

  // Right border
  ctx.beginPath();
  ctx.moveTo(width / 2 + roadHorizonWidth / 2, roadStartY);
  ctx.lineTo(width / 2 + roadHorizonWidth / 2 + 3, roadStartY);
  ctx.lineTo(width / 2 + roadBottomWidth / 2 + borderWidth, height);
  ctx.lineTo(width / 2 + roadBottomWidth / 2, height);
  ctx.closePath();
  ctx.fill();

  if (theme.roadType === 'holographic') {
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2 - roadHorizonWidth / 2, roadStartY);
      ctx.lineTo(width / 2 - roadBottomWidth / 2, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width / 2 + roadHorizonWidth / 2, roadStartY);
      ctx.lineTo(width / 2 + roadBottomWidth / 2, height);
      ctx.stroke();
  }

  // Center Lines
  if (theme.roadType !== 'dirt' && theme.roadType !== 'ice' && theme.roadType !== 'alien') {
      ctx.strokeStyle = theme.roadType === 'holographic' ? '#00FFFF' : '#FFD700';
      ctx.lineWidth = 4;
      ctx.setLineDash([30, 40]);
      ctx.beginPath();
      ctx.moveTo(width / 2, roadStartY + 10);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
      ctx.setLineDash([]);
  }

  // Side Lines
  if (theme.roadType === 'asphalt' || theme.roadType === 'brick') {
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
  }
}

function drawDecorations(ctx: CanvasRenderingContext2D, width: number, height: number, theme: ThemeConfig): void {
  const horizonY = height * HORIZON_RATIO;
  const roadStartY = horizonY;
  const roadHorizonWidth = width * 0.18;
  const roadBottomWidth = width * 0.95;

  for (let i = 0; i < 8; i++) {
    const treeY = horizonY + 50 + i * 85;
    if (treeY > height - 80) continue;

    const progress = (treeY - horizonY) / (height - horizonY);
    const size = 10 + progress * 25;
    const treeProgress = (treeY - roadStartY) / (height - roadStartY);
    const roadWidthAtY = roadHorizonWidth + (roadBottomWidth - roadHorizonWidth) * treeProgress;

    const leftX = (width - roadWidthAtY) / 2 - 30 - progress * 20;
    if (leftX > 15) drawDecorationItem(ctx, leftX, treeY, size, theme);

    const rightX = (width + roadWidthAtY) / 2 + 30 + progress * 20;
    if (rightX < width - 15) drawDecorationItem(ctx, rightX, treeY, size, theme);
  }
}

function drawDecorationItem(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, theme: ThemeConfig): void {
    const color = theme.colors.tree;
    switch (theme.decorationType) {
        case 'cactus':
            drawCactus(ctx, x, y, size, color);
            break;
        case 'snowman':
            drawSnowman(ctx, x, y, size);
            break;
        case 'crystal':
            drawCrystal(ctx, x, y, size, color);
            break;
        case 'candy_cane':
            drawCandyCane(ctx, x, y, size);
            break;
        case 'pillar':
            drawPillar(ctx, x, y, size, color);
            break;
        case 'rock':
            drawRock(ctx, x, y, size, color);
            break;
        case 'bubble':
            drawBubble(ctx, x, y, size);
            break;
        case 'mushroom':
            drawMushroom(ctx, x, y, size, color);
            break;
        case 'star':
            drawStar(ctx, x, y, 5, size, size/2);
            ctx.fillStyle = '#FFF';
            ctx.fill();
            break;
        case 'tree':
        default:
            drawTree(ctx, x, y, size, color);
            break;
    }
}

// --- Specific Decoration Drawers ---

function drawCactus(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.fillStyle = color;
    // Main stem
    ctx.fillRect(x - size * 0.2, y - size, size * 0.4, size);
    // Arms
    ctx.fillRect(x - size * 0.5, y - size * 0.6, size * 0.3, size * 0.2);
    ctx.fillRect(x - size * 0.5, y - size * 0.8, size * 0.1, size * 0.2);
    ctx.fillRect(x + size * 0.2, y - size * 0.7, size * 0.3, size * 0.2);
    ctx.fillRect(x + size * 0.4, y - size * 0.9, size * 0.1, size * 0.2);
}

function drawSnowman(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2); // Base
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - size * 0.6, size * 0.35, 0, Math.PI * 2); // Body
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - size * 1.0, size * 0.25, 0, Math.PI * 2); // Head
    ctx.fill();
}

function drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.4, y - size * 0.4);
    ctx.lineTo(x, y);
    ctx.lineTo(x - size * 0.4, y - size * 0.4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.2, y - size * 0.4);
    ctx.lineTo(x, y);
    ctx.fill();
}

function drawCandyCane(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = size * 0.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - size * 0.8);
    ctx.quadraticCurveTo(x, y - size, x - size * 0.3, y - size);
    ctx.stroke();
    ctx.strokeStyle = '#FF0000';
    ctx.setLineDash([size * 0.1, size * 0.1]);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawPillar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(x - size * 0.2, y - size, size * 0.4, size);
    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.fillRect(x - size * 0.1, y - size, size * 0.2, size);
}

function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.5, y);
    ctx.lineTo(x - size * 0.3, y - size * 0.6);
    ctx.lineTo(x, y - size * 0.8);
    ctx.lineTo(x + size * 0.4, y - size * 0.5);
    ctx.lineTo(x + size * 0.5, y);
    ctx.fill();
}

function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - size * 0.5, size * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();
}

function drawMushroom(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.fillStyle = '#EEE'; // Stem
    ctx.fillRect(x - size * 0.15, y - size * 0.5, size * 0.3, size * 0.5);
    ctx.fillStyle = color; // Cap
    ctx.beginPath();
    ctx.arc(x, y - size * 0.5, size * 0.5, Math.PI, 0);
    ctx.fill();
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x + size * 0.2, y + size * 0.45, size * 0.35, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Trunk
  ctx.fillStyle = '#2c1e14';
  ctx.fillRect(x - size * 0.1, y, size * 0.2, size * 0.4);

  // Foliage
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

function drawRoad(ctx: CanvasRenderingContext2D, gameState: GameState): void {
  const width = BASE_WIDTH;
  const height = BASE_HEIGHT;
  const time = Date.now();
  const theme = getBiomeColors(gameState.currentLevel);

  // Update Cache if necessary
  if (!backgroundCache || lastCachedLevel !== gameState.currentLevel || lastCachedWidth !== width || lastCachedHeight !== height) {
    updateBackgroundCache(theme, width, height);
    lastCachedLevel = gameState.currentLevel;
    lastCachedWidth = width;
    lastCachedHeight = height;
  }

  // Draw cached static background
  if (backgroundCache) {
    ctx.drawImage(backgroundCache, 0, 0);
  } else {
    // Fallback should normally not happen if updateBackgroundCache works
    drawSky(ctx, width, height, theme);
    drawCelestialBody(ctx, width, height, theme);
    drawMountains(ctx, width, height, theme);
    drawGround(ctx, width, height, theme);
  }

  // Draw dynamic elements on top
  drawClouds(ctx, width, time, theme);
  // drawRoadSurface is semi-static (perspective shape) but has dynamic elements in some themes or could have scrolling lines
  // We keep it dynamic for now to support animated road textures if added
  drawRoadSurface(ctx, width, height, theme);
  drawDecorations(ctx, width, height, theme);
}

function drawSoldier3D(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, animOffset: number, time: number, type: Soldier['type'] = 'normal', isSuper: boolean = false, isFlash: boolean = false): void {
  // Attempt to use cached sprite
  const key = getSpriteKey(type, color, size, isSuper, isFlash);
  const cachedCanvas = spriteCache.images.get(key);

  const bounce = Math.sin(time * 0.008 + animOffset) * 3;
  const scale = Math.max(0.5, 1 - (800 - y) / 1500);

  if (cachedCanvas) {
    const canvasSize = cachedCanvas.width;

    // Optimization: Manual Transform instead of save/restore
    const finalY = y + bounce;

    ctx.translate(x, finalY);
    ctx.scale(scale, scale);
    ctx.drawImage(cachedCanvas, -canvasSize / 2, -canvasSize / 2);

    // Reset transform
    ctx.scale(1/scale, 1/scale);
    ctx.translate(-x, -finalY);

    return;
  }

  // Fallback drawing if needed (should be rare if cache works)
}
/* v8 ignore stop */

// Histórico de posições para trail effect
let lastArmyX = 0;

// Reusable arrays to avoid allocation every frame
const tempAliveNormalSoldiers: Soldier[] = [];
const tempSuperSoldiers: Soldier[] = [];
const tempSoldiersToDraw: Soldier[] = [];

export function prepareSoldiersToDraw(army: Army): Soldier[] {
  const maxSoldiers = QualityManager.getInstance().settings.maxRenderedSoldiers;

  // Clear buffers without reallocating
  tempAliveNormalSoldiers.length = 0;
  tempSuperSoldiers.length = 0;
  tempSoldiersToDraw.length = 0;

  // Single pass to separate types
  for (const s of army.soldiers) {
    if (s.isAlive) {
      if (s.isSuper) tempSuperSoldiers.push(s);
      else tempAliveNormalSoldiers.push(s);
    }
  }

  if (tempSuperSoldiers.length >= maxSoldiers) {
    // If we have enough supers, just fill with supers up to limit
    for (let i = 0; i < maxSoldiers; i++) {
      tempSoldiersToDraw.push(tempSuperSoldiers[i]);
    }
  } else {
    // Add all supers
    for (let i = 0; i < tempSuperSoldiers.length; i++) {
      tempSoldiersToDraw.push(tempSuperSoldiers[i]);
    }

    const remainingSlots = maxSoldiers - tempSoldiersToDraw.length;

    if (tempAliveNormalSoldiers.length > remainingSlots) {
      // Sample normals
      const step = tempAliveNormalSoldiers.length / remainingSlots;
      for (let i = 0; i < remainingSlots; i++) {
        tempSoldiersToDraw.push(tempAliveNormalSoldiers[Math.floor(i * step)]);
      }
    } else {
      // Add all normals
      for (let i = 0; i < tempAliveNormalSoldiers.length; i++) {
        tempSoldiersToDraw.push(tempAliveNormalSoldiers[i]);
      }
    }
  }

  // Sort in-place
  tempSoldiersToDraw.sort((a, b) => a.y - b.y);

  return tempSoldiersToDraw;
}

/* v8 ignore start */
function drawArmy(ctx: CanvasRenderingContext2D, army: Army, time: number): void {
  if (!spriteCache.initialized) {
    preRenderSprites();
  }

  const dx = army.centerX - lastArmyX;
  if (Math.abs(dx) > 2) {
    // Optimization: Avoid filtering entire array just for trail check. Try random sampling.
    for (let i = 0; i < 5; i++) {
      const randIdx = Math.floor(Math.random() * army.soldiers.length);
      const s = army.soldiers[randIdx];
      if (s && s.isAlive && Math.random() < 0.3) {
        addTrail(s.x, s.y + 10, '#4A90D9');
        break;
      }
    }
  }
  lastArmyX = army.centerX;

  const soldiersToDraw = prepareSoldiersToDraw(army);

  for (const soldier of soldiersToDraw) {
    if (soldier.hitTimer && soldier.hitTimer > 0) {
      soldier.hitTimer--;
    }
    const isFlash = (soldier.hitTimer || 0) > 0;

    if (soldier.isSuper) {
      // Use super sprite
      drawSoldier3D(ctx, soldier.x, soldier.y, soldier.size, '#FFD700', soldier.animOffset, time, soldier.type, true, isFlash);

      // Star overhead (simple text, could be sprite too)
      ctx.fillStyle = '#FFD700';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('⭐', soldier.x, soldier.y - soldier.size - 5);
    } else {
      drawSoldier3D(ctx, soldier.x, soldier.y, soldier.size, soldier.color, soldier.animOffset, time, soldier.type, false, isFlash);
    }
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
    if (soldier.hitTimer && soldier.hitTimer > 0) {
      soldier.hitTimer--;
    }
    const isFlash = (soldier.hitTimer || 0) > 0;
    drawSoldier3D(ctx, soldier.x, soldier.y, soldier.size, soldier.color, soldier.animOffset, time, soldier.type, false, isFlash);
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
  if (gate.cachedColors) {
    barrelGradient.addColorStop(0, gate.cachedColors.light);
    barrelGradient.addColorStop(0.5, gate.color);
    barrelGradient.addColorStop(1, gate.cachedColors.dark);
  } else {
    barrelGradient.addColorStop(0, shadeColor(gate.color, 20));
    barrelGradient.addColorStop(0.5, gate.color);
    barrelGradient.addColorStop(1, shadeColor(gate.color, -20));
  }

  ctx.save();
  // Shadow/Glow
  if (QualityManager.getInstance().settings.enableShadows) {
    ctx.shadowColor = gate.color;
    ctx.shadowBlur = 15;
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x + width / 2 + 5, gate.y + height + 10, width / 2, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0; // Reset for post

  ctx.fillStyle = '#8B4513'; // Post color
  ctx.beginPath();
  ctx.roundRect(x + width * 0.05, gate.y + height, width * 0.1, 15, 2);
  ctx.roundRect(x + width * 0.85, gate.y + height, width * 0.1, 15, 2);
  ctx.fill();

  // Main Body
  ctx.shadowBlur = 10;
  ctx.shadowColor = gate.color;
  ctx.fillStyle = barrelGradient;
  ctx.beginPath();
  ctx.roundRect(x, gate.y, width, height, 12);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Inner Panel
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.roundRect(x + 5, gate.y + 5, width - 10, height - 10, 8);
  ctx.fill();

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.font = `900 ${Math.floor(36 * scale)}px Arial`; // Thicker, larger font
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
  if (QualityManager.getInstance().settings.simplifiedRendering) return;

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

function drawDamageOverlay(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number): void {
  if (intensity <= 0.05) return;

  ctx.save();
  // Red vignette
  const gradient = ctx.createRadialGradient(width/2, height/2, height * 0.4, width/2, height/2, height * 0.9);
  gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(255, 0, 0, ${intensity * 0.6})`);

  ctx.fillStyle = gradient;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
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

function drawUI(ctx: CanvasRenderingContext2D, gameState: GameState, armyCount: number, fireRate: number, damage: number, army: Army): void {
  const width = BASE_WIDTH;
  const height = BASE_HEIGHT;

  // Calcular "Poder do Exército" (Soma dos pesos das unidades)
  let armyPower = 0;
  for (const s of army.soldiers) {
    if (!s.isAlive) continue;
    if (s.type === 'bazooka') armyPower += 5;
    else if (s.type === 'rambo') armyPower += 3;
    else if (s.type === 'laser') armyPower += 4;
    else if (s.isSuper) armyPower += 2;
    else armyPower += 1;
  }

  // Layout inferior unificado (Linha única)
  // Ajustado para Safe Area (Home Bar no iOS ocupa ~34px)
  const bottomY = height - 45;
  const badgeHeight = 32;
  const gap = 5;

  // Calculate Total Attack Power (Actual DPS proxy)
  const totalAttack = Math.floor(armyPower * damage);

  ctx.save();

  // Pre-calculate widths to center
  const isRecord = gameState.score > gameState.highScore && gameState.highScore > 0;
  const scoreColor = isRecord
      ? (Math.floor(Date.now() / 200) % 2 === 0 ? '#FFD700' : '#FF4500') // Pulse Gold/Orange
      : '#FFD700';

  const badges = [
      { text: `🏆 ${gameState.score}`, color: scoreColor, width: 0 },
      { text: `💰 ${gameState.coins}`, color: '#F1C40F', width: 0 },
      { text: `Lv.${gameState.currentLevel}`, color: '#4A90D9', width: 0 },
      { text: `🪖 ${armyCount}`, color: '#2ECC71', width: 0 }, // Show count, power is implied in Attack
      { text: `⚔️ ${totalAttack}`, color: '#E91E63', width: 0 } // Show Total Attack
  ];

  let totalWidth = 0;
  for (const b of badges) {
      // Estimate width (roughly 9px per char at 14px bold) + padding
      b.width = Math.max(50, 20 + b.text.length * 9);
      totalWidth += b.width;
  }
  totalWidth += (badges.length - 1) * gap;

  // Start X to center
  let currentX = (width - totalWidth) / 2;

  // Draw
  for (const b of badges) {
      drawGlassBadge(ctx, currentX, bottomY - badgeHeight/2, b.width, badgeHeight, b.text, b.color, 14);
      currentX += b.width + gap;
  }

  // Coins removido do topo pois foi movido para baixo
  // drawGlassBadge(ctx, width - 90, 30, 80, 28, `💰 ${gameState.coins}`, '#FFD700', 14);

  // High Score (Topo Esquerda, pequeno)
  if (gameState.highScore > 0) {
    drawGlassBadge(ctx, 10, 30, 100, 24, `👑 HI: ${gameState.highScore}`, '#CCCCCC', 12);
  }

  // Progress Bar (Topo, mais visível)
  const progressWidth = width - 40;
  const progressX = 20;
  const progressY = 10;
  const progressHeight = 8;
  const progress = Math.min(gameState.distanceTraveled / gameState.levelDistance, 1);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.roundRect(progressX, progressY, progressWidth, progressHeight, 4);
  ctx.fill();
  ctx.fillStyle = '#00C9FF';
  ctx.beginPath();
  ctx.roundRect(progressX, progressY, progressWidth * progress, progressHeight, 4);
  ctx.fill();

  // Boss/Goal Icon at the end
  const endX = progressX + progressWidth;
  const endY = progressY + progressHeight / 2;

  // Outer ring
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(endX, endY, 12, 0, Math.PI * 2);
  ctx.fill();

  // Inner circle
  ctx.fillStyle = '#E74C3C';
  ctx.beginPath();
  ctx.arc(endX, endY, 10, 0, Math.PI * 2);
  ctx.fill();

  // Skull icon text
  ctx.fillStyle = '#FFF';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💀', endX, endY + 1);

  ctx.restore();

  // Combo
  if (gameState.combo > 1) {
    const comboX = width / 2;
    const comboY = 120; // Movido mais para baixo
    const pulse = Math.min(2.5, 1.2 + gameState.combo / 40) + Math.sin(Date.now() * 0.015) * 0.1;
    const shake = gameState.combo > 20 ? (Math.random() - 0.5) * 5 : 0;

    ctx.save();
    ctx.translate(comboX + shake, comboY + shake);
    ctx.rotate(Math.sin(Date.now() * 0.01) * 0.1);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = getComboColor(gameState.combo);
    ctx.shadowBlur = 20;
    ctx.fillStyle = getComboColor(gameState.combo);
    ctx.font = `900 ${Math.min(48, 28 + gameState.combo)}px Arial`; // Grow with combo
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeText(`${gameState.combo}x COMBO!`, 0, 0);
    ctx.fillText(`${gameState.combo}x COMBO!`, 0, 0);
    const comboProgress = gameState.comboTimer / 4000;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(-50, 10, 100, 6);
    ctx.fillStyle = getComboColor(gameState.combo);
    ctx.fillRect(-50, 10, 100 * comboProgress, 6);
    ctx.restore();
  }

  // New Record Celebration
  if (gameState.score > gameState.highScore && gameState.highScore > 0 && !gameState.newRecordReached) {
      // Just triggered logic handled in game loop, but visual here
      // We can use a property in gameState to track if we should show celebration
      // For now, simpler: if score is > old highscore (we'd need to know old highscore, which we don't track separately here easily without adding state)
      // Actually, game.ts handles logic.
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
  const width = BASE_WIDTH;
  const height = BASE_HEIGHT;
  const time = Date.now();

  // Clear with physical dimensions to ensure full clear
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to clear physical screen
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();

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

  if (gameState.damageFlash > 0) {
    drawDamageOverlay(ctx, width, height, gameState.damageFlash);
  }

  drawUI(ctx, gameState, entities.playerArmy.soldiers.filter(s => s.isAlive).length, entities.playerArmy.fireRate, entities.playerArmy.damage, entities.playerArmy);
  drawJoystick(ctx);
  updateFloatingTexts();
  drawFloatingTexts(ctx);
}
/* v8 ignore stop */
