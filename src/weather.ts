// weather.ts - Per-biome ambient particles + color grading drawn in front of the action.
import { BASE_WIDTH, BASE_HEIGHT } from './constants';

export type WeatherKind = 'pollen' | 'sandstorm' | 'snow' | 'spores' | 'sprinkles' | 'bubbles' | 'embers' | 'datastream' | 'stardust' | 'wisps';

export interface WeatherDef {
  kind: WeatherKind;
  count: number;
  colors: string[];
  /** Full-screen color grade (rgba) drawn over the scene. */
  grade: string;
}

/** Keyed by ThemeConfig.name. */
export const BIOME_WEATHER: Record<string, WeatherDef> = {
  Grasslands: { kind: 'pollen', count: 34, colors: ['#FFF6B0', '#FFFFFF', '#C8F7A0'], grade: 'rgba(255, 240, 160, 0.04)' },
  Desert: { kind: 'sandstorm', count: 46, colors: ['#F4D58D', '#E8B96A', '#FFF1C9'], grade: 'rgba(255, 170, 60, 0.08)' },
  Snow: { kind: 'snow', count: 70, colors: ['#FFFFFF', '#E4F4FF', '#CBE9FF'], grade: 'rgba(150, 200, 255, 0.07)' },
  Toxic: { kind: 'spores', count: 40, colors: ['#9BFF3C', '#C6FF7A', '#6BD400'], grade: 'rgba(110, 255, 60, 0.07)' },
  Candy: { kind: 'sprinkles', count: 44, colors: ['#FF5FA2', '#FFD93D', '#6BCBFF', '#B28DFF'], grade: 'rgba(255, 150, 220, 0.05)' },
  Ocean: { kind: 'bubbles', count: 36, colors: ['#BDEBFF', '#FFFFFF', '#8EDCFF'], grade: 'rgba(40, 140, 255, 0.08)' },
  Hell: { kind: 'embers', count: 60, colors: ['#FF7A1A', '#FFB347', '#FF3D00'], grade: 'rgba(255, 60, 20, 0.09)' },
  Cyber: { kind: 'datastream', count: 30, colors: ['#00F0FF', '#FF2BD6', '#7DFF9B'], grade: 'rgba(0, 220, 255, 0.05)' },
  Space: { kind: 'stardust', count: 56, colors: ['#FFFFFF', '#BFD4FF', '#FFE9A8'], grade: 'rgba(120, 90, 255, 0.06)' },
  Alien: { kind: 'wisps', count: 32, colors: ['#D58BFF', '#FF7BE5', '#8BFFEA'], grade: 'rgba(190, 60, 255, 0.07)' },
};

export interface WeatherParticle {
  x: number; y: number; vx: number; vy: number;
  size: number; phase: number; color: string; alpha: number;
}

export interface WeatherState {
  def: WeatherDef;
  particles: WeatherParticle[];
}

