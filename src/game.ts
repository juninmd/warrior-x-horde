// game.ts - Loop principal do jogo Crowd Runner
import { Entities } from './types';
import { gameState, resetGameState } from './gameState';
import { createInitialEntities, createEnemyHorde } from './entities';
import { render, getShareButtonBounds, shareOnX } from './renderer';
import { checkCollisions } from './collisions';
import { updateSpawns } from './spawner';
import { updateMovement } from './movement';
import { setupInput, getMouseX, initializeMousePosition, setGameStateRef, setInputScale } from './input';
import { updateShooting, updateBullets, updateSuperCannon, activateSuperCannon } from './shooting';
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

  // Calcular espaço disponível (deixar espaço para o botão Super Cannon no mobile)
  const maxWidth = Math.min(window.innerWidth - 20, 600); // Max 600px de largura
  const maxHeight = window.innerHeight - 150; // Deixar espaço para título, dicas e botão

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

// Container para o botão Super Cannon
const superCannonContainer = document.getElementById('superCannonContainer');

// Botão de Super Cannon para mobile (dentro do layout, não fixed)
const superCannonButton = document.createElement('button');
superCannonButton.id = 'superCannonBtn';
superCannonButton.innerHTML = '⚡ SUPER';
superCannonButton.style.cssText = `
  min-width: 120px;
  height: 45px;
  padding: 8px 20px;
  font-size: 16px;
  font-weight: bold;
  background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
  color: #333;
  border: 3px solid #FFD700;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.5), 0 0 15px rgba(255, 215, 0, 0.3);
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
`;

// Função para tentar ativar o Super Cannon
function trySuperCannon(): void {
  console.log('Super Cannon button pressed!', {
    isStarted: gameState.isStarted,
    isGameOver: gameState.isGameOver,
    superCannonReady: gameState.superCannonReady
  });

  if (gameState.isStarted && !gameState.isGameOver) {
    activateSuperCannon(gameState);
  }
}

// Touch events para mobile
superCannonButton.addEventListener('touchstart', (e) => {
  e.preventDefault();
  e.stopPropagation();
  trySuperCannon();
  // Feedback visual
  superCannonButton.style.transform = 'scale(0.95)';
  superCannonButton.style.opacity = '0.9';
}, { passive: false });

superCannonButton.addEventListener('touchend', (e) => {
  e.preventDefault();
  e.stopPropagation();
  superCannonButton.style.transform = 'scale(1)';
  superCannonButton.style.opacity = '1';
}, { passive: false });

superCannonButton.addEventListener('touchcancel', () => {
  superCannonButton.style.transform = 'scale(1)';
  superCannonButton.style.opacity = '1';
});

// Click para desktop
superCannonButton.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  trySuperCannon();
});

// Pointer events como fallback
superCannonButton.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch') {
    e.preventDefault();
    trySuperCannon();
  }
});

// Adicionar ao container no HTML
if (superCannonContainer) {
  superCannonContainer.appendChild(superCannonButton);
}

