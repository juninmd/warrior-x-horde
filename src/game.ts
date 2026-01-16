// game.ts - Loop principal do jogo Crowd Runner
import { Entities } from './types';
import { gameState, resetGameState } from './gameState';
import { createInitialEntities, createEnemyHorde, createSoldier, createMysteryBox } from './entities';
import { render, getShareButtonBounds, getWhatsAppButtonBounds, shareOnX, shareOnWhatsApp } from './renderer';
import { checkCollisions } from './collisions';
import { updateSpawns } from './spawner';
import { updateMovement } from './movement';
import { setupInput, getMouseX, initializeMousePosition, setGameStateRef, setInputScale } from './input';
import { updateShooting, updateBullets, updateSuperCannon, activateSuperCannon } from './shooting';
import { initAudio, playMusic, playSound, stopAllMusic, audioManager, toggleMute, isMusicMuted } from './audio';

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

// Obter referência ao overlay de início
const startScreen = document.getElementById('startScreen');
const startBtnOverlay = document.getElementById('startBtnOverlay');

// Remover o botão antigo se existir (código legado)
// const startButton = document.createElement('button');
// ...

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

  // Se pausado, apenas renderizar e esperar
  if (gameState.isPaused) {
    render(ctx, entities, gameState);
    // Desenhar texto de PAUSADO
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⏸️ PAUSADO', canvas.width / 2, canvas.height / 2);
    ctx.font = '18px Arial';
    ctx.fillStyle = '#FFF';
    ctx.fillText('Pressione P ou ESC para continuar', canvas.width / 2, canvas.height / 2 + 40);
    ctx.restore();
    return; // Não continua o loop enquanto pausado
  }

  // Calcular delta time
  const deltaTime = lastTime ? currentTime - lastTime : 16;
  lastTime = currentTime;

  // Atualizar movimento
  updateMovement(entities, gameState, canvas.width, getMouseX());

  // Atualizar movimento das Mystery Boxes
  for (const box of entities.mysteryBoxes) {
    box.y += gameState.gameSpeed;
  }
  // Limpar boxes que saíram da tela
  entities.mysteryBoxes = entities.mysteryBoxes.filter(box => !box.passed && box.y < 1200);

  // Sistema de tiro
  updateShooting(entities, gameState);
  updateBullets(entities, gameState);
  updateSuperCannon(entities, gameState, deltaTime);

  // Atualizar botão do Super Cannon
  updateSuperCannonButton();
  updateSuperButtonInline();

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
    if (gameState.currentLevel === 10 && !gameState.isGameOver) {
      // Parar o jogo no nível 10 para mostrar a tela de vitória
      gameState.isGameOver = true;
      playSound(audioManager.victory);
    } else if (gameState.currentLevel !== 10) {
      // Avançar normal para outros níveis
      advanceToNextLevel();
    }
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
  gameState.levelDistance += 900; // Incremento 3x maior por level (era 300)
  gameState.isVictory = false;
  gameState.gameSpeed = Math.min(1.5, gameState.baseGameSpeed + gameState.currentLevel * 0.08); // Máximo 1.5x, incremento menor

  // Limpar entidades antigas, manter o exército
  entities.gates = [];
  entities.boss = null;
  entities.bullets = [];
  entities.miniBosses = [];

  // Spawnar hordas iniciais para o novo level - quantidades reduzidas
  const baseEnemies = 12 + gameState.currentLevel * 2; // Reduzido
  entities.enemyHordes = [
    createEnemyHorde(canvas.width, -50, baseEnemies, gameState.currentLevel),
    createEnemyHorde(canvas.width, -200, baseEnemies + 3, gameState.currentLevel),
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

  // Esconder overlay de start
  if (startScreen) startScreen.classList.remove('active');

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

    // Verificar se clicou no botão de compartilhar X (Twitter)
    const xBounds = getShareButtonBounds();
    if (x >= xBounds.x && x <= xBounds.x + xBounds.width &&
      y >= xBounds.y && y <= xBounds.y + xBounds.height) {
      shareOnX(gameState);
      return;
    }

    // Verificar se clicou no botão de compartilhar WhatsApp
    const waBounds = getWhatsAppButtonBounds();
    if (x >= waBounds.x && x <= waBounds.x + waBounds.width &&
      y >= waBounds.y && y <= waBounds.y + waBounds.height) {
      shareOnWhatsApp(gameState);
      return;
    }

    // Lógica para continuar ou reiniciar
    if (gameState.isVictory && gameState.currentLevel === 10) {
      // Continuar para nível 11 (Infinito)
      advanceToNextLevel();
      gameState.isGameOver = false;
      gameState.isStarted = true;
      requestAnimationFrame(gameLoop);
    } else {
      // Reiniciar jogo
      startGame();
    }
  }
});