function spawn(def: WeatherDef, rng: () => number, anywhere: boolean): WeatherParticle {
  const color = def.colors[Math.floor(rng() * def.colors.length) % def.colors.length];
  const p: WeatherParticle = { x: rng() * BASE_WIDTH, y: anywhere ? rng() * BASE_HEIGHT : -10, vx: 0, vy: 0, size: 2, phase: rng() * Math.PI * 2, color, alpha: 0.5 + rng() * 0.4 };
  switch (def.kind) {
    case 'pollen': p.vy = 8 + rng() * 10; p.vx = 6 + rng() * 10; p.size = 1.5 + rng() * 1.5; p.alpha *= 0.8; break;
    case 'sandstorm': p.x = anywhere ? p.x : -10; p.y = rng() * BASE_HEIGHT; p.vx = 260 + rng() * 220; p.vy = 18 + rng() * 20; p.size = 1 + rng() * 1.5; p.alpha *= 0.7; break;
    case 'snow': p.vy = 40 + rng() * 60; p.vx = -10 + rng() * 20; p.size = 1.5 + rng() * 2.5; break;
    case 'spores': p.y = anywhere ? p.y : BASE_HEIGHT + 10; p.vy = -(14 + rng() * 22); p.vx = -6 + rng() * 12; p.size = 2 + rng() * 3; p.alpha *= 0.7; break;
    case 'sprinkles': p.vy = 55 + rng() * 55; p.vx = -12 + rng() * 24; p.size = 2 + rng() * 2; break;
    case 'bubbles': p.y = anywhere ? p.y : BASE_HEIGHT + 10; p.vy = -(25 + rng() * 40); p.vx = -4 + rng() * 8; p.size = 2 + rng() * 5; p.alpha *= 0.6; break;
    case 'embers': p.y = anywhere ? p.y : BASE_HEIGHT + 10; p.vy = -(40 + rng() * 80); p.vx = -14 + rng() * 28; p.size = 1.5 + rng() * 2.5; break;
    case 'datastream': p.vy = 150 + rng() * 200; p.size = 8 + rng() * 14; p.alpha *= 0.55; break; // streak length
    case 'stardust': p.vy = 90 + rng() * 260; p.size = 1 + rng() * 1.6; p.alpha *= 0.8; break; // warp-speed stars
    case 'wisps': p.y = anywhere ? p.y : BASE_HEIGHT + 10; p.vy = -(10 + rng() * 22); p.vx = -8 + rng() * 16; p.size = 3 + rng() * 5; p.alpha *= 0.35; break;
  }
  return p;
}

/** `scale` (0..1) lets low-quality devices render fewer particles. */
export function createWeather(biomeName: string, scale = 1, rng: () => number = Math.random): WeatherState | null {
  const def = BIOME_WEATHER[biomeName];
  if (!def) return null;
  const n = Math.max(4, Math.round(def.count * scale));
  const particles: WeatherParticle[] = [];
  for (let i = 0; i < n; i++) particles.push(spawn(def, rng, true));
  return { def, particles };
}

export function stepWeather(state: WeatherState, dtSec: number, rng: () => number = Math.random): void {
  const dt = Math.min(0.05, Math.max(0, dtSec));
  const { def, particles } = state;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.phase += dt * 2;
    p.x += (p.vx + Math.sin(p.phase) * (def.kind === 'snow' || def.kind === 'wisps' || def.kind === 'bubbles' ? 12 : 0)) * dt;
    p.y += p.vy * dt;
    const out = p.y > BASE_HEIGHT + 20 || p.y < -30 || p.x > BASE_WIDTH + 30 || p.x < -30;
    if (out) particles[i] = spawn(def, rng, false);
  }
}

export function drawWeather(ctx: CanvasRenderingContext2D, state: WeatherState, time: number): void {
  const { def, particles } = state;
  ctx.save();
  ctx.fillStyle = def.grade;
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  if (def.kind === 'sandstorm') {
    ctx.fillStyle = `rgba(230, 180, 110, ${0.05 + 0.03 * Math.sin(time * 0.0012)})`;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
  }

  const additive = def.kind === 'embers' || def.kind === 'stardust' || def.kind === 'datastream' || def.kind === 'wisps' || def.kind === 'spores';
  if (additive) ctx.globalCompositeOperation = 'lighter';

  for (const p of particles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    switch (def.kind) {
      case 'sandstorm':
        ctx.lineWidth = p.size;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 14, p.y - 1.5); ctx.stroke();
        break;
      case 'datastream':
      case 'stardust':
        ctx.lineWidth = def.kind === 'stardust' ? p.size : 1.5;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - (def.kind === 'stardust' ? p.vy * 0.06 : p.size)); ctx.stroke();
        break;
      case 'bubbles':
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke();
        break;
      case 'sprinkles':
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.phase);
        ctx.fillRect(-p.size, -p.size * 0.35, p.size * 2, p.size * 0.7);
        ctx.restore();
        break;
      default:
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}
