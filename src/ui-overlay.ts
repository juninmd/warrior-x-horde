// ui-overlay.ts - Manages HTML/DOM overlays
import { COLORS } from './constants';
import { GameState } from './types';
import { vibrate } from './input';

// Container elements
let shopContainer: HTMLElement | null = null;
let superCannonContainer: HTMLElement | null = null;
let gameOverContainer: HTMLElement | null = null;

// Buttons
const buttons: Record<string, HTMLButtonElement> = {};

// --- Helper: Create Shop Button ---
function createShopButton(type: string, price: number, color: string, label: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.innerHTML = `<span style="font-size: 18px;">${label}</span><br><span style="font-size: 12px;">💰 ${price}</span>`;
  btn.style.cssText = `
    width: 70px;
    height: 70px;
    padding: 5px;
    font-size: 12px;
    font-weight: bold;
    background: rgba(20, 20, 30, 0.8);
    color: #FFF;
    border: 2px solid ${color};
    border-radius: 10px;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
    transition: transform 0.1s, opacity 0.2s;
  `;

  // Effects
  // Use pointer events for unified handling
  btn.addEventListener('pointerdown', () => {
      btn.style.transform = 'scale(0.95)';
      // Optional: Prevent default if necessary, but careful with scrolling
  });

  btn.addEventListener('pointerup', () => btn.style.transform = 'scale(1)');
  btn.addEventListener('pointerleave', () => btn.style.transform = 'scale(1)');

  return btn;
}

// --- Setup Shop UI ---
export type BuyAction = (type: 'bazooka' | 'rambo' | 'laser' | 'soldier' | 'nuke' | 'recharge_super', cost: number) => void;

export function setupShopUI(onBuy: BuyAction): void {
  // Clean up existing container if any
  const existing = document.getElementById('shopContainer');
  if (existing) existing.remove();

  shopContainer = document.createElement('div');
  shopContainer.id = 'shopContainer';
  shopContainer.style.cssText = `
    position: absolute;
    top: 150px;
    right: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 10;
    display: none;
  `;
  document.body.appendChild(shopContainer);

  // Define buttons config
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

    // Add specific text overrides if needed
    if (cfg.id === 'soldier') {
         /* v8 ignore next */
         btn.innerHTML = `<span style="font-size: 20px;">🛡️</span><span style="font-size: 10px; font-weight: 800; display: block; margin-top: -2px;">+10 UNITS</span><span style="font-size: 11px;">💰 ${cfg.price}</span>`;
    } else if (cfg.id === 'nuke') {
         /* v8 ignore next */
         btn.innerHTML = `<span style="font-size: 20px;">☢️</span><span style="font-size: 10px; font-weight: 800; display: block; margin-top: -2px;">NUKE</span><span style="font-size: 11px;">💰 ${cfg.price}</span>`;
    } else if (cfg.id === 'recharge') {
         btn.innerHTML = `<span style="font-size: 20px;">🔋</span><span style="font-size: 10px; font-weight: 800; display: block; margin-top: -2px;">RECARGA</span><span style="font-size: 11px;">💰 ${cfg.price}</span>`;
    }

    // Event listeners
    // Using click with touch-action: manipulation is standard for mobile buttons now.
    // It avoids the double-fire issue of listening to both touch and click.
    const handler = (e: Event) => {
        /* v8 ignore start */
        e.stopPropagation();
        vibrate(15); // Haptic feedback
        onBuy(cfg.type as any, cfg.price);
        /* v8 ignore stop */
        // Persistir moedas após compra
        // Nota: gameState não é acessível diretamente aqui, mas o callback onBuy atualiza o estado
        // Idealmente, a persistência deveria ser feita no callback, mas podemos adicionar um pequeno delay ou acessar globalmente se necessário.
        // A melhor prática é mover a lógica de persistência para o callback 'handleBuy' em game.ts.
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

  // Config map to match buttons to costs
  const costs: Record<string, number> = {
      'soldier': 50, 'bazooka': 50, 'rambo': 100, 'laser': 150, 'nuke': 500, 'recharge': 200
  };

  Object.entries(buttons).forEach(([id, btn]) => {
      const cost = costs[id];
      if (gameState.coins >= cost) {
          btn.style.opacity = '1';
          btn.style.filter = 'grayscale(0%)';
          btn.disabled = false;
      } else {
          btn.style.opacity = '0.5';
          btn.style.filter = 'grayscale(100%)';
          btn.disabled = true;
      }
  });
}

// --- Super Cannon UI ---
export type SuperCannonAction = () => void;

export function setupSuperCannonUI(onActivate: SuperCannonAction): void {
    superCannonContainer = document.getElementById('superCannonContainer');
    if (!superCannonContainer) return;

    // Clear previous
    superCannonContainer.innerHTML = '';

    const btn = document.createElement('button');
    btn.id = 'superCannonBtn';
    btn.innerHTML = '⚡ SUPER';
    btn.style.cssText = `
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
        transition: transform 0.1s;
    `;

    const trigger = (e: Event) => {
        /* v8 ignore start */
        // Prevent default only if it's touch to avoid synthesized click if we handle both?
        // Actually, just handle click is safest with touch-action: manipulation.
        // But for "Game Actions" sometimes touchstart is preferred for lower latency.
        // Let's stick to click for consistency, or careful pointerdown.
        // Given this is a big action button, click is fine.
        e.stopPropagation();
        vibrate(25); // Stronger vibration for Super Cannon
        onActivate();

        // Visual feedback
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => btn.style.transform = 'scale(1)', 100);
        /* v8 ignore stop */
    };

    btn.addEventListener('click', trigger);
    // Remove touchstart to avoid double trigger, rely on browser fast-tap via touch-action

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
    superCannonContainer.style.justifyContent = 'center';

    const now = Date.now();
    const timeSinceLastUse = now - gameState.superCannonLastUsed;
    const cooldownRemaining = Math.max(0, gameState.superCannonCooldown - timeSinceLastUse);
    const isOnCooldown = cooldownRemaining > 0 && !gameState.superCannonActive;

    if (gameState.superCannonActive) {
        btn.innerHTML = '⚡ ATIVO!';
        btn.style.background = 'linear-gradient(180deg, #FFEB3B 0%, #FF9800 100%)';
        btn.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.9), 0 0 50px rgba(255, 215, 0, 0.5)';
        btn.style.borderColor = '#FFEB3B';
        btn.disabled = true;
    } else if (isOnCooldown) {
        const cooldownSecs = Math.ceil(cooldownRemaining / 1000);
        btn.innerHTML = `⏳ ${cooldownSecs}s`;
        btn.style.background = 'linear-gradient(180deg, #555 0%, #333 100%)';
        btn.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.4)';
        btn.style.borderColor = '#555';
        btn.style.color = '#999';
        btn.disabled = true;
    } else {
        btn.innerHTML = '⚡ SUPER';
        btn.style.background = 'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)';
        btn.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.5), 0 0 15px rgba(255, 215, 0, 0.3)';
        btn.style.borderColor = '#FFD700';
        btn.style.color = '#333';
        btn.disabled = false;
    }
}

