// renderer.ts - Renderização do jogo estilo Crowd Runner
import { Entities, GameState, FloatingText, Army, EnemyHorde, Gate, Bullet, Particle, MysteryBox, Soldier, MiniBoss, Trail } from './types';
import { ObjectPool } from './pool';
import { shadeColor, getBiomeColors, fastRemove } from './utils';
import { COLORS, MAX_PARTICLES, MAX_RENDERED_SOLDIERS, ThemeConfig, BASE_WIDTH, BASE_HEIGHT, FONT_FAMILY } from './constants';
import { safeAddColorStop, drawGlassBadge, drawStar, drawJoystick, getComboColor } from './renderer-utils';
import { drawBoss, drawBossTelegraph } from './renderer-boss';
import { QualityManager } from './quality';
import { getActiveSkin } from './skins';
import { paintCharacter, SPRITE_SS } from './soldier-art';
import { paintBiomeScene, paintRoadDetail } from './biome-art';
import { paintGate, GATE_SS, GATE_PADDING } from './gate-art';
import { HORIZON_RATIO, HORIZON_Y, perspScale, projectX, roadHalfWidthAt } from './perspective';
import { drawHud } from './hud';
import { getMiniBossSprite, MINI_BOX, MINI_VISUAL_SCALE, MINI_NAMES } from './boss-art';
import { WeatherState, createWeather, stepWeather, drawWeather } from './weather';

// --- Sprite Caching System ---
interface SpriteCache {
  images: Map<string, HTMLCanvasElement | OffscreenCanvas>;
  initialized: boolean;
}

const spriteCache: SpriteCache = {
  images: new Map(),
  initialized: false
};

const decorationCache: Map<string, HTMLCanvasElement | OffscreenCanvas> = new Map();

export function _resetSpriteCache() {
  spriteCache.images.clear();
  decorationCache.clear();
  spriteCache.initialized = false;
}

// --- Background Caching System ---
let backgroundCache: HTMLCanvasElement | OffscreenCanvas | null = null;
let lastCachedLevel = -1;
let lastCachedWidth = 0;
let lastCachedHeight = 0;

/* v8 ignore start */
/** Backgrounds are painted at 2x so the detailed scenery stays crisp on hi-dpi screens. */
const BG_SS = 2;

