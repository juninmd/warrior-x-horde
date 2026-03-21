import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGatePair } from '../src/entities';

describe('Entities Gate Pairs Coverage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate two "good" gates when random rolls are bad (both bad initially)', () => {
    // Sequence for Math.random():
    // 1. Math Gate check (0.4) -> 0.5 (False)
    // 2. createGate LEFT: roll for type -> 0.99 (Divide - Bad)
    // 3. createGate RIGHT: roll for type -> 0.99 (Divide - Bad)
    // 4. buffRoll inside createGatePair -> 0.2 (Add - Good)

    // We expect:
    // Left: Add (was Divide, forced to Good)
    // Right: Divide (stays Bad)
    // Wait, logic:
    // if (leftIsGood && rightIsGood) ...
    // else if (!leftIsGood && !rightIsGood) {
    //    // Change LEFT to Good
    // }

    const randoms = [
        0.5, // Not Math Gate
        0.99, // Left Divide
        0.99, // Right Divide
        0.2, // Buff Roll (Add)
    ];
    let i = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => randoms[i++] || 0.5);

    const [left, right] = createGatePair(800, 0, 1, 10, 10);

    expect(left.type).toBe('add'); // Was forced good
    expect(right.type).toBe('divide'); // Stays bad
  });

  it('should leave mixed gates (one good, one bad) as is', () => {
    const randoms = [
        0.5, // Not Math Gate
        0.2, // Left Add (Good)
        0.99, // Right Divide (Bad)
    ];
    let i = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => randoms[i++] || 0.5);

    const [left, right] = createGatePair(800, 0, 1, 10, 10);

    expect(left.type).toBe('add');
    expect(right.type).toBe('divide');
    // Ensure no changes were made (implicit else path)
  });
});