// --- Game Over UI ---

export function setupGameOverUI(onRestart: () => void, onShare: (platform: 'x' | 'whatsapp') => void): void {
    gameOverContainer = document.getElementById('gameOverContainer');
    if (!gameOverContainer) {
        gameOverContainer = document.createElement('div');
        gameOverContainer.id = 'gameOverContainer';
        gameOverContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(5px);
            z-index: 100;
            opacity: 0;
            transition: opacity 0.5s ease;
        `;
        document.body.appendChild(gameOverContainer);
    }

    // Clear content
    gameOverContainer.innerHTML = '';

    const content = document.createElement('div');
    content.style.cssText = `
        background: rgba(30, 30, 40, 0.9);
        border: 2px solid #4A90D9;
        border-radius: 20px;
        padding: 30px;
        width: 85%;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 0 30px rgba(74, 144, 217, 0.3);
        transform: scale(0.9);
        transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    // Add class for animation targeting
    content.className = 'game-over-content';

    gameOverContainer.appendChild(content);

    // Storing callbacks for dynamic button creation in showGameOverScreen
    (gameOverContainer as any)._onRestart = onRestart;
    (gameOverContainer as any)._onShare = onShare;
}

export function showGameOverScreen(gameState: GameState): void {
    if (!gameOverContainer) return;

    const onRestart = (gameOverContainer as any)._onRestart;
    const onShare = (gameOverContainer as any)._onShare;

    const isVictory = gameState.isVictory && gameState.currentLevel >= 10;
    const title = isVictory ? '🏆 VITÓRIA!' : '💀 GAME OVER';
    const titleColor = isVictory ? '#2ECC71' : '#E74C3C';

    const content = gameOverContainer.querySelector('.game-over-content') as HTMLElement;
    if (!content) return;

    // Rank Calculation
    let rank = 'C';
    let rankColor = '#95a5a6'; // Gray
    if (gameState.score >= 5000) { rank = 'S'; rankColor = '#FFD700'; } // Gold
    else if (gameState.score >= 3000) { rank = 'A'; rankColor = '#9B59B6'; } // Purple
    else if (gameState.score >= 1000) { rank = 'B'; rankColor = '#3498DB'; } // Blue

    content.style.borderColor = titleColor;
    content.style.boxShadow = `0 0 30px ${isVictory ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)'}`;

    // Load Leaderboard
    let leaderboard = [];
    try {
        leaderboard = JSON.parse(localStorage.getItem('crowdLeaderboard') || '[]');
    } catch (e) {
        console.error('Failed to load leaderboard', e);
    }

    let leaderboardHTML = '';
    if (leaderboard.length > 0) {
        leaderboardHTML = `
        <div style="background: rgba(0,0,0,0.4); border-radius: 10px; padding: 10px; margin-bottom: 20px;">
            <h3 style="color: #FFD700; font-size: 14px; margin-bottom: 5px; text-transform: uppercase;">Top Commanders</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #DDD;">
                ${leaderboard.map((entry: any, index: number) => {
                    /* v8 ignore start */
                    const isCurrent = entry.score === gameState.score;
                    const rowColor = isCurrent ? 'rgba(255, 215, 0, 0.2)' : 'transparent';
                    const textColor = isCurrent ? '#FFF' : '#AAA';
                    const weight = isCurrent ? 'bold' : 'normal';
                    return `
                    <tr style="background: ${rowColor}; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 4px; text-align: left; color: ${index === 0 ? '#FFD700' : textColor}; font-weight: ${weight};">#${index + 1}</td>
                        <td style="padding: 4px; text-align: right; color: ${textColor}; font-weight: ${weight};">${entry.score}</td>
                    </tr>
                    `;
                    /* v8 ignore stop */
                }).join('')}
            </table>
        </div>
        `;
    }

    content.innerHTML = `
        <h1 style="color: ${titleColor}; font-size: 42px; margin: 0 0 10px 0; text-shadow: 0 2px 5px rgba(0,0,0,0.5);">${title}</h1>
        ${isVictory ? '<p style="color: #00FF88; font-weight: bold; font-size: 18px; margin-bottom: 20px;">🛸 MOTHERSHIP DESTROYED!</p>' : ''}

        <!-- Rank Badge -->
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
            ">
                <span style="font-size: 32px; font-weight: 900; color: ${rankColor}; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${rank}</span>
            </div>
            <div style="color: ${rankColor}; font-size: 12px; font-weight: bold; margin-top: 5px; letter-spacing: 1px;">RANK</div>
        </div>

        <div style="background: rgba(0,0,0,0.3); border-radius: 10px; padding: 15px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #AAA; font-size: 18px;">Score</span>
                <span style="color: #FFF; font-size: 24px; font-weight: bold;">${gameState.score}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #AAA; font-size: 16px;">High Score</span>
                <span style="color: #FFD700; font-size: 20px; font-weight: bold;">${gameState.highScore}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span style="color: #AAA; font-size: 16px;">Max Combo</span>
                <span style="color: #FF00FF; font-size: 20px; font-weight: bold;">${gameState.maxCombo}x</span>
            </div>
        </div>

        ${leaderboardHTML}

        <button id="goRestartBtn" style="
            width: 100%;
            padding: 15px;
            font-size: 20px;
            font-weight: bold;
            color: #FFF;
            background: linear-gradient(180deg, #4A90D9 0%, #2980B9 100%);
            border: none;
            border-radius: 10px;
            cursor: pointer;
            margin-bottom: 15px;
            box-shadow: 0 4px 0 #1A5276;
            transition: transform 0.1s;
        ">${isVictory ? 'CONTINUE LEVEL 11 ➡️' : '🔄 TRY AGAIN'}</button>

        <div style="display: flex; gap: 10px;">
            <button id="goShareX" style="
                flex: 1;
                padding: 10px;
                font-size: 14px;
                font-weight: bold;
                color: #FFF;
                background: #1DA1F2;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                box-shadow: 0 3px 0 #0C7ABF;
            ">𝕏 SHARE</button>
            <button id="goShareWa" style="
                flex: 1;
                padding: 10px;
                font-size: 14px;
                font-weight: bold;
                color: #FFF;
                background: #25D366;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                box-shadow: 0 3px 0 #128C7E;
            ">WHATSAPP</button>
        </div>
    `;

    // Attach listeners
    const restartBtn = document.getElementById('goRestartBtn');
    restartBtn?.addEventListener('click', () => {
        vibrate(20);
        gameOverContainer!.style.opacity = '0';
        setTimeout(() => {
            gameOverContainer!.style.display = 'none';
            onRestart();
        }, 300);
    });

    document.getElementById('goShareX')?.addEventListener('click', () => onShare('x'));
    document.getElementById('goShareWa')?.addEventListener('click', () => onShare('whatsapp'));

    // Show
    gameOverContainer.style.display = 'flex';
    // Force reflow
    void gameOverContainer.offsetHeight;
    gameOverContainer.style.opacity = '1';
    content.style.transform = 'scale(1)';
}

// --- Start Countdown ---
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

            // Animate
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