function updateBackgroundCache(theme: ThemeConfig, width: number, height: number): void {
  const pw = width * BG_SS;
  const ph = height * BG_SS;
  if (!backgroundCache) {
    if (typeof OffscreenCanvas !== 'undefined') {
      backgroundCache = new OffscreenCanvas(pw, ph);
    } else {
      backgroundCache = document.createElement('canvas');
      backgroundCache.width = pw;
      backgroundCache.height = ph;
    }
  }

  // Ensure size match
  if (backgroundCache.width !== pw || backgroundCache.height !== ph) {
    backgroundCache.width = pw;
    backgroundCache.height = ph;
  }

  const ctx = backgroundCache.getContext('2d') as CanvasRenderingContext2D;
  ctx.setTransform(BG_SS, 0, 0, BG_SS, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const horizonY = height * HORIZON_RATIO;
  paintBiomeScene(ctx, width, height, horizonY, theme);
  drawRoadSurface(ctx, width, height, theme);
  paintRoadDetail(ctx, width, height, horizonY, theme);
}

// Helper to generate a key
const getSpriteKey = (type: string, color: string, size: number, isSuper: boolean = false, isFlash: boolean = false): string => {
  return `${type}_${color}_${size}_${isSuper}_${isFlash}`;
};

// Function to pre-render sprites
export function preRenderSprites(): void {
  if (spriteCache.initialized) return;

  // Eagerly cache the hot set (the rest renders lazily on first use; sprites are supersampled so keep this small)
  const skin = getActiveSkin().primary;
  const hot: [Soldier['type'], string, number, boolean][] = [
    ['normal', skin, 16, false],
    ['normal', COLORS.PLAYER.NORMAL, 16, false],
    ['normal', COLORS.ENEMY.BASE, 16, false],
    ['normal', COLORS.PLAYER.SUPER, 22, true],
    ['bazooka', COLORS.PLAYER.BAZOOKA, 16, false],
    ['rambo', COLORS.PLAYER.RAMBO, 16, false],
    ['laser', COLORS.PLAYER.LASER, 16, false],
  ];
  for (const [type, color, size, isSuper] of hot) {
    renderSoldierToCache(type, color, size, isSuper, false);
    renderSoldierToCache(type, color, size, isSuper, true); // damage-flash silhouette
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

  // Render Bullet Sprites
  renderBulletToCache(false, getActiveSkin().accent); // Player (tinted by skin)
  renderBulletToCache(true);  // Enemy

  spriteCache.initialized = true;
  console.log('Sprites pre-rendered. Cache size:', spriteCache.images.size);
}

export { fmtGateValue } from './gate-art';

/** Cache key of the bullet sprite; the player bullet is tinted by the active skin. */
export function bulletKey(isEnemy: boolean, tint: string = '#FFD700'): string {
  return isEnemy ? 'bullet_enemy' : `bullet_player_${tint}`;
}

function renderBulletToCache(isEnemy: boolean, tint: string = '#FFD700') {
  const key = bulletKey(isEnemy, tint);
  if (spriteCache.images.has(key)) return;

  const size = 8;
  const canvasSize = size * 2 + 4; // Margin
  const center = canvasSize / 2;

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  /* v8 ignore start */
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(canvasSize, canvasSize);
    ctx = canvas.getContext('2d');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    ctx = canvas.getContext('2d');
  }
  /* v8 ignore stop */

  if (!ctx) return;

  const colorMain = isEnemy ? '#FF6B6B' : tint;
  const colorCore = isEnemy ? '#E74C3C' : '#FFF';

  const gradient = ctx.createRadialGradient(center, center, 0, center, center, size);
  safeAddColorStop(gradient, 0, colorMain);
  safeAddColorStop(gradient, 1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center, center, size, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colorCore;
  ctx.beginPath();
  ctx.arc(center, center, 3, 0, Math.PI * 2);
  ctx.fill();

  spriteCache.images.set(key, canvas);
}

function renderSoldierToCache(type: Soldier['type'], color: string, size: number, isSuper: boolean, isFlash: boolean) {
  const key = getSpriteKey(type, color, size, isSuper, isFlash);
  if (spriteCache.images.has(key)) return;

  // Logical sprite box (units): tight padding for weapons, helmet crests and the ground shadow.
  const logical = Math.ceil(size * 4);
  const px = logical * SPRITE_SS;

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  /* v8 ignore start */
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(px, px);
    ctx = canvas.getContext('2d');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    ctx = canvas.getContext('2d');
  }
  /* v8 ignore stop */

  if (!ctx) return;

  ctx.scale(SPRITE_SS, SPRITE_SS);
  paintCharacter(ctx, logical / 2, logical / 2, size, {
    type,
    color,
    isSuper,
    flash: isFlash,
    simple: QualityManager.getInstance().settings.simplifiedRendering,
  });

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

  /* v8 ignore start */
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(canvasSize, canvasSize);
    ctx = canvas.getContext('2d');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    ctx = canvas.getContext('2d');
  }
  /* v8 ignore stop */

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
export const _testing = { getFloatingTexts: () => floatingTexts, getParticles: () => particles };
const particles: Particle[] = [];

// Pool de floating texts
const floatingTextPool = new ObjectPool<FloatingText>(
  () => ({ text: '', x: 0, y: 0, color: '#FFF', alpha: 1, scale: 1, vx: 0, vy: 0, gravity: 0 }),
  (t) => {
    /* v8 ignore next 10 */
    t.text = '';
    t.x = 0;
    t.y = 0;
    t.color = '#FFF';
    t.alpha = 1;
    t.scale = 1;
    t.vx = 0;
    t.vy = 0;
    t.gravity = 0;
    t.style = 'normal';
  }
);

// Pool de partículas
const particlePool = new ObjectPool<Particle>(
  () => ({ x: 0, y: 0, vx: 0, vy: 0, color: '#FFF', size: 0, life: 0, maxLife: 0, type: 'spark', rotation: 0, rotationSpeed: 0 }),
  (p) => {
    /* v8 ignore next 12 */
    p.x = 0;
    p.y = 0;
    p.vx = 0;
    p.vy = 0;
    p.color = '#FFF';
    p.size = 0;
    p.life = 0;
    p.maxLife = 0;
    p.type = 'spark';
    p.rotation = 0;
    p.rotationSpeed = 0;
  }
);

// Sistema de partículas
export function addParticle(x: number, y: number, type: Particle['type'], color: string, count = 1): void {
  const quality = QualityManager.getInstance().settings;
  const limit = Math.floor(MAX_PARTICLES * quality.particleMultiplier);

  // Limitar quantidade de partículas
  /* v8 ignore next */
  if (particles.length >= limit) return;

  // Adaptive Quality: Skip expensive trails on low quality
  if (type === 'trail' && quality.particleMultiplier < 1.0) {
      return;
  }

  // Reduzir count se estiver chegando no limite
  const availableSlots = limit - particles.length;
  // Allow bursts up to limit, no hard cap per frame
  const actualCount = Math.min(count, availableSlots);

  for (let i = 0; i < actualCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    let speed = type === 'explosion' ? 1.5 + Math.random() * 2.5 : 0.8 + Math.random() * 1.5;

    const p = particlePool.get();
    p.x = x;
    p.y = y;

    if (type === 'debris') {
       speed = 1.0 + Math.random() * 3.0; // Faster debris
       p.rotation = Math.random() * Math.PI * 2;
       p.rotationSpeed = (Math.random() - 0.5) * 0.4;
       p.size = 3 + Math.random() * 4;
       p.life = 0.8 + Math.random() * 0.4; // Live longer
    } else if (type === 'confetti') {
        speed = 2.0 + Math.random() * 4.0;
        p.rotation = Math.random() * Math.PI * 2;
        p.rotationSpeed = (Math.random() - 0.5) * 0.3;
        p.size = 4 + Math.random() * 3;
        p.life = 2.0;
        // Random colors for confetti
        const colors = ['#FFD700', '#FF4500', '#00FFFF', '#FF69B4', '#32CD32'];
        p.color = colors[Math.floor(Math.random() * colors.length)];
    } else if (type === 'holylight') {
       p.size = 100;
       p.life = 1.5;
    } else {
       p.size = type === 'shockwave' ? 20 : (type === 'explosion' ? 2 + Math.random() * 2.5 : 1.5 + Math.random() * 2);
       p.life = 1;
    }

    if (type === 'shockwave' || type === 'holylight') {
        p.vx = 0;
        p.vy = 0;
    } else {
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - (type === 'star' ? 1.5 : 0);
    }

    if (type !== 'confetti') {
        p.color = color;
    }

    p.maxLife = p.life;
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

export function updateParticles(): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    if (p.type === 'shockwave') {
       p.size += 5; // Expand fast
       p.life -= 0.05;
    } else if (p.type === 'confetti') {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // Light gravity
        if (p.rotationSpeed) p.rotation = (p.rotation || 0) + p.rotationSpeed;
        p.life -= 0.01;
    } else {
       p.x += p.vx;
       p.y += p.vy;
       p.vy += 0.1; // Gravidade
       if (p.rotationSpeed) p.rotation = (p.rotation || 0) + p.rotationSpeed;

       p.life -= p.type === 'debris' ? 0.02 : 0.03;
       p.size *= 0.97;
    }

    if (p.life <= 0 || (p.type !== 'shockwave' && p.size < 0.5)) {
      particlePool.release(p);
      fastRemove(particles, i);
    }
  }
}

/* v8 ignore start */
function drawParticles(ctx: CanvasRenderingContext2D, skipSpriteTypes: boolean = false): void {
  ctx.save();
  // Performance: Use additive blending for neon glow instead of expensive shadowBlur
  ctx.globalCompositeOperation = 'lighter';

  for (const p of particles) {
    // Viewport Culling
    if (p.y < -50 || p.y > BASE_HEIGHT + 50) continue;

    if (p.type === 'debris') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        const s = p.size;
        ctx.fillRect(-s/2, -s/2, s, s);
        ctx.restore();
        continue;
    }

    if (p.type === 'holylight') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const alpha = Math.min(1, p.life * 2); // Fade out
        const width = p.size * (1 + (1.5 - p.life)); // Expand slightly
        const gradient = ctx.createLinearGradient(p.x - width/2, 0, p.x + width/2, 0);
        safeAddColorStop(gradient, 0, `rgba(255, 255, 200, 0)`);
        safeAddColorStop(gradient, 0.5, `rgba(255, 255, 200, ${alpha * 0.8})`);
        safeAddColorStop(gradient, 1, `rgba(255, 255, 200, 0)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(p.x - width/2, 0, width, BASE_HEIGHT);
        ctx.restore();
        continue;
    }

    if (p.type === 'confetti') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        const s = p.size;
        ctx.fillRect(-s/2, -s/2, s, s * 0.6);
        ctx.restore();
        continue;
    }

    if (p.type === 'shockwave') {
        ctx.save();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4 * p.life;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        continue;
    }

    if (p.type === 'hitmarker') {
        ctx.save();
        ctx.translate(p.x, p.y);
        // Pop effect: scale starts at 0.5, goes to 1.2, then fades
        const scale = 0.5 + (1 - p.life) * 2;
        ctx.scale(scale, scale);

        ctx.globalAlpha = p.life;

        // Black outline for contrast
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        const s = 5;
        ctx.beginPath();
        ctx.moveTo(-s, -s);
        ctx.lineTo(s, s);
        ctx.moveTo(s, -s);
        ctx.lineTo(-s, s);
        ctx.stroke();

        // White core
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
        continue;
    }

    const key = `particle_${p.type}_${p.color}`;
    const cachedCanvas = spriteCache.images.get(key);
    if (skipSpriteTypes && cachedCanvas) continue; // rendered by Pixi

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

    } else {
      // Fallback if not cached
      ctx.save();
      ctx.globalAlpha = p.life;

      // Use lighter composition instead of shadowBlur for fallback too
      // ctx.shadowColor = p.color;
      // ctx.shadowBlur = 10;

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
  ctx.restore();
}
/* v8 ignore stop */

export function addFloatingText(text: string, x: number, y: number, color: string, sizeMultiplier: number = 1, style: FloatingText['style'] = 'normal'): void {
  const ft = floatingTextPool.get();
  ft.text = text;
  ft.x = x;
  ft.y = y;
  ft.color = color;
  ft.alpha = 1;
  ft.scale = 1 * sizeMultiplier;
  ft.style = style;

  // Physics "Pop" effect (Juicy!)
  if (style === 'critical') {
      ft.vx = (Math.random() - 0.5) * 10; // Even Wider spread
      ft.vy = -8 - Math.random() * 4;     // Much Higher jump
      ft.scale *= 1.5;                    // Bigger
      ft.gravity = 0.4;                   // Heavier fall
  } else if (style === 'gold') {
      ft.vx = (Math.random() - 0.5) * 3;
      ft.vy = -6 - Math.random() * 2;
      ft.gravity = 0.3;
  } else {
      ft.vx = (Math.random() - 0.5) * 6;
      ft.vy = -5 - Math.random() * 3;
      ft.gravity = 0.25;
  }

  floatingTexts.push(ft);
}

export function updateFloatingTexts(): void {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];

    // Apply Physics
    ft.x += ft.vx;
    ft.y += ft.vy;
    ft.vy += ft.gravity;

    // Drag
    ft.vx *= 0.95;

    ft.alpha -= 0.015; // Slower fade

    // Pop animation: Scale up quickly then settle
    // We use alpha (1.0 -> 0.0) as a proxy for time (0.0 -> 1.0)
    const progress = 1 - ft.alpha;
    const popScale = ft.style === 'critical' ? 2.5 : 1.2; // Adjusted scales

    if (progress < 0.15) {
        // Pop up (Fast expand)
        ft.scale = 0.5 + (progress / 0.15) * (popScale - 0.5);
    } else {
        // Settle/Fade
        ft.scale = popScale * (1 - (progress - 0.15) * 0.5); // Shrink slightly as it fades
    }

    if (ft.alpha <= 0) {
      floatingTextPool.release(ft);
      fastRemove(floatingTexts, i);
    }
  }
}

// --- Map / Background Rendering ---
/* v8 ignore start */
// HORIZON_RATIO comes from perspective.ts

function drawSky(ctx: CanvasRenderingContext2D, width: number, height: number, theme: ThemeConfig): void {
  const horizonY = height * HORIZON_RATIO;
  const skyGradient = ctx.createLinearGradient(0, 0, 0, horizonY);
  safeAddColorStop(skyGradient, 0, theme.colors.sky[0]);
  safeAddColorStop(skyGradient, 1, theme.colors.sky[1]);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, horizonY + 10);
}

function drawCelestialBody(ctx: CanvasRenderingContext2D, width: number, height: number, theme: ThemeConfig): void {
  if (theme.celestial.type === 'none') return;

  const x = width * 0.82;
  const y = height * 0.08;

  if (theme.celestial.type === 'sun') {
    const sunGlow = ctx.createRadialGradient(x, y, 0, x, y, 60);
    safeAddColorStop(sunGlow, 0, theme.celestial.color);
    safeAddColorStop(sunGlow, 0.2, shadeColor(theme.celestial.color, 20));
    safeAddColorStop(sunGlow, 0.5, 'rgba(255, 255, 255, 0.2)');
    safeAddColorStop(sunGlow, 1, 'rgba(255, 255, 255, 0)');
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
  safeAddColorStop(groundGradient, 0, theme.colors.ground[0]);
  safeAddColorStop(groundGradient, 1, theme.colors.ground[1]);
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
  safeAddColorStop(roadGradient, 0, theme.colors.road[0]);
  safeAddColorStop(roadGradient, 1, theme.colors.road[1]);

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

  // Lane markings scroll with the player's progress: see drawLaneMotion
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

export function renderDecorationSprite(type: string, color: string): HTMLCanvasElement | OffscreenCanvas | null {
    const key = `dec_${type}_${color}`;
    if (decorationCache.has(key)) return decorationCache.get(key)!;

    const baseSize = 60; // Render at high res
    const canvasSize = baseSize * 2.5; // Padding
    const center = canvasSize / 2;

    let canvas: HTMLCanvasElement | OffscreenCanvas;
    let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

    /* v8 ignore start */
    if (typeof OffscreenCanvas !== 'undefined') {
        canvas = new OffscreenCanvas(canvasSize, canvasSize);
        ctx = canvas.getContext('2d');
    } else {
        canvas = document.createElement('canvas');
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        ctx = canvas.getContext('2d');
    }
    /* v8 ignore stop */

    if (!ctx) return null;

    // Draw centered at (center, center + baseSize/2) roughly so bottom aligns
    // The original draw functions draw relative to (x, y) where y is the bottom.
    // So we draw at (center, center + baseSize) to simulate 'y' being the bottom anchor.
    // Adjust Y to fit in canvas
    const drawY = center + baseSize * 0.8;

    switch (type) {
        case 'cactus': drawCactus(ctx as CanvasRenderingContext2D, center, drawY, baseSize, color); break;
        case 'snowman': drawSnowman(ctx as CanvasRenderingContext2D, center, drawY, baseSize); break;
        case 'crystal': drawCrystal(ctx as CanvasRenderingContext2D, center, drawY, baseSize, color); break;
        case 'candy_cane': drawCandyCane(ctx as CanvasRenderingContext2D, center, drawY, baseSize); break;
        case 'pillar': drawPillar(ctx as CanvasRenderingContext2D, center, drawY, baseSize, color); break;
        case 'rock': drawRock(ctx as CanvasRenderingContext2D, center, drawY, baseSize, color); break;
        case 'bubble': drawBubble(ctx as CanvasRenderingContext2D, center, drawY, baseSize); break;
        case 'mushroom': drawMushroom(ctx as CanvasRenderingContext2D, center, drawY, baseSize, color); break;
        case 'star':
            drawStar(ctx as CanvasRenderingContext2D, center, drawY, 5, baseSize, baseSize/2);
            ctx.fillStyle = '#FFF';
            ctx.fill();
            break;
        case 'tree':
        default:
            drawTree(ctx as CanvasRenderingContext2D, center, drawY, baseSize, color);
            break;
    }

    decorationCache.set(key, canvas);
    return canvas;
}

function drawDecorationItem(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, theme: ThemeConfig): void {
    const color = theme.colors.tree;
    const type = theme.decorationType || 'tree';

    const cached = renderDecorationSprite(type, color);

    if (cached) {
        const baseSize = 60;
        const scale = size / baseSize;
        const canvasSize = cached.width; // Should be baseSize * 2.5

        // The cached image was drawn with "anchor" at (center, center + baseSize * 0.8)
        // We want to draw it so that anchor aligns with (x, y)
        // Offset = center => canvasSize / 2
        // Y Offset = center + baseSize * 0.8

        const anchorX = canvasSize / 2;
        const anchorY = canvasSize / 2 + baseSize * 0.8;

        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.drawImage(cached, -anchorX, -anchorY);
        ctx.scale(1/scale, 1/scale);
        ctx.translate(-x, -y);
    } else {
        // Fallback
        switch (type) {
            case 'cactus': drawCactus(ctx, x, y, size, color); break;
            case 'snowman': drawSnowman(ctx, x, y, size); break;
            case 'crystal': drawCrystal(ctx, x, y, size, color); break;
            case 'candy_cane': drawCandyCane(ctx, x, y, size); break;
            case 'pillar': drawPillar(ctx, x, y, size, color); break;
            case 'rock': drawRock(ctx, x, y, size, color); break;
            case 'bubble': drawBubble(ctx, x, y, size); break;
            case 'mushroom': drawMushroom(ctx, x, y, size, color); break;
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

/** Perspective-correct scrolling lane dashes (center + side lines). Depth d runs 1 (horizon) .. 0 (bottom). */
function drawLaneMotion(ctx: CanvasRenderingContext2D, theme: ThemeConfig, distance: number): void {
  const center = theme.roadType !== 'dirt' && theme.roadType !== 'ice' && theme.roadType !== 'alien';
  const sides = theme.roadType === 'asphalt' || theme.roadType === 'brick';
  if (!center && !sides) return;
  const scroll = (distance / 515) % 1;
  const period = 0.14; // in "1/depth" units: dash cycle
  const startRow = HORIZON_Y + 10;
  const colour = theme.roadType === 'holographic' ? '#00FFFF' : '#FFD700';
  const rows = 18;
  for (let i = 0; i < rows; i++) {
    const k0 = (i + scroll) * period, k1 = k0 + period * 0.45;
    // screen row from depth: y = H + (B - H) * k^2 (denser near the horizon)
    const y0 = startRow + (BASE_HEIGHT - startRow) * Math.min(1, (k0 * 0.9) ** 2 * 6.2);
    const y1 = startRow + (BASE_HEIGHT - startRow) * Math.min(1, (k1 * 0.9) ** 2 * 6.2);
    if (y0 >= BASE_HEIGHT || y1 - y0 < 0.5) continue;
    const t = (y0 - HORIZON_Y) / (BASE_HEIGHT - HORIZON_Y);
    if (center) {
      ctx.fillStyle = colour;
      const w0 = 1 + 4 * t, w1 = 1 + 4 * ((y1 - HORIZON_Y) / (BASE_HEIGHT - HORIZON_Y));
      ctx.beginPath();
      ctx.moveTo(240 - w0 / 2, y0); ctx.lineTo(240 + w0 / 2, y0);
      ctx.lineTo(240 + w1 / 2, y1); ctx.lineTo(240 - w1 / 2, y1);
      ctx.fill();
    }
    if (sides) {
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      const h0 = roadHalfWidthAt(y0) - 8 - 22 * t, h1 = roadHalfWidthAt(y1) - 8 - 22 * ((y1 - HORIZON_Y) / (BASE_HEIGHT - HORIZON_Y));
      const sw0 = 1 + 2 * t, sw1 = 1 + 2 * ((y1 - HORIZON_Y) / (BASE_HEIGHT - HORIZON_Y));
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(240 + sgn * h0 - sw0 / 2, y0); ctx.lineTo(240 + sgn * h0 + sw0 / 2, y0);
        ctx.lineTo(240 + sgn * h1 + sw1 / 2, y1); ctx.lineTo(240 + sgn * h1 - sw1 / 2, y1);
        ctx.fill();
      }
    }
  }
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
    ctx.drawImage(backgroundCache, 0, 0, width, height);
  } else {
    // Fallback should normally not happen if updateBackgroundCache works
    drawSky(ctx, width, height, theme);
    drawCelestialBody(ctx, width, height, theme);
    drawMountains(ctx, width, height, theme);
    drawGround(ctx, width, height, theme);
  }

  drawLaneMotion(ctx, theme, gameState.distanceTraveled || 0);

  // Draw dynamic elements on top
  drawClouds(ctx, width, time, theme);
  drawDecorations(ctx, width, height, theme);
}

function drawTrail(ctx: CanvasRenderingContext2D, trail: Trail): void {
  if (trail.points.length < 2) return;
  if (!QualityManager.getInstance().settings.enableTrails) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (QualityManager.getInstance().settings.enableShadows) {
    ctx.shadowColor = trail.color;
    ctx.shadowBlur = 10;
  }

  ctx.strokeStyle = trail.color;
  ctx.lineWidth = trail.width * 0.5; // Average width
  ctx.globalAlpha = 0.4;

  ctx.beginPath();
  ctx.moveTo(trail.points[0].x, trail.points[0].y);
  for (let i = 1; i < trail.points.length; i++) {
      ctx.lineTo(trail.points[i].x, trail.points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawFeverMode(ctx: CanvasRenderingContext2D, width: number, height: number, combo: number): void {
    if (combo < 50) return;
    if (QualityManager.getInstance().settings.simplifiedRendering) return;

    const intensity = Math.min(1, (combo - 50) / 50); // Ramp up from 50 to 100
    const pulse = (Math.sin(Date.now() * 0.015) + 1) * 0.8; // 0 to 1.6, faster and brighter pulse

    ctx.save();

    // Border Glow
    const borderWidth = 15 + pulse * 10;
    ctx.lineWidth = borderWidth;
    const alpha = 0.25 + pulse * 0.2;
    ctx.strokeStyle = `rgba(255, 0, 255, ${alpha * intensity})`; // Neon Magenta Glow
    ctx.strokeRect(0, 0, width, height);

    // Subtle Tint
    ctx.fillStyle = `rgba(255, 100, 0, ${0.1 * pulse * intensity})`; // Stronger Orange Tint pulsing
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
}

function drawScreenPulse(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const pulse = (Math.sin(Date.now() / 200) + 1) * 0.5;
    ctx.save();
    ctx.fillStyle = `rgba(255, 215, 0, ${pulse * 0.05})`;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}

function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!QualityManager.getInstance().settings.enablePostProcessing) return;

    const gradient = ctx.createRadialGradient(width/2, height/2, height * 0.4, width/2, height/2, height * 0.85);
    safeAddColorStop(gradient, 0, 'rgba(0,0,0,0)');
    safeAddColorStop(gradient, 1, 'rgba(0,0,0,0.6)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

function drawScanlines(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!QualityManager.getInstance().settings.enablePostProcessing) return;
    if (QualityManager.getInstance().settings.resolutionScale < 1.0) return; // Skip on low res

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    // Simplified scanlines: just draw a few big lines instead of per-pixel to save perf
    for (let y = 0; y < height; y += 8) {
        ctx.fillRect(0, y, width, 2);
    }
    ctx.restore();
}

function drawSoldier3D(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, animOffset: number, time: number, type: Soldier['type'] = 'normal', isSuper: boolean = false, isFlash: boolean = false): void {
  // Attempt to use cached sprite
  const key = getSpriteKey(type, color, size, isSuper, isFlash);
  let cachedCanvas = spriteCache.images.get(key);
  
  if (!cachedCanvas) {
    renderSoldierToCache(type, color, size, isSuper, isFlash);
    cachedCanvas = spriteCache.images.get(key);
  }

  const bounce = Math.sin(time * 0.008 + animOffset) * 3;
  const scale = Math.max(0.5, 1 - (800 - y) / 1500);

  if (cachedCanvas) {
    const canvasSize = cachedCanvas.width / SPRITE_SS; // sprites are supersampled

    // Optimization: Manual Transform instead of save/restore
    const finalY = y + bounce;

    ctx.translate(x, finalY);
    ctx.scale(scale, scale);
    ctx.drawImage(cachedCanvas, -canvasSize / 2, -canvasSize / 2, canvasSize, canvasSize);

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
const tempEnemySoldiers: Soldier[] = [];

export function prepareSoldiersToDraw(army: Army): Soldier[] {
  const maxSoldiers = QualityManager.getInstance().settings.maxRenderedSoldiers;

  // Clear buffers without reallocating
  tempAliveNormalSoldiers.length = 0;
  tempSuperSoldiers.length = 0;
  tempSoldiersToDraw.length = 0;

  // Single pass to separate types with Viewport Culling
  // Add a margin to avoid popping
  const cullMargin = 50;

  let superCount = 0;
  let normalCount = 0;

  for (const s of army.soldiers) {
    if (s.isAlive) {
      // Culling
      if (s.y < -cullMargin || s.y > BASE_HEIGHT + cullMargin) continue;

      if (s.isSuper) {
          tempSuperSoldiers[superCount++] = s;
      } else {
          tempAliveNormalSoldiers[normalCount++] = s;
      }
    }
  }

  tempSuperSoldiers.length = superCount;
  tempAliveNormalSoldiers.length = normalCount;

  let drawCount = 0;

  if (superCount >= maxSoldiers) {
    // If we have enough supers, just fill with supers up to limit
    for (let i = 0; i < maxSoldiers; i++) {
      tempSoldiersToDraw[drawCount++] = tempSuperSoldiers[i];
    }
  } else {
    // Add all supers
    for (let i = 0; i < superCount; i++) {
      tempSoldiersToDraw[drawCount++] = tempSuperSoldiers[i];
    }

    const remainingSlots = maxSoldiers - drawCount;

    if (normalCount > remainingSlots) {
      // Sample normals
      const step = normalCount / remainingSlots;
      for (let i = 0; i < remainingSlots; i++) {
        tempSoldiersToDraw[drawCount++] = tempAliveNormalSoldiers[Math.floor(i * step)];
      }
    } else {
      // Add all normals
      for (let i = 0; i < normalCount; i++) {
        tempSoldiersToDraw[drawCount++] = tempAliveNormalSoldiers[i];
      }
    }
  }

  tempSoldiersToDraw.length = drawCount;

  // Sort in-place
  if (!QualityManager.getInstance().settings.simplifiedRendering) {
      tempSoldiersToDraw.sort((a, b) => a.y - b.y);
  }

  return tempSoldiersToDraw;
}

/* v8 ignore start */
function collectEnemySoldiers(horde: EnemyHorde): Soldier[] {
  tempEnemySoldiers.length = 0;

  for (const s of horde.soldiers) {
    if (s.isAlive) {
      tempEnemySoldiers.push(s);
    }
  }

  // Sampling if too many (Optimization: Sample BEFORE sorting)
  if (tempEnemySoldiers.length > MAX_RENDERED_SOLDIERS) {
     const originalLength = tempEnemySoldiers.length;
     const step = originalLength / MAX_RENDERED_SOLDIERS;
     // Reducing size in place
     let writeIdx = 0;
     for (let i = 0; i < MAX_RENDERED_SOLDIERS; i++) {
        const readIdx = Math.floor(i * step);
        if (readIdx !== writeIdx) {
            tempEnemySoldiers[writeIdx] = tempEnemySoldiers[readIdx];
        }
        writeIdx++;
     }
     tempEnemySoldiers.length = MAX_RENDERED_SOLDIERS;
  }

  if (!QualityManager.getInstance().settings.simplifiedRendering) {
      tempEnemySoldiers.sort((a, b) => a.y - b.y);
  }
  return tempEnemySoldiers;
}

export function getHordeAlpha(horde: EnemyHorde): number {
  const fadeStartY = 100;
  const fadeEndY = 200;
  return horde.y < fadeStartY ? 0 : horde.y < fadeEndY ? (horde.y - fadeStartY) / (fadeEndY - fadeStartY) : 1;
}
/* v8 ignore stop */

/* v8 ignore start */
function drawHordeBadges(ctx: CanvasRenderingContext2D, hordes: EnemyHorde[]): void {
  for (const horde of hordes) {
    if (!horde.isActive || horde.count <= 0) continue;
    if (getHordeAlpha(horde) <= 0.5) continue;
    drawGlassBadge(ctx, projectX(horde.x, horde.y) - 25, horde.y - 60, 50, 30, horde.count.toString(), '#E74C3C');
  }
}
/* v8 ignore stop */

/* v8 ignore start */
export function updateArmyTrail(army: Army): void {
  const dx = army.centerX - lastArmyX;
  if (Math.abs(dx) > 2) {
    // Optimization: Avoid filtering entire array just for trail check. Try random sampling.
    for (let i = 0; i < 5; i++) {
      const randIdx = Math.floor(Math.random() * army.soldiers.length);
      const s = army.soldiers[randIdx];
      if (s && s.isAlive && Math.random() < 0.3) {
        addTrail(s.x, s.y + 10, getActiveSkin().accent);
        break;
      }
    }
  }
  lastArmyX = army.centerX;
}

function drawArmy(ctx: CanvasRenderingContext2D, army: Army, time: number): void {
  if (!spriteCache.initialized) {
    preRenderSprites();
  }

  updateArmyTrail(army);

  const soldiersToDraw = prepareSoldiersToDraw(army);

  for (const soldier of soldiersToDraw) {
    const isFlash = (soldier.hitTimer || 0) > 0;

    if (soldier.isSuper) {
      // Use super sprite
      drawSoldier3D(ctx, soldier.x, soldier.y, soldier.size, '#FFD700', soldier.animOffset, time, soldier.type, true, isFlash);

      // Star overhead (simple text, could be sprite too)
      ctx.fillStyle = '#FFD700';
      ctx.font = `10px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.fillText('⭐', soldier.x, soldier.y - soldier.size - 5);
    } else {
      drawSoldier3D(ctx, soldier.x, soldier.y, soldier.size, soldier.color, soldier.animOffset, time, soldier.type, false, isFlash);
    }
  }
}

