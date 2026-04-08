// game.ts - Loop principal do jogo Crowd Runner
import { Entities, BeforeInstallPromptEvent } from './types';
import { gameState, resetGameState, saveGameProgress } from './gameState';
import { createInitialEntities, createEnemyHorde, createSoldier, addSpecialSoldiersToArmy, addSoldiersToArmy } from './entities';
import { render, shareOnX, shareOnWhatsApp, addFloatingText, updateFloatingTexts, addParticle } from './renderer';
import { checkCollisions } from './collisions';
import { updateSpawns } from './spawner';
import { updateMovement } from './movement';
import { setupInput, getMouseX, initializeMousePosition, setGameStateRef, triggerHaptic } from './input';
import { setInputScale } from './input-state';
import { updateShooting, updateBullets, updateSuperCannon, activateSuperCannon } from './shooting';
import { initAudio, playMusic, playSound, stopAllMusic, audioManager, isMusicMuted } from './audio';
import { BASE_WIDTH, BASE_HEIGHT, ASPECT_RATIO, COLORS } from './constants';
import { setupShopUI, updateShopUI, setupSuperCannonUI, updateSuperCannonUI, BuyAction, setupGameOverUI, showGameOverScreen, startCountdown, updateStartScreenLeaderboard, setupStartScreenInstallBtn, createPauseModal } from './ui-overlay';
import { QualityManager } from './quality';
import { setupSettingsUI, toggleSettingsMenu } from './ui-settings';
import { MOBILE_RESOLUTION_SCALE } from './constants';

// Canvas setup
export const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Escala atual
let scale = 1;

let cachedSuperBtn: HTMLButtonElement | null = null;
let lastSuperText: string = '';
let lastSuperDisabled: boolean | null = null;

// Fixed Timestep Constants
export const FIXED_TIMESTEP = 1000 / 60; // 60 updates per second (~16.667ms)
let accumulator = 0;

// Função para redimensionar o canvas responsivamente
/* v8 ignore start */
function resizeCanvas(): void {
  const container = canvas.parentElement;
  if (!container) return;

  // Mobile Fullscreen Logic
  const isMobile = window.innerWidth <= 768;

  let newWidth: number;
  let newHeight: number;

  if (isMobile) {
      // Full width on mobile
      newWidth = window.innerWidth;
      // Height is screen height minus UI space (less padding than desktop)
      newHeight = window.innerHeight;

      // Ensure aspect ratio isn't too extreme (e.g., very long phones)
      // We clip the height if it gets too tall relative to width
      const maxAspectRatio = 2.2; // roughly 20:9
      if (newHeight / newWidth > maxAspectRatio) {
          newHeight = newWidth * maxAspectRatio;
      }
  } else {
      // Desktop: Keep constrained
      const maxWidth = Math.min(window.innerWidth - 20, 600);
      const maxHeight = window.innerHeight - 100;

      newWidth = maxWidth;
      newHeight = newWidth / ASPECT_RATIO;

      if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = newHeight * ASPECT_RATIO;
      }
  }

  // Mínimo para não ficar muito pequeno
  newWidth = Math.max(newWidth, 280);
  newHeight = Math.max(newHeight, newWidth / ASPECT_RATIO);

  // Aplicar dimensões de exibição (CSS)
  canvas.style.width = `${newWidth}px`;
  canvas.style.height = `${newHeight}px`;

  // Manter dimensões internas do canvas (resolução do jogo) com suporte a High DPI e Dynamic Resolution
  const quality = QualityManager.getInstance().settings;
  let resolutionScale = quality.resolutionScale || 1.0;

  // Auto-downgrade resolution on mobile for performance (Stable 60fps target)
  if (isMobile && resolutionScale === 1.0) {
      resolutionScale = MOBILE_RESOLUTION_SCALE;
  }

  // Base DPR (capped at 3 for sanity on super high density screens)
  const baseDpr = Math.min(window.devicePixelRatio || 1, 3);
  const effectiveDpr = baseDpr * resolutionScale;

  canvas.width = BASE_WIDTH * effectiveDpr;
  canvas.height = BASE_HEIGHT * effectiveDpr;

  ctx.scale(effectiveDpr, effectiveDpr);

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

