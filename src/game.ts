// game.ts - Loop principal do jogo Crowd Runner
import { Entities } from './types';
import { gameState, resetGameState, saveGameProgress } from './gameState';
import { createInitialEntities, createEnemyHorde, createSoldier, addSpecialSoldiersToArmy, addSoldiersToArmy } from './entities';
import { render, shareOnX, shareOnWhatsApp, addFloatingText, updateFloatingTexts } from './renderer';
import { checkCollisions } from './collisions';
import { updateSpawns } from './spawner';
import { updateMovement } from './movement';
import { setupInput, getMouseX, initializeMousePosition, setGameStateRef, setInputScale, vibrate } from './input';
import { updateShooting, updateBullets, updateSuperCannon, activateSuperCannon } from './shooting';
import { initAudio, playMusic, playSound, stopAllMusic, audioManager, toggleMute, isMusicMuted } from './audio';
import { BASE_WIDTH, BASE_HEIGHT, ASPECT_RATIO } from './constants';
import { setupShopUI, updateShopUI, setupSuperCannonUI, updateSuperCannonUI, BuyAction, setupGameOverUI, showGameOverScreen, startCountdown } from './ui-overlay';
import { QualityManager } from './quality';

// Canvas setup
export const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Escala atual
let scale = 1;

// Função para redimensionar o canvas responsivamente
/* v8 ignore start */
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

  // Manter dimensões internas do canvas (resolução do jogo) com suporte a High DPI
  const dpr = window.devicePixelRatio || 1;
  canvas.width = BASE_WIDTH * dpr;
  canvas.height = BASE_HEIGHT * dpr;

  ctx.scale(dpr, dpr);

  // Calcular escala para eventos de input
  scale = newWidth / BASE_WIDTH;
  setInputScale(scale);
}
/* v8 ignore stop */

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

// --- Shop Logic ---
const handleBuy: BuyAction = (type, cost) => {
    if (gameState.coins >= cost) {
        if (type === 'recharge_super') {
           const now = Date.now();
           const cooldownRemaining = Math.max(0, gameState.superCannonCooldown - (now - gameState.superCannonLastUsed));
           if (cooldownRemaining <= 0) {
              addFloatingText('READY!', entities.playerArmy.centerX, entities.playerArmy.centerY, '#FFD700');
              return;
           }
           if (gameState.superCannonReady && !gameState.superCannonActive) {
               // Already ready
               return;
           }
        }

        gameState.coins -= cost;

        if (type === 'nuke') {
          // 1. Trigger Visuals
          gameState.nukeTimer = 60; // 1 second visual
          triggerScreenShake(20, 800);
          triggerHitStop(10); // Freeze frame impact
          playSound(audioManager.superCannon);
          addFloatingText('⚠️ ORBITAL STRIKE ⚠️', entities.playerArmy.centerX, entities.playerArmy.centerY - 150, '#FF0000', 1.5);

          // 2. Kill all normal hordes
          entities.enemyHordes.forEach(h => {
            if (h.isActive) {
              h.isActive = false;
            }
          });

          // 3. Clear Bullets
          entities.bullets = [];

          // 4. Massive Damage to Bosses
          if (entities.boss && entities.boss.isActive) {
            entities.boss.hp -= 5000;
            addFloatingText('-5000', entities.boss.x + entities.boss.width/2, entities.boss.y, '#FF0000', 2);
          }

          // 5. Massive Damage to MiniBosses
          entities.miniBosses.forEach(mb => {
            if (mb.isActive) {
              mb.hp -= 5000;
              addFloatingText('-5000', mb.x + mb.width/2, mb.y, '#FF0000', 1.5);
            }
          });

        } else if (type === 'soldier') {
          addSoldiersToArmy(entities.playerArmy, 10);
          addFloatingText('+10 Soldiers', entities.playerArmy.centerX, entities.playerArmy.centerY, '#4A90D9');
          playSound(audioManager.powerUp);
        } else if (type === 'recharge_super') {
          gameState.superCannonLastUsed = 0;
          gameState.superCannonReady = true;
          addFloatingText('SUPER READY!', entities.playerArmy.centerX, entities.playerArmy.centerY, '#FFD700');
          playSound(audioManager.powerUp);
        } else {
          addSpecialSoldiersToArmy(entities.playerArmy, type, 1);
          addFloatingText(`+1 ${type.toUpperCase()}`, entities.playerArmy.centerX, entities.playerArmy.centerY, '#00FF00');
          playSound(audioManager.powerUp);
        }

        // Salvar moedas após compra
        saveGameProgress();
      } else {
        playSound(audioManager.nerf);
      }
};

setupShopUI(handleBuy);