function drawEnemyHorde(ctx: CanvasRenderingContext2D, horde: EnemyHorde, time: number): void {
  if (!spriteCache.initialized) preRenderSprites();

  collectEnemySoldiers(horde);

  const fadeStartY = 100;
  const fadeEndY = 200;
  const hordeAlpha = horde.y < fadeStartY ? 0 :
                     horde.y < fadeEndY ? (horde.y - fadeStartY) / (fadeEndY - fadeStartY) : 1;

  if (hordeAlpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = hordeAlpha;

  for (const soldier of tempEnemySoldiers) {
    const isFlash = (soldier.hitTimer || 0) > 0;
    drawSoldier3D(ctx, projectX(soldier.x, soldier.y), soldier.y, soldier.size * perspScale(soldier.y, 0.7), soldier.color, soldier.animOffset, time, soldier.type, false, isFlash);
  }

  const count = horde.count;
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
  ctx.font = `bold ${Math.floor(30 * scale)}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 0, 0);
  ctx.restore();
}

function renderGateToCache(gate: Gate): void {
  const padding = GATE_PADDING;
  const logicalW = gate.width + padding * 2;
  const logicalH = gate.height + padding * 2;
  const canvasWidth = logicalW * GATE_SS;
  const canvasHeight = logicalH * GATE_SS;

  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  /* v8 ignore start */
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    ctx = canvas.getContext('2d');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    ctx = canvas.getContext('2d');
  }
  /* v8 ignore stop */

  if (!ctx) return;

  gate.cachedCanvas = canvas;
  ctx.scale(GATE_SS, GATE_SS);
  paintGate(ctx, padding, padding, gate.width, gate.height, gate, QualityManager.getInstance().settings.simplifiedRendering, QualityManager.getInstance().settings.enableShadows);
}

function drawGate(ctx: CanvasRenderingContext2D, gate: Gate): void {
  if (gate.passed) return;
  const scale = Math.max(0.5, 1 - (800 - gate.y) / 1500);

  if (!gate.cachedCanvas) {
    renderGateToCache(gate);
  }

  if (gate.cachedCanvas) {
    const padding = GATE_PADDING;
    const cachedWidth = gate.cachedCanvas.width / GATE_SS;
    const cachedHeight = gate.cachedCanvas.height / GATE_SS;
    const scaledWidth = cachedWidth * scale;
    const scaledHeight = cachedHeight * scale;

    const centerX = projectX(gate.x + gate.width / 2, gate.y, 0.6);
    const drawX = centerX - scaledWidth / 2;
    const drawY = gate.y - padding * scale;

    ctx.drawImage(gate.cachedCanvas, drawX, drawY, scaledWidth, scaledHeight);

    /* v8 ignore start */
    // animated light sweep across the energy field
    const sweep = ((Date.now() * 0.0006 + gate.id * 0.37) % 1.4) - 0.2;
    const fx = gate.x + gate.width * sweep;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(gate.x, gate.y, gate.width, gate.height * scale, 10 * scale); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const band = ctx.createLinearGradient(fx - 26, 0, fx + 26, 0);
    safeAddColorStop(band, 0, 'rgba(255,255,255,0)');
    safeAddColorStop(band, 0.5, 'rgba(255,255,255,0.28)');
    safeAddColorStop(band, 1, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(fx - 26, gate.y, 52, gate.height * scale);
    ctx.restore();
    /* v8 ignore stop */
  }
}

function drawMiniBoss(ctx: CanvasRenderingContext2D, miniBoss: MiniBoss, time: number): void {
  if (!miniBoss.isActive) return;
  const cx = miniBoss.x + miniBoss.width / 2;
  const cy = miniBoss.y + miniBoss.height / 2;

  // ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.beginPath();
  ctx.ellipse(cx, miniBoss.y + miniBoss.height + 10, miniBoss.width * 0.55, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  const sprite = getMiniBossSprite(miniBoss.type, (miniBoss.hitTimer ?? 0) > 0);
  if (sprite) {
    const t = time * 0.006 + miniBoss.id;
    const size = MINI_BOX * MINI_VISUAL_SCALE * (miniBoss.width / 80);
    const bob = Math.sin(t) * (miniBoss.type === 'speed' ? 4 : 2.5);
    const squash = 1 + Math.sin(t * 1.4) * 0.03;
    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.scale(squash, 2 - squash);
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  // Name + HP bar
  const barWidth = 96;
  const barHeight = 12;
  const barX = cx - barWidth / 2;
  const barY = miniBoss.y - 30;
  const pct = Math.max(0, Math.min(1, miniBoss.hp / miniBoss.maxHp));
  ctx.fillStyle = 'rgba(8,10,20,0.8)';
  ctx.beginPath(); ctx.roundRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, 6); ctx.fill();
  const g = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
  safeAddColorStop(g, 0, '#FF8A3D'); safeAddColorStop(g, 1, '#E8452C');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.roundRect(barX, barY, barWidth * pct, barHeight, 4); ctx.fill();
  ctx.fillStyle = '#FFF';
  ctx.font = `bold 9px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText(MINI_NAMES[miniBoss.type] ?? 'ELITE', cx, barY + 9);
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
    ctx.font = `bold 28px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';

    if (QualityManager.getInstance().settings.enableShadows) {
      ctx.shadowColor = '#FF0000';
      ctx.shadowBlur = 20;
    }

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
  // Reduced max intensity to 0.6 for better visibility
  gradient.addColorStop(1, `rgba(255, 0, 0, ${Math.min(0.6, intensity * 0.6)})`);

  ctx.fillStyle = gradient;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Ensures the active skin's bullet sprite exists and returns its cache key. */
export function getPlayerBulletKey(): string {
  if (!spriteCache.initialized) preRenderSprites();
  const tint = getActiveSkin().accent;
  const key = bulletKey(false, tint);
  if (!spriteCache.images.has(key)) renderBulletToCache(false, tint);
  return key;
}

export function drawBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[]): void {
  // Ensure initialization if not done (though usually done by army/horde draw)
  if (!spriteCache.initialized) preRenderSprites();

  const playerBulletKey = getPlayerBulletKey();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; // Neon glow effect

  for (const bullet of bullets) {
    // Viewport Culling
    if (bullet.y < -50 || bullet.y > BASE_HEIGHT + 50) continue;

    const key = bullet.isEnemy ? 'bullet_enemy' : playerBulletKey;
    const cachedCanvas = spriteCache.images.get(key);

    if (cachedCanvas) {
      const canvasSize = cachedCanvas.width;
      // Center alignment
      ctx.drawImage(cachedCanvas, bullet.x - canvasSize / 2, bullet.y - canvasSize / 2);
    } else {
      // Fallback
      /* v8 ignore start */
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
      /* v8 ignore stop */
    }
  }
  ctx.restore();
}

function drawUI(ctx: CanvasRenderingContext2D, gameState: GameState, armyCount: number, fireRate: number, damage: number, army: Army): void {
  const width = BASE_WIDTH;
  const height = BASE_HEIGHT;

  // Army power: weighted sum of unit types (same weights as before)
  let armyPower = 0;
  for (const s of army.soldiers) {
    if (!s.isAlive) continue;
    if (s.type === 'bazooka') armyPower += 5;
    else if (s.type === 'rambo') armyPower += 3;
    else if (s.type === 'laser') armyPower += 4;
    else if (s.isSuper) armyPower += 2;
    else armyPower += 1;
  }

  const stats = {
    count: armyCount,
    power: Math.floor(armyPower * damage),
    shotsPerSec: fireRate > 0 ? 1000 / fireRate : 0,
  };
  const rank = drawHud(ctx, gameState, stats, Date.now());

  // Rank-up celebration
  if (rank.rank !== gameState.currentRank) {
    if (gameState.currentRank !== 'D' || gameState.score > 0) {
      addFloatingText(`RANK ${rank.rank}!`, width / 2, height / 2 - 100, rank.color, 2.0, 'critical');
    }
    gameState.currentRank = rank.rank;
  }
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D): void {
  for (const ft of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = ft.alpha;
    ctx.fillStyle = ft.color;

    if (ft.style === 'critical') {
        ctx.font = `900 ${Math.floor(40 * ft.scale)}px ${FONT_FAMILY}`;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x, ft.y);

        if (QualityManager.getInstance().settings.enableShadows) {
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 10;
        }
    } else {
        ctx.font = `bold ${Math.floor(32 * ft.scale)}px ${FONT_FAMILY}`;

        if (QualityManager.getInstance().settings.enableShadows) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 5;
        }
    }

    ctx.textAlign = 'center';
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

  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; // Intense beam
  const gradient = ctx.createLinearGradient(beamX, 0, beamX + beamWidth, 0);
  gradient.addColorStop(0, `rgba(255, 200, 50, ${0.3 * pulse})`);
  gradient.addColorStop(0.5, `rgba(255, 255, 255, ${1 * pulse})`);
  gradient.addColorStop(1, `rgba(255, 200, 50, ${0.3 * pulse})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(beamX, 0, beamWidth, centerY);
  ctx.restore();

  // Time bar
  const progress = gameState.superCannonTimer / gameState.superCannonDuration;
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(centerX - 30, centerY + 30, 60 * progress, 6);
}

function drawSpeedLines(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number, time: number): void {
  if (QualityManager.getInstance().settings.simplifiedRendering) return;

  const centerX = width / 2;
  const centerY = height / 2;
  const numLines = Math.floor(10 + intensity * 20);

  ctx.save();
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + intensity * 0.2})`;
  ctx.lineWidth = 2;

  for (let i = 0; i < numLines; i++) {
    const angle = (i / numLines) * Math.PI * 2 + time * 0.005;
    const length = 50 + Math.random() * 100 * intensity;
    const offset = 200 + Math.random() * 50; // Start away from center

    const x1 = centerX + Math.cos(angle) * offset;
    const y1 = centerY + Math.sin(angle) * offset;
    const x2 = centerX + Math.cos(angle) * (offset + length);
    const y2 = centerY + Math.sin(angle) * (offset + length);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawNukeEffect(ctx: CanvasRenderingContext2D, width: number, height: number, timer: number): void {
  if (QualityManager.getInstance().settings.simplifiedRendering) return;

  // Timer starts at ~60.
  // Phase 1: Whiteout (Timer 60-50)
  // Phase 2: Fade + Shockwave (Timer 50-0)

  // const maxTimer = 60; // Unused
  // const progress = 1 - (timer / maxTimer); // Unused

  ctx.save();

  // Whiteout Flash
  if (timer > 45) {
      const whiteAlpha = (timer - 45) / 15;
      ctx.fillStyle = `rgba(255, 255, 255, ${whiteAlpha})`;
      ctx.fillRect(0, 0, width, height);
  }

  // Shockwave Ring
  if (timer < 55) {
      const ringProgress = (55 - timer) / 55; // 0 to 1
      const maxRadius = Math.max(width, height) * 0.8;
      const radius = ringProgress * maxRadius;

      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 215, 0, ${1 - ringProgress})`; // Gold fade
      ctx.lineWidth = 20 * (1 - ringProgress);
      ctx.stroke();

      // Secondary Ring
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius * 0.8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 69, 0, ${(1 - ringProgress) * 0.5})`; // Orange fade
      ctx.lineWidth = 10 * (1 - ringProgress);
      ctx.stroke();
  }

  ctx.restore();
}

export function drawPauseScreen(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#FFD700';
  ctx.font = `bold 36px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText('⏸️ PAUSADO', width / 2, height / 2);
}

