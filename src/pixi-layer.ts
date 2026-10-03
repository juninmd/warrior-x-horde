// pixi-layer.ts - WebGL (PixiJS) layer for the high-volume entities:
// soldiers, enemy hordes, bullets, particles and the army trail.
// Static world / HUD stay on Canvas2D (see renderer.render). If WebGL is not
// available, initPixiLayer resolves to null and the game keeps the 2D path.
import 'pixi.js/unsafe-eval'; // game CSP forbids eval; use the precompiled shader path
import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Entities, Particle } from './types';
import { BASE_WIDTH, BASE_HEIGHT } from './constants';
import { QualityManager } from './quality';
import { SPRITE_SS } from './soldier-art';
import {
  WorldLayer, getSpriteCanvas, getSoldierSprite, getParticles,
  collectEnemySoldiers, getHordeAlpha, updateArmyTrail, prepareSoldiersToDraw, getPlayerBulletKey,
} from './renderer';

type Source = HTMLCanvasElement | OffscreenCanvas;

/** Grows on demand and hides unused sprites, so no allocation happens per frame. */
class SpritePool {
  private items: Sprite[] = [];
  private used = 0;
  constructor(private parent: Container, private additive = false) {}

  begin(): void { this.used = 0; }

  next(): Sprite {
    let s = this.items[this.used];
    if (!s) {
      s = new Sprite();
      s.anchor.set(0.5);
      if (this.additive) s.blendMode = 'add';
      this.parent.addChild(s);
      this.items.push(s);
    }
    this.used++;
    s.visible = true;
    return s;
  }

  get count(): number { return this.used; }

  end(): void {
    for (let i = this.used; i < this.items.length; i++) this.items[i].visible = false;
  }
}

export class PixiLayer implements WorldLayer {
  private textures = new Map<string, Texture>();
  private root = new Container();
  private enemies: SpritePool;
  private bullets: SpritePool;
  private particles: SpritePool;
  private army: SpritePool;
  private trail = new Graphics();

  constructor(readonly app: Application) {
    app.stage.addChild(this.root);
    this.enemies = new SpritePool(this.root);
    this.bullets = new SpritePool(this.root, true);
    this.root.addChild(this.trail);
    this.particles = new SpritePool(this.root, true);
    this.army = new SpritePool(this.root);
  }

  private tex(key: string, src: Source | undefined): Texture | null {
    if (!src) return null;
    let t = this.textures.get(key);
    if (!t) {
      t = Texture.from(src as HTMLCanvasElement);
      this.textures.set(key, t);
    }
    return t;
  }

  private place(pool: SpritePool, key: string, src: Source | undefined, x: number, y: number, scale = 1, alpha = 1): void {
    const t = this.tex(key, src);
    if (!t) return;
    const s = pool.next();
    s.texture = t;
    s.position.set(x, y);
    s.scale.set(scale);
    s.alpha = alpha;
  }

  draw(entities: Entities, time: number, shakeX: number, shakeY: number): void {
    this.root.position.set(shakeX, shakeY);
    const q = QualityManager.getInstance().settings;

    // Enemy hordes (fade-in near the top, like the 2D path)
    this.enemies.begin();
    for (const horde of entities.enemyHordes) {
      if (!horde.isActive) continue;
      const alpha = getHordeAlpha(horde);
      if (alpha <= 0) continue;
      for (const s of collectEnemySoldiers(horde)) {
        const sp = getSoldierSprite(s, s.color, false);
        this.drawSoldier(this.enemies, sp.key, sp.canvas, s.x, s.y, s.animOffset, time, alpha);
      }
    }
    this.enemies.end();

    // Bullets
    const playerBullet = getPlayerBulletKey();
    this.bullets.begin();
    for (const b of entities.bullets) {
      if (b.y < -50 || b.y > BASE_HEIGHT + 50) continue;
      const key = b.isEnemy ? 'bullet_enemy' : playerBullet;
      this.place(this.bullets, key, getSpriteCanvas(key), b.x, b.y);
    }
    this.bullets.end();

    // Trail
    this.trail.clear();
    const trail = entities.playerArmy.trail;
    if (trail && trail.points.length >= 2 && q.enableTrails) {
      this.trail.moveTo(trail.points[0].x, trail.points[0].y);
      for (let i = 1; i < trail.points.length; i++) this.trail.lineTo(trail.points[i].x, trail.points[i].y);
      this.trail.stroke({ width: trail.width * 0.5, color: trail.color, alpha: 0.4, cap: 'round', join: 'round' });
    }

    // Particles that have a cached sprite (special shapes stay on the HUD canvas)
    this.particles.begin();
    for (const p of getParticles()) this.drawParticle(p);
    this.particles.end();

    // Player army
    updateArmyTrail(entities.playerArmy);
    this.army.begin();
    for (const s of prepareSoldiersToDraw(entities.playerArmy)) {
      const sp = getSoldierSprite(s, s.isSuper ? '#FFD700' : s.color, !!s.isSuper);
      this.drawSoldier(this.army, sp.key, sp.canvas, s.x, s.y, s.animOffset, time, 1);
    }
    this.army.end();
    this.app.renderer.render(this.app.stage);
  }

  private drawSoldier(pool: SpritePool, key: string, src: Source | undefined, x: number, y: number, anim: number, time: number, alpha: number): void {
    const bounce = Math.sin(time * 0.008 + anim) * 3;
    const scale = Math.max(0.5, 1 - (800 - y) / 1500);
    this.place(pool, key, src, x, y + bounce, scale / SPRITE_SS, alpha); // soldier sprites are supersampled
  }

  private drawParticle(p: Particle): void {
    if (p.y < -50 || p.y > BASE_HEIGHT + 50) return;
    const key = `particle_${p.type}_${p.color}`;
    const src = getSpriteCanvas(key);
    if (!src) return;
    this.place(this.particles, key, src, p.x, p.y, p.size / 10, p.life);
  }

  /** Number of sprites drawn in the last frame (used by e2e checks). */
  visibleSprites(): number {
    return this.enemies.count + this.bullets.count + this.particles.count + this.army.count;
  }

  resize(width: number, height: number, resolution: number): void {
    this.app.renderer.resolution = resolution;
    this.app.renderer.resize(width, height);
  }

  destroy(): void {
    this.app.destroy(true, { children: true });
  }
}

/**
 * Creates the Pixi canvas inside `host` (stacked over the 2D canvas).
 * Resolves to null when WebGL is unavailable so the caller can fall back.
 */
export async function initPixiLayer(host: HTMLElement): Promise<PixiLayer | null> {
  try {
    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) return null;

    const app = new Application();
    await app.init({
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      backgroundAlpha: 0,
      antialias: false,
      autoStart: false,
      preference: 'webgl',
      autoDensity: false,
      resolution: 1,
    });
    app.ticker.stop();
    const c = app.canvas as HTMLCanvasElement;
    c.id = 'pixiCanvas';
    c.setAttribute('aria-hidden', 'true');
    host.appendChild(c);
    return new PixiLayer(app);
  } catch {
    return null;
  }
}