// --- Super Cannon Logic ---
const handleSuperCannon = () => {
    console.log('Super Cannon button pressed!', {
        isStarted: gameState.isStarted,
        isGameOver: gameState.isGameOver,
        superCannonReady: gameState.superCannonReady
      });

      if (gameState.isStarted && !gameState.isGameOver) {
        activateSuperCannon(gameState);
      }
};

setupSuperCannonUI(handleSuperCannon);


// Game loop
let wasInBossFight = false;
let lastTime = 0;

function gameLoop(currentTime: number = 0): void {
  if (!gameState.isStarted) return;

  // Se pausado, apenas renderizar e esperar
  if (gameState.isPaused) {
    render(ctx, entities, gameState);
    // Desenhar texto de PAUSADO
    /* v8 ignore start */
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⏸️ PAUSADO', BASE_WIDTH / 2, BASE_HEIGHT / 2);
    ctx.font = '18px Arial';
    ctx.fillStyle = '#FFF';
    ctx.fillText('Toque para continuar', BASE_WIDTH / 2, BASE_HEIGHT / 2 + 40);
    ctx.restore();
    /* v8 ignore stop */
    return; // Não continua o loop enquanto pausado
  }

  // Hit Stop Logic (Freeze Frame)
  if (gameState.hitStop > 0) {
    gameState.hitStop--;
    render(ctx, entities, gameState);
    lastTime = currentTime; // Consome o tempo sem avançar a física
    requestAnimationFrame(gameLoop);
    return;
  }

  // Calcular delta time
  let deltaTime = lastTime ? currentTime - lastTime : 16;
  lastTime = currentTime;

  // Cap delta time to prevent physics explosions on lag spikes (max ~20fps floor)
  deltaTime = Math.min(deltaTime, 50);

  // Monitor Performance
  QualityManager.getInstance().updateFPS(deltaTime);

  // Slow Mo Logic
  let timeScale = 1.0;
  if (gameState.slowMoTimer > 0) {
      // Use real deltaTime for timer
      gameState.slowMoTimer -= deltaTime;
      timeScale = 0.2;
  }

  // Normalizar delta time (base 60 FPS)
  // Se rodar a 60fps, dtFactor = 1.
  // Se rodar a 120fps, dtFactor = 0.5 (move metade por frame, mas tem o dobro de frames = mesma velocidade)
  const dtFactor = (deltaTime / 16.67) * timeScale;

  // Atualizar screen shake (decay)
  if (gameState.screenShakeTimer > 0) {
    gameState.screenShakeTimer -= deltaTime;
    if (gameState.screenShakeTimer <= 0) {
      gameState.screenShakeActive = false;
      gameState.screenShakeIntensity = 0;
    }
  }

  // Update Damage Flash
  if (gameState.damageFlash > 0) {
    gameState.damageFlash = Math.max(0, gameState.damageFlash - 0.05 * dtFactor);
  }

  // Update Nuke Timer
  if (gameState.nukeTimer > 0) {
    gameState.nukeTimer -= dtFactor;
  }

  // Atualizar movimento
  updateMovement(entities, gameState, BASE_WIDTH, getMouseX(), dtFactor);

  // Atualizar movimento das Mystery Boxes e limpar usando swap-and-pop
  for (let i = 0; i < entities.mysteryBoxes.length; i++) {
    const box = entities.mysteryBoxes[i];
    box.y += gameState.gameSpeed * dtFactor;

    if (box.passed || box.y >= 1200) {
      // Swap com o último elemento e remove
      entities.mysteryBoxes[i] = entities.mysteryBoxes[entities.mysteryBoxes.length - 1];
      entities.mysteryBoxes.pop();
      i--; // Re-processar este índice pois agora contém o elemento trocado
    }
  }

  // Sistema de tiro
  updateShooting(entities, gameState);
  updateBullets(entities, gameState, dtFactor);
  updateSuperCannon(entities, gameState, deltaTime);
  updateFloatingTexts(); // Visual updates (damage numbers)

  // UI Updates
  updateSuperCannonUI(gameState);
  updateSuperButtonInline();
  updateShopUI(gameState);

  // Spawnar elementos
  updateSpawns(entities, BASE_WIDTH, gameState, BASE_HEIGHT, dtFactor);

  // Verificar colisões
  checkCollisions(entities, gameState);

  // Check Low Army Warning
  const armyCount = entities.playerArmy.aliveCount;
  if (armyCount < 10 && armyCount > 0 && !gameState.isGameOver && gameState.isStarted) {
     if (!gameState.lowArmyTriggered) {
        gameState.lowArmyTriggered = true;
        vibrate(50);
        addFloatingText("⚠️ LOW ARMY! ⚠️", entities.playerArmy.centerX, entities.playerArmy.centerY - 50, "#FF4500", 1.2);
     }
  } else if (armyCount >= 10) {
     gameState.lowArmyTriggered = false;
  }

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
    // Checar High Score em tempo real para feedback
    if (gameState.score > gameState.highScore && gameState.highScore > 0) {
      if (!gameState.newRecordReached) {
        gameState.newRecordReached = true;
        addFloatingText("👑 NEW RECORD! 👑", BASE_WIDTH/2, 200, "#FFD700", 2);
        triggerScreenShake(15, 800);
        playSound(audioManager.powerUp); // Use powerup sound as placeholder
      }
    }

    requestAnimationFrame(gameLoop);
  } else {
    // Esconder botão do Super Cannon no game over
    // superCannonButton.style.display = 'none'; // Handled in UI update now

    // Salvar high score
    if (gameState.score > gameState.highScore) {
      gameState.highScore = gameState.score;
    }

    // Salvar progresso (moedas e high score)
    saveGameProgress();

    // Salvar Leaderboard
    try {
        const leaderboardStr = localStorage.getItem('crowdLeaderboard') || '[]';
        const leaderboard = JSON.parse(leaderboardStr);
        leaderboard.push({ score: gameState.score, date: Date.now() });
        leaderboard.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
        // Manter top 5
        const top5 = leaderboard.slice(0, 5);
        localStorage.setItem('crowdLeaderboard', JSON.stringify(top5));
    } catch (e) {
        console.error('Erro ao salvar leaderboard', e);
    }

    // Mostrar tela de game over (apenas o último frame do jogo)
    render(ctx, entities, gameState);

    // Parar música e tocar som de game over
    stopAllMusic();
    playSound(audioManager.gameOver);

    // Mostrar UI de Game Over DOM
    showGameOverScreen(gameState);
  }
}