/* v8 ignore start */
export function getScale(): number {
  return scale;
}
/* v8 ignore stop */

// Entidades do jogo
let entities: Entities;
export const _testing = {
    getEntities: () => entities,
    setEntities: (e: Entities) => entities = e,
    gameLoop: (t: number) => gameLoop(t),
    resetLoop: () => { lastTime = 0; accumulator = 0; }
};

// Obter referência ao overlay de início
const startScreen = document.getElementById('startScreen');
// startBtnOverlay is accessed dynamically or unused variable here removed

// --- Wake Lock API (Mobile Screen Keep-Alive) ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wakeLock: any = null;

/* v8 ignore start */
async function requestWakeLock() {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wakeLock = await (navigator as any).wakeLock.request('screen');
    } catch (err) {
      /* v8 ignore next */
      console.warn('Wake Lock request failed:', err);
    }
  }
}

/* v8 ignore start */
function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release()
      .then(() => {
        wakeLock = null;
      })
      .catch((err: unknown) => console.warn('Wake Lock release failed:', err));
  }
}
/* v8 ignore stop */
/* v8 ignore stop */

// --- Shop Logic ---
const handleBuy: BuyAction = (type, cost) => {
    if (gameState.coins >= cost) {
        if (type === 'recharge_super') {
           const now = Date.now();
           const cooldownRemaining = Math.max(0, gameState.superCannonCooldown - (now - gameState.superCannonLastUsed));
           if (cooldownRemaining <= 0) {
              /* v8 ignore next 2 */
              addFloatingText('READY!', entities.playerArmy.centerX, entities.playerArmy.centerY, '#FFD700');
              return;
           }
           /* v8 ignore start */
           if (gameState.superCannonReady && !gameState.superCannonActive) {
               // Already ready
               return;
           }
           /* v8 ignore stop */
        }

        gameState.coins -= cost;

        if (type === 'nuke') {
          // 1. Trigger Visuals
          gameState.nukeTimer = 60; // 1 second visual
          /* v8 ignore start */
          triggerScreenShake(20, 800);
          triggerHitStop(10); // Freeze frame impact
          playSound(audioManager.superCannon);
          addFloatingText('⚠️ ORBITAL STRIKE ⚠️', entities.playerArmy.centerX, entities.playerArmy.centerY - 150, '#FF0000', 1.5);
          /* v8 ignore stop */

          // 2. Kill all normal hordes
          /* v8 ignore start */
          entities.enemyHordes.forEach(h => {
            if (h.isActive) {
              h.isActive = false;
            }
          });
          /* v8 ignore stop */

          // 3. Clear Bullets
          entities.bullets = [];
          /* v8 ignore next */

          // 4. Massive Damage to Bosses
          if (entities.boss && entities.boss.isActive) {
            /* v8 ignore start */
            entities.boss.hp -= 5000;
            addFloatingText('-5000', entities.boss.x + entities.boss.width/2, entities.boss.y, '#FF0000', 2);
            /* v8 ignore stop */
          }

          // 5. Massive Damage to MiniBosses
          /* v8 ignore start */
          entities.miniBosses.forEach(mb => {
            if (mb.isActive) {
              mb.hp -= 5000;
              addFloatingText('-5000', mb.x + mb.width/2, mb.y, '#FF0000', 1.5);
            }
          });
          /* v8 ignore stop */

        } else if (type === 'soldier') {
          addSoldiersToArmy(entities.playerArmy, 10);
          /* v8 ignore next 2 */
          addFloatingText('+10 Soldiers', entities.playerArmy.centerX, entities.playerArmy.centerY, '#4A90D9');
          playSound(audioManager.powerUp);
          triggerHaptic('success');
        } else if (type === 'recharge_super') {
          gameState.superCannonLastUsed = 0;
          gameState.superCannonReady = true;
          /* v8 ignore next 2 */
          addFloatingText('SUPER READY!', entities.playerArmy.centerX, entities.playerArmy.centerY, '#FFD700');
          playSound(audioManager.powerUp);
          triggerHaptic('success');
        } else {
          addSpecialSoldiersToArmy(entities.playerArmy, type, 1);
          /* v8 ignore next 2 */
          addFloatingText(`+1 ${type.toUpperCase()}`, entities.playerArmy.centerX, entities.playerArmy.centerY, '#00FF00');
          playSound(audioManager.powerUp);
          triggerHaptic('success');
        }

        // Salvar moedas após compra
        saveGameProgress();
      } else {
        playSound(audioManager.nerf);
        triggerHaptic('warning');
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

      if (gameState.isStarted && !gameState.isGameOver && !gameState.isDying) {
        /* v8 ignore next */
        activateSuperCannon(gameState);
      }
};

setupSuperCannonUI(handleSuperCannon);


// Game loop
let wasInBossFight = false;
let lastTime = 0;

// Exported for testing/logic separation
export function fixedUpdate(dt: number): void {
  // Logic updates use fixed time step (dt)

  // Slow Mo Logic
  let timeScale = 1.0;
  if (gameState.isDying) {
      gameState.slowMoTimer -= dt;
      timeScale = 0.1;

      if (gameState.slowMoTimer <= 0) {
          gameState.isGameOver = true;
          gameState.isDying = false;
      }
  } else if (gameState.slowMoTimer > 0) {
      gameState.slowMoTimer -= dt;
      timeScale = 0.2;
  }

  // Factor relative to 60 FPS (approx 16.67ms)
  const dtFactor = (dt / 16.67) * timeScale;

  // Atualizar screen shake (decay)
  if (gameState.screenShakeTimer > 0) {
    gameState.screenShakeTimer -= dt;
    if (gameState.screenShakeTimer <= 0) {
      gameState.screenShakeActive = false;
      gameState.screenShakeIntensity = 0;
    }
  }

  // Update Damage Flash
  if (gameState.damageFlash > 0) {
    gameState.damageFlash = Math.max(0, gameState.damageFlash - 0.05 * dtFactor);
  }

  // Update White Flash
  if (gameState.whiteFlash > 0) {
    gameState.whiteFlash = Math.max(0, gameState.whiteFlash - 0.02 * dtFactor);
  }

  // Update Entity Hit Timers using O(K) tracking for enemies/bosses
  const activeHits = gameState.activeHitEntities;
  if (activeHits) {
      for (let i = activeHits.length - 1; i >= 0; i--) {
          const entity = activeHits[i];
          if (entity.hitTimer !== undefined && entity.hitTimer > 0) {
              entity.hitTimer -= dtFactor;
          } else {
              // Fast remove when timer expires or becomes undefined
              if (i !== activeHits.length - 1) {
                  activeHits[i] = activeHits[activeHits.length - 1];
              }
              activeHits.pop();
          }
      }
  }

  // Update Player Army hit timers using fast O(N) loop
  // (Ensures any explicitly/implicitly set timers on player soldiers decrement)
  const pSoldiers = entities.playerArmy?.soldiers;
  if (pSoldiers) {
      for (let i = 0; i < pSoldiers.length; i++) {
          const s = pSoldiers[i];
          if (s.hitTimer !== undefined && s.hitTimer > 0) {
              s.hitTimer -= dtFactor;
          }
      }
  }

  // Update Kill Streak
  if (gameState.killStreakTimer > 0) {
    gameState.killStreakTimer -= dt;
    if (gameState.killStreakTimer <= 0) {
      gameState.killStreak = 0;
    }
  }

  // Update Nuke Timer
  if (gameState.nukeTimer > 0) {
    gameState.nukeTimer -= dtFactor;
  }

  // Update Warp Effect Timer
  if (gameState.warpEffectTimer > 0) {
      gameState.warpEffectTimer -= dtFactor;
  }

  // Atualizar movimento
  const inputX = gameState.isDying ? entities.playerArmy.centerX : getMouseX();
  updateMovement(entities, gameState, BASE_WIDTH, inputX, dtFactor);

  // Update Trail
  if (entities.playerArmy.trail) {
    entities.playerArmy.trail.points.push({
        x: entities.playerArmy.centerX,
        y: entities.playerArmy.centerY,
        width: entities.playerArmy.trail.width,
        alpha: 1
    });
    if (entities.playerArmy.trail.points.length > entities.playerArmy.trail.maxLength) {
        entities.playerArmy.trail.points.shift();
    }
  }

  // Limpar Mystery Boxes usando swap-and-pop (movimento tratado em movement.ts)
  for (let i = 0; i < entities.mysteryBoxes.length; i++) {
    const box = entities.mysteryBoxes[i];
    if (!box) continue;

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
  updateSuperCannon(entities, gameState, dt);
  updateFloatingTexts(); // Visual updates (damage numbers)

  // Spawnar elementos
  updateSpawns(entities, BASE_WIDTH, gameState, dtFactor);

  // Verificar colisões
  checkCollisions(entities, gameState);

  // Check Low Army Warning
  const armyCount = entities.playerArmy.aliveCount;
  if (armyCount < 10 && armyCount > 0 && !gameState.isGameOver && gameState.isStarted) {
     if (!gameState.lowArmyTriggered) {
        gameState.lowArmyTriggered = true;
        triggerHaptic('warning');
        addFloatingText("⚠️ LOW ARMY! ⚠️", entities.playerArmy.centerX, entities.playerArmy.centerY - 50, "#FF4500", 1.2);
     }
  } else if (armyCount >= 10) {
     gameState.lowArmyTriggered = false;
  }

  // Atualizar combo timer
  if (gameState.comboTimer > 0) {
    gameState.comboTimer -= dt;
    if (gameState.comboTimer <= 0) {
      gameState.combo = 0;
      gameState.comboTimer = 0;
      gameState.comboTier = 0; // Reset tier
    }
  }

  // Update Combo Tier
  let newTier = 0;
  if (gameState.combo >= 50) newTier = 5;
  else if (gameState.combo >= 20) newTier = 4;
  else if (gameState.combo >= 10) newTier = 3;
  else if (gameState.combo >= 5) newTier = 2;
  else if (gameState.combo >= 2) newTier = 1;

  if (newTier > gameState.comboTier) {
      // Tier Up!
      gameState.comboTier = newTier;
      triggerHaptic('medium');
      triggerScreenShake(5, 200);
      addParticle(entities.playerArmy.centerX, entities.playerArmy.centerY, 'confetti', COLORS.UI.GOLD, 10);
      // Visual flair handled in renderer
  } else if (newTier < gameState.comboTier && gameState.combo > 0) {
      // Degrade tier gracefully only if combo drops significantly (unlikely with timer logic, but safe)
      gameState.comboTier = newTier;
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
      triggerHaptic('success');
    } else if (!gameState.isGameOver) {
      // Avançar normal para outros níveis
      advanceToNextLevel();
    }
  }

  // Check High Score Real-time
  if (!gameState.isGameOver && gameState.score > gameState.highScore && gameState.highScore > 0) {
      if (!gameState.newRecordReached) {
        gameState.newRecordReached = true;
        addFloatingText("👑 NEW RECORD! 👑", BASE_WIDTH/2, 200, "#FFD700", 2);
        triggerScreenShake(15, 800);
        playSound(audioManager.powerUp);
      }
  }

  // Check and update High Score Distance if needed (real-time for Record Line visualization)
  if (gameState.distanceTraveled > gameState.highScoreDistance) {
      gameState.highScoreDistance = gameState.distanceTraveled;
  }
}

function gameLoop(currentTime: number = 0): void {
  /* v8 ignore start */
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    requestAnimationFrame(gameLoop);
    return;
  }
  if (!gameState.isStarted) return;
  /* v8 ignore stop */

  // Power Saving Mode: Cap FPS to 30
  const quality = QualityManager.getInstance().settings;
  if (quality.powerSavingMode) {
      // If time since last frame is less than 33ms (approx 30fps), skip
      if (currentTime - lastTime < 32) {
          requestAnimationFrame(gameLoop);
          return;
      }
  }

  // Se pausado, apenas renderizar e esperar
  if (gameState.isPaused) {
    render(ctx, entities, gameState);
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

  // Cap delta time to prevent spiral of death on lag spikes (max 50ms)
  if (deltaTime > 50) deltaTime = 50;

  // Monitor Performance
  QualityManager.getInstance().updateFPS(deltaTime);
  QualityManager.getInstance().checkRecovery(deltaTime);

  // Accumulator Logic
  accumulator += deltaTime;
  while (accumulator >= FIXED_TIMESTEP) {
      fixedUpdate(FIXED_TIMESTEP);
      accumulator -= FIXED_TIMESTEP;
  }

  // UI Updates (Run once per frame)
  updateSuperCannonUI(gameState);
  updateSuperButtonInline();
  updateShopUI(gameState);

  // Renderizar (Interpolation could be added here, but simple state render is fine for this style)
  render(ctx, entities, gameState);

  // Continuar loop
  if (!gameState.isGameOver) {
    requestAnimationFrame(gameLoop);
  } else {
    // Esconder botão do Super Cannon no game over
    // superCannonButton.style.display = 'none'; // Handled in UI update now

    // Salvar high score
    /* v8 ignore next 3 */
    if (gameState.score > gameState.highScore) {
      gameState.highScore = gameState.score;
    }

    // Salvar High Score Distance
    if (gameState.distanceTraveled > gameState.highScoreDistance) {
        gameState.highScoreDistance = gameState.distanceTraveled;
    }

    // Salvar progresso (moedas e high score)
    saveGameProgress();

    // Salvar Leaderboard
    try {
        const leaderboardStr = localStorage.getItem('crowdLeaderboard') || '[]';
        let leaderboard = JSON.parse(leaderboardStr);
        if (!Array.isArray(leaderboard)) {
            leaderboard = [];
        } else {
            // Sanitize existing entries to prevent crashes during sort
            leaderboard = leaderboard.filter((entry: any) => entry && typeof entry === 'object' && typeof entry.score === 'number');
        }
        leaderboard.push({ score: gameState.score, date: Date.now() });
        leaderboard.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
        // Manter top 5
        const top5 = leaderboard.slice(0, 5);
        localStorage.setItem('crowdLeaderboard', JSON.stringify(top5));
    } catch (e) {
        /* v8 ignore next */
        console.error('Erro ao salvar leaderboard', e);
    }

    // Mostrar tela de game over (apenas o último frame do jogo)
    render(ctx, entities, gameState);

    // Parar música e tocar som de game over
    stopAllMusic();
    playSound(audioManager.gameOver);
    triggerHaptic('failure'); // Heavy vibration on loss

    releaseWakeLock(); // Allow screen to sleep

    // Mostrar UI de Game Over DOM
    showGameOverScreen(gameState);
  }
}

// Avançar para o próximo nível
function advanceToNextLevel(): void {
  // Bonus Coins for clearing level
  const levelBonus = 100 + gameState.currentLevel * 50;
  gameState.coins += levelBonus;
  /* v8 ignore next */
  saveGameProgress(); // Salvar progresso
  /* v8 ignore next 2 */
  addFloatingText(`LEVEL CLEAR! +${levelBonus} 💰`, BASE_WIDTH/2, BASE_HEIGHT/2, '#FFD700', 2.0);
  playSound(audioManager.victory);
  triggerHaptic('success');

  gameState.currentLevel++;
  gameState.distanceTraveled = 0;
  gameState.levelDistance += 900; // Incremento 3x maior por level (era 300)
  gameState.isVictory = false;
  gameState.gameSpeed = Math.min(1.5, gameState.baseGameSpeed + gameState.currentLevel * 0.08); // Máximo 1.5x, incremento menor

  // Trigger Warp Effect
  gameState.warpEffectTimer = 60; // 1 second roughly at 60fps

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

  // Set Start Time for Stats
  gameState.runStartTime = Date.now();
  gameState.totalKills = 0;

  // Esconder overlay de start
  if (startScreen) startScreen.classList.remove('active');

  // Start Countdown then Game
  startCountdown(() => {
    gameState.isStarted = true;
    requestWakeLock(); // Keep screen on

    // Iniciar música
    playSound(audioManager.gameStart);
    setTimeout(() => playMusic(false), 500); // Iniciar música após som de início

    // Tutorial Hint
    /* v8 ignore next */
    addFloatingText("HOLD & DRAG", BASE_WIDTH / 2, BASE_HEIGHT / 2 + 100, "#FFFFFF", 1.5);

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
      /* v8 ignore next 4 */
      advanceToNextLevel();
      gameState.isGameOver = false;
      gameState.isStarted = true;
      requestAnimationFrame(gameLoop);
    } else {
      // Reiniciar jogo
      startGame();
    }
};

/* v8 ignore start */
const onShareGame = (platform: 'x' | 'whatsapp') => {
    if (platform === 'x') shareOnX(gameState);
    else shareOnWhatsApp(gameState);
};
/* v8 ignore stop */

// Setup Game Over UI
setupGameOverUI(onRestartGame, onShareGame);

// Restart no clique após game over (apenas para Pause e Interação In-Game)
canvas.addEventListener('click', () => {
  // Se pausado, verificar clique no botão Resume
  /* v8 ignore start */
  if (gameState.isPaused) {
    // Área central para despausar
    togglePause();
    return;
  }
  /* v8 ignore stop */
});

canvas.addEventListener('touchstart', (e) => {
  /* v8 ignore start */
  if (gameState.isPaused) {
    e.preventDefault(); // Evitar scroll/zoom
    togglePause();
    return;
  }
  /* v8 ignore stop */
}, { passive: false });

// Event listeners
if (startScreen) {
  startScreen.addEventListener('click', startGame);
}
// UI Event Listeners (Security Fix: Removed inline handlers)
const pauseBtnTop = document.getElementById('pauseBtnTop');
if (pauseBtnTop) pauseBtnTop.addEventListener('click', () => togglePause());

const settingsBtn = document.getElementById('settingsBtn');
if (settingsBtn) settingsBtn.addEventListener('click', () => toggleSettingsMenu());

const storyBtn = document.querySelector('.story-btn');
if (storyBtn) storyBtn.addEventListener('click', () => {
     const modal = document.getElementById('storyModal');
     if (modal) modal.classList.add('active');
});

const storyCloseBtn = document.querySelector('.story-close-btn');
if (storyCloseBtn) storyCloseBtn.addEventListener('click', () => {
     const modal = document.getElementById('storyModal');
     if (modal) modal.classList.remove('active');
});

const goBtn = document.querySelector('.go-btn');
const levelSelector = document.getElementById('levelSelector') as HTMLSelectElement;
if (goBtn && levelSelector) {
     goBtn.addEventListener('click', () => {
         const lvl = parseInt(levelSelector.value);
         debugSetLevel(lvl);
     });
}

const superCannonBtnInline = document.getElementById('superCannonBtnInline');
if (superCannonBtnInline) {
     superCannonBtnInline.addEventListener('click', () => {
         triggerSuperCannon();
     });
}


// Resize handler
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
  setTimeout(resizeCanvas, 100); // Delay para orientação estabilizar
});

