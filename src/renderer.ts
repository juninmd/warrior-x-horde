import { playAmbientSounds } from './audioManager.js';
import { gameState } from './gameState.js';
import { Entities } from './types';
import { drawAllies, drawEnemies, drawBoss, drawBarrels, drawBullets } from './drawing';
import { drawBackground } from './renderer/background';
import { drawSuperCannonEffect, drawBossHealthBar } from './renderer/effects';

export function renderGame(ctx: CanvasRenderingContext2D, entities: Entities): void {
  const { allies, enemies, barrels, boss, bullets } = entities;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawBackground(ctx);

  if (allies.length > 0 && gameState.superCannonActive) {
    drawSuperCannonEffect(ctx, allies[0]);
  }

  drawBullets(ctx, bullets);
  drawEnemies(ctx, enemies);
  if (boss) {
    drawBoss(ctx, boss);
    drawBossHealthBar(ctx, boss);
  }
  drawBarrels(ctx, barrels);
  drawAllies(ctx, allies);

  playAmbientSounds(gameState);
}