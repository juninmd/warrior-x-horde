import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameState, Entities } from '../src/types';
import * as renderer from '../src/renderer';
import * as audio from '../src/audio';
import * as uiOverlay from '../src/ui-overlay';

// Mocks must be hoisted or top-level before imports
vi.mock('../src/renderer', () => ({
    render: vi.fn(),
    addFloatingText: vi.fn(),
    addExplosion: vi.fn(),
    addParticle: vi.fn(),
    shareOnX: vi.fn(),
    shareOnWhatsApp: vi.fn(),
    updateFloatingTexts: vi.fn(),
    drawPauseScreen: vi.fn(),
}));

vi.mock('../src/audio', () => ({
    initAudio: vi.fn(),
    playMusic: vi.fn(),
    playSound: vi.fn(),
    stopAllMusic: vi.fn(),
    toggleMute: vi.fn(),
    isMusicMuted: vi.fn(() => false),
    audioManager: {
        gameMusic: { pause: vi.fn(), currentTime: 0 },
        bossMusic: { pause: vi.fn(), currentTime: 0 },
        gameOver: {},
        victory: {},
        powerUp: {},
        nerf: {},
        superCannon: {},
    }
}));

const callbacks = vi.hoisted(() => ({
    shop: null as any,
    superCannon: null as any,
    gameOverRestart: null as any,
    share: null as any,
}));

vi.mock('../src/ui-overlay', () => ({
    setupShopUI: vi.fn((cb) => callbacks.shop = cb),
    updateShopUI: vi.fn(),
    setupSuperCannonUI: vi.fn((cb) => callbacks.superCannon = cb),
    updateSuperCannonUI: vi.fn(),
    setupGameOverUI: vi.fn((cb1, cb2) => {
        callbacks.gameOverRestart = cb1;
        callbacks.share = cb2;
    }),
    showGameOverScreen: vi.fn(),
    startCountdown: vi.fn((cb) => cb && cb()),
    updateStartScreenLeaderboard: vi.fn(), createPauseModal: vi.fn(),
}));

// Mock DOM elements required by game.ts
document.body.innerHTML = `
    <canvas id="gameCanvas"></canvas>
    <div id="startScreen"></div>
    <button id="startBtnOverlay"></button>
    <button id="pauseBtnTop"></button>
    <button id="muteBtn"></button>
    <button id="superCannonBtnInline"></button>
`;

// Now import game.ts
import { _testing, togglePause, startGame, triggerSuperCannon, debugSetLevel } from '../src/game';
import { gameState } from '../src/gameState';