// Setup inicial
/* v8 ignore next */
console.log(`Crowd Runner v1.1.0 - Build: ${new Date().toISOString()}`);
resizeCanvas(); // Configurar tamanho inicial
setupInput(canvas, (screenX, screenY) => {
    // Touch ripple effect
    const pos = screenToCanvas(screenX, screenY);
    addParticle(pos.x, pos.y, 'shockwave', COLORS.PLAYER.NORMAL, 1);
    addParticle(pos.x, pos.y, 'spark', '#FFFFFF', 3);
});
initializeMousePosition(BASE_WIDTH);
initAudio(); // Inicializar sistema de áudio
setupSettingsUI(debugSetLevel); // Inicializar Settings UI
updateStartScreenLeaderboard(); // Show leaderboard on start

// Auto-pause quando a aba for trocada ou minimizada (Mobile friendly)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && gameState.isStarted && !gameState.isGameOver && !gameState.isPaused) {
    togglePause();
  }
  // Re-acquire lock if returning
  /* v8 ignore next 3 */
  if (!document.hidden && gameState.isStarted && !gameState.isPaused) {
    requestWakeLock();
  }
});

// Atualizar botão de mute inicial
const muteBtn = document.getElementById('muteBtn');
/* v8 ignore start */
if (muteBtn) {
  muteBtn.textContent = isMusicMuted() ? '🔇' : '🔊';
}
/* v8 ignore stop */

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
    /* v8 ignore next */
    console.log(`🛸 Mothership boss aparecerá em breve!`);
  }
}

