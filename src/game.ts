// game.ts - Loop principal do jogo Crowd Runner
import { Entities } from './types';
import { gameState, resetGameState } from './gameState';
import { createInitialEntities } from './entities';
import { render, getShareButtonBounds, shareOnX } from './renderer';
import { checkCollisions } from './collisions';
import { updateSpawns } from './spawner';
import { updateMovement } from './movement';
import { setupInput, getMouseX, initializeMousePosition, setGameStateRef, setInputScale } from './input';
import { updateShooting, updateBullets, updateSuperCannon } from './shooting';
import { initAudio, playMusic, playSound, stopAllMusic, audioManager } from './audio';

// Canvas setup
export const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Dimensões base do jogo (design de referência)
const BASE_WIDTH = 480;
const BASE_HEIGHT = 800;
const ASPECT_RATIO = BASE_WIDTH / BASE_HEIGHT;

// Escala atual
let scale = 1;

// Função para redimensionar o canvas responsivamente
function resizeCanvas(): void {
  const container = canvas.parentElement;
  if (!container) return;

  // Calcular espaço disponível
  const maxWidth = Math.min(window.innerWidth - 20, 600); // Max 600px de largura
  const maxHeight = window.innerHeight - 120; // Deixar espaço para título e dicas

  // Calcular dimensões mantendo aspect ratio
  let newWidth = maxWidth;
  let newHeight = newWidth / ASPECT_RATIO;

  // Se altura excede, ajustar pela altura
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = newHeight * ASPECT_RATIO;
  }

  // Mínimo para não ficar muito pequeno
  newWidth = Math.max(newWidth, 280);
  newHeight = Math.max(newHeight, newWidth / ASPECT_RATIO);

  // Aplicar dimensões de exibição (CSS)
  canvas.style.width = `${newWidth}px`;
  canvas.style.height = `${newHeight}px`;

  // Manter dimensões internas do canvas (resolução do jogo)
  canvas.width = BASE_WIDTH;
  canvas.height = BASE_HEIGHT;

  // Calcular escala para eventos de input
  scale = newWidth / BASE_WIDTH;
  setInputScale(scale);
}

// Converter coordenadas do mouse/touch para coordenadas do canvas
export function screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (screenX - rect.left) / scale,
    y: (screenY - rect.top) / scale
  };
}

export function getScale(): number {
  return scale;
}

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
let lastTime = 0;

function gameLoop(currentTime: number = 0): void {
  if (!gameState.isStarted) return;

  // Calcular delta time
  const deltaTime = lastTime ? currentTime - lastTime : 16;
  lastTime = currentTime;

  // Atualizar movimento
  updateMovement(entities, gameState, canvas.width, getMouseX());

  // Sistema de tiro
  updateShooting(entities, gameState);
  updateBullets(entities, gameState);
  updateSuperCannon(entities, gameState, deltaTime);

  // Spawnar elementos
  updateSpawns(entities, canvas.width, gameState);

  // Verificar colisões
  checkCollisions(entities, gameState);

  // Atualizar combo timer
  if (gameState.comboTimer > 0) {
    gameState.comboTimer -= deltaTime;
    if (gameState.comboTimer <= 0) {
      gameState.combo = 0;
      gameState.comboTimer = 0;
    }
  }

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
canvas.addEventListener('click', (e) => {
  if (gameState.isGameOver) {
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const bounds = getShareButtonBounds();

    // Verificar se clicou no botão de compartilhar
    if (x >= bounds.x && x <= bounds.x + bounds.width &&
        y >= bounds.y && y <= bounds.y + bounds.height) {
      shareOnX(gameState);
      return;
    }

    startGame();
  }
});

canvas.addEventListener('touchstart', (e) => {
  if (gameState.isGameOver) {
    e.preventDefault();
    const touch = e.touches[0];
    const { x, y } = screenToCanvas(touch.clientX, touch.clientY);
    const bounds = getShareButtonBounds();

    // Verificar se clicou no botão de compartilhar
    if (x >= bounds.x && x <= bounds.x + bounds.width &&
        y >= bounds.y && y <= bounds.y + bounds.height) {
      shareOnX(gameState);
      return;
    }

    startGame();
  }
}, { passive: false });

// Event listeners
startButton.addEventListener('click', startGame);

// Resize handler
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
  setTimeout(resizeCanvas, 100); // Delay para orientação estabilizar
});

// Setup inicial
resizeCanvas(); // Configurar tamanho inicial
setupInput(canvas);
initializeMousePosition(canvas.width);
initAudio(); // Inicializar sistema de áudio

// Desenhar tela inicial
entities = createInitialEntities(canvas.width, canvas.height);
render(ctx, entities, gameState);
