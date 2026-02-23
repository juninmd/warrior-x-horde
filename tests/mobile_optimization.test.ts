import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QualityManager } from '../src/quality';
import { render } from '../src/renderer';
import { Entities } from '../src/types';

describe('Mobile Optimization', () => {
  beforeEach(() => {
    // Reset singleton
    QualityManager.resetInstance();
    vi.resetAllMocks();
  });

  it('should disable shadows on mobile devices by default', () => {
    // Mock User Agent
    Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1',
        configurable: true
    });

    const qm = QualityManager.getInstance();
    expect(qm.settings.enableShadows).toBe(false);
    expect(qm.settings.enablePostProcessing).toBe(false);
    expect(qm.settings.resolutionScale).toBe(0.85);
  });

  it('should enable shadows on desktop devices by default', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        configurable: true
    });

    const qm = QualityManager.getInstance();
    expect(qm.settings.enableShadows).toBe(true);
  });

  it('should not set shadowBlur when rendering on mobile settings', () => {
     // Force mobile settings
     const qm = QualityManager.getInstance();
     qm.settings.enableShadows = false;

     const canvas = document.createElement('canvas');
     const ctx = canvas.getContext('2d')!;

     // Spy on shadowBlur setter
     let shadowBlurSet = false;
     Object.defineProperty(ctx, 'shadowBlur', {
         set: (val) => {
             if (val > 0) shadowBlurSet = true;
         },
         get: () => 0
     });

     const mockEntities: Entities = {
         playerArmy: {
             soldiers: [],
             centerX: 100, centerY: 100,
             trail: { points: [{x:0,y:0, width:10, alpha:1}, {x:10,y:10, width:10, alpha:1}], width: 10, color: '#F00', maxLength: 10 },
             aliveCount: 0,
             damage: 1, fireRate: 100, lastShotTime: 0, color: '#F00', isPlayer: true, targetX: 0
         },
         enemyHordes: [],
         gates: [],
         bullets: [],
         mysteryBoxes: [],
         miniBosses: [],
         boss: null,
         weapons: [],
         coins: []
     };
     const mockGameState: any = {
         currentLevel: 1,
         score: 0,
         highScore: 100,
         highScoreDistance: 500, // Trigger record line
         combo: 5, // Trigger combo bar draw
         comboTimer: 100,
         killStreak: 10, // Trigger killstreak draw
         distanceTraveled: 0,
         levelDistance: 1000,
         bossAtmosphereIntensity: 1 // Trigger boss atmosphere
     };

     // Only check render function
     render(ctx, mockEntities, mockGameState);

     // Shadows should be disabled on mobile
     expect(shadowBlurSet).toBe(false);
  });
});
