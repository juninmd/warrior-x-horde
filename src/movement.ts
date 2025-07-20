// @ts-check
// movement.ts - Lógica de movimento do jogador e aliados
import { canvas } from './game';
import { Entities, Player } from './types';
import { keys } from './input';

export function processMovement(entities: Entities): void {
  if (entities.allies.length === 0) return;

  const mainPlayer = entities.allies[0];
  let moved = false;

  // Movimento horizontal
  if (keys["ArrowLeft"] && mainPlayer.x > 0) {
    mainPlayer.x -= mainPlayer.speed;
    moved = true;
  }

  if (keys["ArrowRight"] && mainPlayer.x < canvas.width - mainPlayer.width) {
    mainPlayer.x += mainPlayer.speed;
    moved = true;
  }

  // Animar o sprite se moveu
  if (moved) {
    mainPlayer.frameTimer += 16;
    if (mainPlayer.frameTimer >= mainPlayer.frameInterval) {
      mainPlayer.frameTimer = 0;
      mainPlayer.frameIndex = (mainPlayer.frameIndex + 1) % 3;
    }
  } else {
    mainPlayer.frameIndex = 1; // Frame parado
  }

  // Atualizar posição dos aliados/reforços
  updateAlliesPosition(entities.allies);
}

function updateAlliesPosition(allies: Player[]): void {
  if (allies.length <= 1) return;

  const mainPlayer = allies[0];
  const spacingX = 40; // Horizontal spacing between reinforcements
  const spacingY = 30; // Vertical spacing between rows of reinforcements

  // Starting from index 1 to skip the main player
  for (let i = 1; i < allies.length; i++) {
    const ally = allies[i];
    const row = Math.floor((i - 1) / 2); // Determine the row (0, 1, 2, ...)
    const side = (i - 1) % 2; // Determine the side (0 for left, 1 for right)

    let targetX = mainPlayer.x;
    let targetY = mainPlayer.y;

    if (side === 0) { // Left side
      targetX = mainPlayer.x - (row + 1) * spacingX;
    } else { // Right side
      targetX = mainPlayer.x + (row + 1) * spacingX;
    }
    targetY = mainPlayer.y + (row + 1) * spacingY;

    ally.x = Math.max(0, Math.min(canvas.width - ally.width, targetX));
    ally.y = Math.max(0, Math.min(canvas.height - ally.height, targetY));

    // Update animation
    if (mainPlayer.frameIndex !== ally.frameIndex) {
      ally.frameIndex = mainPlayer.frameIndex;
    }
  }
}