// Função para pausar/despausar o jogo
export function togglePause(): void {
  if (!gameState.isStarted || gameState.isGameOver) return;

  triggerHaptic('light');

  // Ensure modal exists (lazy creation)
  createPauseModal(
    () => togglePause(), // Resume
    () => {
        // Force unpause explicitly to avoid resume countdown
        gameState.isPaused = false;
        const m = document.getElementById('pauseModal');
        if (m) m.style.display = 'none';
        startGame();
    },
    () => toggleSettingsMenu()
  );

  const modal = document.getElementById('pauseModal');

  if (gameState.isPaused) {
    // Resume with countdown
    if (modal) modal.style.display = 'none';

    startCountdown(() => {
      gameState.isPaused = false;
      requestWakeLock();
      const pauseBtn = document.getElementById('pauseBtnTop');
      if (pauseBtn) pauseBtn.textContent = '⏸️';
      console.log('⏸️ Jogo retomado');
      requestAnimationFrame(gameLoop);
    });
  } else {
    // Pause immediately
    gameState.isPaused = true;
    releaseWakeLock();
    const pauseBtn = document.getElementById('pauseBtnTop');
    if (pauseBtn) pauseBtn.textContent = '▶️';
    console.log('⏸️ Jogo pausado');
    if (modal) modal.style.display = 'flex';
  }
}