// Atualizar estado visual do botão Super Cannon
function updateSuperCannonButton(): void {
  if (!superCannonContainer) return;

  if (!gameState.isStarted || gameState.isGameOver) {
    superCannonContainer.style.display = 'none';
    return;
  }

  superCannonContainer.style.display = 'flex';
  superCannonContainer.style.justifyContent = 'center';

  // Calcular tempo restante do cooldown
  const now = Date.now();
  const timeSinceLastUse = now - gameState.superCannonLastUsed;
  const cooldownRemaining = Math.max(0, gameState.superCannonCooldown - timeSinceLastUse);
  const isOnCooldown = cooldownRemaining > 0 && !gameState.superCannonActive;

  if (gameState.superCannonActive) {
    // Ativo - brilhando
    superCannonButton.innerHTML = '⚡ ATIVO!';
    superCannonButton.style.background = 'linear-gradient(180deg, #FFEB3B 0%, #FF9800 100%)';
    superCannonButton.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.9), 0 0 50px rgba(255, 215, 0, 0.5)';
    superCannonButton.style.borderColor = '#FFEB3B';
    superCannonButton.style.color = '#333';
    superCannonButton.disabled = true;
  } else if (isOnCooldown) {
    // Em cooldown - mostrar tempo restante
    const cooldownSecs = Math.ceil(cooldownRemaining / 1000);
    superCannonButton.innerHTML = `⏳ ${cooldownSecs}s`;
    superCannonButton.style.background = 'linear-gradient(180deg, #555 0%, #333 100%)';
    superCannonButton.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.4)';
    superCannonButton.style.borderColor = '#555';
    superCannonButton.style.color = '#999';
    superCannonButton.disabled = true;
  } else {
    // Pronto para usar
    superCannonButton.innerHTML = '⚡ SUPER';
    superCannonButton.style.background = 'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)';
    superCannonButton.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.5), 0 0 15px rgba(255, 215, 0, 0.3)';
    superCannonButton.style.borderColor = '#FFD700';
    superCannonButton.style.color = '#333';
    superCannonButton.disabled = false;
  }
}

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

  // Atualizar botão do Super Cannon
  updateSuperCannonButton();

  // Spawnar elementos
  updateSpawns(entities, canvas.width, gameState, canvas.height);

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
    // Após level 10, continua em modo infinito!
    advanceToNextLevel();
  }

  // Renderizar
  render(ctx, entities, gameState);

  // Continuar loop
  if (!gameState.isGameOver) {
    requestAnimationFrame(gameLoop);
  } else {
    // Esconder botão do Super Cannon no game over
    superCannonButton.style.display = 'none';
    superCannonButton.style.display = 'none';

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
  gameState.gameSpeed = Math.min(2, gameState.baseGameSpeed + gameState.currentLevel * 0.1); // Máximo 2x, incremento menor

  // Limpar entidades antigas, manter o exército
  entities.gates = [];
  entities.boss = null;
  entities.bullets = [];
  entities.miniBosses = [];

  // Spawnar hordas iniciais para o novo level (mínimo 15, com level para HP)
  const baseEnemies = 15 + gameState.currentLevel * 3;
  entities.enemyHordes = [
    createEnemyHorde(canvas.width, -50, baseEnemies, gameState.currentLevel),
    createEnemyHorde(canvas.width, -200, baseEnemies + 5, gameState.currentLevel),
    createEnemyHorde(canvas.width, -400, baseEnemies + 10, gameState.currentLevel),
  ];
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
  superCannonButton.style.display = 'block'; // Mostrar botão do Super Cannon

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

// DEBUG: Função para ir para um level específico (exposta globalmente)
function debugSetLevel(targetLevel: number): void {
  if (!gameState.isStarted) {
    // Se o jogo não começou, iniciar primeiro
    startGame();
  }

  // Definir o level
  gameState.currentLevel = targetLevel;
  gameState.distanceTraveled = 0;
  gameState.levelDistance = 3000 + (targetLevel - 1) * 500;
  gameState.isVictory = false;
  gameState.gameSpeed = Math.min(2, gameState.baseGameSpeed + targetLevel * 0.1);

  // Dar um exército razoável para teste
  const testSoldiers = Math.min(50, 10 + targetLevel * 5);
  entities = createInitialEntities(canvas.width, canvas.height);

  // Adicionar soldados extras
  for (let i = 0; i < testSoldiers; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 50;
    entities.playerArmy.soldiers.push({
      id: Math.random(),
      x: entities.playerArmy.centerX + Math.cos(angle) * radius,
      y: entities.playerArmy.centerY + Math.sin(angle) * radius,
      targetX: 0,
      targetY: 0,
      color: '#4A90D9',
      size: 8,
      isAlive: true,
      animOffset: Math.random() * Math.PI * 2,
      hp: 100,
      maxHp: 100,
    });
  }

  // Limpar e recriar entidades
  entities.gates = [];
  entities.boss = null;
  entities.bullets = [];
  entities.miniBosses = [];

  // Spawnar hordas para o level
  const baseEnemies = 15 + targetLevel * 3;
  entities.enemyHordes = [
    createEnemyHorde(canvas.width, -50, baseEnemies, targetLevel),
    createEnemyHorde(canvas.width, -200, baseEnemies + 5, targetLevel),
  ];

  console.log(`🎮 Debug: Indo para Level ${targetLevel}`);

  // Se for level 10+, forçar spawn do boss imediatamente
  if (targetLevel >= 10) {
    gameState.distanceTraveled = gameState.levelDistance - 100;
    console.log(`🛸 Mothership boss aparecerá em breve!`);
  }
}

// Expor função globalmente para o HTML acessar
(window as unknown as { debugSetLevel: typeof debugSetLevel }).debugSetLevel = debugSetLevel;
