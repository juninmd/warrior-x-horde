// game.ts - Loop principal do jogo Crowd Runner
import { Entities, BeforeInstallPromptEvent } from './types';
import { gameState, resetGameState, saveGameProgress } from './gameState';
import { createInitialEntities, createEnemyHorde, createSoldier } from './entities';
import { setWorldLayer, render, shareOnX, shareOnWhatsApp, addFloatingText, updateFloatingTexts, addParticle } from './renderer';
import { checkCollisions } from './collisions';
import { resetHudAnim } from './hud';
import { purchase } from './shop';
import { resetShop, tickShop } from './shop-catalog';
import { rollOffers, pickPerk, resetPerks, refillShield, getMods, getTakenPerks, BASE_SUPER_COOLDOWN } from './perks';
import { showPerkChoice, isPerkChoiceOpen } from './ui-perks';
import { playIntro, shouldAutoPlayIntro, isIntroPlaying } from './cinematic';
import { showRadioBanner, showChapterBanner, showBossBanner, hideStoryBanner } from './story';
import { updateBossAttacks, resolveEnemyBullets } from './boss-ai';
import { updateEnemyRanged } from './enemy-ai';
import { updateSpawns, resetSpawnerState } from './spawner';
import { updateMovement } from './movement';
import { setupInput, getMouseX, initializeMousePosition, setGameStateRef, triggerHaptic } from './input';
import { setInputScale } from './input-state';
import { updateShooting, updateBullets, updateSuperCannon, activateSuperCannon } from './shooting';
import { initAudio, playMusic, playSound, stopAllMusic, audioManager, isMusicMuted } from './audio';
import { BASE_WIDTH, BASE_HEIGHT, ASPECT_RATIO, COLORS } from './constants';
import { setupShopUI, updateShopUI, setupSuperCannonUI, updateSuperCannonUI, BuyAction, setupGameOverUI, showGameOverScreen, startCountdown, updateStartScreenLeaderboard, setupStartScreenInstallBtn, createPauseModal } from './ui-overlay';
import { QualityManager } from './quality';
import { initPixiLayer, PixiLayer } from './pixi-layer';
import { setupSettingsUI, toggleSettingsMenu } from './ui-settings';
import { renderSkinSelector } from './ui-skins';
import { MOBILE_RESOLUTION_SCALE } from './constants';

// Canvas setup
export const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: false })!;

// Camadas empilhadas: gameCanvas (mundo 2D) < pixiCanvas (WebGL: unidades) < hudCanvas (HUD/efeitos)
let pixiLayer: PixiLayer | null = null;
let hudCanvas: HTMLCanvasElement | null = null;
let hudCtx: CanvasRenderingContext2D | null = null;
let layerDpr = 1;

// Escala atual
let scale = 1;

// Fixed Timestep Constants
export const FIXED_TIMESTEP = 1000 / 60; // 60 updates per second (~16.667ms)
let accumulator = 0;

// Função para redimensionar o canvas responsivamente
/* v8 ignore start */
function resizeCanvas(): void {
  const container = canvas.parentElement;
  if (!container) return;

  // O canvas SEMPRE mantém a proporção do jogo (sem esticar sprites). No mobile ocupa a tela toda
  // (letterbox vertical em telas mais altas); no desktop reserva espaço para título e dica.
  const isMobile = window.innerWidth <= 768;
  const availW = (isMobile ? window.innerWidth : Math.min(window.innerWidth - 20, 600)) - 4; /* padding do wrapper */
  const shortScreen = window.innerHeight < 560; // paisagem em celular
  const availH = window.innerHeight - (isMobile || shortScreen ? 8 : 130);

  let newWidth = availW;
  let newHeight = newWidth / ASPECT_RATIO;
  if (newHeight > availH) {
    newHeight = availH;
    newWidth = newHeight * ASPECT_RATIO;
  }

  // Mínimo para não ficar muito pequeno
  const minW = shortScreen ? 150 : 240;
  if (newWidth < minW) { newWidth = minW; newHeight = newWidth / ASPECT_RATIO; }

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

  // Base DPR (capped at 2 for performance on mobile devices with extremely high pixel density)
  const baseDpr = Math.min(window.devicePixelRatio || 1, 2);
  const effectiveDpr = baseDpr * resolutionScale;

  canvas.width = BASE_WIDTH * effectiveDpr;
  canvas.height = BASE_HEIGHT * effectiveDpr;

  ctx.scale(effectiveDpr, effectiveDpr);
  layerDpr = effectiveDpr;
  syncLayers();

  // Calcular escala para eventos de input
  scale = newWidth / BASE_WIDTH;
  setInputScale(scale);
}
/* v8 ignore stop */

