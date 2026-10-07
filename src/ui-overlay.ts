// ui-overlay.ts - Manages HTML/DOM overlays
import { GameState, BeforeInstallPromptEvent } from './types';
import { vibrate } from './input';
import { VICTORY_TEXT, getDefeatLine } from './story';
import { SHOP_ITEMS, getPrice, cooldownLeft, blockedReason } from './shop-catalog';
import type { ShopItem, ShopType } from './shop-catalog';

// Container elements (Declared at top to avoid TDZ)
let shopContainer: HTMLElement | null = null;
let superCannonContainer: HTMLElement | null = null;
let gameOverContainer: HTMLElement | null = null;

// Buttons
const buttons: Record<string, HTMLButtonElement> = {};

function getLeaderboardElement(currentScore: number = -1): HTMLElement {
    let leaderboard = [];
    try {
        const parsed = JSON.parse(localStorage.getItem('crowdLeaderboard') || '[]');
        if (!Array.isArray(parsed)) {
            leaderboard = [];
        } else {
            const sanitized = [];
            for (let i = 0; i < parsed.length; i++) {
                const entry = parsed[i];
                if (entry && typeof entry === 'object' && typeof (entry as {score?: unknown}).score === 'number') {
                    sanitized.push(entry);
                }
            }
            leaderboard = sanitized;
        }
    } catch (e) {
        console.error('Failed to load leaderboard', e);
        leaderboard = [];
    }

    // Initialize fake leaderboard for new players
    if (leaderboard.length === 0) {
        leaderboard = [
            { score: 8500, date: Date.now() }, // "CPU-Alpha" equivalent
            { score: 5200, date: Date.now() },
            { score: 3100, date: Date.now() },
            { score: 1500, date: Date.now() },
            { score: 800, date: Date.now() }
        ];
        try {
            localStorage.setItem('crowdLeaderboard', JSON.stringify(leaderboard));
        } catch (e) {
            console.warn('Failed to save default leaderboard', e);
        }
    }

    const box = document.createElement('div');
    box.className = 'leaderboard-box';

    const title = document.createElement('h3');
    title.className = 'leaderboard-title';
    title.textContent = 'Top Commanders';
    box.appendChild(title);

    const list = document.createElement('div');
    list.className = 'leaderboard-list';
    box.appendChild(list);

    for (let index = 0; index < leaderboard.length; index++) {
        const entry = leaderboard[index];
        let safeScore = Number(entry.score);
        /* v8 ignore start */

        /* v8 ignore stop */
        if (isNaN(safeScore) || !isFinite(safeScore)) safeScore = 0;

        safeScore = Math.floor(safeScore);

        const isCurrent = safeScore === currentScore;

        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        if (isCurrent) item.classList.add('current');
        if (index === 0) item.classList.add('rank-1');
        if (index === 1) item.classList.add('rank-2');
        if (index === 2) item.classList.add('rank-3');
        item.style.animationDelay = `${index * 0.1}s`;

        let rankIcon = `#${index + 1}`;
        if (index === 0) rankIcon = '🥇';
        if (index === 1) rankIcon = '🥈';
        if (index === 2) rankIcon = '🥉';

        const rankCol = document.createElement('div');
        rankCol.className = 'rank-col';
        rankCol.textContent = rankIcon;

        const scoreCol = document.createElement('div');
        scoreCol.className = 'score-col';
        /* v8 ignore start */

        /* v8 ignore stop */
        scoreCol.textContent = safeScore === 0 ? '0' : safeScore.toLocaleString('pt-BR');


        item.appendChild(rankCol);
        item.appendChild(scoreCol);
        list.appendChild(item);
    }

    return box;
}