canvas.addEventListener('touchstart', (e) => {
  if (gameState.isGameOver) {
    e.preventDefault();
    const touch = e.touches[0];
    const { x, y } = screenToCanvas(touch.clientX, touch.clientY);

    // Verificar se clicou no botão de compartilhar X (Twitter)
    const xBounds = getShareButtonBounds();
    if (x >= xBounds.x && x <= xBounds.x + xBounds.width &&
      y >= xBounds.y && y <= xBounds.y + xBounds.height) {
      shareOnX(gameState);
      return;
    }

    // Verificar se clicou no botão de compartilhar WhatsApp
    const waBounds = getWhatsAppButtonBounds();
    if (x >= waBounds.x && x <= waBounds.x + waBounds.width &&
      y >= waBounds.y && y <= waBounds.y + waBounds.height) {
      shareOnWhatsApp(gameState);
      return;
    }

    // Lógica para continuar ou reiniciar
    if (gameState.isVictory && gameState.currentLevel === 10) {
      // Continuar para nível 11 (Infinito)
      advanceToNextLevel();
      gameState.isGameOver = false;
      gameState.isStarted = true;
      requestAnimationFrame(gameLoop);
    } else {
      // Reiniciar jogo
      startGame();
    }
  }
}, { passive: false });

// Event listeners
if (startBtnOverlay) {
  startBtnOverlay.addEventListener('click', startGame);
}

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

// Atualizar botão de mute inicial
const muteBtn = document.getElementById('muteBtn');
if (muteBtn) {
  muteBtn.textContent = isMusicMuted() ? '🔇' : '🔊';
}

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
  gameState.levelDistance = 15000 + (targetLevel - 1) * 900; // 3x maior
  gameState.isVictory = false;
  gameState.gameSpeed = Math.min(2, gameState.baseGameSpeed + targetLevel * 0.1);

  // Dar um exército razoável para teste
  const testSoldiers = Math.min(200, 10 + targetLevel * 12);
  entities = createInitialEntities(canvas.width, canvas.height);

  // Adicionar soldados extras
  for (let i = 0; i < testSoldiers; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 50;
    entities.playerArmy.soldiers.push(
      createSoldier(entities.playerArmy.centerX + Math.cos(angle) * radius,
      entities.playerArmy.centerY + Math.sin(angle) * radius,
      '#4A90D9', 100 * targetLevel));
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

// Função para pausar/despausar o jogo
function togglePause(): void {
  if (!gameState.isStarted || gameState.isGameOver) return;

  gameState.isPaused = !gameState.isPaused;

  // Atualizar botão de pause
  const pauseBtn = document.getElementById('pauseBtn');
  if (pauseBtn) {
    pauseBtn.textContent = gameState.isPaused ? '▶️ Play' : '⏸️ Pause';
  }

  // Se despausou, continuar o game loop
  if (!gameState.isPaused) {
    requestAnimationFrame(gameLoop);
  }

  console.log(`⏸️ Jogo ${gameState.isPaused ? 'pausado' : 'retomado'}`);
}

function toggleMuteUI(): void {
  const muted = toggleMute();
  const btn = document.getElementById('muteBtn');
  if (btn) {
    btn.textContent = muted ? '🔇' : '🔊';
  }
}

function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.log(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

// Função para ativar super cannon (exposta para HTML)
function triggerSuperCannon(): void {
  if (gameState.isStarted && !gameState.isGameOver && !gameState.isPaused) {
    activateSuperCannon(gameState);
  }
}

// Atualizar estado do botão Super inline
function updateSuperButtonInline(): void {
  const superBtn = document.getElementById('superCannonBtnInline') as HTMLButtonElement;
  if (!superBtn) return;

  if (!gameState.isStarted || gameState.isGameOver) {
    superBtn.disabled = true;
    superBtn.textContent = '⚡ SUPER';
    return;
  }

  const now = Date.now();
  const timeSinceLastUse = now - gameState.superCannonLastUsed;
  const cooldownRemaining = Math.max(0, gameState.superCannonCooldown - timeSinceLastUse);
  const isOnCooldown = cooldownRemaining > 0 && !gameState.superCannonActive;

  if (gameState.superCannonActive) {
    superBtn.textContent = '⚡ ATIVO!';
    superBtn.disabled = true;
  } else if (isOnCooldown) {
    const cooldownSecs = Math.ceil(cooldownRemaining / 1000);
    superBtn.textContent = `⏳ ${cooldownSecs}s`;
    superBtn.disabled = true;
  } else {
    superBtn.textContent = '⚡ SUPER';
    superBtn.disabled = false;
  }
}

// Expor funções globalmente para o HTML acessar
(window as unknown as {
  debugSetLevel: typeof debugSetLevel;
  togglePause: typeof togglePause;
  triggerSuperCannon: typeof triggerSuperCannon;
  toggleMuteUI: typeof toggleMuteUI;
  toggleFullscreen: typeof toggleFullscreen;
}).debugSetLevel = debugSetLevel;

(window as unknown as { togglePause: typeof togglePause }).togglePause = togglePause;
(window as unknown as { triggerSuperCannon: typeof triggerSuperCannon }).triggerSuperCannon = triggerSuperCannon;
(window as unknown as { toggleMuteUI: typeof toggleMuteUI }).toggleMuteUI = toggleMuteUI;
(window as unknown as { toggleFullscreen: typeof toggleFullscreen }).toggleFullscreen = toggleFullscreen;

// Adicionar atalho de teclado para pause (P ou Escape)
document.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    togglePause();
  }
});