/* v8 ignore start */
function syncLayers(): void {
  // Usa o tamanho renderizado real (CSS max-width/max-height podem limitar o style inline)
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  const place = (el: HTMLElement) => {
    el.style.position = 'absolute';
    el.style.left = `${canvas.offsetLeft}px`;
    el.style.top = `${canvas.offsetTop}px`;
    el.style.width = `${cssWidth}px`;
    el.style.height = `${cssHeight}px`;
    el.style.pointerEvents = 'none';
    el.style.borderRadius = 'calc(var(--r-lg) - 2px)';
  };
  if (pixiLayer) {
    pixiLayer.resize(BASE_WIDTH, BASE_HEIGHT, layerDpr);
    place(pixiLayer.app.canvas as HTMLCanvasElement);
  }
  if (hudCanvas && hudCtx) {
    hudCanvas.width = BASE_WIDTH * layerDpr;
    hudCanvas.height = BASE_HEIGHT * layerDpr;
    hudCtx.setTransform(layerDpr, 0, 0, layerDpr, 0, 0);
    place(hudCanvas);
  }
}

async function setupPixi(): Promise<void> {
  const wrapper = canvas.parentElement;
  if (!wrapper) return;
  const layer = await initPixiLayer(wrapper);
  if (!layer) return; // sem WebGL: segue em Canvas2D puro
  pixiLayer = layer;
  hudCanvas = document.createElement('canvas');
  hudCanvas.id = 'hudCanvas';
  hudCanvas.setAttribute('aria-hidden', 'true');
  hudCtx = hudCanvas.getContext('2d')!;
  wrapper.appendChild(hudCanvas);
  // Overlays (start screen, modais) devem ficar acima das camadas
  wrapper.querySelectorAll<HTMLElement>('.glass-overlay').forEach(el => wrapper.appendChild(el));
  syncLayers();
  setWorldLayer(layer, hudCtx);
  // O layout pode mudar depois do resize (max-width, fontes, safe-area): mantém camadas alinhadas
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => syncLayers()).observe(canvas);
  document.documentElement.dataset.renderer = 'pixi';
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
let wakeLock: WakeLockSentinel | null = null;

