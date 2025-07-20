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

  // Começando do índice 1 para pular o jogador principal
  for (let i = 1; i < allies.length; i++) {
    const ally = allies[i];
    const targetX = mainPlayer.x + ally.offsetX;
    ally.x = Math.max(0, Math.min(canvas.width - ally.width, targetX));
    ally.y = mainPlayer.y;

    // Atualizar animação
    if (mainPlayer.frameIndex !== ally.frameIndex) {
      ally.frameIndex = mainPlayer.frameIndex;
    }
  }
}
