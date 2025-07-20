// @ts-check
// entities/barrel.ts - Função de criação para barris
import { canvas } from '../game';
import { Barrel } from '../types';

export function createBarrel(type: 'buff' | 'nerf' | 'reinforcement' | 'health' | 'shield'): Barrel {
  const BarrelAttributes = {
    buff: { speed: 1.0, hp: 5 },
    nerf: { speed: 0.8, hp: 10 },
    reinforcement: { speed: 1.0, hp: 5 },
    health: { speed: 1.5, hp: 1 },
    shield: { speed: 1.2, hp: 1 }
  };
  const attributes = BarrelAttributes[type];
  if (!attributes) throw new Error(`Tipo de barril inválido: ${type}`);

  return {
    x: Math.random() * ((canvas as HTMLCanvasElement)?.width - 30 || 0),
    y: -Math.random() * 100 - 50,
    barrelType: type,
    width: 30,
    height: 30,
    type: 'barrel',
    speed: attributes.speed,
    hp: attributes.hp
  };
}