/* v8 ignore start */
async function requestWakeLock() {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
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
const handleBuy: BuyAction = (type) => {
    const res = purchase(type, entities, gameState);
    const army = entities.playerArmy;

    if (!res.ok) {
        playSound(audioManager.nerf);
        triggerHaptic('warning');
        /* v8 ignore start */
        const why: Record<string, string> = { coins: 'Moedas insuficientes', cooldown: 'Em recarga...', ready: 'Super já está pronto!', max: 'Escudo no máximo', unknown: '' };
        if (res.reason && why[res.reason]) addFloatingText(why[res.reason], army.centerX, army.centerY - 60, '#FF6B6B', 0.9);
        /* v8 ignore stop */
        return;
    }

    /* v8 ignore start */
    const label = res.item?.label ?? type;
    addFloatingText(`${res.item?.icon ?? ''} ${label}`, army.centerX, army.centerY - 40, res.item?.color ?? '#FFFFFF', 1.1);
    /* v8 ignore stop */

    if (type === 'nuke') {
      gameState.nukeTimer = 60; // 1 second visual
      /* v8 ignore start */
      triggerScreenShake(20, 800);
      triggerHitStop(10); // Freeze frame impact
      playSound(audioManager.superCannon);
      addFloatingText(`⚠️ ORBITAL STRIKE: ${res.kills ?? 0} abates ⚠️`, army.centerX, army.centerY - 150, '#FF0000', 1.5);
      /* v8 ignore stop */
    } else {
      playSound(audioManager.powerUp);
      triggerHaptic('success');
    }

    // Salvar moedas após compra
    saveGameProgress();
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
let radioShownLevel = 0;
let lastTime = 0;
// Wall-clock timestamp when the game was paused, used to keep the Date.now()-based
// Super Cannon cooldown from elapsing while paused (would otherwise recharge for free).
let pauseStartTime = 0;
let resuming = false;

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
  updateBossAttacks(entities, gameState, dtFactor);
  updateEnemyRanged(entities, gameState, dtFactor);
  if (radioShownLevel !== gameState.currentLevel && gameState.distanceTraveled >= gameState.levelDistance * 0.5 && !entities.boss) {
    radioShownLevel = gameState.currentLevel;
    showRadioBanner(gameState.currentLevel);
  }
  if (entities.boss && entities.boss.isActive && !entities.boss.introShown) {
    entities.boss.introShown = true;
    showBossBanner(entities.boss.type);
  }
  resolveEnemyBullets(entities, gameState);
  updateSuperCannon(entities, gameState, dt);
  tickShop(dt);
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
            const sanitized = [];
            for (let i = 0; i < leaderboard.length; i++) {
                const entry = leaderboard[i];
                if (entry && typeof entry === 'object' && typeof (entry as {score?: unknown}).score === 'number') {
                    sanitized.push(entry);
                }
            }
            leaderboard = sanitized;
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
/** Pauses the run and lets the player pick a perk, then resumes with the next chapter banner. */
function offerPerks(clearedLevel: number): void {
  const offers = rollOffers(3);
  if (offers.length === 0) {
    showChapterBanner(gameState.currentLevel);
    return;
  }
  gameState.isPaused = true;
  const pausedAt = Date.now();
  showPerkChoice(offers, clearedLevel, (id) => {
    pickPerk(id, entities);
    gameState.superCannonCooldown = BASE_SUPER_COOLDOWN * getMods().superCooldownMult;
    gameState.superCannonLastUsed += Date.now() - pausedAt; // cooldown must not tick while choosing
    refillShield();
    gameState.isPaused = false;
    lastTime = 0;
    showChapterBanner(gameState.currentLevel);
    requestAnimationFrame(gameLoop);
  });
}

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

  const clearedLevel = gameState.currentLevel;
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

  offerPerks(clearedLevel);
}

// Iniciar jogo
// Cada chamada a startGame invalida a contagem regressiva anterior: sem isso,
// dois startGame() próximos (ex.: pular de nível durante a contagem) deixariam
// dois loops de animação vivos ao mesmo tempo.
let startToken = 0;

export function startGame(): void {
  const token = ++startToken;
  radioShownLevel = 0;
  resetHudAnim();
  resetShop();
  hideStoryBanner();
  resetPerks();
  gameState.superCannonCooldown = BASE_SUPER_COOLDOWN;
  resetGameState();
  resetSpawnerState(); // Clear carried-over mini-boss spawn counter from prior run
  entities = createInitialEntities(BASE_WIDTH, BASE_HEIGHT);
  initializeMousePosition(BASE_WIDTH);
  setGameStateRef(gameState); // Configurar referência para input de Super Cannon
  wasInBossFight = false; // Resetar flag de boss

  // Set Start Time for Stats
  gameState.runStartTime = Date.now();
  gameState.totalKills = 0;

  // Esconder overlay de start e mostrar controles do topo
  if (startScreen) startScreen.classList.remove('active');
  const topControls = document.querySelector('.top-controls');
  if (topControls) topControls.classList.add('active');

  // Start Countdown then Game
  startCountdown(() => {
    if (token !== startToken) return; // uma partida mais recente já assumiu
    gameState.isStarted = true;
    requestWakeLock(); // Keep screen on

    // Iniciar música
    playSound(audioManager.gameStart);
    setTimeout(() => playMusic(false), 500); // Iniciar música após som de início

    // Tutorial Hint
    /* v8 ignore next */
    addFloatingText("HOLD & DRAG", BASE_WIDTH / 2, BASE_HEIGHT / 2 + 100, "#FFFFFF", 1.5);
    showChapterBanner(gameState.currentLevel);

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
/** Starts a run; the very first visit watches the story intro first. */
export function beginRun(): void {
  if (isIntroPlaying()) return;
  if (shouldAutoPlayIntro()) {
    playIntro(() => startGame());
    return;
  }
  startGame();
}

if (startScreen) {
  startScreen.addEventListener('click', beginRun);
}

const storyBtn = document.getElementById('storyBtn');
if (storyBtn) {
  storyBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // do not start the run
    playIntro(() => { /* back to the start screen */ });
  });
}
// UI Event Listeners (Security Fix: Removed inline handlers)
const pauseBtnTop = document.getElementById('pauseBtnTop');
if (pauseBtnTop) pauseBtnTop.addEventListener('click', () => togglePause());

const settingsBtn = document.getElementById('settingsBtn');
if (settingsBtn) settingsBtn.addEventListener('click', () => toggleSettingsMenu());

const storyCloseBtn = document.querySelector('.story-close-btn');
if (storyCloseBtn) storyCloseBtn.addEventListener('click', () => {
     const modal = document.getElementById('storyModal');
     if (modal) modal.classList.remove('active');
});


// Resize handler
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
  setTimeout(resizeCanvas, 100); // Delay para orientação estabilizar
});

// Setup inicial
/* v8 ignore next */
console.log(`Crowd Runner v1.1.0 - Build: ${new Date().toISOString()}`);
resizeCanvas(); // Configurar tamanho inicial
void setupPixi();