function drawWhiteFlash(ctx: CanvasRenderingContext2D, width: number, height: number, opacity: number): void {
  if (opacity <= 0.01) return;
  ctx.save();
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  // Use pure fillRect for speed, no composition changes
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawWarpEffect(ctx: CanvasRenderingContext2D, width: number, height: number, timer: number): void {
    if (timer <= 0) return;

    // Timer goes from e.g. 60 down to 0
    // Peak intensity around middle (30)
    const progress = timer / 60; // normalized 1 to 0

    // Speed lines
    const centerX = width / 2;
    const centerY = height / 2;
    const numLines = 40;

    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.sin(progress * Math.PI)); // Fade in/out
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 3;

    for (let i = 0; i < numLines; i++) {
        const angle = (i / numLines) * Math.PI * 2;
        const radiusStart = 50 + Math.random() * 50;
        const length = 200 + Math.random() * 400 * (1 - Math.abs(progress - 0.5)*2); // Longer in middle

        const x1 = centerX + Math.cos(angle) * radiusStart;
        const y1 = centerY + Math.sin(angle) * radiusStart;
        const x2 = centerX + Math.cos(angle) * (radiusStart + length);
        const y2 = centerY + Math.sin(angle) * (radiusStart + length);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    // Central Glow
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, width);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.3, 'rgba(0, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
}

