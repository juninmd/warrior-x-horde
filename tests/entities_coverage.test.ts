import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGatePair, createGate, addSoldiersToArmy, addSuperSoldiersToArmy, addSpecialSoldiersToArmy } from '../src/entities';
import { MAX_HEROES } from '../src/constants';

describe('Entities Coverage', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('should handle both bad gates swapping when at MAX_HEROES (Firerate case)', () => {
        const randomSpy = vi.spyOn(Math, 'random');

        // 1. Math Gate roll < 0.4 -> False (0.5)
        // 2. Left gate roll
        // 3. Right gate roll
        // 4. buffRoll < 0.5 -> True (0.4)

        // Gate creation uses random() for:
        // - roll (type selection)
        // - value selection (sometimes)

        // We want !leftIsGood && !rightIsGood
        // goodTypes when atMaxHeroes: ['firerate', 'damage']
        // So we want left and right to be subtract or divide.

        // Gate creation logic:
        // if (atMaxHeroes) ... if (roll < 0.35) firerate ... < 0.7 damage ... < 0.85 subtract ... else divide

        // So for BAD gate at max heroes, we need roll >= 0.7

        let callIndex = 0;
        randomSpy.mockImplementation(() => {
            const i = callIndex++;
            if (i === 0) return 0.5; // Math Gate check (false)
            if (i === 1) return 0.8; // Left Gate roll (subtract/divide -> bad)
            if (i === 2) return 0.2; // Left Gate value (irrelevant)
            if (i === 3) return 0.8; // Right Gate roll (bad)
            if (i === 4) return 0.2; // Right Gate value
            if (i === 5) return 0.4; // buffRoll (swapping left to good) -> < 0.5 (Firerate)
            return 0.5;
        });

        const gates = createGatePair(800, 100, 1, MAX_HEROES, 10);

        // Left gate should be swapped to firerate
        expect(gates[0].type).toBe('firerate');
        expect(gates[0].value).toBe(0.92);

        // Right gate remains bad
        expect(['subtract', 'divide']).toContain(gates[1].type);
    });

    it('should handle both bad gates swapping when at MAX_HEROES (Damage case)', () => {
        const randomSpy = vi.spyOn(Math, 'random');
        let callIndex = 0;
        randomSpy.mockImplementation(() => {
            const i = callIndex++;
            if (i === 0) return 0.5; // Math Gate check
            if (i === 1) return 0.8; // Left bad
            if (i === 2) return 0.2;
            if (i === 3) return 0.8; // Right bad
            if (i === 4) return 0.2;
            if (i === 5) return 0.6; // buffRoll -> > 0.5 (Damage)
            return 0.5;
        });

        const gates = createGatePair(800, 100, 1, MAX_HEROES, 10);
        expect(gates[0].type).toBe('damage');
    });

    it('should handle both bad gates swapping when NOT at MAX_HEROES (Firerate)', () => {
         const randomSpy = vi.spyOn(Math, 'random');
        let callIndex = 0;
        // createGate uses logic:
        // if not atMax: <0.5 add, <0.65 multiply, <0.73 firerate, <0.8 damage, <0.94 super, <0.97 subtract, else divide
        // Bad gates: subtract (>0.94) or divide (>0.97)

        randomSpy.mockImplementation(() => {
            const i = callIndex++;
            if (i === 0) return 0.5; // Math Gate
            if (i === 1) return 0.95; // Left bad (subtract)
            if (i === 2) return 0.5; // Left value
            if (i === 3) return 0.98; // Right bad (divide)
            // Right value is constant for divide, no random call
            if (i === 4) return 0.7; // buffRoll -> 0.65 < x < 0.85 (Firerate)
            return 0.5;
        });

        const gates = createGatePair(800, 100, 1, 10, 10);
        expect(gates[0].type).toBe('firerate');
    });

    it('should handle addSoldiersToArmy exceeding MAX_HEROES', () => {
        const army = {
            soldiers: Array(MAX_HEROES).fill({}),
            aliveCount: MAX_HEROES,
            centerX: 100, centerY: 100, color: '#FFF'
        } as any;

        addSoldiersToArmy(army, 10);
        expect(army.soldiers.length).toBe(MAX_HEROES);
        expect(army.aliveCount).toBe(MAX_HEROES);
    });

    it('should handle addSuperSoldiersToArmy exceeding MAX_HEROES', () => {
        const army = {
            soldiers: Array(MAX_HEROES).fill({}),
            aliveCount: MAX_HEROES,
            centerX: 100, centerY: 100, color: '#FFF'
        } as any;

        addSuperSoldiersToArmy(army, 10);
        expect(army.soldiers.length).toBe(MAX_HEROES);
    });

    it('should handle addSpecialSoldiersToArmy exceeding MAX_HEROES', () => {
        const army = {
            soldiers: Array(MAX_HEROES).fill({}),
            aliveCount: MAX_HEROES,
            centerX: 100, centerY: 100, color: '#FFF'
        } as any;

        addSpecialSoldiersToArmy(army, 'bazooka', 10);
        expect(army.soldiers.length).toBe(MAX_HEROES);
    });
});
