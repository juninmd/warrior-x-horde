// ui-overlay.ts - Manages HTML/DOM overlays
import { COLORS } from './constants';
import { GameState } from './types';

// Container elements
let shopContainer: HTMLElement | null = null;
let superCannonContainer: HTMLElement | null = null;

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
    transition: transform 0.1s, opacity 0.2s;
  `;

  // Effects
  btn.addEventListener('mousedown', () => btn.style.transform = 'scale(0.95)');
  btn.addEventListener('mouseup', () => btn.style.transform = 'scale(1)');
  btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
  btn.addEventListener('touchstart', () => btn.style.transform = 'scale(0.95)', { passive: true });
  btn.addEventListener('touchend', () => btn.style.transform = 'scale(1)', { passive: true });

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
         btn.innerHTML = `<span style="font-size: 20px;">🛡️</span><span style="font-size: 10px; font-weight: 800; display: block; margin-top: -2px;">+10 UNITS</span><span style="font-size: 11px;">💰 ${cfg.price}</span>`;
    } else if (cfg.id === 'nuke') {
         btn.innerHTML = `<span style="font-size: 20px;">☢️</span><span style="font-size: 10px; font-weight: 800; display: block; margin-top: -2px;">NUKE</span><span style="font-size: 11px;">💰 ${cfg.price}</span>`;
    } else if (cfg.id === 'recharge') {
         btn.innerHTML = `<span style="font-size: 20px;">🔋</span><span style="font-size: 10px; font-weight: 800; display: block; margin-top: -2px;">RECARGA</span><span style="font-size: 11px;">💰 ${cfg.price}</span>`;
    }

    // Event listeners
    const handler = (e: Event) => {
        e.stopPropagation();
        onBuy(cfg.type as any, cfg.price);
    };
    btn.addEventListener('click', handler);
    btn.addEventListener('touchstart', handler, { passive: true });

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
    `;

    const trigger = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        onActivate();
        // Visual feedback
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => btn.style.transform = 'scale(1)', 100);
    };

    btn.addEventListener('touchstart', trigger, { passive: false });
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