export function toggleFullscreen(): void {
  triggerHaptic('light');
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      /* v8 ignore next */
      console.log(`Error attempting to enable fullscreen: ${err.message}`);
    });
  } else {
    /* v8 ignore start */
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
    /* v8 ignore stop */
  }
}

// Função para ativar super cannon (exposta para HTML)
export function triggerSuperCannon(): void {
  triggerHaptic('medium');
  /* v8 ignore start */
  if (gameState.isStarted && !gameState.isGameOver && !gameState.isPaused && !gameState.isDying) {
    activateSuperCannon(gameState);
  }
  /* v8 ignore stop */
}

// Atualizar estado do botão Super inline
/* v8 ignore start */
function updateSuperButtonInline(): void {
  if (typeof document === 'undefined') return;

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
/* v8 ignore stop */

// Expor funções globalmente para o HTML acessar
(window as unknown as {
  debugSetLevel: typeof debugSetLevel;
  togglePause: typeof togglePause;
  triggerSuperCannon: typeof triggerSuperCannon;
  triggerScreenShake: typeof triggerScreenShake;
  toggleSettingsMenu: typeof toggleSettingsMenu;
}).debugSetLevel = debugSetLevel;

(window as unknown as { togglePause: typeof togglePause }).togglePause = togglePause;
(window as unknown as { triggerSuperCannon: typeof triggerSuperCannon }).triggerSuperCannon = triggerSuperCannon;
(window as unknown as { triggerScreenShake: typeof triggerScreenShake }).triggerScreenShake = triggerScreenShake;
(window as unknown as { toggleSettingsMenu: typeof toggleSettingsMenu }).toggleSettingsMenu = toggleSettingsMenu;

// Adicionar atalho de teclado para pause (P ou Escape)
document.addEventListener('keydown', (e) => {
  /* v8 ignore start */
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    togglePause();
  }
  if (e.key === ' ') {
    triggerSuperCannon();
  }
  /* v8 ignore stop */
});

// Capture PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
  /* v8 ignore start */
  const event = e as BeforeInstallPromptEvent;
  // Prevent the mini-infobar from appearing on mobile
  event.preventDefault();
  // Stash the event so it can be triggered later.
  gameState.deferredInstallPrompt = event;
  console.log('📱 PWA Install Prompt captured');

  // If on Start Screen, show button immediately
  if (!gameState.isStarted) {
      setupStartScreenInstallBtn(event);
  }
  /* v8 ignore stop */
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('SW Registered'))
      .catch((err) => console.log('SW Failed', err));
  });
}