export function updateStartScreenLeaderboard(): void {
    const startScreenContent = document.querySelector('.start-screen-content');
    if (!startScreenContent) return;

    let lbContainer = document.getElementById('startScreenLeaderboard');
    if (!lbContainer) {
        lbContainer = document.createElement('div');
        lbContainer.id = 'startScreenLeaderboard';

        const btn = startScreenContent.querySelector('.start-btn');
        if (btn) {
            startScreenContent.insertBefore(lbContainer, btn);
        } else {
            startScreenContent.appendChild(lbContainer);
        }
    }

    lbContainer.replaceChildren(getLeaderboardElement());

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
    // Keeping classes for consistent styling
    installBtn.className = 'start-btn install-btn';

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

// Shop catalog, pricing and effects live in shop.ts (single source of truth)
export type { ShopType } from './shop-catalog';

const fmtPrice = (n: number): string => n.toLocaleString('pt-BR');

function getStage(): HTMLElement {
  return (document.querySelector('.game-canvas-wrapper') as HTMLElement | null) ?? document.body;
}

function makeSpan(className: string, text: string): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  return el;
}

// --- Helper: Create Shop Button ---
function createShopButton(item: ShopItem): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'shop-btn';
  btn.dataset.shop = item.id;
  btn.style.setProperty('--accent', item.color);
  btn.title = `${item.label} — a partir de 💰 ${fmtPrice(item.basePrice)}: ${item.desc}`;
  btn.setAttribute('aria-label', `${item.label}, a partir de ${fmtPrice(item.basePrice)} moedas. ${item.desc}`);
  btn.append(
    makeSpan('shop-icon', item.icon),
    makeSpan('shop-label', item.label),
    makeSpan('shop-price', `💰 ${fmtPrice(item.basePrice)}`),
  );
  return btn;
}

// --- Help panel (explains every item; toggled by the "?" button) ---
let helpTimer: ReturnType<typeof setTimeout> | null = null;

function setHelpOpen(panel: HTMLElement, toggle: HTMLButtonElement, open: boolean): void {
  panel.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  if (helpTimer) { clearTimeout(helpTimer); helpTimer = null; }
  if (open) helpTimer = setTimeout(() => setHelpOpen(panel, toggle, false), 10000);
}

function setupShopHelp(stage: HTMLElement): void {
  document.getElementById('shopHelpBtn')?.remove();
  document.getElementById('shopHelp')?.remove();

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'shopHelpBtn';
  toggle.className = 'shop-help-btn';
  toggle.textContent = '?';
  toggle.title = 'Como funciona a loja';
  toggle.setAttribute('aria-label', 'Como funciona a loja');
  toggle.setAttribute('aria-controls', 'shopHelp');
  toggle.setAttribute('aria-expanded', 'false');

  const panel = document.createElement('div');
  panel.id = 'shopHelp';
  panel.className = 'shop-help';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Guia da loja');
  panel.hidden = true;

  const title = document.createElement('h3');
  title.textContent = '💰 Loja de reforços';
  const intro = document.createElement('p');
  intro.className = 'shop-help-intro';
  intro.textContent = 'Derrote inimigos para ganhar moedas e gaste durante a partida:';
  const list = document.createElement('ul');
  for (const item of SHOP_ITEMS) {
    const li = document.createElement('li');
    li.style.setProperty('--accent', item.color);
    const head = document.createElement('div');
    head.className = 'shop-help-head';
    head.append(makeSpan('shop-help-name', `${item.icon} ${item.label}`), makeSpan('shop-help-price', `💰 ${fmtPrice(item.basePrice)}+`));
    const desc = document.createElement('div');
    desc.className = 'shop-help-desc';
    desc.textContent = item.desc;
    li.append(head, desc);
    list.appendChild(li);
  }
  const foot = document.createElement('p');
  foot.className = 'shop-help-foot';
  foot.textContent = 'Preços sobem a cada compra e a cada capítulo. Botões apagados = moedas insuficientes ou em recarga.';
  panel.append(title, intro, list, foot);

  const stop = (e: Event) => e.stopPropagation();
  toggle.addEventListener('click', (e) => { stop(e); setHelpOpen(panel, toggle, panel.hidden); });
  panel.addEventListener('click', (e) => { stop(e); setHelpOpen(panel, toggle, false); });
  stage.append(toggle, panel);
}

// --- Setup Shop UI ---
export type BuyAction = (type: ShopType, cost: number) => void;

