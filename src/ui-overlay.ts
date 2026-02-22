// ui-overlay.ts - Manages HTML/DOM overlays
import { COLORS } from './constants';
import { GameState, BeforeInstallPromptEvent } from './types';
import { vibrate } from './input';

// Container elements (Declared at top to avoid TDZ)
let shopContainer: HTMLElement | null = null;
let superCannonContainer: HTMLElement | null = null;
let gameOverContainer: HTMLElement | null = null;

// Buttons
const buttons: Record<string, HTMLButtonElement> = {};

function getLeaderboardHTML(currentScore: number = -1): string {
    let leaderboard = [];
    try {
        leaderboard = JSON.parse(localStorage.getItem('crowdLeaderboard') || '[]');
        if (!Array.isArray(leaderboard)) leaderboard = [];
    } catch (e) {
        console.error('Failed to load leaderboard', e);
        leaderboard = [];
    }

    if (leaderboard.length === 0) return '';

    const items = leaderboard.map((entry: { score: number }, index: number) => {
        let safeScore = Number(entry.score);
        if (isNaN(safeScore) || !isFinite(safeScore)) safeScore = 0;
        safeScore = Math.floor(safeScore);

        const isCurrent = safeScore === currentScore;
        const currentClass = isCurrent ? 'current' : '';
        const textColor = isCurrent ? '#FFF' : '#AAA';
        const weight = isCurrent ? '800' : 'normal';
        const rankColor = index === 0 ? '#FFD700' : (index === 1 ? '#C0C0C0' : (index === 2 ? '#CD7F32' : textColor));

        return `
        <div class="leaderboard-item ${currentClass}">
            <span style="color: ${rankColor}; font-weight: bold; font-size: 14px; width: 30px;">#${index + 1}</span>
            <span style="color: ${textColor}; font-weight: ${weight}; font-size: 14px; font-family: monospace;">${safeScore.toLocaleString()}</span>
        </div>
        `;
    }).join('');

    return `
    <div class="leaderboard-box">
        <h3 class="leaderboard-title">Top Commanders</h3>
        <div class="leaderboard-list">
            ${items}
        </div>
    </div>
    `;
}

export function updateStartScreenLeaderboard(): void {
    const startScreenContent = document.querySelector('.start-screen-content');
    if (!startScreenContent) return;

    let lbContainer = document.getElementById('startScreenLeaderboard');
    if (lbContainer) lbContainer.remove();

    const lbHTML = getLeaderboardHTML();
    if (!lbHTML) return;

    lbContainer = document.createElement('div');
    lbContainer.id = 'startScreenLeaderboard';
    lbContainer.innerHTML = lbHTML;

    const btn = startScreenContent.querySelector('.start-btn');
    if (btn) {
        startScreenContent.insertBefore(lbContainer, btn);
    } else {
        startScreenContent.appendChild(lbContainer);
    }

    const logo = startScreenContent.querySelector('.game-logo');
    if (logo) {
      (logo as HTMLElement).style.fontFamily = '"Rajdhani", sans-serif';
    }
}

export function setupStartScreenInstallBtn(deferredPrompt: BeforeInstallPromptEvent): void {
    const startScreenContent = document.querySelector('.start-screen-content');
    if (!startScreenContent || !deferredPrompt) return;

    if (document.getElementById('startInstallBtn')) return;

    const installBtn = document.createElement('button');
    installBtn.id = 'startInstallBtn';
    installBtn.innerText = '📲 INSTALL APP';
    // Keeping some inline styles for specific button tweaks not general enough for CSS
    installBtn.className = 'start-btn';
    installBtn.style.background = '#FFD700';
    installBtn.style.color = '#333';
    installBtn.style.marginTop = '15px';
    installBtn.style.fontSize = '16px';
    installBtn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';

    installBtn.onclick = async (e) => {
        e.stopPropagation();
        vibrate(20);
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        installBtn.remove();
    };

    const startBtn = startScreenContent.querySelector('.start-btn');
    if (startBtn && startBtn.nextSibling) {
        startScreenContent.insertBefore(installBtn, startBtn.nextSibling);
    } else {
        startScreenContent.appendChild(installBtn);
    }
}

// --- Helper: Create Shop Button ---
function createShopButton(type: string, price: number, color: string, label: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'shop-btn';
  btn.style.borderColor = color;
  btn.style.borderBottomColor = color; // Maintain the colored border

  btn.innerHTML = `<span class="shop-icon" style="filter: drop-shadow(0 0 5px ${color});">${label}</span><span class="shop-price">💰 ${price}</span>`;

  btn.addEventListener('pointerdown', () => {
      // transform handled by CSS :active, but scale logic was JS based before.
      // Keeping JS listener if we need specific logic, otherwise CSS :active covers it.
  });

  return btn;
}

