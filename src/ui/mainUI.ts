
import { Entities, GameState } from '../types';
import { gameState } from '../gameState';

const COLORS = {
  text: "white",
};

function getSuperCannonStatus(): string {
  if (gameState.superCannonActive) {
    const remainingTime = Math.max(0, Math.ceil((gameState.superCannonTimer + gameState.superCannonDuration - Date.now()) / 1000));
    return `Ativo (${remainingTime}s)`;
  }
  if (gameState.superCannonReady) return 'Pronto (C)';
  const cooldownRemaining = Math.ceil((gameState.superCannonLastUsed + gameState.superCannonCooldown - Date.now()) / 1000);
  return `Cooldown: ${cooldownRemaining}s`;
}

export function drawMainUI(ctx: CanvasRenderingContext2D, entities: Entities, gameState: GameState): void {
  const { allies } = entities;
  const mainPlayer = allies.length > 0 ? allies[0] : null;
  if (!mainPlayer) return;

  ctx.fillStyle = COLORS.text;
  ctx.font = "16px Arial";
  ctx.textAlign = "right";
  ctx.fillText(`HP: ${mainPlayer.hp}`, ctx.canvas.width - 10, ctx.canvas.height - 10);
  ctx.fillText(`DMG: ${mainPlayer.bulletDamage}`, ctx.canvas.width - 10, ctx.canvas.height - 30);
  ctx.fillText(`Rate: ${mainPlayer.fireRate}`, ctx.canvas.width - 10, ctx.canvas.height - 50);
  ctx.fillText(`Escudo: ${mainPlayer.shield}`, ctx.canvas.width - 10, ctx.canvas.height - 70);
  ctx.fillText(`Super Tiro: ${getSuperCannonStatus()}`, ctx.canvas.width - 10, ctx.canvas.height - 90);
  ctx.fillText(`Reforços: ${allies.length - 1}/${gameState.maxReinforcements}`, ctx.canvas.width - 10, ctx.canvas.height - 110);

  ctx.textAlign = "left";
  ctx.fillText(`Total Kills: ${gameState.enemiesKilled}`, 10, ctx.canvas.height - 10);
  ctx.fillText(`Wave: ${gameState.currentWave}`, 10, ctx.canvas.height - 30);
  ctx.fillText(`Score: ${gameState.score}`, 10, ctx.canvas.height - 50);
  ctx.fillText(`High Score: ${gameState.highScore}`, 10, ctx.canvas.height - 70);
}