export function setupShopUI(onBuy: BuyAction): void {
  const existing = document.getElementById('shopContainer');
  if (existing) existing.remove();

  const stage = getStage();
  shopContainer = document.createElement('div');
  shopContainer.id = 'shopContainer';
  shopContainer.className = 'shop-container';
  shopContainer.setAttribute('role', 'toolbar');
  shopContainer.setAttribute('aria-label', 'Loja de reforços');
  stage.appendChild(shopContainer);

  SHOP_ITEMS.forEach(item => {
    const btn = createShopButton(item);
    btn.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      vibrate(15);
      onBuy(item.type, getPrice(item, currentLevelForShop));
    });
    shopContainer!.appendChild(btn);
    buttons[item.id] = btn;
  });

  setupShopHelp(stage);
}

export function updateShopUI(gameState: GameState): void {
  if (!shopContainer) return; /* v8 ignore next */

  const active = gameState.isStarted && !gameState.isGameOver;
  // Only touch the DOM when the value actually changes (avoids per-frame style recalc)
  if (document.body.classList.contains('playing') !== active) document.body.classList.toggle('playing', active);

  const helpBtn = document.getElementById('shopHelpBtn');
  if (!active) {
    if (shopContainer.style.display !== 'none') shopContainer.style.display = 'none';
    /* v8 ignore start */
    if (helpBtn && helpBtn.style.display !== 'none') {
      helpBtn.style.display = 'none';
      const panel = document.getElementById('shopHelp');
      if (panel) panel.hidden = true;
    }
    /* v8 ignore stop */
    return;
  }
  if (shopContainer.style.display !== 'flex') shopContainer.style.display = 'flex';
  if (helpBtn && helpBtn.style.display !== 'flex') helpBtn.style.display = 'flex';

  currentLevelForShop = gameState.currentLevel;
  Object.entries(buttons).forEach(([id, btn]) => {
      const item = SHOP_ITEMS.find(i => i.id === id);
      if (!item) return; // e.g. the super cannon button lives in this map too
      const price = getPrice(item, gameState.currentLevel);
      const reason = blockedReason(item, gameState);
      const shouldDisable = reason !== null;
      // Skip redundant writes: only mutate when something changes
      if (btn.disabled !== shouldDisable) btn.disabled = shouldDisable;
      const label = reason === 'cooldown' ? `⏳ ${Math.ceil(cooldownLeft(item) / 1000)}s`
        : reason === 'max' ? 'MÁX'
        : reason === 'ready' ? 'PRONTO'
        : `💰 ${fmtPrice(price)}`;
      const priceEl = btn.querySelector('.shop-price');
      if (priceEl && priceEl.textContent !== label) priceEl.textContent = label;
      if (btn.dataset.reason !== (reason ?? '')) btn.dataset.reason = reason ?? '';
  });
}

let currentLevelForShop = 1;

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
        getStage().appendChild(superCannonContainer);
    }

    superCannonContainer.className = 'super-cannon-container';
    superCannonContainer.replaceChildren();

    const btn = document.createElement('button');
    btn.id = 'superCannonBtn';
    btn.className = 'super-cannon-btn';
    btn.textContent = '⚡ SUPER';
    btn.title = 'Super Canhão: rajada devastadora (tem tempo de recarga)';
    btn.setAttribute('aria-label', 'Super Canhão');

    const trigger = (e: Event) => {
        e.stopPropagation();
        vibrate(25);
        onActivate();
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => btn.style.transform = 'scale(1)', 100); /* v8 ignore next */
    };

    btn.addEventListener('click', trigger);
    superCannonContainer.appendChild(btn);
    buttons['superCannon'] = btn;
}

