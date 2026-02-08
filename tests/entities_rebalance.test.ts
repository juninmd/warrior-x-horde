import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGatePair } from '../src/entities';
import * as utils from '../src/utils';

// Mock dependencies
vi.mock('../src/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    shadeColor: vi.fn((c) => c),
  };
});

describe('Entities Gate Rebalance Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should rebalance left gate (add) if right gate is subtract', () => {
    const randomSpy = vi.spyOn(Math, 'random');

    // Sequence to trigger:
    // 1. Math Gate check: 0.5 (fail)
    // 2. Left Gate type: 0.1 ('add')
    // 3. Left Gate value: 0.1 (low value)
    // 4. Right Gate type: 0.96 ('subtract')
    // 5. Right Gate value: 0.9 (high value -> 3)

    randomSpy
        .mockReturnValueOnce(0.5) // Math Gate check (> 0.4)
        .mockReturnValueOnce(0.1) // Left Gate Type (add)
        .mockReturnValueOnce(0.1) // Left Gate Value (low)
        .mockReturnValueOnce(0.96) // Right Gate Type (subtract)
        .mockReturnValueOnce(0.9); // Right Gate Value (high)

    const gates = createGatePair(800, 100, 1, 10, 10);

    expect(gates.length).toBe(2);
    const left = gates[0];
    const right = gates[1];

    expect(left.type).toBe('add');
    expect(right.type).toBe('subtract');

    // The logic ensures left.value >= right.value + 1
    expect(left.value).toBeGreaterThanOrEqual(right.value + 1);
  });

  it('should rebalance right gate (add) if left gate is subtract', () => {
    const randomSpy = vi.spyOn(Math, 'random');

    // Sequence:
    // 1. Math Gate: 0.5
    // 2. Left Gate type: 0.96 ('subtract')
    // 3. Left Gate value: 0.9 (high)
    // 4. Right Gate type: 0.1 ('add')
    // 5. Right Gate value: 0.1 (low)

    randomSpy
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.96) // Left subtract
        .mockReturnValueOnce(0.9)  // Left val high
        .mockReturnValueOnce(0.1)  // Right add
        .mockReturnValueOnce(0.1); // Right val low

    const gates = createGatePair(800, 100, 1, 10, 10);

    expect(gates.length).toBe(2);
    const left = gates[0];
    const right = gates[1];

    expect(left.type).toBe('subtract');
    expect(right.type).toBe('add');

    // Logic: right.value = max(right.value, left.value + 1)
    expect(right.value).toBeGreaterThanOrEqual(left.value + 1);
  });

  it('should NOT rebalance if types do not match (branch coverage)', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReset(); // Ensure clean slate

    // Case 1: !leftIsGood && rightIsGood, but not subtract/add
    // Left: divide (bad), Right: multiply (good)
    // 1. Math check (0.5 > 0.4)
    // 2. Left type (0.98 -> divide)
    // 3. Right type (0.55 -> multiply)
    randomSpy
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.98)
        .mockReturnValueOnce(0.55);

    let gates = createGatePair(800, 100, 1, 10, 10);
    expect(gates[0].type).toBe('divide');
    expect(gates[1].type).toBe('multiply');

    // Case 2: leftIsGood && !rightIsGood, but not add/subtract
    // Left: multiply (good), Right: divide (bad)
    // 1. Math check (0.5 > 0.4)
    // 2. Left type (0.55 -> multiply)
    // 3. Right type (0.98 -> divide)
    randomSpy.mockReset(); // Clear previous mocks
    randomSpy
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.55)
        .mockReturnValueOnce(0.98);

    gates = createGatePair(800, 100, 1, 10, 10);
    expect(gates[0].type).toBe('multiply');
    expect(gates[1].type).toBe('divide');
  });
});
