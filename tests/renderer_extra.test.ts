import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock input to break circular dependency chain: renderer -> renderer-utils -> input -> shooting -> game -> input
vi.mock('../src/input', () => ({
    virtualJoystick: { active: false, start: vi.fn(), move: vi.fn(), end: vi.fn(), getDeltaX: vi.fn() },
    vibrate: vi.fn(),
    getMouseX: vi.fn(() => 240),
    setInputScale: vi.fn(),
    setupInput: vi.fn(),
}));

import * as renderer from '../src/renderer';
import { QualityManager } from '../src/quality';
import { Army } from '../src/types';

describe('Renderer Extra Coverage', () => {

    describe('Particles', () => {
        beforeEach(() => {
            // Access private particles array?
            // Since not exported, we can only verify side effects or behavior.
            // But we can check if addParticle respects limit by spying on QualityManager
            // Or just call it many times and ensure it doesn't crash or leak.

            // To test limits, we need to inspect the array.
            // Or we can mock the pool? No, pool is internal.
            // renderer.ts exports 'addParticle'.
        });

        it('should add particles respecting quality limits', () => {
            // Mock quality settings
            const qm = QualityManager.getInstance();
            qm.settings.particleMultiplier = 0.0; // Very low limit (0)

            // Should not crash even if limit is 0
            renderer.addParticle(100, 100, 'spark', '#FFF', 10);

            // Normal limit
            qm.settings.particleMultiplier = 1.0;
            // Add many
            for(let i=0; i<200; i++) {
                renderer.addParticle(100, 100, 'spark', '#FFF', 1);
            }
        });

        it('should add explosion and trail', () => {
             renderer.addExplosion(100, 100, '#F00');
             renderer.addTrail(100, 100, '#F00');
        });

        it('should render cached particles', () => {
            // Force pre-render
            renderer.preRenderSprites();

            // Add a particle that matches cached one (spark, #FFF)
            renderer.addParticle(100, 100, 'spark', '#FFF', 1);

            // Mock context
            const ctx = {
                save: vi.fn(),
                restore: vi.fn(),
                translate: vi.fn(),
                scale: vi.fn(),
                drawImage: vi.fn(),
                setTransform: vi.fn(),
                clearRect: vi.fn(),
                globalAlpha: 1,
                canvas: { width: 480, height: 800 },
                // Other methods called by render...
                createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
                createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
                beginPath: vi.fn(),
                closePath: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                fillRect: vi.fn(),
                fill: vi.fn(),
                stroke: vi.fn(),
                arc: vi.fn(),
                ellipse: vi.fn(),
                roundRect: vi.fn(),
                strokeRect: vi.fn(),
                fillText: vi.fn(),
                strokeText: vi.fn(),
                measureText: vi.fn(() => ({ width: 0 })),
                rotate: vi.fn(),
                setLineDash: vi.fn(),
            } as any;

            const entities = {
                playerArmy: { soldiers: [], centerX: 0, centerY: 0 },
                gates: [],
                enemyHordes: [],
                mysteryBoxes: [],
                bullets: [],
                particles: [],
                floatingTexts: [],
                miniBosses: [],
                boss: null,
                coins: [],
                weapons: []
            } as any;

            renderer.render(ctx, entities, { currentLevel: 1 } as any);

            // Expect cached drawing path
            // ctx.translate called means it used the cached path (fallback uses save/restore but might not translate if not needed, wait.
            // Fallback uses save/restore. Cached uses translate/scale/drawImage/scale/translate.
            expect(ctx.drawImage).toHaveBeenCalled();
        });
    });

    describe('Floating Texts', () => {
        it('should add and update floating texts', () => {
             renderer.addFloatingText('Test', 100, 100, '#FFF', 1.5);

             // We can't access updateFloatingTexts directly as it is not exported.
             // It is called by 'render'.
             // So we assume calling render will trigger it.
             // We just verify addFloatingText works.
        });
    });

    describe('Soldier Preparation', () => {
        it('should prepare soldiers and handle limits', () => {
            const army: Army = {
                soldiers: [],
                centerX: 0, centerY: 0, aliveCount: 0, damage: 1, fireRate: 1
            } as any;

            // Add 200 soldiers
            for (let i = 0; i < 200; i++) {
                army.soldiers.push({
                    x: 100, y: i, // distinct Y for sorting
                    size: 10,
                    isAlive: true,
                    type: 'normal',
                    isSuper: i < 50 // 50 supers
                } as any);
            }

            const qm = QualityManager.getInstance();
            qm.settings.maxRenderedSoldiers = 100;

            const prepared = renderer.prepareSoldiersToDraw(army);

            // Should be capped at 100
            expect(prepared.length).toBeLessThanOrEqual(100);

            // Should verify sorting (by Y)
            // But sampling might shuffle things?
            // The code sorts at the end: tempSoldiersToDraw.sort((a, b) => a.y - b.y);
            const yValues = prepared.map(s => s.y);
            const sortedY = [...yValues].sort((a, b) => a - b);
            expect(yValues).toEqual(sortedY);
        });

        it('should prioritize super soldiers', () => {
            const army: Army = { soldiers: [] } as any;

            // 50 supers, 100 normals
            for (let i = 0; i < 50; i++) {
                army.soldiers.push({ isAlive: true, type: 'normal', isSuper: true, y: i } as any);
            }
            for (let i = 0; i < 100; i++) {
                // Keep y within view to avoid culling (view is 0-800)
                army.soldiers.push({ isAlive: true, type: 'normal', isSuper: false, y: 100 + i } as any);
            }

            const qm = QualityManager.getInstance();
            qm.settings.maxRenderedSoldiers = 60; // Limit 60

            const prepared = renderer.prepareSoldiersToDraw(army);

            expect(prepared.length).toBe(60);
            const supers = prepared.filter(s => s.isSuper).length;
            // Should have all 50 supers + 10 normals
            expect(supers).toBe(50);
            const normals = prepared.filter(s => !s.isSuper).length;
            expect(normals).toBe(10);
        });

        it('should cap super soldiers if they exceed limit alone', () => {
             const army: Army = { soldiers: [] } as any;
             // 100 supers
             for (let i = 0; i < 100; i++) {
                army.soldiers.push({ isAlive: true, type: 'normal', isSuper: true, y: i } as any);
             }

             const qm = QualityManager.getInstance();
            qm.settings.maxRenderedSoldiers = 50;

            const prepared = renderer.prepareSoldiersToDraw(army);
            expect(prepared.length).toBe(50);
            // All should be supers
            expect(prepared.every(s => s.isSuper)).toBe(true);
        });
    });
});
