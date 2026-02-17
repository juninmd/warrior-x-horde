
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGatePair } from '../src/entities';

describe('Entities Gate Logic', () => {
    beforeEach(() => {
        vi.spyOn(Math, 'random');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should handle case where both gates are bad (double negative)', () => {
        // Mock sequence:
        // 1. Math Gate check (0.9 -> false)
        // 2. Left Gate type roll (0.99 -> divide)
        // 3. Right Gate type roll (0.99 -> divide)
        // 4. Buff Roll inside the "both bad" block (0.99 -> unused or firerate/damage check)
        //    Inside the block:
        //    const buffRoll = Math.random();
        //    if (atMaxHeroes) ... else ...
        //    Let's assume not max heroes.
        //    if (buffRoll < 0.4) ...

        vi.mocked(Math.random)
            .mockReturnValueOnce(0.9)   // No Math Gate
            .mockReturnValueOnce(0.99)  // Left = Divide (Bad)
            .mockReturnValueOnce(0.99)  // Right = Divide (Bad)
            .mockReturnValueOnce(0.3);  // Buff Roll (0.3 < 0.4 -> Add) - This triggers the fix

        // createGatePair(width, y, level, heroes, enemies)
        // Not max heroes
        const gates = createGatePair(800, 0, 1, 10, 10);

        // Expect one gate to be changed to 'add' (good)
        const leftGate = gates[0];
        const rightGate = gates[1];

        // The logic says: "Mudar o esquerdo para bom"
        // So left should be 'add' (due to buffRoll 0.3)
        // Right should remain 'divide'

        expect(leftGate.type).toBe('add');
        expect(rightGate.type).toBe('divide');
    });
});
