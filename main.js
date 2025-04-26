// main.js - Ponto de entrada para o jogo (importa todos os módulos)

// Importar todos os módulos
import { gameState, entities } from './game.js';
import { processMovement, processShooting } from './input.js';
import { updateEntities } from './entities.js';
import { renderGame, drawUI } from './renderer.js';
import { checkCollisions } from './collision.js';

// Função de atualização principal (chamada a cada frame)
function gameUpdate() {
  if (gameState.isGameOver) return;

  // Processamento de entrada
  processMovement(entities);
  if (keys[" "]) processShooting(entities);

  // Atualização de entidades
  updateEntities(entities, gameState);

  // Verificação de colisões
  checkCollisions(entities, gameState, handleEntityDeath);
}

// Função de renderização principal
function gameRender() {
  renderGame(ctx, entities);
  drawUI(ctx, entities, gameState);
}

// Loop do jogo
function gameLoop() {
  if (!gameState.isGameOver) {
    gameUpdate();
    gameRender();
    requestAnimationFrame(gameLoop);
  }
}

// Função para lidar com a morte de entidades
function handleEntityDeath(entity, index, type) {
  if (type === 'ally') {
    entities.allies.splice(index, 1);

    // Game over se não houver mais aliados
    if (entities.allies.length === 0) {
      triggerGameOver();
    }
  } else if (type === 'enemy') {
    entities.enemies.splice(index, 1);
    gameState.score += 100 * gameState.currentWave;

    // Se for o jogador principal que matou
    if (entities.allies.length > 0) {
      entities.allies[0].kills++;
      entities.allies[0].totalKills++;
    }
  } else if (type === 'boss') {
    entities.boss = null;
    gameState.score += 5000 * gameState.currentWave;
    gameState.enemiesSpawned = 0;
    gameState.currentWave++;
    sounds.bossMusic.pause();
    sounds.gameMusic.play();
    sounds.bossDeath.play();
    sounds.waveComplete.play();
  }
}

// Exportação de funções necessárias
export { gameLoop, handleEntityDeath };