// --- Setup Shop UI ---
export type BuyAction = (type: 'bazooka' | 'rambo' | 'laser' | 'soldier' | 'nuke' | 'recharge_super', cost: number) => void;

export function setupShopUI(onBuy: BuyAction): void {
  const existing = document.getElementById('shopContainer');
  if (existing) existing.remove();

  shopContainer = document.createElement('div');
  shopContainer.id = 'shopContainer';
  shopContainer.className = 'shop-container';
  document.body.appendChild(shopContainer);

  const configs = [
    { id: 'soldier', type: 'soldier', price: 50, color: COLORS.PLAYER.NORMAL, label: '🛡️ +10' },
    { id: 'bazooka', type: 'bazooka', price: 50, color: COLORS.PLAYER.BAZOOKA, label: '🚀' },
    { id: 'rambo', type: 'rambo', price: 100, color: COLORS.PLAYER.RAMBO, label: '💪' },
    { id: 'laser', type: 'laser', price: 150, color: COLORS.PLAYER.LASER, label: '⚡' },
    { id: 'nuke', type: 'nuke', price: 500, color: COLORS.UI.GOLD, label: '☢️ NUKE' },
    { id: 'recharge', type: 'recharge_super', price: 200, color: COLORS.UI.GOLD, label: '🔋 RECARGA' },
  ];

  configs.forEach(cfg => {
    const btn = createShopButton(cfg.type, cfg.price, cfg.color, cfg.label);

    if (cfg.id === 'soldier') {
         btn.innerHTML = `<span class="shop-icon">🛡️</span><span class="shop-label">+10 UNITS</span><span class="shop-price">💰 ${cfg.price}</span>`;
    } else if (cfg.id === 'nuke') {
         btn.innerHTML = `<span class="shop-icon">☢️</span><span class="shop-label">NUKE</span><span class="shop-price">💰 ${cfg.price}</span>`;
    } else if (cfg.id === 'recharge') {
         btn.innerHTML = `<span class="shop-icon">🔋</span><span class="shop-label">RECARGA</span><span class="shop-price">💰 ${cfg.price}</span>`;
    }

    const handler = (e: Event) => {
        e.stopPropagation();
        vibrate(15);
        onBuy(cfg.type as Parameters<BuyAction>[0], cfg.price);
    };
    btn.addEventListener('click', handler);

    shopContainer!.appendChild(btn);
    buttons[cfg.id] = btn;
  });
}

export function updateShopUI(gameState: GameState): void {
  if (!shopContainer) return;

  if (!gameState.isStarted || gameState.isGameOver) {
    shopContainer.style.display = 'none';
    return;
  }
  shopContainer.style.display = 'flex';

  const costs: Record<string, number> = {
      'soldier': 50, 'bazooka': 50, 'rambo': 100, 'laser': 150, 'nuke': 500, 'recharge': 200
  };

  Object.entries(buttons).forEach(([id, btn]) => {
      const cost = costs[id];
      if (gameState.coins >= cost) {
          btn.disabled = false;
      } else {
          btn.disabled = true;
      }
  });
}

// --- Super Cannon UI ---
export type SuperCannonAction = () => void;

export function setupSuperCannonUI(onActivate: SuperCannonAction): void {
    superCannonContainer = document.getElementById('superCannonContainer');
    if (!superCannonContainer) {
        // Create it if it doesn't exist (it wasn't in game.ts, but let's be safe)
        // Actually game.ts usually relies on HTML existing or creates it?
        // Let's create it if missing to be robust
        superCannonContainer = document.createElement('div');
        superCannonContainer.id = 'superCannonContainer';
        document.body.appendChild(superCannonContainer);
    }

    superCannonContainer.className = 'super-cannon-container';
    superCannonContainer.innerHTML = '';

    const btn = document.createElement('button');
    btn.id = 'superCannonBtn';
    btn.className = 'super-cannon-btn';
    btn.innerHTML = '⚡ SUPER';

    const trigger = (e: Event) => {
        e.stopPropagation();
        vibrate(25);
        onActivate();
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => btn.style.transform = 'scale(1)', 100);
    };

    btn.addEventListener('click', trigger);
    superCannonContainer.appendChild(btn);
    buttons['superCannon'] = btn;
}