// Hook de observabilidade para testes e2e (somente em dev)
/* v8 ignore start */
if (import.meta.env.DEV) {
  (window as unknown as { __wxh: unknown }).__wxh = {
    armyX: () => entities?.playerArmy.centerX,
    armyAlive: () => entities?.playerArmy.aliveCount,
    mouseX: () => getMouseX(),
    pixiSprites: () => pixiLayer?.visibleSprites() ?? -1,
    score: () => gameState.score,
    isGameOver: () => gameState.isGameOver,
    isStarted: () => gameState.isStarted,
    perks: () => getTakenPerks().map(p => [p.perk.id, p.count]),
    perkOpen: () => isPerkChoiceOpen(),
    givePerk: (id: string) => pickPerk(id, entities),
    setCombo: (n: number) => { gameState.combo = n; gameState.comboTimer = 5000; },
    addScore: (n: number) => { gameState.score += n; },
    distance: () => gameState.distanceTraveled,
    enemyKinds: () => {
      const out = { runner: 0, tank: 0, spitter: 0 };
      for (const h of entities?.enemyHordes ?? []) for (const u of h.soldiers) if (u.isAlive && u.kind) out[u.kind]++;
      return out;
    },
    isPaused: () => gameState.isPaused,
    setCoins: (n: number) => { gameState.coins = n; },
    goToLevel: (n: number) => debugSetLevel(n),
    boss: () => entities?.boss ? { type: entities.boss.type, hp: entities.boss.hp, maxHp: entities.boss.maxHp, y: entities.boss.y, phase: entities.boss.phase ?? 0, telegraph: entities.boss.telegraph ?? 0 } : null,
    setBossHpRatio: (r: number) => { if (entities?.boss) entities.boss.hp = Math.max(1, entities.boss.maxHp * r); },
    killBoss: () => { if (entities?.boss) entities.boss.hp = 1; },
    enemyBullets: () => entities?.bullets.filter(b => b.isEnemy).length ?? 0,
    coins: () => gameState.coins,
    // Jumps straight to the boss fight, clearing random hordes so the check is deterministic
    forceBoss: () => {
      if (entities) { entities.enemyHordes = []; entities.miniBosses = []; }
      gameState.distanceTraveled = gameState.levelDistance * 0.9;
    },
    level: () => gameState.currentLevel,
    victory: () => gameState.isVictory,
  };
}
/* v8 ignore stop */
setupInput(canvas, (screenX, screenY) => {
    // Touch ripple effect
    const pos = screenToCanvas(screenX, screenY);
    addParticle(pos.x, pos.y, 'shockwave', COLORS.PLAYER.NORMAL, 1);
    addParticle(pos.x, pos.y, 'spark', '#FFFFFF', 3);
});
initializeMousePosition(BASE_WIDTH);
initAudio(); // Inicializar sistema de áudio
setupSettingsUI(debugSetLevel); // Inicializar Settings UI

// Ordem na tela inicial: skins primeiro, leaderboard depois, CTA por último
renderSkinSelector(() => {
  entities = createInitialEntities(BASE_WIDTH, BASE_HEIGHT);
  render(ctx, entities, gameState);
});
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
  showChapterBanner(targetLevel);
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
  if (!gameState.isStarted || gameState.isGameOver || isPerkChoiceOpen()) return;

  triggerHaptic('light');

  // Ensure modal exists (lazy creation)
  createPauseModal(
    () => togglePause(), // Resume
    () => {
        // Force unpause explicitly to avoid resume countdown
        gameState.isPaused = false;
        resuming = false;
        const m = document.getElementById('pauseModal');
        if (m) m.style.display = 'none';
        startGame();
    },
    () => toggleSettingsMenu()
  );

  const modal = document.getElementById('pauseModal');

  if (gameState.isPaused) {
    if (resuming) return; // countdown already running: avoid a second game loop
    resuming = true;
    // Resume with countdown.
    // Shift the wall-clock cooldown stamp forward by the paused duration so the
    // Super Cannon does not recharge while the game is frozen.
    gameState.superCannonLastUsed += Date.now() - pauseStartTime;

    if (modal) {
        modal.classList.remove('active');
        // isPaused stays true during the resume countdown, so key off the 'active' class instead
        setTimeout(() => { if (!modal.classList.contains('active')) modal.style.display = 'none'; }, 200);
    }

    startCountdown(() => {
      resuming = false;
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
    pauseStartTime = Date.now();
    releaseWakeLock();
    const pauseBtn = document.getElementById('pauseBtnTop');
    if (pauseBtn) pauseBtn.textContent = '▶️';
    console.log('⏸️ Jogo pausado');
    if (modal) {
        modal.style.display = 'flex';
        void modal.offsetWidth; // Force reflow
        modal.classList.add('active');
    }
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
