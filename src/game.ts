// game.ts - Loop principal do jogo Crowd Runner
import { Entities } from './types';
import { gameState, resetGameState } from './gameState';
import { createInitialEntities } from './entities';
import { render } from './renderer';
import { checkCollisions } from './collisions';
import { updateSpawns } from './spawner';
import { updateMovement } from './movement';
import { setupInput, getMouseX, initializeMousePosition, setGameStateRef } from './input';
import { updateShooting, updateBullets, updateSuperCannon, activateSuperCannon } from './shooting';
import { initAudio, playMusic, playSound, stopAllMusic, audioManager } from './audio';

// Canvas setup
export const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Entidades do jogo
let entities: Entities;

// Botão de início
const startButton = document.createElement('button');
startButton.innerText = 'INICIAR JOGO';
startButton.style.cssText = `
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 20px 40px;
  font-size: 24px;
  font-weight: bold;
  background: linear-gradient(180deg, #4A90D9 0%, #2E5A8E 100%);
  color: white;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(0,0,0,0.3);
  z-index: 100;
  transition: transform 0.2s, box-shadow 0.2s;
`;
startButton.onmouseover = () => {
  startButton.style.transform = 'translate(-50%, -50%) scale(1.05)';
  startButton.style.boxShadow = '0 8px 25px rgba(0,0,0,0.4)';
};
startButton.onmouseout = () => {
  startButton.style.transform = 'translate(-50%, -50%)';
  startButton.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
};
document.body.appendChild(startButton);

// Game loop
let wasInBossFight = false;

function gameLoop(): void {
  if (!gameState.isStarted) return;

  // Atualizar movimento
  updateMovement(entities, gameState, canvas.width, getMouseX());

  // Sistema de tiro
  updateShooting(entities, gameState);
  updateBullets(entities, gameState);
  updateSuperCannon(entities, gameState, 16); // ~60fps = 16ms por frame

  // Spawnar elementos
  updateSpawns(entities, canvas.width, gameState);

  // Verificar colisões
  checkCollisions(entities, gameState);

  // Música do boss
  const isInBossFight = entities.boss !== null && entities.boss.isActive;
  if (isInBossFight !== wasInBossFight) {
    playMusic(isInBossFight);
    wasInBossFight = isInBossFight;
  }

  // Checar progresso de nível (vitória do boss = próximo nível)
  if (gameState.isVictory) {
    advanceToNextLevel();
  }

  // Renderizar
  render(ctx, entities, gameState);

  // Continuar loop
  if (!gameState.isGameOver) {
    requestAnimationFrame(gameLoop);
  } else {
    // Mostrar tela de game over
    render(ctx, entities, gameState);

    // Parar música e tocar som de game over
    stopAllMusic();
    playSound(audioManager.gameOver);

    // Salvar high score
    if (gameState.score > gameState.highScore) {
      gameState.highScore = gameState.score;
      localStorage.setItem('crowdHighScore', gameState.highScore.toString());
    }
  }
}

// Avançar para o próximo nível
function advanceToNextLevel(): void {
  gameState.currentLevel++;
  gameState.distanceTraveled = 0;
  gameState.levelDistance += 500; // Aumenta distância necessária
  gameState.isVictory = false;
  gameState.gameSpeed = Math.min(3, gameState.baseGameSpeed + gameState.currentLevel * 0.2); // Aumenta velocidade

  // Limpar entidades antigas, manter o exército
  entities.gates = [];
  entities.enemyHordes = [];
  entities.boss = null;
  entities.bullets = [];
}

// Iniciar jogo
function startGame(): void {
  resetGameState();
  entities = createInitialEntities(canvas.width, canvas.height);
  initializeMousePosition(canvas.width);
  setGameStateRef(gameState); // Configurar referência para input de Super Cannon
  wasInBossFight = false; // Resetar flag de boss
  gameState.isStarted = true;
  startButton.style.display = 'none';

  // Iniciar música
  playSound(audioManager.gameStart);
  setTimeout(() => playMusic(false), 500); // Iniciar música após som de início

  requestAnimationFrame(gameLoop);
}

// Restart no clique após game over
canvas.addEventListener('click', () => {
  if (gameState.isGameOver) {
    startGame();
  }
});

canvas.addEventListener('touchstart', (e) => {
  if (gameState.isGameOver) {
    e.preventDefault();
    startGame();
  }
});

// Event listeners
startButton.addEventListener('click', startGame);

// Setup inicial
setupInput(canvas);
initializeMousePosition(canvas.width);
initAudio(); // Inicializar sistema de áudio

// Desenhar tela inicial
entities = createInitialEntities(canvas.width, canvas.height);
render(ctx, entities, gameState);
