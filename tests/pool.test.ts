import { describe, it, expect, vi } from 'vitest';
import { ObjectPool } from '../src/pool';

describe('ObjectPool', () => {
  it('should create new objects when pool is empty', () => {
    const factory = vi.fn(() => ({ id: Math.random() }));
    const reset = vi.fn();
    const pool = new ObjectPool(factory, reset);

    const obj1 = pool.get();

    expect(obj1).toBeDefined();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled(); // Reset is only called on reuse
  });

  it('should reuse objects released to the pool', () => {
    const factory = vi.fn(() => ({ id: Math.random() }));
    const reset = vi.fn((item: any) => { item.reset = true; });
    const pool = new ObjectPool(factory, reset);

    const obj1 = pool.get();
    pool.release(obj1);

    const obj2 = pool.get();
    expect(obj2).toBe(obj1);
    expect(factory).toHaveBeenCalledTimes(1); // Still 1
    expect(reset).toHaveBeenCalledWith(obj1);
  });

  it('should return size of the pool', () => {
      const pool = new ObjectPool(() => ({}), () => {});
      expect(pool.size()).toBe(0);
      pool.release({});
      expect(pool.size()).toBe(1);
  });
});