export function updateSuperCannonUI(gameState: GameState): void {
    if (!superCannonContainer || !buttons['superCannon']) return;
    const btn = buttons['superCannon'];

    if (!gameState.isStarted || gameState.isGameOver) {
        superCannonContainer.style.display = 'none';
        return;
    }

    superCannonContainer.style.display = 'flex';

    const now = Date.now();
    const timeSinceLastUse = now - gameState.superCannonLastUsed;
    const cooldownRemaining = Math.max(0, gameState.superCannonCooldown - timeSinceLastUse);
    const isOnCooldown = cooldownRemaining > 0 && !gameState.superCannonActive;

    if (gameState.superCannonActive) {
        btn.innerHTML = '⚡ ATIVO!';
        btn.classList.add('active');
        btn.disabled = true;
    } else if (isOnCooldown) {
        const cooldownSecs = Math.ceil(cooldownRemaining / 1000);
        btn.innerHTML = `⏳ ${cooldownSecs}s`;
        btn.classList.remove('active');
        btn.disabled = true;
    } else {
        btn.innerHTML = '⚡ SUPER';
        btn.classList.remove('active');
        btn.disabled = false;
    }
}

// --- Game Over UI ---

interface GameOverContainer extends HTMLElement {
    _onRestart?: () => void;
    _onShare?: (platform: 'x' | 'whatsapp') => void;
}

export function setupGameOverUI(onRestart: () => void, onShare: (platform: 'x' | 'whatsapp') => void): void {
    gameOverContainer = document.getElementById('gameOverContainer');
    if (!gameOverContainer) {
        gameOverContainer = document.createElement('div');
        gameOverContainer.id = 'gameOverContainer';
        gameOverContainer.className = 'game-over-container';
        document.body.appendChild(gameOverContainer);
    }

    gameOverContainer.innerHTML = '';

    const content = document.createElement('div');
    content.className = 'game-over-content';
    gameOverContainer.appendChild(content);

    // Prevent clicks on content from triggering restart
    content.addEventListener('click', (e) => e.stopPropagation());

    (gameOverContainer as GameOverContainer)._onRestart = onRestart;
    (gameOverContainer as GameOverContainer)._onShare = onShare;

    // Tap background to restart
    gameOverContainer.addEventListener('click', () => {
        const btn = document.getElementById('goRestartBtn');
        if (btn) btn.click();
    });
}

