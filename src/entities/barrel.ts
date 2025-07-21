// @ts-check
// entities/barrel.ts - Função de criação para barris
import { canvas } from '../game';
import { Barrel } from '../types';

export function createBarrel(type: 'reinforcement' | 'health' | 'buff_shield' | 'buff_damage' | 'buff_firerate' | 'nerf_damage' | 'nerf_firerate' | 'nerf_health', side: 'left' | 'right' | undefined = undefined): Barrel {
  const BarrelAttributes = {
    reinforcement: { speed: 1.0, hp: 5 },
    health: { speed: 1.5, hp: 1 },
    buff_shield: { speed: 1.0, hp: 5 },
    buff_damage: { speed: 1.0, hp: 5 },
    buff_firerate: { speed: 1.0, hp: 5 },
    nerf_damage: { speed: 0.8, hp: 10 },
    nerf_firerate: { speed: 0.8, hp: 10 },
    nerf_health: { speed: 0.8, hp: 10 },
  };
  const attributes = BarrelAttributes[type];
  if (!attributes) throw new Error(`Tipo de barril inválido: ${type}`);

  return {
    x: side === 'right'
      ? (canvas as HTMLCanvasElement)?.width / 2 + Math.random() * ((canvas as HTMLCanvasElement)?.width / 2 - 30 || 0)
      : Math.random() * ((canvas as HTMLCanvasElement)?.width / 2 - 30 || 0),
    y: -Math.random() * 100 - 50,
    barrelType: type,
    width: 30,
    height: 30,
    type: 'barrel',
    speed: attributes.speed,
    hp: attributes.hp
  };
}