function drawComboTier(ctx: CanvasRenderingContext2D, width: number, height: number, tier: number, combo: number): void {
    if (tier <= 0) return;

    let text = '';
    let color = '';
    const subText = `${combo} HIT COMBO`;

    switch(tier) {
        case 1: text = 'DOUBLE KILL'; color = '#3498DB'; break; // Blue
        case 2: text = 'MULTI KILL'; color = '#2ECC71'; break; // Green
        case 3: text = 'ULTRA KILL'; color = '#F39C12'; break; // Orange
        case 4: text = 'MONSTER KILL'; color = '#E74C3C'; break; // Red
        case 5: text = 'GODLIKE'; color = '#FFD700'; break; // Gold
    }

    const centerX = width / 2;
    const centerY = height * 0.31; // below the HUD blocks

    ctx.save();

    // Enhanced Pulse effect for more Juice
    const pulseTime = Date.now() * 0.015;
    const scaleBase = 1 + (tier * 0.05);
    const pulse = scaleBase + Math.sin(pulseTime) * 0.15;
    const shake = tier >= 4 ? (Math.random() - 0.5) * 5 : 0;

    ctx.translate(centerX + shake, centerY + shake);
    ctx.scale(pulse, pulse);

    // Glow
    if (QualityManager.getInstance().settings.enableShadows) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 25 + Math.sin(pulseTime) * 10;
    }

    // Main Text
    ctx.font = `900 42px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.strokeText(text, 0, 0);
    ctx.fillText(text, 0, 0);

    // Sub Text
    ctx.shadowBlur = 0;
    ctx.font = `bold 16px ${FONT_FAMILY}`;
    ctx.fillStyle = '#FFF';
    ctx.fillText(subText, 0, 30);

    ctx.restore();
}

function drawComboBar(ctx: CanvasRenderingContext2D, gameState: GameState): void {
  if (gameState.combo <= 1) return;

  const width = BASE_WIDTH;
  const barWidth = 220;
  const barHeight = 12;
  const x = (width - barWidth) / 2;
  const y = 204; // combo timer bar, between the HUD (perk row) and the tier text

  const maxTimer = 4000;
  const progress = Math.max(0, Math.min(1, gameState.comboTimer / maxTimer));
  const color = getComboColor(gameState.combo);

  ctx.save();

  // Glow background
  if (QualityManager.getInstance().settings.enableShadows) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.roundRect(x, y, barWidth, barHeight, 6);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Progress Fill
  if (progress > 0) {
      // Gradient fill
      const grad = ctx.createLinearGradient(x, y, x + barWidth, y);
      grad.addColorStop(0, shadeColor(color, -20));
      grad.addColorStop(0.5, shadeColor(color, 40)); // Shine center
      grad.addColorStop(1, color);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, (barWidth - 4) * progress, barHeight - 4, 4);
      ctx.fill();

      // Shine line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, (barWidth - 4) * progress, (barHeight - 4) / 2, 4);
      ctx.fill();
  }

  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, barWidth, barHeight, 6);
  ctx.stroke();

  // Multiplier Text (Right Side)
  const multiplier = (1 + gameState.combo * 0.05).toFixed(2);
  if (gameState.combo > 1) {
      ctx.fillStyle = '#FFD700';
      ctx.font = `bold 12px ${FONT_FAMILY}`;
      ctx.textAlign = 'right';
      ctx.fillText(`x${multiplier} SCORE`, x + barWidth, y - 5);
  }

  ctx.restore();
}

function drawRecordLine(ctx: CanvasRenderingContext2D, gameState: GameState, playerY: number): void {
  if (gameState.highScoreDistance <= 0) return;

  const distToRecord = gameState.highScoreDistance - gameState.distanceTraveled;

  // Cull if too far (visible range approx -100 to 900)
  if (distToRecord > 900 || distToRecord < -200) return;

  const y = playerY - distToRecord;

  ctx.save();
  // Line
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 3;
  ctx.setLineDash([15, 10]);

  if (QualityManager.getInstance().settings.enableShadows) {
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
  }

  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(BASE_WIDTH, y);
  ctx.stroke();

  // Label
  ctx.fillStyle = '#FFD700';
  ctx.font = `bold 14px ${FONT_FAMILY}`;
  ctx.textAlign = 'left'; // left of the shop rail; right edge is covered by the shop
  ctx.shadowBlur = 0;
  ctx.fillText(`👑 RECORD: ${Math.floor(gameState.highScore)}`, 100, y - 8);
  ctx.restore();
}

function drawKillstreakOverlay(ctx: CanvasRenderingContext2D, width: number, height: number, killStreak: number): void {
  if (killStreak < 5) return;

  const centerX = width / 2;
  const centerY = height * 0.4; // Slightly above center

  let text = '';
  let color = '';
  let scale = 1.0;

  if (killStreak >= 100) { text = 'GODLIKE'; color = '#FFD700'; scale = 2.0; }
  else if (killStreak >= 50) { text = 'UNSTOPPABLE'; color = '#E74C3C'; scale = 1.8; }
  else if (killStreak >= 20) { text = 'DOMINATING'; color = '#9B59B6'; scale = 1.5; }
  else if (killStreak >= 10) { text = 'RAMPAGE'; color = '#3498DB'; scale = 1.2; }
  else if (killStreak >= 5) { text = 'KILLING SPREE'; color = '#2ECC71'; scale = 1.0; }

  if (!text) return;

  const pulse = 1 + Math.sin(Date.now() * 0.02) * 0.1;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale * pulse, scale * pulse);

  if (QualityManager.getInstance().settings.enableShadows) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
  }

  ctx.font = `900 36px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';

  // Stroke
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  ctx.strokeText(text, 0, 0);

  // Fill
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);

  // Subtext
  ctx.shadowBlur = 0;
  ctx.font = `bold 14px ${FONT_FAMILY}`;
  ctx.fillStyle = '#FFF';
  ctx.strokeText(`${killStreak} KILLS`, 0, 25);
  ctx.fillText(`${killStreak} KILLS`, 0, 25);

  ctx.restore();
}

