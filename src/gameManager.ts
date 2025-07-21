
import { entities } from './game';
import { gameState } from './gameState';
import { sounds } from './audio';
import { spawnBoss, spawnObstacles } from './spawner';
import { triggerRandomEvent } from './events';
import { Player, Enemy, Boss, EntityType } from './types';

export function handleEntityDeath(entity: EntityType | null, index: number | null, type: string): void {
  if (type === 'ally') {
    entities.allies.splice(index!, 1);
    if (!entities.allies.length) triggerGameOver();
  } else if (type === 'enemy') {
    const enemy = entities.enemies[index!];
    if (enemy && enemy.isDeadAndAnimating) {
      // If already animating death, remove after a delay
      setTimeout(() => {
        const currentEnemyIndex = entities.enemies.indexOf(enemy);
        if (currentEnemyIndex !== -1) {
          entities.enemies.splice(currentEnemyIndex, 1);
        }
      }, 500); // Assuming 500ms for death animation
    } else {
      // Immediate removal if not animating death
      entities.enemies.splice(index!, 1);
    }
    gameState.score += 1 * gameState.currentWave;
    gameState.enemiesKilled++;
    gameState.coins += 1; // Add 1 coin for each enemy killed
    checkBossSpawnConditions();
  } else if (type === 'boss') {
    entities.boss = null;
    gameState.score += 5 * gameState.currentWave;
    advanceToNextWave();
    sounds.bossMusic.pause();
    sounds.gameMusic.play();
    sounds.bossDeath.play();
    sounds.waveComplete.play();
  }
}

function checkBossSpawnConditions(): void {
  if (entities.boss || gameState.enemiesKilled < gameState.enemiesRequiredForBoss || gameState.bossSpawnCooldown > 0) return;
  gameState.bossSpawnCooldown = gameState.maxBossSpawnCooldown;
  sounds.bossWarning.play();
  gameState.showBossWarning = true;
}

function advanceToNextWave(): void {
  gameState.currentWave++;
  gameState.waveStartTime = Date.now();
  gameState.difficultyMultiplier += 0.5;
  gameState.enemiesRequiredForBoss = Math.min(20 + gameState.currentWave * 5, 100);
  gameState.spawnRate = Math.max(700 - (gameState.currentWave * 100), 500);
  spawnObstacles();
  console.log(`Onda ${gameState.currentWave} iniciada!`);
}

export function updateBossSpawn(): void {
  if (gameState.bossSpawnCooldown > 0) {
    gameState.bossSpawnCooldown -= 16; // Aproximadamente 16ms por frame
    if (gameState.bossSpawnCooldown <= 0) {
      spawnBoss();
      gameState.showBossWarning = false;
    } else if (gameState.bossSpawnCooldown % 1000 < 16) { // Trigger event roughly every second during cooldown
      triggerRandomEvent();
    }
  }
}

function triggerGameOver(): void {
  gameState.isGameOver = true;
  gameState.isStarted = false;
  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem('highScore', gameState.highScore.toString());
  }
  sounds.gameMusic.pause();
  sounds.bossMusic.pause();
  sounds.gameOver.play();
  updateGameOverScreen();
}

function updateGameOverScreen(): void {
    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'gameOverScreen';
    gameOverScreen.className = 'fixed inset-0 bg-gray-900 bg-opacity-90 flex flex-col items-center justify-center text-white';
    gameOverScreen.innerHTML = `
      <h1 class='text-4xl font-bold mb-4'>Game Over</h1>
      <p class='text-lg mb-2'>Score Atual: ${gameState.score}</p>
      <p class='text-lg mb-4'>Recorde: ${gameState.highScore}</p>
      <button id='restartButton' class='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>Reiniciar</button>
    `;
    document.body.appendChild(gameOverScreen);
    document.getElementById('restartButton')!.addEventListener('click', () => {
      gameOverScreen.remove();
      window.location.reload();
    });
}
