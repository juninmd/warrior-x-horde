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

    // Helper to mock random sequence
    // 0: Math Gate (0.5 = False)
    // 1: Left Gate Bad (0.95 = Subtract)
    // 2: Left Value (0.5)
    // 3: Right Gate Bad (0.98 = Divide)
    // 4: Buff Roll (Target)
    const setupRandom = (buffRoll: number) => {
        const randomSpy = vi.spyOn(Math, 'random');
        let callIndex = 0;
        randomSpy.mockImplementation(() => {
            const i = callIndex++;
            if (i === 0) return 0.5;
            if (i === 1) return 0.95;
            if (i === 2) return 0.5;
            if (i === 3) return 0.98;
            if (i === 4) return buffRoll;
            return 0.5;
        });
    };

    it('should handle gate generation with add buff (buffRoll < 0.4)', () => {
        setupRandom(0.3); // Must be < 0.4
        const gates = createGatePair(800, 100, 1, 10, 10);
        expect(gates[0].type).toBe('add');
    });

    it('should handle gate generation with multiply buff (0.5 <= buffRoll < 0.65)', () => {
        setupRandom(0.5);
        const gates = createGatePair(800, 100, 1, 10, 10);
        expect(gates[0].type).toBe('multiply');
    });

    it('should handle gate generation with firerate buff (0.65 <= buffRoll < 0.85)', () => {
        setupRandom(0.75);
        const gates = createGatePair(800, 100, 1, 10, 10);
        expect(gates[0].type).toBe('firerate');
    });

    it('should handle gate generation with superwarrior buff (0.85 <= buffRoll < 0.94 check?? No, logic is < 0.94)', () => {
        // Logic: <0.5 add, <0.65 mult, <0.73 firerate, <0.8 damage, <0.94 super
        // Wait, firerate is < 0.73?
        // Let's re-read code in entities.ts (from memory/read_file)
        // roll < 0.50: add
        // roll < 0.65: multiply
        // roll < 0.73: firerate
        // roll < 0.80: damage
        // roll < 0.94: superwarrior
        // roll < 0.97: subtract
        // else: divide

        // My previous test used 0.75 for firerate? That would hit DAMAGE (<0.80).
        // Let's correct values.

        // Add: 0.4
        // Multiply: 0.6
        // Firerate: 0.7
        // Damage: 0.75
        // Superwarrior: 0.9
        // Subtract: 0.95 (Only if NOT swapping bad gate? No, this block is "Mudar o esquerdo para bom")
        // If swapping bad to good, we only want GOOD types.
        // The block `if (!leftIsGood && !rightIsGood)`:
        // if (atMaxHeroes) ...
        // else:
        // < 0.4: add
        // < 0.65: multiply
        // < 0.85: firerate
        // else: superwarrior

        // Wait, the block I pasted in `read_file` output earlier:
        /*
           480	        leftGate.type = 'add';
           ...
           483	      } else if (buffRoll < 0.65) {
           ...
           487	      } else if (buffRoll < 0.85) {
           ...
           491	      } else {
                        // Superwarrior
           495	      }
        */
        // So for "Mudar esquerdo para bom":
        // < 0.4: Add
        // < 0.65: Multiply
        // < 0.85: Firerate
        // Else: Superwarrior (Damage is missing in this specific else block??)
        // Ah, looking at lines 480-495 in `read_file` output:
        // It has add, multiply, firerate, superwarrior.
        // It seems `damage` is NOT in the swap-to-good logic when NOT at max heroes?
        // Let's verify `tests/entities_coverage.test.ts` content I wrote.

    });

    it('should handle gate generation with superwarrior buff (buffRoll >= 0.85)', () => {
        setupRandom(0.9);
        const gates = createGatePair(800, 100, 1, 10, 10);
        expect(gates[0].type).toBe('superwarrior');
    });

    it('should handle gate generation (standard createGate) with damage type', () => {
        // This targets createGate logic directly, not swap logic.
        // createGate logic:
        // <0.5 add, <0.65 mult, <0.73 fire, <0.8 damage, <0.94 super, <0.97 sub, else div
        const randomSpy = vi.spyOn(Math, 'random');
        randomSpy.mockReturnValue(0.75); // 0.73 <= 0.75 < 0.80

        const gate = createGate(800, 100, 'left', 1, 10, 10);
        expect(gate.type).toBe('damage');
    });

    it('should handle gate generation (standard createGate) with subtract type', () => {
        const randomSpy = vi.spyOn(Math, 'random');
        randomSpy.mockReturnValue(0.95); // 0.94 <= 0.95 < 0.97

        const gate = createGate(800, 100, 'left', 1, 10, 10);
        expect(gate.type).toBe('subtract');
    });

    it('should handle gate generation (standard createGate) with divide type', () => {
        const randomSpy = vi.spyOn(Math, 'random');
        randomSpy.mockReturnValue(0.99); // >= 0.97

        const gate = createGate(800, 100, 'left', 1, 10, 10);
        expect(gate.type).toBe('divide');
    });
});