describe('Game Coverage', () => {
    let entities: Entities;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        // Reset game state
        gameState.isStarted = true;
        gameState.isPaused = false;
        gameState.isGameOver = false;
        gameState.isVictory = false;
        gameState.currentLevel = 1;
        gameState.coins = 1000;
        gameState.superCannonReady = false;
        gameState.superCannonActive = false;
        gameState.screenShakeTimer = 0;

        _testing.resetLoop();
        entities = _testing.getEntities();
        if (entities) {
             entities.playerArmy.aliveCount = 10;
             entities.boss = null;
        }
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should handle "recharge_super" shop action', () => {
        // Setup state
        gameState.coins = 1000;
        gameState.superCannonReady = false;
        gameState.superCannonLastUsed = Date.now();
        gameState.superCannonCooldown = 10000;

        // Trigger buy 'recharge_super' (cost 100)
        callbacks.shop('recharge_super', 100);

        expect(gameState.coins).toBe(900);
        expect(gameState.superCannonReady).toBe(true);
        expect(renderer.addFloatingText).toHaveBeenCalledWith('SUPER READY!', expect.any(Number), expect.any(Number), expect.any(String));

        // Try buying again when ready (should not charge)
        callbacks.shop('recharge_super', 100);
        expect(gameState.coins).toBe(900);
    });

    it('should show "READY!" floating text if trying to recharge super when already off cooldown', () => {
        gameState.coins = 1000;
        gameState.superCannonReady = false;
        // Last used long ago -> cooldown is 0
        gameState.superCannonLastUsed = Date.now() - 20000;
        gameState.superCannonCooldown = 10000;

        callbacks.shop('recharge_super', 100);

        // Should NOT deduct coins
        expect(gameState.coins).toBe(1000);
        expect(renderer.addFloatingText).toHaveBeenCalledWith('READY!', expect.any(Number), expect.any(Number), expect.any(String));
    });

    it('should handle low army warning in game loop', () => {
        entities.playerArmy.aliveCount = 5;
        gameState.lowArmyTriggered = false;
        gameState.isStarted = true;
        gameState.isGameOver = false;

        _testing.gameLoop(0); // Init
        _testing.gameLoop(20); // Update

        expect(gameState.lowArmyTriggered).toBe(true);
        expect(renderer.addFloatingText).toHaveBeenCalledWith("⚠️ LOW ARMY! ⚠️", expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number));
    });

    it('should handle boss fight music toggle', () => {
        // Force transition
        // First loop: no boss
        entities.boss = null;
        _testing.gameLoop(1000);
        // playMusic might not be called if state didn't change from initial false.

        // Start boss fight
        vi.clearAllMocks();
        entities.boss = { isActive: true } as any;
        _testing.gameLoop(1016);
        expect(audio.playMusic).toHaveBeenCalledWith(true);

        // End boss fight
        vi.clearAllMocks();
        entities.boss = { isActive: false } as any;
        _testing.gameLoop(1032);
        expect(audio.playMusic).toHaveBeenCalledWith(false);
    });

    it('should handle level 10 victory condition', () => {
        gameState.currentLevel = 10;
        gameState.isVictory = true;
        gameState.isGameOver = false;

        _testing.gameLoop(0); // Init
        _testing.gameLoop(20); // Update

        expect(gameState.isGameOver).toBe(true);
        // Should not advance to next level automatically in loop (advances via restart)
        // Check if victory sound played via logic in gameLoop?
        // Actually, the loop just sets isGameOver=true.
    });

    it('should advance to next level (infinite mode) on restart from level 10 victory', () => {
        gameState.currentLevel = 10;
        gameState.isVictory = true;

        // Trigger restart callback
        callbacks.gameOverRestart();

        expect(gameState.currentLevel).toBe(11);
        expect(renderer.addFloatingText).toHaveBeenCalledWith(expect.stringContaining('LEVEL CLEAR!'), expect.any(Number), expect.any(Number), expect.any(String), expect.any(Number));
    });

    it('should auto-pause on visibility change', () => {
        gameState.isStarted = true;
        gameState.isPaused = false;

        // Mock document.hidden
        Object.defineProperty(document, 'hidden', { value: true, configurable: true });

        // Dispatch visibilitychange
        document.dispatchEvent(new Event('visibilitychange'));

        expect(gameState.isPaused).toBe(true);

        // Unpause
        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));

        // Note: returning from hidden doesn't auto-unpause in code, it just re-acquires wake lock.
    });

    it('should update super cannon button text', () => {
        const btn = document.getElementById('superCannonBtnInline') as HTMLButtonElement;

        // Ensure consistent time
        const baseTime = 2000;

        // Case 1: Active
        gameState.isStarted = true;
        gameState.superCannonActive = true;
        gameState.superCannonTimer = 5000; // Must be > 0 or updateSuperCannon will disable it
        gameState.superCannonLastUsed = Date.now(); // reset
        _testing.gameLoop(baseTime);
        expect(btn.textContent).toBe('⚡ ATIVO!');

        // Case 2: Cooldown
        gameState.superCannonActive = false;
        gameState.superCannonReady = false;
        gameState.superCannonCooldown = 5000;
        gameState.superCannonLastUsed = Date.now();
        // gameLoop uses Date.now() for cooldown check, not gameLoop time.
        // So mocking Date.now() might be needed if exact timing matters,
        // but here we just need it to be "recently used".

        _testing.gameLoop(baseTime + 16);
        expect(btn.textContent).toContain('⏳');

        // Case 3: Ready
        gameState.superCannonReady = true;
        gameState.superCannonLastUsed = Date.now() - 6000;
        _testing.gameLoop(baseTime + 32);

        expect(btn.textContent).toBe('⚡ SUPER');
    });

    it('should trigger screen shake', () => {
        // Logic in gameLoop updates screenShakeTimer
        gameState.screenShakeTimer = 100;
        gameState.screenShakeActive = true;

        // Use large enough timestamps to ensure positive deltaTime
        _testing.gameLoop(0); // Init
        _testing.gameLoop(20); // 20ms delta

        expect(gameState.screenShakeTimer).toBeLessThan(100);

        // When timer hits 0
        gameState.screenShakeTimer = 10;
        _testing.gameLoop(50); // 30ms delta -> timer < 0

        expect(gameState.screenShakeActive).toBe(false);
    });

    it('should handle share buttons', () => {
        callbacks.share('x');
        expect(renderer.shareOnX).toHaveBeenCalled();

        callbacks.share('whatsapp');
        expect(renderer.shareOnWhatsApp).toHaveBeenCalled();
    });
});