export function updateSuperCannonUI(gameState: GameState): void {
    if (!superCannonContainer || !buttons['superCannon']) return;
    const btn = buttons['superCannon'];

    if (!gameState.isStarted || gameState.isGameOver) {









        if (superCannonContainer.style.display !== 'none') superCannonContainer.style.display = 'none';
        return;
    }

    if (superCannonContainer.style.display !== 'flex') superCannonContainer.style.display = 'flex';

    const now = Date.now();
    const timeSinceLastUse = now - gameState.superCannonLastUsed;
    const cooldownRemaining = Math.max(0, gameState.superCannonCooldown - timeSinceLastUse);
    const isOnCooldown = cooldownRemaining > 0 && !gameState.superCannonActive;

    // Compute target state, then apply only the writes that change (avoids per-frame DOM churn)
    let text: string;
    let active: boolean;
    let disabled: boolean;
    if (gameState.superCannonActive) {
        text = '⚡ ATIVO!'; active = true; disabled = true;
    } else if (isOnCooldown) {
        text = `⏳ ${Math.ceil(cooldownRemaining / 1000)}s`; active = false; disabled = true;
    } else {
        text = '⚡ SUPER'; active = false; disabled = false;
    }

    if (btn.textContent !== text) btn.textContent = text;
    if (btn.classList.contains('active') !== active) btn.classList.toggle('active', active);
    if (btn.disabled !== disabled) btn.disabled = disabled;
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

    gameOverContainer.replaceChildren();

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

function makeEpilogue(text: string): HTMLElement {
    const p = document.createElement('p');
    p.className = 'epilogue';
    p.textContent = text;
    return p;
}

let restarting = false;

export function showGameOverScreen(gameState: GameState): void {
    if (!gameOverContainer) return;
    restarting = false;

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

    const leaderboardEl = getLeaderboardElement(gameState.score);
    const timeStr = new Date(Date.now() - gameState.runStartTime).toISOString().substr(14, 5);

    content.replaceChildren();

    if (gameState.score > gameState.highScore) {
        const recordBanner = document.createElement('div');
        recordBanner.textContent = '👑 NEW HIGH SCORE! 👑';
        recordBanner.style.color = '#FFD700';
        recordBanner.style.fontWeight = '900';
        recordBanner.style.fontSize = '20px';
        recordBanner.style.marginBottom = '10px';
        recordBanner.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.8)';
        recordBanner.style.animation = 'pulse-glow 1s infinite alternate';
        content.appendChild(recordBanner);
    }

    const titleEl = document.createElement('h1');
    titleEl.className = 'game-over-title';
    titleEl.style.color = titleColor;
    titleEl.textContent = title;
    content.appendChild(titleEl);

    if (isVictory) {
        const victoryText = document.createElement('p');
        victoryText.style.color = '#00FF88';
        victoryText.style.fontWeight = 'bold';
        victoryText.style.fontSize = '18px';
        victoryText.style.marginBottom = '20px';
        victoryText.textContent = '🛸 MOTHERSHIP DESTROYED!';
        content.appendChild(victoryText);
        content.appendChild(makeEpilogue(VICTORY_TEXT));
    } else {
        content.appendChild(makeEpilogue(getDefeatLine(gameState.currentLevel)));
    }

    const rankContainer = document.createElement('div');
    rankContainer.style.marginBottom = '20px';

    const rankBadge = document.createElement('div');
    rankBadge.style.display = 'inline-flex';
    rankBadge.style.alignItems = 'center';
    rankBadge.style.justifyContent = 'center';
    rankBadge.style.width = '60px';
    rankBadge.style.height = '60px';
    rankBadge.style.borderRadius = '50%';
    rankBadge.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))';
    rankBadge.style.border = `2px solid ${rankColor}`;
    rankBadge.style.boxShadow = `0 0 15px ${rankColor}`;
    rankBadge.style.animation = 'rank-stamp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s backwards';

    const rankSpan = document.createElement('span');
    rankSpan.style.fontSize = '32px';
    rankSpan.style.fontWeight = '900';
    rankSpan.style.color = rankColor;
    rankSpan.style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
    rankSpan.textContent = rank;
    rankBadge.appendChild(rankSpan);

    const rankLabel = document.createElement('div');
    rankLabel.style.color = rankColor;
    rankLabel.style.fontSize = '12px';
    rankLabel.style.fontWeight = 'bold';
    rankLabel.style.marginTop = '5px';
    rankLabel.style.letterSpacing = '1px';
    rankLabel.style.animation = 'fadeIn 0.5s 0.8s backwards';
    rankLabel.textContent = 'RANK';

    rankContainer.appendChild(rankBadge);
    rankContainer.appendChild(rankLabel);
    content.appendChild(rankContainer);

    const statsContainer = document.createElement('div');
    statsContainer.className = 'game-over-stats';

    const createStatRow = (label: string, value: string, valueColor: string, id?: string) => {
        const row = document.createElement('div');
        row.className = 'stat-row';
        const labelEl = document.createElement('span');
        labelEl.className = 'stat-label';
        labelEl.textContent = label;
        const valueEl = document.createElement('span');
        valueEl.className = 'stat-value';
        valueEl.style.color = valueColor;
        valueEl.textContent = value;
        if (id) valueEl.id = id;
        row.appendChild(labelEl);
        row.appendChild(valueEl);
        return row;
    };

    statsContainer.appendChild(createStatRow('Score', '0', '#FFF', 'finalScoreDisplay'));
    statsContainer.appendChild(createStatRow('High Score', gameState.highScore.toString(), '#FFD700'));
    statsContainer.appendChild(createStatRow('Max Combo', `${gameState.maxCombo}x`, '#FF00FF'));
    statsContainer.appendChild(createStatRow('Kills', gameState.totalKills.toString(), '#E74C3C'));
    statsContainer.appendChild(createStatRow('Time', timeStr, '#3498DB'));

    content.appendChild(statsContainer);

    content.appendChild(leaderboardEl);

    if (gameState.deferredInstallPrompt) {
        const installBtn = document.createElement('button');
        installBtn.id = 'goInstallBtn';
        installBtn.className = 'game-over-btn';
        installBtn.style.color = '#333';
        installBtn.textContent = '📲 INSTALL APP';
        content.appendChild(installBtn);
    }

    const restartBtnHtml = document.createElement('button');
    restartBtnHtml.id = 'goRestartBtn';
    restartBtnHtml.className = 'game-over-btn';
    restartBtnHtml.textContent = isVictory ? 'CONTINUE LEVEL 11 ➡️' : '🔄 TRY AGAIN';
    content.appendChild(restartBtnHtml);

    const shareGroup = document.createElement('div');
    shareGroup.className = 'share-btn-group';

    const shareX = document.createElement('button');
    shareX.id = 'goShareX';
    shareX.className = 'share-btn x';
    shareX.textContent = '𝕏 SHARE';

    const shareWa = document.createElement('button');
    shareWa.id = 'goShareWa';
    shareWa.className = 'share-btn wa';
    shareWa.textContent = '📱 WHATSAPP';

    shareGroup.appendChild(shareX);
    shareGroup.appendChild(shareWa);
    content.appendChild(shareGroup);

    const restartBtn = document.getElementById('goRestartBtn');
    restartBtn?.addEventListener('click', () => {
        if (restarting) return;
        restarting = true;
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
            vibrate(20); /* v8 ignore next */
            gameState.deferredInstallPrompt.prompt(); /* v8 ignore next */
            const { outcome } = await gameState.deferredInstallPrompt.userChoice; /* v8 ignore next */
            console.log(`User response to install prompt: ${outcome}`); /* v8 ignore next */
            gameState.deferredInstallPrompt = null; /* v8 ignore next */
            installBtn.style.display = 'none'; /* v8 ignore next */
        });
    }

    document.getElementById('goShareX')?.addEventListener('click', () => onShare('x'));
    document.getElementById('goShareWa')?.addEventListener('click', () => onShare('whatsapp')); /* v8 ignore next */

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
            scoreDisplay.textContent = value.toLocaleString('pt-BR');
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
}

export function startCountdown(onComplete: () => void): void {
    const el = document.createElement('div');
    el.className = 'countdown-overlay';
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
    getLeaderboardElement,
    resetContainers: () => {
        shopContainer = null;
        superCannonContainer = null;
        gameOverContainer = null;
    },
    setShopContainer: (el: HTMLElement) => { shopContainer = el; },
    setSuperCannonElements: (container: HTMLElement) => {
        superCannonContainer = container;
    },
    updateShopUI,
    updateSuperCannonUI
};
