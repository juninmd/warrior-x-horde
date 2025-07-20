import { Entities, GameState } from './types';
import { drawGameOver } from './ui/gameOverUI';
import { drawMainUI } from './ui/mainUI';

export function drawUI(ctx: CanvasRenderingContext2D, entities: Entities, gameState: GameState): void {
  if (gameState.isGameOver) {
    drawGameOver(ctx, gameState);
    return;
  }

  drawMainUI(ctx, entities, gameState);
}