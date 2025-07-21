// @ts-check
// entities/obstacle.ts - Função de criação para obstáculos

import { Obstacle } from '../types';

export function createObstacle(x: number, y: number, width: number, height: number): Obstacle {
  return {
    type: 'obstacle',
    x,
    y,
    width,
    height,
  };
}