/* v8 ignore start */
// --- Pixi (WebGL) layer hooks -------------------------------------------
export interface WorldLayer {
  draw(entities: Entities, time: number, shakeX: number, shakeY: number): void;
}
let worldLayer: WorldLayer | null = null;
let hudCtx: CanvasRenderingContext2D | null = null;

/** Activates the WebGL layer: entities go to Pixi, overlays/HUD to hudContext. */
export function setWorldLayer(layer: WorldLayer | null, hud: CanvasRenderingContext2D | null = null): void {
  worldLayer = layer;
  hudCtx = layer ? hud : null;
}

export function getSpriteCanvas(key: string): HTMLCanvasElement | OffscreenCanvas | undefined {
  if (!spriteCache.initialized) preRenderSprites();
  return spriteCache.images.get(key);
}

export function getSoldierSprite(s: Soldier, color: string, isSuper: boolean) {
  const isFlash = (s.hitTimer || 0) > 0;
  const key = getSpriteKey(s.type, color, s.size, isSuper, isFlash);
  let c = spriteCache.images.get(key);
  if (!c) {
    renderSoldierToCache(s.type, color, s.size, isSuper, isFlash);
    c = spriteCache.images.get(key);
  }
  return { key, canvas: c };
}

export function getParticles(): Particle[] { return particles; }
export { collectEnemySoldiers };
/* v8 ignore stop */