// Avançar para o próximo nível
function advanceToNextLevel(): void {
  // Bonus Coins for clearing level
  const levelBonus = 100 + gameState.currentLevel * 50;
  gameState.coins += levelBonus;
  saveGameProgress(); // Salvar progresso
  addFloatingText(`LEVEL CLEAR! +${levelBonus} 💰`, BASE_WIDTH/2, BASE_HEIGHT/2, '#FFD700', 2.0);
  playSound(audioManager.victory);

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
    createEnemyHorde(BASE_WIDTH, -50, baseEnemies, gameState.currentLevel),
    createEnemyHorde(BASE_WIDTH, -200, baseEnemies + 3, gameState.currentLevel),
  ];
}

// Iniciar jogo
export function startGame(): void {
  resetGameState();
  entities = createInitialEntities(BASE_WIDTH, BASE_HEIGHT);
  initializeMousePosition(BASE_WIDTH);
  setGameStateRef(gameState); // Configurar referência para input de Super Cannon
  wasInBossFight = false; // Resetar flag de boss

  // Esconder overlay de start
  if (startScreen) startScreen.classList.remove('active');

  // Start Countdown then Game
  startCountdown(() => {
    gameState.isStarted = true;

    // Iniciar música
    playSound(audioManager.gameStart);
    setTimeout(() => playMusic(false), 500); // Iniciar música após som de início

    requestAnimationFrame(gameLoop);
  });
}

// Helper function to trigger screen shake (exported to be used by other modules)
export function triggerScreenShake(intensity: number, duration: number): void {
  gameState.screenShakeActive = true;
  gameState.screenShakeIntensity = intensity;
  gameState.screenShakeDuration = duration;
  gameState.screenShakeTimer = duration; // Timer starts at duration and counts down
}

export function triggerHitStop(frames: number): void {
  gameState.hitStop = frames;
}

// Callback de Reinício
const onRestartGame = () => {
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
};

const onShareGame = (platform: 'x' | 'whatsapp') => {
    if (platform === 'x') shareOnX(gameState);
    else shareOnWhatsApp(gameState);
};

// Setup Game Over UI
setupGameOverUI(onRestartGame, onShareGame);

// Restart no clique após game over (apenas para Pause e Interação In-Game)
canvas.addEventListener('click', () => {
  // Se pausado, verificar clique no botão Resume
  if (gameState.isPaused) {
    // Área central para despausar
    togglePause();
    return;
  }
});

canvas.addEventListener('touchstart', (e) => {
  if (gameState.isPaused) {
    e.preventDefault(); // Evitar scroll/zoom
    togglePause();
    return;
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
initializeMousePosition(BASE_WIDTH);
initAudio(); // Inicializar sistema de áudio

// Auto-pause quando a aba for trocada ou minimizada (Mobile friendly)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && gameState.isStarted && !gameState.isGameOver && !gameState.isPaused) {
    togglePause();
  }
});

// Atualizar botão de mute inicial
const muteBtn = document.getElementById('muteBtn');
if (muteBtn) {
  muteBtn.textContent = isMusicMuted() ? '🔇' : '🔊';
}

// Desenhar tela inicial
entities = createInitialEntities(BASE_WIDTH, BASE_HEIGHT);
render(ctx, entities, gameState);

