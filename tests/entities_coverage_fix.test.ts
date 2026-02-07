import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGatePair } from '../src/entities';

describe('Entities Coverage Fix', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate a "superwarrior" gate when both gates are bad and buffRoll >= 0.85', () => {
    // Sequence for Math.random():
    // 1. Math Gate check (0.4) -> 0.5 (False)
    // 2. createGate LEFT: roll for type -> 0.99 (Divide - Bad)
    //    Divide type does not consume an extra random number for value.
    // 3. createGate RIGHT: roll for type -> 0.99 (Divide - Bad)
    //    Divide type does not consume an extra random number for value.
    // 4. buffRoll inside createGatePair -> 0.90 (>= 0.85 -> SuperWarrior)

    const randoms = [
      0.5,  // Not Math Gate
      0.99, // Left Divide (Bad)
      0.99, // Right Divide (Bad)
      0.90, // Buff Roll (SuperWarrior)
    ];
    let i = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const val = randoms[i] !== undefined ? randoms[i] : 0.5;
      i++;
      return val;
    });

    const [left, right] = createGatePair(800, 0, 1, 10, 10);

    // Left gate should be forced to 'superwarrior'
    expect(left.type).toBe('superwarrior');
    expect(left.value).toBe(1);
    expect(left.color).toBe('#FFD700');

    // Right gate should remain 'divide'
    expect(right.type).toBe('divide');
  });

  it('should handle mixed gates (Left Bad, Right Good) without changes', () => {
    // Sequence for Math.random():
    // 1. Math Gate check (0.4) -> 0.5 (False)
    // 2. createGate LEFT: roll for type -> 0.99 (Divide - Bad)
    //    Divide type does not consume an extra random number for value.
    // 3. createGate RIGHT: roll for type -> 0.2 (Add - Good)
    //    Add type consumes an extra random number for value. -> 0.5
    // 4. Implicitly falls through without changes (no buffRoll)

    const randoms = [
      0.5,  // Not Math Gate
      0.99, // Left Divide (Bad)
      0.2,  // Right Add (Good)
      0.5,  // Right Add Value
    ];
    let i = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const val = randoms[i] !== undefined ? randoms[i] : 0.5;
      i++;
      return val;
    });

    const [left, right] = createGatePair(800, 0, 1, 10, 10);

    expect(left.type).toBe('divide');
    expect(right.type).toBe('add');
  });
});