// --- Biome weather (foreground ambience) ---
let weather: WeatherState | null = null;
let weatherLevel = -1;
let weatherLast = 0;

/* v8 ignore start */
function renderWeather(ctx: CanvasRenderingContext2D, level: number, time: number): void {
  if (weatherLevel !== level) {
    const q = QualityManager.getInstance().settings;
    weather = createWeather(getBiomeColors(level).name, q.simplifiedRendering ? 0.4 : 1);
    weatherLevel = level;
    weatherLast = time;
  }
  if (!weather) return;
  stepWeather(weather, (time - weatherLast) / 1000);
  weatherLast = time;
  drawWeather(ctx, weather, time);
}
/* v8 ignore stop */

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
  const layered = worldLayer !== null && hudCtx !== null;
  let shakeX = 0, shakeY = 0;
  const shaking = gameState.screenShakeActive || gameState.bossActive;
  if (shaking) {
    shakeX = (Math.random() - 0.5) * gameState.screenShakeIntensity + bossShake;
    shakeY = (Math.random() - 0.5) * gameState.screenShakeIntensity + bossShake * 0.5;
    ctx.save();
    ctx.translate(shakeX, shakeY);
  }

  drawRoad(ctx, gameState);
  drawRecordLine(ctx, gameState, entities.playerArmy.centerY);

  const sortedGates = [...entities.gates].sort((a, b) => a.y - b.y);
  for (const gate of sortedGates) drawGate(ctx, gate);

  if (!layered) {
    for (const horde of entities.enemyHordes) {
      if (horde.isActive) drawEnemyHorde(ctx, horde, time);
    }
  }

  for (const box of entities.mysteryBoxes) drawMysteryBox(ctx, box, time);

  for (const miniBoss of entities.miniBosses) {
    if (miniBoss.isActive) drawMiniBoss(ctx, miniBoss, time);
  }

  if (entities.boss && entities.boss.isActive) {
    drawBoss(ctx, entities.boss, time);
    drawBossTelegraph(ctx, entities.boss, entities.playerArmy.centerX, entities.playerArmy.centerY, time);
  }

  let out = ctx;
  if (layered) {
    updateParticles();
    updateArmyTrail(entities.playerArmy);
    if (shaking) ctx.restore();
    worldLayer!.draw(entities, time, shakeX, shakeY);
    out = hudCtx!;
    out.save();
    out.setTransform(1, 0, 0, 1, 0, 0);
    out.clearRect(0, 0, out.canvas.width, out.canvas.height);
    out.restore();
    if (shaking) { out.save(); out.translate(shakeX, shakeY); }
    drawHordeBadges(out, entities.enemyHordes);
    drawParticles(out, true);
    drawSuperCannonBeam(out, entities.playerArmy.centerX, entities.playerArmy.centerY, gameState);
    if (shaking) out.restore();
  } else {
    drawBullets(ctx, entities.bullets);
    updateParticles();
    drawParticles(ctx);
    if (entities.playerArmy.trail) {
      drawTrail(ctx, entities.playerArmy.trail);
    }
    drawArmy(ctx, entities.playerArmy, time);
    drawSuperCannonBeam(ctx, entities.playerArmy.centerX, entities.playerArmy.centerY, gameState);
    if (shaking) ctx.restore();
  }
  // All overlays below draw on `out` (HUD canvas in layered mode)
  ctx = out;
  renderWeather(ctx, gameState.currentLevel, time);

  if (gameState.bossAtmosphereIntensity > 0) {
    drawBossAtmosphere(ctx, width, height, gameState.bossAtmosphereIntensity, time);
  }

  // Visual Effects (Juice)
  if (gameState.combo > 10) {
      drawSpeedLines(ctx, width, height, Math.min(1, (gameState.combo - 10) / 50), time);
  }

  if (gameState.nukeTimer > 0) {
      drawNukeEffect(ctx, width, height, gameState.nukeTimer);
  }

  if (gameState.damageFlash > 0) {
    drawDamageOverlay(ctx, width, height, gameState.damageFlash);
  }

  if (gameState.whiteFlash > 0) {
    drawWhiteFlash(ctx, width, height, gameState.whiteFlash);
  }

  if (gameState.warpEffectTimer > 0) {
      drawWarpEffect(ctx, width, height, gameState.warpEffectTimer);
  }

  drawFeverMode(ctx, width, height, gameState.combo);
  if (gameState.combo > 50) {
      drawScreenPulse(ctx, width, height);
  }

  // Confetti on New Record
  if (gameState.newRecordReached && !gameState.isGameOver) {
      // Spawn confetti burst occasionally
      if (Math.random() < 0.3) {
           addParticle(width/2 + (Math.random()-0.5)*width, height * 0.2, 'confetti', '#FFF', 2);
      }
  }

  drawVignette(ctx, width, height);
  drawScanlines(ctx, width, height);

  drawUI(ctx, gameState, entities.playerArmy.aliveCount, entities.playerArmy.fireRate, entities.playerArmy.damage, entities.playerArmy);

  if (gameState.comboTier > 0 && gameState.combo > 0) {
      drawComboTier(ctx, width, height, gameState.comboTier, gameState.combo);
  }

  drawKillstreakOverlay(ctx, width, height, gameState.killStreak);
  drawComboBar(ctx, gameState);
  drawJoystick(ctx);
  // updateFloatingTexts() moved to game loop to respect pause
  drawFloatingTexts(ctx);
}
