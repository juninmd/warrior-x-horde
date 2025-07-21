// @ts-check
// drawing/obstacleDrawing.ts - Função de desenho para obstáculos
import { Obstacle } from '../types';

export function drawObstacles(ctx: CanvasRenderingContext2D, obstacles: Obstacle[]): void {
  obstacles.forEach(obstacle => {
    ctx.fillStyle = '#8B4513'; // SaddleBrown color for obstacles
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  });
}
