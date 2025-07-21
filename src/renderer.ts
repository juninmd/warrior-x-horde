import { playAmbientSounds } from './audioManager.js';
import { gameState } from './gameState.js';
import { Entities } from './types';
import { drawAllies, drawEnemies, drawBoss, drawBarrels, drawBullets, drawObstacles } from './drawing';
import { drawBackground } from './renderer/background';
import { drawSuperCannonEffect, drawBossHealthBar } from './renderer/effects';

export function renderGame(ctx: CanvasRenderingContext2D, entities: Entities): void {
  const { allies, enemies, barrels, boss, bullets, obstacles } = entities;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  let shakeX = 0;
  let shakeY = 0;
  if (gameState.screenShakeActive) {
    shakeX = (Math.random() - 0.5) * gameState.screenShakeIntensity;
    shakeY = (Math.random() - 0.5) * gameState.screenShakeIntensity;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawBackground(ctx);

  if (allies.length > 0 && gameState.superCannonActive) {
    drawSuperCannonEffect(ctx, allies[0]);
  }

  drawObstacles(ctx, obstacles);
  drawBullets(ctx, bullets);
  drawEnemies(ctx, enemies);
  if (boss) {
    drawBoss(ctx, boss);
    drawBossHealthBar(ctx, boss);
  }
  drawBarrels(ctx, barrels);
  drawAllies(ctx, allies);

  ctx.restore();

  playAmbientSounds(gameState);
}