export function showGameOverScreen(gameState: GameState): void {
    if (!gameOverContainer) return;

    const onRestart = (gameOverContainer as GameOverContainer)._onRestart;
    const onShare = (gameOverContainer as GameOverContainer)._onShare;

    if (!onRestart || !onShare) return;

    const isVictory = gameState.isVictory && gameState.currentLevel >= 10;
    const title = isVictory ? '🏆 VITÓRIA!' : '💀 GAME OVER';
    const titleColor = isVictory ? '#2ECC71' : '#E74C3C';

    const content = gameOverContainer.querySelector('.game-over-content') as HTMLElement;
    if (!content) return;

    let rank = 'C';
    let rankColor = '#95a5a6';
    if (gameState.score >= 5000) { rank = 'S'; rankColor = '#FFD700'; }
    else if (gameState.score >= 3000) { rank = 'A'; rankColor = '#9B59B6'; }
    else if (gameState.score >= 1000) { rank = 'B'; rankColor = '#3498DB'; }
    else if (gameState.score >= 500) { rank = 'C'; rankColor = '#2ECC71'; }

    content.style.borderColor = titleColor;
    content.style.boxShadow = `0 0 30px ${isVictory ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)'}`;

    const leaderboardHTML = getLeaderboardHTML(gameState.score);
    const timeStr = new Date(Date.now() - gameState.runStartTime).toISOString().substr(14, 5);

    content.innerHTML = `
        <h1 class="game-over-title" style="color: ${titleColor};">${title}</h1>
        ${isVictory ? '<p style="color: #00FF88; font-weight: bold; font-size: 18px; margin-bottom: 20px;">🛸 MOTHERSHIP DESTROYED!</p>' : ''}

        <div style="margin-bottom: 20px;">
            <div style="
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
                border: 2px solid ${rankColor};
                box-shadow: 0 0 15px ${rankColor};
                animation: rank-stamp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s backwards;
            ">
                <span style="font-size: 32px; font-weight: 900; color: ${rankColor}; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${rank}</span>
            </div>
            <div style="color: ${rankColor}; font-size: 12px; font-weight: bold; margin-top: 5px; letter-spacing: 1px; animation: fadeIn 0.5s 0.8s backwards;">RANK</div>
        </div>

        <div class="game-over-stats">
            <div class="stat-row">
                <span class="stat-label">Score</span>
                <span id="finalScoreDisplay" class="stat-value">0</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">High Score</span>
                <span class="stat-value" style="color: #FFD700;">${gameState.highScore}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Max Combo</span>
                <span class="stat-value" style="color: #FF00FF;">${gameState.maxCombo}x</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Kills</span>
                <span class="stat-value" style="color: #E74C3C;">${gameState.totalKills}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Time</span>
                <span class="stat-value" style="color: #3498DB;">${timeStr}</span>
            </div>
        </div>

        ${leaderboardHTML}

        ${gameState.deferredInstallPrompt ? `
        <button id="goInstallBtn" class="game-over-btn" style="background: #FFD700; color: #333; box-shadow: 0 4px 0 #DAA520;">📲 INSTALL APP</button>
        ` : ''}

        <button id="goRestartBtn" class="game-over-btn">${isVictory ? 'CONTINUE LEVEL 11 ➡️' : '🔄 TRY AGAIN'}</button>

        <div class="share-btn-group">
            <button id="goShareX" class="share-btn x">𝕏 SHARE</button>
            <button id="goShareWa" class="share-btn wa">WHATSAPP</button>
        </div>
    `;

    const restartBtn = document.getElementById('goRestartBtn');
    restartBtn?.addEventListener('click', () => {
        vibrate(20);
        gameOverContainer!.style.opacity = '0';
        setTimeout(() => {
            gameOverContainer!.style.display = 'none';
            onRestart();
        }, 300);
    });

    const installBtn = document.getElementById('goInstallBtn');
    if (installBtn && gameState.deferredInstallPrompt) {
        installBtn.addEventListener('click', async () => {
            if (!gameState.deferredInstallPrompt) return;
            vibrate(20);
            gameState.deferredInstallPrompt.prompt();
            const { outcome } = await gameState.deferredInstallPrompt.userChoice;
            console.log(`User response to install prompt: ${outcome}`);
            gameState.deferredInstallPrompt = null;
            installBtn.style.display = 'none';
        });
    }

    document.getElementById('goShareX')?.addEventListener('click', () => onShare('x'));
    document.getElementById('goShareWa')?.addEventListener('click', () => onShare('whatsapp'));

    gameOverContainer.style.display = 'flex';
    void gameOverContainer.offsetHeight;
    gameOverContainer.style.opacity = '1';
    content.style.transform = 'scale(1)';

    const scoreDisplay = document.getElementById('finalScoreDisplay');
    if (scoreDisplay) {
        let startTimestamp: number | null = null;
        const duration = 1500;
        const start = 0;
        const end = gameState.score;

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const value = Math.floor(ease * (end - start) + start);
            scoreDisplay.innerHTML = value.toLocaleString();
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
}

export function startCountdown(onComplete: () => void): void {
    const el = document.createElement('div');
    el.style.cssText = `
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        display: flex; justify-content: center; align-items: center;
        background: rgba(0,0,0,0.5);
        z-index: 9999;
        font-size: 80px;
        font-weight: 900;
        color: #FFD700;
        text-shadow: 0 0 20px rgba(0,0,0,0.5);
        pointer-events: auto;
    `;
    document.body.appendChild(el);

    let count = 3;

    const tick = () => {
        if (count > 0) {
            el.innerText = count.toString();
            el.style.transform = 'scale(1.5)';
            el.style.opacity = '0';

            el.animate([
                { transform: 'scale(0.5)', opacity: 0 },
                { transform: 'scale(1.2)', opacity: 1, offset: 0.5 },
                { transform: 'scale(1.0)', opacity: 1 }
            ], { duration: 400, fill: 'forwards' });

            vibrate(10);
            setTimeout(() => {
                count--;
                tick();
            }, 800);
        } else {
            el.innerText = "GO!";
            el.style.color = "#2ECC71";
            el.animate([
                 { transform: 'scale(0.5)', opacity: 0 },
                 { transform: 'scale(1.5)', opacity: 1 }
            ], { duration: 300, fill: 'forwards' });

            vibrate(50);

            setTimeout(() => {
                el.remove();
                onComplete();
            }, 500);
        }
    };

    tick();
}

export function createPauseModal(
    onResume: () => void,
    onRestart: () => void,
    onSettings: () => void
): void {
    if (document.getElementById('pauseModal')) return;

    const modal = document.createElement('div');
    modal.id = 'pauseModal';
    modal.className = 'pause-modal';
    modal.style.display = 'none';

    const title = document.createElement('h1');
    title.innerText = 'PAUSED';
    title.className = 'pause-title';

    const createBtn = (text: string, onClick: () => void, className: string = '') => {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.className = `pause-btn ${className}`;
        btn.onclick = () => {
            vibrate(20);
            onClick();
        };
        return btn;
    };

    const resumeBtn = createBtn('RESUME', onResume, 'resume');
    const restartBtn = createBtn('RESTART', onRestart);
    const settingsBtn = createBtn('SETTINGS', onSettings);
    const quitBtn = createBtn('QUIT', () => window.location.reload(), 'quit');

    modal.appendChild(title);
    modal.appendChild(resumeBtn);
    modal.appendChild(restartBtn);
    modal.appendChild(settingsBtn);
    modal.appendChild(quitBtn);

    document.body.appendChild(modal);
}

export const _testing = {
    getLeaderboardHTML,
    resetContainers: () => {
        shopContainer = null;
        superCannonContainer = null;
        gameOverContainer = null;
    }
};