// DEBUG: Função para ir para um level específico (exposta globalmente)
export function debugSetLevel(targetLevel: number): void {
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
  entities = createInitialEntities(BASE_WIDTH, BASE_HEIGHT);

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
    createEnemyHorde(BASE_WIDTH, -50, baseEnemies, targetLevel),
    createEnemyHorde(BASE_WIDTH, -200, baseEnemies + 5, targetLevel),
  ];

  console.log(`🎮 Debug: Indo para Level ${targetLevel}`);

  // Se for level 10+, forçar spawn do boss imediatamente
  if (targetLevel >= 10) {
    gameState.distanceTraveled = gameState.levelDistance - 100;
    console.log(`🛸 Mothership boss aparecerá em breve!`);
  }
}

// Função para pausar/despausar o jogo
export function togglePause(): void {
  if (!gameState.isStarted || gameState.isGameOver) return;

  vibrate(20);

  if (gameState.isPaused) {
    // Resume with countdown
    startCountdown(() => {
      gameState.isPaused = false;
      const pauseBtn = document.getElementById('pauseBtnTop');
      if (pauseBtn) pauseBtn.textContent = '⏸️';
      console.log('⏸️ Jogo retomado');
      requestAnimationFrame(gameLoop);
    });
  } else {
    // Pause immediately
    gameState.isPaused = true;
    const pauseBtn = document.getElementById('pauseBtnTop');
    if (pauseBtn) pauseBtn.textContent = '▶️';
    console.log('⏸️ Jogo pausado');
  }
}

export function toggleMuteUI(): void {
  vibrate(10);
  const muted = toggleMute();
  const btn = document.getElementById('muteBtn');
  if (btn) {
    btn.textContent = muted ? '🔇' : '🔊';
  }
}

export function toggleFullscreen(): void {
  vibrate(10);
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
export function triggerSuperCannon(): void {
  vibrate(25);
  if (gameState.isStarted && !gameState.isGameOver && !gameState.isPaused) {
    activateSuperCannon(gameState);
  }
}

let cachedSuperBtn: HTMLButtonElement | null = null;
let lastSuperText: string = '';
let lastSuperDisabled: boolean | null = null;

// Atualizar estado do botão Super inline
function updateSuperButtonInline(): void {
  if (!cachedSuperBtn) {
    cachedSuperBtn = document.getElementById('superCannonBtnInline') as HTMLButtonElement;
  }

  if (!cachedSuperBtn) return;

  let newText = '';
  let newDisabled = false;

  if (!gameState.isStarted || gameState.isGameOver) {
    newDisabled = true;
    newText = '⚡ SUPER';
  } else {
    const now = Date.now();
    const timeSinceLastUse = now - gameState.superCannonLastUsed;
    const cooldownRemaining = Math.max(0, gameState.superCannonCooldown - timeSinceLastUse);
    const isOnCooldown = cooldownRemaining > 0 && !gameState.superCannonActive;

    if (gameState.superCannonActive) {
      newText = '⚡ ATIVO!';
      newDisabled = true;
    } else if (isOnCooldown) {
      const cooldownSecs = Math.ceil(cooldownRemaining / 1000);
      newText = `⏳ ${cooldownSecs}s`;
      newDisabled = true;
    } else {
      newText = '⚡ SUPER';
      newDisabled = false;
    }
  }

  // Update DOM only if changed
  if (lastSuperText !== newText) {
    cachedSuperBtn.textContent = newText;
    lastSuperText = newText;
  }

  if (lastSuperDisabled !== newDisabled) {
    cachedSuperBtn.disabled = newDisabled;
    lastSuperDisabled = newDisabled;
  }
}

// Expor funções globalmente para o HTML acessar
(window as unknown as {
  debugSetLevel: typeof debugSetLevel;
  togglePause: typeof togglePause;
  triggerSuperCannon: typeof triggerSuperCannon;
  toggleMuteUI: typeof toggleMuteUI;
  toggleFullscreen: typeof toggleFullscreen;
  triggerScreenShake: typeof triggerScreenShake;
}).debugSetLevel = debugSetLevel;

(window as unknown as { togglePause: typeof togglePause }).togglePause = togglePause;
(window as unknown as { triggerSuperCannon: typeof triggerSuperCannon }).triggerSuperCannon = triggerSuperCannon;
(window as unknown as { toggleMuteUI: typeof toggleMuteUI }).toggleMuteUI = toggleMuteUI;
(window as unknown as { toggleFullscreen: typeof toggleFullscreen }).toggleFullscreen = toggleFullscreen;
(window as unknown as { triggerScreenShake: typeof triggerScreenShake }).triggerScreenShake = triggerScreenShake;

// Adicionar atalho de teclado para pause (P ou Escape)
document.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    togglePause();
  }
});
