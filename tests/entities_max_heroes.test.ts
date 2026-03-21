import { describe, it, expect, vi, afterEach } from 'vitest';
import { createGatePair } from '../src/entities';
import { MAX_HEROES } from '../src/constants';

describe('Entities - Max Heroes Logic', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate firerate/damage gates instead of add/multiply when at max heroes (Scenario: Bad Gates turning Good)', () => {
    // We need to trigger the specific branch where both initial gates are "bad" (e.g. subtract/divide)
    // and one of them is forced to be "good".
    // And because we are at MAX_HEROES, the "good" one must be firerate or damage.

    // createGatePair logic:
    // 1. Math gate check (40% chance) -> we need to avoid this. Math.random() >= 0.4
    // 2. createGate calls (left and right).
    // 3. check goodTypes.
    // 4. if (!leftIsGood && !rightIsGood) -> force one good.
    // 5. if (atMaxHeroes) -> logic we want to test.

    // Mock Math.random to control the flow.
    // Call 1: Math Gate check. Returns 0.5 (>= 0.4) -> Skip Math Gate.
    // Call 2: createGate('left') internals.
    //    createGate logic:
    //    atMaxHeroes is passed.
    //    Roll for type.
    //    We want 'subtract' or 'divide'.
    //    If atMaxHeroes is true:
    //      0.35 -> firerate (GOOD)
    //      0.70 -> damage (GOOD)
    //      0.85 -> subtract (BAD)
    //      else -> divide (BAD)
    //    So we need random >= 0.70 for BAD gates when atMaxHeroes.
    //    Let's use 0.9 (divide).
    // Call 3: createGate('right') internals.
    //    Same, use 0.9 (divide).

    // Now we have two BAD gates.
    // Logic enters: if (!leftIsGood && !rightIsGood)
    // Call 4: buffRoll = Math.random().
    //    We want to test if (atMaxHeroes) block.
    //    Sub-test 1: buffRoll < 0.5 -> firerate.
    //    Sub-test 2: buffRoll >= 0.5 -> damage.

    const mockRandom = vi.spyOn(Math, 'random');

    // TEST CASE 1: Firerate
    mockRandom
      .mockReturnValueOnce(0.5) // Math gate check (skip)
      .mockReturnValueOnce(0.9) // Left gate type (divide - BAD)
      .mockReturnValueOnce(0.9) // Right gate type (divide - BAD)
      .mockReturnValueOnce(0.4); // buffRoll (< 0.5) -> Force Firerate

    let gates = createGatePair(800, 0, 1, MAX_HEROES, 0);

    // One of them should be 'firerate'
    const hasFirerate = gates.some(g => g.type === 'firerate');
    expect(hasFirerate).toBe(true);

    // TEST CASE 2: Damage
    mockRandom.mockReset();
    mockRandom
      .mockReturnValueOnce(0.5) // Math gate check (skip)
      .mockReturnValueOnce(0.9) // Left gate type (divide - BAD)
      .mockReturnValueOnce(0.9) // Right gate type (divide - BAD)
      .mockReturnValueOnce(0.6); // buffRoll (>= 0.5) -> Force Damage

    gates = createGatePair(800, 0, 1, MAX_HEROES, 0);

    const hasDamage = gates.some(g => g.type === 'damage');
    expect(hasDamage).toBe(true);
  });
});
